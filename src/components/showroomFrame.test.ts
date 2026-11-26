import { Box3, MathUtils, Matrix4, PerspectiveCamera, Quaternion, Raycaster, Sphere, Spherical, Vector2, Vector3, Vector4 } from 'three'
import CameraControls from 'camera-controls'
import { describe, expect, it } from 'vitest'
import { genericInline4, genericV6, genericV8 } from '../data/engines/catalog.ts'
import { createRuntime, type EngineRuntime } from '../engine/runtime.ts'
import type { EngineRecord } from '../engine/schema.ts'
import { createInline4 } from './inline4/createInline4.ts'
import { createShowroomClock, driveShowroomFrame, type DriverProps } from './showroomFrame.ts'
import { createVee } from './vee/createVee.ts'

CameraControls.install({
  THREE: {
    Box3,
    MathUtils: { clamp: MathUtils.clamp },
    Matrix4,
    Quaternion,
    Raycaster,
    Sphere,
    Spherical,
    Vector2,
    Vector3,
    Vector4,
  },
})

const FRAME = 1 / 60
const QUIET_FRAMES = 120

function propsFor(engine: EngineRecord, reducedMotion: boolean): DriverProps {
  const runtime: EngineRuntime = createRuntime()
  return {
    engine,
    partId: null,
    layerId: null,
    isolated: false,
    assemblyMode: false,
    cutaway: false,
    runtime,
    reducedMotion,
    fitToken: 1,
    fitSmooth: true,
    padding: { top: 28, right: 12, bottom: 80, left: 12 },
    onSample: () => {},
  }
}

// Steps the same frame the canvas runs: camera-controls.update (which invalidates
// on its update event) and then SceneDriver's frame. Returns whether that frame
// asked for another one.
function stepFrame(input: {
  props: DriverProps
  now: number
  root: ReturnType<typeof createInline4>
  camera: PerspectiveCamera
  controls: CameraControls
  clock: ReturnType<typeof createShowroomClock>
  dirty: { current: boolean }
}): boolean {
  input.dirty.current = false
  input.controls.update(FRAME)
  const request = driveShowroomFrame({
    props: input.props,
    now: input.now,
    delta: FRAME,
    root: input.root,
    camera: input.camera,
    controls: input.controls,
    size: { width: 1280, height: 720 },
    clock: input.clock,
  })
  return input.dirty.current || request
}

function idleTail(engine: EngineRecord, reducedMotion: boolean): boolean[] {
  const root = engine.layout === 'inline-4' ? createInline4(engine) : createVee(engine)
  const camera = new PerspectiveCamera(30, 1280 / 720, 0.02, 40)
  camera.position.set(-1.15, 0.78, 0.72)
  const controls = new CameraControls(camera)
  controls.smoothTime = reducedMotion ? 0 : 0.42
  controls.draggingSmoothTime = 0.12
  controls.restThreshold = 0.002
  controls.minPolarAngle = 0.18
  controls.maxPolarAngle = Math.PI / 2 - 0.08
  const dirty = { current: false }
  controls.addEventListener('update', () => {
    dirty.current = true
  })
  const clock = createShowroomClock()
  const props = propsFor(engine, reducedMotion)
  const frames: boolean[] = []
  const seconds = reducedMotion ? 6 : 10
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame += 1) {
    frames.push(
      stepFrame({
        props,
        now: frame * FRAME,
        root,
        camera,
        controls,
        clock,
        dirty,
      }),
    )
  }
  return frames.slice(-QUIET_FRAMES)
}

describe('showroom demand loop', () => {
  it.each([
    ['inline-4', genericInline4, false],
    ['inline-4', genericInline4, true],
    ['v6', genericV6, false],
    ['v6', genericV6, true],
    ['v8', genericV8, false],
    ['v8', genericV8, true],
  ] as const)('requests no frames for 2s after %s settles (reduced motion %s)', (_label, engine, reducedMotion) => {
    const tail = idleTail(engine, reducedMotion)
    expect(tail).toHaveLength(QUIET_FRAMES)
    expect(tail.some(Boolean)).toBe(false)
    expect(tail.filter(Boolean).length / 2).toBe(0)
  })
})
