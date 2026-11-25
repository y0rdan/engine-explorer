import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { defaultEngine } from '../data/engines/catalog.ts'
import { activeStepIndex, assemblySteps } from '../engine/placement.ts'
import { partById } from '../engine/schema.ts'
import { RPM_DEFAULT } from '../engine/kinematics.ts'
import {
  assemblyDuration,
  createRuntime,
  playAssembly,
  playExplode,
} from '../engine/runtime.ts'
import { readPartParam, urlForPart } from '../engine/urlState.ts'
import { createView, viewReducer, type ViewState } from '../engine/view.ts'
import { usePrefersReducedMotion } from './usePrefersReducedMotion.ts'
import { ControlBar } from './ControlBar.tsx'
import { EngineCanvas } from './EngineCanvas.tsx'
import type { DriverProps } from './SceneDriver.tsx'
import { PartPanel } from './PartPanel.tsx'
import { PartsSidebar } from './PartsSidebar.tsx'

function initialView(engineParts: { id: string }[]): ViewState {
  const requested = readPartParam(window.location.search)
  const valid = requested && engineParts.some((part) => part.id === requested) ? requested : null
  return createView(valid)
}

export function EngineExperience() {
  const engine = defaultEngine
  const reducedMotion = usePrefersReducedMotion()
  const runtime = useRef(createRuntime())
  const pokeRef = useRef<() => void>(() => {})
  const [view, setView] = useState(() => initialView(engine.parts))
  const [hud, setHud] = useState({ explode: 0, assembly: 1, playing: false, rpm: RPM_DEFAULT })
  const [fitToken, setFitToken] = useState(1)
  const [drawer, setDrawer] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const historyLock = useRef(false)
  const returnFocus = useRef<HTMLElement | null>(null)

  function dispatch(action: Parameters<typeof viewReducer>[1]) {
    setView((current) => viewReducer(current, action))
  }

  function poke() {
    pokeRef.current()
  }

  function bumpFit() {
    setFitToken((value) => value + 1)
    poke()
  }

  const driverRef = useRef<DriverProps>({
    engine,
    partId: null,
    layerId: null,
    isolated: false,
    assemblyMode: false,
    cutaway: false,
    runtime: runtime.current,
    reducedMotion: false,
    fitToken: 1,
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
  }, [view, reducedMotion, fitToken])

  useEffect(() => {
    const onPop = () => {
      historyLock.current = true
      const requested = readPartParam(window.location.search)
      const valid = requested && engine.parts.some((part) => part.id === requested) ? requested : null
      dispatch({ type: 'replace', partId: valid })
      bumpFit()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [engine.parts])

  useEffect(() => {
    if (historyLock.current) {
      historyLock.current = false
      return
    }
    const next = urlForPart(view.partId, window.location)
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (next !== current) history.pushState({ partId: view.partId }, '', next)
  }, [view.partId])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (dialogRef.current?.open) return
      if (view.partId) {
        event.preventDefault()
        dispatch({ type: 'clear' })
        bumpFit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view.partId])

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

  const part = partById(engine, view.partId)
  const steps = assemblySteps(engine, view.partId, view.assemblyMode && view.isolated)
  const assemblyPartId = view.assemblyMode
    ? (steps[activeStepIndex(hud.assembly, steps.length)]?.partId ?? null)
    : null

  function publish() {
    const motion = runtime.current
    setHud({
      explode: motion.explode,
      assembly: motion.assembly,
      playing: motion.enginePlaying,
      rpm: motion.rpm,
    })
  }

  function selectPart(id: string) {
    if (document.activeElement instanceof HTMLElement) returnFocus.current = document.activeElement
    dispatch({ type: 'select-part', id })
    bumpFit()
  }

  return (
    <div className={part ? 'experience has-part' : 'experience'}>
      <aside className="sidebar">
        <PartsSidebar parts={engine.parts} selectedId={view.partId} onSelect={selectPart} idPrefix="side" />
      </aside>
      <div className="viewport-column">
        <div className="viewport">
          <p className="visually-hidden" aria-live="polite">
            {part ? `${part.displayName} selected` : 'Full engine'}
          </p>
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
              dispatch({ type: 'clear' })
              bumpFit()
            }}
            onSelectPart={selectPart}
            onSelectLayer={(partId, layerId) => {
              dispatch({ type: 'select-layer', partId, layerId })
              bumpFit()
            }}
            onHover={(id) => dispatch({ type: 'hover', id })}
          />
        </div>
        <ControlBar
          engine={engine}
          rpm={hud.rpm}
          partId={view.partId}
          isolated={view.isolated}
          assemblyMode={view.assemblyMode}
          cutaway={view.cutaway}
          playing={hud.playing}
          explode={hud.explode}
          assembly={hud.assembly}
          onExplode={(value) => {
            runtime.current.explodePlaying = false
            runtime.current.explode = value
            if (view.assemblyMode) dispatch({ type: 'assembly', on: false })
            publish()
            bumpFit()
          }}
          onPlayExplode={() => {
            playExplode(runtime.current, performance.now() / 1000, reducedMotion)
            publish()
            bumpFit()
          }}
          onAssemblyMode={(on) => {
            runtime.current.assemblyPlaying = false
            runtime.current.explodePlaying = false
            if (on) runtime.current.assembly = runtime.current.explode > 0.5 ? 0 : 1
            dispatch({ type: 'assembly', on })
            publish()
            bumpFit()
          }}
          onAssembly={(value) => {
            runtime.current.assemblyPlaying = false
            runtime.current.assembly = value
            publish()
            bumpFit()
          }}
          onStep={(direction) => {
            const index = activeStepIndex(hud.assembly, steps.length)
            const next = Math.min(steps.length, Math.max(0, index + direction))
            runtime.current.assemblyPlaying = false
            runtime.current.assembly = steps.length === 0 ? 1 : next / steps.length
            publish()
            bumpFit()
          }}
          onPlayAssembly={() => {
            playAssembly(runtime.current, performance.now() / 1000, 1, assemblyDuration(steps.length), reducedMotion)
            publish()
            bumpFit()
          }}
          onPlayTeardown={() => {
            playAssembly(runtime.current, performance.now() / 1000, 0, assemblyDuration(steps.length), reducedMotion)
            publish()
            bumpFit()
          }}
          onTogglePlay={() => {
            runtime.current.enginePlaying = !runtime.current.enginePlaying
            publish()
            poke()
          }}
          onRpm={(rpm) => {
            runtime.current.rpm = rpm
            publish()
          }}
          onCutaway={(on) => {
            runtime.current.cutaway = on
            dispatch({ type: 'cutaway', on })
            poke()
          }}
          onResetView={bumpFit}
          onOpenParts={() => setDrawer(true)}
        />
      </div>
      {part && (
        <PartPanel
          part={part}
          layerId={view.layerId}
          isolated={view.isolated}
          onClose={() => {
            dispatch({ type: 'clear' })
            bumpFit()
          }}
          onSelectLayer={(layerId) => {
            dispatch({ type: 'select-layer', partId: part.id, layerId })
            bumpFit()
          }}
          onIsolate={() => {
            dispatch({ type: 'isolate' })
            bumpFit()
          }}
        />
      )}
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
