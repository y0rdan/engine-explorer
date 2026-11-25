import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  type Material,
} from 'three'
import { layoutFromEngine, type EngineLayout, type Vec3 } from '../../engine/layout.ts'
import type { EngineRecord, FastenerGroup, FastenerType } from '../../engine/schema.ts'
import { block, groovedPulley, merged, solid, tube, beveledBox, translate } from './geometry.ts'
import type { MaterialKind } from './materials.ts'
import { ribTexture } from './textures.ts'

export type FastenerRecord = {
  partId: string
  fastenerId: string
  index: number
  size: string
  count: number
  name: string
  torqueMin: number
  torqueMax: number
  torqueAngle?: number
  notes: string
  sequence: number
}

const dummy = new Object3D()

export function createInline4(engine: EngineRecord): Group {
  const layout = layoutFromEngine(engine)
  const root = new Group()
  root.name = 'engine-root'
  const powertrain = new Group()
  powertrain.name = 'powertrain'
  powertrain.add(buildBlock(layout))
  powertrain.add(buildCrank(layout))
  powertrain.add(buildPistons(layout))
  powertrain.add(buildPan(layout))
  powertrain.add(buildHead(layout))
  powertrain.add(buildCam(layout))
  powertrain.add(buildTiming(layout))
  powertrain.add(buildCover(layout))
  powertrain.add(buildPump(layout))
  powertrain.add(buildFilter(layout))
  powertrain.add(buildIntake(layout))
  powertrain.add(buildExhaust(layout))
  powertrain.add(buildStarter(layout))
  powertrain.add(buildAlternator(layout))
  powertrain.add(buildBelt(layout))
  powertrain.add(buildPlugs(layout))
  powertrain.add(buildCoils(layout))
  root.add(powertrain)
  root.add(buildAir(layout))
  root.add(buildRadiator(layout))
  root.add(buildBattery(layout))
  root.add(buildFasteners(engine))
  root.add(buildHeadLabels())
  return root
}

export function createStand(layout: EngineLayout): Group {
  const group = new Group()
  group.name = 'engine-stand'
  const length = layout.block.size[0] * 0.62
  const width = layout.block.size[2] * 1.15
  const top = 0.018
  const rails = merged([
    translate(beveledBox(length, 0.012, 0.016, 0.003), [-length * 0.02, top, width / 2]),
    translate(beveledBox(length, 0.012, 0.016, 0.003), [-length * 0.02, top, -width / 2]),
    translate(beveledBox(0.016, 0.012, width, 0.003), [-length / 2, top, 0]),
    translate(beveledBox(0.016, 0.012, width, 0.003), [length / 2 - length * 0.04, top, 0]),
  ])
  const legs = merged(
    [
      [-length / 2, width / 2],
      [length / 2 - length * 0.04, width / 2],
      [-length / 2, -width / 2],
      [length / 2 - length * 0.04, -width / 2],
    ].map(([x, z]) => solid({ radiusTop: 0.007, radiusBottom: 0.009, height: top, segments: 8, position: [x ?? 0, top / 2, z ?? 0] })),
  )
  group.add(tagged(rails, 'iron'))
  group.add(tagged(legs, 'iron'))
  return group
}

export function createFloor(radius: number): Mesh {
  const mesh = new Mesh(
    solid({ radiusTop: radius, radiusBottom: radius, height: 0.012, segments: 40, position: [0, -0.006, 0] }),
    new MeshStandardMaterial({ color: '#3c444c', roughness: 0.72, metalness: 0.08 }),
  )
  mesh.name = 'studio-floor'
  mesh.userData.fixedMaterial = true
  return mesh
}

export function createTray(layout: EngineLayout): Mesh {
  const origin = trayOrigin(layout)
  const mesh = tagged(translate(beveledBox(0.28, 0.012, 0.16, 0.004), origin), 'iron')
  mesh.name = 'parts-tray'
  return mesh
}

export function trayOrigin(layout: EngineLayout): Vec3 {
  return [0.05, 0.02, layout.intakeSign * (layout.block.size[2] / 2 + 0.28)]
}

export function pedestalRadius(layout: EngineLayout): number {
  const reach = Math.max(layout.block.size[0] * 0.85, Math.abs(layout.frontX) + 0.2)
  return Math.min(Math.max(reach, 0.72), 1.15)
}

export function countVisibleDrawables(root: Object3D): number {
  let count = 0
  root.traverse((object) => {
    const mesh = object as Mesh
    if (mesh.visible && (mesh.isMesh || (object as Sprite).isSprite)) count += 1
  })
  return count
}

