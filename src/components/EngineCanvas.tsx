import { useGLTF } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { PerspectiveCamera, type Object3D } from 'three'
import { CanvasErrorBoundary } from './CanvasErrorBoundary.tsx'
import { EngineControls } from './EngineControls.tsx'
import { frameModel, isOrbitControls } from './frameModel.ts'
import {
  MODEL_LOAD_ERROR,
  MODEL_LOADING_MESSAGE,
  SCENE_LABEL,
  engineModelUrl,
  preloadEngineModel,
} from './engineModel.ts'

const modelUrl = engineModelUrl()

function FrameModel({ object }: { object: Object3D }) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const controls = useThree((state) => state.controls)
  const invalidate = useThree((state) => state.invalidate)

  useLayoutEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) return
    frameModel(camera, isOrbitControls(controls) ? controls : null, object, size.width, size.height)
    invalidate()
  }, [object, camera, size, controls, invalidate])

  return null
}

function EngineModel() {
  const { scene } = useGLTF(modelUrl, false)
  const model = useMemo(() => scene.clone(true), [scene])
  return (
    <>
      <primitive object={model} />
      <FrameModel object={model} />
    </>
  )
}

function ModelNotice({ message, alert }: { message: string; alert?: boolean }) {
  return (
    <p className="canvas-fallback" role={alert ? 'alert' : 'status'}>
      <span className="model-status">{message}</span>
    </p>
  )
}

export function EngineCanvas() {
  const [phase, setPhase] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    let active = true
    preloadEngineModel(modelUrl)
      .then(() => {
        if (active) setPhase('ready')
      })
      .catch(() => {
        if (active) setPhase('failed')
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <CanvasErrorBoundary>
      <Canvas
        camera={{ position: [2.6, 1.7, 2.6], fov: 42, near: 0.01, far: 50 }}
        dpr={[1, 1.75]}
        fallback={<span>{SCENE_LABEL}</span>}
        frameloop="demand"
        gl={{ antialias: true }}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          canvas.tabIndex = 0
          canvas.setAttribute('role', 'img')
          canvas.setAttribute('aria-label', SCENE_LABEL)
        }}
      >
        <color attach="background" args={['#101418']} />
        <ambientLight intensity={0.62} />
        <hemisphereLight args={['#f7f4ee', '#243038', 0.5]} />
        <directionalLight position={[4.5, 6, 3]} intensity={2.1} />
        <directionalLight position={[-3.5, 2.2, -2.5]} intensity={0.55} />
        <EngineControls />
        {phase === 'ready' && (
          <Suspense fallback={null}>
            <EngineModel />
          </Suspense>
        )}
      </Canvas>
      {phase === 'loading' && <ModelNotice message={MODEL_LOADING_MESSAGE} />}
      {phase === 'failed' && <ModelNotice alert message={MODEL_LOAD_ERROR} />}
    </CanvasErrorBoundary>
  )
}
