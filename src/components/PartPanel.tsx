import { useEffect, useId, useRef } from 'react'
import { X } from 'lucide-react'
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
        <p className={`system-tag system-${part.system}`}>{SYSTEM_LABELS[part.system]}</p>
        <button ref={closeRef} type="button" className="icon-button" aria-label="Close" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <h2 id={titleId}>{part.displayName}</h2>
      <p className="summary">{part.summary}</p>
      <p className="where">
        <span>Where it lives</span>
        {part.whereItLives}
      </p>
      <p className="difficulty" aria-label={`Difficulty ${part.difficulty} of 5`}>
        <span className="dots" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((step) => (
            <i key={step} className={step <= part.difficulty ? 'on' : ''} />
          ))}
        </span>
        <span>{part.difficulty} of 5</span>
        <span className="time">{part.estimatedTime}</span>
      </p>
      {part.safetyNote && <p className="safety">{part.safetyNote}</p>}
      <button type="button" className="text-button isolate" aria-pressed={isolated} onClick={onIsolate}>
        {isolated ? 'Show all parts' : 'View alone'}
      </button>
      <h3>Layers</h3>
      <ul className="layer-list" role="presentation">
        {part.layers.map((layer) => (
          <li key={layer.id} role="presentation">
            <button type="button" aria-pressed={layer.id === layerId} onClick={() => onSelectLayer(layer.id)}>
              {layer.name}
            </button>
            <p>{layer.description}</p>
          </li>
        ))}
      </ul>
      <details>
        <summary>How it works</summary>
        <p>{part.description}</p>
        <p>{part.whatItDoes}</p>
        <ol>
          {part.howItWorks.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        {part.howItMoves && <p>{part.howItMoves}</p>}
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
        <h3>Warning signs</h3>
        <ul>
          {part.warningSigns.map((sign) => (
            <li key={sign}>{sign}</li>
          ))}
        </ul>
        {part.funFact && (
          <p className="fact">
            <strong>Fun fact. </strong>
            {part.funFact}
          </p>
        )}
      </details>
      <details>
        <summary>Repair and maintenance</summary>
        <p className="tools">Tools: {part.tools.join(', ')}</p>
        <ol>
          {part.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <h3>Maintenance</h3>
        <ul>
          {part.maintenance.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </details>
      <p className="disclaimer">Teaching notes for this generic engine. Not a repair procedure for a specific vehicle.</p>
    </aside>
  )
}
