import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import { Vector3, type Camera, type Scene } from 'three'

const BADGE = 28

export type ScreenPoint = { x: number; y: number }

// Lay head-bolt badges out as two rows of five, centered on the bolts, with
// a fixed pixel gap so the numbers do not stack.
export function spreadBoltBadges(
  points: readonly ScreenPoint[],
  viewport: { width: number; height: number },
  gap = BADGE + 4,
): ScreenPoint[] {
  if (points.length === 0) return []
  const columns = Math.min(5, points.length)
  const rows = Math.ceil(points.length / columns)
  const gridWidth = (columns - 1) * gap
  const gridHeight = (rows - 1) * gap
  const centerX = points.reduce((sum, point) => sum + point.x, 0) / points.length
  const centerY = points.reduce((sum, point) => sum + point.y, 0) / points.length
  const originX = Math.min(viewport.width - 16 - gridWidth, Math.max(16, centerX - gridWidth / 2))
  const originY = Math.min(viewport.height - 16 - gridHeight, Math.max(16, centerY - gridHeight / 2))
  return points.map((_, index) => ({
    x: originX + (index % columns) * gap,
    y: originY + Math.floor(index / columns) * gap,
  }))
}

export function createLabelRenderer(): CSS2DRenderer {
  return new CSS2DRenderer()
}

export function attachLabelRenderer(renderer: CSS2DRenderer, parent: HTMLElement, width: number, height: number): void {
  renderer.setSize(width, height)
  renderer.domElement.style.position = 'absolute'
  renderer.domElement.style.inset = '0'
  renderer.domElement.style.pointerEvents = 'none'
  parent.appendChild(renderer.domElement)
}

const projected = new Vector3()

export function renderLabels(renderer: CSS2DRenderer, scene: Scene, camera: Camera, width: number, height: number): void {
  renderer.render(scene, camera)
  const labels = scene.getObjectByName('bolt-labels')
  if (!labels) return
  const visible = labels.children.filter((child) => child.visible)
  if (visible.length === 0) return
  const sources = visible.map((child) => {
    child.getWorldPosition(projected)
    projected.project(camera)
    return {
      x: (projected.x * 0.5 + 0.5) * width,
      y: (-projected.y * 0.5 + 0.5) * height,
    }
  })
  const placed = spreadBoltBadges(sources, { width, height })
  visible.forEach((child, index) => {
    const point = placed[index]
    if (!point) return
    const element = (child as CSS2DObject).element
    element.style.transform = `translate(-50%, -50%) translate(${point.x}px, ${point.y}px)`
  })
}
