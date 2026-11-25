import { useState } from 'react'
import { categoriesIn, filterCards, layoutsIn, type EngineCard } from '../data/engines/cards.ts'
import { CATEGORY_LABELS, formatDisplacement, layoutLabel, type CategoryId } from '../engine/schema.ts'
import './EnginePicker.css'

export function EnginePicker({
  engines,
  unknown,
  onSelect,
}: {
  engines: readonly EngineCard[]
  unknown: boolean
  onSelect: (id: string) => void
}) {
  const categories = categoriesIn(engines)
  const [category, setCategory] = useState<string | null>(categories[0] ?? null)
  const [layout, setLayout] = useState<string | null>(null)
  const [text, setText] = useState('')
  const layouts = layoutsIn(engines, category)
  const visible = filterCards(engines, { category, layout, text })

  return (
    <section className="engine-picker" aria-label="Engines">
      <div className="engine-picker-head">
        <h2>Engines</h2>
        <p>Pick a generic engine to open. Search narrows the list. Layout chips apply inside the category.</p>
        {unknown && <p role="status">That engine is not in the catalog.</p>}
      </div>
      <div className="engine-picker-tools">
        <label className="engine-search">
          <span className="visually-hidden">Search engines</span>
          <input
            type="search"
            placeholder="Search engines"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <div className="chip-row" role="group" aria-label="Category">
          {categories.map((id) => (
            <button
              key={id}
              type="button"
              className="chip"
              aria-pressed={category === id}
              onClick={() => {
                setCategory(id)
                setLayout(null)
              }}
            >
              {CATEGORY_LABELS[id as CategoryId] ?? id}
            </button>
          ))}
        </div>
        <div className="chip-row" role="group" aria-label="Layout">
          <button type="button" className="chip" aria-pressed={layout === null} onClick={() => setLayout(null)}>
            All layouts
          </button>
          {layouts.map((id) => (
            <button key={id} type="button" className="chip" aria-pressed={layout === id} onClick={() => setLayout(id)}>
              {layoutLabel(id)}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="engine-empty">No engines match.</p>
      ) : (
        <ul className="engine-grid">
          {visible.map((engine) => {
            const cylinders = engine.cylinders
            return (
              <li key={engine.id}>
                <button type="button" className="engine-card" onClick={() => onSelect(engine.id)}>
                  <EngineMark layout={engine.layout} cylinders={cylinders} />
                  <span className="engine-badge">{layoutLabel(engine.layout)}</span>
                  <strong>
                    {engine.brand} {engine.model}
                  </strong>
                  <span>
                    {formatDisplacement(engine.displacementCc)} · {cylinders} cylinders
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function EngineMark({ layout, cylinders }: { layout: string; cylinders: number }) {
  if (layout === 'inline-4') {
    return (
      <svg className="engine-mark" viewBox="0 0 120 72" aria-hidden="true">
        <rect x="10" y="42" width="100" height="16" rx="4" fill="#2a3338" />
        {Array.from({ length: cylinders }, (_, index) => (
          <circle key={index} cx={22 + index * 25} cy="30" r="8" fill="#c5c9ce" />
        ))}
      </svg>
    )
  }
  const tilt = layout === 'v8' ? 42 : 28
  const perBank = Math.max(1, Math.round(cylinders / 2))
  const span = Math.min(22, 70 / perBank)
  return (
    <svg className="engine-mark" viewBox="0 0 120 80" aria-hidden="true">
      <g transform={`rotate(${-tilt} 60 64)`}>
        {Array.from({ length: perBank }, (_, index) => (
          <circle key={index} cx={36 + index * span} cy="36" r="7" fill="#c5c9ce" />
        ))}
      </g>
      <g transform={`rotate(${tilt} 60 64)`}>
        {Array.from({ length: perBank }, (_, index) => (
          <circle key={index} cx={36 + index * span} cy="36" r="7" fill="#d4843c" />
        ))}
      </g>
    </svg>
  )
}
