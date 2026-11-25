import { createContext, useContext, type ReactNode } from 'react'
import { DoubleSide, FrontSide, type Plane } from 'three'
import { emphasisFor, type Emphasis } from '../../engine/emphasis.ts'
import { roughnessTexture } from './textures.ts'

export type EngineView = {
  partId: string | null
  layerId: string | null
  hoveredPartId: string | null
  isolated: boolean
  assemblyPartId: string | null
  cutaway: boolean
  clipPlane: Plane
  selectPart: (id: string) => void
  selectLayer: (partId: string, layerId: string) => void
  hoverPart: (id: string | null) => void
}

const ViewContext = createContext<EngineView | null>(null)
const PartContext = createContext('')
const LayerContext = createContext<string | null>(null)

export function EngineViewProvider({ value, children }: { value: EngineView; children: ReactNode }) {
  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>
}

function useView(): EngineView {
  const view = useContext(ViewContext)
  if (!view) throw new Error('Engine view is missing')
  return view
}

type MaterialKind = 'aluminum' | 'cover' | 'steel' | 'iron' | 'rubber' | 'plastic' | 'zinc' | 'copper' | 'fin' | 'ceramic' | 'lead' | 'gasket'

const PALETTE: Record<MaterialKind, { color: string; dim: string; metalness: number; roughness: number; env: number; map: boolean }> = {
  aluminum: { color: '#c5c9ce', dim: '#6d737a', metalness: 0.8, roughness: 0.5, env: 0.58, map: true },
  cover: { color: '#d5d8dc', dim: '#747980', metalness: 0.74, roughness: 0.42, env: 0.5, map: true },
  steel: { color: '#9aa1a8', dim: '#555b62', metalness: 0.86, roughness: 0.38, env: 0.48, map: true },
  iron: { color: '#3a3634', dim: '#241f1e', metalness: 0.28, roughness: 0.88, env: 0.22, map: true },
  rubber: { color: '#16181b', dim: '#0c0d0f', metalness: 0, roughness: 0.78, env: 0.12, map: false },
  plastic: { color: '#1c1f24', dim: '#101216', metalness: 0.04, roughness: 0.56, env: 0.18, map: false },
  zinc: { color: '#d7dbe0', dim: '#7c8188', metalness: 0.92, roughness: 0.32, env: 0.5, map: false },
  copper: { color: '#b56a43', dim: '#6a3d28', metalness: 0.84, roughness: 0.4, env: 0.48, map: false },
  fin: { color: '#d9d3c8', dim: '#7d7870', metalness: 0.82, roughness: 0.4, env: 0.5, map: false },
  ceramic: { color: '#f4f1ea', dim: '#b7b4ae', metalness: 0, roughness: 0.32, env: 0.2, map: false },
  lead: { color: '#8d8a84', dim: '#4e4c49', metalness: 0.68, roughness: 0.46, env: 0.32, map: false },
  gasket: { color: '#5c4638', dim: '#332820', metalness: 0, roughness: 0.92, env: 0.08, map: false },
}

function glow(emphasis: Emphasis): { color: string; intensity: number } {
  if (emphasis === 'hot') return { color: '#c47a3a', intensity: 0.26 }
  if (emphasis === 'layer') return { color: '#8ea4b8', intensity: 0.32 }
  if (emphasis === 'hover') return { color: '#8d6844', intensity: 0.12 }
  return { color: '#000000', intensity: 0 }
}

export function Surface({ kind, clip = false }: { kind: MaterialKind; clip?: boolean }) {
  const view = useView()
  const partId = useContext(PartContext)
  const layerId = useContext(LayerContext)
  const emphasis = emphasisFor({
    partId,
    layerId,
    selectedPartId: view.partId,
    selectedLayerId: view.layerId,
    hoveredPartId: view.hoveredPartId,
    isolated: view.isolated,
    assemblyPartId: view.assemblyPartId,
  })
  const spec = PALETTE[kind]
  const emissive = glow(emphasis)
  const shared = {
    color: emphasis === 'dim' ? spec.dim : spec.color,
    metalness: spec.metalness,
    roughness: spec.roughness,
    envMapIntensity: spec.env,
    roughnessMap: spec.map ? (roughnessTexture() ?? undefined) : undefined,
    emissive: emissive.color,
    emissiveIntensity: emissive.intensity,
    clippingPlanes: clip && view.cutaway ? [view.clipPlane] : [],
    clipShadows: true,
    side: clip && view.cutaway ? DoubleSide : FrontSide,
  }
  if (kind === 'cover') {
    return <meshPhysicalMaterial {...shared} clearcoat={0.22} clearcoatRoughness={0.4} />
  }
  return <meshStandardMaterial {...shared} />
}

export function Part({
  id,
  position,
  children,
}: {
  id: string
  position?: [number, number, number]
  children: ReactNode
}) {
  const view = useView()
  const emphasis = emphasisFor({
    partId: id,
    layerId: null,
    selectedPartId: view.partId,
    selectedLayerId: view.layerId,
    hoveredPartId: view.hoveredPartId,
    isolated: view.isolated,
    assemblyPartId: view.assemblyPartId,
  })
  return (
    <PartContext.Provider value={id}>
      <group
        name={`part:${id}`}
        position={position}
        visible={emphasis !== 'hidden'}
        onClick={(event) => {
          event.stopPropagation()
          view.selectPart(id)
        }}
        onPointerOver={(event) => {
          if (event.pointerType !== 'mouse') return
          event.stopPropagation()
          view.hoverPart(id)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(event) => {
          if (event.pointerType !== 'mouse') return
          view.hoverPart(null)
          document.body.style.cursor = ''
        }}
      >
        {children}
      </group>
    </PartContext.Provider>
  )
}

export function Layer({ id, children }: { id: string; children: ReactNode }) {
  const view = useView()
  const partId = useContext(PartContext)
  return (
    <LayerContext.Provider value={id}>
      <group
        name={`layer:${partId}:${id}`}
        onClick={(event) => {
          event.stopPropagation()
          view.selectLayer(partId, id)
        }}
      >
        {children}
      </group>
    </LayerContext.Provider>
  )
}
