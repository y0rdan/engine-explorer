import { parseEngine, type EngineRecord } from '../../engine/schema.ts'

export async function loadEngine(id: string): Promise<EngineRecord | null> {
  switch (id) {
    case 'generic-inline-4': {
      const module = await import('./generic-inline-4.ts')
      return parseEngine(module.genericInline4Data)
    }
    case 'generic-v6': {
      const module = await import('./generic-v6.ts')
      return parseEngine(module.genericV6Data)
    }
    case 'generic-v8': {
      const module = await import('./generic-v8.ts')
      return parseEngine(module.genericV8Data)
    }
    default:
      return null
  }
}
