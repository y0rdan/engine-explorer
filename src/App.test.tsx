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

    fireEvent.change(screen.getByRole('combobox', { name: 'Engine' }), { target: { value: 'generic-v8' } })
    expect(window.location.search).toBe('?engine=generic-v8')
    expect(screen.getByRole('banner')).toHaveTextContent('GV8')
    expect(screen.getByText('Generic V8')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Crankshaft', selected: true })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Change engine' }))
    expect(window.location.search).toBe('')
    expect(screen.getByRole('heading', { name: 'Engines' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toHaveTextContent('not loaded')
  })

  it('removes an unknown engine param without adding a history entry', () => {
    window.history.replaceState(null, '', '/engine-explorer/?engine=not-a-real-engine')
    const replace = vi.spyOn(window.history, 'replaceState')
    const push = vi.spyOn(window.history, 'pushState')
    render(<App />)
    expect(window.location.search).not.toContain('engine=')
    expect(replace).toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent(/not in the catalog/i)
    replace.mockRestore()
    push.mockRestore()
  })

  it('replaces a part id the selected engine does not have', async () => {
    window.history.replaceState(null, '', '/engine-explorer/?engine=generic-v6&part=valve-cover')
    const replace = vi.spyOn(window.history, 'replaceState')
    const push = vi.spyOn(window.history, 'pushState')
    render(<App />)
    expect(await screen.findByTestId('engine-canvas')).toBeInTheDocument()
    expect(window.location.search).toContain('engine=generic-v6')
    expect(window.location.search).not.toContain('part=')
    expect(push).not.toHaveBeenCalled()
    expect(replace).toHaveBeenCalled()
    replace.mockRestore()
    push.mockRestore()
  })
})
