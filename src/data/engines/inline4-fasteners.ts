import { layoutFromEngine, type EngineLayout, type Vec3 } from '../../engine/layout.ts'
import type { EngineRecord, FastenerGroup } from '../../engine/schema.ts'

type FastenerInput = Omit<FastenerGroup, 'anchors'> & { anchors?: string[] | null }

function unit(axis: Vec3): Vec3 {
  const length = Math.hypot(axis[0], axis[1], axis[2]) || 1
  return [axis[0] / length, axis[1] / length, axis[2] / length]
}

function numbered(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1)
}

function centerOut(points: Vec3[]): number[] {
  const cx = points.reduce((sum, point) => sum + point[0], 0) / points.length
  const cz = points.reduce((sum, point) => sum + point[2], 0) / points.length
  const ranked = points
    .map((point, index) => ({ index, dist: Math.hypot(point[0] - cx, point[2] - cz) }))
    .sort((a, b) => a.dist - b.dist || a.index - b.index)
  const sequence = Array.from({ length: points.length }, () => 0)
  ranked.forEach((item, order) => {
    sequence[item.index] = order + 1
  })
  return sequence
}

function fastener(spec: FastenerInput): FastenerGroup {
  return { anchors: null, ...spec, axis: unit(spec.axis) }
}

export function inline4FastenerSpecs(layout: EngineLayout): Record<string, FastenerGroup[]> {
  const headTop = layout.head.center[1] + layout.head.size[1] / 2
  const coverTop = layout.cover.center[1] + layout.cover.size[1] / 2
  const panTop = layout.pan.center[1] + layout.pan.size[1] / 2
  const xs5 = [-0.16, -0.08, 0, 0.08, 0.16]
  const headY = headTop + 0.001
  const headPositions: Vec3[] = [
    ...xs5.map((x): Vec3 => [x, headY, 0.03]),
    ...xs5.map((x): Vec3 => [x, headY, -0.03]),
  ]
  const coverXs = [-0.15, -0.075, 0, 0.075, 0.15]
  const coverPositions: Vec3[] = [
    ...coverXs.map((x): Vec3 => [x, coverTop, 0.052]),
    ...coverXs.map((x): Vec3 => [x, coverTop, -0.052]),
  ]
  const intakeXs = [-0.18, -0.12, -0.06, 0, 0.06, 0.12, 0.18]
  const intakeZ = layout.intakeSign * layout.block.size[2] * 0.46
  const intakePositions = intakeXs.map((x): Vec3 => [x, layout.deckY + 0.045, intakeZ])
  const exhaustZ = -layout.intakeSign * layout.block.size[2] * 0.46
  const exhaustXs = [-0.16, -0.08, 0, 0.08, 0.16]
  const exhaustPositions = exhaustXs.map((x): Vec3 => [x, layout.deckY + 0.04, exhaustZ])
  const stay: Vec3 = [0.2, layout.deckY + 0.01, exhaustZ - layout.intakeSign * 0.04]
  const pan = perimeter(
    layout.pan.size[0] / 2 - 0.015,
    layout.pan.size[2] / 2 - 0.012,
    panTop,
    [6, 6, 4, 4],
  )
  const timingX = layout.frontX + 0.03
  const align: Vec3[] = [
    [timingX, layout.crankCenter[1] - 0.02, -0.05],
    [timingX, layout.crankCenter[1] - 0.02, 0.05],
  ]
  const coverBolts = perimeter(0.1, 0.07, 0, [5, 4, 4, 4]).map(
    (point): Vec3 => [timingX, layout.crankCenter[1] + 0.07 + point[0], point[2]],
  )
  const capX = mainCapX(layout)
  const mainPositions: Vec3[] = capX.flatMap((x) => [
    [x, layout.crankCenter[1] - 0.02, -0.032] as Vec3,
    [x, layout.crankCenter[1] - 0.02, 0.032] as Vec3,
  ])
  const mainOrder = [3, 2, 4, 1, 5]
  const mainSequence = capX.flatMap((_, cap) => {
    const stage = mainOrder.indexOf(cap + 1)
    return [stage * 2 + 1, stage * 2 + 2]
  })
  const rodPositions: Vec3[] = []
  const rodAnchors: string[] = []
  const rodSequence: number[] = []
  const rodOrder = [2, 3, 1, 4]
  layout.pistonX.forEach((_, index) => {
    const stage = rodOrder.indexOf(index + 1)
    rodPositions.push([-0.014, -layout.rodLength / 2, 0], [0.014, -layout.rodLength / 2, 0])
    rodAnchors.push(`rod:${index}`, `rod:${index}`)
    rodSequence.push(stage * 2 + 1, stage * 2 + 2)
  })
  const pump = star(5, 0.034).map((point): Vec3 => [0.012, point[1], point[2]])
  const pumpSequence = [1, 3, 5, 2, 4]

  return {
    'valve-cover': [
      fastener({
        id: 'cover-bolts',
        type: 'bolt',
        size: 'M6',
        name: 'valve cover bolts',
        count: coverPositions.length,
        positions: coverPositions,
        axis: [0, 1, 0],
        torqueNm: { min: 5, max: 12 },
        sequence: centerOut(coverPositions),
        notes: 'Center-out or criss-cross, in 2 or 3 light stages. Outside the plug tubes.',
      }),
    ],
    'cylinder-head': [
      fastener({
        id: 'head-bolts',
        type: 'bolt',
        size: 'M10',
        name: 'cylinder head bolts',
        count: 10,
        positions: headPositions,
        axis: [0, 1, 0],
        torqueNm: { min: 20, max: 80, angle: 90 },
        sequence: [8, 4, 1, 5, 9, 7, 3, 2, 6, 10],
        notes: 'Two rows of five between the cams. Tighten by the numbers. Loosen from 10 back to 1, a little at a time. Then 90°, and 90° again.',
      }),
    ],
    'intake-manifold': [
      fastener({
        id: 'intake-bolts',
        type: 'bolt',
        size: 'M8',
        name: 'intake manifold bolts',
        count: intakePositions.length,
        positions: intakePositions,
        axis: [0, 0, layout.intakeSign],
        torqueNm: { min: 15, max: 30 },
        sequence: centerOut(intakePositions),
        notes: 'Single row. Center-out, in 2 stages.',
      }),
    ],
    'exhaust-manifold': [
      fastener({
        id: 'exhaust-nuts',
        type: 'nut',
        size: 'M8',
        name: 'exhaust manifold nuts',
        count: exhaustPositions.length,
        positions: exhaustPositions,
        axis: [0, 0, -layout.intakeSign],
        torqueNm: { min: 25, max: 48 },
        sequence: centerOut(exhaustPositions),
        notes: 'Nuts on studs. Center-out. Use a new gasket.',
      }),
      fastener({
        id: 'exhaust-stay',
        type: 'bolt',
        size: 'M8',
        name: 'exhaust stay bolt',
        count: 1,
        positions: [stay],
        axis: [0, 0, -layout.intakeSign],
        torqueNm: { min: 25, max: 48 },
        sequence: [1],
        notes: 'Tighten the stay after the manifold nuts.',
      }),
    ],
    'timing-drive': [
      fastener({
        id: 'timing-align',
        type: 'bolt',
        size: 'M8',
        name: 'timing cover alignment bolts',
        count: 2,
        positions: align,
        axis: [-1, 0, 0],
        torqueNm: { min: 8, max: 15 },
        sequence: [1, 2],
        notes: 'Install the two lower alignment bolts first.',
      }),
      fastener({
        id: 'timing-cover',
        type: 'bolt',
        size: 'M6',
        name: 'timing cover bolts',
        count: coverBolts.length,
        positions: coverBolts,
        axis: [-1, 0, 0],
        torqueNm: { min: 8, max: 12 },
        sequence: numbered(coverBolts.length),
        notes: 'The rest of the mixed M6 and M8 timing cover fasteners.',
      }),
    ],
    'oil-pan': [
      fastener({
        id: 'pan-bolts',
        type: 'bolt',
        size: 'M6',
        name: 'oil pan bolts',
        count: pan.length,
        positions: pan,
        axis: [0, -1, 0],
        torqueNm: { min: 7, max: 12 },
        sequence: centerOut(pan),
        notes: 'Around the flange. Center-out or a diagonal criss-cross, in 2 or 3 stages.',
      }),
    ],
    crankshaft: [
      fastener({
        id: 'main-caps',
        type: 'bolt',
        size: 'M10',
        name: 'main bearing cap bolts',
        count: mainPositions.length,
        positions: mainPositions,
        axis: [0, -1, 0],
        torqueNm: { min: 50, max: 80 },
        sequence: mainSequence,
        notes: 'Cap 3, then caps 2 and 4, then caps 1 and 5. Check that the crank turns freely afterwards.',
      }),
    ],
    pistons: [
      fastener({
        id: 'rod-bolts',
        type: 'bolt',
        size: 'M8',
        name: 'rod cap bolts',
        count: 8,
        positions: rodPositions,
        axis: [0, -1, 0],
        torqueNm: { min: 20, max: 50, angle: 90 },
        sequence: rodSequence,
        notes: 'Center rods (cylinders 2 and 3) first, then 1 and 4.',
        anchors: rodAnchors,
      }),
    ],
    'water-pump': [
      fastener({
        id: 'pump-bolts',
        type: 'bolt',
        size: 'M6',
        name: 'water pump bolts',
        count: pump.length,
        positions: pump,
        axis: [1, 0, 0],
        torqueNm: { min: 8, max: 25 },
        sequence: pumpSequence.slice(0, pump.length),
        notes: 'Star pattern.',
      }),
    ],
    alternator: [
      fastener({
        id: 'alternator-bolts',
        type: 'bolt',
        size: 'M8',
        name: 'alternator bolts',
        count: 2,
        positions: [
          [-0.02, -0.02, 0],
          [0.02, 0.04, 0],
        ],
        axis: [1, 0, 0],
        torqueNm: { min: 20, max: 52 },
        sequence: [1, 2],
        notes: 'Fit the pivot, then the belt, then tighten the adjuster, then the pivot.',
      }),
    ],
  }
}

