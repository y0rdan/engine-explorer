import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, type MutableRefObject } from 'react'
import { isShowroomControls } from './frameModel.ts'
import { createShowroomClock, driveShowroomFrame, type DriverProps } from './showroomFrame.ts'

export type { DriverProps }

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
  const clock = useRef(createShowroomClock())

  useEffect(() => {
    pokeRef.current = invalidate
  }, [invalidate, pokeRef])

  useEffect(() => {
    if (!isShowroomControls(controls)) return
    const state = clock.current
    const onStart = () => {
      state.userHold = true
    }
    const onControl = () => {
      state.userFramed = true
    }
    const onEnd = () => {
      state.userHold = false
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
    const request = driveShowroomFrame({
      props: driverRef.current,
      now: state.clock.elapsedTime,
      delta,
      root: scene.getObjectByName('engine-root') ?? null,
      camera,
      controls,
      size,
      clock: clock.current,
    })
    if (request) invalidate()
  })

  return null
}
