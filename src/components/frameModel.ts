import { Box3, PerspectiveCamera, Vector3, type Object3D } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

// From the engine center toward a 3/4 camera: front (-X), above, and slightly to the right (+Z).
export const SHOWROOM_DIRECTION = new Vector3(-1.15, 0.74, 0.62).normalize()

export type ScreenPadding = { top: number; right: number; bottom: number; left: number }

export type FramePose = {
  position: Vector3
  target: Vector3
  near: number
  far: number
  radius: number
  minDistance: number
  maxDistance: number
}

const NO_PADDING: ScreenPadding = { top: 0, right: 0, bottom: 0, left: 0 }

export function isOrbitControls(value: unknown): value is OrbitControlsImpl {
  if (typeof value !== 'object' || value === null) return false
  return 'target' in value && 'update' in value && 'minDistance' in value
}

export type ShowroomControls = {
  setLookAt: (
    positionX: number,
    positionY: number,
    positionZ: number,
    targetX: number,
    targetY: number,
    targetZ: number,
    enableTransition?: boolean,
  ) => void
  minDistance: number
  maxDistance: number
  getTarget: (out: Vector3, receiveEndValue?: boolean) => Vector3
  addEventListener: (type: string, listener: (event?: { type: string }) => void) => void
  removeEventListener: (type: string, listener: (event?: { type: string }) => void) => void
  update: (delta: number) => boolean | void
}

export function isShowroomControls(value: unknown): value is ShowroomControls {
  if (typeof value !== 'object' || value === null) return false
  return 'setLookAt' in value && 'getTarget' in value && 'update' in value
}

// Frames a static model. Mutates the camera and orbit target three.js already owns.
export function frameModel(
  camera: PerspectiveCamera,
  controls: OrbitControlsImpl | null,
  object: Object3D,
  width: number,
  height: number,
): void {
  const pose = fitPose(camera.fov, width, height, new Box3().setFromObject(object), new Vector3(0.95, 0.62, 1))
  if (!pose) return
  camera.position.copy(pose.position)
  camera.near = pose.near
  camera.far = pose.far
  camera.lookAt(pose.target)
  camera.updateProjectionMatrix()
  if (controls !== null) {
    controls.target.copy(pose.target)
    controls.minDistance = pose.minDistance
    controls.maxDistance = pose.maxDistance
    controls.update()
  }
}

export function fitPose(
  fovDeg: number,
  width: number,
  height: number,
  box: Box3,
  direction: Vector3,
  padding = 1.28,
  screen: ScreenPadding = NO_PADDING,
): FramePose | null {
  if (box.isEmpty()) return null
  const center = box.getCenter(new Vector3())
  const view = viewBasis(direction)
  let halfW = 0.001
  let halfH = 0.001
  const corner = new Vector3()
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        corner.set(x, y, z).sub(center)
        halfW = Math.max(halfW, Math.abs(corner.dot(view.right)))
        halfH = Math.max(halfH, Math.abs(corner.dot(view.up)))
      }
    }
  }
  const availW = Math.max(width - screen.left - screen.right, 1)
  const availH = Math.max(height - screen.top - screen.bottom, 1)
  const vertical = (fovDeg * Math.PI) / 180
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * (width / Math.max(height, 1)))
  const distanceH = (halfH / Math.tan(vertical / 2)) * (height / availH) * padding
  const distanceW = (halfW / Math.tan(horizontal / 2)) * (width / availW) * padding
  const distance = Math.max(distanceH, distanceW, 0.2)
  const freeX = (screen.left + (width - screen.right)) / 2
  const freeY = (screen.top + (height - screen.bottom)) / 2
  const ndcX = (freeX / Math.max(width, 1)) * 2 - 1
  const ndcY = 1 - (freeY / Math.max(height, 1)) * 2
  const worldHalfH = Math.tan(vertical / 2) * distance
  const worldHalfW = worldHalfH * (width / Math.max(height, 1))
  const target = center
    .clone()
    .addScaledVector(view.right, -ndcX * worldHalfW)
    .addScaledVector(view.up, -ndcY * worldHalfH)
  const radius = Math.max(halfW, halfH, box.getSize(new Vector3()).length() * 0.5)
  return {
    position: target.clone().addScaledVector(view.direction, distance),
    target,
    near: Math.min(0.02, Math.max(distance / 250, 0.005)),
    far: Math.max(distance * 30, 20),
    radius,
    minDistance: Math.max(radius * 0.42, 0.06),
    maxDistance: Math.max(radius * 14, 4),
  }
}

