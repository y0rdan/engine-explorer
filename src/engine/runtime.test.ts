import { describe, expect, it } from 'vitest'
import { createRuntime, easeNearLinear, playAssembly, playExplode, stepRuntime } from './runtime.ts'

describe('playback runtime', () => {
  it('eases near linearly without overshoot', () => {
    expect(easeNearLinear(0)).toBe(0)
    expect(easeNearLinear(1)).toBe(1)
    let previous = -1
    for (let step = 0; step <= 10; step += 1) {
      const value = easeNearLinear(step / 10)
      expect(value).toBeGreaterThanOrEqual(previous)
      expect(value).toBeLessThanOrEqual(1)
      previous = value
    }
  })

  it('plays explode to the far end and advances the crank only while running', () => {
    const runtime = createRuntime()
    runtime.warmup = 0
    playExplode(runtime, false)
    expect(runtime.explodeTo).toBe(1)
    stepRuntime(runtime, 10, 0.016)
    stepRuntime(runtime, 10 + 3.4, 0.016)
    expect(runtime.explode).toBeCloseTo(1, 2)
    expect(runtime.explodePlaying).toBe(false)

    const parked = runtime.crank
    stepRuntime(runtime, 20, 0.05)
    expect(runtime.crank).toBe(parked)
    runtime.enginePlaying = true
    stepRuntime(runtime, 21, 0.05)
    expect(runtime.crank).toBeGreaterThan(parked)
  })

  it('snaps when reduced motion is requested', () => {
    const runtime = createRuntime()
    runtime.explode = 0.2
    playExplode(runtime, true)
    expect(runtime.explode).toBe(1)
    expect(runtime.explodePlaying).toBe(false)
    playAssembly(runtime, 0, 4, true)
    expect(runtime.assembly).toBe(0)
  })

  it('keeps explode and assembly on the same clock when that clock is offset', () => {
    const runtime = createRuntime()
    runtime.warmup = 0
    playExplode(runtime, false)
    stepRuntime(runtime, 250, 0.016)
    expect(runtime.explode).toBeLessThan(0.08)
    stepRuntime(runtime, 250 + 3.4 / 2, 0.016)
    expect(runtime.explode).toBeGreaterThan(0.2)
    expect(runtime.explode).toBeLessThan(0.95)
    stepRuntime(runtime, 250 + 3.4, 0.016)
    expect(runtime.explode).toBeCloseTo(1, 2)

    runtime.assembly = 1
    playAssembly(runtime, 0, 4, false)
    stepRuntime(runtime, 900, 0.016)
    expect(runtime.assembly).toBeGreaterThan(0.9)
    stepRuntime(runtime, 904, 0.016)
    expect(runtime.assembly).toBeCloseTo(0, 2)
  })
})
