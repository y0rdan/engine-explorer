import { render, screen } from '@testing-library/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { CanvasErrorBoundary } from './CanvasErrorBoundary.tsx'
import { EngineCanvas } from './EngineCanvas.tsx'

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
}))

vi.mock('./PlaceholderScene.tsx', () => ({
  PlaceholderScene: () => null,
}))

describe('EngineCanvas', () => {
  it('names the canvas and makes it focusable', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    render(<EngineCanvas />)

    const canvas = await screen.findByRole('img', { name: 'Placeholder 3D scene' })
    expect(canvas.tagName).toBe('CANVAS')
    expect(canvas).toHaveAttribute('tabindex', '0')
    expect(canvas).toHaveTextContent('Placeholder 3D scene')
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
