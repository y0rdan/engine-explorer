import { CircleHelp, Info } from 'lucide-react'
import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import './App.css'
import { defaultEngine } from './data/engines/catalog.ts'
import { formatDisplacement, formatYears } from './engine/schema.ts'
import { GESTURE_HINT } from './components/onboarding.ts'

const EngineExperience = lazy(() =>
  import('./components/EngineExperience.tsx').then((module) => ({
    default: module.EngineExperience,
  })),
)

export default function App() {
  const [about, setAbout] = useState(false)
  const [help, setHelp] = useState(false)
  const aboutRef = useRef<HTMLDivElement>(null)
  const helpRef = useRef<HTMLDivElement>(null)
  const aboutId = useId()
  const helpId = useId()
  const specs = `${defaultEngine.brand} ${defaultEngine.engineCode} · ${formatDisplacement(defaultEngine.displacementCc)} · ${formatYears(defaultEngine.yearRange)}`

  useEffect(() => {
    if (!about && !help) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAbout(false)
        setHelp(false)
      }
    }
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (aboutRef.current?.contains(target) || helpRef.current?.contains(target)) return
      setAbout(false)
      setHelp(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [about, help])

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="3" y="13" width="26" height="13" rx="2" fill="#e6c79a" />
            <rect x="12" y="6" width="8" height="9" rx="2" fill="#f2f0ea" />
            <circle cx="16" cy="8" r="1.4" fill="#101418" />
          </svg>
          <div className="titles">
            <h1>Engine Explorer</h1>
            <p className="specs">{specs}</p>
          </div>
          <div className="header-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="Help"
              aria-expanded={help}
              aria-controls={helpId}
              onClick={() => {
                setHelp((open) => !open)
                setAbout(false)
              }}
            >
              <CircleHelp size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="About"
              aria-expanded={about}
              aria-controls={aboutId}
              onClick={() => {
                setAbout((open) => !open)
                setHelp(false)
              }}
            >
              <Info size={18} aria-hidden="true" />
            </button>
            {help && (
              <div ref={helpRef} id={helpId} className="popover" role="dialog" aria-label="Help">
                <p>{GESTURE_HINT}.</p>
                <p>Arrow keys pan. Esc closes a part. Explode, Run, Section, and Assembly share one toolbar.</p>
              </div>
            )}
            {about && (
              <div ref={aboutRef} id={aboutId} className="popover" role="dialog" aria-label="About">
                <footer>
                  <p>
                    Procedural inline-4. Reference model by{' '}
                    <a href="https://grab3d.com/models/vehicles/car-engine/">Grab3D</a> (CC0), kept in the repo and not
                    loaded.
                  </p>
                  <p className="fine">Studio HDR by Greg Zaal, Poly Haven (CC0).</p>
                </footer>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="stage">
        <h2 className="visually-hidden">3D view</h2>
        <Suspense fallback={<p className="canvas-fallback">Loading 3D view…</p>}>
          <EngineExperience />
        </Suspense>
      </main>
    </div>
  )
}
