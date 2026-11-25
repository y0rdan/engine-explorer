import { beltLoop, type CylinderMotion, type MotionLayout } from './layout.ts'
import type { EngineRecord, ParamValue, Vec3 } from './schema.ts'

const TWO_PI = Math.PI * 2
export const VEE_CRANK_Y = 0.035 + 0.058 + 0.075

export const V6_FIRING_ORDER = [1, 2, 3, 4, 5, 6] as const
export const V8_FIRING_ORDER = [1, 8, 4, 3, 6, 5, 7, 2] as const

export type VeeCylinder = CylinderMotion & {
  number: number
  station: number
  bank: 'left' | 'right'
  zSign: -1 | 1
}

export type VeeBank = {
  id: 'left' | 'right'
  beta: number
  axis: Vec3
  zSign: -1 | 1
  cylinders: VeeCylinder[]
  casting: { center: Vec3; size: Vec3 }
  head: { center: Vec3; size: Vec3 }
  cover: { center: Vec3; size: Vec3 }
  intakeLocalZ: number
  exhaustLocalZ: number
  camLocalY: number
  camLocalZ: number
}

export type VeeLayout = Omit<MotionLayout, 'cylinders'> & {
  bankAngleDeg: number
  bore: number
  stroke: number
  dohc: boolean
  wristToCrown: number
  deck: number
  block: { center: Vec3; size: Vec3 }
  pan: { center: Vec3; size: Vec3 }
  banks: VeeBank[]
  cylinders: VeeCylinder[]
  timingLoops: Vec3[][]
  beltPoints: Vec3[]
  frontX: number
  crankNose: Vec3
  idler: Vec3
  plenum: { center: Vec3; size: Vec3 }
  boreSpacing: number
  intakeSign: number
}

export type VeePlanInput = {
  bankAngleDeg: number
  cylindersPerBank: number
  boreSpacing: number
  firingOrder: readonly number[]
}

export function wrapAngle(angle: number): number {
  const wrapped = angle % TWO_PI
  return wrapped < 0 ? wrapped + TWO_PI : wrapped
}

export function angDiff(a: number, b: number): number {
  const delta = Math.abs(wrapAngle(a) - wrapAngle(b))
  return Math.min(delta, TWO_PI - delta)
}

export function fireAngles(order: readonly number[]): number[] {
  const step = (Math.PI * 4) / order.length
  const angles = new Array<number>(order.length).fill(0)
  order.forEach((cylinder, index) => {
    angles[cylinder - 1] = index * step
  })
  return angles
}

export function boreAxisFor(beta: number): Vec3 {
  return [0, Math.cos(beta), Math.sin(beta)]
}

type Draft = {
  number: number
  station: number
  beta: number
  phase: number
  fireAngle: number
}

function stationsOf<T extends { station: number }>(cylinders: readonly T[]): T[][] {
  const map = new Map<number, T[]>()
  for (const cylinder of cylinders) {
    const group = map.get(cylinder.station) ?? []
    group.push(cylinder)
    map.set(cylinder.station, group)
  }
  return [...map.entries()].sort((a, b) => a[0] - b[0]).map((entry) => entry[1])
}

function pinPattern(drafts: readonly Draft[], bankAngle: number): 'shared' | 'split' | 'other' {
  const diffs = stationsOf(drafts).map((pair) => angDiff(pair[0]?.phase ?? 0, pair[1]?.phase ?? 0))
  if (diffs.every((diff) => diff < 1e-4)) return 'shared'
  if (diffs.every((diff) => Math.abs(diff - bankAngle) < 1e-3)) return 'split'
  return 'other'
}

function draftPlan(oddBeta: number, fires: readonly number[], perBank: number): Draft[] {
  const drafts: Draft[] = []
  for (let number = 1; number <= perBank * 2; number += 1) {
    const odd = number % 2 === 1
    const beta = odd ? oddBeta : -oddBeta
    const station = odd ? (number - 1) / 2 : number / 2 - 1
    drafts.push({
      number,
      station,
      beta,
      phase: wrapAngle(beta - (fires[number - 1] ?? 0)),
      fireAngle: fires[number - 1] ?? 0,
    })
  }
  return drafts
}

