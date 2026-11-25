import { describe, expect, it } from 'vitest'
import { genericInline4 } from '../data/engines/catalog.ts'
import {
  activeStepIndex,
  assemblySteps,
  explodeWeight,
  placementMode,
  seatAmount,
  stepLabel,
  travelsFor,
} from './placement.ts'

describe('explode and assembly placement', () => {
  const orders = genericInline4.parts.map((part) => part.assemblyOrder)

  it('maps the slider to seated at 0 and fully exploded at 1', () => {
    for (const order of orders) {
      expect(explodeWeight(0, order, orders)).toBe(0)
      expect(explodeWeight(1, order, orders)).toBe(1)
    }
  })

  it('lets later-installed parts lead, without overshoot', () => {
    const cover = genericInline4.parts.find((part) => part.id === 'valve-cover')
    const block = genericInline4.parts.find((part) => part.id === 'engine-block')
    expect(cover).toBeTruthy()
    expect(block).toBeTruthy()
    const mid = explodeWeight(0.36, cover!.assemblyOrder, orders)
    const late = explodeWeight(0.36, block!.assemblyOrder, orders)
    expect(mid).toBeGreaterThan(late)
    for (const t of [0.1, 0.4, 0.7]) {
      const weight = explodeWeight(t, cover!.assemblyOrder, orders)
      expect(weight).toBeGreaterThanOrEqual(0)
      expect(weight).toBeLessThanOrEqual(1)
    }
  })

  it('seats assembly steps in order and labels the active one', () => {
    const steps = assemblySteps(genericInline4, null, false)
    expect(steps[0]?.partId).toBe('engine-block')
    expect(steps.at(-1)?.partId).toBe('battery')
    expect(seatAmount(0, 0, steps.length)).toBe(0)
    expect(seatAmount(1, steps.length - 1, steps.length)).toBe(1)
    expect(seatAmount(0.02, 0, steps.length)).toBeGreaterThan(0)
    expect(seatAmount(0.02, 3, steps.length)).toBe(0)
    expect(activeStepIndex(0, steps.length)).toBe(0)
    expect(activeStepIndex(1, steps.length)).toBe(steps.length - 1)
    expect(stepLabel(steps, 0)).toContain('engine block')
  })

  it('uses layer travel only while a part is selected', () => {
    const seated = travelsFor(genericInline4, {
      mode: placementMode({ assemblyMode: false, isolated: false, partId: null }),
      explode: 0,
      assembly: 1,
      partId: null,
    })
    expect(seated.parts.radiator).toBe(0)

    const layers = travelsFor(genericInline4, {
      mode: 'explode-layers',
      explode: 1,
      assembly: 1,
      partId: 'radiator',
    })
    expect(layers.parts.radiator).toBe(0)
    expect(layers.layers['radiator:fan']).toBe(1)
    expect(layers.layers['battery:case']).toBe(0)
  })
})
