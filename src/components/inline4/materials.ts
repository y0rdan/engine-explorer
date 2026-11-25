import { DoubleSide, FrontSide, MeshStandardMaterial, type Material, type Plane } from 'three'
import { emphasisFor, type Emphasis } from '../../engine/emphasis.ts'
import { roughnessTexture } from './textures.ts'

export type MaterialKind =
  | 'aluminum'
  | 'cover'
  | 'steel'
  | 'iron'
  | 'heat'
  | 'rubber'
  | 'plastic'
  | 'zinc'
  | 'copper'
  | 'fin'
  | 'ceramic'
  | 'lead'
  | 'gasket'

type Spec = { color: string; dim: string; metalness: number; roughness: number; env: number; map: boolean }

const PALETTE: Record<MaterialKind, Spec> = {
  aluminum: { color: '#8d939a', dim: '#4e545b', metalness: 0.72, roughness: 0.58, env: 0.32, map: true },
  cover: { color: '#969da4', dim: '#555b62', metalness: 0.68, roughness: 0.5, env: 0.3, map: true },
  steel: { color: '#7f868d', dim: '#454b52', metalness: 0.84, roughness: 0.34, env: 0.34, map: true },
  iron: { color: '#3a3634', dim: '#221e1c', metalness: 0.24, roughness: 0.9, env: 0.16, map: true },
  heat: { color: '#ffffff', dim: '#6a534c', metalness: 0.3, roughness: 0.7, env: 0.2, map: false },
  rubber: { color: '#141618', dim: '#0b0c0e', metalness: 0, roughness: 0.92, env: 0.06, map: false },
  plastic: { color: '#1c1f24', dim: '#101216', metalness: 0.04, roughness: 0.64, env: 0.12, map: false },
  zinc: { color: '#b5bcc2', dim: '#666c72', metalness: 0.8, roughness: 0.4, env: 0.3, map: false },
  copper: { color: '#a86440', dim: '#5c3824', metalness: 0.78, roughness: 0.38, env: 0.32, map: false },
  fin: { color: '#c5cdc6', dim: '#6d756f', metalness: 0.7, roughness: 0.42, env: 0.28, map: false },
  ceramic: { color: '#efeae2', dim: '#a7a39c', metalness: 0, roughness: 0.4, env: 0.16, map: false },
  lead: { color: '#8a877f', dim: '#4c4a46', metalness: 0.62, roughness: 0.48, env: 0.22, map: false },
  gasket: { color: '#5c4638', dim: '#332820', metalness: 0, roughness: 0.94, env: 0.06, map: false },
}

const cache = new Map<string, MeshStandardMaterial>()

function glow(emphasis: Emphasis): { color: string; intensity: number } {
  if (emphasis === 'hot') return { color: '#c47a3a', intensity: 0.22 }
  if (emphasis === 'layer') return { color: '#8ea4b8', intensity: 0.28 }
  if (emphasis === 'hover') return { color: '#8d6844', intensity: 0.1 }
  return { color: '#000000', intensity: 0 }
}

export function sharedMaterial(
  kind: MaterialKind,
  emphasis: Emphasis,
  clip: boolean,
  plane: Plane | null,
  vertexColors = false,
): Material {
  const key = `${kind}|${emphasis}|${clip ? 1 : 0}|${vertexColors ? 1 : 0}`
  let material = cache.get(key)
  if (!material) {
    const spec = PALETTE[kind]
    const emissive = glow(emphasis)
    material = new MeshStandardMaterial({
      color: emphasis === 'dim' ? spec.dim : spec.color,
      metalness: spec.metalness,
      roughness: spec.roughness,
      envMapIntensity: spec.env,
      roughnessMap: spec.map ? (roughnessTexture() ?? undefined) : undefined,
      emissive: emissive.color,
      emissiveIntensity: emissive.intensity,
      vertexColors,
    })
    material.userData.shared = true
    cache.set(key, material)
  }
  material.clippingPlanes = clip && plane ? [plane] : []
  material.clipShadows = clip
  material.side = clip ? DoubleSide : FrontSide
  material.needsUpdate = true
  return material
}

export function partIdOf(name: string): string | null {
  if (!name.startsWith('part:')) return null
  return name.slice(5)
}

export function emphasisForMesh(
  partId: string,
  layerId: string | null,
  view: {
    partId: string | null
    layerId: string | null
    hoveredPartId: string | null
    isolated: boolean
    assemblyPartId: string | null
  },
): Emphasis {
  return emphasisFor({
    partId,
    layerId,
    selectedPartId: view.partId,
    selectedLayerId: view.layerId,
    hoveredPartId: view.hoveredPartId,
    isolated: view.isolated,
    assemblyPartId: view.assemblyPartId,
  })
}
