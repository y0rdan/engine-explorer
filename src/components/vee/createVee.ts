import {
  BufferGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
} from 'three'
import type { EngineRecord } from '../../engine/schema.ts'
import type { Vec3 } from '../../engine/layout.ts'
import type { EngineLayout } from '../../engine/layout.ts'
import { bankFrame, layoutVee, type VeeCylinder, type VeeLayout } from '../../engine/veeLayout.ts'
import { beveledBox, block, groovedPulley, merged, solid, translate, tube } from '../inline4/geometry.ts'
import {
  boltLabelCount,
  createBoltLabels,
  createFastenerField,
  createFloor,
  createStand,
  createTray,
  pedestalRadius,
} from '../inline4/createInline4.ts'
import type { MaterialKind } from '../inline4/materials.ts'
import { ribTexture } from '../inline4/textures.ts'

const up = new Vector3(0, 1, 0)
const dummy = new Object3D()
const aim = new Quaternion()

function tagged(geometry: BufferGeometry, kind: MaterialKind, clip = false): Mesh {
  const mesh = new Mesh(geometry)
  mesh.userData.kind = kind
  mesh.userData.clip = clip
  return mesh
}

function part(id: string, position: Vec3, children: Object3D[]): Group {
  const group = new Group()
  group.name = `part:${id}`
  group.position.set(position[0], position[1], position[2])
  for (const child of children) group.add(child)
  return group
}

function layer(partId: string, id: string, children: Object3D[]): Group {
  const group = new Group()
  group.name = `layer:${partId}:${id}`
  for (const child of children) group.add(child)
  return group
}

