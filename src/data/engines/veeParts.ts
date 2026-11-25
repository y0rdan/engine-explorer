import type { Vec3 } from '../../engine/schema.ts'
import { bankFrame, planVee, VEE_CRANK_Y, type VeeCylinder } from '../../engine/veeLayout.ts'

export type VeeEngineSpec = {
  id: string
  code: string
  model: string
  layout: 'v6' | 'v8'
  displacementCc: number
  bankAngleDeg: number
  boreM: number
  strokeM: number
  boreMm: number
  strokeMm: number
  cylindersPerBank: number
  firingOrder: readonly number[]
  firingLabel: string
  boreSpacing: number
  block: { length: number; width: number; height: number }
  mainCaps: number
  headBolts: number
  coverBolts: number
  exhaustNuts: number
  intakeBolts: number
  panBolts: number
  liters: string
}

type LayerInput = {
  id: string
  name: string
  description: string
  explodeOffset: Vec3
  assemblyOrder: number
  assemblyLabel: string
}

type FastenerInput = {
  type: string
  size: string
  positions: Vec3[]
  torque: { min: number; max: number; angle?: number }
  notes: string
  spiral?: boolean
}

function spiralSequence(positions: Vec3[]): number[] {
  const count = positions.length
  const center: Vec3 = [0, 0, 0]
  for (const position of positions) {
    center[0] += position[0]
    center[1] += position[1]
    center[2] += position[2]
  }
  center[0] /= count
  center[1] /= count
  center[2] /= count
  const ranked = positions.map((position, index) => ({
    index,
    distance: Math.hypot(position[0] - center[0], position[1] - center[1], position[2] - center[2]),
    angle: Math.atan2(position[2] - center[2], position[0] - center[0]),
  }))
  ranked.sort((a, b) => a.distance - b.distance || a.angle - b.angle)
  const sequence = new Array<number>(count)
  ranked.forEach((item, order) => {
    sequence[item.index] = order + 1
  })
  return sequence
}

function fastener(input: FastenerInput) {
  const sequence = input.spiral ? spiralSequence(input.positions) : input.positions.map((_, index) => index + 1)
  return {
    type: input.type,
    size: input.size,
    count: input.positions.length,
    positions: input.positions,
    torque_nm: input.torque,
    sequence,
    notes: `${input.notes} Typical, display only.`,
  }
}

function gridAlong(beta: number, along: number, across: number[], count: number, spacing: number): Vec3[] {
  const columns = count / across.length
  const start = -((columns - 1) * spacing) / 2
  const positions: Vec3[] = []
  for (const side of across) {
    for (let index = 0; index < columns; index += 1) {
      positions.push(bankFrame(beta, along, side, start + index * spacing, VEE_CRANK_Y))
    }
  }
  return positions
}

function valleyGrid(count: number, spacing: number, y: number): Vec3[] {
  const columns = count / 2
  const start = -((columns - 1) * spacing) / 2
  const positions: Vec3[] = []
  for (const z of [-0.028, 0.028]) {
    for (let index = 0; index < columns; index += 1) {
      positions.push([start + index * spacing, y, z])
    }
  }
  return positions
}

function mainCapPositions(caps: number, spacing: number, y: number, z: number): Vec3[] {
  const mid = (caps - 1) / 2
  const positions: Vec3[] = []
  for (let index = 0; index < caps; index += 1) {
    const x = (index - mid) * spacing
    positions.push([x, y, -z], [x, y, z])
  }
  return positions
}

function rodPositions(cylinders: readonly VeeCylinder[]): Vec3[] {
  const positions: Vec3[] = []
  for (const cylinder of cylinders) {
    positions.push(
      [cylinder.x - 0.012, VEE_CRANK_Y, cylinder.zSign * 0.012],
      [cylinder.x + 0.012, VEE_CRANK_Y, cylinder.zSign * 0.012],
    )
  }
  return positions
}

function panPositions(count: number, length: number, width: number, y: number): Vec3[] {
  const positions: Vec3[] = []
  const perSide = Math.ceil(count / 2)
  for (let index = 0; index < perSide && positions.length < count; index += 1) {
    const x = -length / 2 + (length * index) / Math.max(perSide - 1, 1)
    positions.push([x, y, -width / 2])
    if (positions.length < count) positions.push([x, y, width / 2])
  }
  return positions.slice(0, count)
}

function coverRing(count: number, x: number, y: number): Vec3[] {
  const positions: Vec3[] = []
  const cols = Math.ceil(count / 2)
  for (let index = 0; index < cols && positions.length < count; index += 1) {
    const z = -0.08 + (0.16 * index) / Math.max(cols - 1, 1)
    positions.push([x, y + 0.08, z])
    if (positions.length < count) positions.push([x, y - 0.06, z])
  }
  return positions.slice(0, count)
}

function layer(
  id: string,
  name: string,
  description: string,
  explodeOffset: Vec3,
  assemblyOrder: number,
  assemblyLabel: string,
): LayerInput {
  return { id, name, description, explodeOffset, assemblyOrder, assemblyLabel }
}

