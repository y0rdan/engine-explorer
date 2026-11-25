import { Canvas } from '@react-three/fiber'
import { CanvasErrorBoundary } from './CanvasErrorBoundary.tsx'
import { PlaceholderScene } from './PlaceholderScene.tsx'

const sceneLabel = 'Placeholder 3D scene'

export function EngineCanvas() {
  return (
    <CanvasErrorBoundary>
      <Canvas
        camera={{ position: [2.8, 1.8, 2.8], fov: 45 }}
        dpr={[1, 1.75]}
        fallback={<span>{sceneLabel}</span>}
        gl={{ antialias: true }}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          canvas.tabIndex = 0
          canvas.setAttribute('role', 'img')
          canvas.setAttribute('aria-label', sceneLabel)
        }}
      >
        <PlaceholderScene />
      </Canvas>
    </CanvasErrorBoundary>
  )
}
