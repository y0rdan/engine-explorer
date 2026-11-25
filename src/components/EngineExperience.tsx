import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { defaultEngine } from '../data/engines/catalog.ts'
import { activeStepIndex, assemblySteps, type AssemblyDirection } from '../engine/placement.ts'
import { partById } from '../engine/schema.ts'
import { RPM_DEFAULT } from '../engine/kinematics.ts'
import { assemblyDuration, createRuntime, playAssembly, playExplode, resetExplode, writeRuntime } from '../engine/runtime.ts'
import { readPartParam, urlForPart } from '../engine/urlState.ts'
import { createView, viewReducer, type ViewState } from '../engine/view.ts'
import type { ScreenPadding } from './frameModel.ts'
import { BottomSheet } from './BottomSheet.tsx'
import { usePrefersReducedMotion } from './usePrefersReducedMotion.ts'
import { Toolbar, type Segment } from './Toolbar.tsx'
import { EngineCanvas } from './EngineCanvas.tsx'
import type { DriverProps } from './SceneDriver.tsx'
import type { FastenerTip } from './inline4/Inline4Engine.tsx'
import { PartPanel } from './PartPanel.tsx'
import { PartsSidebar } from './PartsSidebar.tsx'
import { dismissHint, EMPTY_HINT, GESTURE_HINT, hintDismissed } from './onboarding.ts'
import { snapHeight, type Snap } from './sheetSnap.ts'

function initialView(engineParts: { id: string }[]): ViewState {
  const requested = readPartParam(window.location.search)
  const valid = requested && engineParts.some((part) => part.id === requested) ? requested : null
  return createView(valid)
}

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia?.('(max-width: 899px)').matches ?? false)
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 899px)')
    if (!media) return
    const onChange = () => setNarrow(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])
  return narrow
}

