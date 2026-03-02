import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent as ReactMouseEvent } from 'react'

import { ensureGifRuntime } from './gif.cdn'
import {
  loadPathArrowEditorState,
  persistPathArrowEditorState,
} from './storage'
import type { ArrowPath, ArrowStyle, GlobalArrowStyle, PathPoint, Vector2 } from './types'

type ExportFormat = 'gif' | 'mp4' | 'png'

interface PolylineSegment {
  start: Vector2
  end: Vector2
  startDistance: number
  length: number
  angle: number
}

interface PolylineMeta {
  totalLength: number
  segments: PolylineSegment[]
}

interface DraggingPointState {
  pathId: string
  pointIndex: number
  originPoint: PathPoint
  startPointer: Vector2
}

interface ExportProfile {
  fps: number
  durationMs: number
  frameCount: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundTo(value: number, digits: number): number {
  const ratio = 10 ** digits
  return Math.round(value * ratio) / ratio
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function resolveExportProfile(paths: ArrowPath[]): ExportProfile {
  const longestDurationMs = Math.max(1000, ...paths.map((entry) => Math.max(1000, entry.style.duration * 1000)))
  const fps = 20
  const frameCount = Math.max(20, Math.ceil((longestDurationMs / 1000) * fps))

  return {
    fps,
    durationMs: longestDurationMs,
    frameCount,
  }
}

function resolveRecorderMimeType(): string {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
  for (const mimeType of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType
    }
  }
  return 'video/webm'
}

function generatePathId(): string {
  return `path-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function buildDefaultArrowStyle(globalColor: string, globalStyle: GlobalArrowStyle): ArrowStyle {
  return {
    color: globalColor,
    arrowCount: 3,
    triangleHeight: globalStyle.triangleHeight,
    triangleWidth: globalStyle.triangleWidth,
    tailLength: globalStyle.tailLength,
    tailWidth: globalStyle.tailWidth,
    duration: 3,
    timeOffset: 0,
  }
}

function findPathById(paths: ArrowPath[], pathId: string | null): ArrowPath | null {
  if (!pathId) {
    return null
  }
  return paths.find((entry) => entry.id === pathId) ?? null
}

function buildPolylineMeta(points: PathPoint[], reversed: boolean): PolylineMeta {
  const ordered = reversed ? [...points].reverse() : points
  if (ordered.length < 2) {
    return { totalLength: 0, segments: [] }
  }

  const segments: PolylineSegment[] = []
  let cursor = 0

  for (let index = 1; index < ordered.length; index += 1) {
    const start = ordered[index - 1]
    const end = ordered[index]
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)
    if (length <= 0.001) {
      continue
    }

    segments.push({
      start,
      end,
      startDistance: cursor,
      length,
      angle: Math.atan2(dy, dx),
    })
    cursor += length
  }

  return {
    totalLength: cursor,
    segments,
  }
}

function resolvePointAtDistance(meta: PolylineMeta, distance: number): { point: Vector2; angle: number } | null {
  if (meta.totalLength <= 0 || meta.segments.length === 0) {
    return null
  }

  const normalized = clamp(distance, 0, meta.totalLength)

  for (const segment of meta.segments) {
    const endDistance = segment.startDistance + segment.length
    if (normalized <= endDistance) {
      const localRatio = segment.length <= 0 ? 0 : (normalized - segment.startDistance) / segment.length
      return {
        point: {
          x: segment.start.x + (segment.end.x - segment.start.x) * localRatio,
          y: segment.start.y + (segment.end.y - segment.start.y) * localRatio,
        },
        angle: segment.angle,
      }
    }
  }

  const last = meta.segments[meta.segments.length - 1]
  return {
    point: { x: last.end.x, y: last.end.y },
    angle: last.angle,
  }
}

function getPathColor(path: ArrowPath, globalColor: string): string {
  return path.useCustomColor ? path.style.color : globalColor
}

function clonePoint(point: PathPoint): PathPoint {
  return {
    x: point.x,
    y: point.y,
    handleIn: point.handleIn ? { ...point.handleIn } : null,
    handleOut: point.handleOut ? { ...point.handleOut } : null,
  }
}

function toPathDataForExport(paths: ArrowPath[]) {
  return paths.map((path) => ({
    id: path.id,
    name: path.name,
    points: path.points.map((point) => ({
      x: point.x,
      y: point.y,
      handleIn: point.handleIn,
      handleOut: point.handleOut,
    })),
    style: { ...path.style },
    reversed: path.reversed,
    useCustomColor: path.useCustomColor,
    collapsed: path.collapsed,
  }))
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function parseImportedPaths(raw: unknown): ArrowPath[] {
  if (!raw || typeof raw !== 'object') {
    return []
  }
  const source = raw as { paths?: unknown }
  if (!Array.isArray(source.paths)) {
    return []
  }

  return source.paths
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        return null
      }

      const row = entry as Partial<ArrowPath>
      const points = Array.isArray(row.points)
        ? row.points
            .map((point) => {
              if (!point || typeof point !== 'object') {
                return null
              }
              const p = point as Partial<PathPoint>
              if (typeof p.x !== 'number' || typeof p.y !== 'number') {
                return null
              }
              return {
                x: p.x,
                y: p.y,
                handleIn:
                  p.handleIn && typeof p.handleIn.x === 'number' && typeof p.handleIn.y === 'number'
                    ? { x: p.handleIn.x, y: p.handleIn.y }
                    : null,
                handleOut:
                  p.handleOut && typeof p.handleOut.x === 'number' && typeof p.handleOut.y === 'number'
                    ? { x: p.handleOut.x, y: p.handleOut.y }
                    : null,
              }
            })
            .filter((point): point is PathPoint => point !== null)
        : []

      if (points.length === 0) {
        return null
      }

      const style = row.style
      const normalizedStyle: ArrowStyle = {
        color: typeof style?.color === 'string' ? style.color : '#e94560',
        arrowCount: Math.round(clamp(typeof style?.arrowCount === 'number' ? style.arrowCount : 3, 1, 10)),
        triangleHeight: Math.round(clamp(typeof style?.triangleHeight === 'number' ? style.triangleHeight : 20, 5, 50)),
        triangleWidth: Math.round(clamp(typeof style?.triangleWidth === 'number' ? style.triangleWidth : 16, 5, 50)),
        tailLength: Math.round(clamp(typeof style?.tailLength === 'number' ? style.tailLength : 25, 0, 80)),
        tailWidth: Math.round(clamp(typeof style?.tailWidth === 'number' ? style.tailWidth : 6, 2, 30)),
        duration: roundTo(clamp(typeof style?.duration === 'number' ? style.duration : 3, 1, 10), 1),
        timeOffset: roundTo(clamp(typeof style?.timeOffset === 'number' ? style.timeOffset : 0, 0, 10), 1),
      }

      return {
        id: typeof row.id === 'string' && row.id.trim().length > 0 ? row.id : `${generatePathId()}-${index}`,
        name: typeof row.name === 'string' && row.name.trim().length > 0 ? row.name : `路径 ${index + 1}`,
        points,
        style: normalizedStyle,
        reversed: typeof row.reversed === 'boolean' ? row.reversed : false,
        useCustomColor: typeof row.useCustomColor === 'boolean' ? row.useCustomColor : false,
        collapsed: typeof row.collapsed === 'boolean' ? row.collapsed : false,
      }
    })
    .filter((path): path is ArrowPath => path !== null)
}

export interface PathArrowEditorModel {
  fileInputRef: React.RefObject<HTMLInputElement | null>
  jsonFileInputRef: React.RefObject<HTMLInputElement | null>
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>
  overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>
  interactionCanvasRef: React.RefObject<HTMLCanvasElement | null>
  canvasContainerRef: React.RefObject<HTMLDivElement | null>
  canvasWrapperRef: React.RefObject<HTMLDivElement | null>
  imageLoaded: boolean
  imageName: string
  statusText: string
  zoom: number
  paths: ArrowPath[]
  selectedPathId: string | null
  selectedPointIndex: number | null
  globalColor: string
  globalArrowStyle: GlobalArrowStyle
  isPlaying: boolean
  isExporting: boolean
  exportProgress: number
  onTriggerImageImport: () => void
  onImageFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onTriggerJsonImport: () => void
  onJsonFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onExportJson: () => void
  onAddPath: () => void
  onSelectPath: (pathId: string) => void
  onDeletePath: (pathId: string) => void
  onCopyPath: (pathId: string) => void
  onReversePath: (pathId: string) => void
  onTogglePathCollapsed: (pathId: string) => void
  onPathNameChange: (pathId: string, name: string) => void
  onUpdatePathStyle: (pathId: string, patch: Partial<ArrowStyle>) => void
  onResetPathColor: (pathId: string) => void
  onUpdateGlobalColor: (value: string) => void
  onUpdateGlobalArrowStyle: (patch: Partial<GlobalArrowStyle>) => void
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomFit: () => void
  onZoomReset: () => void
  onTogglePlay: () => void
  onExportAnimation: (format: ExportFormat) => Promise<void>
  onCanvasPointerDown: (event: ReactMouseEvent<HTMLCanvasElement>) => void
  onCanvasPointerMove: (event: ReactMouseEvent<HTMLCanvasElement>) => void
  onCanvasPointerUp: () => void
  onCanvasContextMenu: (event: ReactMouseEvent<HTMLCanvasElement>) => void
}

export function usePathArrowEditor({ active }: { active: boolean }): PathArrowEditorModel {
  const persisted = useMemo(() => loadPathArrowEditorState(), [])

  const [globalColor, setGlobalColor] = useState(persisted.globalColor)
  const [globalArrowStyle, setGlobalArrowStyle] = useState<GlobalArrowStyle>(persisted.globalArrowStyle)
  const [paths, setPaths] = useState<ArrowPath[]>(persisted.paths)
  const [selectedPathId, setSelectedPathId] = useState<string | null>(persisted.selectedPathId)
  const [zoom, setZoom] = useState<number>(persisted.zoom)
  const [imageName, setImageName] = useState('')
  const [statusText, setStatusText] = useState('请导入图片开始')
  const [imageElement, setImageElement] = useState<HTMLImageElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null)
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const interactionCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const canvasContainerRef = useRef<HTMLDivElement | null>(null)
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null)

  const draggingRef = useRef<DraggingPointState | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const animationStartRef = useRef<number>(0)

  useEffect(() => {
    persistPathArrowEditorState({
      globalColor,
      globalArrowStyle,
      paths,
      selectedPathId,
      zoom,
    })
  }, [globalArrowStyle, globalColor, paths, selectedPathId, zoom])

  const imageLoaded = Boolean(imageElement)

  const fitZoom = useCallback(
    (img: HTMLImageElement) => {
      const container = canvasContainerRef.current
      if (!container) {
        return
      }
      const padding = 40
      const availableWidth = Math.max(100, container.clientWidth - padding * 2)
      const availableHeight = Math.max(100, container.clientHeight - padding * 2)
      const scaleX = availableWidth / img.width
      const scaleY = availableHeight / img.height
      const next = clamp(Math.min(scaleX, scaleY, 1), 0.1, 5)
      setZoom(roundTo(next, 3))
    },
    [],
  )

  const drawMainImage = useCallback(() => {
    const canvas = mainCanvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (imageElement) {
      ctx.drawImage(imageElement, 0, 0)
    }
  }, [imageElement])

  const drawOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current
    if (!canvas) {
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    paths.forEach((path) => {
      if (path.points.length === 0) {
        return
      }

      const pathColor = getPathColor(path, globalColor)
      const isSelectedPath = path.id === selectedPathId

      ctx.beginPath()
      ctx.setLineDash([8, 4])
      ctx.strokeStyle = isSelectedPath ? pathColor : `${pathColor}AA`
      ctx.lineWidth = isSelectedPath ? 2.5 : 1.5
      ctx.moveTo(path.points[0].x, path.points[0].y)
      for (let index = 1; index < path.points.length; index += 1) {
        ctx.lineTo(path.points[index].x, path.points[index].y)
      }
      ctx.stroke()
      ctx.setLineDash([])

      if (!isSelectedPath) {
        return
      }

      path.points.forEach((point, index) => {
        const isSelectedPoint = selectedPointIndex === index
        ctx.fillStyle = isSelectedPoint ? '#ffd54a' : '#ffffff'
        ctx.strokeStyle = '#222'
        ctx.lineWidth = isSelectedPoint ? 3 : 2
        ctx.beginPath()
        ctx.arc(point.x, point.y, isSelectedPoint ? 7 : 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      })
    })
  }, [globalColor, paths, selectedPathId, selectedPointIndex])

  const clearInteractionCanvas = useCallback(() => {
    const canvas = interactionCanvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      return
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, [])

  const drawArrow = useCallback((ctx: CanvasRenderingContext2D, point: Vector2, angle: number, style: ArrowStyle) => {
    ctx.save()
    ctx.translate(point.x, point.y)
    ctx.rotate(angle)
    ctx.fillStyle = style.color

    if (style.tailLength > 0) {
      ctx.fillRect(-style.tailLength, -style.tailWidth / 2, style.tailLength, style.tailWidth)
    }

    ctx.beginPath()
    ctx.moveTo(style.triangleHeight / 2, 0)
    ctx.lineTo(-style.triangleHeight / 2, -style.triangleWidth / 2)
    ctx.lineTo(-style.triangleHeight / 2, style.triangleWidth / 2)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }, [])

  const drawAnimatedArrowsToContext = useCallback(
    (ctx: CanvasRenderingContext2D, elapsedMs: number) => {
      for (const path of paths) {
        if (path.points.length < 2) {
          continue
        }

        const effectiveStyle: ArrowStyle = {
          ...path.style,
          color: getPathColor(path, globalColor),
        }

        const meta = buildPolylineMeta(path.points, path.reversed)
        if (meta.totalLength <= 0) {
          continue
        }

        const arrowCount = Math.max(1, Math.round(effectiveStyle.arrowCount))
        const durationMs = Math.max(100, effectiveStyle.duration * 1000)
        const spacing = durationMs / arrowCount
        const offsetMs = effectiveStyle.timeOffset * 1000

        for (let index = 0; index < arrowCount; index += 1) {
          const localElapsed = (elapsedMs + offsetMs + index * spacing) % durationMs
          const ratio = localElapsed / durationMs
          const distance = ratio * meta.totalLength
          const resolved = resolvePointAtDistance(meta, distance)
          if (!resolved) {
            continue
          }

          drawArrow(ctx, resolved.point, resolved.angle, effectiveStyle)
        }
      }
    },
    [drawArrow, globalColor, paths],
  )

  const drawAnimationFrame = useCallback(
    (elapsedMs: number) => {
      const canvas = interactionCanvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!canvas || !ctx) {
        return
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawAnimatedArrowsToContext(ctx, elapsedMs)
    },
    [drawAnimatedArrowsToContext],
  )

  useEffect(() => {
    const wrapper = canvasWrapperRef.current
    if (!wrapper) {
      return
    }

    wrapper.style.transform = `scale(${zoom})`
    wrapper.style.transformOrigin = 'center center'
  }, [zoom])

  useEffect(() => {
    if (!imageElement) {
      return
    }

    const canvases = [mainCanvasRef.current, overlayCanvasRef.current, interactionCanvasRef.current]
    canvases.forEach((canvas) => {
      if (!canvas) {
        return
      }
      canvas.width = imageElement.width
      canvas.height = imageElement.height
    })

    drawMainImage()
    drawOverlay()
  }, [drawMainImage, drawOverlay, imageElement])

  useEffect(() => {
    drawMainImage()
  }, [drawMainImage])

  useEffect(() => {
    drawOverlay()
  }, [drawOverlay])

  useEffect(() => {
    if (!active || !isPlaying) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      clearInteractionCanvas()
      return
    }

    animationStartRef.current = performance.now()

    const tick = (timestamp: number) => {
      const elapsed = timestamp - animationStartRef.current
      drawAnimationFrame(elapsed)
      animationFrameRef.current = requestAnimationFrame(tick)
    }

    animationFrameRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      clearInteractionCanvas()
    }
  }, [active, clearInteractionCanvas, drawAnimationFrame, isPlaying])

  useEffect(() => {
    if (!active) {
      return
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedPathId && selectedPointIndex !== null) {
          event.preventDefault()
          setPaths((previous) =>
            previous.map((path) => {
              if (path.id !== selectedPathId) {
                return path
              }
              if (selectedPointIndex < 0 || selectedPointIndex >= path.points.length) {
                return path
              }
              const nextPoints = path.points.filter((_, index) => index !== selectedPointIndex)
              return { ...path, points: nextPoints }
            }),
          )
          setSelectedPointIndex(null)
          setStatusText('已删除锚点')
        }
        return
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        setZoom((previous) => roundTo(clamp(previous * 1.25, 0.1, 5), 3))
        return
      }

      if (event.key === '-') {
        event.preventDefault()
        setZoom((previous) => roundTo(clamp(previous / 1.25, 0.1, 5), 3))
        return
      }

      if (event.key === '0') {
        event.preventDefault()
        setZoom(1)
      }
    }

    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [active, selectedPathId, selectedPointIndex])

  const resolveCanvasPoint = useCallback((event: ReactMouseEvent<HTMLCanvasElement>): Vector2 | null => {
    const canvas = interactionCanvasRef.current
    if (!canvas) {
      return null
    }

    const rect = canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return null
    }

    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    }
  }, [])

  const hitTestPoint = useCallback((path: ArrowPath, pointer: Vector2): number | null => {
    for (let index = path.points.length - 1; index >= 0; index -= 1) {
      const point = path.points[index]
      if (Math.hypot(point.x - pointer.x, point.y - pointer.y) <= 10) {
        return index
      }
    }
    return null
  }, [])

  const onCanvasPointerDown = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      if (!active || !imageLoaded || isPlaying) {
        return
      }

      const pointer = resolveCanvasPoint(event)
      if (!pointer) {
        return
      }

      const selected = findPathById(paths, selectedPathId)

      if (!selected) {
        setStatusText('请先创建路径')
        return
      }

      if (event.button === 2) {
        event.preventDefault()
        const hitIndex = hitTestPoint(selected, pointer)
        setSelectedPointIndex(hitIndex)
        setStatusText(hitIndex === null ? '未命中锚点' : `已选中锚点 ${hitIndex + 1}`)
        return
      }

      if (event.button !== 0) {
        return
      }

      const hitIndex = hitTestPoint(selected, pointer)
      if (hitIndex !== null) {
        setSelectedPointIndex(hitIndex)
        draggingRef.current = {
          pathId: selected.id,
          pointIndex: hitIndex,
          originPoint: clonePoint(selected.points[hitIndex]),
          startPointer: pointer,
        }
        return
      }

      setPaths((previous) =>
        previous.map((path) => {
          if (path.id !== selected.id) {
            return path
          }
          const nextPoint: PathPoint = {
            x: pointer.x,
            y: pointer.y,
            handleIn: null,
            handleOut: null,
          }
          return {
            ...path,
            points: [...path.points, nextPoint],
          }
        }),
      )
      setSelectedPointIndex(selected.points.length)
      setStatusText(`已添加锚点 ${selected.points.length + 1}`)
    },
    [active, hitTestPoint, imageLoaded, isPlaying, paths, resolveCanvasPoint, selectedPathId],
  )

  const onCanvasPointerMove = useCallback(
    (event: ReactMouseEvent<HTMLCanvasElement>) => {
      const drag = draggingRef.current
      if (!drag) {
        return
      }

      const pointer = resolveCanvasPoint(event)
      if (!pointer) {
        return
      }

      const dx = pointer.x - drag.startPointer.x
      const dy = pointer.y - drag.startPointer.y

      setPaths((previous) =>
        previous.map((path) => {
          if (path.id !== drag.pathId) {
            return path
          }

          if (drag.pointIndex < 0 || drag.pointIndex >= path.points.length) {
            return path
          }

          const nextPoints = [...path.points]
          nextPoints[drag.pointIndex] = {
            x: drag.originPoint.x + dx,
            y: drag.originPoint.y + dy,
            handleIn: drag.originPoint.handleIn
              ? {
                  x: drag.originPoint.handleIn.x + dx,
                  y: drag.originPoint.handleIn.y + dy,
                }
              : null,
            handleOut: drag.originPoint.handleOut
              ? {
                  x: drag.originPoint.handleOut.x + dx,
                  y: drag.originPoint.handleOut.y + dy,
                }
              : null,
          }

          return {
            ...path,
            points: nextPoints,
          }
        }),
      )
    },
    [resolveCanvasPoint],
  )

  const onCanvasPointerUp = useCallback(() => {
    if (draggingRef.current) {
      setStatusText('已更新锚点位置')
    }
    draggingRef.current = null
  }, [])

  const onCanvasContextMenu = useCallback((event: ReactMouseEvent<HTMLCanvasElement>) => {
    event.preventDefault()
  }, [])

  const onTriggerImageImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const onImageFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      const objectUrl = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => {
        setImageElement(image)
        setImageName(file.name)
        setStatusText('已加载图片，左键添加锚点，右键选择锚点')
        fitZoom(image)
        if (paths.length === 0) {
          const id = generatePathId()
          const defaultPath: ArrowPath = {
            id,
            name: '路径 1',
            points: [],
            style: buildDefaultArrowStyle(globalColor, globalArrowStyle),
            reversed: false,
            useCustomColor: false,
            collapsed: false,
          }
          setPaths([defaultPath])
          setSelectedPathId(id)
        }
      }
      image.src = objectUrl

      if (event.target) {
        event.target.value = ''
      }
    },
    [fitZoom, globalArrowStyle, globalColor, paths.length],
  )

  const onTriggerJsonImport = useCallback(() => {
    jsonFileInputRef.current?.click()
  }, [])

  const onJsonFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? '{}'))
        const importedPaths = parseImportedPaths(parsed)
        if (importedPaths.length === 0) {
          setStatusText('导入失败：未找到有效路径数据')
          return
        }
        setPaths(importedPaths)
        setSelectedPathId(importedPaths[0]?.id ?? null)
        setSelectedPointIndex(null)
        setStatusText(`已导入 ${importedPaths.length} 条路径`) // keep concise
      } catch {
        setStatusText('导入失败：JSON 格式不合法')
      }
    }
    reader.readAsText(file)

    if (event.target) {
      event.target.value = ''
    }
  }, [])

  const onExportJson = useCallback(() => {
    if (paths.length === 0) {
      setStatusText('没有路径可导出')
      return
    }

    const payload = {
      version: '1.0',
      globalColor,
      globalArrowStyle,
      paths: toPathDataForExport(paths),
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    downloadBlob(blob, 'paths.json')
    setStatusText(`已导出 ${paths.length} 条路径`) // keep concise
  }, [globalArrowStyle, globalColor, paths])

  const onAddPath = useCallback(() => {
    const nextId = generatePathId()
    const nextIndex = paths.length + 1
    const next: ArrowPath = {
      id: nextId,
      name: `路径 ${nextIndex}`,
      points: [],
      style: buildDefaultArrowStyle(globalColor, globalArrowStyle),
      reversed: false,
      useCustomColor: false,
      collapsed: false,
    }
    setPaths((previous) => [...previous, next])
    setSelectedPathId(nextId)
    setSelectedPointIndex(null)
    setStatusText(`已创建 ${next.name}`)
  }, [globalArrowStyle, globalColor, paths.length])

  const onSelectPath = useCallback((pathId: string) => {
    setSelectedPathId(pathId)
    setSelectedPointIndex(null)
  }, [])

  const onDeletePath = useCallback(
    (pathId: string) => {
      setPaths((previous) => {
        const next = previous.filter((path) => path.id !== pathId)
        if (selectedPathId === pathId) {
          setSelectedPathId(next[0]?.id ?? null)
          setSelectedPointIndex(null)
        }
        return next
      })
      setStatusText('路径已删除')
    },
    [selectedPathId],
  )

  const onCopyPath = useCallback((pathId: string) => {
    setPaths((previous) => {
      const source = previous.find((path) => path.id === pathId)
      if (!source) {
        return previous
      }
      const copied: ArrowPath = {
        ...source,
        id: generatePathId(),
        name: `${source.name} (副本)`,
        points: source.points.map((point) => clonePoint(point)),
      }
      setSelectedPathId(copied.id)
      setSelectedPointIndex(null)
      setStatusText(`已复制 ${source.name}`)
      return [...previous, copied]
    })
  }, [])

  const onReversePath = useCallback((pathId: string) => {
    setPaths((previous) =>
      previous.map((path) => {
        if (path.id !== pathId) {
          return path
        }
        return {
          ...path,
          points: [...path.points].reverse(),
          reversed: !path.reversed,
        }
      }),
    )
    setSelectedPointIndex(null)
    setStatusText('已反转路径方向')
  }, [])

  const onTogglePathCollapsed = useCallback((pathId: string) => {
    setPaths((previous) =>
      previous.map((path) => {
        if (path.id !== pathId) {
          return path
        }
        return {
          ...path,
          collapsed: !path.collapsed,
        }
      }),
    )
  }, [])

  const onPathNameChange = useCallback((pathId: string, name: string) => {
    setPaths((previous) =>
      previous.map((path) => {
        if (path.id !== pathId) {
          return path
        }
        return {
          ...path,
          name: name.slice(0, 80),
        }
      }),
    )
  }, [])

  const onUpdatePathStyle = useCallback((pathId: string, patch: Partial<ArrowStyle>) => {
    setPaths((previous) =>
      previous.map((path) => {
        if (path.id !== pathId) {
          return path
        }

        const nextStyle = {
          ...path.style,
          ...patch,
        }

        return {
          ...path,
          style: {
            ...nextStyle,
            arrowCount: Math.round(clamp(nextStyle.arrowCount, 1, 10)),
            triangleHeight: Math.round(clamp(nextStyle.triangleHeight, 5, 50)),
            triangleWidth: Math.round(clamp(nextStyle.triangleWidth, 5, 50)),
            tailLength: Math.round(clamp(nextStyle.tailLength, 0, 80)),
            tailWidth: Math.round(clamp(nextStyle.tailWidth, 2, 30)),
            duration: roundTo(clamp(nextStyle.duration, 1, 10), 1),
            timeOffset: roundTo(clamp(nextStyle.timeOffset, 0, 10), 1),
          },
          useCustomColor: patch.color !== undefined ? true : path.useCustomColor,
        }
      }),
    )
  }, [])

  const onResetPathColor = useCallback((pathId: string) => {
    setPaths((previous) =>
      previous.map((path) => {
        if (path.id !== pathId) {
          return path
        }
        return {
          ...path,
          useCustomColor: false,
          style: {
            ...path.style,
            color: globalColor,
          },
        }
      }),
    )
  }, [globalColor])

  const onUpdateGlobalColor = useCallback((value: string) => {
    setGlobalColor(value)
  }, [])

  const onUpdateGlobalArrowStyle = useCallback((patch: Partial<GlobalArrowStyle>) => {
    setGlobalArrowStyle((previous) => ({
      triangleHeight: Math.round(clamp(patch.triangleHeight ?? previous.triangleHeight, 5, 50)),
      triangleWidth: Math.round(clamp(patch.triangleWidth ?? previous.triangleWidth, 5, 50)),
      tailLength: Math.round(clamp(patch.tailLength ?? previous.tailLength, 0, 80)),
      tailWidth: Math.round(clamp(patch.tailWidth ?? previous.tailWidth, 2, 30)),
    }))
  }, [])

  const onZoomIn = useCallback(() => {
    setZoom((previous) => roundTo(clamp(previous * 1.25, 0.1, 5), 3))
  }, [])

  const onZoomOut = useCallback(() => {
    setZoom((previous) => roundTo(clamp(previous / 1.25, 0.1, 5), 3))
  }, [])

  const onZoomReset = useCallback(() => {
    setZoom(1)
  }, [])

  const onZoomFit = useCallback(() => {
    if (!imageElement) {
      return
    }
    fitZoom(imageElement)
  }, [fitZoom, imageElement])

  const onTogglePlay = useCallback(() => {
    if (!imageLoaded) {
      setStatusText('请先导入图片')
      return
    }
    if (paths.every((path) => path.points.length < 2)) {
      setStatusText('请先绘制至少一条有效路径')
      return
    }

    setIsPlaying((previous) => {
      const next = !previous
      setStatusText(next ? '播放中...' : '已停止播放')
      return next
    })
  }, [imageLoaded, paths])

  const renderCompositeFrame = useCallback(
    (ctx: CanvasRenderingContext2D, elapsedMs: number): boolean => {
      const mainCanvas = mainCanvasRef.current
      const overlayCanvas = overlayCanvasRef.current
      if (!mainCanvas || !overlayCanvas) {
        return false
      }

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
      ctx.drawImage(mainCanvas, 0, 0)
      ctx.drawImage(overlayCanvas, 0, 0)
      drawAnimatedArrowsToContext(ctx, elapsedMs)
      return true
    },
    [drawAnimatedArrowsToContext],
  )

  const exportPngFrame = useCallback(async () => {
    const mainCanvas = mainCanvasRef.current
    if (!mainCanvas) {
      return
    }

    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = mainCanvas.width
    exportCanvas.height = mainCanvas.height
    const exportCtx = exportCanvas.getContext('2d')
    if (!exportCtx) {
      return
    }

    renderCompositeFrame(exportCtx, 0)
    setExportProgress(80)

    await new Promise<void>((resolve) => {
      exportCanvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, 'path-arrow-frame.png')
          setStatusText('已导出 PNG 当前帧')
        }
        resolve()
      }, 'image/png')
    })
  }, [renderCompositeFrame])

  const exportGifAnimation = useCallback(
    async (profile: ExportProfile) => {
      const mainCanvas = mainCanvasRef.current
      if (!mainCanvas) {
        return
      }

      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = mainCanvas.width
      exportCanvas.height = mainCanvas.height
      const exportCtx = exportCanvas.getContext('2d')
      if (!exportCtx) {
        return
      }

      const { GIF, workerScript } = await ensureGifRuntime()
      const gif = new GIF({
        workers: 2,
        quality: 9,
        width: exportCanvas.width,
        height: exportCanvas.height,
        workerScript,
      })

      const frameDelay = Math.max(20, Math.round(1000 / profile.fps))
      const frameStep = profile.durationMs / profile.frameCount

      for (let frame = 0; frame < profile.frameCount; frame += 1) {
        const elapsed = frame * frameStep
        renderCompositeFrame(exportCtx, elapsed)
        gif.addFrame(exportCtx, { copy: true, delay: frameDelay })
        setExportProgress(Math.round((frame / profile.frameCount) * 45))
        if (frame % 8 === 0) {
          await wait(0)
        }
      }

      await new Promise<void>((resolve, reject) => {
        gif.on('progress', (progressValue) => {
          if (typeof progressValue === 'number') {
            setExportProgress(45 + Math.round(progressValue * 55))
          }
        })

        gif.on('finished', (value, maybeBlob) => {
          const blob = value instanceof Blob ? value : maybeBlob instanceof Blob ? maybeBlob : null
          if (!blob) {
            reject(new Error('GIF 导出失败'))
            return
          }
          downloadBlob(blob, 'path-arrow-animation.gif')
          resolve()
        })

        try {
          gif.render()
        } catch (error) {
          reject(error)
        }
      })

      setStatusText('已导出 GIF 动画')
    },
    [renderCompositeFrame],
  )

  const exportVideoAnimation = useCallback(
    async (profile: ExportProfile) => {
      const mainCanvas = mainCanvasRef.current
      if (!mainCanvas) {
        return
      }

      const exportCanvas = document.createElement('canvas')
      exportCanvas.width = mainCanvas.width
      exportCanvas.height = mainCanvas.height
      const exportCtx = exportCanvas.getContext('2d')
      if (!exportCtx) {
        return
      }

      const mimeType = resolveRecorderMimeType()
      const stream = exportCanvas.captureStream(profile.fps)
      const chunks: BlobPart[] = []

      let recorder: MediaRecorder
      try {
        recorder = new MediaRecorder(stream, { mimeType })
      } catch {
        recorder = new MediaRecorder(stream)
      }

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      const stopPromise = new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve()
        recorder.onerror = () => reject(new Error('视频导出失败'))
      })

      recorder.start()

      const frameInterval = 1000 / profile.fps
      const frameStep = profile.durationMs / profile.frameCount

      for (let frame = 0; frame < profile.frameCount; frame += 1) {
        const elapsed = frame * frameStep
        renderCompositeFrame(exportCtx, elapsed)
        setExportProgress(Math.round((frame / profile.frameCount) * 90))
        await wait(frameInterval)
      }

      recorder.stop()
      await stopPromise

      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType })
      const extension = blob.type.includes('mp4') ? 'mp4' : 'webm'
      downloadBlob(blob, `path-arrow-animation.${extension}`)
      setStatusText(extension === 'mp4' ? '已导出 MP4 动画' : '已导出 WebM 动画（浏览器编码）')
    },
    [renderCompositeFrame],
  )

  const onExportAnimation = useCallback(
    async (format: ExportFormat) => {
      if (!imageLoaded) {
        setStatusText('请先导入图片')
        return
      }

      if (paths.every((path) => path.points.length < 2)) {
        setStatusText('请先绘制至少一条有效路径')
        return
      }

      const profile = resolveExportProfile(paths)
      setIsExporting(true)
      setExportProgress(1)

      try {
        if (format === 'png') {
          await exportPngFrame()
        } else if (format === 'gif') {
          await exportGifAnimation(profile)
        } else {
          await exportVideoAnimation(profile)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '导出失败'
        setStatusText(message)
      } finally {
        setExportProgress(100)
        window.setTimeout(() => {
          setExportProgress(0)
          setIsExporting(false)
        }, 300)
      }
    },
    [exportGifAnimation, exportPngFrame, exportVideoAnimation, imageLoaded, paths],
  )

  return {
    fileInputRef,
    jsonFileInputRef,
    mainCanvasRef,
    overlayCanvasRef,
    interactionCanvasRef,
    canvasContainerRef,
    canvasWrapperRef,
    imageLoaded,
    imageName,
    statusText,
    zoom,
    paths,
    selectedPathId,
    selectedPointIndex,
    globalColor,
    globalArrowStyle,
    isPlaying,
    isExporting,
    exportProgress,
    onTriggerImageImport,
    onImageFileChange,
    onTriggerJsonImport,
    onJsonFileChange,
    onExportJson,
    onAddPath,
    onSelectPath,
    onDeletePath,
    onCopyPath,
    onReversePath,
    onTogglePathCollapsed,
    onPathNameChange,
    onUpdatePathStyle,
    onResetPathColor,
    onUpdateGlobalColor,
    onUpdateGlobalArrowStyle,
    onZoomIn,
    onZoomOut,
    onZoomFit,
    onZoomReset,
    onTogglePlay,
    onExportAnimation,
    onCanvasPointerDown,
    onCanvasPointerMove,
    onCanvasPointerUp,
    onCanvasContextMenu,
  }
}
