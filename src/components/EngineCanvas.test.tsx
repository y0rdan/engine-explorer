import { render, screen } from '@testing-library/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CanvasErrorBoundary } from './CanvasErrorBoundary.tsx'
import { EngineCanvas } from './EngineCanvas.tsx'
import { SCENE_LABEL } from './engineModel.ts'
import { clearStudioPreload, STUDIO_LOAD_ERROR, STUDIO_LOADING_MESSAGE } from './studio.ts'
import { defaultEngine } from '../data/engines/catalog.ts'
import { createRuntime } from '../engine/runtime.ts'
import type { DriverProps } from './SceneDriver.tsx'

const preload = vi.hoisted(() => vi.fn((..._args: unknown[]) => new Promise<void>(() => {}) as unknown))

vi.mock('./studio.ts', () => ({
  preloadStudioHdri: preload,
  studioHdriUrl: () => '/engine-explorer/hdri/studio_small_03_1k.hdr',
  STUDIO_LOADING_MESSAGE: 'Loading studio lighting…',
  STUDIO_LOAD_ERROR:
    'Studio lighting could not be loaded. The engine is shown with built-in lights.',
  clearStudioPreload: () => {},
  disposeStudioPreload: () => {},
}))

vi.mock('@react-three/drei', () => ({
  Environment: () => null,
  Lightformer: () => null,
  ContactShadows: () => null,
  AdaptiveDpr: () => null,
  RoundedBox: ({ children }: { children?: ReactNode }) => <mesh>{children}</mesh>,
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({
    onCreated,
  }: {
    onCreated?: (state: {
    gl: {
      domElement: HTMLCanvasElement
      toneMapping: number
      toneMappingExposure: number
      outputColorSpace: string
      setClearColor: () => void
    }
    scene: { background: unknown }
  }) => void
}) => {
    const canvas = useRef<HTMLCanvasElement>(null)
    useEffect(() => {
      if (canvas.current === null || onCreated === undefined) return
      onCreated({
        gl: {
          domElement: canvas.current,
          toneMapping: 0,
          toneMappingExposure: 1,
          outputColorSpace: 'srgb',
          setClearColor: () => {},
        },
        scene: { background: null },
      })
    }, [onCreated])
    return <canvas ref={canvas} />
  },
  useThree: () => {
    throw new Error('useThree is only available inside the canvas')
  },
  useFrame: () => {},
}))

vi.mock('./EngineControls.tsx', () => ({ EngineControls: () => null }))
vi.mock('./SceneDriver.tsx', () => ({ SceneDriver: () => null }))
vi.mock('./inline4/Inline4Engine.tsx', () => ({ Inline4Engine: () => null }))

function renderCanvas() {
  const runtime = createRuntime()
  const driverRef = {
    current: {
      engine: defaultEngine,
      partId: null,
      layerId: null,
      isolated: false,
      assemblyMode: false,
      cutaway: false,
      runtime,
      reducedMotion: false,
      fitToken: 1,
      fitSmooth: true,
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      onSample: () => {},
    } satisfies DriverProps,
  }
  const pokeRef = { current: () => {} }
  return render(
    <EngineCanvas
      driverRef={driverRef}
      pokeRef={pokeRef}
      engine={defaultEngine}
      partId={null}
      layerId={null}
      hoveredPartId={null}
      isolated={false}
      assemblyPartId={null}
      cutaway={false}
      onClear={() => {}}
      onSelectPart={() => {}}
      onSelectLayer={() => {}}
      onHover={() => {}}
      onFastener={() => {}}
    />,
  )
}

describe('EngineCanvas', () => {
  beforeEach(() => {
    clearStudioPreload()
    preload.mockReset()
    preload.mockImplementation(() => new Promise<void>(() => {}))
  })

  it('names the canvas and makes it focusable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    renderCanvas()

    const canvas = await screen.findByRole('img', { name: SCENE_LABEL })
    expect(canvas.tagName).toBe('CANVAS')
    expect(canvas).toHaveAttribute('tabindex', '0')
  })

  it('shows studio lighting status and does not request the reference glb', () => {
    renderCanvas()
    expect(screen.getByRole('status')).toHaveTextContent(STUDIO_LOADING_MESSAGE)
    expect(preload).toHaveBeenCalledWith('/engine-explorer/hdri/studio_small_03_1k.hdr')
    expect(preload.mock.calls.join(' ')).not.toContain('engine.glb')
  })

  it('keeps the engine up and explains a lighting failure', async () => {
    preload.mockImplementation(() => Promise.reject(new Error('missing hdr')))
    renderCanvas()
    expect(await screen.findByRole('alert')).toHaveTextContent(STUDIO_LOAD_ERROR)
    expect(screen.getByRole('img', { name: SCENE_LABEL })).toBeInTheDocument()
  })

  it('shows an alert when the 3D view fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function BrokenView(): ReactNode {
      throw new Error('webgl context failed')
    }
    render(
      <CanvasErrorBoundary>
        <BrokenView />
      </CanvasErrorBoundary>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('could not start the 3D view')
  })
})
