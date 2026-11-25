import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js'
import type { Camera, Scene } from 'three'

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

export function renderLabels(renderer: CSS2DRenderer, scene: Scene, camera: Camera): void {
  renderer.render(scene, camera)
}
