import { Mesh, MeshBasicMaterial, PerspectiveCamera, BoxGeometry } from 'three'
import { describe, expect, it } from 'vitest'
import { frameModel } from './frameModel.ts'

function engineStandIn(): Mesh {
  const mesh = new Mesh(new BoxGeometry(0.7, 0.8, 0.7), new MeshBasicMaterial())
  mesh.position.set(0, 0.4, 0)
  mesh.name = 'car-engine_body'
  return mesh
}

describe('frameModel', () => {
  it('keeps the model in frame on a phone-width and a desktop viewport', () => {
    const object = engineStandIn()
    const narrow = new PerspectiveCamera(42, 390 / 700, 0.1, 10)
    const wide = new PerspectiveCamera(42, 1280 / 720, 0.1, 10)
    narrow.position.set(0, 0, 0)
    wide.position.set(0, 0, 0)

    frameModel(narrow, null, object, 390, 700)
    frameModel(wide, null, object, 1280, 720)

    for (const camera of [narrow, wide]) {
      const toward = camera.position.clone().sub(object.position).normalize()
      const view = camera.getWorldDirection(toward.clone()).normalize()
      expect(camera.position.distanceTo(object.position)).toBeGreaterThan(0.5)
      expect(view.dot(object.position.clone().sub(camera.position).normalize())).toBeGreaterThan(0.99)
    }

    expect(narrow.position.distanceTo(object.position)).not.toBeCloseTo(
      wide.position.distanceTo(object.position),
      2,
    )
  })
})
