type OrbitKeyControls = {
  listenToKeyEvents: (element: HTMLElement) => void
  stopListenToKeyEvents: () => void
  // three-stdlib leaves this set after dispose(); three.js core clears it.
  // stopListenToKeyEvents throws when it is already null.
  _domElementKeyEvents: HTMLElement | null
}

// Attach arrow-key panning after OrbitControls has connected.
// The returned cleanup is safe if dispose() already removed the listener.
export function bindOrbitKeys(controls: OrbitKeyControls, domElement: HTMLElement): () => void {
  controls.listenToKeyEvents(domElement)
  return () => {
    if (controls._domElementKeyEvents != null) {
      controls.stopListenToKeyEvents()
    }
  }
}
