import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

vi.mock('./components/EngineCanvas.tsx', () => ({
  EngineCanvas: () => <div data-testid="engine-canvas" />,
}))

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/engine-explorer/')
  })

  it('opens the engine catalog when ?engine= is absent', () => {
    render(<App />)
    expect(screen.getByRole('banner')).toHaveTextContent('Engine Explorer')
    expect(screen.getByRole('heading', { name: 'Engines' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generic V6/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generic V8/ })).toBeInTheDocument()
    expect(screen.queryByTestId('engine-canvas')).not.toBeInTheDocument()
  })

  it('opens a deep-linked engine and part, and the switcher resets that part', async () => {
    window.history.replaceState(null, '', '/engine-explorer/?engine=generic-v6&part=crankshaft')
    render(<App />)

    expect(screen.getByRole('banner')).toHaveTextContent('GV6')
    expect(await screen.findByTestId('engine-canvas')).toBeInTheDocument()
    const selected = screen.getAllByRole('option', { name: 'Crankshaft' })
    expect(selected.some((option) => option.getAttribute('aria-selected') === 'true')).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'V8' }))
    expect(window.location.search).toBe('?engine=generic-v8')
    expect(screen.getByRole('banner')).toHaveTextContent('GV8')
    expect(screen.queryAllByRole('option', { selected: true })).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Change engine' }))
    expect(window.location.search).toBe('')
    expect(screen.getByRole('heading', { name: 'Engines' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toHaveTextContent('not loaded')
  })
})
