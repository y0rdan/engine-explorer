import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

vi.mock('./components/EngineCanvas.tsx', () => ({
  EngineCanvas: () => <div data-testid="engine-canvas" />,
}))

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/engine-explorer/?engine=generic-inline-4')
  })

  it('renders the shell around a 3D canvas', async () => {
    render(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('Engine Explorer')
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(await screen.findByTestId('engine-canvas')).toBeInTheDocument()
    expect(screen.getByText(/Drag to rotate/)).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Engine parts' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'About' }))
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Grab3D')
    expect(screen.getByRole('link', { name: 'Grab3D' })).toHaveAttribute(
      'href',
      'https://grab3d.com/models/vehicles/car-engine/',
    )
    expect(screen.getByRole('contentinfo')).toHaveTextContent('not loaded')
    expect(screen.getByText(/2\.0 L example/)).toBeInTheDocument()
    expect(screen.queryByText(/present/)).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Engine' }), { target: { value: 'generic-v8' } })
    expect(screen.getByText('Generic V8')).toBeInTheDocument()
  })

  it('strips an unknown engine query with replaceState', async () => {
    const replace = vi.spyOn(window.history, 'replaceState')
    window.history.replaceState(null, '', '/engine-explorer/?engine=not-an-engine')
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Engines' })).toBeInTheDocument()
    expect(replace).toHaveBeenCalled()
    expect(window.location.search).not.toContain('not-an-engine')
  })
})
