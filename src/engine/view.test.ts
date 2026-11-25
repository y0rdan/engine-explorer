import { describe, expect, it } from 'vitest'
import { createView, viewReducer } from './view.ts'

describe('view reducer', () => {
  it('selects a part, a layer, and returns to the full view', () => {
    const selected = viewReducer(createView(), { type: 'select-part', id: 'alternator' })
    expect(selected.partId).toBe('alternator')
    const layer = viewReducer(selected, { type: 'select-layer', partId: 'alternator', layerId: 'rotor' })
    expect(layer.layerId).toBe('rotor')
    const cleared = viewReducer(layer, { type: 'clear' })
    expect(cleared.partId).toBeNull()
    expect(cleared.layerId).toBeNull()
    expect(cleared.isolated).toBe(false)
  })

  it('toggles isolate only when a part is selected', () => {
    expect(viewReducer(createView(), { type: 'isolate' }).isolated).toBe(false)
    const alone = viewReducer(createView('battery'), { type: 'isolate' })
    expect(alone.isolated).toBe(true)
    expect(viewReducer(alone, { type: 'isolate' }).isolated).toBe(false)
  })
})
