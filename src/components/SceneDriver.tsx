import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type MutableRefObject } from 'react'
import { Box3, PerspectiveCamera, Vector3, type Object3D } from 'three'
import { layoutFor } from '../engine/templates.ts'
import type { EngineLayout } from '../engine/layout.ts'
import type { VeeLayout } from '../engine/veeLayout.ts'
import type { EngineRecord } from '../engine/schema.ts'
import type { EngineRuntime } from '../engine/runtime.ts'
import { stepRuntime } from '../engine/runtime.ts'
import {
  applyShowroomPose,
  clampCameraPlane,
  fitPose,
  isShowroomControls,
  shouldRefit,
  SHOWROOM_DIRECTION,
  type ScreenPadding,
} from './frameModel.ts'
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

export function SceneDriver({
  driverRef,
  pokeRef,
}: {
  driverRef: MutableRefObject<DriverProps>
  pokeRef: MutableRefObject<() => void>
}) {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const controls = useThree((state) => state.controls)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)
  const userHold = useRef(false)
  const userFramed = useRef(false)
  const token = useRef(-1)
  const lastSample = useRef(0)
  const box = useRef(new Box3())
  const layoutCache = useRef<{ id: string; layout: EngineLayout | VeeLayout } | null>(null)
  const sizeKey = useRef('')
  const paddingKey = useRef('')
  const target = useRef(new Vector3())

  useEffect(() => {
    pokeRef.current = invalidate
  }, [invalidate, pokeRef])

  useEffect(() => {
    if (!isShowroomControls(controls)) return
    const onStart = () => {
      userHold.current = true
    }
    const onControl = () => {
      userFramed.current = true
    }
    const onEnd = () => {
      userHold.current = false
    }
    controls.addEventListener('controlstart', onStart)
    controls.addEventListener('control', onControl)
    controls.addEventListener('controlend', onEnd)
    return () => {
      controls.removeEventListener('controlstart', onStart)
      controls.removeEventListener('control', onControl)
      controls.removeEventListener('controlend', onEnd)
    }
  }, [controls])

  useFrame((state, delta) => {
    const props = driverRef.current
    const now = state.clock.elapsedTime
    const step = Math.min(delta, 0.05)
    const root = scene.getObjectByName('engine-root')
    if (!root) {
      invalidate()
      return
    }
    if (layoutCache.current?.id !== props.engine.id) {
      layoutCache.current = { id: props.engine.id, layout: layoutFor(props.engine) }
    }
    const layout = layoutCache.current.layout
    props.runtime.cutaway = props.cutaway
    const moving = stepRuntime(props.runtime, now, step)
    applyPlacements(root, props.engine, layout, props.runtime, {
      partId: props.partId,
      isolated: props.isolated,
      assemblyMode: props.assemblyMode,
    })
    applyMotion(root, layout, props.runtime)
    const bobTarget = idleBob(props, now)
    const blend = props.reducedMotion ? 1 : 1 - Math.exp(-4 * Math.max(step, 0.016))
    root.position.y += (bobTarget - root.position.y) * blend
    const bobbing = Math.abs(root.position.y - bobTarget) > 0.0004 || Math.abs(bobTarget) > 0.0004
    root.updateWorldMatrix(true, true)
    applyFasteners(root, props.engine, layout, props.runtime, {
      partId: props.partId,
      isolated: props.isolated,
      assemblyMode: props.assemblyMode,
    })
    const nextSize = `${size.width}x${size.height}`
    const sizeChanged = sizeKey.current !== nextSize
    if (sizeChanged) sizeKey.current = nextSize
    const pad = props.padding
    const nextPadding = `${pad.top}:${pad.right}:${pad.bottom}:${pad.left}`
    const paddingChanged = paddingKey.current !== nextPadding
    if (paddingChanged) paddingKey.current = nextPadding
    const tokenChanged = props.fitToken !== token.current
    if (tokenChanged) token.current = props.fitToken
    const playing = props.runtime.explodePlaying || props.runtime.assemblyPlaying
    if (tokenChanged || sizeChanged || paddingChanged) userFramed.current = false
    let cameraMoving = false
    if (
      camera instanceof PerspectiveCamera &&
      isShowroomControls(controls) &&
      shouldRefit({
        tokenChanged,
        sizeChanged: sizeChanged || paddingChanged,
        playing,
        userHold: userHold.current,
        userFramed: userFramed.current,
      })
    ) {
      const focus = focusObject(root, props)
      focus.updateWorldMatrix(true, true)
      box.current.setFromObject(focus)
      if (props.partId === null) box.current.min.y -= 0.04
      const pose = fitPose(
        camera.fov,
        size.width,
        size.height,
        box.current,
        SHOWROOM_DIRECTION,
        1.28,
        props.padding ?? EMPTY_PADDING,
      )
      if (pose) {
        const smooth = props.fitSmooth && !playing && !props.reducedMotion && !sizeChanged
        const applied = applyShowroomPose(controls, camera, pose, smooth, step)
        target.current.copy(applied.target)
        cameraMoving = applied.moving
      }
    } else if (camera instanceof PerspectiveCamera && isShowroomControls(controls)) {
      clampCameraPlane(camera, controls)
    }
    if ((moving || cameraMoving || bobbing) && now - lastSample.current > 0.12) {
      lastSample.current = now
      props.onSample({ explode: props.runtime.explode, assembly: props.runtime.assembly })
    }
    if (moving || cameraMoving || bobbing) invalidate()
  })

  return null
}

function idleBob(props: DriverProps, now: number): number {
  if (props.reducedMotion) return 0
  const runtime = props.runtime
  const busy =
    runtime.enginePlaying ||
    runtime.explodePlaying ||
    runtime.assemblyPlaying ||
    props.assemblyMode ||
    runtime.explode > 0.02 ||
    runtime.assembly < 0.98
  if (busy) return 0
  return Math.sin(now * 1.5) * 0.0032
}

function focusObject(root: Object3D, props: DriverProps): Object3D {
  if (props.partId && props.layerId) {
    return root.getObjectByName(`layer:${props.partId}:${props.layerId}`) ?? root
  }
  if (props.partId) return root.getObjectByName(`part:${props.partId}`) ?? root
  return root.getObjectByName('powertrain') ?? root
}
