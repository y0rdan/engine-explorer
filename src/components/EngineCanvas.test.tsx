import { render, screen } from '@testing-library/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CanvasErrorBoundary } from './CanvasErrorBoundary.tsx'
import { EngineCanvas } from './EngineCanvas.tsx'
import { MODEL_LOAD_ERROR, MODEL_LOADING_MESSAGE, SCENE_LABEL } from './engineModel.ts'
import { ModelLoadErrorBoundary } from './ModelLoadErrorBoundary.tsx'

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
  it('names the canvas and makes it focusable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    render(<EngineCanvas />)

    const canvas = await screen.findByRole('img', { name: SCENE_LABEL })
    expect(canvas.tagName).toBe('CANVAS')
    expect(canvas).toHaveAttribute('tabindex', '0')
    expect(canvas).toHaveTextContent(SCENE_LABEL)
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

describe('ModelLoadErrorBoundary', () => {
  it('shows a friendly message when the engine model fails to load', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    function BrokenModel(): ReactNode {
      throw new Error('engine.glb 404')
    }

    render(
      <ModelLoadErrorBoundary fallback={<p role="alert">{MODEL_LOAD_ERROR}</p>}>
        <BrokenModel />
      </ModelLoadErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(MODEL_LOAD_ERROR)
    expect(MODEL_LOAD_ERROR).not.toBe(MODEL_LOADING_MESSAGE)
  })
})
