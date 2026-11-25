import { parseEngine, type EngineRecord } from '../../engine/schema.ts'
import { genericInline4Data } from './generic-inline-4.ts'

export const genericInline4: EngineRecord = parseEngine(genericInline4Data)

export const engines: readonly EngineRecord[] = [genericInline4]

export const defaultEngine: EngineRecord = genericInline4

export function engineById(id: string): EngineRecord | null {
  return engines.find((engine) => engine.id === id) ?? null
}
