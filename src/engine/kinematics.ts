export const INLINE4_PHASES = [0, Math.PI, Math.PI, 0] as const

// Crank angles where each cylinder begins its power stroke.
// Firing order is 1-3-4-2, with pistons 1 and 4 sharing a pin angle.
export const INLINE4_FIRE_ANGLES = [0, Math.PI * 3, Math.PI, Math.PI * 2] as const

export const VALVE_DURATION = 1.35
export const VALVE_LIFT = 0.009
export const CRANK_CYCLE = Math.PI * 4

export const RPM_MIN = 60
export const RPM_MAX = 800
export const RPM_DEFAULT = 140

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function advanceCrank(angle: number, rpm: number, deltaSeconds: number): number {
  const next = angle + (rpm / 60) * Math.PI * 2 * Math.max(0, deltaSeconds)
  const wrapped = next % CRANK_CYCLE
  return wrapped < 0 ? wrapped + CRANK_CYCLE : wrapped
}

// Distance from the crank center up to the wrist pin. phi 0 is top dead center.
export function pistonHeight(crankAngle: number, phase: number, radius: number, rodLength: number): number {
  const phi = crankAngle + phase
  const s = Math.sin(phi)
  const under = rodLength * rodLength - (radius * s) * (radius * s)
  return radius * Math.cos(phi) + Math.sqrt(Math.max(0, under))
}

export function rodAngle(crankAngle: number, phase: number, radius: number, rodLength: number): number {
  const phi = crankAngle + phase
  return Math.asin(Math.min(1, Math.max(-1, (radius / rodLength) * Math.sin(phi))))
}

export function wrapPi(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle))
}

export function lobeCenter(fireAngle: number, port: 'intake' | 'exhaust'): number {
  if (port === 'exhaust') return (fireAngle - Math.PI / 2) / 2
  return (fireAngle + Math.PI * 2.5) / 2
}

export function valveLift(crankAngle: number, center: number, duration = VALVE_DURATION, maxLift = VALVE_LIFT): number {
  const cam = crankAngle * 0.5
  const delta = Math.abs(wrapPi(cam - center))
  if (delta > duration / 2) return 0
  return maxLift * 0.5 * (1 + Math.cos((delta / (duration / 2)) * Math.PI))
}

export function combustionGlow(crankAngle: number, fireAngle: number): number {
  let delta = (crankAngle - fireAngle) % CRANK_CYCLE
  if (delta < 0) delta += CRANK_CYCLE
  const window = Math.PI * 0.45
  if (delta > window) return 0
  return Math.cos((delta / window) * (Math.PI / 2))
}
