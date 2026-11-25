import type { ReactNode } from 'react'
import { EngineViewContext, type EngineView } from './engineView.ts'

export function EngineViewProvider({ value, children }: { value: EngineView; children: ReactNode }) {
  return <EngineViewContext.Provider value={value}>{children}</EngineViewContext.Provider>
}
