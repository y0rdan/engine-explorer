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
import type { CylinderMotion, MotionLayout, Vec3 } from '../../engine/layout.ts'
import { pistonPhaseOffset } from '../../engine/layout.ts'
import { combustionGlow, lobeCenter, pistonHeight, valveLift } from '../../engine/kinematics.ts'
import { placementMode, travelsFor } from '../../engine/placement.ts'
import type { EngineRecord } from '../../engine/schema.ts'
import type { EngineRuntime } from '../../engine/runtime.ts'

const up = new Vector3(0, 1, 0)
const axis = new Vector3()
const direction = new Vector3()
const midpoint = new Vector3()
const spin = new Quaternion()
const dummy = new Object3D()
const rodMatrix = new Matrix4()

type ValveSpec = {
  index: number
  port: 'intake' | 'exhaust'
  x: number
  z: number
  rest?: Vec3
}

function anchorOf(layout: MotionLayout, id: string): Vec3 {
  return layout.anchors[id] ?? [0, 0, 0]
}

function cylinderAt(layout: MotionLayout, index: number): CylinderMotion | undefined {
  return layout.cylinders[index]
}

export function wristAt(layout: MotionLayout, index: number, angle: number): Vec3 {
  const cylinder = cylinderAt(layout, index)
  if (!cylinder) return [0, 0, 0]
  const travel = pistonHeight(angle, pistonPhaseOffset(cylinder), layout.crankRadius, layout.rodLength)
  return [
    cylinder.x + cylinder.boreAxis[0] * travel,
    layout.crankCenter[1] + cylinder.boreAxis[1] * travel,
    layout.crankCenter[2] + cylinder.boreAxis[2] * travel,
  ]
}

