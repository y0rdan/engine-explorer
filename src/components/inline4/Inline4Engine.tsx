import { RoundedBox } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { CatmullRomCurve3, Quaternion, TubeGeometry, Vector3 } from 'three'
import type { EngineLayout, Vec3 } from '../../engine/layout.ts'
import { layoutFromEngine } from '../../engine/layout.ts'
import { INLINE4_FIRE_ANGLES, INLINE4_PHASES, lobeCenter } from '../../engine/kinematics.ts'
import type { EngineRecord } from '../../engine/schema.ts'
import { Layer, Part, Surface } from './chrome.tsx'
import { ribTexture } from './textures.ts'

function Bolt({ position, rotation }: { position: Vec3; rotation?: Vec3 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.004, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.004, 6]} />
        <Surface kind="zinc" />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.0032, 0.0032, 0.008, 8]} />
        <Surface kind="zinc" />
      </mesh>
    </group>
  )
}

function Strut({
  from,
  to,
  radius,
  kind,
  clip = false,
}: {
  from: Vec3
  to: Vec3
  radius: number
  kind: 'plastic' | 'iron' | 'rubber' | 'steel'
  clip?: boolean
}) {
  const start = new Vector3(...from)
  const end = new Vector3(...to)
  const length = Math.max(start.distanceTo(end), 0.001)
  const mid = start.clone().add(end).multiplyScalar(0.5)
  const direction = end.clone().sub(start).normalize()
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction)
  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <Surface kind={kind} clip={clip} />
    </mesh>
  )
}

function Loop({ points, radius, ratio }: { points: Vec3[]; radius: number; ratio: number }) {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(
      points.map((point) => new Vector3(point[0], point[1], point[2])),
      true,
    )
    return new TubeGeometry(curve, 72, radius, 6, true)
  }, [points, radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  const map = useMemo(() => {
    const texture = ribTexture()
    if (texture) texture.repeat.set(22, 1)
    return texture
  }, [])
  return (
    <mesh geometry={geometry} userData={{ belt: ratio }}>
      <meshStandardMaterial color="#141618" roughness={0.8} metalness={0} map={map ?? undefined} />
    </mesh>
  )
}

function Hose({ points }: { points: Vec3[] }) {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(points.map((point) => new Vector3(point[0], point[1], point[2])))
    return new TubeGeometry(curve, 28, 0.012, 8, false)
  }, [points])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh geometry={geometry}>
      <Surface kind="rubber" />
    </mesh>
  )
}

function XCylinder({
  radius,
  length,
  position,
  kind,
}: {
  radius: number
  length: number
  position?: Vec3
  kind: 'aluminum' | 'steel' | 'iron' | 'plastic' | 'copper' | 'fin'
}) {
  return (
    <mesh position={position} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[radius, radius, length, 18]} />
      <Surface kind={kind} />
    </mesh>
  )
}

export function Inline4Engine({ engine }: { engine: EngineRecord }) {
  const layout = useMemo(() => layoutFromEngine(engine), [engine])
  return (
    <group name="engine-root">
      <Block layout={layout} />
      <Crank layout={layout} />
      <Pistons layout={layout} />
      <OilPan layout={layout} />
      <Head layout={layout} />
      <Cam layout={layout} />
      <Timing layout={layout} />
      <Cover layout={layout} />
      <Pump layout={layout} />
      <OilFilter layout={layout} />
      <Intake layout={layout} />
      <Exhaust layout={layout} />
      <Starter layout={layout} />
      <Alternator layout={layout} />
      <Belt layout={layout} />
      <Plugs layout={layout} />
      <Coils layout={layout} />
      <AirBox layout={layout} />
      <Radiator layout={layout} />
      <Battery layout={layout} />
    </group>
  )
}

