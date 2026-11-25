import { lazy, Suspense, useEffect, useState } from 'react'
import './App.css'
import { EnginePicker } from './components/EnginePicker.tsx'
import { EngineSwitcher } from './components/EngineSwitcher.tsx'
import { engineById, engines } from './data/engines/catalog.ts'
import { readEngineParam, urlForEngine } from './engine/urlState.ts'
import { formatDisplacement, formatYears } from './engine/schema.ts'

const EngineExperience = lazy(() =>
  import('./components/EngineExperience.tsx').then((module) => ({
    default: module.EngineExperience,
  })),
)

export default function App() {
  const [engineId, setEngineId] = useState(() => readEngineParam(window.location.search))
  const [unknown, setUnknown] = useState(() => {
    const id = readEngineParam(window.location.search)
    return id !== null && engineById(id) === null
  })

  useEffect(() => {
    const onPop = () => {
      const id = readEngineParam(window.location.search)
      setEngineId(id)
      setUnknown(id !== null && engineById(id) === null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const engine = engineId ? engineById(engineId) : null

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
              {engine
                ? `${engine.brand} ${engine.engineCode} · ${formatDisplacement(engine.displacementCc)} · ${formatYears(engine.yearRange)}`
                : 'Choose an engine'}
            </p>
          </div>
          {engine && (
            <div className="header-tools">
              <EngineSwitcher
                engines={engines.filter((item) => item.category === 'engine')}
                value={engine.id}
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
        <h2 className="visually-hidden">{engine ? '3D view' : 'Engine catalog'}</h2>
        {engine ? (
          <Suspense fallback={<p className="canvas-fallback">Loading 3D view…</p>}>
            <EngineExperience key={engine.id} engine={engine} />
          </Suspense>
        ) : (
          <EnginePicker engines={engines} unknown={unknown} onSelect={showEngine} />
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
