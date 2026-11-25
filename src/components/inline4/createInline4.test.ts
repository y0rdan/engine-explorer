import { Group } from 'three'
import { describe, expect, it } from 'vitest'
import { genericInline4 } from '../../data/engines/catalog.ts'
import { layoutFromEngine } from '../../engine/layout.ts'
import { countVisibleDrawables, createFloor, createInline4, createStand, createTray, pedestalRadius } from './createInline4.ts'

describe('inline-4 drawables', () => {
  it('keeps a settled showroom under 100 visible draws', () => {
    const layout = layoutFromEngine(genericInline4)
    const root = new Group()
    root.add(createInline4(genericInline4))
    root.add(createStand(layout))
    root.add(createFloor(pedestalRadius(layout)))
    root.add(createTray(layout))
    const draws = countVisibleDrawables(root)
    expect(draws).toBeGreaterThan(10)
    expect(draws).toBeLessThan(100)
  })
})