export function viewBasis(direction: Vector3): { direction: Vector3; right: Vector3; up: Vector3 } {
  const viewDirection = direction.clone().normalize()
  if (viewDirection.lengthSq() < 1e-8) viewDirection.set(-1, 0.7, 0.6).normalize()
  const right = new Vector3().crossVectors(new Vector3(0, 1, 0), viewDirection)
  if (right.lengthSq() < 1e-8) right.set(1, 0, 0)
  right.normalize()
  const up = new Vector3().crossVectors(viewDirection, right).normalize()
  return { direction: viewDirection, right, up }
}

export function projectBox(camera: PerspectiveCamera, box: Box3): { width: number; height: number; centerY: number } {
  const corner = new Vector3()
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  camera.updateMatrixWorld()
  camera.updateProjectionMatrix()
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        corner.set(x, y, z).project(camera)
        minX = Math.min(minX, corner.x)
        maxX = Math.max(maxX, corner.x)
        minY = Math.min(minY, corner.y)
        maxY = Math.max(maxY, corner.y)
      }
    }
  }
  return { width: (maxX - minX) / 2, height: (maxY - minY) / 2, centerY: (minY + maxY) / 2 }
}

const FIT_STEP_EPSILON = 0.0008

function lookAt(controls: ShowroomControls, pose: FramePose, smooth: boolean): void {
  controls.setLookAt(pose.position.x, pose.position.y, pose.position.z, pose.target.x, pose.target.y, pose.target.z, smooth)
  controls.minDistance = pose.minDistance
  controls.maxDistance = pose.maxDistance
}

// Snap, then flush once. setLookAt marks the controls dirty; update() applies the
// pose and clears that flag. A later damped update must not be required.
function snapPose(controls: ShowroomControls, camera: PerspectiveCamera, pose: FramePose): Vector3 {
  camera.position.copy(pose.position)
  lookAt(controls, pose, false)
  controls.update(0)
  const target = new Vector3()
  controls.getTarget(target, true)
  return target
}

export function applyShowroomPose(
  controls: ShowroomControls,
  camera: PerspectiveCamera,
  pose: FramePose,
  smooth: boolean,
  step: number,
): { moving: boolean; target: Vector3 } {
  const beforePos = camera.position.clone()
  const beforeTarget = new Vector3()
  controls.getTarget(beforeTarget, true)
  if (!smooth) {
    const target = snapPose(controls, camera, pose)
    return { moving: false, target }
  }
  lookAt(controls, pose, true)
  controls.update(step)
  const target = new Vector3()
  controls.getTarget(target, true)
  const remain = Math.max(camera.position.distanceTo(pose.position), target.distanceTo(pose.target))
  const stepped = Math.max(camera.position.distanceTo(beforePos), target.distanceTo(beforeTarget))
  if (remain < 0.008 || stepped < FIT_STEP_EPSILON) {
    return { moving: false, target: snapPose(controls, camera, pose) }
  }
  return { moving: true, target }
}

export function clampCameraPlane(camera: PerspectiveCamera, controls: ShowroomControls): void {
  const target = new Vector3()
  const distance = camera.position.distanceTo(controls.getTarget(target, true))
  const near = Math.min(0.05, Math.max(distance / 200, 0.008))
  const far = Math.max(30, distance * 16)
  if (Math.abs(camera.near - near) > 0.002 || Math.abs(camera.far - far) > 0.5) {
    camera.near = near
    camera.far = far
    camera.updateProjectionMatrix()
  }
  // setLookAt marks camera-controls dirty even when the numbers did not change.
  // Only issue it when the settled target is still below the floor.
  if (target.y < 0.04) {
    controls.setLookAt(
      camera.position.x,
      Math.max(camera.position.y, 0.08),
      camera.position.z,
      target.x,
      0.04,
      target.z,
      false,
    )
  }
}

export function shouldRefit(input: {
  tokenChanged: boolean
  sizeChanged: boolean
  playing: boolean
  userHold: boolean
  userFramed: boolean
}): boolean {
  if (input.tokenChanged || input.sizeChanged) return true
  if (input.userHold || input.userFramed) return false
  return input.playing
}