function Block({ layout }: { layout: EngineLayout }) {
  const { center, size } = layout.block
  return (
    <Part id="engine-block">
      <Layer id="skirt">
        <RoundedBox args={size} radius={0.012} smoothness={2} position={center}>
          <Surface kind="aluminum" clip />
        </RoundedBox>
        <mesh position={[layout.frontX + 0.045, layout.crankCenter[1], 0]}>
          <boxGeometry args={[0.02, size[1] * 0.72, size[2] * 0.86]} />
          <Surface kind="aluminum" clip />
        </mesh>
        {[-0.08, 0, 0.08].map((y) => (
          <mesh key={y} position={[0, center[1] + y, -size[2] / 2]}>
            <cylinderGeometry args={[0.016, 0.016, 0.01, 12]} />
            <Surface kind="steel" />
          </mesh>
        ))}
      </Layer>
      <Layer id="cylinders">
        {layout.pistonX.map((x) => (
          <mesh key={x} position={[x, center[1] + 0.02, 0]}>
            <cylinderGeometry args={[layout.bore / 2 + 0.004, layout.bore / 2 + 0.004, size[1] * 0.78, 18]} />
            <Surface kind="steel" />
          </mesh>
        ))}
      </Layer>
    </Part>
  )
}

function Crank({ layout }: { layout: EngineLayout }) {
  return (
    <Part id="crankshaft">
      <Layer id="shaft">
        <group position={layout.crankCenter} userData={{ spin: 1 }}>
          <XCylinder radius={0.012} length={layout.block.size[0] * 0.9} kind="steel" />
          {INLINE4_PHASES.map((phase, index) => {
            const y = Math.cos(phase) * layout.crankRadius
            const z = Math.sin(phase) * layout.crankRadius
            const x = layout.pistonX[index] ?? 0
            return (
              <group key={index}>
                <XCylinder radius={0.014} length={0.03} position={[x, y, z]} kind="steel" />
                <mesh position={[x, y / 2, z / 2]}>
                  <boxGeometry args={[0.018, Math.max(Math.abs(y), 0.02) + 0.012, 0.036]} />
                  <Surface kind="steel" />
                </mesh>
              </group>
            )
          })}
          <mesh position={[layout.frontX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.055, 0.055, 0.02, 22]} />
            <Surface kind="steel" />
          </mesh>
        </group>
      </Layer>
      <Layer id="flywheel">
        <group
          position={[layout.block.size[0] / 2 - 0.02, layout.crankCenter[1], 0]}
          userData={{ spin: 1 }}
        >
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.105, 0.105, 0.018, 28]} />
            <Surface kind="iron" />
          </mesh>
          <mesh position={[0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.09, 0.09, 0.008, 24]} />
            <Surface kind="steel" />
          </mesh>
        </group>
      </Layer>
    </Part>
  )
}

