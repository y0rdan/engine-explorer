import {
  InstancedMesh,
  Object3D,
  Quaternion,
  Vector3,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from 'three'
import { pistonPhaseOffset, type MotionLayout, type Vec3 } from '../../engine/layout.ts'
import {
  combustionGlow,
  lobeCenter,
  pistonHeight,
  valveLift,
} from '../../engine/kinematics.ts'
import { placementMode, travelsFor } from '../../engine/placement.ts'
import type { EngineRecord } from '../../engine/schema.ts'
import type { EngineRuntime } from '../../engine/runtime.ts'

const up = new Vector3(0, 1, 0)
const axis = new Vector3()
const direction = new Vector3()
const midpoint = new Vector3()
const spin = new Quaternion()
const instanceDummy = new Object3D()

type PistonSet = { indices: number[]; crown: number }
type RodSet = { indices: number[] }
type ValveSet = { indices: number[]; port: 'intake' | 'exhaust'; restY: number; xs: number[]; localZ: number }

function paintInstances(mesh: InstancedMesh, count: number, place: (index: number) => void) {
  for (let index = 0; index < count; index += 1) {
    instanceDummy.position.set(0, 0, 0)
    instanceDummy.quaternion.identity()
    instanceDummy.scale.set(1, 1, 1)
    instanceDummy.rotation.set(0, 0, 0)
    place(index)
    instanceDummy.updateMatrix()
    mesh.setMatrixAt(index, instanceDummy.matrix)
  }
  mesh.instanceMatrix.needsUpdate = true
}

type ValveData = { index: number; port: 'intake' | 'exhaust'; restY: number }

function anchorOf(layout: MotionLayout, id: string): Vec3 {
  return layout.anchors[id] ?? [0, 0, 0]
}

export function applyPlacements(
  root: Object3D,
  engine: EngineRecord,
  layout: MotionLayout,
  runtime: EngineRuntime,
  view: { partId: string | null; isolated: boolean; assemblyMode: boolean },
): void {
  const travels = travelsFor(engine, {
    mode: placementMode(view),
    explode: runtime.explode,
    assembly: runtime.assembly,
    partId: view.partId,
  })
  for (const part of engine.parts) {
    const group = root.getObjectByName(`part:${part.id}`)
    if (!group) continue
    const anchor = anchorOf(layout, part.id)
    const travel = travels.parts[part.id] ?? 0
    group.position.set(
      anchor[0] + part.explodeOffset[0] * travel,
      anchor[1] + part.explodeOffset[1] * travel,
      anchor[2] + part.explodeOffset[2] * travel,
    )
    for (const layer of part.layers) {
      const layerGroup = root.getObjectByName(`layer:${part.id}:${layer.id}`)
      if (!layerGroup) continue
      const layerTravel = travels.layers[`${part.id}:${layer.id}`] ?? 0
      layerGroup.position.set(
        layer.explodeOffset[0] * layerTravel,
        layer.explodeOffset[1] * layerTravel,
        layer.explodeOffset[2] * layerTravel,
      )
    }
  }
}

function wristAt(layout: MotionLayout, index: number, angle: number): Vec3 {
  const cylinder = layout.cylinders[index]
  if (!cylinder) return [0, 0, 0]
  const travel = pistonHeight(angle, pistonPhaseOffset(cylinder), layout.crankRadius, layout.rodLength)
  return [
    cylinder.x + cylinder.boreAxis[0] * travel,
    layout.crankCenter[1] + cylinder.boreAxis[1] * travel,
    layout.crankCenter[2] + cylinder.boreAxis[2] * travel,
  ]
}

function pinAt(layout: MotionLayout, index: number, angle: number): Vec3 {
  const cylinder = layout.cylinders[index]
  if (!cylinder) return [0, 0, 0]
  const phi = angle + cylinder.phase
  const zSign = cylinder.crankMirror ? -1 : 1
  return [
    cylinder.journalX,
    layout.crankCenter[1] + Math.cos(phi) * layout.crankRadius,
    layout.crankCenter[2] + Math.sin(phi) * layout.crankRadius * zSign,
  ]
}

export function applyMotion(root: Object3D, layout: MotionLayout, runtime: EngineRuntime): void {
  const angle = runtime.crank
  root.traverse((object) => {
    const data = object.userData as {
      spin?: number
      piston?: number
      rod?: number
      valve?: ValveData
      glow?: number
      belt?: number
    }
    const sets = object.userData as {
      pistonSet?: PistonSet
      rodSet?: RodSet
      valveSet?: ValveSet
    }
    if (sets.pistonSet && object instanceof InstancedMesh) {
      const pistonSet = sets.pistonSet
      paintInstances(object, pistonSet.indices.length, (index) => {
        const cylinderIndex = pistonSet.indices[index] ?? 0
        const cylinder = layout.cylinders[cylinderIndex]
        const wrist = wristAt(layout, cylinderIndex, angle)
        instanceDummy.position.set(wrist[0], wrist[1], wrist[2])
        if (cylinder) {
          axis.set(cylinder.boreAxis[0], cylinder.boreAxis[1], cylinder.boreAxis[2])
          instanceDummy.quaternion.copy(spin.setFromUnitVectors(up, axis))
        }
        instanceDummy.translateY(pistonSet.crown)
      })
    }
    if (sets.rodSet && object instanceof InstancedMesh) {
      const rodSet = sets.rodSet
      paintInstances(object, rodSet.indices.length, (index) => {
        const cylinderIndex = rodSet.indices[index] ?? 0
        const pin = pinAt(layout, cylinderIndex, angle)
        const wrist = wristAt(layout, cylinderIndex, angle)
        direction.set(wrist[0] - pin[0], wrist[1] - pin[1], wrist[2] - pin[2])
        const length = direction.length() || 0.001
        direction.multiplyScalar(1 / length)
        instanceDummy.position.set((pin[0] + wrist[0]) / 2, (pin[1] + wrist[1]) / 2, (pin[2] + wrist[2]) / 2)
        instanceDummy.quaternion.copy(spin.setFromUnitVectors(up, direction))
        instanceDummy.scale.set(1, length / Math.max(layout.rodLength, 0.001), 1)
      })
    }
    if (sets.valveSet && object instanceof InstancedMesh) {
      const valveSet = sets.valveSet
      paintInstances(object, valveSet.indices.length, (index) => {
        const fire = layout.cylinders[valveSet.indices[index] ?? 0]?.fireAngle ?? 0
        const lift = valveLift(angle, lobeCenter(fire, valveSet.port))
        instanceDummy.position.set(valveSet.xs[index] ?? 0, valveSet.restY - lift, valveSet.localZ)
      })
    }
    if (typeof data.spin === 'number') object.rotation.x = angle * data.spin
    if (typeof data.piston === 'number') {
      const cylinder = layout.cylinders[data.piston]
      const wrist = wristAt(layout, data.piston, angle)
      object.position.set(wrist[0], wrist[1], wrist[2])
      if (cylinder) {
        axis.set(cylinder.boreAxis[0], cylinder.boreAxis[1], cylinder.boreAxis[2])
        object.quaternion.copy(spin.setFromUnitVectors(up, axis))
      }
    }
    if (typeof data.rod === 'number') {
      const pin = pinAt(layout, data.rod, angle)
      const wrist = wristAt(layout, data.rod, angle)
      direction.set(wrist[0] - pin[0], wrist[1] - pin[1], wrist[2] - pin[2])
      const length = direction.length() || 0.001
      direction.multiplyScalar(1 / length)
      midpoint.set((pin[0] + wrist[0]) / 2, (pin[1] + wrist[1]) / 2, (pin[2] + wrist[2]) / 2)
      object.position.copy(midpoint)
      object.quaternion.copy(spin.setFromUnitVectors(up, direction))
      object.scale.set(1, length / Math.max(layout.rodLength, 0.001), 1)
    }
    if (data.valve) {
      const fire = layout.cylinders[data.valve.index]?.fireAngle ?? 0
      const lift = valveLift(angle, lobeCenter(fire, data.valve.port))
      object.position.y = data.valve.restY - lift
    }
    if (typeof data.glow === 'number') {
      const mesh = object as Mesh
      const material = mesh.material as MeshBasicMaterial
      const fire = layout.cylinders[data.glow]?.fireAngle ?? 0
      const amount = runtime.cutaway ? combustionGlow(angle, fire) : 0
      material.opacity = amount * 0.9
      mesh.visible = amount > 0.04 && runtime.cutaway
    }
    if (typeof data.belt === 'number') {
      const material = (object as Mesh).material as MeshStandardMaterial
      if (material.map) material.map.offset.x = (angle * data.belt) / (Math.PI * 2)
    }
  })
}
