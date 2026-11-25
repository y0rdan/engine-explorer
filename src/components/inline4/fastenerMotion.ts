import {
  InstancedMesh,
  Matrix4,
  Object3D,
  Quaternion,
  Sprite,
  Vector3,
  type Object3D as ThreeObject,
} from 'three'
import { fastenerInstall, poseFromInstall, stepBlend, traySlot } from '../../engine/fasteners.ts'
import { activeStepIndex, assemblySteps } from '../../engine/placement.ts'
import type { EngineRecord, FastenerGroup } from '../../engine/schema.ts'
import type { EngineRuntime } from '../../engine/runtime.ts'
import { emphasisFor } from '../../engine/emphasis.ts'
import type { EngineLayout } from '../../engine/layout.ts'
import type { FastenerRecord } from './createInline4.ts'
import { trayOrigin } from './createInline4.ts'
import { rodFrame } from './simulate.ts'

const dummy = new Object3D()
const local = new Matrix4()
const world = new Matrix4()
const quat = new Quaternion()
const axis = new Vector3()
const up = new Vector3(0, 1, 0)
const seated = new Vector3()
const point = new Vector3()
const trayPoint = new Vector3()
const spinQuat = new Quaternion()
const labelOffset = new Vector3(0, 0.03, 0)

type View = { partId: string | null; isolated: boolean; assemblyMode: boolean }

export function applyFasteners(
  root: ThreeObject,
  engine: EngineRecord,
  layout: EngineLayout,
  runtime: EngineRuntime,
  view: View,
): void {
  const groups = new Map<string, FastenerGroup>()
  for (const part of engine.parts) {
    for (const fastener of part.fasteners) groups.set(`${part.id}:${fastener.id}`, fastener)
  }
  const assembling = view.assemblyMode && !(view.isolated && view.partId)
  const steps = assembling ? assemblySteps(engine, null, false) : []
  const active = steps[activeStepIndex(runtime.assembly, steps.length)]
  const showNumbers = assembling && active?.fastenerId === 'head-bolts'
  const origin = trayOrigin(layout)
  let slot = 0
  const labelPoints: Vector3[] = []
  root.updateWorldMatrix(true, true)
  root.traverse((object) => {
    if (!(object as InstancedMesh).isInstancedMesh) return
    if (!object.name.startsWith('fasteners:')) return
    const mesh = object as InstancedMesh
    const records = mesh.userData.records as FastenerRecord[] | undefined
    if (!records) return
    records.forEach((record, instance) => {
      const fastener = groups.get(`${record.partId}:${record.fastenerId}`)
      const partGroup = root.getObjectByName(`part:${record.partId}`)
      if (!fastener || !partGroup) return
      const stepIndex = steps.findIndex((step) => step.partId === record.partId && step.fastenerId === record.fastenerId)
      const blend = stepIndex < 0 ? 1 : stepBlend(runtime.assembly, stepIndex, steps.length)
      const install = assembling ? fastenerInstall(blend, record.sequence, record.count) : 1
      const pose = poseFromInstall(install, backupFor(record.size))
      const hidden = emphasisFor({
        partId: record.partId,
        layerId: null,
        selectedPartId: view.partId,
        selectedLayerId: null,
        hoveredPartId: null,
        isolated: view.isolated,
        assemblyPartId: null,
      }) === 'hidden'
      const base = anchorMatrix(root, partGroup, fastener.anchors?.[record.index] ?? null, layout, runtime)
      const localPosition = fastener.positions[record.index] ?? [0, 0, 0]
      axis.set(fastener.axis[0], fastener.axis[1], fastener.axis[2]).normalize()
      seated.set(localPosition[0], localPosition[1], localPosition[2]).applyMatrix4(base)
      axis.transformDirection(base)
      point.copy(seated).addScaledVector(axis, pose.backup)
      const slotIndex = slot
      slot += 1
      const tray = traySlot(slotIndex, origin)
      trayPoint.set(tray[0], tray[1], tray[2])
      point.lerp(trayPoint, pose.tray)
      quat.setFromUnitVectors(up, axis)
      spinQuat.setFromAxisAngle(axis, pose.spin)
      quat.premultiply(spinQuat)
      const scale = nominal(record.size) * (hidden ? 0 : 1)
      dummy.position.copy(point)
      dummy.quaternion.copy(quat)
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      mesh.setMatrixAt(instance, dummy.matrix)
      if (record.partId === 'cylinder-head' && record.fastenerId === 'head-bolts') {
        labelPoints[record.index] = point.clone()
      }
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  const labels = root.getObjectByName('bolt-labels')
  labels?.children.forEach((child) => {
    const sprite = child as Sprite
    const index = sprite.userData.labelIndex as number
    const at = labelPoints[index]
    sprite.visible = showNumbers && Boolean(at)
    if (at) sprite.position.copy(at).add(labelOffset)
  })
}

function anchorMatrix(
  root: ThreeObject,
  partGroup: ThreeObject,
  anchor: string | null,
  layout: EngineLayout,
  runtime: EngineRuntime,
): Matrix4 {
  if (anchor?.startsWith('rod:')) {
    const index = Number(anchor.slice(4))
    rodFrame(layout, runtime.crank, index, local)
    return world.multiplyMatrices(partGroup.matrixWorld, local)
  }
  if (anchor) {
    const object = root.getObjectByName(anchor) ?? partGroup.getObjectByName(anchor)
    if (object) return object.matrixWorld
  }
  return partGroup.matrixWorld
}

function nominal(size: string): number {
  const match = /M(\d+(?:\.\d+)?)/.exec(size)
  return (match ? Number(match[1]) : 8) / 8
}

function backupFor(size: string): number {
  return 0.01 + nominal(size) * 0.012
}
