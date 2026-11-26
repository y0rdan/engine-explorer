// The showroom lifts a couple of millimetres, then rests so the demand loop can sleep.
export const IDLE_BOB_SECONDS = 4
export const BOB_REST_EPSILON = 0.0004

const BOB_AMPLITUDE = 0.0032
const BOB_SPEED = 1.5

export function showroomIsBusy(input: {
  assemblyMode: boolean
  enginePlaying: boolean
  explodePlaying: boolean
  assemblyPlaying: boolean
  explode: number
  assembly: number
}): boolean {
  return (
    input.enginePlaying ||
    input.explodePlaying ||
    input.assemblyPlaying ||
    input.assemblyMode ||
    input.explode > 0.02 ||
    input.assembly < 0.98
  )
}

export function idleBobOffset(input: {
  reducedMotion: boolean
  busy: boolean
  now: number
  idleSince: number
}): number {
  if (input.reducedMotion || input.busy) return 0
  const idleFor = input.now - input.idleSince
  if (idleFor >= IDLE_BOB_SECONDS) return 0
  const fade = Math.min(1, IDLE_BOB_SECONDS - idleFor)
  return Math.sin(input.now * BOB_SPEED) * BOB_AMPLITUDE * fade
}

// True while the post-interaction bob is still playing, or while the mesh is
// easing back to a settled height. A resting offset of zero does not count.
export function bobRequestsFrame(input: {
  reducedMotion: boolean
  busy: boolean
  now: number
  idleSince: number
  positionY: number
  target: number
}): boolean {
  if (!input.reducedMotion && !input.busy && input.now - input.idleSince < IDLE_BOB_SECONDS) return true
  return Math.abs(input.positionY - input.target) > BOB_REST_EPSILON
}

export function stepIdlePresentation(input: {
  reducedMotion: boolean
  busy: boolean
  now: number
  delta: number
  idleSince: number
  positionY: number
}): { positionY: number; target: number; invalidate: boolean } {
  const target = idleBobOffset(input)
  const blend = input.reducedMotion ? 1 : 1 - Math.exp(-4 * Math.max(input.delta, 0.016))
  const positionY = input.positionY + (target - input.positionY) * blend
  return {
    positionY,
    target,
    invalidate: bobRequestsFrame({ ...input, positionY, target }),
  }
}
