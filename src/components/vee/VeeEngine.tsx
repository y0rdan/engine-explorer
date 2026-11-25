import { RoundedBox } from '@react-three/drei'
import { useMemo } from 'react'
import { lobeCenter } from '../../engine/kinematics.ts'
import type { Vec3 } from '../../engine/layout.ts'
import type { EngineRecord } from '../../engine/schema.ts'
import { bankFrame, layoutVee, type VeeBank, type VeeLayout } from '../../engine/veeLayout.ts'
import { Layer, Part, Surface } from '../inline4/chrome.tsx'
import { Bolt, Hose, Loop, Strut, XCylinder } from './primitives.tsx'

export function VeeEngine({ engine }: { engine: EngineRecord }) {
  const layout = useMemo(() => layoutVee(engine), [engine])
  return (
    <group name="engine-root">
      <Block layout={layout} />
      <Crank layout={layout} />
      {layout.banks.map((bank) => (
        <Pistons key={bank.id} layout={layout} bank={bank} />
      ))}
      <OilPan layout={layout} />
      {layout.banks.map((bank) => (
        <Head key={bank.id} layout={layout} bank={bank} />
      ))}
      {layout.banks.map((bank) => (
        <Cams key={bank.id} layout={layout} bank={bank} />
      ))}
      <Timing layout={layout} />
      {layout.banks.map((bank) => (
        <Cover key={bank.id} layout={layout} bank={bank} />
      ))}
      <Intake layout={layout} />
      {layout.banks.map((bank) => (
        <Exhaust key={bank.id} layout={layout} bank={bank} />
      ))}
      <Pump layout={layout} />
      <OilFilter layout={layout} />
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

function Block({ layout }: { layout: VeeLayout }) {
  const { center, size } = layout.block
  return (
    <Part id="engine-block">
      <Layer id="skirt">
        <RoundedBox args={size} radius={0.012} smoothness={2} position={center}>
          <Surface kind="aluminum" clip />
        </RoundedBox>
        {layout.banks.map((bank) => (
          <group key={bank.id} position={bank.casting.center} rotation={[bank.beta, 0, 0]}>
            <RoundedBox args={bank.casting.size} radius={0.01} smoothness={2}>
              <Surface kind="aluminum" clip />
            </RoundedBox>
          </group>
        ))}
        <mesh position={[layout.frontX + 0.05, layout.crankCenter[1], 0]}>
          <boxGeometry args={[0.018, size[1] * 0.8, size[2] * 0.9]} />
          <Surface kind="aluminum" clip />
        </mesh>
      </Layer>
      <Layer id="cylinders">
        {layout.banks.map((bank) => (
          <group key={bank.id} position={[0, layout.crankCenter[1], 0]} rotation={[bank.beta, 0, 0]}>
            {bank.cylinders.map((cylinder) => (
              <mesh key={cylinder.number} position={[cylinder.x, layout.deck * 0.52, 0]}>
                <cylinderGeometry args={[layout.bore / 2 + 0.004, layout.bore / 2 + 0.004, layout.deck * 0.72, 18]} />
                <Surface kind="steel" />
              </mesh>
            ))}
          </group>
        ))}
      </Layer>
    </Part>
  )
}

function Crank({ layout }: { layout: VeeLayout }) {
  const stations = new Map<number, typeof layout.cylinders>()
  for (const cylinder of layout.cylinders) {
    const group = stations.get(cylinder.station) ?? []
    group.push(cylinder)
    stations.set(cylinder.station, group)
  }
  return (
    <Part id="crankshaft">
      <Layer id="shaft">
        <group position={layout.crankCenter} userData={{ spin: 1 }}>
          <XCylinder radius={0.014} length={layout.block.size[0] * 0.9} kind="steel" />
          {[...stations.values()].map((group) => (
            <group key={group[0]?.station}>
              {group.map((cylinder) => {
                const y = Math.cos(cylinder.phase) * layout.crankRadius
                const z = Math.sin(cylinder.phase) * layout.crankRadius
                const x = cylinder.x + cylinder.zSign * 0.009
                return (
                  <group key={cylinder.number}>
                    <XCylinder radius={0.013} length={0.02} position={[x, y, z]} kind="steel" />
                    <mesh position={[cylinder.x, y / 2, z / 2]}>
                      <boxGeometry args={[0.016, Math.max(Math.abs(y), 0.02) + 0.01, 0.03]} />
                      <Surface kind="steel" />
                    </mesh>
                    <mesh position={[cylinder.x, -y * 0.55, -z * 0.55]}>
                      <boxGeometry args={[0.02, 0.03, 0.04]} />
                      <Surface kind="steel" />
                    </mesh>
                  </group>
                )
              })}
            </group>
          ))}
          <mesh position={[layout.frontX, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.055, 0.055, 0.02, 22]} />
            <Surface kind="steel" />
          </mesh>
        </group>
      </Layer>
      <Layer id="flywheel">
        <group position={[layout.block.size[0] / 2 - 0.02, layout.crankCenter[1], 0]} userData={{ spin: 1 }}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.11, 0.11, 0.018, 28]} />
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

function Pistons({ layout, bank }: { layout: VeeLayout; bank: VeeBank }) {
  return (
    <Part id={`pistons-${bank.id}`}>
      <Layer id="pistons">
        {bank.cylinders.map((cylinder) => (
          <group key={cylinder.number} userData={{ piston: cylinder.index }}>
            <mesh position={[0, layout.wristToCrown * 0.5, 0]}>
              <cylinderGeometry args={[layout.bore * 0.46, layout.bore * 0.46, layout.wristToCrown + 0.02, 16]} />
              <Surface kind="aluminum" />
            </mesh>
            <mesh position={[0, layout.wristToCrown + 0.012, 0]} userData={{ glow: cylinder.index }}>
              <sphereGeometry args={[0.014, 12, 8]} />
              <meshBasicMaterial color="#ff6a2c" transparent opacity={0} depthWrite={false} />
            </mesh>
          </group>
        ))}
      </Layer>
      <Layer id="rods">
        {bank.cylinders.map((cylinder) => (
          <mesh key={cylinder.number} userData={{ rod: cylinder.index }}>
            <cylinderGeometry args={[0.007, 0.007, layout.rodLength, 8]} />
            <Surface kind="steel" />
          </mesh>
        ))}
      </Layer>
    </Part>
  )
}

function OilPan({ layout }: { layout: VeeLayout }) {
  return (
    <Part id="oil-pan">
      <Layer id="pan">
        <RoundedBox args={layout.pan.size} radius={0.01} smoothness={2} position={layout.pan.center}>
          <Surface kind="steel" clip />
        </RoundedBox>
      </Layer>
      <Layer id="plug">
        <mesh position={[0.06, layout.pan.center[1] - layout.pan.size[1] / 2, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.012, 6]} />
          <Surface kind="zinc" />
        </mesh>
      </Layer>
    </Part>
  )
}

function Head({ layout, bank }: { layout: VeeLayout; bank: VeeBank }) {
  const crankY = layout.crankCenter[1]
  return (
    <Part id={`cylinder-head-${bank.id}`}>
      <Layer id="casting">
        <group position={bank.head.center} rotation={[bank.beta, 0, 0]}>
          <RoundedBox args={bank.head.size} radius={0.008} smoothness={2}>
            <Surface kind="aluminum" clip />
          </RoundedBox>
        </group>
        {bank.cylinders.flatMap((cylinder) =>
          [-0.03, 0.03].map((across) => (
            <Bolt
              key={`${cylinder.number}-${across}`}
              position={bankFrame(bank.beta, layout.deck + 0.07, across, cylinder.x, crankY)}
            />
          )),
        )}
      </Layer>
      <Layer id="valves">
        <group position={[0, crankY, 0]} rotation={[bank.beta, 0, 0]}>
          {bank.cylinders.map((cylinder) => (
            <group key={cylinder.number}>
              <mesh
                position={[cylinder.x, layout.deck + 0.03, bank.intakeLocalZ]}
                userData={{ valve: { index: cylinder.index, port: 'intake', restY: layout.deck + 0.03 } }}
              >
                <cylinderGeometry args={[0.0055, 0.0055, 0.07, 8]} />
                <Surface kind="steel" />
              </mesh>
              <mesh
                position={[cylinder.x, layout.deck + 0.03, bank.exhaustLocalZ]}
                userData={{ valve: { index: cylinder.index, port: 'exhaust', restY: layout.deck + 0.03 } }}
              >
                <cylinderGeometry args={[0.0055, 0.0055, 0.07, 8]} />
                <Surface kind="steel" />
              </mesh>
            </group>
          ))}
        </group>
      </Layer>
    </Part>
  )
}

function Lobe({ x, center }: { x: number; center: number }) {
  const reach = 0.015
  return (
    <mesh position={[x, reach * Math.cos(center), reach * Math.sin(center)]}>
      <sphereGeometry args={[0.011, 10, 8]} />
      <Surface kind="steel" />
    </mesh>
  )
}

function Cams({ layout, bank }: { layout: VeeLayout; bank: VeeBank }) {
  const crankY = layout.crankCenter[1]
  const cams = layout.dohc
    ? [
        { id: 'intake', port: 'intake' as const, z: bank.camLocalZ },
        { id: 'exhaust', port: 'exhaust' as const, z: -bank.camLocalZ },
      ]
    : [{ id: 'intake', port: 'intake' as const, z: 0 }]
  return (
    <Part id={`camshaft-${bank.id}`}>
      <Layer id="shafts">
        <group position={[0, crankY, 0]} rotation={[bank.beta, 0, 0]}>
          {cams.map((cam) => (
            <group key={cam.id} position={[0, bank.camLocalY, cam.z]} userData={{ spin: 0.5 }}>
              <XCylinder radius={0.009} length={bank.head.size[0] * 0.92} kind="steel" />
              {bank.cylinders.map((cylinder) => (
                <Lobe key={cylinder.number} x={cylinder.x} center={lobeCenter(cylinder.fireAngle, cam.port)} />
              ))}
            </group>
          ))}
        </group>
      </Layer>
      <Layer id="sprockets">
        <group position={[0, crankY, 0]} rotation={[bank.beta, 0, 0]}>
          {cams.map((cam) => (
            <group key={cam.id} position={[layout.frontX + 0.03, bank.camLocalY, cam.z]} userData={{ spin: 0.5 }}>
              <mesh rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.028, 0.028, 0.01, 20]} />
                <Surface kind="steel" />
              </mesh>
            </group>
          ))}
        </group>
      </Layer>
    </Part>
  )
}

