import { Box3, PerspectiveCamera, Sphere, Vector3, type Object3D } from 'three'

// From the engine center toward a 3/4 camera: front (-X), above, and to the right (+Z).
export const SHOWROOM_DIRECTION = new Vector3(-1.05, 0.62, 0.9).normalize()
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export function isOrbitControls(value: unknown): value is OrbitControlsImpl {
  if (typeof value !== 'object' || value === null) return false
  return 'target' in value && 'update' in value && 'minDistance' in value
}

// Frames a static model. Mutates the camera and orbit target three.js already owns.
export function frameModel(
  camera: PerspectiveCamera,
  controls: OrbitControlsImpl | null,
  object: Object3D,
  width: number,
  height: number,
): void {
  const box = new Box3().setFromObject(object)
  if (box.isEmpty()) return

  const sphere = box.getBoundingSphere(new Sphere())
  const radius = Math.max(sphere.radius, 0.001)
  const center = sphere.center
  const aspect = width / Math.max(height, 1)
  const vertical = (camera.fov * Math.PI) / 180
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect)
  const distance = (radius / Math.sin(Math.min(vertical, horizontal) / 2)) * 1.28
  const direction = new Vector3(0.95, 0.62, 1).normalize()

  camera.position.copy(center).addScaledVector(direction, distance)
  camera.near = Math.max(distance / 200, 0.01)
  camera.far = distance * 24
  camera.lookAt(center)
  camera.updateProjectionMatrix()

  if (controls !== null) {
    controls.target.copy(center)
    controls.minDistance = radius * 0.35
    controls.maxDistance = radius * 12
    controls.update()
  }
}

export function fitPose(
  fovDeg: number,
  width: number,
  height: number,
  box: Box3,
  direction: Vector3,
  padding = 1.46,
): { position: Vector3; target: Vector3; near: number; far: number; radius: number } | null {
  if (box.isEmpty()) return null
  const sphere = box.getBoundingSphere(new Sphere())
  const radius = Math.max(sphere.radius, 0.001)
  const aspect = width / Math.max(height, 1)
  const vertical = (fovDeg * Math.PI) / 180
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * aspect)
  const distance = (radius / Math.sin(Math.min(vertical, horizontal) / 2)) * padding
  return {
    position: sphere.center.clone().addScaledVector(direction.clone().normalize(), distance),
    target: sphere.center.clone(),
    near: Math.max(distance / 180, 0.01),
    far: Math.max(distance * 30, 20),
    radius,
  }
}
