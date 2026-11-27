import { describe, expect, it } from 'vitest'
import { genericV6, genericV8 } from '../data/engines/catalog.ts'
import { pistonHeight } from './kinematics.ts'
import { pistonPhaseOffset } from './layout.ts'
import { layoutVee, angDiff, planVee, throwCenters, V6_FIRING_ORDER, V8_FIRING_ORDER } from './veeLayout.ts'

describe('V layout template', () => {
  const v6 = layoutVee(genericV6)
  const v8 = layoutVee(genericV8)

  it('builds six cylinders at 60 degrees and eight at 90', () => {
    expect(v6.cylinders).toHaveLength(6)
    expect(v8.cylinders).toHaveLength(8)
    expect(v6.banks).toHaveLength(2)
    expect(v8.banks).toHaveLength(2)
    for (const bank of v6.banks) expect(bank.cylinders).toHaveLength(3)
    for (const bank of v8.banks) expect(bank.cylinders).toHaveLength(4)
    expect(angleBetween(v6)).toBeCloseTo(60, 5)
    expect(angleBetween(v8)).toBeCloseTo(90, 5)
    expect(v6.dohc).toBe(true)
    expect(v8.dohc).toBe(true)
    expect(v6.rodLength / v6.crankRadius).toBeGreaterThan(2.8)
    expect(v8.rodLength / v8.crankRadius).toBeGreaterThan(2.8)
  })

  it('fires the V6 1-2-3-4-5-6 on split pins 120 degrees apart', () => {
    expect(fireOrder(v6.cylinders, V6_FIRING_ORDER)).toEqual(V6_FIRING_ORDER)
    const step = (Math.PI * 4) / 6
    for (let index = 1; index < V6_FIRING_ORDER.length; index += 1) {
      const previous = v6.cylinders[V6_FIRING_ORDER[index - 1] - 1]
      const current = v6.cylinders[V6_FIRING_ORDER[index] - 1]
      expect((current?.fireAngle ?? 0) - (previous?.fireAngle ?? 0)).toBeCloseTo(step, 6)
    }
    for (const pair of stations(v6.cylinders)) {
      expect(angDiff(pair[0]?.phase ?? 0, pair[1]?.phase ?? 0)).toBeCloseTo((60 * Math.PI) / 180, 5)
    }
    const centers = throwCenters(v6.cylinders)
    expect(centers).toHaveLength(3)
    for (let index = 1; index < centers.length; index += 1) {
      expect(angDiff(centers[index] ?? 0, centers[index - 1] ?? 0)).toBeCloseTo((2 * Math.PI) / 3, 5)
    }
  })

  it('keeps odd cylinders on the left bank', () => {
    for (const layout of [v6, v8]) {
      for (const cylinder of layout.cylinders) {
        expect(cylinder.bank).toBe(cylinder.number % 2 === 1 ? 'left' : 'right')
        expect(cylinder.zSign).toBe(cylinder.number % 2 === 1 ? -1 : 1)
      }
    }
    expect(v6.cylinders.filter((cylinder) => cylinder.bank === 'left').map((cylinder) => cylinder.number)).toEqual([
      1, 3, 5,
    ])
    expect(v8.cylinders.filter((cylinder) => cylinder.bank === 'left').map((cylinder) => cylinder.number)).toEqual([
      1, 3, 5, 7,
    ])
    expect(v8.cylinders.some((cylinder) => cylinder.crankMirror)).toBe(true)
    expect(v6.cylinders.some((cylinder) => cylinder.crankMirror)).toBe(false)
  })

  it('fires the cross-plane V8 1-8-4-3-6-5-7-2 every 90 degrees', () => {
    expect(fireOrder(v8.cylinders, V8_FIRING_ORDER)).toEqual(V8_FIRING_ORDER)
    const step = Math.PI / 2
    for (let index = 1; index < V8_FIRING_ORDER.length; index += 1) {
      const previous = v8.cylinders[V8_FIRING_ORDER[index - 1] - 1]
      const current = v8.cylinders[V8_FIRING_ORDER[index] - 1]
      expect((current?.fireAngle ?? 0) - (previous?.fireAngle ?? 0)).toBeCloseTo(step, 6)
    }
    const pins = stations(v8.cylinders).map((pair) => {
      expect(angDiff(pair[0]?.phase ?? 0, pair[1]?.phase ?? 1)).toBeLessThan(1e-6)
      return pair[0]?.phase ?? 0
    })
    expect(pins).toHaveLength(4)
    expect(angDiff(pins[0] ?? 0, pins[3] ?? 0)).toBeCloseTo(Math.PI, 5)
    expect(angDiff(pins[1] ?? 0, pins[2] ?? 0)).toBeCloseTo(Math.PI, 5)
    expect(angDiff(pins[0] ?? 0, pins[1] ?? 0)).toBeCloseTo(Math.PI / 2, 5)
  })

  it('puts each piston at top dead center on its own bank when that cylinder fires', () => {
    for (const layout of [v6, v8]) {
      for (const cylinder of layout.cylinders) {
        const fired = pistonHeight(
          cylinder.fireAngle,
          pistonPhaseOffset(cylinder),
          layout.crankRadius,
          layout.rodLength,
        )
        const opposite = pistonHeight(
          cylinder.fireAngle + Math.PI,
          pistonPhaseOffset(cylinder),
          layout.crankRadius,
          layout.rodLength,
        )
        expect(fired).toBeCloseTo(layout.crankRadius + layout.rodLength, 5)
        expect(fired).toBeGreaterThan(opposite)
      }
    }
  })

  it('reads bank angle, bore, and cylinder count from the procedural params', () => {
    const custom = planVee({
      bankAngleDeg: 60,
      cylindersPerBank: 3,
      boreSpacing: 0.1,
      firingOrder: [1, 2, 3, 4, 5, 6],
    })
    expect(custom).toHaveLength(6)
    expect(custom[1]?.x - (custom[0]?.x ?? 0)).toBeCloseTo(0, 5)
    expect((custom[2]?.x ?? 0) - (custom[0]?.x ?? 0)).toBeCloseTo(0.1, 5)
  })
})

function angleBetween(layout: ReturnType<typeof layoutVee>): number {
  const left = layout.banks.find((bank) => bank.id === 'left')
  const right = layout.banks.find((bank) => bank.id === 'right')
  const dot = (left?.axis[1] ?? 0) * (right?.axis[1] ?? 0) + (left?.axis[2] ?? 0) * (right?.axis[2] ?? 0)
  return (Math.acos(Math.min(1, Math.max(-1, dot))) * 180) / Math.PI
}

function stations<T extends { station: number }>(cylinders: readonly T[]): T[][] {
  const map = new Map<number, T[]>()
  for (const cylinder of cylinders) {
    const group = map.get(cylinder.station) ?? []
    group.push(cylinder)
    map.set(cylinder.station, group)
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map((entry) => entry[1])
}

function fireOrder(cylinders: { number: number; fireAngle: number }[], order: readonly number[]): number[] {
  return order.slice().sort((a, b) => {
    const left = cylinders[a - 1]?.fireAngle ?? 0
    const right = cylinders[b - 1]?.fireAngle ?? 0
    return left - right
  })
}
