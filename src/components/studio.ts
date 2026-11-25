import { DataTexture } from 'three'
import { RGBELoader } from 'three-stdlib'

export const HDRI_FILE = 'hdri/studio_small_03_1k.hdr'

export const STUDIO_LOADING_MESSAGE = 'Loading studio lighting…'

export const STUDIO_LOAD_ERROR =
  'Studio lighting could not be loaded. The engine is shown with built-in lights.'

export function studioHdriUrl(): string {
  return `${import.meta.env.BASE_URL}${HDRI_FILE}`
}

let preloadTask: Promise<void> | undefined
let preloaded: DataTexture | null = null

export function clearStudioPreload(): void {
  preloadTask = undefined
}

export function disposeStudioPreload(): void {
  preloaded?.dispose()
  preloaded = null
  preloadTask = undefined
}

export function preloadStudioHdri(url: string): Promise<void> {
  if (preloadTask) return preloadTask
  preloadTask = new Promise<void>((resolve, reject) => {
    new RGBELoader().load(
      url,
      (texture) => {
        preloaded = texture
        resolve()
      },
      undefined,
      () => reject(new Error('The studio lighting could not be loaded')),
    )
  })
  return preloadTask
}
