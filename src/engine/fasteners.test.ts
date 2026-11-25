import { describe, expect, it } from 'vitest'
import { genericInline4 } from '../data/engines/catalog.ts'
import { fastenerInstall } from './fasteners.ts'
import { assemblySteps, seatAmount, stepLabel, travelsFor } from './placement.ts'

describe('generic inline-4 fasteners', () => {
  const head = genericInline4.parts.find((part) => part.id === 'cylinder-head')
  const bolts = head?.fasteners.find((item) => item.id === 'head-bolts')

  it('numbers the head bolts in the DOHC tightening order', () => {
    expect(bolts?.count).toBe(10)
    expect(bolts?.size).toBe('M10')
    expect(bolts?.sequence.slice(0, 5)).toEqual([8, 4, 1, 5, 9])
    expect(bolts?.sequence.slice(5)).toEqual([7, 3, 2, 6, 10])
    expect(bolts?.torqueNm).toEqual({ min: 20, max: 80, angle: 90 })
  })

  it('uses the researched counts for the other joints', () => {
    const count = (partId: string, fastenerId: string) =>
      genericInline4.parts.find((part) => part.id === partId)?.fasteners.find((item) => item.id === fastenerId)?.count
    expect(count('valve-cover', 'cover-bolts')).toBe(10)
    expect(count('intake-manifold', 'intake-bolts')).toBe(7)
    expect(count('exhaust-manifold', 'exhaust-nuts')).toBe(5)
    expect(count('exhaust-manifold', 'exhaust-stay')).toBe(1)
    expect(count('oil-pan', 'pan-bolts')).toBe(16)
    expect(count('crankshaft', 'main-caps')).toBe(10)
    expect(count('pistons', 'rod-bolts')).toBe(8)
    expect(count('water-pump', 'pump-bolts')).toBe(5)
    expect(count('alternator', 'alternator-bolts')).toBe(2)
    const timing = genericInline4.parts.find((part) => part.id === 'timing-drive')
    const timingCount = timing?.fasteners.reduce((sum, item) => sum + item.count, 0)
    expect(timingCount).toBe(15)
  })

  it('loosens the highest head-bolt number first and keeps the cover seated', () => {
    const steps = assemblySteps(genericInline4, null, false)
    const index = steps.findIndex((step) => step.fastenerId === 'head-bolts')
    expect(index).toBeGreaterThan(0)
    const label = stepLabel(steps, (index + 0.55) / steps.length, 'remove')
    expect(label).toContain('Remove 10 x M10 cylinder head bolts')
    expect(label).toContain('8-4-1-5-9 / 7-3-2-6-10')
    const progress = (index + 0.2) / steps.length
    const travels = travelsFor(genericInline4, {
      mode: 'assemble-parts',
      explode: 0,
      assembly: progress,
      partId: null,
    })
    expect(travels.parts['cylinder-head']).toBeLessThan(0.05)
    expect(fastenerInstall(seatAmount(progress, index, steps.length), 10, 10)).toBeLessThan(
      fastenerInstall(seatAmount(progress, index, steps.length), 1, 10),
    )
  })
})