function Timing({ layout }: { layout: VeeLayout }) {
  return (
    <Part id="timing-drive">
      <Layer id="chains">
        {layout.timingLoops.map((points, index) => (
          <Loop key={index} points={points} radius={0.006} ratio={1} />
        ))}
        <group position={[layout.frontX + 0.02, layout.crankCenter[1], 0]} userData={{ spin: 1 }}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.022, 0.022, 0.012, 18]} />
            <Surface kind="steel" />
          </mesh>
        </group>
      </Layer>
      <Layer id="cover">
        <mesh position={[layout.frontX + 0.006, layout.crankCenter[1] + 0.05, 0]}>
          <boxGeometry args={[0.01, 0.14, 0.16]} />
          <Surface kind="aluminum" clip />
        </mesh>
      </Layer>
      <Layer id="guides">
        {layout.banks.map((bank) => (
          <mesh
            key={bank.id}
            position={bankFrame(bank.beta, layout.deck * 0.45, bank.zSign * 0.02, layout.frontX + 0.03, layout.crankCenter[1])}
          >
            <sphereGeometry args={[0.014, 12, 10]} />
            <Surface kind="plastic" />
          </mesh>
        ))}
      </Layer>
    </Part>
  )
}

function Cover({ layout, bank }: { layout: VeeLayout; bank: VeeBank }) {
  return (
    <Part id={`valve-cover-${bank.id}`}>
      <Layer id="cover">
        <group position={bank.cover.center} rotation={[bank.beta, 0, 0]}>
          <RoundedBox args={bank.cover.size} radius={0.008} smoothness={2}>
            <Surface kind="cover" clip />
          </RoundedBox>
          {bank.cylinders.map((cylinder) => (
            <mesh key={cylinder.number} position={[cylinder.x, bank.cover.size[1] / 2, 0]}>
              <boxGeometry args={[0.012, 0.01, bank.cover.size[2] * 0.7]} />
              <Surface kind="cover" />
            </mesh>
          ))}
        </group>
      </Layer>
      <Layer id="cap">
        <mesh position={bankFrame(bank.beta, layout.deck + 0.15, 0, 0.08, layout.crankCenter[1])}>
          <cylinderGeometry args={[0.016, 0.018, 0.016, 14]} />
          <Surface kind="plastic" />
        </mesh>
      </Layer>
    </Part>
  )
}

