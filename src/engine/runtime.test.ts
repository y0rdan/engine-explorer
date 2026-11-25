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
    playExplode(runtime, 10, false)
    expect(runtime.explodeTo).toBe(1)
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
    playExplode(runtime, 0, true)
    expect(runtime.explode).toBe(1)
    expect(runtime.explodePlaying).toBe(false)
    playAssembly(runtime, 0, 0, 4, true)
    expect(runtime.assembly).toBe(0)
  })
})