export function disposeObject(root: Object3D): void {
  const geometries = new Set<BufferGeometry>()
  const materials = new Set<Material>()
  root.traverse((object) => {
    const mesh = object as Mesh
    if (mesh.geometry) geometries.add(mesh.geometry)
    const list = mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : []
    for (const material of list) materials.add(material)
  })
  for (const geometry of geometries) geometry.dispose()
  for (const material of materials) {
    if (material.userData.shared) continue
    const mapped = material as MeshStandardMaterial
    if (mapped.map && mapped.map !== ribTexture()) mapped.map.dispose()
    material.dispose()
  }
}

function buildBlock(layout: EngineLayout): Group {
  const { center, size } = layout.block
  const ribs: BufferGeometry[] = []
  for (let index = 0; index < 5; index += 1) {
    const y = center[1] - size[1] * 0.28 + index * size[1] * 0.12
    ribs.push(translate(beveledBox(size[0] * 0.9, 0.01, 0.014, 0.002), [0, y, size[2] / 2 + 0.004]))
    ribs.push(translate(beveledBox(size[0] * 0.9, 0.01, 0.014, 0.002), [0, y, -size[2] / 2 - 0.004]))
  }
  const body = merged([
    block(size, center),
    translate(beveledBox(0.03, size[1] * 0.7, size[2] * 0.8, 0.004), [layout.frontX + 0.05, center[1], 0]),
    ...ribs,
  ])
  const plugs = merged(
    [-0.12, -0.04, 0.04, 0.12].flatMap((x) => [
      solid({
        radiusTop: 0.015,
        radiusBottom: 0.016,
        height: 0.012,
        segments: 12,
        rotation: [Math.PI / 2, 0, 0],
        position: [x, center[1], -size[2] / 2 - 0.002],
      }),
    ]),
  )
  const liner = solid({
    radiusTop: layout.bore / 2 + 0.004,
    radiusBottom: layout.bore / 2 + 0.004,
    height: size[1] * 0.72,
    segments: 16,
  })
  return part('engine-block', [0, 0, 0], [
    layer('engine-block', 'skirt', [tagged(body, 'aluminum', true), tagged(plugs, 'steel')]),
    layer('engine-block', 'cylinders', [spread(liner, layout.pistonX.map((x) => [x, center[1] + 0.02, 0]), 'steel', true)]),
  ])
}

function buildCrank(layout: EngineLayout): Group {
  const local: BufferGeometry[] = [
    solid({ radiusTop: 0.012, radiusBottom: 0.012, height: layout.block.size[0] * 0.9, segments: 12, rotation: [0, 0, Math.PI / 2] }),
  ]
  const phases = [0, Math.PI, Math.PI, 0]
  phases.forEach((phase, index) => {
    const y = Math.cos(phase) * layout.crankRadius
    const z = Math.sin(phase) * layout.crankRadius
    const x = (layout.pistonX[index] ?? 0) - layout.crankCenter[0]
    local.push(solid({ radiusTop: 0.014, radiusBottom: 0.014, height: 0.03, segments: 10, rotation: [0, 0, Math.PI / 2], position: [x, y, z] }))
    local.push(translate(beveledBox(0.02, Math.max(Math.abs(y), 0.02) + 0.01, 0.034, 0.003), [x, y / 2, z / 2]))
  })
  local.push(
    solid({
      radiusTop: 0.055,
      radiusBottom: 0.055,
      height: 0.02,
      segments: 18,
      rotation: [0, 0, Math.PI / 2],
      position: [layout.frontX - layout.crankCenter[0], 0, 0],
    }),
  )
  const spin = new Group()
  spin.name = 'anchor:crank-nose'
  spin.userData.spin = 1
  spin.add(tagged(merged(local), 'steel'))
  spin.position.set(layout.crankCenter[0], layout.crankCenter[1], layout.crankCenter[2])
  const flywheel = new Group()
  flywheel.userData.spin = 1
  flywheel.position.set(layout.block.size[0] / 2 - 0.02, layout.crankCenter[1], 0)
  flywheel.add(
    tagged(
      merged([
        solid({ radiusTop: 0.105, radiusBottom: 0.105, height: 0.018, segments: 20, rotation: [0, 0, Math.PI / 2] }),
        solid({ radiusTop: 0.09, radiusBottom: 0.09, height: 0.008, segments: 16, rotation: [0, 0, Math.PI / 2], position: [0.012, 0, 0] }),
      ]),
      'iron',
    ),
  )
  return part('crankshaft', [0, 0, 0], [
    layer('crankshaft', 'shaft', [spin]),
    layer('crankshaft', 'flywheel', [flywheel]),
  ])
}