export function pinAt(layout: MotionLayout, index: number, angle: number): Vec3 {
  const cylinder = cylinderAt(layout, index)
  if (!cylinder) return [0, 0, 0]
  const phi = angle + cylinder.phase
  const zSign = cylinder.crankMirror ? -1 : 1
  return [
    cylinder.journalX,
    layout.crankCenter[1] + Math.cos(phi) * layout.crankRadius,
    layout.crankCenter[2] + Math.sin(phi) * layout.crankRadius * zSign,
  ]
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

export function rodFrame(layout: MotionLayout, angle: number, index: number, target: Matrix4): void {
  const pin = pinAt(layout, index, angle)
  const wrist = wristAt(layout, index, angle)
  direction.set(wrist[0] - pin[0], wrist[1] - pin[1], wrist[2] - pin[2])
  const length = direction.length() || 0.001
  direction.multiplyScalar(1 / length)
  midpoint.set((pin[0] + wrist[0]) / 2, (pin[1] + wrist[1]) / 2, (pin[2] + wrist[2]) / 2)
  spin.setFromUnitVectors(up, direction)
  target.compose(midpoint, spin, new Vector3(1, length / Math.max(layout.rodLength, 0.001), 1))
}

function placeRod(layout: MotionLayout, angle: number, index: number): void {
  rodFrame(layout, angle, index, rodMatrix)
  dummy.position.setFromMatrixPosition(rodMatrix)
  dummy.quaternion.setFromRotationMatrix(rodMatrix)
  dummy.scale.setFromMatrixScale(rodMatrix)
}

function placePiston(layout: MotionLayout, index: number, angle: number): void {
  const cylinder = cylinderAt(layout, index)
  const wrist = wristAt(layout, index, angle)
  dummy.position.set(wrist[0], wrist[1], wrist[2])
  dummy.scale.set(1, 1, 1)
  if (cylinder) {
    axis.set(cylinder.boreAxis[0], cylinder.boreAxis[1], cylinder.boreAxis[2])
    dummy.quaternion.copy(spin.setFromUnitVectors(up, axis))
  } else {
    dummy.quaternion.identity()
  }
}

function indicesOf(data: { cylinderIndices?: number[] }, count: number): number[] {
  return data.cylinderIndices ?? Array.from({ length: count }, (_, index) => index)
}

export function applyMotion(root: Object3D, layout: MotionLayout, runtime: EngineRuntime): void {
  const angle = runtime.crank
  root.traverse((object) => {
    const data = object.userData as {
      spin?: number
      piston?: number
      rod?: number
      valve?: { index: number; port: 'intake' | 'exhaust'; restY: number }
      glow?: number
      belt?: number
      role?: string
      valveRestY?: number
      valveSpec?: ValveSpec[]
      cylinderIndices?: number[]
    }
    if (data.role === 'pistons' && (object as InstancedMesh).isInstancedMesh) {
      const inst = object as InstancedMesh
      indicesOf(data, inst.count).forEach((cylinderIndex, slot) => {
        dummy.rotation.set(0, 0, 0)
        placePiston(layout, cylinderIndex, angle)
        dummy.updateMatrix()
        inst.setMatrixAt(slot, dummy.matrix)
      })
      inst.instanceMatrix.needsUpdate = true
    }
    if (data.role === 'rods' && (object as InstancedMesh).isInstancedMesh) {
      const inst = object as InstancedMesh
      indicesOf(data, inst.count).forEach((cylinderIndex, slot) => {
        dummy.rotation.set(0, 0, 0)
        placeRod(layout, angle, cylinderIndex)
        dummy.updateMatrix()
        inst.setMatrixAt(slot, dummy.matrix)
      })
      inst.instanceMatrix.needsUpdate = true
    }
    if (data.role === 'valves' && (object as InstancedMesh).isInstancedMesh && data.valveSpec && data.valveRestY !== undefined) {
      const inst = object as InstancedMesh
      const restY = data.valveRestY
      data.valveSpec.forEach((spec, index) => {
        const cylinder = cylinderAt(layout, spec.index)
        const fire = cylinder?.fireAngle ?? 0
        const lift = valveLift(angle, lobeCenter(fire, spec.port))
        const bore = cylinder?.boreAxis ?? [0, 1, 0]
        const rest = spec.rest ?? [spec.x, restY, spec.z]
        dummy.position.set(rest[0] - bore[0] * lift, rest[1] - bore[1] * lift, rest[2] - bore[2] * lift)
        dummy.scale.set(1, 1, 1)
        axis.set(bore[0], bore[1], bore[2])
        dummy.quaternion.copy(spin.setFromUnitVectors(up, axis))
        dummy.updateMatrix()
        inst.setMatrixAt(index, dummy.matrix)
      })
      inst.instanceMatrix.needsUpdate = true
    }
    if (typeof data.spin === 'number') object.rotation.x = angle * data.spin
    if (typeof data.piston === 'number') {
      placePiston(layout, data.piston, angle)
      object.position.copy(dummy.position)
      object.quaternion.copy(dummy.quaternion)
    }
    if (typeof data.rod === 'number') {
      placeRod(layout, angle, data.rod)
      object.position.copy(dummy.position)
      object.quaternion.copy(dummy.quaternion)
      object.scale.copy(dummy.scale)
    }
    if (data.valve) {
      const fire = cylinderAt(layout, data.valve.index)?.fireAngle ?? 0
      const lift = valveLift(angle, lobeCenter(fire, data.valve.port))
      object.position.y = data.valve.restY - lift
    }
    if (typeof data.glow === 'number') {
      const mesh = object as Mesh
      const material = mesh.material as MeshBasicMaterial
      const cylinder = cylinderAt(layout, data.glow)
      const fire = cylinder?.fireAngle ?? 0
      const wrist = wristAt(layout, data.glow, angle)
      const bore = cylinder?.boreAxis ?? [0, 1, 0]
      const crown = ((layout as { wristToCrown?: number }).wristToCrown ?? 0.028) + 0.02
      mesh.position.set(wrist[0] + bore[0] * crown, wrist[1] + bore[1] * crown, wrist[2] + bore[2] * crown)
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
