import { describe, expect, it } from 'vitest'
import { ENGINE_MODEL_FILE, engineModelUrl } from './engineModel.ts'

describe('engineModelUrl', () => {
  it('loads the glb under the Vite base path and a file-hash query', () => {
    const url = engineModelUrl()
    expect(url).toBe(
      `${import.meta.env.BASE_URL}${ENGINE_MODEL_FILE}?v=${__ENGINE_MODEL_REV__}`,
    )
    expect(url.startsWith(import.meta.env.BASE_URL)).toBe(true)
    expect(import.meta.env.BASE_URL.endsWith('/')).toBe(true)
    expect(__ENGINE_MODEL_REV__).toMatch(/^[0-9a-f]{12}$/)
  })
})