export function buildVeeEngine(spec: VeeEngineSpec) {
  const cylinders = planVee({
    bankAngleDeg: spec.bankAngleDeg,
    cylindersPerBank: spec.cylindersPerBank,
    boreSpacing: spec.boreSpacing,
    firingOrder: spec.firingOrder,
  })
  const left = cylinders.filter((cylinder) => cylinder.bank === 'left')
  const right = cylinders.filter((cylinder) => cylinder.bank === 'right')
  const leftAxis = left[0]?.boreAxis ?? [0, 1, 0]
  const rightAxis = right[0]?.boreAxis ?? [0, 1, 0]
  const leftBeta = left[0]?.beta ?? 0
  const rightBeta = right[0]?.beta ?? 0
  const nums = (group: VeeCylinder[]) => group.map((cylinder) => cylinder.number).join(', ')
  const interval = spec.layout === 'v6' ? '120 degrees' : '90 degrees'
  const pinStory =
    spec.layout === 'v6'
      ? `Each crank station is a split pin. The two rod journals share the station but sit ${spec.bankAngleDeg} degrees apart, which is what makes a ${spec.bankAngleDeg}-degree V fire evenly.`
      : 'Each crank station is one shared pin. Two rods, one from each bank, ride that pin. The four pins form a cross: the front and rear pins share a plane, and the middle pair shares the plane at right angles.'
  const name = `generic ${spec.liters} ${spec.model}`
  const headTorque = { min: 45, max: 70, angle: 90 }
  const smallTorque = { min: 8, max: 12 }
  const manifoldTorque = { min: 18, max: 28 }

  return {
    id: spec.id,
    brand: 'Generic',
    model: spec.model,
    engineCode: spec.code,
    yearRange: { start: 2000, end: null },
    layout: spec.layout,
    displacementCc: spec.displacementCc,
    category: 'engine',
    specs: [
      { label: 'Cylinders', value: String(spec.cylindersPerBank * 2) },
      { label: 'Banks', value: '2' },
      { label: 'Bank angle', value: String(spec.bankAngleDeg), unit: 'deg' },
      { label: 'Bore', value: String(spec.boreMm), unit: 'mm' },
      { label: 'Stroke', value: String(spec.strokeMm), unit: 'mm' },
      { label: 'Valvetrain', value: 'DOHC, 2 valves per cylinder' },
      { label: 'Firing order', value: spec.firingLabel },
    ],
    source: {
      kind: 'procedural',
      template: spec.layout,
      params: {
        bankAngleDeg: spec.bankAngleDeg,
        bore: spec.boreM,
        stroke: spec.strokeM,
        cylindersPerBank: spec.cylindersPerBank,
        banks: 2,
        dohc: true,
        firingOrder: spec.firingLabel,
      },
    },
    fastenerLayout: {
      cylinders: spec.cylindersPerBank * 2,
      banks: 2,
      heads: 2,
      valvetrain: 'dohc',
    },
    parameters: {
      boreSpacing: spec.boreSpacing,
      block: spec.block,
      intakeSide: 'right',
      exhaustSide: 'left',
      accessories: {},
    },
    parts: [
      part({
        id: 'engine-block',
        displayName: 'Engine block',
        category: 'Structure',
        system: 'engine',
        summary: `The ${spec.bankAngleDeg}-degree casting that carries both banks and the crank.`,
        description: `The block of this ${name} is one crankcase with two banks leaned ${spec.bankAngleDeg / 2} degrees each side of vertical. ${spec.cylindersPerBank} bores run along each bank. Oil galleries and coolant jackets are cast into the metal. It is a teaching shape, not a copy of one manufacturer's block.`,
        whatItDoes: 'It locates the crank, the bores, and the two cylinder heads.',
        howItWorks: [
          'The pistons slide in the tilted bores and turn the shared crank.',
          'Main caps under the crank keep the shaft in line.',
          'Coolant moves through both banks and back toward the radiator.',
        ],
        whereItLives: 'In the middle of the bay, with the transmission against the rear face.',
        keyNumbers: [
          { label: 'Cylinders', value: String(spec.cylindersPerBank * 2) },
          { label: 'Bank angle', value: String(spec.bankAngleDeg), unit: 'deg' },
          { label: 'Main caps', value: String(spec.mainCaps) },
        ],
        warningSigns: [
          'Oil that keeps disappearing with no drip under the pan.',
          'Milky oil, which can mean coolant crossed into a gallery.',
        ],
        difficulty: 5,
        estimatedTime: 'A full day or more',
        tools: ['engine hoist', 'engine stand', 'torque wrench'],
        steps: [
          'Treat a block swap as a workshop job. Support the transmission before the mounts come off.',
          'Lift the engine straight up once the accessories and the exhaust are clear.',
        ],
        maintenance: [
          'Fix pan and front-cover leaks before they empty the oil.',
          'Use an oil the bearing clearances were designed around.',
        ],
        funFact: `A bore of ${spec.boreMm} mm and a stroke of ${spec.strokeMm} mm is what lands this teaching ${spec.model} near ${spec.liters}.`,
        explodeOffset: [0, 0, 0],
        assemblyOrder: 10,
        assemblyLabel: 'Set the engine block on the stand',
        layers: [
          layer('skirt', 'Crankcase', 'The lower casting that wraps the crank and the main bearings.', [0, -0.04, 0], 1, 'Seat the crankcase'),
          layer('cylinders', 'Cylinder banks', `The two banks of ${spec.cylindersPerBank} bores, leaned out at ${spec.bankAngleDeg} degrees.`, [0, 0.06, 0], 2, 'Read the banks as part of the casting'),
        ],
        fasteners: [
          fastener({
            type: 'bolt',
            size: 'M11',
            positions: mainCapPositions(spec.mainCaps, spec.boreSpacing, VEE_CRANK_Y - 0.03, 0.016),
            torque: { min: 60, max: 90, angle: 70 },
            notes: `${spec.mainCaps} main caps, two vertical bolts on each cap.`,
          }),
          fastener({
            type: 'bolt',
            size: 'M8',
            positions: mainCapPositions(spec.mainCaps, spec.boreSpacing, VEE_CRANK_Y - 0.05, 0.055),
            torque: { min: 20, max: 30 },
            notes: `Side bolts, two beside each of the ${spec.mainCaps} main caps.`,
          }),
        ],
      }),
      part({
        id: 'crankshaft',
        displayName: 'Crankshaft',
        category: 'Rotating assembly',
        system: 'engine',
        summary: `The shaft that spaces this ${spec.model}'s power pulses ${interval} apart.`,
        description: `The crankshaft of this ${name} runs in the bottom of the V. ${pinStory} A pulley at the front drives the accessories and the timing chains. A flywheel at the rear faces the transmission. Firing order is ${spec.firingLabel}.`,
        whatItDoes: 'It turns the piston strokes into one rotation and spaces the power pulses.',
        howItWorks: [
          'Each rod journal orbits the main axis as the shaft turns.',
          'Counterweights opposite the journals calm the spinning mass.',
          'The front pulley and the rear flywheel turn once per crank revolution.',
        ],
        howItMoves: `The whole shaft spins at engine speed. ${pinStory} Power strokes are ${interval} apart. Firing order is ${spec.firingLabel}.`,
        whereItLives: 'Low in the block, held by the main caps, flywheel toward the transmission.',
        keyNumbers: [
          { label: 'Main caps', value: String(spec.mainCaps) },
          { label: 'Firing order', value: spec.firingLabel },
          { label: 'Bank angle', value: String(spec.bankAngleDeg), unit: 'deg' },
        ],
        warningSigns: [
          'A deep knock that follows engine speed and gets louder under load.',
          'Metal glitter in the oil after a drain.',
        ],
        difficulty: 5,
        estimatedTime: 'A full teardown',
        tools: ['plastigage', 'torque wrench', 'micrometer'],
        steps: [
          'The crank comes out only after the pan and the main caps are off.',
          'Turn the shaft by hand before the caps are final. It should rotate without a tight spot.',
        ],
        maintenance: [
          'Oil and filter changes are what protect the bearings.',
          'Do not load a cold engine hard before the oil has pressure.',
        ],
        explodeOffset: [0.22, 0, 0],
        assemblyOrder: 20,
        assemblyLabel: 'Lay the crankshaft into the main bearings',
        layers: [
          layer('shaft', 'Shaft and journals', pinStory, [0, 0, 0], 1, 'Lower the crank into the bearings'),
          layer('flywheel', 'Flywheel', 'The heavy disc at the rear that the starter pinion engages.', [0.1, 0, 0], 2, 'Bolt the flywheel to the crank flange'),
        ],
      }),
      pistonPart('left', left, leftAxis, spec, nums(left), 30),
      pistonPart('right', right, rightAxis, spec, nums(right), 40),
      part({
        id: 'oil-pan',
        displayName: 'Oil pan',
        category: 'Lubrication',
        system: 'engine',
        summary: 'The sump that stores oil under the crank of both banks.',
        description: `The pan is a shallow tray bolted to the bottom of the ${name}. Oil from both heads drains back here. A plug at the bottom is the drain. Windage from a ${spec.layout === 'v8' ? 'cross-plane' : 'split-pin'} crank is why the pan is more than a flat tray.`,
        whatItDoes: 'It holds the oil supply and keeps the pickup covered.',
        howItWorks: [
          'Oil returns from both banks by gravity.',
          'The pump pickup sits low so it stays submerged.',
          'The plug is the drain. The gasket keeps the joint dry.',
        ],
        whereItLives: 'Under the block, the lowest part of the engine.',
        keyNumbers: [
          { label: 'Drain plug', value: '1' },
          { label: 'Pan bolts', value: String(spec.panBolts) },
        ],
        warningSigns: [
          'Fresh oil spots on the ground after the engine has been parked.',
          'A dipstick that was full and is now low.',
        ],
        difficulty: 2,
        estimatedTime: '1–2 hours',
        tools: ['drain pan', 'scraper', 'torque wrench'],
        steps: [
          'Drain the oil while it is warm, not hot, and catch it for recycling.',
          'Unbolt the pan, clean both faces, and fit a new gasket without overtightening.',
        ],
        maintenance: [
          'Replace the drain-plug washer when it looks crushed.',
          'Do not ignore a damp seam along the rail.',
        ],
        safetyNote: 'Used oil is hot enough to burn. Let it cool from operating temperature before you pull the plug.',
        explodeOffset: [0, -0.14, 0],
        assemblyOrder: 50,
        assemblyLabel: 'Offer up the oil pan and its gasket',
        layers: [
          layer('pan', 'Pan', 'The tray that closes the bottom of the crankcase.', [0, 0, 0], 1, 'Lift the pan onto the block rail'),
          layer('plug', 'Drain plug', 'The threaded plug and washer at the lowest point of the pan.', [0, -0.05, 0], 2, 'Fit the drain plug and a fresh washer'),
        ],
        fasteners: [
          fastener({
            type: 'bolt',
            size: 'M6',
            positions: panPositions(spec.panBolts, spec.block.length * 0.8, spec.block.width * 0.8, 0.09),
            torque: smallTorque,
            notes: 'Oil-pan rail bolts.',
          }),
        ],
      }),
      headPart('left', leftAxis, leftBeta, spec, nums(left), 60, headTorque),
      headPart('right', rightAxis, rightBeta, spec, nums(right), 70, headTorque),
      camPart('left', leftAxis, spec, nums(left), 80),
      camPart('right', rightAxis, spec, nums(right), 90),
      part({
        id: 'timing-drive',
        displayName: 'Timing chains',
        category: 'Valve train',
        system: 'engine',
        summary: 'Two front chains that turn the cams at half crank speed.',
        description: `The ${name} drives its cams with chains on the front of the engine, one loop for each bank. The crank sprocket pulls both chains. Each cam sprocket is larger, so the cams turn once for every two crank turns. A cover hides the chains in a real bay. This model leaves them readable and still shows the cover as its own layer.`,
        whatItDoes: 'It locks both banks of cams to the crank.',
        howItWorks: [
          'The crank sprocket turns once per crank revolution.',
          'Each bank chain runs up to that bank’s intake and exhaust sprockets.',
          'Guides keep the slack side from slapping the cover.',
        ],
        howItMoves: 'The chains track at crank speed. The cam sprockets they turn spin at half that speed. The guides stay put.',
        whereItLives: 'On the front face, between the crank nose and the two heads.',
        keyNumbers: [
          { label: 'Cam ratio', value: '2:1' },
          { label: 'Chains', value: '2' },
        ],
        warningSigns: [
          'A rattle from the front cover that changes with engine speed.',
          'An engine that cranks but will not fire after a chain has jumped.',
        ],
        difficulty: 4,
        estimatedTime: 'Half a day',
        tools: ['crank lock', 'torque wrench', 'chain holders'],
        steps: [
          'Turn the engine to the timing marks before a chain comes off.',
          'Fit the new chains slack-side last, then turn the crank two full turns by hand and recheck the marks.',
        ],
        maintenance: [
          'Listen for a new rattle at the front. Chains wear instead of cracking the way a belt does.',
          'If a guide is chewed, replace it with the chain.',
        ],
        safetyNote: 'Turn the engine only by the crank bolt, with the spark disabled, so a jumped chain cannot catch a finger.',
        explodeOffset: [-0.26, 0.04, 0],
        assemblyOrder: 100,
        assemblyLabel: 'Loop the timing chains over the sprockets',
        layers: [
          layer('chains', 'Chains', 'The two front chains, one for each bank of cams.', [-0.04, 0, 0], 1, 'Seat each chain on its sprockets'),
          layer('cover', 'Timing cover', 'The front plate that closes the chain case and carries its own bolts.', [-0.08, 0, 0], 2, 'Fit the timing cover and a new seal'),
          layer('guides', 'Chain guides', 'The plastic shoes that keep each chain on its path.', [-0.02, 0.04, 0.04], 3, 'Clip the guides into the case'),
        ],
        fasteners: [
          fastener({
            type: 'bolt',
            size: 'M6',
            positions: coverRing(8, -spec.block.length / 2 - 0.06, VEE_CRANK_Y + 0.12),
            torque: smallTorque,
            notes: 'Timing-cover bolts.',
          }),
        ],
      }),
      coverPart('left', leftAxis, leftBeta, spec, nums(left), 110),
      coverPart('right', rightAxis, rightBeta, spec, nums(right), 120),
      part({
        id: 'intake-manifold',
        displayName: 'Valley intake',
        category: 'Intake',
        system: 'fuel-air',
        summary: 'The plenum that sits in the V and feeds both heads.',
        description: `The intake of this ${name} lives in the valley between the banks, not on one side the way an inline engine’s does. A central plenum feeds a runner to every cylinder: ${nums(left)} on the left bank and ${nums(right)} on the right. Air comes in from the filter and splits toward the inner face of each head.`,
        whatItDoes: 'It shares one stream of air across both banks.',
        howItWorks: [
          'The plenum steadies the air before the runners.',
          'Each runner ends at an intake port on the valley side of a head.',
          'The bolts clamp the manifold down into the V.',
        ],
        whereItLives: 'In the valley, between the two cylinder heads.',
        keyNumbers: [
          { label: 'Runners', value: String(spec.cylindersPerBank * 2) },
          { label: 'Bolts', value: String(spec.intakeBolts), unit: 'M8' },
        ],
        warningSigns: [
          'A whistle at idle that goes away when you press the throttle.',
          'Oil mist in the plenum, which can mean the breathers are overloaded.',
        ],
        difficulty: 3,
        estimatedTime: '2–4 hours',
        tools: ['torque wrench', 'gasket scraper', 'vacuum gauge'],
        steps: [
          'Label the hoses before the manifold comes off. Several of them look the same.',
          'Tighten the valley bolts in a cross pattern so the gasket seats evenly.',
        ],
        maintenance: [
          'Check the valley for oil after a long drive. A slow seep hides here.',
          'Replace the gasket if the manifold ever comes off. Do not reuse a crushed one.',
        ],
        explodeOffset: [0, 0.22, 0],
        assemblyOrder: 130,
        assemblyLabel: 'Lower the intake plenum into the valley',
        layers: [
          layer('plenum', 'Plenum', 'The shared chamber sitting in the V between the heads.', [0, 0.06, 0], 1, 'Set the plenum on the valley bolts'),
          layer('runners', 'Runners', `One passage to each of the ${spec.cylindersPerBank * 2} intake ports.`, [0, -0.02, 0], 2, 'Seat the runners on the port gaskets'),
        ],
        fasteners: [
          fastener({
            type: 'bolt',
            size: 'M8',
            positions: valleyGrid(spec.intakeBolts, spec.boreSpacing * 0.85, VEE_CRANK_Y + 0.16),
            torque: manifoldTorque,
            notes: 'Valley intake bolts.',
          }),
        ],
      }),
      exhaustPart('left', left, leftAxis, leftBeta, spec, nums(left), 140),
      exhaustPart('right', right, rightAxis, rightBeta, spec, nums(right), 150),
      serviceParts(spec),
    ].flat(),
  }
}

