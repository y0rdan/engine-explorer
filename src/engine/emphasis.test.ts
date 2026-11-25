import { describe, expect, it } from 'vitest'
import { emphasisFor } from './emphasis.ts'

const base = {
  partId: 'radiator',
  layerId: 'fan' as string | null,
  selectedPartId: null as string | null,
  selectedLayerId: null as string | null,
  hoveredPartId: null as string | null,
  isolated: false,
  assemblyPartId: null as string | null,
}

describe('emphasisFor', () => {
  it('highlights the selected part and dims the rest', () => {
    expect(emphasisFor({ ...base, selectedPartId: 'radiator', layerId: null })).toBe('hot')
    expect(emphasisFor({ ...base, partId: 'battery', selectedPartId: 'radiator' })).toBe('dim')
  })

  it('highlights only the chosen layer and hides the rest in isolate', () => {
    expect(
      emphasisFor({
        ...base,
        selectedPartId: 'radiator',
        selectedLayerId: 'fan',
        layerId: 'fan',
      }),
    ).toBe('layer')
    expect(
      emphasisFor({
        ...base,
        selectedPartId: 'radiator',
        selectedLayerId: 'fan',
        layerId: 'core',
      }),
    ).toBe('idle')
    expect(
      emphasisFor({
        ...base,
        partId: 'battery',
        selectedPartId: 'radiator',
        isolated: true,
      }),
    ).toBe('hidden')
  })

  it('uses hover and the assembly step only when nothing is selected', () => {
    expect(emphasisFor({ ...base, hoveredPartId: 'radiator', layerId: null })).toBe('hover')
    expect(emphasisFor({ ...base, assemblyPartId: 'radiator', layerId: null })).toBe('hot')
    expect(
      emphasisFor({ ...base, hoveredPartId: 'radiator', selectedPartId: 'battery', layerId: null }),
    ).toBe('dim')
  })
})
