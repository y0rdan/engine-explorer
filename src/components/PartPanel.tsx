import { useEffect, useId, useRef } from 'react'
import type { EnginePart } from '../engine/schema.ts'
import { SYSTEM_LABELS } from '../engine/schema.ts'

export function PartPanel({
  part,
  layerId,
  isolated,
  onClose,
  onSelectLayer,
  onIsolate,
}: {
  part: EnginePart
  layerId: string | null
  isolated: boolean
  onClose: () => void
  onSelectLayer: (layerId: string) => void
  onIsolate: () => void
}) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement && active.closest('.parts-list')) return
    closeRef.current?.focus()
  }, [part.id])

  return (
    <aside className="part-panel" role="dialog" aria-modal="false" aria-labelledby={titleId}>
      <div className="panel-bar">
        <p className={`system-label system-${part.system}`}>{SYSTEM_LABELS[part.system]}</p>
        <button ref={closeRef} type="button" className="text-button" onClick={onClose}>
          Close
        </button>
      </div>
      <h2 id={titleId}>{part.displayName}</h2>
      <p className="summary">{part.summary}</p>
      <p className="where">
        <span>Where it lives</span>
        {part.whereItLives}
      </p>
      <div className="meta">
        <span className="difficulty" aria-label={`Difficulty ${part.difficulty} of 5`}>
          {[1, 2, 3, 4, 5].map((step) => (
            <i key={step} className={step <= part.difficulty ? 'on' : ''} />
          ))}
        </span>
        <span>{part.estimatedTime}</span>
      </div>
      <button type="button" className="text-button isolate" aria-pressed={isolated} onClick={onIsolate}>
        {isolated ? 'Show all parts' : 'View alone'}
      </button>
      <section>
        <h3>Description</h3>
        <p>{part.description}</p>
      </section>
      <section>
        <h3>What it does</h3>
        <p>{part.whatItDoes}</p>
      </section>
      <section>
        <h3>How it works</h3>
        <ol>
          {part.howItWorks.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      {part.howItMoves && (
        <section>
          <h3>How it moves</h3>
          <p>{part.howItMoves}</p>
        </section>
      )}
      <section>
        <h3>Key numbers</h3>
        <table>
          <tbody>
            {part.keyNumbers.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                <td>
                  {row.value}
                  {row.unit ? ` ${row.unit}` : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <h3>Warning signs</h3>
        <ul>
          {part.warningSigns.map((sign) => (
            <li key={sign}>{sign}</li>
          ))}
        </ul>
      </section>
      <section>
        <h3>Fix or replace</h3>
        <p className="tools">Tools: {part.tools.join(', ')}</p>
        {part.safetyNote && <p className="safety">{part.safetyNote}</p>}
        <ol>
          {part.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section>
        <h3>Maintenance</h3>
        <ul>
          {part.maintenance.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      {part.funFact && (
        <section className="fact">
          <h3>Fun fact</h3>
          <p>{part.funFact}</p>
        </section>
      )}
      <section>
        <h3>Layers</h3>
        <ul className="layer-list">
          {part.layers.map((layer) => (
            <li key={layer.id}>
              <button
                type="button"
                aria-pressed={layer.id === layerId}
                onClick={() => onSelectLayer(layer.id)}
              >
                {layer.name}
              </button>
              <p>{layer.description}</p>
            </li>
          ))}
        </ul>
      </section>
      <p className="disclaimer">
        Teaching notes for this generic engine. Not a repair procedure for a specific vehicle.
      </p>
    </aside>
  )
}
