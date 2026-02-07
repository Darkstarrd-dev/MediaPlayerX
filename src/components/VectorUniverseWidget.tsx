import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'

interface VectorUniverseWidgetProps {
  cameraPosition: [number, number, number]
  cameraForward: [number, number, number]
  worldHalfExtent: number
  helperScale: number
  ready: boolean
  size: number
}

const SPHERE_RADIUS = 2
const MAX_DOT_RADIUS = SPHERE_RADIUS * 0.94

function hasWebGLSupport(): boolean {
  return typeof WebGLRenderingContext !== 'undefined' || typeof WebGL2RenderingContext !== 'undefined'
}

function resolveQuadrant(position: [number, number, number]): string {
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

function createLabelSprite(
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

function updateLineGeometry(
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

function toVector3(tuple: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(tuple[0], tuple[1], tuple[2])
}

function wrapCoordinate(value: number, halfExtent: number): number {
  if (!Number.isFinite(value) || halfExtent <= 0) {
    return value
  }

  const span = halfExtent * 2
  if (value >= -halfExtent && value <= halfExtent) {
    return value
  }

  return ((((value + halfExtent) % span) + span) % span) - halfExtent
}

function isAlmostZero(position: [number, number, number]): boolean {
  return (
    Math.abs(position[0]) < 0.0001 &&
    Math.abs(position[1]) < 0.0001 &&
    Math.abs(position[2]) < 0.0001
  )
}

function VectorUniverseWidget({
  cameraPosition,
  cameraForward,
  worldHalfExtent,
  helperScale,
  ready,
  size,
}: VectorUniverseWidgetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const widgetCameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const movingDotRef = useRef<THREE.Mesh | null>(null)
  const movingDotMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const movingGlowMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null)
  const projectionLinesRef = useRef<[THREE.Line, THREE.Line, THREE.Line] | null>(null)
  const forwardLineRef = useRef<THREE.Line | null>(null)
  const forwardConeRef = useRef<THREE.Mesh | null>(null)

  const originPositionRef = useRef<THREE.Vector3 | null>(null)
  const originLockedRef = useRef(false)

  const [originPosition, setOriginPosition] = useState<[number, number, number] | null>(null)
  const [webglAvailable, setWebglAvailable] = useState(true)

  const safeSize = useMemo(
    () => Math.max(140, Math.min(340, Number.isFinite(size) ? size : 200)),
    [size],
  )

  const rawRelativePosition = useMemo<[number, number, number]>(() => {
    if (!originPosition) {
      return [0, 0, 0]
    }

    return [
      cameraPosition[0] - originPosition[0],
      cameraPosition[1] - originPosition[1],
      cameraPosition[2] - originPosition[2],
    ]
  }, [cameraPosition, originPosition])

  const relativePosition = useMemo<[number, number, number]>(() => {
    const wrapHalfExtent = Math.max(1, worldHalfExtent)
    return [
      wrapCoordinate(rawRelativePosition[0], wrapHalfExtent),
      wrapCoordinate(rawRelativePosition[1], wrapHalfExtent),
      wrapCoordinate(rawRelativePosition[2], wrapHalfExtent),
    ]
  }, [rawRelativePosition, worldHalfExtent])

  const relativeDistance = useMemo(
    () => Math.hypot(relativePosition[0], relativePosition[1], relativePosition[2]),
    [relativePosition],
  )
  const quadrant = useMemo(() => resolveQuadrant(relativePosition), [relativePosition])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !hasWebGLSupport()) {
      setWebglAvailable(false)
      return
    }

    setWebglAvailable(true)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x060612)

    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
    camera.position.set(4.4, 3.3, 4.4)
    camera.up.set(0, 1, 0)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld(true)
    widgetCameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    })
    renderer.setSize(safeSize, safeSize, false)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace

    const disposableGeometries: THREE.BufferGeometry[] = []
    const disposableMaterials: THREE.Material[] = []
    const disposableTextures: THREE.Texture[] = []

    const group = new THREE.Group()
    scene.add(group)

    const sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 24, 16)
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ccff,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    })
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
    group.add(sphereMesh)
    disposableGeometries.push(sphereGeometry)
    disposableMaterials.push(sphereMaterial)

    const createRing = (rotation: THREE.Euler, color: number, opacity: number): void => {
      const points: THREE.Vector3[] = []
      for (let index = 0; index <= 64; index += 1) {
        const angle = (index / 64) * Math.PI * 2
        points.push(new THREE.Vector3(Math.cos(angle) * SPHERE_RADIUS, 0, Math.sin(angle) * SPHERE_RADIUS))
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity })
      const line = new THREE.Line(geometry, material)
      line.rotation.copy(rotation)
      group.add(line)

      disposableGeometries.push(geometry)
      disposableMaterials.push(material)
    }

    createRing(new THREE.Euler(0, 0, 0), 0x44ff44, 0.25)
    createRing(new THREE.Euler(Math.PI / 2, 0, 0), 0x4444ff, 0.2)
    createRing(new THREE.Euler(0, 0, Math.PI / 2), 0xff4444, 0.2)

    const axisLength = 2.8

    const createAxis = (
      from: THREE.Vector3,
      to: THREE.Vector3,
      color: number,
    ): { line: THREE.Line; arrow: THREE.Mesh; geometry: THREE.BufferGeometry; material: THREE.LineBasicMaterial; arrowGeometry: THREE.ConeGeometry; arrowMaterial: THREE.MeshBasicMaterial } => {
      const geometry = new THREE.BufferGeometry().setFromPoints([from, to])
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.56,
      })
      const line = new THREE.Line(geometry, material)

      const arrowGeometry = new THREE.ConeGeometry(0.06, 0.2, 8)
      const arrowMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.76,
      })
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial)
      arrow.position.copy(to)
      arrow.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        to.clone().sub(from).normalize(),
      )

      return {
        line,
        arrow,
        geometry,
        material,
        arrowGeometry,
        arrowMaterial,
      }
    }

    const xAxis = createAxis(
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(axisLength, 0, 0),
      0xff4444,
    )
    const yAxis = createAxis(
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0),
      0x44ff44,
    )
    const zAxis = createAxis(
      new THREE.Vector3(0, 0, -axisLength),
      new THREE.Vector3(0, 0, axisLength),
      0x4488ff,
    )

    group.add(xAxis.line, xAxis.arrow, yAxis.line, yAxis.arrow, zAxis.line, zAxis.arrow)

    disposableGeometries.push(
      xAxis.geometry,
      xAxis.arrowGeometry,
      yAxis.geometry,
      yAxis.arrowGeometry,
      zAxis.geometry,
      zAxis.arrowGeometry,
    )
    disposableMaterials.push(
      xAxis.material,
      xAxis.arrowMaterial,
      yAxis.material,
      yAxis.arrowMaterial,
      zAxis.material,
      zAxis.arrowMaterial,
    )

    const labelX = createLabelSprite('+X', 0xff4444)
    labelX.sprite.position.set(3.14, 0, 0)
    group.add(labelX.sprite)

    const labelY = createLabelSprite('+Y', 0x44ff44)
    labelY.sprite.position.set(0, 3.14, 0)
    group.add(labelY.sprite)

    const labelZ = createLabelSprite('+Z', 0x4488ff)
    labelZ.sprite.position.set(0, 0, 3.14)
    group.add(labelZ.sprite)

    disposableTextures.push(labelX.texture, labelY.texture, labelZ.texture)
    disposableMaterials.push(labelX.material, labelY.material, labelZ.material)

    const originMarkerGeometry = new THREE.SphereGeometry(0.06, 12, 12)
    const originMarkerMaterial = new THREE.MeshBasicMaterial({
      color: 0x9dd8ff,
      transparent: true,
      opacity: 0.8,
    })
    const originMarker = new THREE.Mesh(originMarkerGeometry, originMarkerMaterial)
    originMarker.position.set(0, 0, 0)
    group.add(originMarker)
    disposableGeometries.push(originMarkerGeometry)
    disposableMaterials.push(originMarkerMaterial)

    const movingDotGeometry = new THREE.SphereGeometry(0.12, 16, 16)
    const movingDotMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd00 })
    const movingDot = new THREE.Mesh(movingDotGeometry, movingDotMaterial)
    group.add(movingDot)
    movingDotRef.current = movingDot
    movingDotMaterialRef.current = movingDotMaterial
    disposableGeometries.push(movingDotGeometry)
    disposableMaterials.push(movingDotMaterial)

    const movingGlowGeometry = new THREE.SphereGeometry(0.2, 16, 16)
    const movingGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    })
    const movingGlow = new THREE.Mesh(movingGlowGeometry, movingGlowMaterial)
    movingDot.add(movingGlow)
    movingGlowMaterialRef.current = movingGlowMaterial
    disposableGeometries.push(movingGlowGeometry)
    disposableMaterials.push(movingGlowMaterial)

    const createProjectionLine = (color: number): THREE.Line => {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
      const material = new THREE.LineDashedMaterial({
        color,
        transparent: true,
        opacity: 0.42,
        dashSize: 0.1,
        gapSize: 0.05,
      })
      const line = new THREE.Line(geometry, material)
      line.computeLineDistances()
      group.add(line)

      disposableGeometries.push(geometry)
      disposableMaterials.push(material)
      return line
    }

    const projectionLines: [THREE.Line, THREE.Line, THREE.Line] = [
      createProjectionLine(0xff4444),
      createProjectionLine(0x44ff44),
      createProjectionLine(0x4488ff),
    ]
    projectionLinesRef.current = projectionLines

    const forwardLineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ])
    const forwardLineMaterial = new THREE.LineBasicMaterial({
      color: 0xffdd00,
      transparent: true,
      opacity: 0.9,
    })
    const forwardLine = new THREE.Line(forwardLineGeometry, forwardLineMaterial)
    group.add(forwardLine)
    forwardLineRef.current = forwardLine
    disposableGeometries.push(forwardLineGeometry)
    disposableMaterials.push(forwardLineMaterial)

    const forwardConeGeometry = new THREE.ConeGeometry(0.08, 0.24, 10)
    const forwardConeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd00,
      transparent: true,
      opacity: 0.92,
    })
    const forwardCone = new THREE.Mesh(forwardConeGeometry, forwardConeMaterial)
    group.add(forwardCone)
    forwardConeRef.current = forwardCone
    disposableGeometries.push(forwardConeGeometry)
    disposableMaterials.push(forwardConeMaterial)

    let frameId = 0
    const renderFrame = () => {
      frameId = window.requestAnimationFrame(renderFrame)
      renderer.render(scene, camera)
    }

    renderFrame()

    return () => {
      window.cancelAnimationFrame(frameId)

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

      widgetCameraRef.current = null
      movingDotRef.current = null
      movingDotMaterialRef.current = null
      movingGlowMaterialRef.current = null
      projectionLinesRef.current = null
      forwardLineRef.current = null
      forwardConeRef.current = null
    }
  }, [safeSize])

  useEffect(() => {
    if (!ready) {
      originPositionRef.current = null
      originLockedRef.current = false
      setOriginPosition(null)
      return
    }

    if (originLockedRef.current) {
      return
    }

    if (isAlmostZero(cameraPosition)) {
      return
    }

    originLockedRef.current = true
    originPositionRef.current = toVector3(cameraPosition)
    setOriginPosition([...cameraPosition])
  }, [cameraPosition, ready])

  useEffect(() => {
    const movingDot = movingDotRef.current
    const movingDotMaterial = movingDotMaterialRef.current
    const movingGlowMaterial = movingGlowMaterialRef.current
    const projectionLines = projectionLinesRef.current
    const forwardLine = forwardLineRef.current
    const forwardCone = forwardConeRef.current
    const widgetCamera = widgetCameraRef.current

    if (
      !movingDot ||
      !movingDotMaterial ||
      !movingGlowMaterial ||
      !projectionLines ||
      !forwardLine ||
      !forwardCone ||
      !widgetCamera
    ) {
      return
    }

    const origin = originPositionRef.current
    const current = toVector3(cameraPosition)
    const relative = origin ? current.sub(origin) : new THREE.Vector3(0, 0, 0)

    const wrapHalfExtent = Math.max(1, worldHalfExtent)
    const wrappedRelative = new THREE.Vector3(
      wrapCoordinate(relative.x, wrapHalfExtent),
      wrapCoordinate(relative.y, wrapHalfExtent),
      wrapCoordinate(relative.z, wrapHalfExtent),
    )

    const helperZoom = Math.max(0.35, Math.min(2.5, helperScale / 180))
    const displayHalfExtent = Math.max(1, wrapHalfExtent * helperZoom)

    const mappedPosition = wrappedRelative.multiplyScalar(MAX_DOT_RADIUS / displayHalfExtent)
    if (mappedPosition.length() > MAX_DOT_RADIUS) {
      mappedPosition.setLength(MAX_DOT_RADIUS)
    }

    movingDot.position.copy(mappedPosition)

    updateLineGeometry(
      projectionLines[0],
      mappedPosition,
      new THREE.Vector3(0, mappedPosition.y, mappedPosition.z),
      true,
    )
    updateLineGeometry(
      projectionLines[1],
      mappedPosition,
      new THREE.Vector3(mappedPosition.x, 0, mappedPosition.z),
      true,
    )
    updateLineGeometry(
      projectionLines[2],
      mappedPosition,
      new THREE.Vector3(mappedPosition.x, mappedPosition.y, 0),
      true,
    )

    const frontAxis = widgetCamera.position.clone().normalize()
    const depth = THREE.MathUtils.clamp(mappedPosition.dot(frontAxis) / SPHERE_RADIUS, -1, 1)
    const depthBrightness = THREE.MathUtils.lerp(0.3, 1, (depth + 1) * 0.5)
    movingDotMaterial.color.setRGB(1 * depthBrightness, 0.86 * depthBrightness, 0.18 * depthBrightness)
    movingGlowMaterial.opacity = THREE.MathUtils.lerp(0.08, 0.28, (depth + 1) * 0.5)

    const forwardDirection = toVector3(cameraForward)
    if (forwardDirection.lengthSq() < 0.0001) {
      forwardDirection.set(0, 0, -1)
    }
    forwardDirection.normalize()

    const arrowStart = mappedPosition.clone()
    const arrowEnd = arrowStart.clone().addScaledVector(forwardDirection, 0.88)
    updateLineGeometry(forwardLine, arrowStart, arrowEnd)
    forwardCone.position.copy(arrowEnd)
    forwardCone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), forwardDirection)
  }, [cameraForward, cameraPosition, helperScale, worldHalfExtent])

  return (
    <aside className="vector-universe-widget" aria-label="世界坐标辅助" style={{ width: `${safeSize}px` }}>
      <strong>全息球体定位控件</strong>
      <canvas ref={canvasRef} className="vector-universe-widget-canvas" width={safeSize} height={safeSize} />
      <p data-testid="vector-universe-position">
        X {relativePosition[0].toFixed(2)} / Y {relativePosition[1].toFixed(2)} / Z {relativePosition[2].toFixed(2)}
      </p>
      <p>相对原点距离 {relativeDistance.toFixed(2)}</p>
      <p>象限 {quadrant}</p>
      {!webglAvailable ? (
        <p className="vector-universe-widget-fallback">当前环境未启用 WebGL，控件已降级显示。</p>
      ) : null}
    </aside>
  )
}

export default VectorUniverseWidget
