import { DoubleSide, FrontSide, MeshStandardMaterial, Plane, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { sharedMaterial } from './materials.ts'

describe('sharedMaterial section clip', () => {
  it('clips a tagged surface only while Section is on, and caches that separately', () => {
    const plane = new Plane(new Vector3(0, 0, -1), 0.02)
    const cut = sharedMaterial('steel', 'idle', true, true, plane) as MeshStandardMaterial
    const whole = sharedMaterial('steel', 'idle', true, false, plane) as MeshStandardMaterial
    const again = sharedMaterial('steel', 'idle', true, true, plane)

    expect(cut).not.toBe(whole)
    expect(again).toBe(cut)
    expect(cut.clippingPlanes).toEqual([plane])
    expect(cut.side).toBe(DoubleSide)
    expect(whole.clippingPlanes).toEqual([])
    expect(whole.side).toBe(FrontSide)
    expect(sharedMaterial('steel', 'idle', false, true, plane)).toBe(whole)
  })
})
