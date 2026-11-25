import { describe, expect, it } from 'vitest'
import { engineSearch, partSearch, readEngineParam, readPartParam, urlForEngine, urlForPart } from './urlState.ts'

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
    expect(partSearch('battery', '?engine=generic-v6&part=radiator')).toBe('?engine=generic-v6&part=battery')
  })

  it('keeps ?engine= beside ?part= and clears the part when the engine changes', () => {
    expect(readEngineParam('?engine=generic-v6&part=crankshaft')).toBe('generic-v6')
    expect(readEngineParam('?part=radiator')).toBeNull()
    expect(readEngineParam('')).toBeNull()
    expect(engineSearch('generic-v6', '?part=crankshaft')).toContain('engine=generic-v6')
    expect(engineSearch('generic-v6', '?part=crankshaft')).toContain('part=crankshaft')
    expect(engineSearch('generic-v8', '?engine=generic-v6&part=crankshaft', true)).toBe('?engine=generic-v8')
    expect(engineSearch(null, '?engine=generic-v6&part=crankshaft')).toBe('')
    expect(
      urlForEngine('generic-v6', { pathname: '/engine-explorer/', search: '', hash: '' }),
    ).toBe('/engine-explorer/?engine=generic-v6')
  })
})
