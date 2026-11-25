import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

vi.mock('./components/EngineCanvas.tsx', () => ({
  EngineCanvas: () => <div data-testid="engine-canvas" />,
}))

describe('App', () => {
  it('renders the shell around a 3D canvas', async () => {
    render(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('Engine Explorer')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(await screen.findByTestId('engine-canvas')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Grab3D')
    expect(screen.getByRole('link', { name: 'Grab3D' })).toHaveAttribute(
      'href',
      'https://grab3d.com/models/vehicles/car-engine/',
    )
    expect(screen.getByRole('contentinfo')).toHaveTextContent('not loaded')
    expect(screen.getByText(/Drag to orbit/)).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Engine parts' })).toBeInTheDocument()
  })
})
