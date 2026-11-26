import { layoutFromEngine, type EngineLayout } from './layout.ts'
import type { EngineRecord } from './schema.ts'
import { layoutVee, type VeeLayout } from './veeLayout.ts'

// Known builders live here. An unknown layout id falls back to the inline
// layout so a file that parsed under a newer schema still loads.
const builders: Record<string, (engine: EngineRecord) => EngineLayout | VeeLayout> = {
  'inline-4': layoutFromEngine,
  v6: layoutVee,
  v8: layoutVee,
}

export function templateName(engine: EngineRecord): string {
  return engine.layout
}

export function layoutFor(engine: EngineRecord): EngineLayout | VeeLayout {
  const build = builders[engine.layout]
  if (!build) return layoutFromEngine(engine)
  return build(engine)
}