function buildPistons(layout: EngineLayout): Group {
  const piston = solid({
    radiusTop: layout.bore * 0.46,
    radiusBottom: layout.bore * 0.46,
    height: layout.wristToCrown + 0.02,
    segments: 14,
    position: [0, layout.wristToCrown * 0.5, 0],
  })
  const pistons = spread(piston, layout.pistonX.map((x) => [x, layout.crankCenter[1] + layout.rodLength, 0]), 'aluminum', true)
  pistons.userData.role = 'pistons'
  const rod = solid({ radiusTop: 0.007, radiusBottom: 0.007, height: layout.rodLength, segments: 8 })
  const rods = spread(rod, layout.pistonX.map((x) => [x, layout.crankCenter[1] + layout.rodLength / 2, 0]), 'steel')
  rods.userData.role = 'rods'
  const glows = layout.pistonX.map((x, index) => {
    const mesh = tagged(
      solid({ radiusTop: 0.015, radiusBottom: 0.015, height: 0.02, segments: 8, position: [x, 0, 0] }),
      'heat',
    )
    mesh.userData.glow = index
    mesh.visible = false
    mesh.material = new MeshBasicMaterial({ color: '#ff6a2c', transparent: true, opacity: 0, depthWrite: false })
    return mesh
  })
  return part('pistons', [0, 0, 0], [
    layer('pistons', 'pistons', [pistons, ...glows]),
    layer('pistons', 'rods', [rods]),
  ])
}

function buildPan(layout: EngineLayout): Group {
  return part('oil-pan', [0, 0, 0], [
    layer('oil-pan', 'pan', [tagged(block(layout.pan.size, layout.pan.center), 'steel', true)]),
    layer('oil-pan', 'plug', [
      tagged(
        solid({
          radiusTop: 0.01,
          radiusBottom: 0.01,
          height: 0.012,
          segments: 6,
          position: [0.08, layout.pan.center[1] - layout.pan.size[1] / 2, 0],
        }),
        'zinc',
      ),
    ]),
  ])
}

function buildHead(layout: EngineLayout): Group {
  const restY = layout.head.center[1]
  const valves = valveField(layout, restY)
  return part('cylinder-head', [0, 0, 0], [
    layer('cylinder-head', 'casting', [tagged(block(layout.head.size, layout.head.center), 'aluminum', true)]),
    layer('cylinder-head', 'valves', [valves]),
  ])
}

function valveField(layout: EngineLayout, restY: number): InstancedMesh {
  const geometry = solid({ radiusTop: 0.0055, radiusBottom: 0.0055, height: 0.072, segments: 8 })
  const spec: { index: number; port: 'intake' | 'exhaust'; x: number; z: number }[] = []
  layout.pistonX.forEach((x, index) => {
    spec.push({ index, port: 'intake', x, z: layout.intakeSign * 0.028 })
    spec.push({ index, port: 'exhaust', x, z: -layout.intakeSign * 0.028 })
  })
  const mesh = spread(
    geometry,
    spec.map((item) => [item.x, restY, item.z]),
    'steel',
  )
  mesh.userData.role = 'valves'
  mesh.userData.valveRestY = restY
  mesh.userData.valveSpec = spec
  return mesh
}

function buildCam(layout: EngineLayout): Group {
  const camY = layout.head.center[1] + 0.01
  const spin = new Group()
  spin.userData.spin = 0.5
  spin.position.set(0, camY, 0)
  const lobes: BufferGeometry[] = [
    solid({
      radiusTop: 0.01,
      radiusBottom: 0.01,
      height: layout.head.size[0] * 0.92,
      segments: 10,
      rotation: [0, 0, Math.PI / 2],
    }),
  ]
  layout.pistonX.forEach((x) => {
    lobes.push(solid({ radiusTop: 0.014, radiusBottom: 0.014, height: 0.012, segments: 8, position: [x, 0.01, layout.intakeSign * 0.012] }))
    lobes.push(solid({ radiusTop: 0.014, radiusBottom: 0.014, height: 0.012, segments: 8, position: [x, -0.008, -layout.intakeSign * 0.012] }))
  })
  spin.add(tagged(merged(lobes), 'steel'))
  const sprocket = new Group()
  sprocket.userData.spin = 0.5
  sprocket.position.set(layout.camSprocket[0], layout.camSprocket[1], layout.camSprocket[2])
  sprocket.add(tagged(solid({ radiusTop: 0.046, radiusBottom: 0.046, height: 0.012, segments: 18, rotation: [0, 0, Math.PI / 2] }), 'steel'))
  return part('camshaft', [0, 0, 0], [
    layer('camshaft', 'shaft', [spin]),
    layer('camshaft', 'sprocket', [sprocket]),
  ])
}

