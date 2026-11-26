import { describe, expect, it } from 'vitest'
import { spreadBoltBadges } from './labels.ts'

describe('spreadBoltBadges', () => {
  it('separates ten stacked head-bolt badges into two readable rows', () => {
    const stacked = Array.from({ length: 10 }, () => ({ x: 200, y: 320 }))
    const placed = spreadBoltBadges(stacked, { width: 800, height: 600 })
    expect(placed).toHaveLength(10)
    for (let index = 0; index < placed.length; index += 1) {
      for (let other = index + 1; other < placed.length; other += 1) {
        const a = placed[index]
        const b = placed[other]
        if (!a || !b) continue
        const gap = Math.hypot(a.x - b.x, a.y - b.y)
        expect(gap).toBeGreaterThanOrEqual(28)
      }
    }
    const top = placed.slice(0, 5)
    const bottom = placed.slice(5)
    expect(Math.max(...top.map((point) => point.y))).toBeLessThan(Math.min(...bottom.map((point) => point.y)))
  })
})