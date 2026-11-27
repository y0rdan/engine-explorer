export function readEngineParam(search: string): string | null {
  const value = new URLSearchParams(search).get('engine')
  if (value === null || value.trim() === '') return null
  return value
}

export function engineSearch(engineId: string | null, currentSearch: string, clearPart = false): string {
  const params = new URLSearchParams(currentSearch)
  if (engineId) params.set('engine', engineId)
  else params.delete('engine')
  if (clearPart || engineId === null) params.delete('part')
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function urlForEngine(
  engineId: string | null,
  location: { pathname: string; search: string; hash: string },
  clearPart = false,
): string {
  return `${location.pathname}${engineSearch(engineId, location.search, clearPart)}${location.hash}`
}

export function readPartParam(search: string): string | null {
  const value = new URLSearchParams(search).get('part')
  if (value === null || value.trim() === '') return null
  return value
}

export function partSearch(partId: string | null, currentSearch: string): string {
  const params = new URLSearchParams(currentSearch)
  if (partId) params.set('part', partId)
  else params.delete('part')
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function urlForPart(
  partId: string | null,
  location: { pathname: string; search: string; hash: string },
): string {
  return `${location.pathname}${partSearch(partId, location.search)}${location.hash}`
}