function pistonPart(
  side: 'left' | 'right',
  group: VeeCylinder[],
  axis: Vec3,
  spec: VeeEngineSpec,
  numbers: string,
  order: number,
) {
  const other = side === 'left' ? 'right' : 'left'
  return part({
    id: `pistons-${side}`,
    displayName: `${title(side)} pistons and rods`,
    category: 'Rotating assembly',
    system: 'engine',
    summary: `${group.length} pistons that slide along the ${side} bank.`,
    description: `The ${side} bank of this generic ${spec.liters} ${spec.model} holds cylinders ${numbers}. Each piston is a short aluminum plug. Its rod runs down to a crank journal and leans with the bank, not straight up and down. In an exploded view these pistons travel out along the bore axis, clear of the ${other} bank.`,
    whatItDoes: 'They take combustion pressure and pull the crank around.',
    howItWorks: [
      'On the way out, a piston draws air in or delivers the power stroke.',
      'On the way in, it compresses the mixture or pushes exhaust out.',
      'The rod swings as the journal orbits, while the piston stays on the bore centerline.',
    ],
    howItMoves: `Slider-crank motion along a bore tilted ${spec.bankAngleDeg / 2} degrees. The wrist pin stays on the ${side}-bank axis. Cylinders ${numbers} live here. Two bolts clamp each rod cap.`,
    whereItLives: `Inside the ${side} bank, rods reaching the crank throws.`,
    keyNumbers: [
      { label: 'Pistons', value: String(group.length) },
      { label: 'Cylinders', value: numbers },
      { label: 'Rod bolts', value: '2', unit: 'per rod' },
    ],
    warningSigns: [
      'A light tick that becomes a knock as the engine warms.',
      'Blue smoke on startup that points at tired rings.',
    ],
    difficulty: 5,
    estimatedTime: 'A full teardown',
    tools: ['ring compressor', 'torque wrench', 'feeler gauges'],
    steps: [
      'Rods come out through the bottom after the pan and the caps are off.',
      'Mark each rod and cap so they go back on the same journal.',
    ],
    maintenance: [
      'Clean oil is the service these parts want most.',
      'A cold rattle that fades can be normal piston slap on a high-mileage engine.',
    ],
    explodeOffset: along(axis, 0.16),
    assemblyOrder: order,
    assemblyLabel: `Slide the ${side}-bank pistons down their bores`,
    layers: [
      layer('pistons', 'Pistons', `The ${side}-bank pistons for cylinders ${numbers}.`, along(axis, 0.05), 1, `Fit the ${side}-bank rings and drop the pistons in`),
      layer('rods', 'Connecting rods', `The ${side}-bank links from each wrist pin to a crank journal.`, along(axis, -0.06), 2, `Bolt the ${side}-bank rod caps`),
    ],
    fasteners: [
      fastener({
        type: 'bolt',
        size: 'M8',
        positions: rodPositions(group),
        torque: { min: 30, max: 50, angle: 45 },
        notes: `Two rod bolts on each ${side}-bank rod.`,
      }),
    ],
  })
}

