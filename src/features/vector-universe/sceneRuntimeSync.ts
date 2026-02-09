import * as THREE from 'three'

import { resolveVectorUniverseLod } from './lod'
import { toPositionTuple, tupleChanged, wrapCoordinate } from './sceneHelpers'
import type { SceneEntry } from './sceneGraphBuilder'
import type { SceneInputState } from './sceneInputController'
import type {
  VectorUniverseLodCounts,
  VectorUniverseLodLevel,
  VectorUniverseSceneSettings,
} from './types'

interface CreateLodSyncParams {
  entries: SceneEntry[]
  camera: THREE.PerspectiveCamera
  focusNodeId: string | null
  setLodCounts: (nextCounts: VectorUniverseLodCounts) => void
  setFocusLod: (nextFocusLod: VectorUniverseLodLevel | null) => void
  initialCounts: VectorUniverseLodCounts
  initialFocusLod: VectorUniverseLodLevel | null
}

interface CreateForwardRaycastSyncParams {
  controlsEnabled: boolean
  camera: THREE.PerspectiveCamera
  rayDirection: THREE.Vector3
  raycaster: THREE.Raycaster
  raycastTargets: THREE.Object3D[]
  entryByObject: Map<THREE.Object3D, SceneEntry>
  selectionFrame: THREE.Sprite
  raycastDistance: number
  setTargetNodeId: (targetNodeId: string | null) => void
  initialTargetNodeId: string | null
}

interface CreateCameraHudSyncParams {
  camera: THREE.PerspectiveCamera
  setCameraPosition: (nextPosition: [number, number, number]) => void
  setCameraForward: (nextForward: [number, number, number]) => void
  setCameraYaw: (nextYaw: number) => void
  initialCameraPosition: [number, number, number]
  initialCameraForward: [number, number, number]
  initialCameraYaw: number
}

interface CreateCameraHudSyncResult {
  sync: (yaw: number, pitch: number) => void
}

interface ApplyCameraMovementParams {
  camera: THREE.PerspectiveCamera
  controlsEnabled: boolean
  inputState: SceneInputState
  sceneSettings: VectorUniverseSceneSettings
  universeHalfExtent: number
  deltaSeconds: number
  forward: THREE.Vector3
  right: THREE.Vector3
  up: THREE.Vector3
  movement: THREE.Vector3
}

export function createLodSync({
  entries,
  camera,
  focusNodeId,
  setLodCounts,
  setFocusLod,
  initialCounts,
  initialFocusLod,
}: CreateLodSyncParams): () => void {
  let lastCounts = initialCounts
  let lastFocusLod = initialFocusLod

  return () => {
    const nextCounts: VectorUniverseLodCounts = {
      far: 0,
      mid: 0,
      near: 0,
    }
    let nextFocusLod: VectorUniverseLodLevel | null = null

    for (const entry of entries) {
      const distance = camera.position.distanceTo(entry.position)
      const lodLevel = resolveVectorUniverseLod(distance)
      nextCounts[lodLevel] += 1

      entry.point.visible = lodLevel === 'far'
      entry.thumbnail.visible = lodLevel === 'mid' || lodLevel === 'near'
      entry.resolutionLabel.visible = lodLevel === 'near'

      if (entry.node.id === focusNodeId) {
        nextFocusLod = lodLevel
      }
    }

    const countsChanged =
      nextCounts.far !== lastCounts.far ||
      nextCounts.mid !== lastCounts.mid ||
      nextCounts.near !== lastCounts.near

    if (countsChanged) {
      lastCounts = nextCounts
      setLodCounts(nextCounts)
    }

    if (nextFocusLod !== lastFocusLod) {
      lastFocusLod = nextFocusLod
      setFocusLod(nextFocusLod)
    }
  }
}

