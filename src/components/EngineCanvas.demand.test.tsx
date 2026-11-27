import { act, cleanup, render } from '@testing-library/react'
import { useLayoutEffect, useRef, useState, type MutableRefObject } from 'react'
import { DataTexture, FloatType, RGBAFormat } from 'three'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { genericInline4, genericV6 } from '../data/engines/catalog.ts'
import { createRuntime } from '../engine/runtime.ts'
import type { EngineRecord } from '../engine/schema.ts'
import { EngineCanvas } from './EngineCanvas.tsx'
import type { DriverProps } from './SceneDriver.tsx'
import { createStubContext } from './inline4/webglStub.ts'

vi.mock('./studio.ts', () => {
  const hdr = new DataTexture(new Float32Array([1, 1, 1, 1]), 1, 1, RGBAFormat, FloatType)
  hdr.needsUpdate = true
  return {
    preloadStudioHdri: () => Promise.resolve(),
    studioHdriUrl: () => '/engine-explorer/hdri/studio_small_03_1k.hdr',
    STUDIO_LOADING_MESSAGE: 'Loading studio lighting…',
    STUDIO_LOAD_ERROR: 'Studio lighting could not be loaded. The engine is shown with built-in lights.',
    clearStudioPreload: () => {},
    disposeStudioPreload: () => {},
    studioHdriTexture: () => hdr,
  }
})

const queued = new Map<number, FrameRequestCallback>()
let nextFrame = 1
let draws = 0
let glRenders = 0

function IdleParent({
  engine,
  sampleRef,
}: {
  engine: EngineRecord
  sampleRef: MutableRefObject<(sample: { explode: number; assembly: number }) => void>
}) {
  const [, setHud] = useState({ explode: 0, assembly: 1, playing: false, rpm: 0 })
  const runtime = useState(createRuntime)[0]
  const pokeRef = useRef<() => void>(() => {})
  const onSample = (sample: { explode: number; assembly: number }) => {
    setHud((current) => {
      if (current.explode === sample.explode && current.assembly === sample.assembly) return current
      return { ...current, explode: sample.explode, assembly: sample.assembly }
    })
  }
  const driverRef = useRef<DriverProps>({
    engine,
    partId: null,
    layerId: null,
    isolated: false,
    assemblyMode: false,
    cutaway: false,
    runtime,
    reducedMotion: false,
    fitToken: 1,
    fitSmooth: true,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    onSample,
  })
  useLayoutEffect(() => {
    driverRef.current.onSample = onSample
    sampleRef.current = onSample
  })
  return (
    <EngineCanvas
      driverRef={driverRef}
      pokeRef={pokeRef}
      engine={engine}
      partId={null}
      layerId={null}
      hoveredPartId={null}
      isolated={false}
      assemblyPartId={null}
      cutaway={false}
      onClear={() => {}}
      onSelectPart={() => {}}
      onSelectLayer={() => {}}
      onHover={() => {}}
      onFastener={() => {}}
    />
  )
}

async function drain(limit: number): Promise<number> {
  let steps = 0
  let clock = 0
  while (queued.size > 0 && steps < limit) {
    const batch = [...queued.values()]
    queued.clear()
    steps += batch.length
    await act(async () => {
      for (const task of batch) {
        clock += 16
        task(clock)
      }
    })
  }
  return steps
}

describe('demand loop with the showroom canvas', () => {
  beforeEach(() => {
    queued.clear()
    nextFrame = 1
    draws = 0
    glRenders = 0
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private callback: ResizeObserverCallback
        constructor(callback: ResizeObserverCallback) {
          this.callback = callback
        }
        observe(target: Element) {
          const entry = {
            target,
            contentRect: {
              x: 0,
              y: 0,
              width: 800,
              height: 600,
              top: 0,
              left: 0,
              bottom: 600,
              right: 800,
              toJSON() {
                return {}
              },
            },
          } as ResizeObserverEntry
          setTimeout(() => {
            this.callback([entry], this as unknown as ResizeObserver)
          }, 0)
        }
        unobserve() {}
        disconnect() {}
      },
    )
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      toJSON() {
        return {}
      },
    })
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextFrame
      nextFrame += 1
      queued.set(id, callback)
      return id
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      queued.delete(id)
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((kind: string) => {
      if (kind !== 'webgl2' && kind !== 'webgl') return null
      const context = createStubContext(300, 150) as WebGL2RenderingContext & Record<string, (...args: unknown[]) => unknown>
      for (const name of ['clear', 'drawElements', 'drawArrays']) {
        const original = context[name]
        context[name] = (...args: unknown[]) => {
          if (name === 'clear') glRenders += 1
          else draws += 1
          return original(...args)
        }
      }
      return context
    })
  })

  afterEach(async () => {
    cleanup()
    await drain(30)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it.each([
    ['inline-4', genericInline4],
    ['v6', genericV6],
  ] as const)('stops gl.render after the first bake for %s', async (_label, engine) => {
    const sampleRef = { current: (_sample: { explode: number; assembly: number }) => {} }
    render(<IdleParent engine={engine} sampleRef={sampleRef} />)
    await act(async () => {
      window.dispatchEvent(new Event('resize'))
    })
    const baked = await drain(1200)
    expect(queued.size, `baked=${baked}`).toBe(0)
    expect(baked).toBeGreaterThan(0)
    expect(baked).toBeLessThan(1200)
    const drawsAfterBake = draws
    const rendersAfterBake = glRenders
    expect(drawsAfterBake).toBeGreaterThan(0)
    expect(rendersAfterBake).toBeGreaterThan(0)

    for (let index = 0; index < 8; index += 1) {
      act(() => {
        sampleRef.current({ explode: 0, assembly: 1 })
      })
    }
    const extra = await drain(8)
    expect(extra).toBe(0)
    expect(queued.size).toBe(0)
    expect(draws).toBe(drawsAfterBake)
    expect(glRenders).toBe(rendersAfterBake)
  })
})