export function EngineExperience() {
  const engine = defaultEngine
  const reducedMotion = usePrefersReducedMotion()
  const narrow = useNarrow()
  const runtime = useState(createRuntime)[0]
  const pokeRef = useRef<() => void>(() => {})
  const [view, setView] = useState(() => initialView(engine.parts))
  const [hud, setHud] = useState({ explode: 0, assembly: 1, playing: false, rpm: RPM_DEFAULT })
  const [fitToken, setFitToken] = useState(1)
  const [fitSmooth, setFitSmooth] = useState(true)
  const [segment, setSegment] = useState<Segment>('explode')
  const [direction, setDirection] = useState<AssemblyDirection>('install')
  const [drawer, setDrawer] = useState(false)
  const [snap, setSnap] = useState<Snap>('peek')
  const [hintOn, setHintOn] = useState(() => !hintDismissed())
  const [tip, setTip] = useState<FastenerTip | null>(null)
  const [viewport, setViewport] = useState({ width: 800, height: 600 })
  const dialogRef = useRef<HTMLDialogElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const historyLock = useRef(false)
  const returnFocus = useRef<HTMLElement | null>(null)

  function dispatch(action: Parameters<typeof viewReducer>[1]) {
    setView((current) => viewReducer(current, action))
  }

  function poke() {
    pokeRef.current()
  }

  function bumpFit(smooth: boolean) {
    setFitSmooth(smooth)
    setFitToken((value) => value + 1)
    poke()
  }

  function publish() {
    setHud({
      explode: runtime.explode,
      assembly: runtime.assembly,
      playing: runtime.enginePlaying,
      rpm: runtime.rpm,
    })
  }

  function clearExplode() {
    resetExplode(runtime)
    publish()
  }

  const part = partById(engine, view.partId)
  const sheet = part && narrow ? snapHeight(snap, viewport.height) : 0
  const padding = useMemo<ScreenPadding>(
    () => ({
      top: 28,
      left: 12,
      right: part && !narrow ? 340 : 12,
      bottom: 96 + sheet,
    }),
    [part, narrow, sheet],
  )

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
    padding,
    onSample: (sample) => {
      setHud((current) => ({ ...current, explode: sample.explode, assembly: sample.assembly }))
    },
  })

  useLayoutEffect(() => {
    driverRef.current.partId = view.partId
    driverRef.current.layerId = view.layerId
    driverRef.current.isolated = view.isolated
    driverRef.current.assemblyMode = view.assemblyMode
    driverRef.current.cutaway = view.cutaway
    driverRef.current.reducedMotion = reducedMotion
    driverRef.current.fitToken = fitToken
    driverRef.current.fitSmooth = fitSmooth
    driverRef.current.padding = padding
  }, [view, reducedMotion, fitToken, fitSmooth, padding, engine])

  useEffect(() => {
    const node = viewportRef.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      setViewport({ width: node.clientWidth, height: node.clientHeight })
    })
    observer.observe(node)
    setViewport({ width: node.clientWidth, height: node.clientHeight })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const onPop = () => {
      historyLock.current = true
      const requested = readPartParam(window.location.search)
      const valid = requested && engine.parts.some((item) => item.id === requested) ? requested : null
      dispatch({ type: 'replace', partId: valid })
      bumpFit(true)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [engine.parts])

  useEffect(() => {
    const requested = readPartParam(window.location.search)
    const valid = requested !== null && engine.parts.some((item) => item.id === requested)
    if (requested && !valid) {
      const next = urlForPart(null, window.location)
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (next !== current) window.history.replaceState({ partId: null }, '', next)
      historyLock.current = false
      return
    }
    if (historyLock.current) {
      historyLock.current = false
      return
    }
    const next = urlForPart(view.partId, window.location)
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (next !== current) window.history.pushState({ partId: view.partId }, '', next)
  }, [view.partId, engine.parts])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (dialogRef.current?.open) return
      if (tip) {
        event.preventDefault()
        setTip(null)
        return
      }
      if (view.partId) {
        event.preventDefault()
        resetExplode(runtime)
        setHud({
          explode: runtime.explode,
          assembly: runtime.assembly,
          playing: runtime.enginePlaying,
          rpm: runtime.rpm,
        })
        dispatch({ type: 'clear' })
        setFitSmooth(true)
        setFitToken((value) => value + 1)
        pokeRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view.partId, tip, runtime])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (drawer && !dialog.open) dialog.showModal()
    if (!drawer && dialog.open) dialog.close()
  }, [drawer])

  useEffect(() => {
    if (view.partId) return
    returnFocus.current?.focus()
  }, [view.partId])

  const steps = assemblySteps(engine, view.partId, view.assemblyMode && view.isolated)
  const assemblyPartId = view.assemblyMode ? (steps[activeStepIndex(hud.assembly, steps.length)]?.partId ?? null) : null

  function selectPart(id: string) {
    if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement
    clearExplode()
    dispatch({ type: 'select-part', id })
    setSnap('peek')
    setTip(null)
    bumpFit(true)
  }

  function chooseSegment(next: Segment) {
    writeRuntime(runtime, { assemblyPlaying: false, explodePlaying: false, enginePlaying: false })
    if (next === 'assembly') {
      if (!view.assemblyMode) writeRuntime(runtime, { assembly: runtime.explode > 0.5 ? 0 : 1 })
      writeRuntime(runtime, { cutaway: false })
      dispatch({ type: 'cutaway', on: false })
      dispatch({ type: 'assembly', on: true })
      setDirection('install')
    } else {
      dispatch({ type: 'assembly', on: false })
      const cutaway = next === 'section'
      writeRuntime(runtime, { cutaway, ...(next === 'run' ? { explode: 0 } : {}) })
      dispatch({ type: 'cutaway', on: cutaway })
    }
    setSegment(next)
    publish()
    bumpFit(true)
  }

  const guide = part ? (
    <PartPanel
      part={part}
      layerId={view.layerId}
      isolated={view.isolated}
      onClose={() => {
        clearExplode()
        dispatch({ type: 'clear' })
        bumpFit(true)
      }}
      onSelectLayer={(layerId) => {
        dispatch({ type: 'select-layer', partId: part.id, layerId })
        bumpFit(true)
      }}
      onIsolate={() => {
        dispatch({ type: 'isolate' })
        bumpFit(true)
      }}
    />
  ) : null

  return (
    <div className="experience">
      <aside className="sidebar">
        <PartsSidebar parts={engine.parts} selectedId={view.partId} onSelect={selectPart} idPrefix="side" />
      </aside>
      <div className="viewport-column">
        <div className="viewport" ref={viewportRef} style={{ '--sheet': `${sheet}px` } as CSSProperties}>
          <p className="visually-hidden" aria-live="polite">
            {part ? `${part.displayName} selected` : 'Full engine'}
          </p>
          {!part && <p className="empty-hint">{EMPTY_HINT}</p>}
          {hintOn && (
            <p className="gesture-hint">
              <span>{GESTURE_HINT}</span>
              <button
                type="button"
                onClick={() => {
                  dismissHint()
                  setHintOn(false)
                }}
              >
                Got it
              </button>
            </p>
          )}
          {tip && (
            <div className="fastener-tip" role="tooltip" style={{ left: tip.x, top: tip.y, transform: 'none' }}>
              <p>
                <strong>
                  {tip.count} × {tip.size} {tip.name}
                </strong>
              </p>
              <p>
                {tip.torqueMin}–{tip.torqueMax} N·m{tip.torqueAngle ? ` + ${tip.torqueAngle}°` : ''}
              </p>
              <p className="torque-note">Typical range — always check your engine&apos;s service manual.</p>
              <button type="button" onClick={() => setTip(null)}>
                Close
              </button>
            </div>
          )}
          <EngineCanvas
            driverRef={driverRef}
            pokeRef={pokeRef}
            engine={engine}
            partId={view.partId}
            layerId={view.layerId}
            hoveredPartId={view.hoveredPartId}
            isolated={view.isolated}
            assemblyPartId={assemblyPartId}
            cutaway={view.cutaway}
            onClear={() => {
              clearExplode()
              dispatch({ type: 'clear' })
              bumpFit(true)
            }}
            onSelectPart={selectPart}
            onSelectLayer={(partId, layerId) => {
              dispatch({ type: 'select-layer', partId, layerId })
              bumpFit(true)
            }}
            onHover={(id) => dispatch({ type: 'hover', id })}
            onFastener={setTip}
          />
          {part && !narrow && <div className="guide-card">{guide}</div>}
          {part && narrow && (
            <BottomSheet snap={snap} viewportHeight={viewport.height || window.innerHeight} onSnap={setSnap}>
              {guide}
            </BottomSheet>
          )}
          <Toolbar
            engine={engine}
            segment={segment}
            rpm={hud.rpm}
            partId={view.partId}
            isolated={view.isolated}
            playing={hud.playing}
            explode={hud.explode}
            assembly={hud.assembly}
            direction={direction}
            narrow={narrow}
            onSegment={chooseSegment}
            onExplode={(value) => {
              writeRuntime(runtime, { explodePlaying: false, explode: value })
              if (view.assemblyMode) dispatch({ type: 'assembly', on: false })
              publish()
              bumpFit(false)
            }}
            onPlayExplode={() => {
              playExplode(runtime, reducedMotion)
              publish()
              bumpFit(false)
            }}
            onAssembly={(value) => {
              writeRuntime(runtime, { assemblyPlaying: false, assembly: value })
              publish()
              bumpFit(false)
            }}
            onStep={(step) => {
              const index = activeStepIndex(hud.assembly, steps.length)
              const next = Math.min(steps.length, Math.max(0, index + step))
              writeRuntime(runtime, { assemblyPlaying: false, assembly: steps.length === 0 ? 1 : next / steps.length })
              setDirection(step < 0 ? 'remove' : 'install')
              publish()
              bumpFit(false)
            }}
            onPlayAssembly={() => {
              setDirection('install')
              playAssembly(runtime, 1, assemblyDuration(steps.length), reducedMotion)
              publish()
              bumpFit(false)
            }}
            onPlayTeardown={() => {
              setDirection('remove')
              playAssembly(runtime, 0, assemblyDuration(steps.length), reducedMotion)
              publish()
              bumpFit(false)
            }}
            onTogglePlay={() => {
              writeRuntime(runtime, { enginePlaying: !runtime.enginePlaying })
              publish()
              poke()
            }}
            onRpm={(rpm) => {
              writeRuntime(runtime, { rpm })
              publish()
            }}
            onResetView={() => bumpFit(true)}
            onOpenParts={() => setDrawer(true)}
          />
        </div>
      </div>
      <dialog
        ref={dialogRef}
        className="parts-drawer"
        aria-label="Engine parts"
        onClose={() => setDrawer(false)}
        onCancel={(event) => {
          event.preventDefault()
          setDrawer(false)
        }}
      >
        <button type="button" className="text-button" onClick={() => setDrawer(false)}>
          Close parts
        </button>
        {drawer && (
          <PartsSidebar
            parts={engine.parts}
            selectedId={view.partId}
            onSelect={(id) => {
              selectPart(id)
              setDrawer(false)
            }}
            idPrefix="drawer"
          />
        )}
      </dialog>
    </div>
  )
}