function Pistons({ layout }: { layout: EngineLayout }) {
  return (
    <Part id="pistons">
      <Layer id="pistons">
        {layout.pistonX.map((x, index) => (
          <group key={x} userData={{ piston: index }}>
            <mesh position={[0, layout.wristToCrown * 0.5, 0]}>
              <cylinderGeometry args={[layout.bore * 0.46, layout.bore * 0.46, layout.wristToCrown + 0.02, 18]} />
              <Surface kind="aluminum" />
            </mesh>
            <mesh position={[0, layout.wristToCrown + 0.012, 0]} userData={{ glow: index }}>
              <sphereGeometry args={[0.015, 12, 8]} />
              <meshBasicMaterial color="#ff6a2c" transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </Layer>
      <Layer id="rods">
        {layout.pistonX.map((x, index) => (
          <mesh key={x} userData={{ rod: index }}>
            <cylinderGeometry args={[0.007, 0.007, layout.rodLength, 8]} />
            <Surface kind="steel" />
          </mesh>
        ))}
      </Layer>
    </Part>
  )
}

function OilPan({ layout }: { layout: EngineLayout }) {
  return (
    <Part id="oil-pan">
      <Layer id="pan">
        <RoundedBox args={layout.pan.size} radius={0.01} smoothness={2} position={layout.pan.center}>
          <Surface kind="steel" clip />
        </RoundedBox>
      </Layer>
      <Layer id="plug">
        <mesh position={[0.08, layout.pan.center[1] - layout.pan.size[1] / 2, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.012, 6]} />
          <Surface kind="zinc" />
        </mesh>
      </Layer>
    </Part>
  )
}

function Head({ layout }: { layout: EngineLayout }) {
  const restY = layout.head.center[1]
  return (
    <Part id="cylinder-head">
      <Layer id="casting">
        <RoundedBox args={layout.head.size} radius={0.008} smoothness={2} position={layout.head.center}>
          <Surface kind="aluminum" clip />
        </RoundedBox>
        {layout.pistonX.flatMap((x) =>
          [-0.045, 0.045].map((z) => (
            <Bolt key={`${x}-${z}`} position={[x, layout.head.center[1] + layout.head.size[1] / 2, z]} />
          )),
        )}
      </Layer>
      <Layer id="valves">
        {layout.pistonX.map((x, index) => (
          <group key={x}>
            <mesh
              position={[x, restY, layout.intakeSign * 0.028]}
              userData={{ valve: { index, port: 'intake', restY } }}
            >
              <cylinderGeometry args={[0.0055, 0.0055, 0.072, 8]} />
              <Surface kind="steel" />
            </mesh>
            <mesh
              position={[x, restY, -layout.intakeSign * 0.028]}
              userData={{ valve: { index, port: 'exhaust', restY } }}
            >
              <cylinderGeometry args={[0.0055, 0.0055, 0.072, 8]} />
              <Surface kind="steel" />
            </mesh>
          </group>
        ))}
      </Layer>
    </Part>
  )
}

function Cam({ layout }: { layout: EngineLayout }) {
  const camY = layout.head.center[1] + 0.01
  return (
    <Part id="camshaft">
      <Layer id="shaft">
        <group position={[0, camY, 0]} userData={{ spin: 0.5 }}>
          <XCylinder radius={0.01} length={layout.head.size[0] * 0.92} kind="steel" />
          {layout.pistonX.map((x, index) => {
            const fire = INLINE4_FIRE_ANGLES[index] ?? 0
            return (
              <group key={x}>
                <Lobe x={x} z={layout.intakeSign * 0.012} center={lobeCenter(fire, 'intake')} />
                <Lobe x={x} z={-layout.intakeSign * 0.012} center={lobeCenter(fire, 'exhaust')} />
              </group>
            )
          })}
        </group>
      </Layer>
      <Layer id="sprocket">
        <group position={layout.camSprocket} userData={{ spin: 0.5 }}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.046, 0.046, 0.012, 24]} />
            <Surface kind="steel" />
          </mesh>
        </group>
      </Layer>
    </Part>
  )
}

function Lobe({ x, z, center }: { x: number; z: number; center: number }) {
  const reach = 0.016
  return (
    <mesh position={[x, -reach * Math.cos(center), z + reach * Math.sin(center)]}>
      <sphereGeometry args={[0.012, 10, 8]} />
      <Surface kind="steel" />
    </mesh>
  )
}

function Timing({ layout }: { layout: EngineLayout }) {
  return (
    <Part id="timing-drive">
      <Layer id="belt">
        <Loop points={layout.timingPoints} radius={0.006} ratio={1} />
        <group position={layout.crankSprocket} userData={{ spin: 1 }}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.024, 0.024, 0.01, 18]} />
            <Surface kind="steel" />
          </mesh>
        </group>
      </Layer>
      <Layer id="tensioner">
        <mesh position={[layout.frontX + 0.02, (layout.camSprocket[1] + layout.crankSprocket[1]) / 2, 0.04]}>
          <sphereGeometry args={[0.016, 12, 10]} />
          <Surface kind="plastic" />
        </mesh>
      </Layer>
    </Part>
  )
}

function Cover({ layout }: { layout: EngineLayout }) {
  const top = layout.cover.center[1] + layout.cover.size[1] / 2
  return (
    <Part id="valve-cover">
      <Layer id="cover">
        <RoundedBox args={layout.cover.size} radius={0.01} smoothness={2} position={layout.cover.center}>
          <Surface kind="cover" clip />
        </RoundedBox>
        {Array.from({ length: 7 }, (_, index) => (
          <mesh key={index} position={[(index - 3) * 0.048, top, 0]}>
            <boxGeometry args={[0.01, 0.012, layout.cover.size[2] * 0.7]} />
            <Surface kind="cover" />
          </mesh>
        ))}
        {[-0.16, 0.16].map((x) =>
          [-0.04, 0.04].map((z) => <Bolt key={`${x}-${z}`} position={[x, top, z]} />),
        )}
      </Layer>
      <Layer id="cap">
        <mesh position={[0.12, top + 0.012, 0]}>
          <cylinderGeometry args={[0.018, 0.02, 0.016, 16]} />
          <Surface kind="plastic" />
        </mesh>
      </Layer>
    </Part>
  )
}

