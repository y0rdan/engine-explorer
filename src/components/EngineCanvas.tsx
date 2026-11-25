import { AdaptiveDpr, ContactShadows, Environment, Lightformer } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { ACESFilmicToneMapping, Plane, SRGBColorSpace, Vector3 } from 'three'
import type { EngineRecord } from '../engine/schema.ts'
import { CanvasErrorBoundary } from './CanvasErrorBoundary.tsx'
import { EngineControls } from './EngineControls.tsx'
import { SCENE_LABEL } from './engineModel.ts'
import { EngineViewProvider } from './inline4/chrome.tsx'
import { Inline4Engine } from './inline4/Inline4Engine.tsx'
import { VeeEngine } from './vee/VeeEngine.tsx'
import { SceneDriver, type DriverProps } from './SceneDriver.tsx'
import {
  STUDIO_LOAD_ERROR,
  STUDIO_LOADING_MESSAGE,
  preloadStudioHdri,
  studioHdriUrl,
} from './studio.ts'

const hdriUrl = studioHdriUrl()

function EngineModel({ engine }: { engine: EngineRecord }) {
  if (engine.source.kind === 'procedural' && (engine.source.template === 'v6' || engine.source.template === 'v8')) {
    return <VeeEngine engine={engine} />
  }
  return <Inline4Engine engine={engine} />
}

function useLowPower(): boolean {
  const [low, setLow] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(max-width: 899px), (pointer: coarse)')
    const update = () => setLow(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return low
}

export function EngineCanvas({
  driverRef,
  pokeRef,
  engine,
  partId,
  layerId,
  hoveredPartId,
  isolated,
  assemblyPartId,
  cutaway,
  onClear,
  onSelectPart,
  onSelectLayer,
  onHover,
}: {
  driverRef: MutableRefObject<DriverProps>
  pokeRef: MutableRefObject<() => void>
  engine: EngineRecord
  partId: string | null
  layerId: string | null
  hoveredPartId: string | null
  isolated: boolean
  assemblyPartId: string | null
  cutaway: boolean
  onClear: () => void
  onSelectPart: (id: string) => void
  onSelectLayer: (partId: string, layerId: string) => void
  onHover: (id: string | null) => void
}) {
  const lowPower = useLowPower()
  const [lighting, setLighting] = useState<'loading' | 'ready' | 'failed'>('loading')
  const clipPlane = useMemo(() => new Plane(new Vector3(0, 0, -1), 0.02), [])
  const down = useRef({ x: 0, y: 0 })
  const selected = engine.parts.find((part) => part.id === partId)
  const label = selected ? `${SCENE_LABEL}. ${selected.displayName} selected.` : SCENE_LABEL

  useEffect(() => {
    let active = true
    preloadStudioHdri(hdriUrl)
      .then(() => {
        if (active) setLighting('ready')
      })
      .catch(() => {
        if (active) setLighting('failed')
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <CanvasErrorBoundary>
      <Canvas
        camera={{ position: [-1.28, 0.82, 1.08], fov: 32, near: 0.02, far: 40 }}
        dpr={lowPower ? [1, 1.25] : [1, 1.75]}
        frameloop="demand"
        gl={{
          antialias: !lowPower,
          alpha: true,
          toneMapping: ACESFilmicToneMapping,
          outputColorSpace: SRGBColorSpace,
          powerPreference: lowPower ? 'low-power' : 'high-performance',
        }}
        style={{ position: 'absolute', inset: 0, touchAction: 'none', background: 'transparent' }}
        onPointerDown={(event) => {
          down.current = { x: event.clientX, y: event.clientY }
        }}
        onPointerMissed={(event) => {
          const dx = event.clientX - down.current.x
          const dy = event.clientY - down.current.y
          if (dx * dx + dy * dy > 25) return
          onClear()
        }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = ACESFilmicToneMapping
          gl.toneMappingExposure = 0.96
          gl.outputColorSpace = SRGBColorSpace
          gl.localClippingEnabled = true
          gl.setClearColor(0x000000, 0)
          scene.background = null
          const canvas = gl.domElement
          canvas.tabIndex = 0
          canvas.setAttribute('role', 'img')
          canvas.setAttribute('aria-label', SCENE_LABEL)
        }}
      >
        {!lowPower && <AdaptiveDpr />}
        <CanvasAria label={label} />
        <hemisphereLight args={['#f5f7fb', '#121416', 0.32]} />
        <directionalLight position={[0.4, 5.6, 1.1]} intensity={1.7} color="#fff4e8" />
        <directionalLight position={[-3.1, 2.1, 2.8]} intensity={0.72} color="#d5e4f4" />
        <directionalLight position={[2.6, 1.4, -2.4]} intensity={0.4} color="#fffaf4" />
        {lighting !== 'failed' && (
          <Suspense fallback={null}>
            <Environment files={hdriUrl} environmentIntensity={0.72} resolution={lowPower ? 128 : 256} frames={1}>
              <Lightformer
                form="rect"
                intensity={3}
                color="#fff3e6"
                position={[0, 3.2, 0.35]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[4.2, 2.6, 1]}
              />
              <Lightformer
                form="rect"
                intensity={0.85}
                color="#d7e3f2"
                position={[-2.2, 1.4, 2.1]}
                scale={[2, 1.3, 1]}
              />
            </Environment>
          </Suspense>
        )}
        <EngineControls />
        <SceneDriver driverRef={driverRef} pokeRef={pokeRef} />
        <EngineViewProvider
          value={{
            partId,
            layerId,
            hoveredPartId,
            isolated,
            assemblyPartId,
            cutaway,
            clipPlane,
            selectPart: onSelectPart,
            selectLayer: onSelectLayer,
            hoverPart: onHover,
          }}
        >
          <EngineModel engine={engine} />
        </EngineViewProvider>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <circleGeometry args={[1.25, 64]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
        <ContactShadows
          position={[0, 0.032, 0]}
          opacity={0.5}
          scale={3}
          blur={2.2}
          far={0.7}
          resolution={lowPower ? 256 : 512}
          frames={lowPower ? 1 : 24}
          color="#000"
        />
      </Canvas>
      {lighting === 'loading' && (
        <p className="lighting-status" role="status">
          {STUDIO_LOADING_MESSAGE}
        </p>
      )}
      {lighting === 'failed' && (
        <p className="lighting-status" role="alert">
          {STUDIO_LOAD_ERROR}
        </p>
      )}
    </CanvasErrorBoundary>
  )
}

function CanvasAria({ label }: { label: string }) {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    gl.domElement.setAttribute('aria-label', label)
  }, [gl, label])
  return null
}