function Intake({ layout }: { layout: VeeLayout }) {
  const crankY = layout.crankCenter[1]
  return (
    <Part id="intake-manifold">
      <Layer id="plenum">
        <RoundedBox args={layout.plenum.size} radius={0.012} smoothness={2} position={layout.plenum.center}>
          <Surface kind="plastic" clip />
        </RoundedBox>
      </Layer>
      <Layer id="runners">
        {layout.banks.flatMap((bank) =>
          bank.cylinders.map((cylinder) => {
            const port = bankFrame(bank.beta, layout.deck + 0.02, bank.intakeLocalZ, cylinder.x, crankY)
            const mouth: Vec3 = [cylinder.x * 0.85, layout.plenum.center[1], layout.plenum.center[2]]
            return <Strut key={cylinder.number} from={mouth} to={port} radius={0.011} kind="plastic" clip />
          }),
        )}
      </Layer>
    </Part>
  )
}

function Exhaust({ layout, bank }: { layout: VeeLayout; bank: VeeBank }) {
  const crankY = layout.crankCenter[1]
  const collector: Vec3 = [
    0.04,
    crankY + bank.axis[1] * layout.deck * 0.35,
    bank.axis[2] * layout.deck * 0.35 + bank.zSign * 0.2,
  ]
  return (
    <Part id={`exhaust-manifold-${bank.id}`}>
      <Layer id="runners">
        {bank.cylinders.map((cylinder) => {
          const port = bankFrame(bank.beta, layout.deck + 0.01, bank.exhaustLocalZ, cylinder.x, crankY)
          return <Strut key={cylinder.number} from={port} to={collector} radius={0.014} kind="iron" />
        })}
      </Layer>
      <Layer id="collector">
        <mesh position={collector} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.032, 0.04, 0.09, 12]} />
          <Surface kind="iron" />
        </mesh>
      </Layer>
    </Part>
  )
}

