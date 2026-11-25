import type { EnginePart, EngineRecord, Vec3 } from './schema.ts'

export type PlacementMode = 'explode-engine' | 'explode-layers' | 'assemble-parts' | 'assemble-layers'

export type PlacementInput = {
  mode: PlacementMode
  explode: number
  assembly: number
  partId: string | null
}

export type Travels = {
  parts: Record<string, number>
  layers: Record<string, number>
}

export function placementMode(input: {
  assemblyMode: boolean
  isolated: boolean
  partId: string | null
}): PlacementMode {
  if (input.assemblyMode && input.isolated && input.partId) return 'assemble-layers'
  if (input.assemblyMode) return 'assemble-parts'
  if (input.partId) return 'explode-layers'
  return 'explode-engine'
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function smooth(value: number): number {
  const t = clamp01(value)
  return t * t * (3 - 2 * t)
}

// Linear slider position, with a gentle lead so later-installed parts leave first.
export function explodeWeight(t: number, order: number, orders: readonly number[]): number {
  const clamped = clamp01(t)
  if (clamped <= 0) return 0
  if (clamped >= 1) return 1
  const unique = [...new Set(orders)].sort((a, b) => a - b)
  const index = Math.max(0, unique.indexOf(order))
  const fromEnd = unique.length - 1 - index
  const span = Math.max(unique.length - 1, 1)
  const start = (fromEnd / span) * 0.42
  const end = Math.min(1, start + 0.58)
  if (clamped <= start) return 0
  if (clamped >= end) return 1
  return smooth((clamped - start) / (end - start))
}

export function seatAmount(progress: number, index: number, count: number): number {
  if (count <= 0) return 1
  const scaled = clamp01(progress) * count
  return smooth(scaled - index)
}

export function activeStepIndex(progress: number, count: number): number {
  if (count <= 0) return 0
  const scaled = clamp01(progress) * count
  if (scaled <= 0) return 0
  if (scaled >= count) return count - 1
  return Math.min(count - 1, Math.floor(scaled))
}

export type AssemblyDirection = 'install' | 'remove'

export type AssemblyStep = {
  partId: string
  layerId: string | null
  fastenerId: string | null
  label: string
  removeLabel: string | null
  order: number
}

export const HEAD_BOLT_ORDER = '8-4-1-5-9 / 7-3-2-6-10'

export function fastenerLabel(
  fastener: { count: number; size: string; name: string; id?: string; sequence?: readonly number[] },
  direction: AssemblyDirection,
): string {
  const verb = direction === 'remove' ? 'Remove' : 'Install'
  const base = `${verb} ${fastener.count} x ${fastener.size} ${fastener.name}`
  if (fastener.id !== 'head-bolts' || !fastener.sequence) return base
  const intake = fastener.sequence.slice(0, 5).join('-')
  const exhaust = fastener.sequence.slice(5).join('-')
  const order = `${intake} / ${exhaust}`
  return order === HEAD_BOLT_ORDER ? `${base}. Order ${HEAD_BOLT_ORDER}` : base
}

export function assemblySteps(engine: EngineRecord, partId: string | null, isolated: boolean): AssemblyStep[] {
  if (isolated && partId) {
    const part = engine.parts.find((item) => item.id === partId)
    if (!part) return []
    return part.layers
      .slice()
      .sort((a, b) => a.assemblyOrder - b.assemblyOrder)
      .map((layer) => ({
        partId: part.id,
        layerId: layer.id,
        fastenerId: null,
        label: layer.assemblyLabel,
        removeLabel: null,
        order: layer.assemblyOrder,
      }))
  }
  const steps: AssemblyStep[] = []
  for (const part of engine.parts.slice().sort((a, b) => a.assemblyOrder - b.assemblyOrder)) {
    steps.push({
      partId: part.id,
      layerId: null,
      fastenerId: null,
      label: part.assemblyLabel,
      removeLabel: null,
      order: part.assemblyOrder,
    })
    for (const fastener of part.fasteners) {
      steps.push({
        partId: part.id,
        layerId: null,
        fastenerId: fastener.id,
        label: fastenerLabel(fastener, 'install'),
        removeLabel: fastenerLabel(fastener, 'remove'),
        order: part.assemblyOrder,
      })
    }
  }
  return steps
}

export function travelsFor(engine: EngineRecord, input: PlacementInput): Travels {
  const parts: Record<string, number> = {}
  const layers: Record<string, number> = {}
  const partOrders = engine.parts.map((part) => part.assemblyOrder)
  const sorted = engine.parts.slice().sort((a, b) => a.assemblyOrder - b.assemblyOrder)
  const selected = engine.parts.find((part) => part.id === input.partId) ?? null

  for (const part of engine.parts) {
    parts[part.id] = 0
    for (const layer of part.layers) layers[`${part.id}:${layer.id}`] = 0
  }

  if (input.mode === 'explode-engine') {
    for (const part of engine.parts) {
      parts[part.id] = explodeWeight(input.explode, part.assemblyOrder, partOrders)
    }
    return { parts, layers }
  }

  if (input.mode === 'explode-layers' && selected) {
    const orders = selected.layers.map((layer) => layer.assemblyOrder)
    for (const layer of selected.layers) {
      layers[`${selected.id}:${layer.id}`] = explodeWeight(input.explode, layer.assemblyOrder, orders)
    }
    return { parts, layers }
  }

  if (input.mode === 'assemble-parts') {
    const steps = assemblySteps(engine, null, false)
    const partIndex = new Map<string, number>()
    steps.forEach((step, index) => {
      if (step.fastenerId === null && !partIndex.has(step.partId)) partIndex.set(step.partId, index)
    })
    for (const part of sorted) {
      const index = partIndex.get(part.id) ?? 0
      parts[part.id] = 1 - seatAmount(input.assembly, index, steps.length)
    }
    return { parts, layers }
  }

  if (input.mode === 'assemble-layers' && selected) {
    const ordered = selected.layers.slice().sort((a, b) => a.assemblyOrder - b.assemblyOrder)
    ordered.forEach((layer, index) => {
      layers[`${selected.id}:${layer.id}`] = 1 - seatAmount(input.assembly, index, ordered.length)
    })
  }

  return { parts, layers }
}

export function translate(offset: Vec3, travel: number): Vec3 {
  return [offset[0] * travel, offset[1] * travel, offset[2] * travel]
}

export function partWorldPosition(anchor: Vec3, offset: Vec3, travel: number): Vec3 {
  return [anchor[0] + offset[0] * travel, anchor[1] + offset[1] * travel, anchor[2] + offset[2] * travel]
}

export function focusPartId(steps: readonly AssemblyStep[], progress: number, selected: string | null): string | null {
  if (selected) return selected
  if (steps.length === 0) return null
  return steps[activeStepIndex(progress, steps.length)]?.partId ?? null
}

export function stepLabel(
  steps: readonly AssemblyStep[],
  progress: number,
  direction: AssemblyDirection = 'install',
): string {
  if (steps.length === 0) return ''
  const index = activeStepIndex(progress, steps.length)
  const step = steps[index]
  if (!step) return ''
  const text = direction === 'remove' && step.removeLabel ? step.removeLabel : step.label
  return `Step ${index + 1} of ${steps.length}: ${text}`
}

export function movingPartOrders(parts: readonly EnginePart[]): number[] {
  return parts.map((part) => part.assemblyOrder)
}