export function createForwardRaycastSync({
  controlsEnabled,
  camera,
  rayDirection,
  raycaster,
  raycastTargets,
  entryByObject,
  selectionFrame,
  raycastDistance,
  setTargetNodeId,
  initialTargetNodeId,
}: CreateForwardRaycastSyncParams): () => void {
  let lastTargetId = initialTargetNodeId

  return () => {
    if (!controlsEnabled) {
      selectionFrame.visible = false
      if (lastTargetId !== null) {
        lastTargetId = null
        setTargetNodeId(null)
      }
      return
    }

    camera.updateMatrixWorld(true)
    camera.getWorldDirection(rayDirection).normalize()
    raycaster.set(camera.position, rayDirection)
    raycaster.camera = camera
    raycaster.near = 0
    raycaster.far = raycastDistance

    const intersections = raycaster.intersectObjects(raycastTargets, false)
    const firstValid = intersections.find((item) => item.distance <= raycastDistance)
    const targetEntry = firstValid ? entryByObject.get(firstValid.object) ?? null : null

    if (targetEntry) {
      selectionFrame.visible = true
      selectionFrame.position.copy(targetEntry.thumbnail.position)
      selectionFrame.scale.set(targetEntry.thumbnail.scale.x * 1.16, targetEntry.thumbnail.scale.y * 1.16, 1)
    } else {
      selectionFrame.visible = false
    }

    const nextTargetId = targetEntry?.node.id ?? null
    if (nextTargetId !== lastTargetId) {
      lastTargetId = nextTargetId
      setTargetNodeId(nextTargetId)
    }
  }
}

export function createCameraHudSync({
  camera,
  setCameraPosition,
  setCameraForward,
  setCameraYaw,
  initialCameraPosition,
  initialCameraForward,
  initialCameraYaw,
}: CreateCameraHudSyncParams): CreateCameraHudSyncResult {
  let lastCameraPosition = initialCameraPosition
  let lastCameraForward = initialCameraForward
  let lastCameraYaw = initialCameraYaw

  const sync = (yaw: number, pitch: number) => {
    const nextPosition = toPositionTuple([
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ])
    const nextForward = toPositionTuple([
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    ])

    const nextYaw = Number(yaw.toFixed(6))
    const yawChanged = Math.abs(nextYaw - lastCameraYaw) > 0.001
    if (yawChanged) {
      lastCameraYaw = nextYaw
      setCameraYaw(nextYaw)
    }

    if (tupleChanged(nextForward, lastCameraForward)) {
      lastCameraForward = nextForward
      setCameraForward(nextForward)
    }

    if (!tupleChanged(nextPosition, lastCameraPosition)) {
      return
    }

    lastCameraPosition = nextPosition
    setCameraPosition(nextPosition)
  }

  return {
    sync,
  }
}

export function applyCameraMovement({
  camera,
  controlsEnabled,
  inputState,
  sceneSettings,
  universeHalfExtent,
  deltaSeconds,
  forward,
  right,
  up,
  movement,
}: ApplyCameraMovementParams): void {
  if (!controlsEnabled) {
    return
  }

  if (
    !inputState.moveUpActive &&
    !inputState.moveDownActive &&
    !inputState.moveLeftActive &&
    !inputState.moveRightActive &&
    !inputState.mouseForward &&
    !inputState.mouseBackward
  ) {
    return
  }

  forward.setFromMatrixColumn(camera.matrixWorld, 2).multiplyScalar(-1).normalize()
  right.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
  up.setFromMatrixColumn(camera.matrixWorld, 1).normalize()

  movement.set(0, 0, 0)

  if (inputState.moveUpActive) {
    movement.add(up)
  }
  if (inputState.moveDownActive) {
    movement.sub(up)
  }
  if (inputState.moveRightActive) {
    movement.add(right)
  }
  if (inputState.moveLeftActive) {
    movement.sub(right)
  }
  if (inputState.mouseForward) {
    movement.add(forward)
  }
  if (inputState.mouseBackward) {
    movement.sub(forward)
  }

  if (movement.lengthSq() <= 0) {
    return
  }

  movement.normalize()
  const speedMultiplier = inputState.accelerateActive
    ? sceneSettings.sprintMultiplier
    : 1

  camera.position.addScaledVector(movement, sceneSettings.moveSpeed * speedMultiplier * deltaSeconds)
  camera.position.set(
    wrapCoordinate(camera.position.x, universeHalfExtent),
    wrapCoordinate(camera.position.y, universeHalfExtent),
    wrapCoordinate(camera.position.z, universeHalfExtent),
  )
}
