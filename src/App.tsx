import { lazy, Suspense } from 'react'
import './App.css'
import { defaultEngine } from './data/engines/catalog.ts'
import { formatDisplacement, formatYears } from './engine/schema.ts'

const EngineExperience = lazy(() =>
  import('./components/EngineExperience.tsx').then((module) => ({
    default: module.EngineExperience,
  })),
)

export default function App() {
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
              {defaultEngine.brand} {defaultEngine.engineCode} · {formatDisplacement(defaultEngine.displacementCc)} ·{' '}
              {formatYears(defaultEngine.yearRange)}
            </p>
          </div>
        </div>
      </header>
      <main className="stage">
        <h2 className="visually-hidden">3D view</h2>
        <Suspense fallback={<p className="canvas-fallback">Loading 3D view…</p>}>
          <EngineExperience />
        </Suspense>
      </main>
      <footer className="footer">
        <p className="hint">Drag to orbit. Scroll or pinch to zoom. Arrow keys pan. Esc returns to the full engine.</p>
        <p className="credits">
          Procedural inline-4. Reference model by{' '}
          <a href="https://grab3d.com/models/vehicles/car-engine/">Grab3D</a> (CC0), kept in the repo and not loaded.
          Studio HDR by Greg Zaal, Poly Haven (CC0).
        </p>
      </footer>
    </div>
  )
}