function mainCapX(layout: EngineLayout): number[] {
  const spacing = layout.boreSpacing
  const first = layout.pistonX[0] ?? 0
  const last = layout.pistonX[layout.pistonX.length - 1] ?? 0
  return [first - spacing / 2, ...layout.pistonX.slice(0, -1).map((x, index) => (x + (layout.pistonX[index + 1] ?? x)) / 2), last + spacing / 2]
}

function perimeter(halfX: number, halfZ: number, y: number, counts: [number, number, number, number]): Vec3[] {
  const [north, south, east, west] = counts
  const points: Vec3[] = []
  for (let index = 0; index < north; index += 1) {
    const t = north === 1 ? 0.5 : index / (north - 1)
    points.push([-halfX + t * halfX * 2, y, halfZ])
  }
  for (let index = 0; index < south; index += 1) {
    const t = south === 1 ? 0.5 : index / (south - 1)
    points.push([halfX - t * halfX * 2, y, -halfZ])
  }
  for (let index = 1; index < east - 1; index += 1) {
    const t = index / (east - 1)
    points.push([halfX, y, halfZ - t * halfZ * 2])
  }
  for (let index = 1; index < west - 1; index += 1) {
    const t = index / (west - 1)
    points.push([-halfX, y, -halfZ + t * halfZ * 2])
  }
  return points
}

function star(count: number, radius: number): Vec3[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2
    return [0, Math.cos(angle) * radius, Math.sin(angle) * radius] as Vec3
  })
}

export function withInline4Fasteners<T extends { parameters: object; parts: { id: string }[] }>(data: T) {
  const layout = layoutFromEngine({ parameters: data.parameters } as EngineRecord)
  const specs = inline4FastenerSpecs(layout)
  return {
    ...data,
    parts: data.parts.map((part) => ({
      ...part,
      fasteners: specs[part.id] ?? [],
    })),
  }
}
