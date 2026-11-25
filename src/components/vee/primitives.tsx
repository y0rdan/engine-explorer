import { useEffect, useMemo } from 'react'
import { CatmullRomCurve3, Quaternion, TubeGeometry, Vector3 } from 'three'
import type { Vec3 } from '../../engine/layout.ts'
import { Surface } from '../inline4/chrome.tsx'
import { ribTexture } from '../inline4/textures.ts'

export function Bolt({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
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

export function Strut({
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

export function Loop({ points, radius, ratio }: { points: Vec3[]; radius: number; ratio: number }) {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(
      points.map((point) => new Vector3(point[0], point[1], point[2])),
      true,
    )
    return new TubeGeometry(curve, 80, radius, 6, true)
  }, [points, radius])
  useEffect(() => () => geometry.dispose(), [geometry])
  const map = useMemo(() => {
    const texture = ribTexture()
    if (texture) texture.repeat.set(28, 1)
    return texture
  }, [])
  return (
    <mesh geometry={geometry} userData={{ belt: ratio }}>
      <meshStandardMaterial color="#141618" roughness={0.8} metalness={0} map={map ?? undefined} />
    </mesh>
  )
}

export function Hose({ points }: { points: Vec3[] }) {
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

export function XCylinder({
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
