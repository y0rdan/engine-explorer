import { OrbitControls, Edges } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef, useState, type ComponentRef } from 'react'
import { PerspectiveCamera, type Mesh } from 'three'

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => {
      setReduced(media.matches)
    }
    media.addEventListener('change', onChange)
    return () => {
      media.removeEventListener('change', onChange)
    }
  }, [])

  return reduced
}

function FrameSubject() {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    const radius = 1.45
    const aspect = size.width / Math.max(size.height, 1)
    const vertical = (camera.fov * Math.PI) / 180
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect)
    const distance = radius / Math.sin(Math.min(vertical, horizontal) / 2)
    const span = Math.hypot(1, 0.55, 1)
    camera.position.set(distance / span, (distance * 0.55) / span, distance / span)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
  }, [camera, size])

  return null
}

export function PlaceholderScene() {
  const mesh = useRef<Mesh>(null)
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const gl = useThree((state) => state.gl)
  const reducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const orbit = controls.current
    if (orbit === null) return
    // This drei release's keyEvents prop calls connect() and does not register keydown.
    orbit.listenToKeyEvents(gl.domElement)
    return () => {
      orbit.stopListenToKeyEvents()
    }
  }, [gl])

  useFrame((_, delta) => {
    if (reducedMotion || mesh.current === null) return
    mesh.current.rotation.y += delta * 0.45
    mesh.current.rotation.x += delta * 0.12
  })

  return (
    <>
      <FrameSubject />
      <color attach="background" args={['#101418']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 5, 3]} intensity={1.5} />
      <directionalLight position={[-4, 1, -2]} intensity={0.4} />
      <mesh ref={mesh} rotation={[0.35, 0.6, 0]}>
        <boxGeometry args={[1.35, 1.35, 1.35]} />
        <meshStandardMaterial color="#d4843c" metalness={0.42} roughness={0.32} />
        <Edges color="#f6efe4" />
      </mesh>
      <OrbitControls
        ref={controls}
        enableDamping
        dampingFactor={0.08}
        minDistance={2.2}
        maxDistance={8}
      />
    </>
  )
}
