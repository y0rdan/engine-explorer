import {
  InstancedMesh,
  Matrix4,
  Object3D,
  Quaternion,
  Vector3,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from 'three'
import type { EngineLayout, Vec3 } from '../../engine/layout.ts'
import { crankPin, wristPin } from '../../engine/layout.ts'
import {
  INLINE4_FIRE_ANGLES,
  INLINE4_PHASES,
  combustionGlow,
  lobeCenter,
  pistonHeight,
  valveLift,
} from '../../engine/kinematics.ts'
import { placementMode, travelsFor } from '../../engine/placement.ts'
import type { EngineRecord } from '../../engine/schema.ts'
import type { EngineRuntime } from '../../engine/runtime.ts'

const up = new Vector3(0, 1, 0)
const direction = new Vector3()
const midpoint = new Vector3()
const spin = new Quaternion()
const dummy = new Object3D()
const rodMatrix = new Matrix4()
const rodScale = new Vector3()

type ValveData = { index: number; port: 'intake' | 'exhaust'; restY: number }

function anchorOf(layout: EngineLayout, id: string): Vec3 {
  return layout.anchors[id] ?? [0, 0, 0]
}

export function applyPlacements(
  root: Object3D,
  engine: EngineRecord,
  layout: EngineLayout,
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

export function rodFrame(layout: EngineLayout, angle: number, index: number, target: Matrix4): void {
  const phase = INLINE4_PHASES[index] ?? 0
  const pin = crankPin(layout, index, angle, phase)
  const wrist = wristPin(layout, index, pistonHeight(angle, phase, layout.crankRadius, layout.rodLength))
  direction.set(wrist[0] - pin[0], wrist[1] - pin[1], wrist[2] - pin[2])
  const length = direction.length() || 0.001
  direction.multiplyScalar(1 / length)
  midpoint.set((pin[0] + wrist[0]) / 2, (pin[1] + wrist[1]) / 2, (pin[2] + wrist[2]) / 2)
  spin.setFromUnitVectors(up, direction)
  rodScale.set(1, length / layout.rodLength, 1)
  target.compose(midpoint, spin, rodScale)
}

export function applyMotion(root: Object3D, layout: EngineLayout, runtime: EngineRuntime): void {
  const angle = runtime.crank
  root.traverse((object) => {
    const data = object.userData as {
      spin?: number
      piston?: number
      rod?: number
      valve?: ValveData
      glow?: number
      belt?: number
      role?: string
      valveRestY?: number
      valveSpec?: { index: number; port: 'intake' | 'exhaust'; x: number; z: number }[]
    }
    if (data.role === 'pistons' && (object as InstancedMesh).isInstancedMesh) {
      const inst = object as InstancedMesh
      for (let index = 0; index < inst.count; index += 1) {
        const phase = INLINE4_PHASES[index] ?? 0
        const height = pistonHeight(angle, phase, layout.crankRadius, layout.rodLength)
        dummy.position.set(layout.pistonX[index] ?? 0, layout.crankCenter[1] + height, layout.crankCenter[2])
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        inst.setMatrixAt(index, dummy.matrix)
      }
      inst.instanceMatrix.needsUpdate = true
    }
    if (data.role === 'rods' && (object as InstancedMesh).isInstancedMesh) {
      const inst = object as InstancedMesh
      for (let index = 0; index < inst.count; index += 1) {
        rodFrame(layout, angle, index, rodMatrix)
        inst.setMatrixAt(index, rodMatrix)
      }
      inst.instanceMatrix.needsUpdate = true
    }
    if (data.role === 'valves' && (object as InstancedMesh).isInstancedMesh && data.valveSpec && data.valveRestY !== undefined) {
      const inst = object as InstancedMesh
      data.valveSpec.forEach((spec, index) => {
        const lift = valveLift(angle, lobeCenter(INLINE4_FIRE_ANGLES[spec.index] ?? 0, spec.port))
        dummy.position.set(spec.x, data.valveRestY! - lift, spec.z)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        inst.setMatrixAt(index, dummy.matrix)
      })
      inst.instanceMatrix.needsUpdate = true
    }
    if (typeof data.spin === 'number') object.rotation.x = angle * data.spin
    if (typeof data.piston === 'number') {
      const phase = INLINE4_PHASES[data.piston] ?? 0
      const height = pistonHeight(angle, phase, layout.crankRadius, layout.rodLength)
      object.position.set(
        layout.pistonX[data.piston] ?? 0,
        layout.crankCenter[1] + height,
        layout.crankCenter[2],
      )
    }
    if (typeof data.rod === 'number') {
      const phase = INLINE4_PHASES[data.rod] ?? 0
      const pin = crankPin(layout, data.rod, angle, phase)
      const wrist = wristPin(layout, data.rod, pistonHeight(angle, phase, layout.crankRadius, layout.rodLength))
      direction.set(wrist[0] - pin[0], wrist[1] - pin[1], wrist[2] - pin[2])
      const length = direction.length() || 0.001
      direction.multiplyScalar(1 / length)
      midpoint.set((pin[0] + wrist[0]) / 2, (pin[1] + wrist[1]) / 2, (pin[2] + wrist[2]) / 2)
      object.position.copy(midpoint)
      object.quaternion.copy(spin.setFromUnitVectors(up, direction))
      object.scale.set(1, length / layout.rodLength, 1)
    }
    if (data.valve) {
      const lift = valveLift(angle, lobeCenter(INLINE4_FIRE_ANGLES[data.valve.index] ?? 0, data.valve.port))
      object.position.y = data.valve.restY - lift
    }
    if (typeof data.glow === 'number') {
      const mesh = object as Mesh
      const material = mesh.material as MeshBasicMaterial
      const phase = INLINE4_PHASES[data.glow] ?? 0
      const height = pistonHeight(angle, phase, layout.crankRadius, layout.rodLength)
      mesh.position.set(
        layout.pistonX[data.glow] ?? 0,
        layout.crankCenter[1] + height + layout.wristToCrown + 0.02,
        layout.crankCenter[2],
      )
      const amount = runtime.cutaway ? combustionGlow(angle, INLINE4_FIRE_ANGLES[data.glow] ?? 0) : 0
      material.opacity = amount * 0.9
      mesh.visible = amount > 0.04 && runtime.cutaway
    }
    if (typeof data.belt === 'number') {
      const material = (object as Mesh).material as MeshStandardMaterial
      if (material.map) material.map.offset.x = (angle * data.belt) / (Math.PI * 2)
    }
  })
}
