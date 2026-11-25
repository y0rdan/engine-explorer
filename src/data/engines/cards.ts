export type EngineCard = {
  id: string
  brand: string
  model: string
  engineCode: string
  layout: string
  category: string
  displacementCc: number
  cylinders: number
}

// Light list for the picker. Full part data loads with the engine that is opened.
export const engineCards: readonly EngineCard[] = [
  {
    id: 'generic-inline-4',
    brand: 'Generic',
    model: 'Inline-4',
    engineCode: 'G4',
    layout: 'inline-4',
    category: 'engine',
    displacementCc: 1998,
    cylinders: 4,
  },
  {
    id: 'generic-v6',
    brand: 'Generic',
    model: 'V6',
    engineCode: 'GV6',
    layout: 'v6',
    category: 'engine',
    displacementCc: 3498,
    cylinders: 6,
  },
  {
    id: 'generic-v8',
    brand: 'Generic',
    model: 'V8',
    engineCode: 'GV8',
    layout: 'v8',
    category: 'engine',
    displacementCc: 4999,
    cylinders: 8,
  },
]

export function cardById(id: string): EngineCard | null {
  return engineCards.find((card) => card.id === id) ?? null
}

export function categoriesIn(list: readonly EngineCard[]): string[] {
  const seen: string[] = []
  for (const card of list) {
    if (!seen.includes(card.category)) seen.push(card.category)
  }
  return seen
}

export function layoutsIn(list: readonly EngineCard[], category: string | null): string[] {
  const seen: string[] = []
  for (const card of list) {
    if (category && card.category !== category) continue
    if (!seen.includes(card.layout)) seen.push(card.layout)
  }
  return seen
}

export function filterCards(
  list: readonly EngineCard[],
  input: { category: string | null; layout: string | null; text: string },
): EngineCard[] {
  const text = input.text.trim().toLowerCase()
  return list.filter((card) => {
    if (input.category && card.category !== input.category) return false
    if (input.layout && card.layout !== input.layout) return false
    if (!text) return true
    const haystack = `${card.brand} ${card.model} ${card.engineCode} ${card.layout} ${card.displacementCc}`.toLowerCase()
    return haystack.includes(text)
  })
}
