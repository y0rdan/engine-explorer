import { layoutFromEngine, type MotionLayout } from './layout.ts'
import type { EngineRecord } from './schema.ts'
import { layoutVee } from './veeLayout.ts'

// template is an open string. Known builders live here; an unknown name
// falls back to the inline layout so a future file still loads.
const builders: Record<string, (engine: EngineRecord) => MotionLayout> = {
  'inline-4': layoutFromEngine,
  v6: layoutVee,
  v8: layoutVee,
}

export function templateName(engine: EngineRecord): string {
  return engine.source.kind === 'procedural' ? engine.source.template : ''
}

export function layoutFor(engine: EngineRecord): MotionLayout {
  const build = builders[templateName(engine)]
  if (!build) return layoutFromEngine(engine)
  return build(engine)
}
