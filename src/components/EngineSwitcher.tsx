import type { EngineRecord } from '../engine/schema.ts'
import { layoutLabel } from '../engine/schema.ts'
import './EngineSwitcher.css'

export function EngineSwitcher({
  engines,
  value,
  onChange,
}: {
  engines: readonly EngineRecord[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="engine-switcher" role="group" aria-label="Engine">
      {engines.map((engine) => {
        const selected = engine.id === value
        return (
          <button
            key={engine.id}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              if (!selected) onChange(engine.id)
            }}
          >
            {layoutLabel(engine.layout)}
          </button>
        )
      })}
    </div>
  )
}
