export const ENGINE_MODEL_FILE = 'models/engine.glb'

export const MODEL_LOADING_MESSAGE = 'Loading engine model…'

export const MODEL_LOAD_ERROR =
  'The engine model could not be loaded. Refresh the page to try again.'

export const SCENE_LABEL = '3D car engine'

// Vite's BASE_URL includes the GitHub Pages project path and a trailing slash.
export function engineModelUrl(): string {
  return `${import.meta.env.BASE_URL}${ENGINE_MODEL_FILE}`
}