function Pump({ layout }: { layout: EngineLayout }) {
  const anchor = layout.anchors['water-pump']
  return (
    <Part id="water-pump" position={anchor}>
      <Layer id="housing">
        <XCylinder radius={0.042} length={0.05} position={[0.03, 0, 0]} kind="aluminum" />
      </Layer>
      <Layer id="impeller">
        <mesh position={[0.055, 0, 0]} rotation={[0, 0, Math.PI / 2]} userData={{ spin: 1.25 }}>
          <cylinderGeometry args={[0.028, 0.028, 0.012, 12]} />
          <Surface kind="aluminum" />
        </mesh>
      </Layer>
      <Layer id="pulley">
        <group userData={{ spin: 1.25 }}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.038, 0.038, 0.016, 20]} />
            <Surface kind="steel" />
          </mesh>
        </group>
      </Layer>
    </Part>
  )
}

function OilFilter({ layout }: { layout: EngineLayout }) {
  return (
    <Part id="oil-filter" position={layout.anchors['oil-filter']}>
      <Layer id="canister">
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.034, 0.09, 18]} />
          <Surface kind="steel" />
        </mesh>
      </Layer>
      <Layer id="element">
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.07, 12]} />
          <Surface kind="gasket" />
        </mesh>
      </Layer>
      <Layer id="gasket">
        <mesh position={[0, 0, 0.046]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.028, 0.004, 8, 16]} />
          <Surface kind="gasket" />
        </mesh>
      </Layer>
    </Part>
  )
}

function Intake({ layout }: { layout: EngineLayout }) {
  const sign = layout.intakeSign
  const plenumY = layout.head.center[1] + 0.01
  const plenumZ = sign * (layout.block.size[2] / 2 + 0.07)
  return (
    <Part id="intake-manifold">
      <Layer id="plenum">
        <RoundedBox
          args={[layout.block.size[0] * 0.7, 0.05, 0.07]}
          radius={0.01}
          smoothness={2}
          position={[0, plenumY, plenumZ]}
        >
          <Surface kind="plastic" clip />
        </RoundedBox>
      </Layer>
      <Layer id="runners">
        {layout.pistonX.map((x) => (
          <Strut
            key={x}
            from={[x, plenumY - 0.01, plenumZ - sign * 0.02]}
            to={[x, layout.deckY + 0.02, sign * layout.block.size[2] * 0.38]}
            radius={0.012}
            kind="plastic"
            clip
          />
        ))}
      </Layer>
    </Part>
  )
}

function Exhaust({ layout }: { layout: EngineLayout }) {
  const sign = -layout.intakeSign
  const portZ = sign * layout.block.size[2] * 0.42
  const collector: Vec3 = [0.02, layout.deckY - 0.02, sign * (layout.block.size[2] / 2 + 0.1)]
  return (
    <Part id="exhaust-manifold">
      <Layer id="runners">
        {layout.pistonX.map((x) => (
          <Strut key={x} from={[x, layout.deckY + 0.01, portZ]} to={collector} radius={0.011} kind="iron" />
        ))}
      </Layer>
      <Layer id="collector">
        <mesh position={collector} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.034, 0.08, 12]} />
          <Surface kind="iron" />
        </mesh>
      </Layer>
    </Part>
  )
}

function Starter({ layout }: { layout: EngineLayout }) {
  return (
    <Part id="starter" position={layout.anchors.starter}>
      <Layer id="housing">
        <XCylinder radius={0.038} length={0.11} kind="steel" />
      </Layer>
      <Layer id="solenoid">
        <mesh position={[0.01, 0.045, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.016, 0.06, 12]} />
          <Surface kind="steel" />
        </mesh>
      </Layer>
      <Layer id="pinion">
        <mesh position={[0.07, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.016, 0.018, 10]} />
          <Surface kind="zinc" />
        </mesh>
      </Layer>
    </Part>
  )
}