function buildTiming(layout: EngineLayout): Group {
  const belt = new Mesh(tube(layout.timingPoints, 0.006, 48))
  belt.userData.kind = 'rubber'
  belt.userData.belt = 1
  belt.material = beltMaterial()
  const crank = new Group()
  crank.userData.spin = 1
  crank.position.set(layout.crankSprocket[0], layout.crankSprocket[1], layout.crankSprocket[2])
  crank.add(tagged(solid({ radiusTop: 0.024, radiusBottom: 0.024, height: 0.01, segments: 14, rotation: [0, 0, Math.PI / 2] }), 'steel'))
  const tension = tagged(
    solid({
      radiusTop: 0.016,
      radiusBottom: 0.016,
      height: 0.02,
      segments: 10,
      position: [layout.frontX + 0.02, (layout.camSprocket[1] + layout.crankSprocket[1]) / 2, 0.04],
    }),
    'plastic',
  )
  return part('timing-drive', [0, 0, 0], [
    layer('timing-drive', 'belt', [belt, crank]),
    layer('timing-drive', 'tensioner', [tension]),
  ])
}

function buildCover(layout: EngineLayout): Group {
  const top = layout.cover.center[1] + layout.cover.size[1] / 2
  const ribs = Array.from({ length: 6 }, (_, index) =>
    translate(beveledBox(0.012, 0.012, layout.cover.size[2] * 0.72, 0.002), [(index - 2.5) * 0.05, top + 0.004, 0]),
  )
  const plate = translate(beveledBox(0.12, 0.008, 0.06, 0.003), [0, top + 0.006, 0])
  const cap = merged([
    solid({ radiusTop: 0.02, radiusBottom: 0.022, height: 0.018, segments: 14, position: [0.12, top + 0.016, 0] }),
    solid({ radiusTop: 0.024, radiusBottom: 0.024, height: 0.006, segments: 14, position: [0.12, top + 0.008, 0] }),
  ])
  return part('valve-cover', [0, 0, 0], [
    layer('valve-cover', 'cover', [tagged(merged([block(layout.cover.size, layout.cover.center), plate, ...ribs]), 'cover', true)]),
    layer('valve-cover', 'cap', [tagged(cap, 'plastic')]),
  ])
}

function buildPump(layout: EngineLayout): Group {
  const anchor = layout.anchors['water-pump'] ?? [0, 0, 0]
  const pulley = new Group()
  pulley.userData.spin = 1.25
  pulley.add(tagged(translate(groovedPulley(0.038, 0.016, 3), [0.02, 0, 0]), 'steel'))
  const impeller = new Group()
  impeller.userData.spin = 1.25
  impeller.add(tagged(solid({ radiusTop: 0.028, radiusBottom: 0.028, height: 0.012, segments: 10, rotation: [0, 0, Math.PI / 2], position: [0.05, 0, 0] }), 'aluminum'))
  return part('water-pump', anchor, [
    layer('water-pump', 'housing', [tagged(solid({ radiusTop: 0.042, radiusBottom: 0.042, height: 0.05, segments: 16, rotation: [0, 0, Math.PI / 2], position: [0.03, 0, 0] }), 'aluminum')]),
    layer('water-pump', 'impeller', [impeller]),
    layer('water-pump', 'pulley', [pulley]),
  ])
}

function buildFilter(layout: EngineLayout): Group {
  const anchor = layout.anchors['oil-filter'] ?? [0, 0, 0]
  return part('oil-filter', anchor, [
    layer('oil-filter', 'canister', [tagged(solid({ radiusTop: 0.032, radiusBottom: 0.034, height: 0.09, segments: 14, rotation: [Math.PI / 2, 0, 0] }), 'steel')]),
    layer('oil-filter', 'element', [tagged(solid({ radiusTop: 0.02, radiusBottom: 0.02, height: 0.07, segments: 10, rotation: [Math.PI / 2, 0, 0] }), 'gasket')]),
    layer('oil-filter', 'gasket', [tagged(solid({ radiusTop: 0.03, radiusBottom: 0.03, height: 0.008, segments: 12, rotation: [Math.PI / 2, 0, 0], position: [0, 0, 0.046] }), 'gasket')]),
  ])
}

