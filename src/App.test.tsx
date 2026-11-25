import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

vi.mock('./components/EngineCanvas.tsx', () => ({
  EngineCanvas: () => <div data-testid="engine-canvas" />,
}))

describe('App', () => {
  it('renders the shell around a 3D canvas', () => {
    render(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('Engine Explorer')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByTestId('engine-canvas')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toHaveTextContent('3D model credits')
    expect(screen.getByText('Drag to orbit. Pinch or scroll to zoom.')).toBeInTheDocument()
  })
})