// Odd-numbered cylinders sit on whichever side makes the crank real:
// a 60° V6 gets split pins 60° apart, a 90° V8 gets one shared pin per throw.
export function planVee(input: VeePlanInput): VeeCylinder[] {
  const count = input.cylindersPerBank * 2
  if (input.firingOrder.length !== count) {
    throw new Error(`firing order lists ${input.firingOrder.length} cylinders, expected ${count}`)
  }
  const seen = new Set(input.firingOrder)
  if (seen.size !== count) throw new Error('firing order repeats a cylinder')
  for (const cylinder of input.firingOrder) {
    if (cylinder < 1 || cylinder > count) throw new Error('firing order points past the cylinder count')
  }
  const bankAngle = (input.bankAngleDeg * Math.PI) / 180
  const half = bankAngle / 2
  const fires = fireAngles(input.firingOrder)
  const interval = (Math.PI * 4) / count
  const preferShared = Math.abs(bankAngle - interval) < 0.15
  let chosen: Draft[] | null = null
  for (const oddBeta of [half, -half]) {
    const drafts = draftPlan(oddBeta, fires, input.cylindersPerBank)
    const pattern = pinPattern(drafts, bankAngle)
    if (preferShared && pattern === 'shared') {
      chosen = drafts
      break
    }
    if (!preferShared && pattern === 'split') {
      chosen = drafts
      break
    }
  }
  if (!chosen) throw new Error(`no ${input.bankAngleDeg}° crank matches this firing order`)
  const mid = (input.cylindersPerBank - 1) / 2
  return chosen.map((draft) => {
    const x = (draft.station - mid) * input.boreSpacing
    const zSign: -1 | 1 = draft.beta >= 0 ? 1 : -1
    return {
      index: draft.number - 1,
      number: draft.number,
      station: draft.station,
      x,
      phase: draft.phase,
      fireAngle: draft.fireAngle,
      beta: draft.beta,
      boreAxis: boreAxisFor(draft.beta),
      journalX: x,
      bank: zSign < 0 ? 'left' : 'right',
      zSign,
    }
  })
}

export function throwCenters(cylinders: readonly VeeCylinder[]): number[] {
  return stationsOf(cylinders).map((pair) => {
    const a = pair[0]?.phase ?? 0
    const b = pair[1]?.phase ?? 0
    return Math.atan2(Math.sin(a) + Math.sin(b), Math.cos(a) + Math.cos(b))
  })
}

function numberParam(params: Record<string, ParamValue>, key: string): number {
  const value = params[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`procedural params.${key} must be a number`)
  }
  return value
}

function booleanParam(params: Record<string, ParamValue>, key: string): boolean {
  const value = params[key]
  if (typeof value !== 'boolean') throw new Error(`procedural params.${key} must be a boolean`)
  return value
}

function firingOrderParam(params: Record<string, ParamValue>): number[] {
  const value = params.firingOrder
  if (typeof value !== 'string') throw new Error('procedural params.firingOrder must be a string')
  const order = value.split('-').map((part) => Number(part))
  if (order.some((cylinder) => !Number.isInteger(cylinder))) {
    throw new Error('procedural params.firingOrder must look like 1-2-3-4-5-6')
  }
  return order
}

export function bankFrame(beta: number, along: number, across: number, x = 0, crankY = 0): Vec3 {
  const axis = boreAxisFor(beta)
  return [
    x,
    crankY + axis[1] * along - axis[2] * across,
    axis[2] * along + axis[1] * across,
  ]
}

