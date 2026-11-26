export type Snap = 'peek' | 'half' | 'full'

const ORDER: Snap[] = ['peek', 'half', 'full']

export function snapHeight(snap: Snap, viewportHeight: number): number {
  const peek = 112
  const full = Math.max(peek, Math.round(viewportHeight * 0.5))
  const half = Math.round(viewportHeight * 0.32)
  if (snap === 'peek') return Math.min(peek, full)
  if (snap === 'half') return Math.min(Math.max(half, peek), full)
  return full
}

export function nextSnap(current: Snap, direction: 'up' | 'down'): Snap {
  const index = ORDER.indexOf(current)
  const next = direction === 'up' ? Math.min(ORDER.length - 1, index + 1) : Math.max(0, index - 1)
  return ORDER[next] ?? current
}

export function snapFromDrag(current: Snap, deltaY: number): Snap {
  if (deltaY <= -48) return nextSnap(current, 'up')
  if (deltaY >= 48) return nextSnap(current, 'down')
  return current
}