function Alternator({ layout }: { layout: EngineLayout }) {
  return (
    <Part id="alternator" position={layout.anchors.alternator}>
      <Layer id="housing">
        <XCylinder radius={0.052} length={0.09} kind="aluminum" />
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.04, 0.004, 6, 18]} />
          <Surface kind="plastic" />
        </mesh>
      </Layer>
      <Layer id="pulley">
        <group position={[-0.055, 0, 0]} userData={{ spin: 2.6 }}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.028, 0.028, 0.018, 18]} />
            <Surface kind="steel" />
          </mesh>
        </group>
      </Layer>
      <Layer id="rotor">
        <group userData={{ spin: 2.6 }}>
          <XCylinder radius={0.03} length={0.07} kind="copper" />
        </group>
      </Layer>
    </Part>
  )
}

function Belt({ layout }: { layout: EngineLayout }) {
  return (
    <Part id="serpentine-belt">
      <Layer id="belt">
        <Loop points={layout.beltPoints} radius={0.007} ratio={1} />
      </Layer>
      <Layer id="tensioner">
        <mesh position={[layout.frontX + 0.01, layout.crankCenter[1] + 0.06, -0.06]}>
          <sphereGeometry args={[0.02, 14, 12]} />
          <Surface kind="steel" />
        </mesh>
      </Layer>
      <Layer id="idler">
        <group position={layout.idler} userData={{ spin: 1.4 }}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.022, 0.022, 0.014, 16]} />
            <Surface kind="steel" />
          </mesh>
        </group>
      </Layer>
    </Part>
  )
}

function Plugs({ layout }: { layout: EngineLayout }) {
  const y = layout.deckY + 0.045
  return (
    <Part id="spark-plugs">
      <Layer id="shell">
        {layout.pistonX.map((x) => (
          <mesh key={x} position={[x, y, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.022, 6]} />
            <Surface kind="zinc" />
          </mesh>
        ))}
      </Layer>
      <Layer id="insulator">
        {layout.pistonX.map((x) => (
          <mesh key={x} position={[x, y + 0.018, 0]}>
            <cylinderGeometry args={[0.005, 0.006, 0.02, 10]} />
            <Surface kind="ceramic" />
          </mesh>
        ))}
      </Layer>
      <Layer id="electrode">
        {layout.pistonX.map((x) => (
          <mesh key={x} position={[x, y - 0.016, 0]}>
            <cylinderGeometry args={[0.002, 0.002, 0.012, 6]} />
            <Surface kind="zinc" />
          </mesh>
        ))}
      </Layer>
    </Part>
  )
}

function Coils({ layout }: { layout: EngineLayout }) {
  const y = layout.cover.center[1] + layout.cover.size[1] / 2 + 0.03
  return (
    <Part id="ignition-coils">
      <Layer id="body">
        {layout.pistonX.map((x) => (
          <mesh key={x} position={[x, y, 0]}>
            <boxGeometry args={[0.028, 0.05, 0.028]} />
            <Surface kind="plastic" />
          </mesh>
        ))}
      </Layer>
      <Layer id="connector">
        {layout.pistonX.map((x) => (
          <mesh key={x} position={[x, y + 0.032, 0.01]}>
            <boxGeometry args={[0.016, 0.012, 0.02]} />
            <Surface kind="plastic" />
          </mesh>
        ))}
      </Layer>
      <Layer id="boot">
        {layout.pistonX.map((x) => (
          <mesh key={x} position={[x, y - 0.04, 0]}>
            <cylinderGeometry args={[0.008, 0.01, 0.03, 10]} />
            <Surface kind="rubber" />
          </mesh>
        ))}
      </Layer>
    </Part>
  )
}

function AirBox({ layout }: { layout: EngineLayout }) {
  const anchor = layout.anchors['air-filter']
  const plenumZ = layout.intakeSign * (layout.block.size[2] / 2 + 0.07)
  return (
    <Part id="air-filter" position={anchor}>
      <Layer id="housing">
        <RoundedBox args={[0.2, 0.08, 0.14]} radius={0.012} smoothness={2}>
          <Surface kind="plastic" />
        </RoundedBox>
      </Layer>
      <Layer id="element">
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[0.16, 0.02, 0.1]} />
          <Surface kind="gasket" />
        </mesh>
      </Layer>
      <Layer id="duct">
        <Strut
          from={[0, -0.02, 0]}
          to={[-anchor[0] + 0.02, layout.head.center[1] + 0.01 - anchor[1], plenumZ - anchor[2]]}
          radius={0.016}
          kind="rubber"
        />
      </Layer>
    </Part>
  )
}

