import { useRef, type ReactNode } from 'react'
import { snapFromDrag, snapHeight, type Snap } from './sheetSnap.ts'

export function BottomSheet({
  snap,
  viewportHeight,
  onSnap,
  children,
}: {
  snap: Snap
  viewportHeight: number
  onSnap: (snap: Snap) => void
  children: ReactNode
}) {
  const startY = useRef<number | null>(null)
  const height = snapHeight(snap, viewportHeight)
  return (
    <section className="sheet" data-snap={snap} style={{ height }} aria-label="Part guide">
      <button
        type="button"
        className="sheet-handle"
        aria-label={`Part guide, ${snap}. Drag to resize.`}
        onPointerDown={(event) => {
          startY.current = event.clientY
        }}
        onPointerUp={(event) => {
          if (startY.current === null) return
          onSnap(snapFromDrag(snap, event.clientY - startY.current))
          startY.current = null
        }}
      >
        <span className="sheet-grip" aria-hidden="true" />
      </button>
      <div className="sheet-snaps">
        {(['peek', 'half', 'full'] as const).map((item) => (
          <button key={item} type="button" aria-pressed={snap === item} onClick={() => onSnap(item)}>
            {item === 'peek' ? 'Peek' : item === 'half' ? 'Half' : 'Full'}
          </button>
        ))}
      </div>
      <div className="sheet-body">{children}</div>
    </section>
  )
}
