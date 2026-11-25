import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
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
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState<Record<string, boolean>>({})
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return groups
    return groups
      .map((group) => ({
        ...group,
        parts: group.parts.filter((part) => part.displayName.toLowerCase().includes(needle)),
      }))
      .filter((group) => group.parts.length > 0)
  }, [groups, query])
  const flat = useMemo(() => filtered.flatMap((group) => group.parts), [filtered])
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
    <div className="parts-list">
      <label className="search">
        <span className="visually-hidden">Filter parts</span>
        <input
          type="search"
          value={query}
          placeholder="Filter parts"
          aria-label="Filter parts"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div>
        {filtered.map((group) => {
          const open = query.trim() !== '' || !closed[group.system] || group.parts.some((part) => part.id === selectedId)
          return (
            <section key={group.system} className="parts-group" role="group" aria-label={group.label}>
              <button
                type="button"
                className={`group-toggle system-${group.system}`}
                aria-expanded={open}
                onClick={() => setClosed((current) => ({ ...current, [group.system]: open }))}
              >
                <span className={`system-dot system-${group.system as SystemId}`} aria-hidden="true" />
                <span>{group.label}</span>
                <span className="count">{group.parts.length}</span>
                <ChevronDown size={16} aria-hidden="true" className={open ? 'chevron open' : 'chevron'} />
              </button>
              {open && (
                <div
                  role="listbox"
                  aria-label={`${group.label} parts`}
                  aria-activedescendant={
                    flat[cursor] && group.parts.some((part) => part.id === flat[cursor]?.id)
                      ? `${idPrefix}-${flat[cursor].id}`
                      : undefined
                  }
                >
                <ul role="presentation">
                  {group.parts.map((part) => {
                    const index = flat.findIndex((item) => item.id === part.id)
                    const selected = part.id === selectedId
                    return (
                      <li key={part.id} role="presentation">
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
                </div>
              )}
            </section>
          )
        })}
        {flat.length === 0 && <p className="empty-filter">No parts match that filter.</p>}
      </div>
    </div>
  )
}
