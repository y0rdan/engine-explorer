import { render } from '@testing-library/react'
import { forwardRef, useEffect, useMemo, type Ref } from 'react'
import { PerspectiveCamera } from 'three'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EngineControls } from './EngineControls.tsx'
import { bindOrbitKeys } from './orbitKeys.ts'

const harness = vi.hoisted(() => {
  const canvas = document.createElement('canvas')
  canvas.tabIndex = 0
  Object.defineProperty(canvas, 'clientWidth', { value: 800 })
  Object.defineProperty(canvas, 'clientHeight', { value: 600 })

  const store: {
    gl: { domElement: HTMLCanvasElement }
    camera: PerspectiveCamera
    invalidate: () => void
    events: { connected: HTMLElement | undefined }
  } = {
    gl: { domElement: canvas },
    camera: undefined as unknown as PerspectiveCamera,
    invalidate: () => {},
    events: { connected: undefined },
  }

  return { canvas, store }
})

vi.mock('@react-three/fiber', () => ({
  useThree: (selector: (state: typeof harness.store) => unknown) => selector(harness.store),
  useFrame: () => {},
}))

// Mirrors drei: connect on the resolved element, and dispose() on cleanup,
// which drops a key listener bound before that reconnect.
vi.mock('@react-three/drei', () => {
  const OrbitControls = forwardRef(function OrbitControls(
    props: { domElement?: HTMLElement },
    ref: Ref<OrbitControlsImpl>,
  ) {
    const { store } = harness
    const element = props.domElement || store.events.connected || store.gl.domElement
    const controls = useMemo(() => new OrbitControlsImpl(store.camera), [store.camera])

    useEffect(() => {
      controls.connect(element)
      return () => {
        controls.dispose()
      }
    }, [controls, element])

    useEffect(() => {
      if (typeof ref === 'function') ref(controls)
      else if (ref !== null) ref.current = controls
      return () => {
        if (typeof ref === 'function') ref(null)
        else if (ref !== null) ref.current = null
      }
    }, [controls, ref])

    return null
  })

  return { OrbitControls }
})

function pressArrowRight(): void {
  harness.canvas.dispatchEvent(
    new KeyboardEvent('keydown', { code: 'ArrowRight', bubbles: true }),
  )
}

function placeCamera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(45, 800 / 600, 0.1, 100)
  camera.position.set(3, 2, 4)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  harness.store.camera = camera
  return camera
}

describe('EngineControls arrow keys', () => {
  beforeEach(() => {
    harness.store.events.connected = undefined
    placeCamera()
    document.body.replaceChildren(harness.canvas)
  })

  it('pans the camera when ArrowRight is pressed after the controls element resolves', () => {
    const { rerender } = render(<EngineControls />)
    const before = harness.store.camera.position.clone()

    // drei reconnects when events.connected appears. A stable domElement
    // keeps dispose() from running and dropping the key listener.
    harness.store.events.connected = document.createElement('div')
    rerender(<EngineControls />)
    pressArrowRight()

    expect(harness.store.camera.position.distanceTo(before)).toBeGreaterThan(0)
  })
})

describe('bindOrbitKeys', () => {
  it('moves the controls target when the canvas receives ArrowRight', () => {
    const camera = new PerspectiveCamera(45, 1, 0.1, 100)
    camera.position.set(3, 2, 4)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()
    const controls = new OrbitControlsImpl(camera)
    controls.connect(harness.canvas)
    const beforeTarget = controls.target.clone()
    const beforeCamera = camera.position.clone()
    const release = bindOrbitKeys(controls, harness.canvas)

    pressArrowRight()

    const targetMoved = controls.target.distanceTo(beforeTarget) > 0
    const cameraMoved = camera.position.distanceTo(beforeCamera) > 0
    expect(targetMoved || cameraMoved).toBe(true)
    release()
    controls.dispose()
  })

  it('does not call stopListenToKeyEvents after the key element is already cleared', () => {
    const controls = {
      listenToKeyEvents: vi.fn(),
      stopListenToKeyEvents: vi.fn(),
      _domElementKeyEvents: harness.canvas as HTMLElement | null,
    }
    const release = bindOrbitKeys(controls, harness.canvas)
    controls._domElementKeyEvents = null

    expect(() => release()).not.toThrow()
    expect(controls.stopListenToKeyEvents).not.toHaveBeenCalled()
  })
})
