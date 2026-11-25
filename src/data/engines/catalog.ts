import { parseEngine, type EngineRecord } from '../../engine/schema.ts'
import { genericInline4Data } from './generic-inline-4.ts'
import { genericV6Data } from './generic-v6.ts'
import { genericV8Data } from './generic-v8.ts'

export const genericInline4: EngineRecord = parseEngine(genericInline4Data)
export const genericV6: EngineRecord = parseEngine(genericV6Data)
export const genericV8: EngineRecord = parseEngine(genericV8Data)

export const engines: readonly EngineRecord[] = [genericInline4, genericV6, genericV8]

export const defaultEngine: EngineRecord = genericInline4

export function engineById(id: string): EngineRecord | null {
  return engines.find((engine) => engine.id === id) ?? null
}

export function categoriesIn(list: readonly EngineRecord[]): string[] {
  const seen: string[] = []
  for (const engine of list) {
    if (!seen.includes(engine.category)) seen.push(engine.category)
  }
  return seen
}

export function layoutsIn(list: readonly EngineRecord[], category: string | null): string[] {
  const seen: string[] = []
  for (const engine of list) {
    if (category && engine.category !== category) continue
    if (!seen.includes(engine.layout)) seen.push(engine.layout)
  }
  return seen
}

export function filterEngines(
  list: readonly EngineRecord[],
  input: { category: string | null; layout: string | null; text: string },
): EngineRecord[] {
  const text = input.text.trim().toLowerCase()
  return list.filter((engine) => {
    if (input.category && engine.category !== input.category) return false
    if (input.layout && engine.layout !== input.layout) return false
    if (!text) return true
    const specs = engine.specs.map((spec) => `${spec.label} ${spec.value} ${spec.unit ?? ''}`).join(' ')
    const haystack = `${engine.brand} ${engine.model} ${engine.engineCode} ${engine.layout} ${engine.displacementCc} ${specs}`.toLowerCase()
    return haystack.includes(text)
  })
}
