export type VectorUniverseLodLevel = 'far' | 'mid' | 'near'

export interface VectorUniverseNode {
  id: string
  packageId: string
  imageIndex: number
  width: number
  height: number
  tags: string[]
  position: [number, number, number]
  tagColor: string
  thumbnailColor: string
}

export interface VectorUniverseLodCounts {
  far: number
  mid: number
  near: number
}

export interface VectorUniverseSceneState {
  rendererReady: boolean
  pointerLocked: boolean
  focusLod: VectorUniverseLodLevel | null
  lodCounts: VectorUniverseLodCounts
  worldHalfExtent: number
  cameraPosition: [number, number, number]
  cameraForward: [number, number, number]
  cameraYaw: number
  targetNodeId: string | null
}

export interface VectorUniverseSceneSettings {
  moveSpeed: number
  sprintMultiplier: number
  lookSensitivity: number
  raycastDistance: number
  dispersion: number
}
