import { describe, expect, it } from 'vitest'
import parts from './parts.json'

describe('parts.json', () => {
  it('is a list ready for part content', () => {
    expect(Array.isArray(parts)).toBe(true)
  })
})
