import { CanvasTexture, NoColorSpace, RepeatWrapping } from 'three'

function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function canvasTexture(size: number, paint: (data: Uint8ClampedArray, size: number) => void, repeatX: number): CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return null
  const image = context.createImageData(size, size)
  paint(image.data, size)
  context.putImageData(image, 0, 0)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(repeatX, repeatX)
  texture.colorSpace = NoColorSpace
  return texture
}

let roughness: CanvasTexture | null | undefined
let ribs: CanvasTexture | null | undefined

export function disposeGeneratedTextures(): void {
  roughness?.dispose()
  ribs?.dispose()
  roughness = undefined
  ribs = undefined
}

export function roughnessTexture(): CanvasTexture | null {
  if (roughness !== undefined) return roughness
  roughness = canvasTexture(128, (data, size) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const grain = hash(x, y)
        const value = 214 + Math.floor((grain - 0.5) * 22)
        const index = (y * size + x) * 4
        data[index] = value
        data[index + 1] = value
        data[index + 2] = value
        data[index + 3] = 255
      }
    }
  }, 2)
  return roughness
}

export function ribTexture(): CanvasTexture | null {
  if (ribs !== undefined) return ribs
  ribs = canvasTexture(64, (data, size) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const rib = x % 8 < 2 ? 70 : 28
        const index = (y * size + x) * 4
        data[index] = rib
        data[index + 1] = rib
        data[index + 2] = rib
        data[index + 3] = 255
      }
    }
  }, 1)
  return ribs
}
