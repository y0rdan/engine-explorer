export type ViewState = {
  partId: string | null
  layerId: string | null
  isolated: boolean
  assemblyMode: boolean
  cutaway: boolean
  hoveredPartId: string | null
}

export type ViewAction =
  | { type: 'select-part'; id: string }
  | { type: 'select-layer'; partId: string; layerId: string }
  | { type: 'clear' }
  | { type: 'isolate' }
  | { type: 'assembly'; on: boolean }
  | { type: 'cutaway'; on: boolean }
  | { type: 'hover'; id: string | null }
  | { type: 'replace'; partId: string | null }

export function createView(partId: string | null = null): ViewState {
  return {
    partId,
    layerId: null,
    isolated: false,
    assemblyMode: false,
    cutaway: false,
    hoveredPartId: null,
  }
}

export function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case 'select-part':
      return {
        ...state,
        partId: action.id,
        layerId: null,
        hoveredPartId: null,
      }
    case 'select-layer':
      return {
        ...state,
        partId: action.partId,
        layerId: action.layerId,
        hoveredPartId: null,
      }
    case 'clear':
      return {
        ...state,
        partId: null,
        layerId: null,
        isolated: false,
        hoveredPartId: null,
      }
    case 'isolate':
      if (!state.partId) return state
      return { ...state, isolated: !state.isolated }
    case 'assembly':
      return { ...state, assemblyMode: action.on }
    case 'cutaway':
      return { ...state, cutaway: action.on }
    case 'hover':
      return { ...state, hoveredPartId: action.id }
    case 'replace':
      return {
        ...state,
        partId: action.partId,
        layerId: action.partId === state.partId ? state.layerId : null,
        isolated: action.partId ? state.isolated : false,
      }
    default:
      return state
  }
}
