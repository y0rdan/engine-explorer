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
