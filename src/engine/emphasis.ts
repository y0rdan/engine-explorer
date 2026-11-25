export type Emphasis = 'hidden' | 'dim' | 'idle' | 'hover' | 'hot' | 'layer'

export function emphasisFor(input: {
  partId: string
  layerId: string | null
  selectedPartId: string | null
  selectedLayerId: string | null
  hoveredPartId: string | null
  isolated: boolean
  assemblyPartId: string | null
}): Emphasis {
  const selected = input.selectedPartId
  if (input.isolated && selected && input.partId !== selected) return 'hidden'
  if (selected === input.partId && input.selectedLayerId && input.layerId === input.selectedLayerId) return 'layer'
  if (selected === input.partId && !input.selectedLayerId) return 'hot'
  if (selected === input.partId) return 'idle'
  if (!selected && input.assemblyPartId === input.partId) return 'hot'
  if (!selected && input.hoveredPartId === input.partId) return 'hover'
  if (selected && selected !== input.partId) return 'dim'
  return 'idle'
}
