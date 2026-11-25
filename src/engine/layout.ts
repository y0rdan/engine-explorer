import type { EngineRecord, Vec3 } from './schema.ts'

export type { Vec3 }

export type BoxSize = {
  center: Vec3
  size: Vec3
}

export type EngineLayout = {
  boreSpacing: number
  bore: number
  crankRadius: number
  rodLength: number
  wristToCrown: number
  crankCenter: Vec3
  pistonX: number[]
  deckY: number
  intakeSign: number
  block: BoxSize
  head: BoxSize
  cover: BoxSize
  pan: BoxSize
  anchors: Record<string, Vec3>
  beltPoints: Vec3[]
  timingPoints: Vec3[]
  frontX: number
  crankNose: Vec3
  idler: Vec3
  camSprocket: Vec3
  crankSprocket: Vec3
}

const LIFT = 0.035

function beltLoop(pulleys: { c: Vec3; r: number }[]): Vec3[] {
  const cy = pulleys.reduce((sum, pulley) => sum + pulley.c[1], 0) / pulleys.length
  const cz = pulleys.reduce((sum, pulley) => sum + pulley.c[2], 0) / pulleys.length
  const ordered = pulleys
    .map((pulley) => ({ ...pulley, angle: Math.atan2(pulley.c[2] - cz, pulley.c[1] - cy) }))
    .sort((a, b) => a.angle - b.angle)
  const points: Vec3[] = []
  for (const pulley of ordered) {
    for (const shift of [0, 0.85, -0.85]) {
      const angle = pulley.angle + shift
      points.push([
        pulley.c[0],
        pulley.c[1] + Math.cos(angle) * pulley.r,
        pulley.c[2] + Math.sin(angle) * pulley.r,
      ])
    }
  }
  return points
}

export function layoutFromEngine(engine: EngineRecord): EngineLayout {
  const { boreSpacing, block, intakeSide, accessories } = engine.parameters
  const bore = Math.min(boreSpacing * 0.9, block.width * 0.72)
  const length = block.length
  const width = block.width
  const height = block.height
  const panHeight = 0.052
  const panCenterY = LIFT + panHeight / 2
  const deckY = LIFT + panHeight + height - 0.01
  const headHeight = 0.092
  const headCenterY = deckY + headHeight / 2 + 0.002
  const coverHeight = 0.05
  const coverCenterY = deckY + headHeight + coverHeight / 2 + 0.008
  const crankY = LIFT + panHeight + height * 0.24
  const crankRadius = Math.min(0.043, height * 0.16)
  const wristToCrown = 0.028
  const rodLength = deckY - 0.01 - wristToCrown - crankY - crankRadius
  const pistonX = [0, 1, 2, 3].map((index) => (index - 1.5) * boreSpacing)
  const intakeSign = intakeSide === 'right' ? 1 : -1
  const frontX = -length / 2 - 0.06
  const crankCenter: Vec3 = [0, crankY, 0]
  const defaults: Record<string, Vec3> = {
    'water-pump': [frontX + 0.02, crankY + 0.1, 0.02],
    alternator: [frontX + 0.01, crankY + 0.16, intakeSign * 0.14],
    radiator: [frontX - 0.34, crankY + 0.06, 0],
    battery: [0.08, LIFT + 0.12, intakeSign * (width / 2 + 0.28)],
    'air-filter': [0.02, coverCenterY + 0.1, intakeSign * (width / 2 + 0.18)],
    starter: [length / 2 - 0.06, crankY - 0.05, -intakeSign * 0.12],
    'oil-filter': [length * 0.12, LIFT + 0.1, -intakeSign * (width / 2 + 0.01)],
  }
  const anchors = { ...defaults }
  for (const [id, position] of Object.entries(accessories)) anchors[id] = position

  const crankNose: Vec3 = [frontX, crankY, 0]
  const pump = anchors['water-pump'] ?? defaults['water-pump']
  const alternator = anchors.alternator ?? defaults.alternator
  const idler: Vec3 = [
    (crankNose[0] + alternator[0]) / 2,
    (crankNose[1] + alternator[1]) / 2 + 0.02,
    (crankNose[2] + alternator[2]) / 2,
  ]
  const beltPoints = beltLoop([
    { c: crankNose, r: 0.058 },
    { c: pump, r: 0.04 },
    { c: idler, r: 0.022 },
    { c: alternator, r: 0.03 },
  ])
  const camSprocket: Vec3 = [frontX + 0.01, headCenterY - 0.02, 0]
  const crankSprocket: Vec3 = [frontX + 0.012, crankY, 0]
  const timingPoints = beltLoop([
    { c: camSprocket, r: 0.045 },
    { c: crankSprocket, r: 0.024 },
  ])

  return {
    boreSpacing,
    bore,
    crankRadius,
    rodLength,
    wristToCrown,
    crankCenter,
    pistonX,
    deckY,
    intakeSign,
    block: {
      center: [0, LIFT + panHeight + height / 2 - 0.01, 0],
      size: [length, height, width],
    },
    head: {
      center: [0, headCenterY, 0],
      size: [length - 0.04, headHeight, width - 0.02],
    },
    cover: {
      center: [0, coverCenterY, 0],
      size: [length - 0.07, coverHeight, width - 0.05],
    },
    pan: {
      center: [0, panCenterY, 0],
      size: [length - 0.06, panHeight, width - 0.04],
    },
    anchors,
    beltPoints,
    timingPoints,
    frontX,
    crankNose,
    idler,
    camSprocket,
    crankSprocket,
  }
}

export function crankPin(layout: EngineLayout, index: number, angle: number, phase: number): Vec3 {
  const phi = angle + phase
  return [
    layout.pistonX[index] ?? 0,
    layout.crankCenter[1] + Math.cos(phi) * layout.crankRadius,
    layout.crankCenter[2] + Math.sin(phi) * layout.crankRadius,
  ]
}

export function wristPin(layout: EngineLayout, index: number, wristHeight: number): Vec3 {
  return [layout.pistonX[index] ?? 0, layout.crankCenter[1] + wristHeight, layout.crankCenter[2]]
}
