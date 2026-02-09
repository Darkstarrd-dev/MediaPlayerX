import { useEffect, useState, type RefObject } from 'react'
import * as THREE from 'three'

import {
  mouseButtonToToken,
  normalizeShortcutBinding,
  shortcutMatches,
  shortcutMouseMatches,
} from '../../shortcuts'
import { clamp } from '../../utils/ui'
import { resolveVectorUniverseLod } from './lod'
import { buildSceneGraph } from './sceneGraphBuilder'
import {
  hasWebGLSupport,
  normalizeSceneSettings,
  toPositionTuple,
  tupleChanged,
  wrapCoordinate,
} from './sceneHelpers'
import type {
  VectorUniverseLodCounts,
  VectorUniverseLodLevel,
  VectorUniverseNode,
  VectorUniverseSceneSettings,
  VectorUniverseSceneState,
} from './types'
import type { VectorControlMap } from '../../vectorControls'

export { buildVectorUniverseNodes, buildVectorUniverseNodesByScope } from './nodeBuilder'

const MAX_FRAME_DELTA = 0.05
const MAX_PITCH = Math.PI / 2 - 0.02
const LOD_SYNC_INTERVAL_MS = 80
const HUD_SYNC_INTERVAL_MS = 120
const RAYCAST_SYNC_INTERVAL_MS = 60

const DEFAULT_LOD_COUNTS: VectorUniverseLodCounts = {
  far: 0,
  mid: 0,
  near: 0,
}

const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 0, 0]
const DEFAULT_CAMERA_FORWARD: [number, number, number] = [0, 0, -1]
const DEFAULT_WORLD_HALF_EXTENT = 40

interface UseVectorUniverseSceneParams {
  open: boolean
  containerRef: RefObject<HTMLDivElement | null>
  nodes: VectorUniverseNode[]
  focusNodeId: string | null
  controlsEnabled: boolean
  settings: VectorUniverseSceneSettings
  controls: VectorControlMap
}

