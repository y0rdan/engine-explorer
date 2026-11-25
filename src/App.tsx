import { lazy, Suspense, useEffect, useState } from 'react'
import './App.css'
import { EnginePicker } from './components/EnginePicker.tsx'
import { EngineSwitcher } from './components/EngineSwitcher.tsx'
import { cardById, engineCards } from './data/engines/cards.ts'
import { loadEngine } from './data/engines/loadEngine.ts'
import { formatDisplacement, type EngineRecord } from './engine/schema.ts'
import { readEngineParam, urlForEngine } from './engine/urlState.ts'

const EngineExperience = lazy(() =>
  import('./components/EngineExperience.tsx').then((module) => ({
    default: module.EngineExperience,
  })),
)

export default function App() {
  const [engineId, setEngineId] = useState(() => {
    const id = readEngineParam(window.location.search)
    return id && cardById(id) ? id : null
  })
  const [unknown, setUnknown] = useState(() => {
    const id = readEngineParam(window.location.search)
    return id !== null && cardById(id) === null
  })
  const [engine, setEngine] = useState<EngineRecord | null>(null)

  useEffect(() => {
    const id = readEngineParam(window.location.search)
    if (id !== null && cardById(id) === null) {
      window.history.replaceState({}, '', urlForEngine(null, window.location))
    }
  }, [engineId])

  useEffect(() => {
    const onPop = () => {
      const id = readEngineParam(window.location.search)
      if (id !== null && cardById(id) === null) {
        window.history.replaceState({}, '', urlForEngine(null, window.location))
        setEngineId(null)
        setUnknown(true)
        return
      }
      setEngineId(id)
      setUnknown(false)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const id = engineId && cardById(engineId) ? engineId : null
    if (!id) return
    let live = true
    loadEngine(id).then((record) => {
      if (live) setEngine(record)
    })
    return () => {
      live = false
    }
  }, [engineId])

  const card = engineId ? cardById(engineId) : null
  const ready = engine && card && engine.id === card.id ? engine : null

  function showEngine(id: string) {
    const next = urlForEngine(id, window.location, true)
    window.history.pushState({ engineId: id }, '', next)
    setEngineId(id)
    setUnknown(false)
  }

  function showCatalog() {
    const next = urlForEngine(null, window.location, true)
    window.history.pushState({}, '', next)
    setEngineId(null)
    setUnknown(false)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="3" y="13" width="26" height="13" rx="2" fill="#d4843c" />
            <rect x="12" y="6" width="8" height="9" rx="2" fill="#f2f0ea" />
            <circle cx="16" cy="8" r="1.4" fill="#d4843c" />
          </svg>
          <div>
            <h1>Engine Explorer</h1>
            <p>
              {card
                ? `${card.brand} ${card.engineCode} · ${formatDisplacement(card.displacementCc)} example`
                : 'Choose an engine'}
            </p>
          </div>
          {card && (
            <div className="header-tools">
              <EngineSwitcher
                engines={engineCards.filter((item) => item.category === 'engine')}
                value={card.id}
                onChange={showEngine}
              />
              <button type="button" className="text-button" onClick={showCatalog}>
                Change engine
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="stage">
        <h2 className="visually-hidden">{card ? '3D view' : 'Engine catalog'}</h2>
        {ready ? (
          <Suspense fallback={<p className="canvas-fallback">Loading 3D view…</p>}>
            <EngineExperience key={ready.id} engine={ready} />
          </Suspense>
        ) : card ? (
          <p className="canvas-fallback">Loading 3D view…</p>
        ) : (
          <EnginePicker engines={engineCards} unknown={unknown} onSelect={showEngine} />
        )}
      </main>
      <footer className="footer">
        <p className="hint">Drag to orbit. Scroll or pinch to zoom. Arrow keys pan. Esc returns to the full engine.</p>
        <p className="credits">
          Procedural engines. Reference model by{' '}
          <a href="https://grab3d.com/models/vehicles/car-engine/">Grab3D</a> (CC0), kept in the repo and not loaded.
          Studio HDR by Greg Zaal, Poly Haven (CC0).
        </p>
      </footer>
    </div>
  )
}