function buildIntake(layout: EngineLayout): Group {
  const sign = layout.intakeSign
  const plenumY = layout.head.center[1] + 0.01
  const plenumZ = sign * (layout.block.size[2] / 2 + 0.07)
  const portZ = sign * layout.block.size[2] * 0.38
  const runners = merged(
    layout.pistonX.map((x) =>
      tube(
        [
          [x, plenumY - 0.01, plenumZ - sign * 0.02],
          [x, (plenumY + layout.deckY) / 2, (plenumZ + portZ) / 2],
          [x, layout.deckY + 0.02, portZ],
        ],
        0.013,
        18,
      ),
    ),
  )
  const plenum = translate(beveledBox(layout.block.size[0] * 0.72, 0.05, 0.07, 0.01), [0, plenumY, plenumZ])
  const railZ = plenumZ + sign * 0.02
  const rail = solid({
    radiusTop: 0.008,
    radiusBottom: 0.008,
    height: layout.block.size[0] * 0.62,
    segments: 8,
    rotation: [0, 0, Math.PI / 2],
    position: [0, plenumY + 0.03, railZ],
  })
  const injectors = merged(
    layout.pistonX.map((x) =>
      solid({
        radiusTop: 0.005,
        radiusBottom: 0.006,
        height: 0.04,
        segments: 8,
        position: [x, plenumY + 0.01, railZ - sign * 0.01],
      }),
    ),
  )
  const throttle = solid({
    radiusTop: 0.02,
    radiusBottom: 0.022,
    height: 0.05,
    segments: 14,
    rotation: [Math.PI / 2, 0, 0],
    position: [-layout.block.size[0] * 0.22, plenumY, plenumZ + sign * 0.04],
  })
  return part('intake-manifold', [0, 0, 0], [
    layer('intake-manifold', 'plenum', [tagged(merged([plenum, rail, injectors, throttle]), 'plastic', true)]),
    layer('intake-manifold', 'runners', [tagged(runners, 'plastic', true)]),
  ])
}

function buildExhaust(layout: EngineLayout): Group {
  const sign = -layout.intakeSign
  const portZ = sign * layout.block.size[2] * 0.42
  const collector: Vec3 = [0.02, layout.deckY - 0.02, sign * (layout.block.size[2] / 2 + 0.1)]
  const runners = merged(
    layout.pistonX.map((x) =>
      paint(
        tube(
          [
            [x, layout.deckY + 0.01, portZ],
            [x * 0.65, layout.deckY - 0.01, portZ + sign * 0.04],
            [collector[0] + x * 0.15, collector[1] + 0.01, collector[2] - sign * 0.02],
            collector,
          ],
          0.012,
          16,
        ),
        '#3a3634',
      ),
    ),
  )
  const collectorGeo = paint(
    solid({ radiusTop: 0.028, radiusBottom: 0.036, height: 0.08, segments: 12, rotation: [0, 0, Math.PI / 2], position: collector }),
    '#6a463c',
  )
  const mesh = tagged(merged([runners, collectorGeo]), 'heat')
  mesh.userData.vertexColors = true
  return part('exhaust-manifold', [0, 0, 0], [
    layer('exhaust-manifold', 'runners', [mesh]),
    layer('exhaust-manifold', 'collector', []),
  ])
}

function buildStarter(layout: EngineLayout): Group {
  const anchor = layout.anchors.starter ?? [0, 0, 0]
  return part('starter', anchor, [
    layer('starter', 'housing', [tagged(solid({ radiusTop: 0.038, radiusBottom: 0.038, height: 0.11, segments: 14, rotation: [0, 0, Math.PI / 2] }), 'steel')]),
    layer('starter', 'solenoid', [tagged(solid({ radiusTop: 0.016, radiusBottom: 0.016, height: 0.06, segments: 10, rotation: [0, 0, Math.PI / 2], position: [0.01, 0.045, 0] }), 'steel')]),
    layer('starter', 'pinion', [tagged(solid({ radiusTop: 0.016, radiusBottom: 0.016, height: 0.018, segments: 8, rotation: [0, 0, Math.PI / 2], position: [0.07, 0, 0] }), 'zinc')]),
  ])
}

