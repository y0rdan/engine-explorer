import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { bindOrbitKeys } from './orbitKeys.ts'
import { usePrefersReducedMotion } from './usePrefersReducedMotion.ts'

export function EngineControls({ damping }: { damping?: boolean }) {
  const gl = useThree((state) => state.gl)
  const reducedMotion = usePrefersReducedMotion()
  const controls = useRef<OrbitControlsImpl>(null)
  const damp = damping ?? !reducedMotion

  useEffect(() => {
    const orbit = controls.current
    if (orbit === null) return
    // Runs after OrbitControls' own effect, which connects and disposes when
    // its element changes. Passing domElement keeps that element stable so
    // dispose does not run again and drop this key listener.
    return bindOrbitKeys(orbit, gl.domElement)
  }, [gl])

  return (
    <OrbitControls
      ref={controls}
      domElement={gl.domElement}
      makeDefault
      enableDamping={damp}
      dampingFactor={0.08}
      enablePan
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  )
}
