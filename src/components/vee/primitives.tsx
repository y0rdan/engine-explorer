import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  InstancedMesh,
  Matrix4,
  Object3D,
  Quaternion,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
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
  useEffect(() => () => map?.dispose(), [map])
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

const dummy = new Object3D()

export function placeInstances(mesh: InstancedMesh, places: { position: Vec3; rotation?: Vec3 }[]) {
  places.forEach((place, index) => {
    dummy.position.set(place.position[0], place.position[1], place.position[2])
    dummy.rotation.set(place.rotation?.[0] ?? 0, place.rotation?.[1] ?? 0, place.rotation?.[2] ?? 0)
    dummy.scale.set(1, 1, 1)
    dummy.updateMatrix()
    mesh.setMatrixAt(index, dummy.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  mesh.count = places.length
}

export function InstancedCylinders({
  places,
  args,
  kind,
}: {
  places: { position: Vec3; rotation?: Vec3 }[]
  args: [number, number, number, number]
  kind: 'aluminum' | 'steel' | 'iron' | 'plastic' | 'copper' | 'fin' | 'zinc' | 'ceramic' | 'rubber' | 'lead' | 'cover'
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (ref.current) placeInstances(ref.current, places)
  }, [places])
  if (places.length === 0) return null
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, places.length]}>
      <cylinderGeometry args={args} />
      <Surface kind={kind} />
    </instancedMesh>
  )
}

export function InstancedBoxes({
  places,
  args,
  kind,
}: {
  places: { position: Vec3; rotation?: Vec3 }[]
  args: [number, number, number]
  kind: 'aluminum' | 'steel' | 'iron' | 'plastic' | 'copper' | 'fin' | 'zinc' | 'ceramic' | 'rubber' | 'lead' | 'cover'
}) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (ref.current) placeInstances(ref.current, places)
  }, [places])
  if (places.length === 0) return null
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, places.length]}>
      <boxGeometry args={args} />
      <Surface kind={kind} />
    </instancedMesh>
  )
}

export function MergedStruts({
  struts,
  radius,
  kind,
  clip = false,
}: {
  struts: { from: Vec3; to: Vec3 }[]
  radius: number
  kind: 'plastic' | 'iron' | 'rubber' | 'steel'
  clip?: boolean
}) {
  const geometry = useMemo(() => {
    const parts = struts.map((strut) => {
      const start = new Vector3(...strut.from)
      const end = new Vector3(...strut.to)
      const length = Math.max(start.distanceTo(end), 0.001)
      const geo = new CylinderGeometry(radius, radius, length, 6)
      const direction = end.clone().sub(start).normalize()
      geo.applyQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction))
      const mid = start.add(end).multiplyScalar(0.5)
      geo.translate(mid.x, mid.y, mid.z)
      return geo
    })
    const merged = parts.length > 0 ? mergeGeometries(parts) : null
    parts.forEach((geo) => geo.dispose())
    return merged
  }, [struts, radius])
  useEffect(() => () => geometry?.dispose(), [geometry])
  if (!geometry) return null
  return (
    <mesh geometry={geometry}>
      <Surface kind={kind} clip={clip} />
    </mesh>
  )
}

export function mergedGeometry(parts: BufferGeometry[]): BufferGeometry | null {
  if (parts.length === 0) return null
  const merged = mergeGeometries(parts)
  parts.forEach((geo) => geo.dispose())
  return merged
}

export function useDisposedGeometry(geometry: BufferGeometry | null) {
  useEffect(() => () => geometry?.dispose(), [geometry])
  return geometry
}

export function fanBladeGeometry(): BufferGeometry {
  const blades = Array.from({ length: 7 }, (_, index) => {
    const geo = new BoxGeometry(0.006, 0.15, 0.032)
    geo.applyMatrix4(new Matrix4().makeRotationX((index / 7) * Math.PI * 2))
    return geo
  })
  return mergedGeometry(blades) ?? new BoxGeometry(0.01, 0.01, 0.01)
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