export function useVectorUniverseScene({
  open,
  containerRef,
  nodes,
  focusNodeId,
  controlsEnabled,
  settings,
  controls,
}: UseVectorUniverseSceneParams): VectorUniverseSceneState {
  const [rendererReady, setRendererReady] = useState(false)
  const [pointerLocked, setPointerLocked] = useState(false)
  const [focusLod, setFocusLod] = useState<VectorUniverseLodLevel | null>(null)
  const [lodCounts, setLodCounts] = useState<VectorUniverseLodCounts>(DEFAULT_LOD_COUNTS)
  const [worldHalfExtent, setWorldHalfExtent] = useState(DEFAULT_WORLD_HALF_EXTENT)
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>(DEFAULT_CAMERA_POSITION)
  const [cameraForward, setCameraForward] = useState<[number, number, number]>(DEFAULT_CAMERA_FORWARD)
  const [cameraYaw, setCameraYaw] = useState(0)
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setRendererReady(false)
      setPointerLocked(false)
      setFocusLod(null)
      setLodCounts(DEFAULT_LOD_COUNTS)
      setWorldHalfExtent(DEFAULT_WORLD_HALF_EXTENT)
      setCameraPosition(DEFAULT_CAMERA_POSITION)
      setCameraForward(DEFAULT_CAMERA_FORWARD)
      setCameraYaw(0)
      setTargetNodeId(null)
      return
    }

    const host = containerRef.current
    if (!host || !hasWebGLSupport()) {
      setRendererReady(false)
      setPointerLocked(false)
      setFocusLod(null)
      setLodCounts(DEFAULT_LOD_COUNTS)
      setWorldHalfExtent(DEFAULT_WORLD_HALF_EXTENT)
      setCameraPosition(DEFAULT_CAMERA_POSITION)
      setCameraForward(DEFAULT_CAMERA_FORWARD)
      setCameraYaw(0)
      setTargetNodeId(null)
      return
    }

    const sceneSettings = normalizeSceneSettings(settings)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#03070d')
    scene.fog = new THREE.FogExp2('#03070d', 0.012)

    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 3200)

    let rendererInstance: THREE.WebGLRenderer
    try {
      rendererInstance = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    } catch {
      setRendererReady(false)
      setPointerLocked(false)
      setFocusLod(null)
      setLodCounts(DEFAULT_LOD_COUNTS)
      setWorldHalfExtent(DEFAULT_WORLD_HALF_EXTENT)
      setCameraPosition(DEFAULT_CAMERA_POSITION)
      setCameraForward(DEFAULT_CAMERA_FORWARD)
      setCameraYaw(0)
      setTargetNodeId(null)
      return
    }

    const renderer = rendererInstance
    const canvas = renderer.domElement
    canvas.className = 'vector-universe-canvas'
    canvas.setAttribute('aria-label', '向量宇宙三维场景')
    host.replaceChildren(canvas)

    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

    const syncViewportSize = () => {
      const rect = host.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width || host.clientWidth || 1))
      const height = Math.max(1, Math.floor(rect.height || host.clientHeight || 1))
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    syncViewportSize()

    const resizeObserver = new ResizeObserver(() => syncViewportSize())
    resizeObserver.observe(host)

    const ambientLight = new THREE.HemisphereLight('#b6dfff', '#1d242b', 0.62)
    const keyLight = new THREE.DirectionalLight('#f8fcff', 0.72)
    keyLight.position.set(26, 42, 18)
    scene.add(ambientLight, keyLight)

    const {
      entries,
      raycastTargets,
      entryByObject,
      selectionFrame,
      universeHalfExtent,
      focusPosition,
      disposableGeometries,
      disposableMaterials,
      disposableTextures,
    } = buildSceneGraph({
      scene,
      nodes,
      focusNodeId,
      dispersion: sceneSettings.dispersion,
    })

    setWorldHalfExtent(Number(universeHalfExtent.toFixed(3)))

    camera.position.set(focusPosition.x + 8.5, focusPosition.y + 2.4, focusPosition.z + 13)
    camera.lookAt(focusPosition)
    camera.updateMatrixWorld(true)

    const initialEuler = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ')
    let yaw = initialEuler.y
    let pitch = initialEuler.x

    let moveUpActive = false
    let moveDownActive = false
    let moveLeftActive = false
    let moveRightActive = false
    let accelerateActive = false
    let mouseForward = false
    let mouseBackward = false

    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()
    const up = new THREE.Vector3()
    const movement = new THREE.Vector3()
    const rayDirection = new THREE.Vector3()
    const raycaster = new THREE.Raycaster()

    const clearInputs = () => {
      moveUpActive = false
      moveDownActive = false
      moveLeftActive = false
      moveRightActive = false
      accelerateActive = false
      mouseForward = false
      mouseBackward = false
    }

    const bindingContainsMouseButton = (binding: string, button: number): boolean => {
      const normalized = normalizeShortcutBinding(binding)
      if (!normalized) {
        return false
      }

      const token = mouseButtonToToken(button)
      return normalized.split('|').some((combo) => combo.endsWith(token))
    }

    let pointerRelockTimer = 0
    let pointerRelockRaf = 0
    let pointerAutoLockEnabled = true

    const syncPointerLock = () => {
      const isLocked = document.pointerLockElement === canvas
      setPointerLocked((previous) => (previous === isLocked ? previous : isLocked))
      if (!isLocked) {
        mouseForward = false
        mouseBackward = false

        if (pointerAutoLockEnabled) {
          pointerRelockTimer = window.setTimeout(() => {
            requestPointerLock()
          }, 0)
        }
      }
    }

    const requestPointerLock = () => {
      if (document.pointerLockElement === canvas) {
        return
      }

      if (!canvas.isConnected || canvas.ownerDocument !== document) {
        return
      }

      const request = (canvas as HTMLCanvasElement & { requestPointerLock?: () => void }).requestPointerLock
      if (!request) {
        return
      }

      try {
        const maybePromise = request.call(canvas) as unknown
        if (
          typeof maybePromise === 'object' &&
          maybePromise !== null &&
          'catch' in maybePromise &&
          typeof (maybePromise as { catch: (handler: () => void) => void }).catch === 'function'
        ) {
          ;(maybePromise as { catch: (handler: () => void) => void }).catch(() => undefined)
        }
      } catch {
        return
      }
    }

    const scheduleAutoPointerLock = () => {
      if (!pointerAutoLockEnabled || document.pointerLockElement === canvas) {
        return
      }

      pointerRelockRaf = window.requestAnimationFrame(() => {
        requestPointerLock()
      })
    }

    const onKeyDown = (event: KeyboardEvent) => {
      let matched = false

      if (shortcutMatches(controls.moveUp, event)) {
        matched = true
        if (controlsEnabled) {
          moveUpActive = true
        }
      }
      if (shortcutMatches(controls.moveDown, event)) {
        matched = true
        if (controlsEnabled) {
          moveDownActive = true
        }
      }
      if (shortcutMatches(controls.moveLeft, event)) {
        matched = true
        if (controlsEnabled) {
          moveLeftActive = true
        }
      }
      if (shortcutMatches(controls.moveRight, event)) {
        matched = true
        if (controlsEnabled) {
          moveRightActive = true
        }
      }
      if (shortcutMatches(controls.accelerate, event)) {
        matched = true
        if (controlsEnabled) {
          accelerateActive = true
        }
      }

      if (matched) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      let matched = false

      if (shortcutMatches(controls.moveUp, event)) {
        matched = true
        moveUpActive = false
      }
      if (shortcutMatches(controls.moveDown, event)) {
        matched = true
        moveDownActive = false
      }
      if (shortcutMatches(controls.moveLeft, event)) {
        matched = true
        moveLeftActive = false
      }
      if (shortcutMatches(controls.moveRight, event)) {
        matched = true
        moveRightActive = false
      }
      if (shortcutMatches(controls.accelerate, event)) {
        matched = true
        accelerateActive = false
      }

      if (matched) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) {
        return
      }

      yaw -= event.movementX * sceneSettings.lookSensitivity
      pitch = clamp(pitch - event.movementY * sceneSettings.lookSensitivity, -MAX_PITCH, MAX_PITCH)
    }

    const onMouseDown = (event: MouseEvent) => {
      requestPointerLock()

      let matched = false

      if (shortcutMouseMatches(controls.moveForward, event)) {
        matched = true
        if (controlsEnabled) {
          mouseForward = true
        }
      }
      if (shortcutMouseMatches(controls.moveBackward, event)) {
        matched = true
        if (controlsEnabled) {
          mouseBackward = true
        }
      }

      if (matched) {
        event.preventDefault()
        event.stopPropagation()
      }

      if (!controlsEnabled) {
        return
      }
    }

    const onMouseUp = (event: MouseEvent) => {
      if (shortcutMouseMatches(controls.moveForward, event) || bindingContainsMouseButton(controls.moveForward, event.button)) {
        mouseForward = false
      }

      if (shortcutMouseMatches(controls.moveBackward, event) || bindingContainsMouseButton(controls.moveBackward, event.button)) {
        mouseBackward = false
      }
    }

    const onCanvasContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }

    const onWindowFocus = () => {
      scheduleAutoPointerLock()
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('pointerlockchange', syncPointerLock)
    document.addEventListener('pointerlockerror', syncPointerLock)
    window.addEventListener('mouseup', onMouseUp, true)
    window.addEventListener('blur', clearInputs)
    window.addEventListener('focus', onWindowFocus)
    canvas.addEventListener('click', requestPointerLock)
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('contextmenu', onCanvasContextMenu)

    scheduleAutoPointerLock()

    let lastCounts = DEFAULT_LOD_COUNTS
    let lastFocusLod: VectorUniverseLodLevel | null = null
    let lastTargetId: string | null = null
    let lastCameraPosition: [number, number, number] = DEFAULT_CAMERA_POSITION
    let lastCameraForward: [number, number, number] = DEFAULT_CAMERA_FORWARD
    let lastCameraYaw = yaw
    let previousFrameTime = performance.now()
    let frameId = 0
    let lastLodSyncAt = 0
    let lastRaycastSyncAt = 0
    let lastCameraSyncAt = 0

    setCameraYaw(Number(yaw.toFixed(6)))

    const syncLod = () => {
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

    const syncForwardRaycast = () => {
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
      raycaster.far = sceneSettings.raycastDistance

      const intersections = raycaster.intersectObjects(raycastTargets, false)
      const firstValid = intersections.find((item) => item.distance <= sceneSettings.raycastDistance)
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

    const syncCameraPosition = () => {
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

    const renderFrame = (timestamp: number) => {
      const deltaSeconds = Math.min((timestamp - previousFrameTime) / 1000, MAX_FRAME_DELTA)
      previousFrameTime = timestamp

      camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'))
      camera.updateMatrixWorld()

      if (controlsEnabled && (moveUpActive || moveDownActive || moveLeftActive || moveRightActive || mouseForward || mouseBackward)) {
        forward.setFromMatrixColumn(camera.matrixWorld, 2).multiplyScalar(-1).normalize()
        right.setFromMatrixColumn(camera.matrixWorld, 0).normalize()
        up.setFromMatrixColumn(camera.matrixWorld, 1).normalize()

        movement.set(0, 0, 0)

        if (moveUpActive) {
          movement.add(up)
        }
        if (moveDownActive) {
          movement.sub(up)
        }
        if (moveRightActive) {
          movement.add(right)
        }
        if (moveLeftActive) {
          movement.sub(right)
        }
        if (mouseForward) {
          movement.add(forward)
        }
        if (mouseBackward) {
          movement.sub(forward)
        }

        if (movement.lengthSq() > 0) {
          movement.normalize()
          const speedMultiplier = accelerateActive
            ? sceneSettings.sprintMultiplier
            : 1

          camera.position.addScaledVector(movement, sceneSettings.moveSpeed * speedMultiplier * deltaSeconds)
          camera.position.set(
            wrapCoordinate(camera.position.x, universeHalfExtent),
            wrapCoordinate(camera.position.y, universeHalfExtent),
            wrapCoordinate(camera.position.z, universeHalfExtent),
          )
        }
      }

      if (timestamp - lastLodSyncAt >= LOD_SYNC_INTERVAL_MS) {
        lastLodSyncAt = timestamp
        syncLod()
      }

      if (timestamp - lastRaycastSyncAt >= RAYCAST_SYNC_INTERVAL_MS) {
        lastRaycastSyncAt = timestamp
        syncForwardRaycast()
      }

      if (timestamp - lastCameraSyncAt >= HUD_SYNC_INTERVAL_MS) {
        lastCameraSyncAt = timestamp
        syncCameraPosition()
      }

      renderer.render(scene, camera)
      frameId = window.requestAnimationFrame(renderFrame)
    }

    syncLod()
    syncForwardRaycast()
    syncCameraPosition()

    setRendererReady(true)
    frameId = window.requestAnimationFrame(renderFrame)

    return () => {
      pointerAutoLockEnabled = false
      window.cancelAnimationFrame(frameId)
      window.cancelAnimationFrame(pointerRelockRaf)
      window.clearTimeout(pointerRelockTimer)

      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('pointerlockchange', syncPointerLock)
      document.removeEventListener('pointerlockerror', syncPointerLock)
      window.removeEventListener('mouseup', onMouseUp, true)
      window.removeEventListener('blur', clearInputs)
      window.removeEventListener('focus', onWindowFocus)

      canvas.removeEventListener('click', requestPointerLock)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('contextmenu', onCanvasContextMenu)

      resizeObserver.disconnect()

      if (document.pointerLockElement === canvas) {
        document.exitPointerLock?.()
      }

      for (const geometry of disposableGeometries) {
        geometry.dispose()
      }
      for (const material of disposableMaterials) {
        material.dispose()
      }
      for (const texture of disposableTextures) {
        texture.dispose()
      }

      renderer.dispose()

      if (canvas.parentElement === host) {
        host.removeChild(canvas)
      }
    }
  }, [containerRef, controls, controlsEnabled, focusNodeId, nodes, open, settings])

  return {
    rendererReady,
    pointerLocked,
    focusLod,
    lodCounts,
    worldHalfExtent,
    cameraPosition,
    cameraForward,
    cameraYaw,
    targetNodeId,
  }
}