function buildAlternator(layout: EngineLayout): Group {
  const anchor = layout.anchors.alternator ?? [0, 0, 0]
  const pulley = new Group()
  pulley.userData.spin = 2.6
  pulley.position.set(-0.055, 0, 0)
  pulley.add(tagged(groovedPulley(0.028, 0.016, 4), 'steel'))
  const rotor = new Group()
  rotor.userData.spin = 2.6
  rotor.add(tagged(solid({ radiusTop: 0.03, radiusBottom: 0.03, height: 0.07, segments: 12, rotation: [0, 0, Math.PI / 2] }), 'copper'))
  return part('alternator', anchor, [
    layer('alternator', 'housing', [tagged(solid({ radiusTop: 0.052, radiusBottom: 0.052, height: 0.09, segments: 16, rotation: [0, 0, Math.PI / 2] }), 'aluminum')]),
    layer('alternator', 'pulley', [pulley]),
    layer('alternator', 'rotor', [rotor]),
  ])
}

function buildBelt(layout: EngineLayout): Group {
  const belt = new Mesh(tube(layout.beltPoints, 0.007, 64))
  belt.userData.kind = 'rubber'
  belt.userData.belt = 1
  belt.material = beltMaterial()
  const idler = new Group()
  idler.userData.spin = 1.4
  idler.position.set(layout.idler[0], layout.idler[1], layout.idler[2])
  idler.add(tagged(groovedPulley(0.022, 0.014, 3), 'steel'))
  return part('serpentine-belt', [0, 0, 0], [
    layer('serpentine-belt', 'belt', [belt]),
    layer('serpentine-belt', 'tensioner', [
      tagged(
        solid({ radiusTop: 0.02, radiusBottom: 0.02, height: 0.02, segments: 10, position: [layout.frontX + 0.01, layout.crankCenter[1] + 0.06, -0.06] }),
        'steel',
      ),
    ]),
    layer('serpentine-belt', 'idler', [idler]),
  ])
}

function buildPlugs(layout: EngineLayout): Group {
  const y = layout.deckY + 0.045
  const places = layout.pistonX.map((x): Vec3 => [x, y, 0])
  return part('spark-plugs', [0, 0, 0], [
    layer('spark-plugs', 'shell', [spread(solid({ radiusTop: 0.008, radiusBottom: 0.008, height: 0.022, segments: 6 }), places, 'zinc')]),
    layer('spark-plugs', 'insulator', [
      spread(solid({ radiusTop: 0.005, radiusBottom: 0.006, height: 0.02, segments: 8 }), places.map((point) => [point[0], point[1] + 0.018, point[2]]), 'ceramic'),
    ]),
    layer('spark-plugs', 'electrode', [
      spread(solid({ radiusTop: 0.002, radiusBottom: 0.002, height: 0.012, segments: 6 }), places.map((point) => [point[0], point[1] - 0.016, point[2]]), 'zinc'),
    ]),
  ])
}

function buildCoils(layout: EngineLayout): Group {
  const y = layout.cover.center[1] + layout.cover.size[1] / 2 + 0.03
  const places = layout.pistonX.map((x): Vec3 => [x, y, 0])
  return part('ignition-coils', [0, 0, 0], [
    layer('ignition-coils', 'body', [spread(translate(beveledBox(0.028, 0.05, 0.028, 0.004), [0, 0, 0]), places, 'plastic')]),
    layer('ignition-coils', 'connector', [
      spread(translate(beveledBox(0.016, 0.012, 0.02, 0.002), [0, 0.032, 0.01]), places, 'plastic'),
    ]),
    layer('ignition-coils', 'boot', [
      spread(solid({ radiusTop: 0.008, radiusBottom: 0.01, height: 0.03, segments: 8 }), places.map((point) => [point[0], point[1] - 0.04, point[2]]), 'rubber'),
    ]),
  ])
}

function buildAir(layout: EngineLayout): Group {
  const anchor = layout.anchors['air-filter'] ?? [0, 0, 0]
  const plenumZ = layout.intakeSign * (layout.block.size[2] / 2 + 0.07)
  const duct = tube(
    [
      [0, -0.02, 0],
      [-anchor[0] * 0.4, (layout.head.center[1] - anchor[1]) * 0.5, (plenumZ - anchor[2]) * 0.5],
      [-anchor[0] + 0.02, layout.head.center[1] + 0.01 - anchor[1], plenumZ - anchor[2]],
    ],
    0.016,
    16,
  )
  return part('air-filter', anchor, [
    layer('air-filter', 'housing', [tagged(beveledBox(0.2, 0.08, 0.14, 0.012), 'plastic')]),
    layer('air-filter', 'element', [tagged(translate(beveledBox(0.16, 0.02, 0.1, 0.004), [0, 0.01, 0]), 'gasket')]),
    layer('air-filter', 'duct', [tagged(duct, 'rubber')]),
  ])
}