function Pump({ layout }: { layout: VeeLayout }) {
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

function OilFilter({ layout }: { layout: VeeLayout }) {
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

function Starter({ layout }: { layout: VeeLayout }) {
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

function Alternator({ layout }: { layout: VeeLayout }) {
  return (
    <Part id="alternator" position={layout.anchors.alternator}>
      <Layer id="housing">
        <XCylinder radius={0.052} length={0.09} kind="aluminum" />
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

function Belt({ layout }: { layout: VeeLayout }) {
  return (
    <Part id="serpentine-belt">
      <Layer id="belt">
        <Loop points={layout.beltPoints} radius={0.007} ratio={1} />
      </Layer>
      <Layer id="tensioner">
        <mesh position={[layout.frontX + 0.01, layout.crankCenter[1] + 0.06, -0.08]}>
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

function Plugs({ layout }: { layout: VeeLayout }) {
  const crankY = layout.crankCenter[1]
  return (
    <Part id="spark-plugs">
      <Layer id="shell">
        {layout.banks.flatMap((bank) =>
          bank.cylinders.map((cylinder) => (
            <mesh
              key={cylinder.number}
              position={bankFrame(bank.beta, layout.deck + 0.05, 0, cylinder.x, crankY)}
              rotation={[bank.beta, 0, 0]}
            >
              <cylinderGeometry args={[0.008, 0.008, 0.02, 6]} />
              <Surface kind="zinc" />
            </mesh>
          )),
        )}
      </Layer>
      <Layer id="insulator">
        {layout.banks.flatMap((bank) =>
          bank.cylinders.map((cylinder) => (
            <mesh
              key={cylinder.number}
              position={bankFrame(bank.beta, layout.deck + 0.07, 0, cylinder.x, crankY)}
              rotation={[bank.beta, 0, 0]}
            >
              <cylinderGeometry args={[0.005, 0.006, 0.018, 10]} />
              <Surface kind="ceramic" />
            </mesh>
          )),
        )}
      </Layer>
      <Layer id="electrode">
        {layout.banks.flatMap((bank) =>
          bank.cylinders.map((cylinder) => (
            <mesh
              key={cylinder.number}
              position={bankFrame(bank.beta, layout.deck + 0.02, 0, cylinder.x, crankY)}
              rotation={[bank.beta, 0, 0]}
            >
              <cylinderGeometry args={[0.002, 0.002, 0.012, 6]} />
              <Surface kind="zinc" />
            </mesh>
          )),
        )}
      </Layer>
    </Part>
  )
}

function Coils({ layout }: { layout: VeeLayout }) {
  const crankY = layout.crankCenter[1]
  return (
    <Part id="ignition-coils">
      <Layer id="body">
        {layout.banks.flatMap((bank) =>
          bank.cylinders.map((cylinder) => (
            <mesh
              key={cylinder.number}
              position={bankFrame(bank.beta, layout.deck + 0.16, 0, cylinder.x, crankY)}
              rotation={[bank.beta, 0, 0]}
            >
              <boxGeometry args={[0.026, 0.045, 0.026]} />
              <Surface kind="plastic" />
            </mesh>
          )),
        )}
      </Layer>
      <Layer id="boot">
        {layout.banks.flatMap((bank) =>
          bank.cylinders.map((cylinder) => (
            <mesh
              key={cylinder.number}
              position={bankFrame(bank.beta, layout.deck + 0.12, 0, cylinder.x, crankY)}
              rotation={[bank.beta, 0, 0]}
            >
              <cylinderGeometry args={[0.008, 0.01, 0.028, 10]} />
              <Surface kind="rubber" />
            </mesh>
          )),
        )}
      </Layer>
    </Part>
  )
}

function AirBox({ layout }: { layout: VeeLayout }) {
  const anchor = layout.anchors['air-filter']
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
          to={[
            layout.plenum.center[0] - anchor[0],
            layout.plenum.center[1] - anchor[1],
            layout.plenum.center[2] - anchor[2],
          ]}
          radius={0.016}
          kind="rubber"
        />
      </Layer>
    </Part>
  )
}

function Radiator({ layout }: { layout: VeeLayout }) {
  const anchor = layout.anchors.radiator
  const local = (point: Vec3): Vec3 => [point[0] - anchor[0], point[1] - anchor[1], point[2] - anchor[2]]
  const pump = layout.anchors['water-pump']
  const upperEnd = local([0.02, layout.crankCenter[1] + layout.deck * 0.4, layout.intakeSign * 0.04])
  const lowerEnd = local(pump)
  return (
    <Part id="radiator" position={anchor}>
      <Layer id="tanks">
        <RoundedBox args={[0.07, 0.045, 0.52]} radius={0.01} smoothness={2} position={[0, 0.2, 0]}>
          <Surface kind="plastic" />
        </RoundedBox>
        <RoundedBox args={[0.07, 0.045, 0.52]} radius={0.01} smoothness={2} position={[0, -0.2, 0]}>
          <Surface kind="plastic" />
        </RoundedBox>
      </Layer>
      <Layer id="core">
        {Array.from({ length: 14 }, (_, index) => (
          <mesh key={index} position={[0, (index - 6.5) * 0.024, 0]}>
            <boxGeometry args={[0.02, 0.007, 0.44]} />
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
        </group>
      </Layer>
      <Layer id="hoses">
        <Hose points={[[0.03, 0.2, 0], [0.16, 0.22, 0.04], upperEnd]} />
        <Hose points={[[0.03, -0.2, 0], [0.14, -0.06, 0.02], lowerEnd]} />
      </Layer>
    </Part>
  )
}

function Battery({ layout }: { layout: VeeLayout }) {
  return (
    <Part id="battery" position={layout.anchors.battery}>
      <Layer id="case">
        <RoundedBox args={[0.2, 0.14, 0.13]} radius={0.008} smoothness={2}>
          <Surface kind="plastic" />
        </RoundedBox>
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
      </Layer>
    </Part>
  )
}
