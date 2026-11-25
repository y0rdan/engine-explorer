import { render, screen } from '@testing-library/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CanvasErrorBoundary } from './CanvasErrorBoundary.tsx'
import { EngineCanvas } from './EngineCanvas.tsx'
import { clearEnginePreload } from './engineModel.ts'
import { MODEL_LOAD_ERROR, MODEL_LOADING_MESSAGE, SCENE_LABEL } from './engineModel.ts'

const preload = vi.hoisted(() => vi.fn((..._args: unknown[]) => new Promise<void>(() => {}) as unknown))

vi.mock('@react-three/drei', () => ({
  useGLTF: Object.assign(vi.fn(), {
    preload,
    clear: vi.fn(),
    setDecoderPath: vi.fn(),
  }),
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({
    onCreated,
    fallback,
  }: {
    onCreated?: (state: { gl: { domElement: HTMLCanvasElement } }) => void
    fallback?: ReactNode
  }) => {
    const canvas = useRef<HTMLCanvasElement>(null)
    useEffect(() => {
      if (canvas.current === null || onCreated === undefined) return
      onCreated({ gl: { domElement: canvas.current } })
    }, [onCreated])
    return <canvas ref={canvas}>{fallback}</canvas>
  },
  useThree: () => {
    throw new Error('useThree is only available inside the canvas')
  },
}))

describe('EngineCanvas', () => {
  beforeEach(() => {
    clearEnginePreload()
    preload.mockReset()
    preload.mockImplementation(() => new Promise<void>(() => {}))
  })

  it('names the canvas and makes it focusable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    render(<EngineCanvas />)

    const canvas = await screen.findByRole('img', { name: SCENE_LABEL })
    expect(canvas.tagName).toBe('CANVAS')
    expect(canvas).toHaveAttribute('tabindex', '0')
    expect(canvas).toHaveTextContent(SCENE_LABEL)
  })

  it('shows a loading message while the model request is pending', () => {
    render(<EngineCanvas />)

    expect(screen.getByRole('status')).toHaveTextContent(MODEL_LOADING_MESSAGE)
    expect(preload).toHaveBeenCalledWith(
      expect.stringMatching(/models\/engine\.glb\?v=[0-9a-f]+$/),
      false,
      undefined,
      expect.any(Function),
    )
  })

  it('shows an alert when the model loader rejects', async () => {
    preload.mockImplementation(() => Promise.reject(new Error('404 engine.glb')))
    render(<EngineCanvas />)

    expect(await screen.findByRole('alert')).toHaveTextContent(MODEL_LOAD_ERROR)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('shows an alert when the loader reports a failed file', async () => {
    preload.mockImplementation((...args: unknown[]) => {
      const extendLoader = args[3] as (loader: {
        load: (
          resource: string,
          onLoad: (gltf: unknown) => void,
          onProgress?: undefined,
          onError?: (error: unknown) => void,
        ) => void
      }) => void
      const loader = {
        load(
          _resource: string,
          _onLoad: (gltf: unknown) => void,
          _onProgress: undefined,
          onError?: (error: unknown) => void,
        ) {
          onError?.(new Error('not a glb'))
        },
      }
      extendLoader(loader)
      loader.load('models/engine.glb', () => {}, undefined, () => {})
    })
    render(<EngineCanvas />)

    expect(await screen.findByRole('alert')).toHaveTextContent(MODEL_LOAD_ERROR)
  })

  it('shows an alert when the 3D view fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)

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
