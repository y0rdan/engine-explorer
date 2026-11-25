import { createContext, useContext } from 'react'
import type { Plane } from 'three'

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

export const EngineViewContext = createContext<EngineView | null>(null)

export function useEngineView(): EngineView {
  const view = useContext(EngineViewContext)
  if (!view) throw new Error('Engine view is missing')
  return view
}
