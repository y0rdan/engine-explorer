import { useGLTF } from '@react-three/drei'

export const ENGINE_MODEL_FILE = 'models/engine.glb'

export const MODEL_LOADING_MESSAGE = 'Loading engine model…'

export const MODEL_LOAD_ERROR =
  'The engine model could not be loaded. Refresh the page to try again.'

export const SCENE_LABEL = '3D car engine'

// Vite's BASE_URL includes the GitHub Pages project path and a trailing slash.
// The query is the file hash so a replaced GLB is not served from an old cache.
export function engineModelUrl(): string {
  return `${import.meta.env.BASE_URL}${ENGINE_MODEL_FILE}?v=${__ENGINE_MODEL_REV__}`
}

type GlbLoader = {
  load: (
    url: string,
    onLoad: (gltf: unknown) => void,
    onProgress?: (event: ProgressEvent<EventTarget>) => void,
    onError?: (error: unknown) => void,
  ) => void
}

function isPromise(value: unknown): value is Promise<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function'
}

let preloadTask: Promise<void> | undefined

export function clearEnginePreload(): void {
  preloadTask = undefined
}

// useGLTF.preload returns void and keeps a rejected load inside suspend-react,
// which never reaches a DOM error boundary. This promise settles from that load.
export function preloadEngineModel(url: string): Promise<void> {
  if (preloadTask) return preloadTask

  let settled = false
  let succeed = () => {}
  let fail = (_error: unknown) => {}
  preloadTask = new Promise<void>((resolve, reject) => {
    succeed = () => {
      if (settled) return
      settled = true
      resolve()
    }
    fail = (error: unknown) => {
      if (settled) return
      settled = true
      reject(error instanceof Error ? error : new Error('The engine model could not be loaded'))
    }
  })

  const pending = useGLTF.preload(url, false, undefined, (loader) => {
    const gltfLoader = loader as unknown as GlbLoader
    const load = gltfLoader.load.bind(gltfLoader)
    gltfLoader.load = (resource, onLoad, onProgress, onError) => {
      load(
        resource,
        (gltf) => {
          onLoad(gltf)
          succeed()
        },
        onProgress,
        (error) => {
          onError?.(error)
          fail(error)
        },
      )
    }
  }) as unknown

  if (isPromise(pending)) {
    pending.then(() => succeed()).catch((error: unknown) => fail(error))
  }

  return preloadTask
}
