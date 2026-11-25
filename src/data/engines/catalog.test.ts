import { describe, expect, it } from 'vitest'
import { layoutFromEngine } from '../../engine/layout.ts'
import { partsBySystem } from '../../engine/schema.ts'
import { genericInline4 } from './catalog.ts'

const SERVICE_PARTS = [
  'battery',
  'alternator',
  'spark-plugs',
  'ignition-coils',
  'air-filter',
  'radiator',
  'serpentine-belt',
  'starter',
  'oil-filter',
  'water-pump',
]

const MOVING_PARTS = [
  'crankshaft',
  'pistons',
  'cylinder-head',
  'camshaft',
  'timing-drive',
  'water-pump',
  'alternator',
  'serpentine-belt',
  'radiator',
]

describe('generic inline-4 data', () => {
  it('is a generic inline-4 ready for a later real engine file', () => {
    expect(genericInline4.brand).toBe('Generic')
    expect(genericInline4.engineCode).toBe('G4')
    expect(genericInline4.layout).toBe('inline-4')
    expect(genericInline4.displacementCc).toBe(1998)
    expect(genericInline4.yearRange.end).toBeNull()
    for (const id of SERVICE_PARTS) {
      expect(genericInline4.parts.some((part) => part.id === id)).toBe(true)
    }
  })

  it('gives every part and layer its own description', () => {
    const descriptions = new Set<string>()
    for (const part of genericInline4.parts) {
      expect(part.summary.length).toBeGreaterThan(24)
      expect(part.description.length).toBeGreaterThan(80)
      expect(part.whatItDoes.length).toBeGreaterThan(20)
      expect(part.whereItLives.length).toBeGreaterThan(10)
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
  })

  it('has full layer sets and richer copy on the radiator, alternator, and battery', () => {
    const radiator = genericInline4.parts.find((part) => part.id === 'radiator')
    const alternator = genericInline4.parts.find((part) => part.id === 'alternator')
    const battery = genericInline4.parts.find((part) => part.id === 'battery')
    expect(radiator?.layers.map((layer) => layer.id)).toEqual(['tanks', 'core', 'fan', 'hoses'])
    expect(alternator?.layers.map((layer) => layer.id)).toEqual(['housing', 'pulley', 'rotor'])
    expect(battery?.layers.map((layer) => layer.id)).toEqual(['case', 'terminals', 'hold-down'])
    expect(radiator?.keyNumbers.length).toBeGreaterThanOrEqual(4)
    expect(alternator?.howItWorks.length).toBeGreaterThanOrEqual(4)
    expect(battery?.steps.length).toBeGreaterThanOrEqual(4)
    expect(radiator?.safetyNote).toMatch(/cold/i)
    expect(battery?.safetyNote).toMatch(/negative/i)
  })

  it('groups into the current systems and keeps the explode choreography', () => {
    const groups = partsBySystem(genericInline4.parts)
    expect(groups.map((group) => group.system)).toEqual([
      'engine',
      'cooling',
      'electrical',
      'fuel-air',
      'ignition',
    ])
    const offset = (id: string) => genericInline4.parts.find((part) => part.id === id)?.explodeOffset
    const cover = offset('valve-cover')
    const head = offset('cylinder-head')
    const pistons = offset('pistons')
    const pan = offset('oil-pan')
    const timing = offset('timing-drive')
    const intake = offset('intake-manifold')
    const exhaust = offset('exhaust-manifold')
    expect(cover?.[1]).toBeGreaterThan(head?.[1] ?? 0)
    expect(head?.[1]).toBeGreaterThan(pistons?.[1] ?? 0)
    expect(pistons?.[1]).toBeGreaterThan(0.1)
    expect(Math.abs(pistons?.[0] ?? 1)).toBeLessThan(0.04)
    expect(Math.abs(pistons?.[2] ?? 1)).toBeLessThan(0.04)
    expect(pan?.[1]).toBeLessThan(0)
    expect(timing?.[0]).toBeLessThan(0)
    expect(intake?.[2]).toBeGreaterThan(0)
    expect(exhaust?.[2]).toBeLessThan(0)
  })

  it('requires a how-it-moves line on the parts that turn or reciprocate', () => {
    for (const id of MOVING_PARTS) {
      const part = genericInline4.parts.find((item) => item.id === id)
      expect(part?.howItMoves && part.howItMoves.length > 20).toBe(true)
    }
  })

  it('builds a layout whose rods are long enough and whose bores follow the spacing', () => {
    const layout = layoutFromEngine(genericInline4)
    expect(layout.rodLength / layout.crankRadius).toBeGreaterThan(2.8)
    expect(layout.pistonX[1] - layout.pistonX[0]).toBeCloseTo(genericInline4.parameters.boreSpacing, 5)
    expect(layout.anchors.radiator[0]).toBeLessThan(-0.4)
    expect(layout.intakeSign).toBe(1)
  })
})