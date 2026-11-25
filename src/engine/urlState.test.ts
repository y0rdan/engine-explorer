import { describe, expect, it } from 'vitest'
import { partSearch, readPartParam, urlForPart } from './urlState.ts'

describe('part deep links', () => {
  it('reads and writes the part query without dropping the base path', () => {
    expect(readPartParam('?part=radiator')).toBe('radiator')
    expect(readPartParam('')).toBeNull()
    expect(partSearch('battery', '?part=radiator')).toBe('?part=battery')
    expect(partSearch(null, '?part=radiator&debug=1')).toBe('?debug=1')
    expect(
      urlForPart('radiator', { pathname: '/engine-explorer/', search: '', hash: '' }),
    ).toBe('/engine-explorer/?part=radiator')
    expect(
      urlForPart(null, { pathname: '/engine-explorer/', search: '?part=radiator', hash: '' }),
    ).toBe('/engine-explorer/')
  })
})
