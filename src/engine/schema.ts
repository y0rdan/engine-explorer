export const LAYOUTS = ['inline-4'] as const
export type LayoutId = (typeof LAYOUTS)[number]

export const SYSTEMS = [
  'engine',
  'cooling',
  'electrical',
  'fuel-air',
  'ignition',
  'exhaust',
  'drivetrain',
  'brakes',
  'suspension',
  'wheels',
] as const
export type SystemId = (typeof SYSTEMS)[number]

export const SYSTEM_LABELS: Record<SystemId, string> = {
  engine: 'Engine',
  cooling: 'Cooling',
  electrical: 'Electrical',
  'fuel-air': 'Fuel/Air',
  ignition: 'Ignition',
  exhaust: 'Exhaust',
  drivetrain: 'Drivetrain',
  brakes: 'Brakes',
  suspension: 'Suspension',
  wheels: 'Wheels',
}

export const SYSTEM_ORDER: readonly SystemId[] = SYSTEMS

export type Vec3 = [number, number, number]

export type KeyNumber = {
  label: string
  value: string
  unit?: string
}

export type EngineLayer = {
  id: string
  name: string
  description: string
  explodeOffset: Vec3
  assemblyOrder: number
  assemblyLabel: string
}

export type EnginePart = {
  id: string
  displayName: string
  category: string
  system: SystemId
  summary: string
  description: string
  whatItDoes: string
  howItWorks: string[]
  howItMoves?: string
  whereItLives: string
  keyNumbers: KeyNumber[]
  warningSigns: string[]
  difficulty: 1 | 2 | 3 | 4 | 5
  estimatedTime: string
  tools: string[]
  steps: string[]
  maintenance: string[]
  safetyNote?: string
  funFact?: string
  explodeOffset: Vec3
  assemblyOrder: number
  assemblyLabel: string
  layers: EngineLayer[]
}

export type EngineSide = 'left' | 'right'

export type EngineParameters = {
  boreSpacing: number
  block: { length: number; width: number; height: number }
  intakeSide: EngineSide
  exhaustSide: EngineSide
  accessories: Record<string, Vec3>
}

export type YearRange = { start: number; end: number | null }

export type EngineRecord = {
  id: string
  brand: string
  model: string
  engineCode: string
  yearRange: YearRange
  layout: LayoutId
  displacementCc: number
  parameters: EngineParameters
  parts: EnginePart[]
}

const engineFields = new Set([
  'id',
  'brand',
  'model',
  'engineCode',
  'yearRange',
  'layout',
  'displacementCc',
  'parameters',
  'parts',
])

const partFields = new Set([
  'id',
  'displayName',
  'category',
  'system',
  'summary',
  'description',
  'whatItDoes',
  'howItWorks',
  'howItMoves',
  'whereItLives',
  'keyNumbers',
  'warningSigns',
  'difficulty',
  'estimatedTime',
  'tools',
  'steps',
  'maintenance',
  'safetyNote',
  'funFact',
  'explodeOffset',
  'assemblyOrder',
  'assemblyLabel',
  'layers',
])

const layerFields = new Set([
  'id',
  'name',
  'description',
  'explodeOffset',
  'assemblyOrder',
  'assemblyLabel',
])

