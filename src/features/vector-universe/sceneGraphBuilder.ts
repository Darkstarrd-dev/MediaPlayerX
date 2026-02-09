import * as THREE from 'three'

import { clamp } from '../../utils/ui'
import {
  createResolutionTexture,
  createSelectionFrameTexture,
} from './sceneHelpers'
import type { VectorUniverseNode } from './types'

const THUMB_BASE_HEIGHT = 3.1
const THUMB_TEXT_OFFSET = 0.78

export interface SceneEntry {
  node: VectorUniverseNode
  position: THREE.Vector3
  point: THREE.Points
  thumbnail: THREE.Sprite
  resolutionLabel: THREE.Sprite
}

interface BuildSceneGraphParams {
  scene: THREE.Scene
  nodes: VectorUniverseNode[]
  focusNodeId: string | null
  dispersion: number
}

interface BuildSceneGraphResult {
  entries: SceneEntry[]
  raycastTargets: THREE.Object3D[]
  entryByObject: Map<THREE.Object3D, SceneEntry>
  selectionFrame: THREE.Sprite
  universeHalfExtent: number
  focusPosition: THREE.Vector3
  disposableGeometries: THREE.BufferGeometry[]
  disposableMaterials: THREE.Material[]
  disposableTextures: THREE.Texture[]
}

export function buildSceneGraph({
  scene,
  nodes,
  focusNodeId,
  dispersion,
}: BuildSceneGraphParams): BuildSceneGraphResult {
  const entries: SceneEntry[] = []
  const raycastTargets: THREE.Object3D[] = []
  const entryByObject = new Map<THREE.Object3D, SceneEntry>()

  const disposableGeometries: THREE.BufferGeometry[] = []
  const disposableMaterials: THREE.Material[] = []
  const disposableTextures: THREE.Texture[] = []

  for (const node of nodes) {
    const pointGeometry = new THREE.BufferGeometry()
    pointGeometry.setAttribute('position', new THREE.Float32BufferAttribute(node.position, 3))
    const pointMaterial = new THREE.PointsMaterial({
      color: node.tagColor,
      size: 0.55,
      sizeAttenuation: true,
      depthWrite: false,
    })
    const point = new THREE.Points(pointGeometry, pointMaterial)

    const thumbnailMaterial = new THREE.SpriteMaterial({
      color: node.thumbnailColor,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    })
    const thumbnail = new THREE.Sprite(thumbnailMaterial)
    const imageAspect = clamp(node.width / Math.max(1, node.height), 0.45, 1.9)
    thumbnail.scale.set(THUMB_BASE_HEIGHT * imageAspect, THUMB_BASE_HEIGHT, 1)
    thumbnail.position.set(node.position[0], node.position[1], node.position[2])

    const resolutionTexture = createResolutionTexture(`${node.width}x${node.height}`)
    const resolutionMaterial = new THREE.SpriteMaterial({
      map: resolutionTexture,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    })
    const resolutionLabel = new THREE.Sprite(resolutionMaterial)
    resolutionLabel.scale.set(4.5, 1.02, 1)
    resolutionLabel.position.set(
      node.position[0],
      node.position[1] + THUMB_BASE_HEIGHT * THUMB_TEXT_OFFSET,
      node.position[2],
    )

    scene.add(point, thumbnail, resolutionLabel)

    const entry: SceneEntry = {
      node,
      position: new THREE.Vector3(node.position[0], node.position[1], node.position[2]),
      point,
      thumbnail,
      resolutionLabel,
    }

    entries.push(entry)
    raycastTargets.push(thumbnail)
    entryByObject.set(thumbnail, entry)

    disposableGeometries.push(pointGeometry)
    disposableMaterials.push(pointMaterial, thumbnailMaterial, resolutionMaterial)
    disposableTextures.push(resolutionTexture)
  }

  const selectionFrameTexture = createSelectionFrameTexture()
  const selectionFrameMaterial = new THREE.SpriteMaterial({
    map: selectionFrameTexture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    opacity: 0.94,
  })
  const selectionFrame = new THREE.Sprite(selectionFrameMaterial)
  selectionFrame.visible = false
  selectionFrame.renderOrder = 990
  scene.add(selectionFrame)

  disposableMaterials.push(selectionFrameMaterial)
  disposableTextures.push(selectionFrameTexture)

  const maxAxisDistance = entries.reduce((maxValue, entry) => {
    const axisMax = Math.max(Math.abs(entry.position.x), Math.abs(entry.position.y), Math.abs(entry.position.z))
    return Math.max(maxValue, axisMax)
  }, 0)
  const universeHalfExtent = Math.max(
    40,
    Math.cbrt(entries.length + 1) * 24 * dispersion,
    maxAxisDistance + 18,
  )

  const focusEntry = entries.find((entry) => entry.node.id === focusNodeId) ?? entries[0] ?? null
  const focusPosition = focusEntry?.position ?? new THREE.Vector3(0, 0, 0)

  return {
    entries,
    raycastTargets,
    entryByObject,
    selectionFrame,
    universeHalfExtent,
    focusPosition,
    disposableGeometries,
    disposableMaterials,
    disposableTextures,
  }
}
