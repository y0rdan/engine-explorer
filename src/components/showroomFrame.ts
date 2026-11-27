import { Box3, PerspectiveCamera, Vector3, type Camera, type Object3D } from 'three'
import type { EngineLayout } from '../engine/layout.ts'
import type { EngineRecord } from '../engine/schema.ts'
import { stepRuntime, type EngineRuntime } from '../engine/runtime.ts'
import { layoutFor } from '../engine/templates.ts'
import type { VeeLayout } from '../engine/veeLayout.ts'
import {
  applyShowroomPose,
  clampCameraPlane,
  fitPose,
  isShowroomControls,
  shouldRefit,
  SHOWROOM_DIRECTION,
  type ScreenPadding,
} from './frameModel.ts'
import { showroomIsBusy, stepIdlePresentation } from './idleBob.ts'
import { applyFasteners } from './inline4/fastenerMotion.ts'
import { applyMotion, applyPlacements } from './inline4/simulate.ts'

export type DriverProps = {
  engine: EngineRecord
  partId: string | null
  layerId: string | null
  isolated: boolean
  assemblyMode: boolean
  cutaway: boolean
  runtime: EngineRuntime
  reducedMotion: boolean
  fitToken: number
  fitSmooth: boolean
  padding: ScreenPadding
  onSample: (sample: { explode: number; assembly: number }) => void
}

const EMPTY_PADDING: ScreenPadding = { top: 0, right: 0, bottom: 0, left: 0 }

export type ShowroomClock = {
  userHold: boolean
  userFramed: boolean
  token: number
  lastSample: number
  box: Box3
  layoutCache: { id: string; layout: EngineLayout | VeeLayout } | null
  sizeKey: string
  paddingKey: string
  idleSince: number
  // Last pose we already snapped or finished. Repeating setLookAt marks
  // camera-controls dirty even when the camera did not move.
  appliedPose: string
}

export function createShowroomClock(): ShowroomClock {
  return {
    userHold: false,
    userFramed: false,
    token: -1,
    lastSample: 0,
    box: new Box3(),
    layoutCache: null,
    sizeKey: '',
    paddingKey: '',
    idleSince: 0,
    appliedPose: '',
  }
}

export function poseKey(position: Vector3, target: Vector3): string {
  const digits = (value: number) => value.toFixed(3)
  return [position.x, position.y, position.z, target.x, target.y, target.z].map(digits).join(',')
}

export function driveShowroomFrame(input: {
  props: DriverProps
  now: number
  delta: number
  root: Object3D | null
  camera: Camera
  controls: unknown
  size: { width: number; height: number }
  clock: ShowroomClock
}): boolean {
  const { props, now, root, camera, controls, size, clock } = input
  const step = Math.min(input.delta, 0.05)
  if (!root) return false
  if (clock.layoutCache?.id !== props.engine.id) {
    clock.layoutCache = { id: props.engine.id, layout: layoutFor(props.engine) }
  }
  const layout = clock.layoutCache.layout
  props.runtime.cutaway = props.cutaway
  const moving = stepRuntime(props.runtime, now, step)
  applyPlacements(root, props.engine, layout, props.runtime, {
    partId: props.partId,
    isolated: props.isolated,
    assemblyMode: props.assemblyMode,
  })
  applyMotion(root, layout, props.runtime)
  root.updateWorldMatrix(true, true)
  applyFasteners(root, props.engine, layout, props.runtime, {
    partId: props.partId,
    isolated: props.isolated,
    assemblyMode: props.assemblyMode,
  })
  const nextSize = `${size.width}x${size.height}`
  const sizeChanged = clock.sizeKey !== nextSize
  if (sizeChanged) clock.sizeKey = nextSize
  const pad = props.padding
  const nextPadding = `${pad.top}:${pad.right}:${pad.bottom}:${pad.left}`
  const paddingChanged = clock.paddingKey !== nextPadding
  if (paddingChanged) clock.paddingKey = nextPadding
  const tokenChanged = props.fitToken !== clock.token
  if (tokenChanged) clock.token = props.fitToken
  const playing = props.runtime.explodePlaying || props.runtime.assemblyPlaying
  if (tokenChanged || sizeChanged || paddingChanged) clock.userFramed = false
  let cameraMoving = false
  if (
    camera instanceof PerspectiveCamera &&
    isShowroomControls(controls) &&
    shouldRefit({
      tokenChanged,
      sizeChanged: sizeChanged || paddingChanged,
      playing,
      userHold: clock.userHold,
      userFramed: clock.userFramed,
    })
  ) {
    const focus = focusObject(root, props)
    focus.updateWorldMatrix(true, true)
    clock.box.setFromObject(focus)
    if (props.partId === null) clock.box.min.y -= 0.04
    const pose = fitPose(
      camera.fov,
      size.width,
      size.height,
      clock.box,
      SHOWROOM_DIRECTION,
      1.28,
      props.padding ?? EMPTY_PADDING,
    )
    if (pose) {
      const key = poseKey(pose.position, pose.target)
      if (key === clock.appliedPose) {
        cameraMoving = false
      } else {
        const smooth = props.fitSmooth && !playing && !props.reducedMotion && !sizeChanged
        const applied = applyShowroomPose(controls, camera, pose, smooth, step)
        cameraMoving = applied.moving
        if (!applied.moving) clock.appliedPose = key
      }
    }
  } else if (camera instanceof PerspectiveCamera && isShowroomControls(controls)) {
    clampCameraPlane(camera, controls)
  }
  const runtime = props.runtime
  const busy = showroomIsBusy({
    assemblyMode: props.assemblyMode,
    enginePlaying: runtime.enginePlaying,
    explodePlaying: runtime.explodePlaying,
    assemblyPlaying: runtime.assemblyPlaying,
    explode: runtime.explode,
    assembly: runtime.assembly,
  })
  if (moving || cameraMoving || clock.userHold || busy) clock.idleSince = now
  const bob = stepIdlePresentation({
    reducedMotion: props.reducedMotion,
    busy,
    now,
    delta: step,
    idleSince: clock.idleSince,
    positionY: root.position.y,
  })
  root.position.y = bob.positionY
  if ((moving || cameraMoving || bob.invalidate) && now - clock.lastSample > 0.12) {
    clock.lastSample = now
    props.onSample({ explode: props.runtime.explode, assembly: props.runtime.assembly })
  }
  return moving || cameraMoving || bob.invalidate
}

function focusObject(root: Object3D, props: DriverProps): Object3D {
  if (props.partId && props.layerId) {
    return root.getObjectByName(`layer:${props.partId}:${props.layerId}`) ?? root
  }
  if (props.partId) return root.getObjectByName(`part:${props.partId}`) ?? root
  return root.getObjectByName('powertrain') ?? root
}
