import { Box3, Mesh, MeshBasicMaterial, PerspectiveCamera, BoxGeometry, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { fitPose, frameModel, projectBox, shouldRefit, SHOWROOM_DIRECTION } from './frameModel.ts'

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

describe('fitPose', () => {
  const box = new Box3(new Vector3(-0.28, 0.02, -0.16), new Vector3(0.28, 0.62, 0.16))

  it('uses about 1.28 padding so a powertrain box fills the desktop frame', () => {
    const loose = fitPose(30, 1280, 800, box, SHOWROOM_DIRECTION, 1.46)
    const pose = fitPose(30, 1280, 800, box, SHOWROOM_DIRECTION, 1.28)
    expect(pose).toBeTruthy()
    expect(loose).toBeTruthy()
    expect(pose!.position.distanceTo(pose!.target)).toBeLessThan(loose!.position.distanceTo(loose!.target))
    const camera = new PerspectiveCamera(30, 1280 / 800, pose!.near, pose!.far)
    camera.position.copy(pose!.position)
    camera.lookAt(pose!.target)
    const projected = projectBox(camera, box)
    expect(projected.height).toBeGreaterThan(0.55)
    expect(projected.height).toBeLessThan(0.9)
    expect(projected.width).toBeLessThan(0.95)
  })

  it('keeps the subject in frame on a 390px phone and shifts it above a bottom sheet', () => {
    const pose = fitPose(30, 390, 700, box, SHOWROOM_DIRECTION, 1.28, {
      top: 16,
      right: 12,
      bottom: 360,
      left: 12,
    })
    expect(pose).toBeTruthy()
    const camera = new PerspectiveCamera(30, 390 / 700, pose!.near, pose!.far)
    camera.position.copy(pose!.position)
    camera.lookAt(pose!.target)
    const projected = projectBox(camera, box)
    expect(projected.width).toBeLessThan(1)
    expect(projected.height).toBeLessThan(1)
    expect(projected.centerY).toBeGreaterThan(0.05)
    expect(pose!.position.y).toBeGreaterThan(pose!.target.y * 0.2)
  })

  it('refits on an explicit request and yields while the user is dragging', () => {
    expect(shouldRefit({ tokenChanged: true, sizeChanged: false, playing: true, userHold: true, userFramed: true })).toBe(
      true,
    )
    expect(shouldRefit({ tokenChanged: false, sizeChanged: false, playing: true, userHold: true, userFramed: false })).toBe(
      false,
    )
    expect(shouldRefit({ tokenChanged: false, sizeChanged: false, playing: true, userHold: false, userFramed: false })).toBe(
      true,
    )
  })
})