function instances(geometry: BufferGeometry, places: { position: Vec3; rotation?: Quaternion }[], kind: MaterialKind, clip = false): InstancedMesh {
  const mesh = new InstancedMesh(geometry, new MeshStandardMaterial(), Math.max(places.length, 1))
  mesh.userData.kind = kind
  mesh.userData.clip = clip
  mesh.count = places.length
  places.forEach((place, index) => {
    dummy.position.set(place.position[0], place.position[1], place.position[2])
    dummy.quaternion.copy(place.rotation ?? aim.identity())
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}

function boreQuat(cylinder: VeeCylinder): Quaternion {
  return aim.setFromUnitVectors(up, new Vector3(cylinder.boreAxis[0], cylinder.boreAxis[1], cylinder.boreAxis[2])).clone()
}

function alongBore(layout: VeeLayout, cylinder: VeeCylinder, distance: number): Vec3 {
  return [
    cylinder.x + cylinder.boreAxis[0] * distance,
    layout.crankCenter[1] + cylinder.boreAxis[1] * distance,
    layout.crankCenter[2] + cylinder.boreAxis[2] * distance,
  ]
}

export function createVee(engine: EngineRecord): Group {
  const layout = layoutVee(engine)
  const mirror = layout.cylinders.some((cylinder) => cylinder.crankMirror)
  const spin = mirror ? -1 : 1
  const root = new Group()
  root.name = 'engine-root'
  const powertrain = new Group()
  powertrain.name = 'powertrain'
  const outside = new Group()
  outside.name = 'bay'
  const built = new Set<string>()

  const add = (group: Group, bay = false) => {
    built.add(group.name.slice(5))
    ;(bay ? outside : powertrain).add(group)
  }

  add(buildBlock(layout))
  add(buildCrank(layout, spin))
  add(buildPistons(layout, 'left'))
  add(buildPistons(layout, 'right'))
  add(buildPan(layout))
  add(buildHead(layout, 'left'))
  add(buildHead(layout, 'right'))
  add(buildCams(layout, 'left', spin))
  add(buildCams(layout, 'right', spin))
  add(buildTiming(layout))
  add(buildCover(layout, 'left'))
  add(buildCover(layout, 'right'))
  add(buildIntake(layout))
  add(buildExhaust(layout, 'left'))
  add(buildExhaust(layout, 'right'))
  add(buildBelt(layout, spin))
  add(buildPump(layout, spin))
  add(buildAlternator(layout, spin))
  for (const service of serviceParts(layout, engine)) add(service, service.userData.bay === true)

  for (const item of engine.parts) {
    if (built.has(item.id)) continue
    const anchor = layout.anchors[item.id] ?? [0, layout.crankCenter[1], 0]
    add(
      part(item.id, anchor, [
        layer(item.id, item.layers[0]?.id ?? 'body', [tagged(beveledBox(0.08, 0.06, 0.06, 0.008), 'plastic')]),
        layer(item.id, item.layers[1]?.id ?? 'detail', [tagged(solid({ radiusTop: 0.02, radiusBottom: 0.02, height: 0.02, segments: 8, position: [0, 0.04, 0] }), 'steel')]),
      ]),
      item.id === 'radiator' || item.id === 'battery' || item.id === 'air-filter',
    )
  }

  root.add(powertrain)
  root.add(outside)
  root.add(createFastenerField(engine))
  root.add(createBoltLabels(boltLabelCount(engine)))
  return root
}

export function createVeeShowroom(engine: EngineRecord): Group {
  const layout = layoutVee(engine)
  const standLayout = layout as unknown as EngineLayout
  const showroom = new Group()
  showroom.name = 'showroom'
  showroom.add(createVee(engine))
  showroom.add(createStand(standLayout))
  showroom.add(createFloor(pedestalRadius(standLayout)))
  showroom.add(createTray(standLayout))
  return showroom
}

function buildBlock(layout: VeeLayout): Group {
  const castings = [block(layout.block.size, layout.block.center)]
  for (const bank of layout.banks) castings.push(block(bank.casting.size, bank.casting.center))
  const liner = solid({
    radiusTop: layout.bore * 0.5,
    radiusBottom: layout.bore * 0.5,
    height: layout.deck * 0.62,
    segments: 12,
  })
  const liners = instances(
    liner,
    layout.cylinders.map((cylinder) => ({
      position: alongBore(layout, cylinder, layout.deck * 0.42),
      rotation: boreQuat(cylinder),
    })),
    'steel',
    true,
  )
  return part('engine-block', [0, 0, 0], [
    layer('engine-block', 'skirt', [tagged(merged(castings), 'aluminum', true)]),
    layer('engine-block', 'cylinders', [liners]),
  ])
}

function buildCrank(layout: VeeLayout, spin: number): Group {
  const mirror = spin < 0
  const radius = layout.crankRadius
  const local: BufferGeometry[] = [
    solid({
      radiusTop: 0.014,
      radiusBottom: 0.014,
      height: layout.block.size[0] * 0.92,
      segments: 12,
      rotation: [0, 0, Math.PI / 2],
    }),
  ]
  for (const cylinder of layout.cylinders) {
    const y = Math.cos(cylinder.phase) * radius
    const z = (mirror ? -1 : 1) * Math.sin(cylinder.phase) * radius
    const x = cylinder.journalX
    local.push(
      solid({
        radiusTop: 0.016,
        radiusBottom: 0.016,
        height: 0.028,
        segments: 10,
        rotation: [0, 0, Math.PI / 2],
        position: [x, y, z],
      }),
    )
    local.push(translate(beveledBox(0.018, Math.abs(y) + 0.012, 0.03, 0.003), [x, y / 2, z / 2]))
  }
  const nose = new Group()
  nose.name = 'anchor:crank-nose'
  nose.userData.spin = spin
  nose.position.set(layout.crankCenter[0], layout.crankCenter[1], layout.crankCenter[2])
  nose.add(tagged(merged(local), 'steel'))
  const flywheel = new Group()
  flywheel.userData.spin = spin
  flywheel.position.set(layout.block.size[0] / 2 - 0.02, layout.crankCenter[1], 0)
  flywheel.add(tagged(solid({ radiusTop: 0.11, radiusBottom: 0.11, height: 0.02, segments: 18, rotation: [0, 0, Math.PI / 2] }), 'iron'))
  return part('crankshaft', [0, 0, 0], [
    layer('crankshaft', 'shaft', [nose]),
    layer('crankshaft', 'flywheel', [flywheel]),
  ])
}

function buildPistons(layout: VeeLayout, side: 'left' | 'right'): Group {
  const bank = layout.banks.find((item) => item.id === side)
  const cylinders = bank?.cylinders ?? []
  const piston = solid({
    radiusTop: layout.bore * 0.46,
    radiusBottom: layout.bore * 0.46,
    height: layout.wristToCrown + 0.02,
    segments: 12,
    position: [0, layout.wristToCrown * 0.45, 0],
  })
  const pistons = instances(
    piston,
    cylinders.map((cylinder) => ({ position: alongBore(layout, cylinder, layout.rodLength), rotation: boreQuat(cylinder) })),
    'aluminum',
    true,
  )
  pistons.userData.role = 'pistons'
  pistons.userData.cylinderIndices = cylinders.map((cylinder) => cylinder.index)
  const rod = solid({ radiusTop: 0.008, radiusBottom: 0.008, height: layout.rodLength, segments: 8 })
  const rods = instances(
    rod,
    cylinders.map((cylinder) => ({ position: alongBore(layout, cylinder, layout.rodLength / 2) })),
    'steel',
  )
  rods.userData.role = 'rods'
  rods.userData.cylinderIndices = cylinders.map((cylinder) => cylinder.index)
  const glows = cylinders.map((cylinder) => {
    const mesh = new Mesh(solid({ radiusTop: 0.016, radiusBottom: 0.016, height: 0.02, segments: 8 }))
    mesh.userData.glow = cylinder.index
    mesh.visible = false
    mesh.material = new MeshBasicMaterial({ color: '#ff6a2c', transparent: true, opacity: 0, depthWrite: false })
    return mesh
  })
  return part(`pistons-${side}`, [0, 0, 0], [
    layer(`pistons-${side}`, 'pistons', [pistons, ...glows]),
    layer(`pistons-${side}`, 'rods', [rods]),
  ])
}

function buildPan(layout: VeeLayout): Group {
  return part('oil-pan', [0, 0, 0], [
    layer('oil-pan', 'pan', [tagged(block(layout.pan.size, layout.pan.center), 'steel', true)]),
    layer('oil-pan', 'plug', [
      tagged(
        solid({
          radiusTop: 0.012,
          radiusBottom: 0.012,
          height: 0.012,
          segments: 6,
          position: [0.04, layout.pan.center[1] - layout.pan.size[1] / 2, 0],
        }),
        'zinc',
      ),
    ]),
  ])
}

function buildHead(layout: VeeLayout, side: 'left' | 'right'): Group {
  const bank = layout.banks.find((item) => item.id === side)
  if (!bank) return part(`cylinder-head-${side}`, [0, 0, 0], [])
  const id = `cylinder-head-${side}`
  const valves = valveMesh(layout, bank.cylinders, bank.head.center[1])
  return part(id, [0, 0, 0], [
    layer(id, 'casting', [tagged(block(bank.head.size, bank.head.center), 'aluminum', true)]),
    layer(id, 'valves', [valves]),
  ])
}

function valveMesh(layout: VeeLayout, cylinders: readonly VeeCylinder[], restDistance: number): InstancedMesh {
  const stem = solid({ radiusTop: 0.004, radiusBottom: 0.004, height: 0.07, segments: 6, position: [0, 0.02, 0] })
  const specs = cylinders.flatMap((cylinder) =>
    (['intake', 'exhaust'] as const).map((port) => {
      const across = (port === 'intake' ? 0.02 : -0.02) * cylinder.zSign
      const rest = bankFrame(cylinder.beta, restDistance - layout.crankCenter[1], across, cylinder.x, layout.crankCenter[1])
      return { index: cylinder.index, port, x: rest[0], z: rest[2], rest }
    }),
  )
  const mesh = instances(
    stem,
    specs.map((spec) => ({
      position: spec.rest,
      rotation: boreQuat(layout.cylinders[spec.index] ?? cylinders[0]!),
    })),
    'steel',
  )
  mesh.userData.role = 'valves'
  mesh.userData.valveRestY = restDistance
  mesh.userData.valveSpec = specs
  return mesh
}

function buildCams(layout: VeeLayout, side: 'left' | 'right', spin: number): Group {
  const bank = layout.banks.find((item) => item.id === side)
  const id = `camshaft-${side}`
  if (!bank) return part(id, [0, 0, 0], [])
  const shafts = new Group()
  for (const localZ of [bank.camLocalZ, bank.exhaustLocalZ * 0.7]) {
    const center = bankFrame(bank.beta, bank.camLocalY, localZ, 0, layout.crankCenter[1])
    const pieces: BufferGeometry[] = [
      solid({
        radiusTop: 0.011,
        radiusBottom: 0.011,
        height: layout.block.size[0] * 0.84,
        segments: 8,
        rotation: [0, 0, Math.PI / 2],
      }),
    ]
    for (const cylinder of bank.cylinders) {
      pieces.push(
        solid({
          radiusTop: 0.02,
          radiusBottom: 0.011,
          height: 0.012,
          segments: 8,
          rotation: [0, 0, Math.PI / 2],
          position: [cylinder.x, 0.006, 0],
        }),
      )
    }
    const cam = new Group()
    cam.userData.spin = spin * 0.5
    cam.position.set(center[0], center[1], center[2])
    cam.add(tagged(merged(pieces), 'steel'))
    shafts.add(cam)
  }
  return part(id, [0, 0, 0], [
    layer(id, 'shafts', [shafts]),
    layer(id, 'sprockets', []),
  ])
}

function buildTiming(layout: VeeLayout): Group {
  const chains = tagged(merged(layout.timingLoops.map((points) => tube(points, 0.004, 28))), 'steel')
  const cover = tagged(
    block([0.02, layout.block.size[1] * 0.7, layout.block.size[2] * 0.7], [layout.frontX - 0.03, layout.crankCenter[1] + 0.04, 0]),
    'aluminum',
  )
  return part('timing-drive', [0, 0, 0], [
    layer('timing-drive', 'chains', [chains]),
    layer('timing-drive', 'cover', [cover]),
    layer('timing-drive', 'guides', [tagged(beveledBox(0.01, 0.12, 0.02, 0.003).translate(layout.frontX, layout.crankCenter[1] + 0.08, 0.05), 'plastic')]),
  ])
}

function buildCover(layout: VeeLayout, side: 'left' | 'right'): Group {
  const bank = layout.banks.find((item) => item.id === side)
  const id = `valve-cover-${side}`
  if (!bank) return part(id, [0, 0, 0], [])
  return part(id, [0, 0, 0], [
    layer(id, 'cover', [tagged(block(bank.cover.size, bank.cover.center), 'cover', true)]),
    layer(id, 'cap', [
      tagged(
        solid({
          radiusTop: 0.018,
          radiusBottom: 0.016,
          height: 0.016,
          segments: 10,
          position: bank.cover.center,
        }),
        'plastic',
      ),
    ]),
  ])
}

function buildIntake(layout: VeeLayout): Group {
  const runners = layout.cylinders.map((cylinder) => {
    const port = alongBore(layout, cylinder, layout.deck * 0.85)
    return tube([layout.plenum.center, port], 0.01, 6)
  })
  return part('intake-manifold', [0, 0, 0], [
    layer('intake-manifold', 'plenum', [tagged(block(layout.plenum.size, layout.plenum.center), 'plastic')]),
    layer('intake-manifold', 'runners', [tagged(merged(runners), 'plastic')]),
  ])
}

function buildExhaust(layout: VeeLayout, side: 'left' | 'right'): Group {
  const bank = layout.banks.find((item) => item.id === side)
  const id = `exhaust-manifold-${side}`
  if (!bank) return part(id, [0, 0, 0], [])
  const collector = bankFrame(bank.beta, bank.camLocalY * 0.55, bank.exhaustLocalZ * 1.8, 0, layout.crankCenter[1])
  const runners = bank.cylinders.map((cylinder) => tube([alongBore(layout, cylinder, layout.deck * 0.7), collector], 0.012, 5))
  return part(id, [0, 0, 0], [
    layer(id, 'runners', [tagged(merged(runners), 'iron')]),
    layer(id, 'collector', [tagged(solid({ radiusTop: 0.02, radiusBottom: 0.028, height: 0.08, segments: 8, position: collector }), 'heat')]),
  ])
}

function beltMaterial(): MeshStandardMaterial {
  const map = ribTexture()?.clone() ?? null
  if (map) {
    map.repeat.set(18, 1)
    map.needsUpdate = true
  }
  return new MeshStandardMaterial({
    color: '#141618',
    roughness: 0.86,
    metalness: 0,
    ...(map ? { map } : {}),
  })
}

function buildBelt(layout: VeeLayout, spin: number): Group {
  const belt = new Mesh(tube(layout.beltPoints, 0.006, 40))
  belt.material = beltMaterial()
  belt.userData.belt = spin
  return part('serpentine-belt', [0, 0, 0], [
    layer('serpentine-belt', 'belt', [belt]),
    layer('serpentine-belt', 'tensioner', [
      tagged(solid({ radiusTop: 0.02, radiusBottom: 0.02, height: 0.016, segments: 10, rotation: [0, 0, Math.PI / 2], position: layout.idler }), 'steel'),
    ]),
    layer('serpentine-belt', 'idler', [
      tagged(solid({ radiusTop: 0.016, radiusBottom: 0.016, height: 0.012, segments: 10, rotation: [0, 0, Math.PI / 2], position: layout.idler }), 'steel'),
    ]),
  ])
}

function buildPump(layout: VeeLayout, spin: number): Group {
  const anchor = layout.anchors['water-pump'] ?? layout.crankNose
  const pulley = new Group()
  pulley.userData.spin = spin * 1.1
  pulley.add(tagged(groovedPulley(0.04, 0.018, 5), 'steel'))
  return part('water-pump', anchor, [
    layer('water-pump', 'housing', [tagged(solid({ radiusTop: 0.05, radiusBottom: 0.05, height: 0.06, segments: 14, rotation: [0, 0, Math.PI / 2] }), 'aluminum')]),
    layer('water-pump', 'impeller', [tagged(solid({ radiusTop: 0.03, radiusBottom: 0.01, height: 0.02, segments: 8, rotation: [0, 0, Math.PI / 2], position: [0.03, 0, 0] }), 'steel')]),
    layer('water-pump', 'pulley', [pulley]),
  ])
}

function buildAlternator(layout: VeeLayout, spin: number): Group {
  const anchor = layout.anchors.alternator ?? [layout.frontX, layout.crankCenter[1] + 0.14, 0.16]
  const pulley = new Group()
  pulley.userData.spin = spin * 2.4
  pulley.position.set(-0.04, 0, 0)
  pulley.add(tagged(groovedPulley(0.028, 0.014, 4), 'steel'))
  return part('alternator', anchor, [
    layer('alternator', 'housing', [tagged(solid({ radiusTop: 0.048, radiusBottom: 0.048, height: 0.08, segments: 12, rotation: [0, 0, Math.PI / 2] }), 'aluminum')]),
    layer('alternator', 'pulley', [pulley]),
    layer('alternator', 'rotor', [tagged(solid({ radiusTop: 0.028, radiusBottom: 0.028, height: 0.05, segments: 10, rotation: [0, 0, Math.PI / 2] }), 'copper')]),
  ])
}

function serviceParts(layout: VeeLayout, engine: EngineRecord): Group[] {
  const place = (id: string) => layout.anchors[id] ?? [0, layout.crankCenter[1], layout.intakeSign * 0.2]
  const plugs = instances(
    solid({ radiusTop: 0.008, radiusBottom: 0.01, height: 0.04, segments: 8 }),
    layout.cylinders.map((cylinder) => ({
      position: alongBore(layout, cylinder, layout.deck + 0.05),
      rotation: boreQuat(cylinder),
    })),
    'ceramic',
  )
  const coils = instances(
    solid({ radiusTop: 0.012, radiusBottom: 0.012, height: 0.04, segments: 8 }),
    layout.cylinders.map((cylinder) => ({
      position: alongBore(layout, cylinder, layout.deck + 0.09),
      rotation: boreQuat(cylinder),
    })),
    'plastic',
  )
  const starter = part('starter', place('starter'), [
    layer('starter', 'housing', [tagged(solid({ radiusTop: 0.04, radiusBottom: 0.04, height: 0.12, segments: 10, rotation: [0, 0, Math.PI / 2] }), 'steel')]),
    layer('starter', 'solenoid', [tagged(solid({ radiusTop: 0.02, radiusBottom: 0.02, height: 0.06, segments: 8, position: [0, 0.04, 0] }), 'steel')]),
    layer('starter', 'pinion', [tagged(solid({ radiusTop: 0.02, radiusBottom: 0.02, height: 0.02, segments: 8, rotation: [0, 0, Math.PI / 2], position: [0.06, 0, 0] }), 'iron')]),
  ])
  const filter = part('oil-filter', place('oil-filter'), [
    layer('oil-filter', 'canister', [tagged(solid({ radiusTop: 0.034, radiusBottom: 0.034, height: 0.09, segments: 12 }), 'steel')]),
    layer('oil-filter', 'element', [tagged(solid({ radiusTop: 0.026, radiusBottom: 0.026, height: 0.07, segments: 8 }), 'plastic')]),
    layer('oil-filter', 'gasket', [tagged(solid({ radiusTop: 0.03, radiusBottom: 0.03, height: 0.006, segments: 10, position: [0, 0.046, 0] }), 'rubber')]),
  ])
  const air = part('air-filter', place('air-filter'), [
    layer('air-filter', 'housing', [tagged(beveledBox(0.22, 0.1, 0.16, 0.012), 'plastic')]),
    layer('air-filter', 'element', [tagged(beveledBox(0.16, 0.04, 0.12, 0.004), 'plastic')]),
    layer('air-filter', 'duct', [tagged(tube([[0, 0, 0], [0.1, -0.08, -layout.intakeSign * 0.08]], 0.018, 6), 'rubber')]),
  ])
  air.userData.bay = true
  const radiator = part('radiator', place('radiator'), [
    layer('radiator', 'core', [tagged(beveledBox(0.04, 0.28, 0.46, 0.008), 'fin')]),
    layer('radiator', 'fan', [tagged(solid({ radiusTop: 0.08, radiusBottom: 0.08, height: 0.02, segments: 12, rotation: [0, 0, Math.PI / 2], position: [0.04, 0, 0] }), 'plastic')]),
    layer('radiator', 'tanks', [tagged(beveledBox(0.05, 0.3, 0.04, 0.006).translate(0, 0, 0.22), 'plastic')]),
    layer('radiator', 'hoses', [tagged(tube([[0.02, 0.08, 0], [0.16, 0.02, 0]], 0.012, 5), 'rubber')]),
  ])
  radiator.userData.bay = true
  const battery = part('battery', place('battery'), [
    layer('battery', 'case', [tagged(beveledBox(0.2, 0.14, 0.12, 0.008), 'plastic')]),
    layer('battery', 'terminals', [tagged(solid({ radiusTop: 0.012, radiusBottom: 0.012, height: 0.02, segments: 8, position: [0.05, 0.08, 0] }), 'lead')]),
    layer('battery', 'hold-down', [tagged(beveledBox(0.18, 0.012, 0.02, 0.003).translate(0, 0.08, 0), 'zinc')]),
  ])
  battery.userData.bay = true
  const plugsGroup = part('spark-plugs', [0, 0, 0], [
    layer('spark-plugs', 'shell', [plugs]),
    layer('spark-plugs', 'insulator', []),
    layer('spark-plugs', 'electrode', []),
  ])
  const coilGroup = part('ignition-coils', [0, 0, 0], [
    layer('ignition-coils', 'body', [coils]),
    layer('ignition-coils', 'boot', []),
  ])
  void engine
  return [starter, filter, air, radiator, battery, plugsGroup, coilGroup]
}