function headPart(
  side: 'left' | 'right',
  axis: Vec3,
  beta: number,
  spec: VeeEngineSpec,
  numbers: string,
  order: number,
  torque: { min: number; max: number; angle?: number },
) {
  return part({
    id: `cylinder-head-${side}`,
    displayName: `${title(side)} cylinder head`,
    category: 'Structure',
    system: 'engine',
    summary: `The ${side} head, closing cylinders ${numbers}.`,
    description: `This head bolts to the ${side} bank of the generic ${spec.liters} ${spec.model} and closes cylinders ${numbers}. Intake ports face the valley. Exhaust ports face outward. The head gasket keeps combustion, oil, and coolant apart. When the engine is exploded, the head lifts outward along the bank axis instead of straight up.`,
    whatItDoes: 'It seals the combustion space and holds the valves for one bank.',
    howItWorks: [
      'The gasket keeps pressure, oil, and coolant in their own paths.',
      'Each cylinder has an intake valve and an exhaust valve in this teaching model, so the motion stays easy to see.',
      'Two cams in the head open those valves. The casting itself does not move while the engine runs.',
    ],
    howItMoves: `The valves open along the ${side}-bank axis when a cam lobe comes around, then the springs close them. The head casting stays still.`,
    whereItLives: `On the outer deck of the ${side} bank, between the block and the valve cover.`,
    keyNumbers: [
      { label: 'Cylinders', value: numbers },
      { label: 'Head bolts', value: String(spec.headBolts) },
      { label: 'Valves per cylinder', value: '2' },
    ],
    warningSigns: [
      'A sweet smell from the exhaust, or bubbles in the coolant bottle.',
      'A miss that shows up only when the engine is hot.',
    ],
    difficulty: 4,
    estimatedTime: 'Half a day',
    tools: ['torque wrench', 'angle gauge', 'gasket scraper'],
    steps: [
      'Work on a cold engine. Drain the coolant before the head bolts come out.',
      'Loosen the bolts in a center-out spiral so the casting does not warp.',
    ],
    maintenance: [
      'Watch the coolant level. A slow drop with no puddle can be a head-gasket path.',
      'If the bolts are ever disturbed, follow a center-out sequence on the way back.',
    ],
    safetyNote: 'Coolant in a hot head is pressurized. Drain it only after the engine is cold.',
    explodeOffset: along(axis, 0.22),
    assemblyOrder: order,
    assemblyLabel: `Lower the ${side} head onto a new gasket`,
    layers: [
      layer('casting', 'Head casting', `The ${side} aluminum head over cylinders ${numbers}.`, [0, 0, 0], 1, `Set the ${side} head on the dowels`),
      layer('valves', 'Valves', `Intake and exhaust valves for the ${side} bank, one pair in each cylinder.`, along(axis, 0.06), 2, `Drop the ${side}-bank valves in and fit the springs`),
    ],
    fasteners: [
      fastener({
        type: 'bolt',
        size: 'M11',
        positions: gridAlong(beta, 0.38, [-0.04, 0.04], spec.headBolts, spec.boreSpacing * 0.72),
        torque,
        notes: `${spec.headBolts} head bolts in a center-out spiral.`,
        spiral: true,
      }),
    ],
  })
}

function camPart(side: 'left' | 'right', axis: Vec3, spec: VeeEngineSpec, numbers: string, order: number) {
  return part({
    id: `camshaft-${side}`,
    displayName: `${title(side)} camshafts`,
    category: 'Valve train',
    system: 'engine',
    summary: `Intake and exhaust cams for the ${side} head.`,
    description: `The ${side} head of this generic ${spec.model} is a double overhead cam. One shaft opens the intake valves and the other opens the exhaust valves for cylinders ${numbers}. Both turn at half crank speed, driven by the front chain. Lobes are timed so the valves are shut when that cylinder begins its power stroke.`,
    whatItDoes: 'They time the valves on one bank to the crank.',
    howItWorks: [
      'The timing chain turns both sprockets at half crank speed.',
      'A lobe pushes its valve open for a measured slice of the cycle.',
      'The rest of the turn, the valve stays shut so the cylinder can compress or fire.',
    ],
    howItMoves: `Both ${side}-bank cams spin at half the crank speed. Intake and exhaust lobes are phased apart. Cylinders ${numbers} take their valve timing from this pair.`,
    whereItLives: `Along the ${side} head, under the valve cover, sprockets at the front.`,
    keyNumbers: [
      { label: 'Cams', value: '2' },
      { label: 'Speed', value: '1/2', unit: 'of crank' },
      { label: 'Cylinders', value: numbers },
    ],
    warningSigns: [
      'A rhythmic tick from the top of one bank that speeds up with rpm.',
      'A rattle at startup that lasts until oil reaches the head.',
    ],
    difficulty: 4,
    estimatedTime: '3–5 hours',
    tools: ['timing locks', 'torque wrench', 'feeler gauges'],
    steps: [
      'Lock the crank and both cams before the chain comes off, or the timing is lost.',
      'Cam caps are numbered. They are not interchangeable between journals.',
    ],
    maintenance: [
      'Oil changes keep the lobes from scoring.',
      'A worn chain is cheaper to replace than a set of bent valves.',
    ],
    explodeOffset: along(axis, 0.3),
    assemblyOrder: order,
    assemblyLabel: `Lay the ${side}-bank cams into the head`,
    layers: [
      layer('shafts', 'Cam shafts', `The ${side}-bank intake and exhaust cams and their lobes.`, along(axis, 0.04), 1, `Oil the ${side}-bank journals and set the cams in`),
      layer('sprockets', 'Cam sprockets', `The front wheels the ${side}-bank chain drives.`, [-0.08, 0, 0], 2, `Bolt the ${side}-bank sprockets to the cam noses`),
    ],
  })
}

