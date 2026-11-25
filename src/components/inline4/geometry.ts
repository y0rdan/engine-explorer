import {
  BufferAttribute,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  TubeGeometry,
  Vector2,
  Vector3,
  CatmullRomCurve3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { Vec3 } from '../../engine/layout.ts'

function prepared(geometry: BufferGeometry, vertexColors: boolean): BufferGeometry {
  const source = geometry.getIndex() ? geometry.toNonIndexed() : geometry
  const position = source.getAttribute('position')
  const next = new BufferGeometry()
  next.setAttribute('position', position.clone())
  const normal = source.getAttribute('normal')
  if (normal) next.setAttribute('normal', normal.clone())
  const uv = source.getAttribute('uv')
  if (uv) next.setAttribute('uv', uv.clone())
  else next.setAttribute('uv', new BufferAttribute(new Float32Array(position.count * 2), 2))
  if (vertexColors) {
    const color = source.getAttribute('color')
    if (color) next.setAttribute('color', color.clone())
    else next.setAttribute('color', new BufferAttribute(new Float32Array(position.count * 3).fill(1), 3))
  }
  if (!normal) next.computeVertexNormals()
  next.clearGroups()
  if (source !== geometry) source.dispose()
  return next
}

export function merged(parts: BufferGeometry[]): BufferGeometry {
  const list = parts.filter((part) => part.getAttribute('position')?.count)
  if (list.length === 0) return new BufferGeometry()
  const vertexColors = list.some((part) => part.getAttribute('color'))
  const ready = list.map((part) => prepared(part, vertexColors))
  for (const part of list) part.dispose()
  if (ready.length === 1) return ready[0] ?? new BufferGeometry()
  const geometry = mergeGeometries(ready, false)
  for (const part of ready) {
    if (part !== geometry) part.dispose()
  }
  if (!geometry) return new BufferGeometry()
  geometry.computeVertexNormals()
  geometry.clearGroups()
  return geometry
}

export function beveledBox(width: number, height: number, depth: number, radius: number): BufferGeometry {
  const bevel = Math.min(radius, width * 0.2, height * 0.2, depth * 0.2)
  const shape = new Shape()
  const hw = width / 2
  const hh = height / 2
  shape.moveTo(-hw + bevel, -hh)
  shape.lineTo(hw - bevel, -hh)
  shape.absarc(hw - bevel, -hh + bevel, bevel, -Math.PI / 2, 0, false)
  shape.lineTo(hw, hh - bevel)
  shape.absarc(hw - bevel, hh - bevel, bevel, 0, Math.PI / 2, false)
  shape.lineTo(-hw + bevel, hh)
  shape.absarc(-hw + bevel, hh - bevel, bevel, Math.PI / 2, Math.PI, false)
  shape.lineTo(-hw, -hh + bevel)
  shape.absarc(-hw + bevel, -hh + bevel, bevel, Math.PI, Math.PI * 1.5, false)
  const depthOut = Math.max(depth - bevel * 2, bevel)
  const geometry = new ExtrudeGeometry(shape, {
    depth: depthOut,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.65,
    bevelSegments: 2,
    curveSegments: 3,
  })
  geometry.translate(0, 0, -depth / 2)
  geometry.computeVertexNormals()
  geometry.clearGroups()
  return geometry
}

export function solid(args: {
  radiusTop: number
  radiusBottom: number
  height: number
  segments?: number
  position?: Vec3
  rotation?: Vec3
}): BufferGeometry {
  const geometry = new CylinderGeometry(args.radiusTop, args.radiusBottom, args.height, args.segments ?? 12)
  if (args.rotation) geometry.rotateX(args.rotation[0]).rotateY(args.rotation[1]).rotateZ(args.rotation[2])
  if (args.position) geometry.translate(args.position[0], args.position[1], args.position[2])
  geometry.clearGroups()
  return geometry
}

export function block(size: Vec3, position: Vec3): BufferGeometry {
  const geometry = beveledBox(size[0], size[1], size[2], Math.min(size[0], size[1], size[2]) * 0.08)
  geometry.translate(position[0], position[1], position[2])
  return geometry
}

export function tube(points: Vec3[], radius: number, tubular = 20): BufferGeometry {
  const curve = new CatmullRomCurve3(points.map((point) => new Vector3(point[0], point[1], point[2])))
  const geometry = new TubeGeometry(curve, tubular, radius, 6, false)
  geometry.clearGroups()
  return geometry
}

export function groovedPulley(radius: number, width: number, grooves: number): BufferGeometry {
  const points: Vector2[] = []
  const steps = Math.max(grooves * 6, 12)
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps
    const y = (t - 0.5) * width
    const wave = Math.sin(t * grooves * Math.PI)
    const r = radius - (wave > 0 ? radius * 0.12 : 0)
    points.push(new Vector2(Math.max(r, radius * 0.35), y))
  }
  const geometry = new LatheGeometry(points, 18)
  geometry.rotateZ(Math.PI / 2)
  geometry.clearGroups()
  return geometry
}

export function translate(geometry: BufferGeometry, position: Vec3): BufferGeometry {
  geometry.translate(position[0], position[1], position[2])
  return geometry
}
