import type {
  VectorUniverseLodCounts,
  VectorUniverseLodLevel,
} from './types'

export const DEFAULT_LOD_COUNTS: VectorUniverseLodCounts = {
  far: 0,
  mid: 0,
  near: 0,
}

export const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 0, 0]
export const DEFAULT_CAMERA_FORWARD: [number, number, number] = [0, 0, -1]
export const DEFAULT_WORLD_HALF_EXTENT = 40

interface VectorUniverseSceneSetters {
  setRendererReady: (value: boolean) => void
  setPointerLocked: (value: boolean) => void
  setFocusLod: (value: VectorUniverseLodLevel | null) => void
  setLodCounts: (value: VectorUniverseLodCounts) => void
  setWorldHalfExtent: (value: number) => void
  setCameraPosition: (value: [number, number, number]) => void
  setCameraForward: (value: [number, number, number]) => void
  setCameraYaw: (value: number) => void
  setTargetNodeId: (value: string | null) => void
}

export function resetVectorUniverseSceneState({
  setRendererReady,
  setPointerLocked,
  setFocusLod,
  setLodCounts,
  setWorldHalfExtent,
  setCameraPosition,
  setCameraForward,
  setCameraYaw,
  setTargetNodeId,
}: VectorUniverseSceneSetters): void {
  setRendererReady(false)
  setPointerLocked(false)
  setFocusLod(null)
  setLodCounts(DEFAULT_LOD_COUNTS)
  setWorldHalfExtent(DEFAULT_WORLD_HALF_EXTENT)
  setCameraPosition(DEFAULT_CAMERA_POSITION)
  setCameraForward(DEFAULT_CAMERA_FORWARD)
  setCameraYaw(0)
  setTargetNodeId(null)
}