function coverPart(side: 'left' | 'right', axis: Vec3, beta: number, spec: VeeEngineSpec, numbers: string, order: number) {
  return part({
    id: `valve-cover-${side}`,
    displayName: `${title(side)} valve cover`,
    category: 'Structure',
    system: 'engine',
    summary: `The lid over the ${side} cams.`,
    description: `The ${side} valve cover is a light aluminum lid over the cams for cylinders ${numbers}. A gasket makes the joint. An oil cap on this bank is a fill point. Ribs add stiffness without much weight. In the exploded view it continues outward along the same bank axis as the head, a little farther out.`,
    whatItDoes: 'It keeps oil on the cams and dirt out of the head.',
    howItWorks: [
      'Oil drains back through the head, not through the cover.',
      'A breather lets crankcase pressure escape instead of blowing the gasket.',
      'The cap is only a fill plug. It does not hold engine pressure.',
    ],
    whereItLives: `On top of the ${side} head, the outer lid of that bank.`,
    keyNumbers: [
      { label: 'Bolts', value: String(spec.coverBolts), unit: 'M6' },
      { label: 'Bank', value: side },
    ],
    warningSigns: [
      'Oil wetness along the cover rail after a hot run.',
      'A burning-oil smell with no drip under the pan.',
    ],
    difficulty: 1,
    estimatedTime: '30–60 minutes',
    tools: ['socket set', 'gasket scraper'],
    steps: [
      'Pull the coils aside before the cover bolts come out.',
      'Fit a new gasket and tighten the small bolts in a spiral so the cover does not warp.',
    ],
    maintenance: [
      'Replace the gasket whenever the cover comes off.',
      'Do not overtighten M6 bolts. The rail is easy to bend.',
    ],
    explodeOffset: along(axis, 0.36),
    assemblyOrder: order,
    assemblyLabel: `Set the ${side} valve cover on its gasket`,
    layers: [
      layer('cover', 'Cover', `The ribbed lid over the ${side}-bank cams for cylinders ${numbers}.`, along(axis, 0.03), 1, `Lay the ${side} cover and gasket on the head`),
      layer('cap', 'Oil cap', `The fill cap on the ${side} cover.`, along(axis, 0.06), 2, `Thread the ${side} oil cap in by hand`),
    ],
    fasteners: [
      fastener({
        type: 'bolt',
        size: 'M6',
        positions: gridAlong(beta, 0.5, [-0.035, 0.035], spec.coverBolts, spec.boreSpacing * 0.7),
        torque: { min: 8, max: 12 },
        notes: `${spec.coverBolts} valve-cover bolts, M6.`,
        spiral: true,
      }),
    ],
  })
}

function exhaustPart(
  side: 'left' | 'right',
  group: VeeCylinder[],
  axis: Vec3,
  beta: number,
  spec: VeeEngineSpec,
  numbers: string,
  order: number,
) {
  const zSign = group[0]?.zSign ?? -1
  return part({
    id: `exhaust-manifold-${side}`,
    displayName: `${title(side)} exhaust manifold`,
    category: 'Exhaust',
    system: 'exhaust',
    summary: `The iron collector on the outside of the ${side} bank.`,
    description: `The ${side} exhaust manifold gathers cylinders ${numbers} on the outer face of that head. Short iron runners join one collector. The iron stays dark because it lives in heat. The matching manifold on the other bank does the same job for the other cylinders. This is a generic shape, not a branded header.`,
    whatItDoes: 'It gathers spent gas from one bank and aims it at a downpipe.',
    howItWorks: [
      'An exhaust valve opens and a pulse leaves the port.',
      'The runner carries that pulse into the collector.',
      'Nuts on studs clamp the flange to the head.',
    ],
    whereItLives: `On the outer side of the ${side} head, away from the valley.`,
    keyNumbers: [
      { label: 'Runners', value: String(group.length) },
      { label: 'Nuts', value: String(spec.exhaustNuts) },
    ],
    warningSigns: [
      'A ticking exhaust leak that is loudest when the engine is cold.',
      'Soot streaks on the flange after a drive.',
    ],
    difficulty: 3,
    estimatedTime: '2–3 hours',
    tools: ['penetrating oil', 'flare-nut crowfoot', 'torque wrench'],
    steps: [
      'Soak the studs before you turn a nut. Heat makes them brittle.',
      'Fit a new gasket and tighten the nuts evenly so the flange does not warp.',
    ],
    maintenance: [
      'Look for soot at the flange during an oil change.',
      'Replace a broken stud. Do not run the bank with a missing nut.',
    ],
    safetyNote: 'The manifold stays hot long after the engine stops. Let it cool before you reach past it.',
    explodeOffset: [axis[0] * 0.1, axis[1] * 0.08, axis[2] * 0.28 + zSign * 0.06],
    assemblyOrder: order,
    assemblyLabel: `Hang the ${side} exhaust manifold on its studs`,
    layers: [
      layer('runners', 'Runners', `The ${side}-bank pipes from cylinders ${numbers} to the collector.`, [zSign * 0.04, 0, zSign * 0.04], 1, `Seat the ${side} runners on the port gaskets`),
      layer('collector', 'Collector', `The ${side} outlet where those runners join.`, [zSign * 0.08, 0, zSign * 0.06], 2, `Join the ${side} collector to the downpipe`),
    ],
    fasteners: [
      fastener({
        type: 'nut',
        size: 'M8',
        positions: gridAlong(beta, 0.32, [zSign * 0.09], spec.exhaustNuts, spec.boreSpacing * 0.55),
        torque: { min: 20, max: 30 },
        notes: `${spec.exhaustNuts} nuts on studs along the ${side} exhaust flange.`,
      }),
    ],
  })
}

