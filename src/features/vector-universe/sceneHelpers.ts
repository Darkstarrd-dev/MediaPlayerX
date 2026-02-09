import * as THREE from 'three'

import { clamp } from '../../utils/ui'
import type { VectorUniverseSceneSettings } from './types'

export function hasWebGLSupport(): boolean {
  return typeof WebGLRenderingContext !== 'undefined' || typeof WebGL2RenderingContext !== 'undefined'
}

export function createResolutionTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 72

  const context = canvas.getContext('2d')
  if (!context) {
    return new THREE.CanvasTexture(canvas)
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = 'rgba(7, 12, 18, 0.86)'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = 'rgba(170, 205, 232, 0.52)'
  context.lineWidth = 3
  context.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3)

  context.fillStyle = '#E8F4FF'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = '700 30px "Segoe UI", sans-serif'
  context.fillText(label, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

export function createSelectionFrameTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256

  const context = canvas.getContext('2d')
  if (!context) {
    return new THREE.CanvasTexture(canvas)
  }

  context.clearRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = 'rgba(126, 229, 255, 0.96)'
  context.lineWidth = 10
  context.strokeRect(8, 8, canvas.width - 16, canvas.height - 16)

  context.strokeStyle = 'rgba(14, 33, 44, 0.9)'
  context.lineWidth = 2
  context.strokeRect(20, 20, canvas.width - 40, canvas.height - 40)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

export function toPositionTuple(value: [number, number, number]): [number, number, number] {
  return [
    Number(value[0].toFixed(3)),
    Number(value[1].toFixed(3)),
    Number(value[2].toFixed(3)),
  ]
}

export function tupleChanged(a: [number, number, number], b: [number, number, number]): boolean {
  return Math.abs(a[0] - b[0]) > 0.001 || Math.abs(a[1] - b[1]) > 0.001 || Math.abs(a[2] - b[2]) > 0.001
}

export function wrapCoordinate(value: number, halfExtent: number): number {
  if (!Number.isFinite(value) || halfExtent <= 0) {
    return value
  }

  const span = halfExtent * 2
  if (value >= -halfExtent && value <= halfExtent) {
    return value
  }

  return ((((value + halfExtent) % span) + span) % span) - halfExtent
}

export function normalizeSceneSettings(settings: VectorUniverseSceneSettings): VectorUniverseSceneSettings {
  return {
    moveSpeed: clamp(settings.moveSpeed, 4, 80),
    sprintMultiplier: clamp(settings.sprintMultiplier, 1, 4),
    lookSensitivity: clamp(settings.lookSensitivity, 0.0005, 0.01),
    raycastDistance: clamp(settings.raycastDistance, 4, 120),
    dispersion: clamp(settings.dispersion, 0.2, 6),
  }
}