export function layoutVee(engine: EngineRecord): VeeLayout {
  if (engine.source.kind !== 'procedural') throw new Error(`${engine.id} is not a procedural engine`)
  const params = engine.source.params
  const bankAngleDeg = numberParam(params, 'bankAngleDeg')
  const bore = numberParam(params, 'bore')
  const stroke = numberParam(params, 'stroke')
  const cylindersPerBank = numberParam(params, 'cylindersPerBank')
  const banks = numberParam(params, 'banks')
  const dohc = booleanParam(params, 'dohc')
  if (banks !== 2) throw new Error('the V template expects 2 banks')
  if (!Number.isInteger(cylindersPerBank) || cylindersPerBank < 2) {
    throw new Error('cylindersPerBank must be an integer of at least 2')
  }
  const { boreSpacing, block, intakeSide, accessories } = engine.parameters
  const cylinders = planVee({
    bankAngleDeg,
    cylindersPerBank,
    boreSpacing,
    firingOrder: firingOrderParam(params),
  })
  const crankRadius = stroke / 2
  const wristToCrown = 0.028
  const rodLength = Math.max(crankRadius * 3.25, 0.13)
  const deck = rodLength + crankRadius + wristToCrown + 0.016
  const lift = 0.035
  const panHeight = 0.058
  const crankY = VEE_CRANK_Y
  const crankCenter: Vec3 = [0, crankY, 0]
  const length = block.length
  const width = block.width
  const frontX = -length / 2 - 0.07
  const intakeSign = intakeSide === 'right' ? 1 : -1
  const headLen = 0.082
  const coverLen = 0.046
  const inner = 0.05
  const headGap = 0.006
  const bankIds = ['left', 'right'] as const
  const veeBanks: VeeBank[] = bankIds.map((id) => {
    const sample = cylinders.find((cylinder) => cylinder.bank === id)
    if (!sample) throw new Error(`the ${id} bank has no cylinders`)
    const beta = sample.beta
    const axis = boreAxisFor(beta)
    const castMid = (inner + deck) / 2
    const headMid = deck + headGap + headLen / 2
    const coverMid = headMid + headLen / 2 + 0.008 + coverLen / 2
    const intakeLocalZ = sample.zSign < 0 ? 0.028 : -0.028
    const castingCenter = bankFrame(beta, castMid, 0, 0, crankY)
    const headCenter = bankFrame(beta, headMid, 0, 0, crankY)
    const coverCenter = bankFrame(beta, coverMid, 0, 0, crankY)
    return {
      id,
      beta,
      axis,
      zSign: sample.zSign,
      cylinders: cylinders.filter((cylinder) => cylinder.bank === id),
      casting: {
        center: castingCenter,
        size: [length * 0.94, deck - inner, Math.min(0.12, width * 0.48)],
      },
      head: {
        center: headCenter,
        size: [length * 0.9, headLen, Math.min(0.14, width * 0.55)],
      },
      cover: {
        center: coverCenter,
        size: [length * 0.82, coverLen, Math.min(0.12, width * 0.5)],
      },
      intakeLocalZ,
      exhaustLocalZ: -intakeLocalZ,
      camLocalY: headMid,
      camLocalZ: intakeLocalZ * 0.7,
    }
  })
  const defaults: Record<string, Vec3> = {
    'water-pump': [frontX + 0.02, crankY + 0.02, 0],
    alternator: [frontX + 0.01, crankY + 0.14, intakeSign * 0.16],
    radiator: [frontX - 0.2, crankY + 0.05, 0],
    battery: [0.02, lift + 0.12, intakeSign * (width * 0.5 + 0.2)],
    'air-filter': [0.08, crankY + 0.2, intakeSign * (width * 0.5 + 0.14)],
    starter: [length / 2 - 0.08, crankY - 0.04, -intakeSign * 0.12],
    'oil-filter': [length * 0.12, lift + 0.11, -intakeSign * (width / 2 + 0.04)],
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
  const crankSprocket: Vec3 = [frontX + 0.02, crankY, 0]
  const timingLoops = veeBanks.map((bank) => {
    const intakeCam = bankFrame(bank.beta, bank.camLocalY, bank.camLocalZ, frontX + 0.028, crankY)
    const exhaustCam = bankFrame(bank.beta, bank.camLocalY, bank.exhaustLocalZ * 0.7, frontX + 0.028, crankY)
    return beltLoop([
      { c: crankSprocket, r: 0.022 },
      { c: intakeCam, r: 0.028 },
      { c: exhaustCam, r: 0.028 },
    ])
  })
  const plenumY = crankY + 0.15
  return {
    bankAngleDeg,
    bore,
    stroke,
    dohc,
    wristToCrown,
    deck,
    crankCenter,
    crankRadius,
    rodLength,
    cylinders,
    anchors,
    block: {
      center: [0, crankY - 0.01, 0],
      size: [length, block.height * 0.72, width],
    },
    pan: {
      center: [0, lift + panHeight / 2, 0],
      size: [length * 0.86, panHeight, width * 0.92],
    },
    banks: veeBanks,
    timingLoops,
    beltPoints,
    frontX,
    crankNose,
    idler,
    plenum: {
      center: [0, plenumY, 0],
      size: [length * 0.52, 0.08, Math.max(0.12, width * 0.5)],
    },
    boreSpacing,
    intakeSign,
  }
}
