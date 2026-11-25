import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { genericInline4 } from '../data/engines/catalog.ts'
import { PartsSidebar } from './PartsSidebar.tsx'

describe('PartsSidebar', () => {
  it('groups parts by system and selects from the keyboard', () => {
    const onSelect = vi.fn()
    render(
      <PartsSidebar
        parts={genericInline4.parts}
        selectedId={null}
        onSelect={onSelect}
        idPrefix="test"
      />,
    )

    expect(screen.getByRole('group', { name: 'Cooling' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Electrical' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Fuel/Air' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Ignition' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Radiator' })).toBeInTheDocument()

    const options = screen.getAllByRole('option')
    options[0]?.focus()
    fireEvent.keyDown(options[0]!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(options[1])
    fireEvent.click(screen.getByRole('option', { name: 'Battery' }))
    expect(onSelect).toHaveBeenCalledWith('battery')
  })
})
