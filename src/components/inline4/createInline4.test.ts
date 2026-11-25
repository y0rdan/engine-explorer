import createContext from 'gl'
import { Group, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer, type Object3D } from 'three'
import { describe, expect, it } from 'vitest'
import { genericInline4 } from '../../data/engines/catalog.ts'
import { layoutFromEngine } from '../../engine/layout.ts'
import { createFloor, createInline4, createStand, createTray, pedestalRadius } from './createInline4.ts'

const SHADOW_BUDGET = 40

function webgl2(context: ReturnType<typeof createContext>): ReturnType<typeof createContext> {
  return new Proxy(context, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver)
      if (typeof prop !== 'string') return undefined
      return () => null
    },
  })
}

function showroom(): Object3D {
  const layout = layoutFromEngine(genericInline4)
  const root = new Group()
  root.add(createInline4(genericInline4))
  root.add(createStand(layout))
  root.add(createFloor(pedestalRadius(layout)))
  root.add(createTray(layout))
  root.traverse((object) => {
    const mesh = object as Mesh
    if (!mesh.isMesh) return
    if (!mesh.material) mesh.material = new MeshStandardMaterial({ color: '#8d939a' })
  })
  return root
}

describe('settled render budget', () => {
  it('keeps renderer.info under 100 draws after the shadow budget', () => {
    const width = 256
    const height = 256
    const raw = createContext(width, height, { preserveDrawingBuffer: true })
    if (!raw) throw new Error('headless WebGL context was not created')
    const context = webgl2(raw)
    const canvas = {
      width,
      height,
      style: {},
      clientWidth: width,
      clientHeight: height,
      addEventListener() {},
      removeEventListener() {},
    }
    const renderer = new WebGLRenderer({
      canvas: canvas as unknown as HTMLCanvasElement,
      context: context as unknown as WebGLRenderingContext,
      antialias: false,
    })
    const scene = new Scene()
    scene.add(showroom())
    const camera = new PerspectiveCamera(30, 1, 0.01, 80)
    camera.position.set(-1.2, 0.8, 0.9)
    camera.lookAt(0, 0.3, 0)
    for (let frame = 0; frame < SHADOW_BUDGET; frame += 1) renderer.render(scene, camera)
    renderer.info.reset()
    renderer.render(scene, camera)
    expect(renderer.info.render.calls).toBeGreaterThan(10)
    expect(renderer.info.render.calls).toBeLessThan(100)
    expect(renderer.info.render.triangles).toBeGreaterThan(1000)
    renderer.dispose()
    context.getExtension('STACKGL_destroy_context')?.destroy?.()
  })
})
