import { describe, expect, it } from 'vitest'
import { ENGINE_MODEL_FILE, engineModelUrl } from './engineModel.ts'

describe('engineModelUrl', () => {
  it('loads the glb under the Vite base path', () => {
    const url = engineModelUrl()
    expect(url).toBe(`${import.meta.env.BASE_URL}${ENGINE_MODEL_FILE}`)
    expect(url.endsWith('models/engine.glb')).toBe(true)
    expect(url.startsWith(import.meta.env.BASE_URL)).toBe(true)
    expect(import.meta.env.BASE_URL.endsWith('/')).toBe(true)
  })
})
