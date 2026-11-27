import { describe, expect, it } from 'vitest'
import { IDLE_BOB_SECONDS, idleBobOffset, stepIdlePresentation } from './idleBob.ts'

const FRAME = 1 / 60

function demandLoop(input: { reducedMotion: boolean; idleSince?: number; start?: number; seconds: number; positionY?: number }) {
  let positionY = input.positionY ?? 0
  let now = input.start ?? 0
  const idleSince = input.idleSince ?? 0
  const requested: boolean[] = []
  const frames = Math.round(input.seconds / FRAME)
  for (let frame = 0; frame < frames; frame += 1) {
    const step = stepIdlePresentation({
      reducedMotion: input.reducedMotion,
      busy: false,
      now,
      delta: FRAME,
      idleSince,
      positionY,
    })
    positionY = step.positionY
    requested.push(step.invalidate)
    now += FRAME
  }
  return { positionY, requested }
}

describe('idle bob', () => {
  it('does not invalidate after the showroom pose settles', () => {
    const run = demandLoop({ reducedMotion: false, seconds: IDLE_BOB_SECONDS + 3 })
    const last = run.requested.lastIndexOf(true)
    expect(last).toBeGreaterThan(Math.round((IDLE_BOB_SECONDS - 0.2) / FRAME))
    expect(last).toBeLessThan(run.requested.length - 60)
    const afterSettle = run.requested.slice(last + 1, last + 1 + 60)
    expect(afterSettle).toHaveLength(60)
    expect(afterSettle.every((frame) => frame === false)).toBe(true)
    expect(Math.abs(run.positionY)).toBeLessThan(0.0004)

    const parked = demandLoop({ reducedMotion: false, idleSince: -10, seconds: 1, positionY: 0 })
    expect(parked.requested.some(Boolean)).toBe(false)
  })

  it('keeps the bob off under reduced motion', () => {
    const raised = demandLoop({ reducedMotion: true, seconds: 2, positionY: 0.003 })
    expect(idleBobOffset({ reducedMotion: true, busy: false, now: 0.5, idleSince: 0 })).toBe(0)
    expect(raised.requested.some(Boolean)).toBe(false)
    expect(raised.positionY).toBe(0)
  })
})
