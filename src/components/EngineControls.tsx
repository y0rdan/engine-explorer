import { CameraControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type CameraControlsImpl from 'camera-controls'
import { bindCameraKeys } from './cameraKeys.ts'
import { usePrefersReducedMotion } from './usePrefersReducedMotion.ts'

export function EngineControls() {
  const gl = useThree((state) => state.gl)
  const reducedMotion = usePrefersReducedMotion()
  const controls = useRef<CameraControlsImpl>(null)

  useEffect(() => {
    const current = controls.current
    if (current === null) return
    return bindCameraKeys(current, gl.domElement)
  }, [gl])

  return (
    <CameraControls
      ref={controls}
      makeDefault
      smoothTime={reducedMotion ? 0 : 0.42}
      draggingSmoothTime={0.12}
      dollySpeed={0.45}
      azimuthRotateSpeed={0.55}
      polarRotateSpeed={0.45}
      minPolarAngle={0.18}
      maxPolarAngle={Math.PI / 2 - 0.08}
      infinityDolly={false}
      restThreshold={0.002}
    />
  )
}
