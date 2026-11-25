export const HINT_KEY = 'engine-explorer-hint-dismissed'

export const GESTURE_HINT = 'Drag to rotate, pinch to zoom, tap a part'

export const EMPTY_HINT = 'Select a part, or drag Explode to take it apart.'

export function hintDismissed(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === '1'
  } catch {
    return false
  }
}

export function dismissHint(): void {
  try {
    window.localStorage.setItem(HINT_KEY, '1')
  } catch {
    // Private mode can block storage. The hint can stay for this visit.
  }
}
