import { useMemo, useState } from 'react'
import { partsBySystem, type EnginePart, type SystemId } from '../engine/schema.ts'

export function PartsSidebar({
  parts,
  selectedId,
  onSelect,
  idPrefix,
}: {
  parts: readonly EnginePart[]
  selectedId: string | null
  onSelect: (id: string) => void
  idPrefix: string
}) {
  const groups = useMemo(() => partsBySystem(parts), [parts])
  const flat = useMemo(() => groups.flatMap((group) => group.parts), [groups])
  const selectedIndex = Math.max(0, flat.findIndex((part) => part.id === selectedId))
  const [cursor, setCursor] = useState(selectedIndex)
  const [trackedSelection, setTrackedSelection] = useState(selectedId)
  if (selectedId !== trackedSelection) {
    setTrackedSelection(selectedId)
    if (selectedIndex >= 0) setCursor(selectedIndex)
  }

  function move(next: number) {
    const index = Math.min(flat.length - 1, Math.max(0, next))
    setCursor(index)
    document.getElementById(`${idPrefix}-${flat[index]?.id}`)?.focus()
  }

  return (
    <div className="parts-list" role="listbox" aria-label="Engine parts" aria-activedescendant={`${idPrefix}-${flat[cursor]?.id ?? ''}`}>
      {groups.map((group) => (
        <section key={group.system} role="group" aria-label={group.label} className="parts-group">
          <h3 className={`system-label system-${group.system}`}>{group.label}</h3>
          <ul>
            {group.parts.map((part) => {
              const index = flat.findIndex((item) => item.id === part.id)
              const selected = part.id === selectedId
              return (
                <li key={part.id}>
                  <div
                    id={`${idPrefix}-${part.id}`}
                    role="option"
                    aria-selected={selected}
                    tabIndex={index === cursor ? 0 : -1}
                    className={selected ? 'part-option selected' : 'part-option'}
                    onClick={() => onSelect(part.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault()
                        move(index + 1)
                      } else if (event.key === 'ArrowUp') {
                        event.preventDefault()
                        move(index - 1)
                      } else if (event.key === 'Home') {
                        event.preventDefault()
                        move(0)
                      } else if (event.key === 'End') {
                        event.preventDefault()
                        move(flat.length - 1)
                      } else if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onSelect(part.id)
                      }
                    }}
                  >
                    <span className={`system-dot system-${group.system as SystemId}`} aria-hidden="true" />
                    {part.displayName}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
