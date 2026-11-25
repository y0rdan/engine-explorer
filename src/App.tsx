import { EngineCanvas } from './components/EngineCanvas.tsx'
import './App.css'

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
            <p>3D engine guide</p>
          </div>
        </div>
      </header>
      <main className="stage">
        <h2 className="visually-hidden">3D view</h2>
        <EngineCanvas />
        <p className="hint">Drag to orbit. Pinch or scroll to zoom.</p>
      </main>
      <footer className="footer">
        <p>3D model credits will appear here.</p>
      </footer>
    </div>
  )
}
