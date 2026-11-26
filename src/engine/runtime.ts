import { RPM_DEFAULT } from './kinematics.ts'
import { advanceCrank } from './kinematics.ts'

export const EXPLODE_PLAY_SECONDS = 3.4

export type EngineRuntime = {
  crank: number
  explode: number
  explodeFrom: number
  explodeTo: number
  explodePlayStart: number | null
  explodePlaying: boolean
  assembly: number
  assemblyFrom: number
  assemblyTo: number
  assemblyPlayStart: number | null
  assemblyPlaying: boolean
  assemblyDuration: number
  enginePlaying: boolean
  rpm: number
  cutaway: boolean
  warmup: number
}

export function createRuntime(): EngineRuntime {
  return {
    crank: 0,
    explode: 0,
    explodeFrom: 0,
    explodeTo: 0,
    explodePlayStart: null,
    explodePlaying: false,
    assembly: 1,
    assemblyFrom: 1,
    assemblyTo: 1,
    assemblyPlayStart: null,
    assemblyPlaying: false,
    assemblyDuration: 8,
    enginePlaying: false,
    rpm: RPM_DEFAULT,
    cutaway: false,
    warmup: 24,
  }
}

// Near-linear, with a soft ease at each end and no overshoot.
export function easeNearLinear(value: number): number {
  const t = Math.min(1, Math.max(0, value))
  const smooth = t * t * (3 - 2 * t)
  return t * 0.72 + smooth * 0.28
}

export function stepRuntime(runtime: EngineRuntime, now: number, delta: number): boolean {
  let moving = false
  if (runtime.enginePlaying) {
    runtime.crank = advanceCrank(runtime.crank, runtime.rpm, delta)
    moving = true
  }
  if (runtime.explodePlaying) {
    if (runtime.explodePlayStart === null) runtime.explodePlayStart = now
    const span = Math.max(EXPLODE_PLAY_SECONDS, 0.01)
    const u = Math.min(1, (now - runtime.explodePlayStart) / span)
    runtime.explode = runtime.explodeFrom + (runtime.explodeTo - runtime.explodeFrom) * easeNearLinear(u)
    if (u >= 1) runtime.explodePlaying = false
    else moving = true
  }
  if (runtime.assemblyPlaying) {
    if (runtime.assemblyPlayStart === null) runtime.assemblyPlayStart = now
    const span = Math.max(runtime.assemblyDuration, 0.01)
    const u = Math.min(1, (now - runtime.assemblyPlayStart) / span)
    runtime.assembly = runtime.assemblyFrom + (runtime.assemblyTo - runtime.assemblyFrom) * easeNearLinear(u)
    if (u >= 1) runtime.assemblyPlaying = false
    else moving = true
  }
  if (runtime.warmup > 0) {
    runtime.warmup -= 1
    moving = true
  }
  return moving
}

export function playExplode(runtime: EngineRuntime, reducedMotion: boolean): void {
  const to = runtime.explode < 0.985 ? 1 : 0
  runtime.explodePlaying = false
  if (reducedMotion || Math.abs(runtime.explode - to) < 0.001) {
    runtime.explode = to
    runtime.explodePlayStart = null
    return
  }
  runtime.explodeFrom = runtime.explode
  runtime.explodeTo = to
  runtime.explodePlayStart = null
  runtime.explodePlaying = true
}

export function playAssembly(
  runtime: EngineRuntime,
  to: number,
  duration: number,
  reducedMotion: boolean,
): void {
  runtime.assemblyPlaying = false
  if (Math.abs(runtime.assembly - to) < 0.001) runtime.assembly = to === 1 ? 0 : 1
  if (reducedMotion) {
    runtime.assembly = to
    runtime.assemblyPlayStart = null
    return
  }
  runtime.assemblyFrom = runtime.assembly
  runtime.assemblyTo = to
  runtime.assemblyPlayStart = null
  runtime.assemblyDuration = duration
  runtime.assemblyPlaying = true
}

export function assemblyDuration(stepCount: number): number {
  return Math.max(2.8, stepCount * 0.55)
}

export function writeRuntime(runtime: EngineRuntime, patch: Partial<EngineRuntime>): void {
  Object.assign(runtime, patch)
}

export function resetExplode(runtime: EngineRuntime): void {
  writeRuntime(runtime, { explode: 0, explodePlaying: false })
}
