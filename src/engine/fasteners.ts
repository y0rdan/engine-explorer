import { seatAmount } from './placement.ts'
import type { Vec3 } from './schema.ts'

export type FastenerPose = {
  backup: number
  spin: number
  tray: number
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smooth(value: number): number {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

// 0 sits in the tray. 1 is fully tight.
// Sequence 1 starts first on the way in, so sequence N leaves first on the way out.
export function fastenerInstall(stepT: number, sequenceNumber: number, count: number): number {
  const span = 0.72
  const stagger = count <= 1 ? 0 : ((Math.max(sequenceNumber, 1) - 1) / Math.max(count - 1, 1)) * (1 - span)
  return clamp01((clamp01(stepT) - stagger) / span)
}

export function poseFromInstall(install: number, backupDistance = 0.014, turns = 2.5): FastenerPose {
  const spinLoose = turns * Math.PI * 2
  if (install <= 0) return { backup: backupDistance, spin: spinLoose, tray: 1 }
  if (install >= 1) return { backup: 0, spin: 0, tray: 0 }
  const flightEnd = 0.42
  if (install < flightEnd) {
    return { backup: backupDistance, spin: spinLoose, tray: 1 - smooth(install / flightEnd) }
  }
  const u = (install - flightEnd) / (1 - flightEnd)
  return { backup: backupDistance * (1 - u), spin: spinLoose * (1 - u), tray: 0 }
}

export function traySlot(slot: number, origin: Vec3, columns = 8): Vec3 {
  const col = slot % columns
  const row = Math.floor(slot / columns)
  return [origin[0] + (col - (columns - 1) / 2) * 0.028, origin[1] + 0.01, origin[2] + row * 0.028]
}

export function stepBlend(progress: number, index: number, count: number): number {
  return seatAmount(progress, index, count)
}
