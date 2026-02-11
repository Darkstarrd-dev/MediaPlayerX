import { useEffect, useState, type RefObject } from 'react'
import * as THREE from 'three'

import { clamp } from '../../utils/ui'
import type { VectorControlMap } from '../../vectorControls'
import { buildSceneGraph } from './sceneGraphBuilder'
import { createSceneInputController } from './sceneInputController'
import {
  applyCameraMovement,
  createCameraHudSync,
  createForwardRaycastSync,
  createLodSync,
} from './sceneRuntimeSync'
import {
  DEFAULT_CAMERA_FORWARD,
  DEFAULT_CAMERA_POSITION,
  DEFAULT_LOD_COUNTS,
  DEFAULT_WORLD_HALF_EXTENT,
  resetVectorUniverseSceneState,
} from './sceneStateDefaults'
import {
  hasWebGLSupport,
  normalizeSceneSettings,
} from './sceneHelpers'
import type {
  VectorUniverseLodCounts,
  VectorUniverseLodLevel,
  VectorUniverseNode,
  VectorUniverseSceneSettings,
  VectorUniverseSceneState,
} from './types'

export { buildVectorUniverseNodes, buildVectorUniverseNodesByScope } from './nodeBuilder'

const MAX_FRAME_DELTA = 0.05
const MAX_PITCH = Math.PI / 2 - 0.02
const LOD_SYNC_INTERVAL_MS = 80
const HUD_SYNC_INTERVAL_MS = 120
const RAYCAST_SYNC_INTERVAL_MS = 60

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
    const resetSceneState = () => {
      resetVectorUniverseSceneState({
        setRendererReady,
        setPointerLocked,
        setFocusLod,
        setLodCounts,
        setWorldHalfExtent,
        setCameraPosition,
        setCameraForward,
        setCameraYaw,
        setTargetNodeId,
      })
    }

    if (!open) {
      resetSceneState()
      return
    }

    const host = containerRef.current
    if (!host || !hasWebGLSupport()) {
      resetSceneState()
      return
    }

    const sceneSettings = normalizeSceneSettings(settings)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#03070d')
    scene.fog = new THREE.FogExp2('#03070d', 0.012)

    const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 3200)

    let rendererInstance: THREE.WebGLRenderer
    try {
      rendererInstance = new THREE.WebGLRenderer({ antialias: true, alpha: false, premultipliedAlpha: false })
    } catch {
      resetSceneState()
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

    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()
    const up = new THREE.Vector3()
    const movement = new THREE.Vector3()
    const rayDirection = new THREE.Vector3()
    const raycaster = new THREE.Raycaster()

    const inputController = createSceneInputController({
      canvas,
      controls,
      controlsEnabled,
      onPointerLockChange: (isLocked) => {
        setPointerLocked((previous) => (previous === isLocked ? previous : isLocked))
      },
    })

    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) {
        return
      }

      yaw -= event.movementX * sceneSettings.lookSensitivity
      pitch = clamp(pitch - event.movementY * sceneSettings.lookSensitivity, -MAX_PITCH, MAX_PITCH)
    }

    document.addEventListener('mousemove', onMouseMove)
    inputController.scheduleAutoPointerLock()

    let previousFrameTime = performance.now()
    let frameId = 0
    let lastLodSyncAt = 0
    let lastRaycastSyncAt = 0
    let lastCameraSyncAt = 0

    const initialYaw = Number(yaw.toFixed(6))
    setCameraYaw(initialYaw)

    const syncLod = createLodSync({
      entries,
      camera,
      focusNodeId,
      setLodCounts,
      setFocusLod,
      initialCounts: DEFAULT_LOD_COUNTS,
      initialFocusLod: null,
    })

    const syncForwardRaycast = createForwardRaycastSync({
      controlsEnabled,
      camera,
      rayDirection,
      raycaster,
      raycastTargets,
      entryByObject,
      selectionFrame,
      raycastDistance: sceneSettings.raycastDistance,
      setTargetNodeId,
      initialTargetNodeId: null,
    })

    const cameraHudSync = createCameraHudSync({
      camera,
      setCameraPosition,
      setCameraForward,
      setCameraYaw,
      initialCameraPosition: DEFAULT_CAMERA_POSITION,
      initialCameraForward: DEFAULT_CAMERA_FORWARD,
      initialCameraYaw: initialYaw,
    })

    const syncCameraPosition = () => {
      cameraHudSync.sync(yaw, pitch)
    }

    const renderFrame = (timestamp: number) => {
      const deltaSeconds = Math.min((timestamp - previousFrameTime) / 1000, MAX_FRAME_DELTA)
      previousFrameTime = timestamp

      camera.quaternion.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'))
      camera.updateMatrixWorld()

      applyCameraMovement({
        camera,
        controlsEnabled,
        inputState: inputController.state,
        sceneSettings,
        universeHalfExtent,
        deltaSeconds,
        forward,
        right,
        up,
        movement,
      })

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
      window.cancelAnimationFrame(frameId)
      document.removeEventListener('mousemove', onMouseMove)
      inputController.dispose()

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