function buildRadiator(layout: EngineLayout): Group {
  const anchor = layout.anchors.radiator ?? [0, 0, 0]
  const local = (point: Vec3): Vec3 => [point[0] - anchor[0], point[1] - anchor[1], point[2] - anchor[2]]
  const upperEnd = local([0.02, layout.deckY + 0.03, layout.intakeSign * 0.05])
  const lowerEnd = local(layout.anchors['water-pump'] ?? [0, 0, 0])
  const tanks = merged([
    translate(beveledBox(0.07, 0.045, 0.46, 0.01), [0, 0.19, 0]),
    translate(beveledBox(0.07, 0.045, 0.46, 0.01), [0, -0.19, 0]),
    translate(beveledBox(0.04, 0.36, 0.02, 0.004), [0, 0, 0.22]),
    translate(beveledBox(0.04, 0.36, 0.02, 0.004), [0, 0, -0.22]),
  ])
  const fins = spread(
    translate(beveledBox(0.02, 0.008, 0.4, 0.001), [0, 0, 0]),
    Array.from({ length: 15 }, (_, index) => [0, (index - 7) * 0.022, 0] as Vec3),
    'fin',
  )
  const fan = new Group()
  fan.userData.spin = 1.15
  fan.position.set(0.05, 0, 0)
  const blade = translate(beveledBox(0.008, 0.15, 0.028, 0.002), [0, 0.07, 0])
  const blades = new InstancedMesh(blade, new MeshStandardMaterial(), 7)
  blades.userData.kind = 'plastic'
  for (let index = 0; index < 7; index += 1) {
    dummy.position.set(0, 0, 0)
    dummy.rotation.set((index / 7) * Math.PI * 2, 0, 0)
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    blades.setMatrixAt(index, dummy.matrix)
  }
  fan.add(blades)
  fan.add(tagged(solid({ radiusTop: 0.02, radiusBottom: 0.02, height: 0.02, segments: 10, rotation: [0, 0, Math.PI / 2] }), 'plastic'))
  const upper = tube([[0.03, 0.19, 0], [0.16, 0.22, 0.03], upperEnd], 0.012, 16)
  const lower = tube([[0.03, -0.19, 0], [0.14, -0.08, 0.02], lowerEnd], 0.012, 16)
  const clamps = merged([
    solid({ radiusTop: 0.016, radiusBottom: 0.016, height: 0.01, segments: 8, position: [0.05, 0.19, 0] }),
    solid({ radiusTop: 0.016, radiusBottom: 0.016, height: 0.01, segments: 8, position: [0.05, -0.19, 0] }),
  ])
  return part('radiator', anchor, [
    layer('radiator', 'tanks', [tagged(tanks, 'plastic'), tagged(solid({ radiusTop: 0.016, radiusBottom: 0.018, height: 0.02, segments: 10, position: [0.02, 0.22, 0.12] }), 'zinc')]),
    layer('radiator', 'core', [fins]),
    layer('radiator', 'fan', [fan]),
    layer('radiator', 'hoses', [tagged(upper, 'rubber'), tagged(lower, 'rubber'), tagged(clamps, 'zinc')]),
  ])
}

function buildBattery(layout: EngineLayout): Group {
  const anchor = layout.anchors.battery ?? [0, 0, 0]
  return part('battery', anchor, [
    layer('battery', 'case', [
      tagged(merged([beveledBox(0.2, 0.14, 0.13, 0.008), translate(beveledBox(0.18, 0.012, 0.11, 0.003), [0, 0.072, 0])]), 'plastic'),
    ]),
    layer('battery', 'terminals', [
      spread(solid({ radiusTop: 0.011, radiusBottom: 0.011, height: 0.02, segments: 10 }), [[-0.05, 0.09, 0], [0.05, 0.09, 0]], 'lead'),
    ]),
    layer('battery', 'hold-down', [
      tagged(
        merged([
          translate(beveledBox(0.22, 0.008, 0.016, 0.002), [0, 0.1, 0]),
          solid({ radiusTop: 0.004, radiusBottom: 0.004, height: 0.12, segments: 6, position: [-0.09, 0.04, 0] }),
          solid({ radiusTop: 0.004, radiusBottom: 0.004, height: 0.12, segments: 6, position: [0.09, 0.04, 0] }),
        ]),
        'zinc',
      ),
    ]),
  ])
}

