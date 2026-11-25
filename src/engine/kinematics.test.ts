import { describe, expect, it } from 'vitest'
import {
  INLINE4_FIRE_ANGLES,
  INLINE4_PHASES,
  advanceCrank,
  combustionGlow,
  lobeCenter,
  pistonHeight,
  valveLift,
} from './kinematics.ts'

const radius = 0.043
const rod = 0.137

describe('inline-4 kinematics', () => {
  it('puts pistons 1 and 4 together and 2 and 3 opposite', () => {
    for (const angle of [0, 0.4, 1.2, Math.PI]) {
      const heights = INLINE4_PHASES.map((phase) => pistonHeight(angle, phase, radius, rod))
      expect(heights[0]).toBeCloseTo(heights[3], 8)
      expect(heights[1]).toBeCloseTo(heights[2], 8)
    }
    const top = pistonHeight(0, 0, radius, rod)
    const bottom = pistonHeight(0, Math.PI, radius, rod)
    expect(top).toBeGreaterThan(bottom)
    expect(top).toBeCloseTo(radius + rod, 6)
  })

  it('turns the cam at half speed and keeps cylinder 1 valves shut at the power TDC', () => {
    const fire = INLINE4_FIRE_ANGLES[0]
    expect(valveLift(0, lobeCenter(fire, 'exhaust'))).toBe(0)
    expect(valveLift(0, lobeCenter(fire, 'intake'))).toBe(0)
    const midExhaust = (Math.PI * 4 - Math.PI / 2) % (Math.PI * 4)
    expect(valveLift(midExhaust, lobeCenter(fire, 'exhaust'))).toBeGreaterThan(0.008)
  })

  it('advances the crank and wraps inside one four-stroke cycle', () => {
    const next = advanceCrank(Math.PI * 3.9, 600, 0.1)
    expect(next).toBeGreaterThanOrEqual(0)
    expect(next).toBeLessThan(Math.PI * 4)
  })

  it('glows only on the opening of the power stroke', () => {
    expect(combustionGlow(0, 0)).toBeCloseTo(1, 5)
    expect(combustionGlow(Math.PI, 0)).toBe(0)
  })
})
