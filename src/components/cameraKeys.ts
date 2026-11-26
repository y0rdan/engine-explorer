export type CameraKeyControls = {
  truck: (x: number, y: number, enableTransition?: boolean) => void
  update?: (delta: number) => void
}

const STEP = 0.08

export function bindCameraKeys(controls: CameraKeyControls, element: HTMLElement): () => void {
  const onKey = (event: KeyboardEvent) => {
    if (event.code === 'ArrowRight') controls.truck(STEP, 0, false)
    else if (event.code === 'ArrowLeft') controls.truck(-STEP, 0, false)
    else if (event.code === 'ArrowUp') controls.truck(0, STEP, false)
    else if (event.code === 'ArrowDown') controls.truck(0, -STEP, false)
    else return
    event.preventDefault()
    controls.update?.(0)
  }
  element.addEventListener('keydown', onKey)
  return () => element.removeEventListener('keydown', onKey)
}