const parameterFields = new Set(['boreSpacing', 'block', 'intakeSide', 'exhaustSide', 'accessories'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function fail(message: string): never {
  throw new Error(message)
}

function rejectUnknown(entry: Record<string, unknown>, allowed: Set<string>, label: string): void {
  for (const key of Object.keys(entry)) {
    if (!allowed.has(key)) fail(`${label} has unknown field ${key}`)
  }
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} must be a non-empty string`)
  return value.trim()
}

function textList(value: unknown, label: string, min: number): string[] {
  if (!Array.isArray(value) || value.length < min) {
    fail(`${label} must list at least ${min} item${min === 1 ? '' : 's'}`)
  }
  return value.map((item, index) => text(item, `${label}[${index}]`))
}

function vec3(value: unknown, label: string): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) fail(`${label} must be [x, y, z]`)
  const nums = value.map((item, index) => {
    if (typeof item !== 'number' || !Number.isFinite(item)) fail(`${label}[${index}] must be a finite number`)
    if (item < -2 || item > 2) fail(`${label}[${index}] must stay within 2 meters`)
    return item
  })
  return [nums[0], nums[1], nums[2]]
}

function integer(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    fail(`${label} must be an integer from ${min} to ${max}`)
  }
  return value
}

function parseLayer(value: unknown, label: string, ids: Set<string>, orders: Set<number>): EngineLayer {
  if (!isRecord(value)) fail(`${label} must be an object`)
  rejectUnknown(value, layerFields, label)
  const id = text(value.id, `${label}.id`)
  if (ids.has(id)) fail(`${label} duplicates layer id ${id}`)
  ids.add(id)
  const assemblyOrder = integer(value.assemblyOrder, `${label}.assemblyOrder`, 0, 999)
  if (orders.has(assemblyOrder)) fail(`${label} duplicates assemblyOrder ${assemblyOrder}`)
  orders.add(assemblyOrder)
  return {
    id,
    name: text(value.name, `${label}.name`),
    description: text(value.description, `${label}.description`),
    explodeOffset: vec3(value.explodeOffset, `${label}.explodeOffset`),
    assemblyOrder,
    assemblyLabel: text(value.assemblyLabel, `${label}.assemblyLabel`),
  }
}

function parsePart(value: unknown, index: number, ids: Set<string>, orders: Set<number>): EnginePart {
  const label = `parts[${index}]`
  if (!isRecord(value)) fail(`${label} must be an object`)
  rejectUnknown(value, partFields, label)
  const id = text(value.id, `${label}.id`)
  if (ids.has(id)) fail(`duplicate part id ${id}`)
  ids.add(id)
  const system = text(value.system, `${label}.system`)
  if (!SYSTEMS.includes(system as SystemId)) fail(`${label}.system is not a known system`)
  const difficulty = integer(value.difficulty, `${label}.difficulty`, 1, 5) as EnginePart['difficulty']
  const assemblyOrder = integer(value.assemblyOrder, `${label}.assemblyOrder`, 0, 999)
  if (orders.has(assemblyOrder)) fail(`${label} duplicates assemblyOrder ${assemblyOrder}`)
  orders.add(assemblyOrder)
  if (!Array.isArray(value.layers) || value.layers.length < 2 || value.layers.length > 4) {
    fail(`${label}.layers must list 2 to 4 layers`)
  }
  const layerIds = new Set<string>()
  const layerOrders = new Set<number>()
  const layers = value.layers.map((layer, layerIndex) =>
    parseLayer(layer, `${label}.layers[${layerIndex}]`, layerIds, layerOrders),
  )
  const howItMoves = value.howItMoves === undefined ? undefined : text(value.howItMoves, `${label}.howItMoves`)
  const safetyNote = value.safetyNote === undefined ? undefined : text(value.safetyNote, `${label}.safetyNote`)
  const funFact = value.funFact === undefined ? undefined : text(value.funFact, `${label}.funFact`)
  const keyNumbers = parseKeyNumbers(value.keyNumbers, `${label}.keyNumbers`)
  return {
    id,
    displayName: text(value.displayName, `${label}.displayName`),
    category: text(value.category, `${label}.category`),
    system: system as SystemId,
    summary: text(value.summary, `${label}.summary`),
    description: text(value.description, `${label}.description`),
    whatItDoes: text(value.whatItDoes, `${label}.whatItDoes`),
    howItWorks: textList(value.howItWorks, `${label}.howItWorks`, 2),
    howItMoves,
    whereItLives: text(value.whereItLives, `${label}.whereItLives`),
    keyNumbers,
    warningSigns: textList(value.warningSigns, `${label}.warningSigns`, 2),
    difficulty,
    estimatedTime: text(value.estimatedTime, `${label}.estimatedTime`),
    tools: textList(value.tools, `${label}.tools`, 1),
    steps: textList(value.steps, `${label}.steps`, 2),
    maintenance: textList(value.maintenance, `${label}.maintenance`, 2),
    safetyNote,
    funFact,
    explodeOffset: vec3(value.explodeOffset, `${label}.explodeOffset`),
    assemblyOrder,
    assemblyLabel: text(value.assemblyLabel, `${label}.assemblyLabel`),
    layers,
  }
}

function parseKeyNumbers(value: unknown, label: string): KeyNumber[] {
  if (!Array.isArray(value) || value.length < 1) fail(`${label} must list at least 1 key number`)
  return value.map((item, index) => {
    const itemLabel = `${label}[${index}]`
    if (!isRecord(item)) fail(`${itemLabel} must be an object`)
    const allowed = new Set(['label', 'value', 'unit'])
    rejectUnknown(item, allowed, itemLabel)
    const unit = item.unit === undefined ? undefined : text(item.unit, `${itemLabel}.unit`)
    return {
      label: text(item.label, `${itemLabel}.label`),
      value: text(item.value, `${itemLabel}.value`),
      unit,
    }
  })
}

function parseParameters(value: unknown, partIds: Set<string>): EngineParameters {
  if (!isRecord(value)) fail('parameters must be an object')
  rejectUnknown(value, parameterFields, 'parameters')
  const boreSpacing = value.boreSpacing
  if (typeof boreSpacing !== 'number' || !Number.isFinite(boreSpacing) || boreSpacing < 0.07 || boreSpacing > 0.14) {
    fail('parameters.boreSpacing must be a meter value from 0.07 to 0.14')
  }
  if (!isRecord(value.block)) fail('parameters.block must be an object')
  rejectUnknown(value.block, new Set(['length', 'width', 'height']), 'parameters.block')
  const block = {
    length: metric(value.block.length, 'parameters.block.length', 0.3, 0.8),
    width: metric(value.block.width, 'parameters.block.width', 0.12, 0.4),
    height: metric(value.block.height, 'parameters.block.height', 0.18, 0.45),
  }
  if (block.length < boreSpacing * 3.4) {
    fail('parameters.block.length is too short for four bores at this spacing')
  }
  const intakeSide = side(value.intakeSide, 'parameters.intakeSide')
  const exhaustSide = side(value.exhaustSide, 'parameters.exhaustSide')
  if (intakeSide === exhaustSide) fail('intake and exhaust must sit on opposite sides')
  const accessories: Record<string, Vec3> = {}
  if (value.accessories !== undefined) {
    if (!isRecord(value.accessories)) fail('parameters.accessories must be an object')
    for (const [id, position] of Object.entries(value.accessories)) {
      if (!partIds.has(id)) fail(`parameters.accessories.${id} is not a part id`)
      accessories[id] = vec3(position, `parameters.accessories.${id}`)
    }
  }
  return { boreSpacing, block, intakeSide, exhaustSide, accessories }
}

function metric(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    fail(`${label} must be a number from ${min} to ${max}`)
  }
  return value
}

function side(value: unknown, label: string): EngineSide {
  if (value !== 'left' && value !== 'right') fail(`${label} must be "left" or "right"`)
  return value
}

export function parseEngine(value: unknown): EngineRecord {
  if (!isRecord(value)) fail('engine must be an object')
  rejectUnknown(value, engineFields, 'engine')
  if (!isRecord(value.yearRange)) fail('yearRange must be an object')
  rejectUnknown(value.yearRange, new Set(['start', 'end']), 'yearRange')
  const start = integer(value.yearRange.start, 'yearRange.start', 1950, 2035)
  const end =
    value.yearRange.end === null ? null : integer(value.yearRange.end, 'yearRange.end', start, 2035)
  const layout = text(value.layout, 'layout')
  if (!LAYOUTS.includes(layout as LayoutId)) fail(`layout must be one of ${LAYOUTS.join(', ')}`)
  if (!Array.isArray(value.parts) || value.parts.length === 0) fail('parts must be a non-empty array')
  const ids = new Set<string>()
  const orders = new Set<number>()
  const parts = value.parts.map((part, index) => parsePart(part, index, ids, orders))
  return {
    id: text(value.id, 'id'),
    brand: text(value.brand, 'brand'),
    model: text(value.model, 'model'),
    engineCode: text(value.engineCode, 'engineCode'),
    yearRange: { start, end },
    layout: layout as LayoutId,
    displacementCc: integer(value.displacementCc, 'displacementCc', 500, 10000),
    parameters: parseParameters(value.parameters, ids),
    parts,
  }
}

export function formatDisplacement(cc: number): string {
  const liters = cc / 1000
  return `${liters >= 10 ? liters.toFixed(0) : liters.toFixed(1)} L`
}

export function formatYears(range: YearRange): string {
  return range.end === null ? `${range.start}–present` : `${range.start}–${range.end}`
}

export function partById(engine: EngineRecord, id: string | null): EnginePart | null {
  if (id === null) return null
  return engine.parts.find((part) => part.id === id) ?? null
}

export function partsBySystem(parts: readonly EnginePart[]): { system: SystemId; label: string; parts: EnginePart[] }[] {
  const groups = []
  for (const system of SYSTEM_ORDER) {
    const items = parts
      .filter((part) => part.system === system)
      .slice()
      .sort((a, b) => a.assemblyOrder - b.assemblyOrder)
    if (items.length > 0) groups.push({ system, label: SYSTEM_LABELS[system], parts: items })
  }
  return groups
}
