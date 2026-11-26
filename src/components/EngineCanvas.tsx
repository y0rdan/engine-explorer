import { AdaptiveDpr, ContactShadows, EnvironmentPortal, Lightformer } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { lazy, memo, Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { ACESFilmicToneMapping, Plane, SRGBColorSpace, Vector3, type DataTexture } from 'three'
import { attachLabelRenderer, createLabelRenderer, renderLabels } from './inline4/labels.ts'
import type { EngineRecord } from '../engine/schema.ts'
import { CanvasErrorBoundary } from './CanvasErrorBoundary.tsx'
import { EngineControls } from './EngineControls.tsx'
import { SCENE_LABEL } from './engineModel.ts'
import { EngineViewProvider } from './inline4/chrome.tsx'
import type { FastenerTip } from './inline4/Inline4Engine.tsx'

const Inline4Engine = lazy(() => import('./inline4/Inline4Engine.tsx').then((module) => ({ default: module.Inline4Engine })))
const VeeEngine = lazy(() => import('./vee/VeeEngine.tsx').then((module) => ({ default: module.VeeEngine })))
import { SceneDriver, type DriverProps } from './SceneDriver.tsx'
import {
  STUDIO_LOAD_ERROR,
  STUDIO_LOADING_MESSAGE,
  disposeStudioPreload,
  preloadStudioHdri,
  studioHdriTexture,
  studioHdriUrl,
} from './studio.ts'

const hdriUrl = studioHdriUrl()

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
  onFastener,
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
  onFastener: (tip: FastenerTip | null) => void
}) {
  const lowPower = useLowPower()
  const [lighting, setLighting] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [hdr, setHdr] = useState<DataTexture | null>(null)
  const clipPlane = useMemo(() => new Plane(new Vector3(0, 0, -1), 0.02), [])
  const down = useRef({ x: 0, y: 0 })
  const selected = engine.parts.find((part) => part.id === partId)
  const label = selected ? `${SCENE_LABEL}. ${selected.displayName} selected.` : SCENE_LABEL

  useEffect(() => {
    let active = true
    preloadStudioHdri(hdriUrl)
      .then(() => {
        if (!active) return
        setHdr(studioHdriTexture())
        setLighting('ready')
      })
      .catch(() => {
        if (active) setLighting('failed')
      })
    return () => {
      active = false
      disposeStudioPreload()
    }
  }, [])

  return (
    <CanvasErrorBoundary>
      <Canvas
        camera={{ position: [-1.15, 0.78, 0.72], fov: 30, near: 0.02, far: 40 }}
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
          gl.toneMappingExposure = 0.78
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
        <hemisphereLight args={['#d5e0ee', '#1a1c1f', 0.22]} />
        <directionalLight position={[0.35, 5.4, 0.8]} intensity={1.05} color="#fff6ee" />
        <directionalLight position={[-3.2, 2.4, -2.4]} intensity={0.7} color="#c5d4ea" />
        <directionalLight position={[2.6, 1.1, 2.5]} intensity={0.36} color="#ffd2b0" />
        {hdr && (
          <Suspense fallback={null}>
            <EnvironmentPortal map={hdr} frames={1} resolution={lowPower ? 128 : 256} environmentIntensity={0.4}>
              <Lightformer
                form="rect"
                intensity={1.35}
                color="#fff3e6"
                position={[0, 3.2, 0.35]}
                rotation={[-Math.PI / 2, 0, 0]}
                scale={[4.2, 2.6, 1]}
              />
              <Lightformer
                form="rect"
                intensity={0.45}
                color="#d7e3f2"
                position={[-2.2, 1.6, -1.8]}
                scale={[1.6, 2.2, 1]}
              />
            </EnvironmentPortal>
          </Suspense>
        )}
        <ScreenLabels />
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
          <Suspense fallback={null}>
            {engine.layout === 'v6' || engine.layout === 'v8' ? (
              <VeeEngine engine={engine} onFastener={onFastener} />
            ) : (
              <Inline4Engine engine={engine} onFastener={onFastener} />
            )}
          </Suspense>
        </EngineViewProvider>
        <BakedContactShadow lowPower={lowPower} />
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

const BakedContactShadow = memo(function BakedContactShadow({ lowPower }: { lowPower: boolean }) {
  return (
    <ContactShadows
      position={[0, 0.001, 0]}
      opacity={0.72}
      scale={2.4}
      blur={2.4}
      far={0.85}
      resolution={lowPower ? 256 : 512}
      frames={40}
      color="#000"
    />
  )
})

function ScreenLabels() {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const renderer = useMemo(() => createLabelRenderer(), [])
  useLayoutEffect(() => {
    const parent = gl.domElement.parentElement
    if (!parent) return
    attachLabelRenderer(renderer, parent, size.width, size.height)
    return () => {
      renderer.domElement.remove()
    }
  }, [gl, renderer, size.height, size.width])
  useFrame(() => {
    renderLabels(renderer, scene, camera, size.width, size.height)
  })
  return null
}

function CanvasAria({ label }: { label: string }) {
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    gl.domElement.setAttribute('aria-label', label)
  }, [gl, label])
  return null
}
