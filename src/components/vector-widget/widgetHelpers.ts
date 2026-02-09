import * as THREE from 'three'

export const SPHERE_RADIUS = 2
export const MAX_DOT_RADIUS = SPHERE_RADIUS * 0.94

export function hasWebGLSupport(): boolean {
  return typeof WebGLRenderingContext !== 'undefined' || typeof WebGL2RenderingContext !== 'undefined'
}

export function resolveQuadrant(position: [number, number, number]): string {
  const xPositive = position[0] >= 0
  const yPositive = position[1] >= 0
  const zPositive = position[2] >= 0

  if (xPositive && yPositive && zPositive) return 'I (+X, +Y, +Z)'
  if (!xPositive && yPositive && zPositive) return 'II (-X, +Y, +Z)'
  if (!xPositive && !yPositive && zPositive) return 'III (-X, -Y, +Z)'
  if (xPositive && !yPositive && zPositive) return 'IV (+X, -Y, +Z)'
  if (xPositive && yPositive && !zPositive) return 'V (+X, +Y, -Z)'
  if (!xPositive && yPositive && !zPositive) return 'VI (-X, +Y, -Z)'
  if (!xPositive && !yPositive && !zPositive) return 'VII (-X, -Y, -Z)'
  return 'VIII (+X, -Y, -Z)'
}

export function createLabelSprite(
  text: string,
  color: number,
): { sprite: THREE.Sprite; texture: THREE.CanvasTexture; material: THREE.SpriteMaterial } {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96

  const context = canvas.getContext('2d')
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`
    context.font = '700 40px monospace'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(text, canvas.width / 2, canvas.height / 2)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: false,
  })

  const sprite = new THREE.Sprite(material)
  sprite.scale.set(0.36, 0.36, 1)

  return {
    sprite,
    texture,
    material,
  }
}

export function updateLineGeometry(
  line: THREE.Line,
  start: THREE.Vector3,
  end: THREE.Vector3,
  dashed = false,
): void {
  const positions = line.geometry.attributes.position as THREE.BufferAttribute
  positions.setXYZ(0, start.x, start.y, start.z)
  positions.setXYZ(1, end.x, end.y, end.z)
  positions.needsUpdate = true

  if (dashed) {
    line.computeLineDistances()
  }
}

export function toVector3(tuple: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(tuple[0], tuple[1], tuple[2])
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

export function isAlmostZero(position: [number, number, number]): boolean {
  return (
    Math.abs(position[0]) < 0.0001 &&
    Math.abs(position[1]) < 0.0001 &&
    Math.abs(position[2]) < 0.0001
  )
}
