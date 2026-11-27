import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { genericInline4 } from '../data/engines/catalog.ts'
import { EngineExperience } from './EngineExperience.tsx'
import { HINT_KEY } from './onboarding.ts'
import { BottomSheet } from './BottomSheet.tsx'
import { snapFromDrag, snapHeight } from './sheetSnap.ts'

vi.mock('./EngineCanvas.tsx', () => ({
  EngineCanvas: () => <div data-testid="engine-canvas" />,
}))

describe('toolbar, onboarding, and part selection', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.history.replaceState(null, '', '/engine-explorer/')
  })

  it('shows explode controls first and reveals assembly steps only in that segment', async () => {
    render(<EngineExperience engine={genericInline4} />)
    expect(await screen.findByTestId('engine-canvas')).toBeInTheDocument()
    expect(screen.getByText('Select a part, or drag Explode to take it apart.')).toBeInTheDocument()
    expect(screen.getByLabelText('Explode amount')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Teardown' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Assembly' }))
    expect(screen.getByRole('button', { name: 'Teardown' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous step' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Explode amount')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Run' }))
    const speed = screen.getByLabelText('Speed')
    expect(speed).toHaveAttribute('aria-valuetext', '0 rpm')
    expect(screen.getByText('0 rpm')).toBeInTheDocument()
  })

  it('remembers a dismissed gesture hint and zeros explode when a part is selected', async () => {
    render(<EngineExperience engine={genericInline4} />)
    expect(await screen.findByText(/Drag to rotate/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(window.localStorage.getItem(HINT_KEY)).toBe('1')
    expect(screen.queryByText(/Drag to rotate/)).not.toBeInTheDocument()

    const slider = screen.getByLabelText('Explode amount')
    fireEvent.change(slider, { target: { value: '40' } })
    expect(screen.getByText('40%')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'Radiator' }))
    expect(screen.queryByText('Select a part, or drag Explode to take it apart.')).not.toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Radiator' })).toBeInTheDocument()
  })

  it('replaces an invalid part query instead of pushing history', async () => {
    const replace = vi.spyOn(window.history, 'replaceState')
    window.history.replaceState(null, '', '/engine-explorer/?part=not-a-part')
    render(<EngineExperience engine={genericInline4} />)
    await screen.findByTestId('engine-canvas')
    expect(replace).toHaveBeenCalled()
    expect(window.location.search).not.toContain('not-a-part')
  })
})

describe('bottom sheet', () => {
  it('snaps between peek, half, and full without covering more than half the screen', () => {
    expect(snapHeight('full', 844)).toBeLessThanOrEqual(422)
    expect(snapHeight('peek', 844)).toBeLessThan(snapHeight('half', 844))
    expect(snapFromDrag('peek', -80)).toBe('half')
    expect(snapFromDrag('full', 80)).toBe('half')
    render(
      <BottomSheet snap="peek" viewportHeight={844} onSnap={() => {}}>
        <p>Guide</p>
      </BottomSheet>,
    )
    expect(screen.getByRole('region', { name: 'Part guide' })).toHaveAttribute('data-snap', 'peek')
    expect(screen.getByRole('button', { name: 'Full' })).toBeInTheDocument()
  })
})