function buildFasteners(engine: EngineRecord): Group {
  const group = new Group()
  group.name = 'fastener-field'
  const byType = new Map<FastenerType, { records: FastenerRecord[]; group: FastenerGroup; partId: string; index: number }[]>()
  for (const part of engine.parts) {
    for (const fastener of part.fasteners) {
      for (let index = 0; index < fastener.count; index += 1) {
        const list = byType.get(fastener.type) ?? []
        list.push({
          records: [],
          group: fastener,
          partId: part.id,
          index,
        })
        byType.set(fastener.type, list)
      }
    }
  }
  for (const [type, items] of byType) {
    const geometry = fastenerGeometry(type)
    const mesh = new InstancedMesh(geometry, new MeshStandardMaterial(), items.length)
    mesh.name = `fasteners:${type}`
    mesh.userData.kind = 'zinc'
    const records: FastenerRecord[] = items.map((item) => ({
      partId: item.partId,
      fastenerId: item.group.id,
      index: item.index,
      size: item.group.size,
      count: item.group.count,
      name: item.group.name,
      torqueMin: item.group.torqueNm.min,
      torqueMax: item.group.torqueNm.max,
      torqueAngle: item.group.torqueNm.angle,
      notes: item.group.notes,
      sequence: item.group.sequence[item.index] ?? item.index + 1,
    }))
    mesh.userData.records = records
    for (let index = 0; index < items.length; index += 1) {
      dummy.position.set(0, -2, 0)
      dummy.scale.setScalar(nominalScale(items[index]?.group.size ?? 'M8'))
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(index, dummy.matrix)
    }
    group.add(mesh)
  }
  return group
}

function buildHeadLabels(): Group {
  const group = new Group()
  group.name = 'bolt-labels'
  if (typeof document === 'undefined') return group
  const numbers = [8, 4, 1, 5, 9, 7, 3, 2, 6, 10]
  for (let index = 0; index < numbers.length; index += 1) {
    const sprite = new Sprite(new SpriteMaterial({ map: numberTexture(numbers[index] ?? index + 1), transparent: true, depthTest: false }))
    sprite.scale.set(0.03, 0.03, 0.03)
    sprite.visible = false
    sprite.userData.labelIndex = index
    sprite.raycast = () => {}
    group.add(sprite)
  }
  return group
}

function fastenerGeometry(type: FastenerType): BufferGeometry {
  if (type === 'nut') return solid({ radiusTop: 0.0072, radiusBottom: 0.0072, height: 0.0055, segments: 6 })
  if (type === 'stud') return solid({ radiusTop: 0.0038, radiusBottom: 0.0038, height: 0.02, segments: 8 })
  const head = solid({
    radiusTop: type === 'screw' ? 0.0068 : 0.0074,
    radiusBottom: type === 'screw' ? 0.0068 : 0.0074,
    height: 0.005,
    segments: type === 'screw' ? 12 : 6,
    position: [0, 0.0025, 0],
  })
  const shank = solid({ radiusTop: 0.0036, radiusBottom: 0.0036, height: 0.016, segments: 8, position: [0, -0.008, 0] })
  return merged([head, shank])
}

function nominalScale(size: string): number {
  const match = /M(\d+(?:\.\d+)?)/.exec(size)
  const nominal = match ? Number(match[1]) : 8
  return nominal / 8
}

function numberTexture(value: number): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const context = canvas.getContext('2d')
  if (!context) return null
  context.clearRect(0, 0, 64, 64)
  context.fillStyle = '#1c2226'
  context.beginPath()
  context.arc(32, 32, 28, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#f2f0ea'
  context.font = '700 32px sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(String(value), 32, 34)
  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

function paint(geometry: BufferGeometry, hex: string): BufferGeometry {
  const color = new Color(hex)
  const count = geometry.getAttribute('position').count
  const colors = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    colors[index * 3] = color.r
    colors[index * 3 + 1] = color.g
    colors[index * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  return geometry
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

function tagged(geometry: BufferGeometry, kind: MaterialKind, clip = false): Mesh {
  const mesh = new Mesh(geometry)
  mesh.userData.kind = kind
  mesh.userData.clip = clip
  return mesh
}

function spread(geometry: BufferGeometry, places: Vec3[], kind: MaterialKind, clip = false): InstancedMesh {
  const mesh = new InstancedMesh(geometry, new MeshStandardMaterial(), places.length)
  mesh.userData.kind = kind
  mesh.userData.clip = clip
  places.forEach((place, index) => {
    dummy.position.set(place[0], place[1], place[2])
    dummy.rotation.set(0, 0, 0)
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
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

export function fastenerHit(object: Object3D, instanceId: number | undefined): FastenerRecord | null {
  const records = object.userData.records as FastenerRecord[] | undefined
  if (!records || instanceId === undefined) return null
  return records[instanceId] ?? null
}
