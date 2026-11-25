import { Canvas } from '@react-three/fiber'
import { CanvasErrorBoundary } from './CanvasErrorBoundary.tsx'
import { PlaceholderScene } from './PlaceholderScene.tsx'

export function EngineCanvas() {
  return (
    <CanvasErrorBoundary>
      <Canvas
        aria-label="Placeholder 3D scene"
        camera={{ position: [2.8, 1.8, 2.8], fov: 45 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true }}
        style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
      >
        <PlaceholderScene />
      </Canvas>
    </CanvasErrorBoundary>
  )
}
