import { describe, expect, it } from 'vitest'
import { genericInline4Data } from '../data/engines/generic-inline-4.ts'
import { parseEngine } from './schema.ts'

describe('parseEngine', () => {
  it('accepts the generic inline-4 and rejects a copied object that drops a mesh list analogue', () => {
    const engine = parseEngine(structuredClone(genericInline4Data))
    expect(engine.brand).toBe('Generic')
    expect(engine.layout).toBe('inline-4')
    expect(engine.parts.length).toBeGreaterThan(10)
  })

  it('rejects an unknown field, a bad difficulty, and a duplicate id', () => {
    const extra = structuredClone(genericInline4Data) as { note?: string }
    extra.note = 'nope'
    expect(() => parseEngine(extra)).toThrow(/unknown field/)

    const hard = structuredClone(genericInline4Data)
    hard.parts[0].difficulty = 9
    expect(() => parseEngine(hard)).toThrow(/difficulty/)

    const dup = structuredClone(genericInline4Data)
    dup.parts[1].id = dup.parts[0].id
    expect(() => parseEngine(dup)).toThrow(/duplicate part id/)
  })

  it('rejects intake and exhaust on the same side and a layer count outside 2 to 4', () => {
    const sameSide = structuredClone(genericInline4Data)
    sameSide.parameters.exhaustSide = 'right'
    expect(() => parseEngine(sameSide)).toThrow(/opposite sides/)

    const thin = structuredClone(genericInline4Data)
    thin.parts[0].layers = [thin.parts[0].layers[0]]
    expect(() => parseEngine(thin)).toThrow(/2 to 4/)
  })

  it('keeps configuration on the record and rejects an unknown layout', () => {
    const engine = parseEngine(structuredClone(genericInline4Data))
    expect(engine.parameters.configuration).toEqual({ cylinders: 4, banks: 1, heads: 1, valvetrain: 'dohc' })
    const odd = structuredClone(genericInline4Data)
    odd.layout = 'radial-9'
    expect(() => parseEngine(odd)).toThrow(/layout/)
  })

  it('rejects an accessory anchor that is not a part', () => {
    const extra = structuredClone(genericInline4Data)
    ;(extra.parameters.accessories as Record<string, number[]>).turbo = [0, 0, 0]
    expect(() => parseEngine(extra)).toThrow(/not a part id/)
  })
})
