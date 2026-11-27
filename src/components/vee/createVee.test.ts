import { Group, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, WebGLRenderer, type Object3D } from 'three'
import { describe, expect, it } from 'vitest'
import { genericInline4, genericV6, genericV8 } from '../../data/engines/catalog.ts'
import { createInline4, createFloor, createStand, createTray, pedestalRadius } from '../inline4/createInline4.ts'
import { layoutFromEngine } from '../../engine/layout.ts'
import { createStubContext } from '../inline4/webglStub.ts'
import { createVee, createVeeShowroom } from './createVee.ts'

const SHADOW_BUDGET = 40

function measure(root: Object3D): number {
  const width = 256
  const height = 256
  const context = createStubContext(width, height)
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
    context,
    antialias: false,
  })
  const scene = new Scene()
  scene.add(root)
  const camera = new PerspectiveCamera(30, 1, 0.01, 80)
  camera.position.set(-1.2, 0.8, 0.9)
  camera.lookAt(0, 0.3, 0)
  for (let frame = 0; frame < SHADOW_BUDGET; frame += 1) renderer.render(scene, camera)
  renderer.info.reset()
  renderer.render(scene, camera)
  const calls = renderer.info.render.calls
  renderer.dispose()
  return calls
}

function paint(root: Object3D): Object3D {
  root.traverse((object) => {
    const mesh = object as Mesh
    if (!mesh.isMesh) return
    if (!mesh.material) mesh.material = new MeshStandardMaterial({ color: '#8d939a' })
  })
  return root
}

describe('settled render budget', () => {
  it('keeps the inline-4, V6, and V8 under 100 draws', () => {
    const inlineLayout = layoutFromEngine(genericInline4)
    const inlineRoot = new Group()
    inlineRoot.add(createInline4(genericInline4))
    inlineRoot.add(createStand(inlineLayout))
    inlineRoot.add(createFloor(pedestalRadius(inlineLayout)))
    inlineRoot.add(createTray(inlineLayout))
    const counts = {
      inline4: measure(paint(inlineRoot)),
      v6: measure(paint(createVeeShowroom(genericV6))),
      v8: measure(paint(createVeeShowroom(genericV8))),
    }
    expect(counts.inline4).toBeGreaterThan(10)
    expect(counts.inline4).toBeLessThan(100)
    expect(counts.v6).toBeGreaterThan(10)
    expect(counts.v6).toBeLessThan(100)
    expect(counts.v8).toBeGreaterThan(10)
    expect(counts.v8).toBeLessThan(100)
  })

  it('clips the sectioned castings and reserves a badge for every head bolt', () => {
    for (const engine of [genericV6, genericV8]) {
      const root = createVee(engine)
      const clipped = new Set<string>()
      root.traverse((object) => {
        if (!object.userData.clip) return
        let current = object.parent
        while (current) {
          if (current.name.startsWith('part:')) clipped.add(current.name.slice(5))
          current = current.parent
        }
      })
      for (const id of ['engine-block', 'oil-pan', 'cylinder-head-left', 'cylinder-head-right', 'valve-cover-left', 'valve-cover-right']) {
        expect(clipped.has(id)).toBe(true)
      }
      const bolts = engine.parts
        .filter((part) => part.id.startsWith('cylinder-head'))
        .reduce((sum, part) => sum + (part.fasteners.find((item) => item.id === 'head-bolts')?.count ?? 0), 0)
      expect(root.getObjectByName('bolt-labels')?.children.length).toBe(bolts)
      expect(bolts).toBeGreaterThan(8)
    }
  })
})
