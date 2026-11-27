import { useState } from 'react'
import type { EngineCard } from '../data/engines/cards.ts'
import { layoutLabel } from '../engine/schema.ts'
import './EngineSwitcher.css'

export function EngineSwitcher({
  engines,
  value,
  onChange,
}: {
  engines: readonly EngineCard[]
  value: string
  onChange: (id: string) => void
}) {
  const [announcement, setAnnouncement] = useState('')
  return (
    <div className="engine-switcher">
      <label>
        <span className="visually-hidden">Engine</span>
        <select
          value={value}
          onChange={(event) => {
            const next = engines.find((engine) => engine.id === event.target.value)
            setAnnouncement(next ? `${next.brand} ${next.model}` : '')
            onChange(event.target.value)
          }}
        >
          {engines.map((engine) => (
            <option key={engine.id} value={engine.id}>
              {layoutLabel(engine.layout)}
            </option>
          ))}
        </select>
      </label>
      <p className="visually-hidden" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}