function serviceParts(spec: VeeEngineSpec) {
  const count = spec.cylindersPerBank * 2
  return [
    part({
      id: 'water-pump',
      displayName: 'Water pump',
      category: 'Cooling',
      system: 'cooling',
      summary: 'The belt-driven pump that circulates coolant through both banks.',
      description: `The water pump sits on the front of the ${spec.model}. A pulley turns an impeller. Coolant from the lower radiator hose is pushed into both banks, then back to the radiator. A weep hole under the pulley is there to show a seal leak early.`,
      whatItDoes: 'It keeps coolant moving so heat from both banks can leave at the radiator.',
      howItWorks: [
        'The accessory belt turns the pulley a little faster than the crank.',
        'The impeller pushes coolant into the block jackets.',
        'Coolant returns from the radiator through the lower hose.',
      ],
      howItMoves: 'The pulley and impeller spin with the accessory belt, a bit faster than the crank. The housing stays still.',
      whereItLives: 'Low on the front of the engine, on the accessory drive.',
      keyNumbers: [
        { label: 'Drive', value: 'Serpentine belt' },
        { label: 'Banks served', value: '2' },
      ],
      warningSigns: [
        'A coolant drip from the weep hole under the pulley.',
        'A temperature gauge that climbs in traffic.',
      ],
      difficulty: 3,
      estimatedTime: '2–3 hours',
      tools: ['drain pan', 'belt tool', 'torque wrench'],
      steps: [
        'Drain the coolant when the engine is cold.',
        'Release the belt, unbolt the pump, and fit a new gasket.',
      ],
      maintenance: [
        'Check the weep hole when you change the belt.',
        'Replace the pump if the bearing growls. Do not wait for the seal to empty the system.',
      ],
      safetyNote: 'Coolant is under pressure when the engine is hot. Open the cap only after it has cooled.',
      explodeOffset: [-0.16, 0.06, 0.08],
      assemblyOrder: 160,
      assemblyLabel: 'Bolt the water pump to the front cover',
      layers: [
        layer('housing', 'Pump housing', 'The aluminum body that holds the impeller and the seal.', [0, 0, 0], 1, 'Set the pump housing on a new gasket'),
        layer('impeller', 'Impeller', 'The spinning wheel that moves the coolant.', [0.04, 0, 0], 2, 'The impeller stays inside the housing'),
        layer('pulley', 'Pulley', 'The wheel the accessory belt drives.', [-0.04, 0, 0], 3, 'Bolt the pulley on after the belt path is clear'),
      ],
    }),
    part({
      id: 'oil-filter',
      displayName: 'Oil filter',
      category: 'Lubrication',
      system: 'engine',
      summary: 'The spin-on canister that strains the oil for both banks.',
      description: `The oil filter is a steel canister on the side of the ${spec.model}. Oil from the pump passes through the element before it reaches the crank and the two heads. A gasket at the base keeps the joint dry. This is a generic canister, sized for a ${spec.liters} teaching engine.`,
      whatItDoes: 'It catches grit before the oil reaches the bearings and the cams.',
      howItWorks: [
        'The pump pushes oil into the filter.',
        'The element holds the grit and lets the oil through.',
        'A bypass inside opens if the element clogs, so the engine still gets oil.',
      ],
      whereItLives: 'On the side of the block, within reach from above or below.',
      keyNumbers: [
        { label: 'Style', value: 'Spin-on' },
        { label: 'Gasket', value: '1' },
      ],
      warningSigns: [
        'A low oil-pressure light that flickers just after a filter change.',
        'Oil wetness around the canister base.',
      ],
      difficulty: 1,
      estimatedTime: '20–40 minutes',
      tools: ['filter wrench', 'drain pan'],
      steps: [
        'Drain or catch the oil that spills when the canister comes off.',
        'Oil the new gasket, spin the filter on by hand, and check for leaks after startup.',
      ],
      maintenance: [
        'Replace the filter with every oil change.',
        'Do not use a tool to tighten it. Hand tight plus a quarter turn is enough.',
      ],
      explodeOffset: [0.08, -0.04, -0.18],
      assemblyOrder: 170,
      assemblyLabel: 'Spin the oil filter onto its stud',
      layers: [
        layer('canister', 'Canister', 'The steel shell of the spin-on filter.', [0, 0, -0.02], 1, 'Thread the canister on by hand'),
        layer('element', 'Element', 'The paper pack inside the canister.', [0, 0, 0], 2, 'The element is sealed inside the canister'),
        layer('gasket', 'Gasket', 'The rubber ring that seals the filter to the block.', [0, 0, 0.04], 3, 'Oil the gasket before it seats'),
      ],
    }),
    part({
      id: 'spark-plugs',
      displayName: 'Spark plugs',
      category: 'Ignition',
      system: 'ignition',
      summary: `${count} plugs, one in each cylinder of both banks.`,
      description: `Each cylinder of this ${spec.model} has one spark plug, ${count} in all. The shell threads into the head. The ceramic insulator keeps the high voltage off the casting. The electrode sits in the chamber and lights the mixture. Plugs on the two banks are the same part in this teaching engine.`,
      whatItDoes: 'They light the mixture at the start of each power stroke.',
      howItWorks: [
        'The coil sends a high-voltage pulse down the boot.',
        'The spark jumps the gap at the electrode.',
        'The shell carries the heat out into the head.',
      ],
      whereItLives: 'Threaded into each head, under the coils.',
      keyNumbers: [
        { label: 'Plugs', value: String(count) },
        { label: 'Per cylinder', value: '1' },
      ],
      warningSigns: [
        'A stumble under load that clears if you lift off the throttle.',
        'A plug that comes out sooty, oily, or chalk-white.',
      ],
      difficulty: 2,
      estimatedTime: '1–2 hours',
      tools: ['spark-plug socket', 'torque wrench', 'gap gauge'],
      steps: [
        'Pull one coil at a time so the plugs do not get mixed up.',
        'Gap the new plugs, start them by hand, and tighten them to a light torque.',
      ],
      maintenance: [
        'Replace the set together so both banks age the same way.',
        'A little anti-seize on the threads helps the next removal. Keep it off the electrode.',
      ],
      explodeOffset: [0, 0.28, 0],
      assemblyOrder: 180,
      assemblyLabel: 'Thread a plug into each cylinder',
      layers: [
        layer('shell', 'Shells', `The threaded metal bodies, ${count} of them.`, [0, 0.02, 0], 1, 'Start each plug by hand'),
        layer('insulator', 'Insulators', 'The ceramic necks that keep the spark off the head.', [0, 0.05, 0], 2, 'The insulator is part of the plug'),
        layer('electrode', 'Electrodes', 'The gaps where the spark jumps, one per cylinder.', [0, -0.03, 0], 3, 'Check the gap before the plug goes in'),
      ],
    }),
    part({
      id: 'ignition-coils',
      displayName: 'Ignition coils',
      category: 'Ignition',
      system: 'ignition',
      summary: `One coil pack per cylinder, ${count} in total.`,
      description: `This ${spec.model} uses a coil on each plug, ${count} coils across both banks. Each coil turns battery voltage into the pulse that plug needs. A rubber boot joins the coil to the plug. The engine computer decides which coil fires, following the order ${spec.firingLabel}.`,
      whatItDoes: 'They make the high-voltage spark for each cylinder.',
      howItWorks: [
        'The computer grounds a coil at the right moment in the cycle.',
        'The coil builds a short high-voltage pulse.',
        'The boot carries that pulse to one plug and nowhere else.',
      ],
      whereItLives: 'On top of the valve covers, one over each plug.',
      keyNumbers: [
        { label: 'Coils', value: String(count) },
        { label: 'Firing order', value: spec.firingLabel },
      ],
      warningSigns: [
        'A misfire that follows one cylinder and sets a coil code.',
        'A cracked boot that arcs to the cover on a damp morning.',
      ],
      difficulty: 1,
      estimatedTime: '30–90 minutes',
      tools: ['socket set', 'dielectric grease'],
      steps: [
        'Unplug the connector, then pull the coil straight off the plug.',
        'A dab of dielectric grease inside the new boot keeps moisture out.',
      ],
      maintenance: [
        'Replace a boot that is torn. The coil itself often outlasts it.',
        'Swap coils between cylinders only as a test, then put the failed one back on the cylinder that misfires.',
      ],
      explodeOffset: [0, 0.4, 0],
      assemblyOrder: 190,
      assemblyLabel: 'Press a coil onto each plug',
      layers: [
        layer('body', 'Coil bodies', `The plastic housings, one for each of the ${count} cylinders.`, [0, 0.03, 0], 1, 'Set each coil over its plug'),
        layer('boot', 'Boots', 'The rubber sleeves that seal the coil to the plug.', [0, -0.03, 0], 2, 'Seat the boot on the insulator'),
      ],
    }),
    part({
      id: 'starter',
      displayName: 'Starter',
      category: 'Electrical',
      system: 'electrical',
      summary: 'The motor that turns the flywheel until the engine fires.',
      description: `The starter is a small electric motor bolted low at the rear of the ${spec.model}, next to the flywheel. A solenoid pushes a pinion into the ring gear when you turn the key. Once the engine is running, the pinion withdraws. It does not care that the engine is a V. It only has to spin the crank.`,
      whatItDoes: 'It cranks the engine until combustion takes over.',
      howItWorks: [
        'The solenoid closes the high-current contacts and slides the pinion forward.',
        'The motor turns the flywheel.',
        'When you release the key, the pinion springs back.',
      ],
      whereItLives: 'Low at the rear of the block, meshed with the flywheel.',
      keyNumbers: [
        { label: 'Drive', value: 'Pinion' },
        { label: 'Engages', value: 'Flywheel' },
      ],
      warningSigns: [
        'A single click and no crank.',
        'A grinding noise as the pinion tries to meet the ring gear.',
      ],
      difficulty: 3,
      estimatedTime: '1–3 hours',
      tools: ['jack and stand', 'socket set', 'multimeter'],
      steps: [
        'Disconnect the battery negative before the starter cables come off.',
        'Support the starter as the last bolt comes out. It is heavier than it looks.',
      ],
      maintenance: [
        'Keep the cable ends clean and tight.',
        'A slow crank can be the battery. Test that before you replace the starter.',
      ],
      safetyNote: 'The starter cable is unfused and live. Disconnect the battery first.',
      explodeOffset: [0.16, -0.06, -0.12],
      assemblyOrder: 200,
      assemblyLabel: 'Bolt the starter to the bell housing',
      layers: [
        layer('housing', 'Motor housing', 'The steel body of the starter motor.', [0, 0, 0], 1, 'Hang the starter on its bolts'),
        layer('solenoid', 'Solenoid', 'The cylinder that throws the pinion and closes the contacts.', [0, 0.04, 0], 2, 'The solenoid is part of the starter'),
        layer('pinion', 'Pinion', 'The small gear that meets the flywheel.', [0.06, 0, 0], 3, 'Check that the pinion meets the ring gear'),
      ],
    }),
    part({
      id: 'alternator',
      displayName: 'Alternator',
      category: 'Electrical',
      system: 'electrical',
      summary: 'The belt-driven generator that charges the battery.',
      description: `The alternator hangs on the front drive of the ${spec.model}. The belt turns a rotor inside a stator. The output is direct current after the rectifier, enough to run the coils and put charge back in the battery. A small pulley overdrives it so it still charges at idle.`,
      whatItDoes: 'It supplies the electrical load and recharges the battery.',
      howItWorks: [
        'The belt turns the pulley faster than the crank.',
        'The spinning rotor induces current in the stator.',
        'Diodes turn that current into the direct current the car uses.',
        'A regulator holds the voltage in a narrow band.',
      ],
      howItMoves: 'The pulley and the rotor spin with the belt, faster than the crank. The housing is bolted still.',
      whereItLives: 'High on the front of the engine, on the accessory belt.',
      keyNumbers: [
        { label: 'Drive', value: 'Serpentine belt' },
        { label: 'Output', value: 'Charging voltage' },
      ],
      warningSigns: [
        'A battery light that stays on after startup.',
        'A whine from the front that follows engine speed.',
      ],
      difficulty: 2,
      estimatedTime: '1–2 hours',
      tools: ['belt tool', 'multimeter', 'socket set'],
      steps: [
        'Release the belt tension before the alternator bolts come out.',
        'Move the battery negative aside so the output stud cannot arc.',
      ],
      maintenance: [
        'A glazed belt slips and undercharges. Replace the belt with the tensioner if it is tired.',
        'Check charging voltage if the battery keeps going flat.',
      ],
      explodeOffset: [-0.12, 0.12, 0.18],
      assemblyOrder: 210,
      assemblyLabel: 'Hang the alternator on its bracket',
      layers: [
        layer('housing', 'Housing', 'The aluminum case and the cooling slots.', [0, 0, 0], 1, 'Bolt the housing to the bracket'),
        layer('pulley', 'Pulley', 'The alternator wheel the accessory belt overdrives.', [-0.05, 0, 0], 2, 'Fit the pulley if it came off with the old unit'),
        layer('rotor', 'Rotor', 'The spinning magnet inside the stator.', [0.02, 0, 0], 3, 'The rotor stays inside the housing'),
      ],
    }),
    part({
      id: 'serpentine-belt',
      displayName: 'Accessory belt',
      category: 'Drive',
      system: 'engine',
      summary: 'The front belt that turns the pump and the alternator.',
      description: `One belt on the front of the ${spec.model} loops the crank pulley, the water pump, an idler, and the alternator. It is separate from the timing chains. If this belt breaks, the engine can still turn its cams, but it will overheat and stop charging. A tensioner keeps the slack side quiet.`,
      whatItDoes: 'It drives the accessories from the crank.',
      howItWorks: [
        'The crank pulley pulls the belt once per revolution.',
        'The pump and the alternator take their speed from their pulley sizes.',
        'The tensioner takes up stretch so the belt does not slip.',
      ],
      howItMoves: 'The belt tracks at crank speed. The idler and the driven pulleys spin with it. The tensioner body stays put unless it is the spring-loaded kind.',
      whereItLives: 'On the very front of the engine, outside the timing cover.',
      keyNumbers: [
        { label: 'Driven parts', value: 'Pump and alternator' },
        { label: 'Separate from', value: 'Timing chains' },
      ],
      warningSigns: [
        'A chirp at startup that fades as the belt warms.',
        'Cracks across the ribs, or a glaze that looks shiny.',
      ],
      difficulty: 2,
      estimatedTime: '30–90 minutes',
      tools: ['belt tool', 'torque wrench'],
      steps: [
        'Note the belt path, or photograph it, before the tensioner is released.',
        'Route the new belt rib-side in and tension it last.',
      ],
      maintenance: [
        'Replace the belt on age as well as miles.',
        'If the tensioner wobbles, replace it with the belt.',
      ],
      explodeOffset: [-0.22, 0.08, -0.1],
      assemblyOrder: 220,
      assemblyLabel: 'Route the accessory belt',
      layers: [
        layer('belt', 'Belt', 'The ribbed belt around the front pulleys.', [-0.04, 0, 0], 1, 'Seat the belt on the pulleys'),
        layer('tensioner', 'Tensioner', 'The arm that takes up slack.', [-0.02, 0.04, -0.04], 2, 'Set the tensioner against the belt'),
        layer('idler', 'Idler', 'The smooth pulley that turns a corner in the belt path.', [0, 0, -0.04], 3, 'Spin the idler and listen for a dry bearing'),
      ],
    }),
    part({
      id: 'air-filter',
      displayName: 'Air filter',
      category: 'Intake',
      system: 'fuel-air',
      summary: 'The box that cleans air on its way to the valley plenum.',
      description: `The air filter is a plastic box beside the ${spec.model}. Air passes through a pleated element, then a duct drops into the valley plenum. A dirty element leans out the mixture and makes both banks work harder for the same air. The box is a generic shape, not a branded airbox.`,
      whatItDoes: 'It keeps grit out of the intake and both banks of cylinders.',
      howItWorks: [
        'Air enters the housing and crosses the element.',
        'The duct carries the cleaned air to the plenum in the V.',
        'The lid clamps the element so air cannot sneak around it.',
      ],
      whereItLives: 'Beside the engine, with a duct aimed at the valley intake.',
      keyNumbers: [
        { label: 'Element', value: '1' },
        { label: 'Feeds', value: 'Valley plenum' },
      ],
      warningSigns: [
        'A filter that looks grey and packed when you open the lid.',
        'A whistle if the duct has come off the plenum.',
      ],
      difficulty: 1,
      estimatedTime: '10–20 minutes',
      tools: ['screwdriver'],
      steps: [
        'Release the clips and lift the lid. Note which way the element faces.',
        'Drop the new element in the same way and close the lid until the clips click.',
      ],
      maintenance: [
        'Check the element at every oil change.',
        'Do not oil a dry paper element. It is not that kind of filter.',
      ],
      explodeOffset: [0.06, 0.16, 0.28],
      assemblyOrder: 230,
      assemblyLabel: 'Set the air box and connect the duct',
      layers: [
        layer('housing', 'Housing', 'The plastic box that holds the element.', [0, 0.02, 0], 1, 'Bolt the housing in place'),
        layer('element', 'Element', 'The pleated filter the air has to cross.', [0, 0.04, 0], 2, 'Drop the element in the housing'),
        layer('duct', 'Duct', 'The hose from the box down to the valley plenum.', [0, -0.04, -0.06], 3, 'Push the duct onto the plenum'),
      ],
    }),
    part({
      id: 'radiator',
      displayName: 'Radiator',
      category: 'Cooling',
      system: 'cooling',
      summary: 'The heat exchanger in front of the engine, with its fan and hoses.',
      description: `The radiator sits ahead of the ${spec.model}. Hot coolant from both banks enters the top tank, crosses a stack of fins, and leaves the bottom tank cooler. A fan pulls air through the fins when the car is not moving. Upper and lower hoses join the radiator to the engine. This is a generic cooler sized for about ${spec.liters}.`,
      whatItDoes: 'It dumps the heat the coolant collected in the banks.',
      howItWorks: [
        'Hot coolant arrives in the top tank.',
        'Thin passages spread that heat into the fins, and air carries it away.',
        'The fan spins when ram air is not enough.',
        'The lower hose returns the cooled liquid to the water pump.',
      ],
      howItMoves: 'The fan spins on an electric motor when the engine asks for it. The core and the tanks stay still. Coolant moves inside the hoses.',
      whereItLives: 'At the front of the bay, ahead of the crank pulley.',
      keyNumbers: [
        { label: 'Tanks', value: '2' },
        { label: 'Fan', value: '1' },
        { label: 'Hoses', value: '2' },
        { label: 'Serves', value: spec.liters },
      ],
      warningSigns: [
        'A temperature gauge that climbs in traffic and falls on the highway.',
        'Sweet-smelling steam, or a puddle of coolant under the front.',
      ],
      difficulty: 3,
      estimatedTime: '2–4 hours',
      tools: ['drain pan', 'hose-clamp pliers', 'socket set'],
      steps: [
        'Drain the system only after the engine is cold.',
        'Move the fan shroud aside, disconnect both hoses, and lift the radiator straight up.',
      ],
      maintenance: [
        'Keep the fins clear of leaves. Bent fins still work if air can pass.',
        'Replace a hose that is soft or cracked. Do not wait for it to split.',
      ],
      safetyNote: 'The cooling system is pressurized and hot. Open the cap only when the engine is cold.',
      explodeOffset: [-0.42, 0.04, 0],
      assemblyOrder: 240,
      assemblyLabel: 'Drop the radiator into its cradle',
      layers: [
        layer('tanks', 'Tanks', 'The plastic end tanks that collect coolant above and below the core.', [0, 0.04, 0], 1, 'The tanks are part of the radiator'),
        layer('core', 'Core', 'The fin stack that hands heat to the air.', [0, 0, 0], 2, 'Lower the core into the cradle'),
        layer('fan', 'Fan', 'The electric fan that pulls air through the fins at low speed.', [0.06, 0, 0], 3, 'Bolt the fan and its shroud to the core'),
        layer('hoses', 'Hoses', 'The upper and lower hoses between the radiator and the engine.', [0.08, 0, 0.04], 4, 'Clamp the hoses once the radiator is seated'),
      ],
    }),
    part({
      id: 'battery',
      displayName: 'Battery',
      category: 'Electrical',
      system: 'electrical',
      summary: 'The 12-volt store that cranks the engine and feeds the coils.',
      description: `The battery sits beside the ${spec.model} in a tray, held down by a clamp. It stores the energy the starter needs and smooths the alternator’s output. Two posts, negative and positive, leave the top. The case is plastic. The plates inside are lead. Nothing about the V layout changes how the battery works.`,
      whatItDoes: 'It cranks the engine and feeds the electrical system when the alternator is not charging.',
      howItWorks: [
        'The starter draws a large current for a few seconds.',
        'The alternator puts that charge back once the engine is running.',
        'The hold-down keeps the case from bouncing on its posts.',
        'A discharged battery still shows voltage. Load is what tells you it is tired.',
      ],
      whereItLives: 'In a tray beside the engine, cables running to the starter and the body.',
      keyNumbers: [
        { label: 'Voltage', value: '12', unit: 'V' },
        { label: 'Posts', value: '2' },
      ],
      warningSigns: [
        'A slow crank on a cold morning.',
        'Corrosion, pale and crusty, on a post.',
      ],
      difficulty: 1,
      estimatedTime: '20–40 minutes',
      tools: ['wrenches', 'terminal brush', 'memory saver'],
      steps: [
        'Take the negative cable off first, and put it back last.',
        'Lift the battery straight up. Do not tip it. Acid lives inside.',
        'Clean the tray before the new battery goes in.',
        'Tighten the hold-down so the case cannot shift, without crushing the lid.',
      ],
      maintenance: [
        'Keep the posts clean and the hold-down tight.',
        'If the car sits, a tender is kinder than a series of jump starts.',
      ],
      safetyNote: 'Disconnect the negative cable first. A wrench on the positive post can weld itself to the body if it touches metal.',
      explodeOffset: [0.08, 0.08, 0.36],
      assemblyOrder: 250,
      assemblyLabel: 'Set the battery in its tray',
      layers: [
        layer('case', 'Case', 'The plastic box that holds the plates and the acid.', [0, 0, 0], 1, 'Lower the case into the tray'),
        layer('terminals', 'Terminals', 'The two lead posts, negative and positive.', [0, 0.05, 0], 2, 'Clean and tighten the cable clamps'),
        layer('hold-down', 'Hold-down', 'The clamp and rods that keep the battery from moving.', [0, 0.08, 0], 3, 'Fit the hold-down without crushing the case'),
      ],
    }),
  ]
}

function title(side: string): string {
  return side.charAt(0).toUpperCase() + side.slice(1)
}

function along(axis: Vec3, distance: number): Vec3 {
  return [axis[0] * distance, axis[1] * distance, axis[2] * distance]
}

type PartInput = {
  id: string
  displayName: string
  category: string
  system: string
  summary: string
  description: string
  whatItDoes: string
  howItWorks: string[]
  howItMoves?: string
  whereItLives: string
  keyNumbers: { label: string; value: string; unit?: string }[]
  warningSigns: string[]
  difficulty: number
  estimatedTime: string
  tools: string[]
  steps: string[]
  maintenance: string[]
  safetyNote?: string
  funFact?: string
  explodeOffset: Vec3
  assemblyOrder: number
  assemblyLabel: string
  layers: LayerInput[]
  fasteners?: ReturnType<typeof fastener>[]
}

function part(input: PartInput) {
  return input
}
