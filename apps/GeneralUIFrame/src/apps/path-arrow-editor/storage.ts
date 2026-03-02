import type { ArrowPath, ArrowStyle, GlobalArrowStyle, PathArrowEditorPersistedState, PathPoint, Vector2 } from './types'

const STORAGE_KEY = 'general-ui-frame.path-arrow-editor.v1'

const DEFAULT_GLOBAL_STYLE: GlobalArrowStyle = {
  triangleHeight: 20,
  triangleWidth: 16,
  tailLength: 25,
  tailWidth: 6,
}

const DEFAULT_ARROW_STYLE: ArrowStyle = {
  color: '#e94560',
  arrowCount: 3,
  triangleHeight: 20,
  triangleWidth: 16,
  tailLength: 25,
  tailWidth: 6,
  duration: 3,
  timeOffset: 0,
}

export const DEFAULT_PATH_EDITOR_STATE: PathArrowEditorPersistedState = {
  globalColor: '#e94560',
  globalArrowStyle: DEFAULT_GLOBAL_STYLE,
  paths: [],
  selectedPathId: null,
  zoom: 1,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback
  }
  return clamp(value, min, max)
}

function asColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback
  }
  const normalized = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return normalized
  }
  return fallback
}

function normalizeVector(input: unknown): Vector2 | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const raw = input as Partial<Vector2>
  if (typeof raw.x !== 'number' || typeof raw.y !== 'number') {
    return null
  }
  return {
    x: raw.x,
    y: raw.y,
  }
}

function normalizePoint(input: unknown): PathPoint | null {
  if (!input || typeof input !== 'object') {
    return null
  }
  const raw = input as Partial<PathPoint>
  if (typeof raw.x !== 'number' || typeof raw.y !== 'number') {
    return null
  }

  return {
    x: raw.x,
    y: raw.y,
    handleIn: normalizeVector(raw.handleIn),
    handleOut: normalizeVector(raw.handleOut),
  }
}

function normalizeArrowStyle(input: unknown, fallbackColor: string): ArrowStyle {
  if (!input || typeof input !== 'object') {
    return {
      ...DEFAULT_ARROW_STYLE,
      color: fallbackColor,
    }
  }

  const raw = input as Partial<ArrowStyle>
  return {
    color: asColor(raw.color, fallbackColor),
    arrowCount: Math.round(asNumber(raw.arrowCount, DEFAULT_ARROW_STYLE.arrowCount, 1, 10)),
    triangleHeight: Math.round(asNumber(raw.triangleHeight, DEFAULT_ARROW_STYLE.triangleHeight, 5, 50)),
    triangleWidth: Math.round(asNumber(raw.triangleWidth, DEFAULT_ARROW_STYLE.triangleWidth, 5, 50)),
    tailLength: Math.round(asNumber(raw.tailLength, DEFAULT_ARROW_STYLE.tailLength, 0, 80)),
    tailWidth: Math.round(asNumber(raw.tailWidth, DEFAULT_ARROW_STYLE.tailWidth, 2, 30)),
    duration: Math.round(asNumber(raw.duration, DEFAULT_ARROW_STYLE.duration, 1, 10) * 10) / 10,
    timeOffset: Math.round(asNumber(raw.timeOffset, DEFAULT_ARROW_STYLE.timeOffset, 0, 10) * 10) / 10,
  }
}

function normalizePath(input: unknown, index: number, globalColor: string): ArrowPath | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const raw = input as Partial<ArrowPath>
  const points = Array.isArray(raw.points) ? raw.points.map((entry) => normalizePoint(entry)).filter((entry): entry is PathPoint => entry !== null) : []
  const name = typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim().slice(0, 80) : `路径 ${index + 1}`
  const id = typeof raw.id === 'string' && raw.id.trim().length > 0 ? raw.id.trim() : `path-${Date.now()}-${index}`
  const useCustomColor = typeof raw.useCustomColor === 'boolean' ? raw.useCustomColor : false

  return {
    id,
    name,
    points,
    style: normalizeArrowStyle(raw.style, globalColor),
    reversed: typeof raw.reversed === 'boolean' ? raw.reversed : false,
    useCustomColor,
    collapsed: typeof raw.collapsed === 'boolean' ? raw.collapsed : false,
  }
}

function normalizeGlobalStyle(input: unknown): GlobalArrowStyle {
  if (!input || typeof input !== 'object') {
    return DEFAULT_GLOBAL_STYLE
  }

  const raw = input as Partial<GlobalArrowStyle>
  return {
    triangleHeight: Math.round(asNumber(raw.triangleHeight, DEFAULT_GLOBAL_STYLE.triangleHeight, 5, 50)),
    triangleWidth: Math.round(asNumber(raw.triangleWidth, DEFAULT_GLOBAL_STYLE.triangleWidth, 5, 50)),
    tailLength: Math.round(asNumber(raw.tailLength, DEFAULT_GLOBAL_STYLE.tailLength, 0, 80)),
    tailWidth: Math.round(asNumber(raw.tailWidth, DEFAULT_GLOBAL_STYLE.tailWidth, 2, 30)),
  }
}

export function loadPathArrowEditorState(): PathArrowEditorPersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return DEFAULT_PATH_EDITOR_STATE
    }

    const parsed = JSON.parse(raw) as Partial<PathArrowEditorPersistedState>
    const globalColor = asColor(parsed.globalColor, DEFAULT_PATH_EDITOR_STATE.globalColor)
    const globalArrowStyle = normalizeGlobalStyle(parsed.globalArrowStyle)
    const paths = Array.isArray(parsed.paths)
      ? parsed.paths
          .map((entry, index) => normalizePath(entry, index, globalColor))
          .filter((entry): entry is ArrowPath => entry !== null)
      : []

    const selectedPathId =
      typeof parsed.selectedPathId === 'string' && paths.some((entry) => entry.id === parsed.selectedPathId)
        ? parsed.selectedPathId
        : paths[0]?.id ?? null

    return {
      globalColor,
      globalArrowStyle,
      paths,
      selectedPathId,
      zoom: Math.round(asNumber(parsed.zoom, DEFAULT_PATH_EDITOR_STATE.zoom, 0.1, 5) * 1000) / 1000,
    }
  } catch {
    return DEFAULT_PATH_EDITOR_STATE
  }
}

export function persistPathArrowEditorState(state: PathArrowEditorPersistedState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore write failures
  }
}
