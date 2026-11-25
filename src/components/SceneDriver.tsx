import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type MutableRefObject } from 'react'
import { Box3, PerspectiveCamera } from 'three'
import { layoutFromEngine, type EngineLayout } from '../engine/layout.ts'
import type { EngineRecord } from '../engine/schema.ts'
import type { EngineRuntime } from '../engine/runtime.ts'
import { stepRuntime } from '../engine/runtime.ts'
import { fitPose, isOrbitControls, SHOWROOM_DIRECTION } from './frameModel.ts'
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
  onSample: (sample: { explode: number; assembly: number }) => void
}

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
  const grabbed = useRef(false)
  const token = useRef(-1)
  const fitting = useRef(true)
  const lastSample = useRef(0)
  const box = useRef(new Box3())
  const layoutCache = useRef<{ id: string; layout: EngineLayout } | null>(null)
  const sizeKey = useRef('')

  useEffect(() => {
    pokeRef.current = invalidate
  }, [invalidate, pokeRef])

  useEffect(() => {
    if (!isOrbitControls(controls)) return
    const onStart = () => {
      grabbed.current = true
      fitting.current = false
    }
    controls.addEventListener('start', onStart)
    return () => controls.removeEventListener('start', onStart)
  }, [controls])

  useFrame((state, delta) => {
    const props = driverRef.current
    const now = state.clock.elapsedTime
    const step = Math.min(delta, 0.05)
    const root = scene.getObjectByName('engine-root')
    if (!root) return
    if (layoutCache.current?.id !== props.engine.id) {
      layoutCache.current = { id: props.engine.id, layout: layoutFromEngine(props.engine) }
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
    const nextSize = `${size.width}x${size.height}`
    if (sizeKey.current !== nextSize) {
      sizeKey.current = nextSize
      grabbed.current = false
      fitting.current = true
    }
    if (props.fitToken !== token.current) {
      token.current = props.fitToken
      grabbed.current = false
      fitting.current = true
    }
    if (props.runtime.explodePlaying || props.runtime.assemblyPlaying) fitting.current = true
    let cameraMoving = false
    if (fitting.current && !grabbed.current && camera instanceof PerspectiveCamera) {
      root.updateWorldMatrix(true, true)
      const focus = focusObject(root, props)
      const pose = fitPose(
        camera.fov,
        size.width,
        size.height,
        box.current.setFromObject(focus),
        SHOWROOM_DIRECTION,
      )
      if (pose) {
        const blend = props.reducedMotion ? 1 : 1 - Math.exp(-5 * Math.max(step, 0.016))
        camera.position.lerp(pose.position, blend)
        camera.near = pose.near
        camera.far = pose.far
        camera.updateProjectionMatrix()
        if (isOrbitControls(controls)) {
          controls.target.lerp(pose.target, blend)
          controls.minDistance = pose.radius * 0.4
          controls.maxDistance = Math.max(pose.radius * 14, 4)
          controls.update()
        }
        cameraMoving = camera.position.distanceTo(pose.position) > 0.008
        if (!cameraMoving && !props.runtime.explodePlaying && !props.runtime.assemblyPlaying) {
          fitting.current = false
        }
      }
    }
    if ((moving || cameraMoving) && now - lastSample.current > 0.12) {
      lastSample.current = now
      props.onSample({ explode: props.runtime.explode, assembly: props.runtime.assembly })
    }
    if (moving || cameraMoving) invalidate()
  })

  return null
}

function focusObject(root: import('three').Object3D, props: DriverProps) {
  if (props.partId && props.layerId) {
    return root.getObjectByName(`layer:${props.partId}:${props.layerId}`) ?? root
  }
  if (props.partId) return root.getObjectByName(`part:${props.partId}`) ?? root
  return root
}