function Radiator({ layout }: { layout: EngineLayout }) {
  const anchor = layout.anchors.radiator
  const local = (point: Vec3): Vec3 => [point[0] - anchor[0], point[1] - anchor[1], point[2] - anchor[2]]
  const pump = layout.anchors['water-pump']
  const upperEnd = local([0.02, layout.deckY + 0.03, layout.intakeSign * 0.05])
  const lowerEnd = local(pump)
  return (
    <Part id="radiator" position={anchor}>
      <Layer id="tanks">
        <RoundedBox args={[0.07, 0.045, 0.5]} radius={0.01} smoothness={2} position={[0, 0.19, 0]}>
          <Surface kind="plastic" />
        </RoundedBox>
        <RoundedBox args={[0.07, 0.045, 0.5]} radius={0.01} smoothness={2} position={[0, -0.19, 0]}>
          <Surface kind="plastic" />
        </RoundedBox>
        <mesh position={[0.02, 0.22, 0.12]}>
          <cylinderGeometry args={[0.016, 0.018, 0.02, 14]} />
          <Surface kind="zinc" />
        </mesh>
      </Layer>
      <Layer id="core">
        <mesh position={[0, 0, 0.23]}>
          <boxGeometry args={[0.04, 0.36, 0.025]} />
          <Surface kind="plastic" />
        </mesh>
        <mesh position={[0, 0, -0.23]}>
          <boxGeometry args={[0.04, 0.36, 0.025]} />
          <Surface kind="plastic" />
        </mesh>
        {Array.from({ length: 15 }, (_, index) => (
          <mesh key={index} position={[0, (index - 7) * 0.022, 0]}>
            <boxGeometry args={[0.02, 0.007, 0.42]} />
            <Surface kind="fin" />
          </mesh>
        ))}
      </Layer>
      <Layer id="fan">
        <group position={[0.05, 0, 0]} userData={{ spin: 1.15 }}>
          {Array.from({ length: 7 }, (_, index) => (
            <mesh key={index} rotation={[(index / 7) * Math.PI * 2, 0, 0]}>
              <boxGeometry args={[0.006, 0.15, 0.032]} />
              <Surface kind="plastic" />
            </mesh>
          ))}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.02, 12]} />
            <Surface kind="plastic" />
          </mesh>
        </group>
      </Layer>
      <Layer id="hoses">
        <Hose points={[[0.03, 0.19, 0], [0.18, 0.22, 0.04], upperEnd]} />
        <Hose points={[[0.03, -0.19, 0], [0.16, -0.08, 0.02], lowerEnd]} />
      </Layer>
    </Part>
  )
}

function Battery({ layout }: { layout: EngineLayout }) {
  return (
    <Part id="battery" position={layout.anchors.battery}>
      <Layer id="case">
        <RoundedBox args={[0.2, 0.14, 0.13]} radius={0.008} smoothness={2}>
          <Surface kind="plastic" />
        </RoundedBox>
        <mesh position={[0, 0.072, 0]}>
          <boxGeometry args={[0.18, 0.012, 0.11]} />
          <Surface kind="plastic" />
        </mesh>
      </Layer>
      <Layer id="terminals">
        <mesh position={[-0.05, 0.09, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.02, 12]} />
          <Surface kind="lead" />
        </mesh>
        <mesh position={[0.05, 0.09, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.018, 12]} />
          <Surface kind="lead" />
        </mesh>
      </Layer>
      <Layer id="hold-down">
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.22, 0.008, 0.016]} />
          <Surface kind="zinc" />
        </mesh>
        {[-0.09, 0.09].map((x) => (
          <mesh key={x} position={[x, 0.04, 0]}>
            <cylinderGeometry args={[0.004, 0.004, 0.12, 8]} />
            <Surface kind="zinc" />
          </mesh>
        ))}
      </Layer>
    </Part>
  )
}
