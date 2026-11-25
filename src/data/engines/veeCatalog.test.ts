import { describe, expect, it } from 'vitest'
import { layoutVee } from '../../engine/veeLayout.ts'
import { engines, filterEngines, genericV6, genericV8 } from './catalog.ts'

const MOVING = [
  'crankshaft',
  'pistons-left',
  'pistons-right',
  'cylinder-head-left',
  'cylinder-head-right',
  'camshaft-left',
  'camshaft-right',
  'timing-drive',
  'water-pump',
  'alternator',
  'serpentine-belt',
  'radiator',
]

describe('V6 and V8 catalog entries', () => {
  it('registers both generic engines and validates every entry', () => {
    expect(engines.map((engine) => engine.id)).toEqual(['generic-inline-4', 'generic-v6', 'generic-v8'])
    for (const engine of engines) {
      expect(engine.category).toBe('engine')
      expect(engine.brand).toBe('Generic')
      expect(engine.specs.length).toBeGreaterThan(0)
      expect(engine.source.kind).toBe('procedural')
      if (engine.source.kind === 'procedural') expect(engine.source.template.length).toBeGreaterThan(0)
      expect(engine.fastenerLayout.cylinders).toBeGreaterThan(0)
    }
    expect(genericV6.layout).toBe('v6')
    expect(genericV6.displacementCc).toBe(3498)
    expect(genericV6.fastenerLayout).toEqual({ cylinders: 6, banks: 2, heads: 2, valvetrain: 'dohc' })
    expect(genericV8.layout).toBe('v8')
    expect(genericV8.displacementCc).toBe(4999)
    expect(genericV8.fastenerLayout.cylinders).toBe(8)
    expect(genericV8.parts.find((part) => part.id === 'pistons-left')?.description).toMatch(/1, 3, 5, 7/)
    expect(genericV8.parts.find((part) => part.id === 'pistons-right')?.description).toMatch(/2, 4, 6, 8/)
    expect(genericV8.fastenerLayout.banks).toBe(2)
  })

  it('gives every part and layer its own description', () => {
    for (const engine of [genericV6, genericV8]) {
      const descriptions = new Set<string>()
      for (const part of engine.parts) {
        expect(part.summary.length).toBeGreaterThan(24)
        expect(part.description.length).toBeGreaterThan(80)
        expect(part.whatItDoes.length).toBeGreaterThan(20)
        expect(descriptions.has(part.description)).toBe(false)
        descriptions.add(part.description)
        expect(part.layers.length).toBeGreaterThanOrEqual(2)
        expect(part.layers.length).toBeLessThanOrEqual(4)
        for (const layer of part.layers) {
          expect(layer.description.length).toBeGreaterThan(20)
          expect(descriptions.has(layer.description)).toBe(false)
          descriptions.add(layer.description)
        }
      }
      for (const id of MOVING) {
        const part = engine.parts.find((item) => item.id === id)
        expect(part?.howItMoves && part.howItMoves.length > 20).toBe(true)
      }
    }
  })

  it('lifts each head outward along its bank and keeps fastener torques as display figures', () => {
    for (const engine of [genericV6, genericV8]) {
      const layout = layoutVee(engine)
      for (const side of ['left', 'right'] as const) {
        const head = engine.parts.find((part) => part.id === `cylinder-head-${side}`)
        const bank = layout.banks.find((item) => item.id === side)
        expect(head).toBeTruthy()
        expect(bank).toBeTruthy()
        const offset = head?.explodeOffset ?? [0, 0, 0]
        const dot = offset[1] * (bank?.axis[1] ?? 0) + offset[2] * (bank?.axis[2] ?? 0)
        const length = Math.hypot(offset[1], offset[2])
        expect(dot / length).toBeGreaterThan(0.9)
        const bolts = head?.fasteners?.[0]
        expect(bolts?.type).toBe('bolt')
        expect(bolts && bolts.count >= 8 && bolts.count <= 10).toBe(true)
        expect(bolts?.positions).toHaveLength(bolts?.count ?? 0)
        expect(bolts?.notes).toMatch(/typical, display only/i)
        expect(closestStep(bolts?.positions ?? [], bolts?.sequence ?? [])).toBeLessThanOrEqual(2)
      }
      const left = engine.parts.find((part) => part.id === 'cylinder-head-left')?.explodeOffset[2] ?? 0
      const right = engine.parts.find((part) => part.id === 'cylinder-head-right')?.explodeOffset[2] ?? 0
      expect(left * right).toBeLessThan(0)

      const intake = engine.parts.find((part) => part.id === 'intake-manifold')?.fasteners?.[0]
      expect(intake?.size).toBe('M8')
      expect(intake && intake.count >= 8 && intake.count <= 12).toBe(true)
      for (const side of ['left', 'right']) {
        const cover = engine.parts.find((part) => part.id === `valve-cover-${side}`)?.fasteners?.[0]
        const exhaust = engine.parts.find((part) => part.id === `exhaust-manifold-${side}`)?.fasteners?.[0]
        expect(cover?.size).toBe('M6')
        expect(cover && cover.count >= 8 && cover.count <= 10).toBe(true)
        expect(exhaust?.type).toBe('nut')
        expect(exhaust && exhaust.count >= 6 && exhaust.count <= 8).toBe(true)
        expect(exhaust?.notes).toMatch(/stud/i)
      }
      const caps = engine.fastenerLayout.banks === 2 && engine.layout === 'v6' ? 4 : 5
      const mains = engine.parts.find((part) => part.id === 'engine-block')?.fasteners ?? []
      expect(mains[0]?.count).toBe(caps * 2)
      expect(mains[1]?.notes).toMatch(/side bolt/i)
      for (const side of ['left', 'right']) {
        const rods = engine.parts.find((part) => part.id === `pistons-${side}`)?.fasteners?.[0]
        expect(rods?.count).toBe(engine.fastenerLayout.cylinders)
      }
      const pan = engine.parts.find((part) => part.id === 'oil-pan')?.fasteners?.[0]
      const timing = engine.parts.find((part) => part.id === 'timing-drive')?.fasteners?.[0]
      expect(pan?.count).toBeGreaterThan(0)
      expect(timing?.notes).toMatch(/timing-cover/i)
      for (const part of engine.parts) {
        for (const item of part.fasteners ?? []) {
          expect(item.notes).toMatch(/typical, display only/i)
          expect(item.torque_nm.min).toBeLessThanOrEqual(item.torque_nm.max)
        }
      }
    }
  })

  it('filters the catalog by category, then layout, then search text', () => {
    expect(filterEngines(engines, { category: 'engine', layout: null, text: '' })).toHaveLength(3)
    expect(filterEngines(engines, { category: 'engine', layout: 'v8', text: '' }).map((engine) => engine.id)).toEqual([
      'generic-v8',
    ])
    expect(filterEngines(engines, { category: 'engine', layout: null, text: 'gv6' }).map((engine) => engine.id)).toEqual([
      'generic-v6',
    ])
    expect(filterEngines(engines, { category: 'transmission', layout: null, text: '' })).toHaveLength(0)
  })
})

function closestStep(positions: readonly [number, number, number][], sequence: readonly number[]): number {
  const center = positions.reduce(
    (sum, position) => [sum[0] + position[0], sum[1] + position[1], sum[2] + position[2]] as [number, number, number],
    [0, 0, 0],
  )
  center[0] /= positions.length
  center[1] /= positions.length
  center[2] /= positions.length
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  positions.forEach((position, index) => {
    const distance = Math.hypot(position[0] - center[0], position[1] - center[1], position[2] - center[2])
    if (distance < bestDistance) {
      bestDistance = distance
      best = index
    }
  })
  return sequence[best] ?? 99
}
