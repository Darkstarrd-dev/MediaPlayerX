import { clamp } from '../../utils/ui'

const MIN_DIM = 36
const DEDUP_THRESHOLD = 1.18
const THUMBNAIL_CAPTION_HEIGHT = 0
const DEFAULT_CARD_PADDING_TOTAL = 10
const DEFAULT_CARD_BORDER_WIDTH = 1
const DEFAULT_THUMBNAIL_CARD_CHROME = DEFAULT_CARD_PADDING_TOTAL + DEFAULT_CARD_BORDER_WIDTH * 2

export const THUMBNAIL_LEVEL_COUNT = 9
export const THUMBNAIL_DEFAULT_LEVEL = 5

export function resolveThumbnailCardChromePx(): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return DEFAULT_THUMBNAIL_CARD_CHROME
  }

  const styles = window.getComputedStyle(document.documentElement)
  const borderWidthRaw = styles.getPropertyValue('--mpx-card-border-width').trim()
  const borderWidth = Number.parseFloat(borderWidthRaw)
  const safeBorderWidth = Number.isFinite(borderWidth) ? Math.max(0, borderWidth) : DEFAULT_CARD_BORDER_WIDTH
  return roundPx(DEFAULT_CARD_PADDING_TOTAL + safeBorderWidth * 2)
}

interface TileConfig {
  cols: number
  rows: number
  cellSize: number
  mediaSize: number
  gap: number
  totalTiles: number
  utilization: number
  idealGridWidth: number
  idealGridHeight: number
}

export interface ThumbnailGridLayout {
  columns: number
  rows: number
  cellWidth: number
  mediaHeight: number
  pageSize: number
  zoomLevel: number
  zoomLevelCount: number
  zoomValue: number
  gap: number
  idealGridWidth: number
  idealGridHeight: number
}

function roundPx(value: number): number {
  return Number(value.toFixed(3))
}

function pickClosestCols(canvasW: number, cellSize: number, gap: number): number {
  const approx = Math.max(1, Math.round((canvasW + gap) / (cellSize + gap)))
  let bestCols = approx
  let bestDiff = Number.POSITIVE_INFINITY

  for (let cols = Math.max(1, approx - 2); cols <= approx + 2; cols += 1) {
    const width = cols * cellSize + (cols - 1) * gap
    const diff = Math.abs(width - canvasW)
    if (diff < bestDiff - 0.001) {
      bestDiff = diff
      bestCols = cols
      continue
    }

    if (Math.abs(diff - bestDiff) <= 0.001 && cols > bestCols) {
      bestCols = cols
    }
  }

  return bestCols
}

function calcConfig(
  canvasW: number,
  canvasH: number,
  rows: number,
  gap: number,
  cardChrome: number,
): TileConfig | null {
  if (rows <= 0 || canvasW <= 0 || canvasH <= 0) {
    return null
  }

  const maxMediaByHeight = (canvasH - (rows - 1) * gap) / rows - THUMBNAIL_CAPTION_HEIGHT - cardChrome
  if (maxMediaByHeight < MIN_DIM) {
    return null
  }

  const mediaSize = maxMediaByHeight
  const cellSize = mediaSize + cardChrome
  const cols = pickClosestCols(canvasW, cellSize, gap)
  const idealGridWidth = cols * cellSize + (cols - 1) * gap
  const idealGridHeight = rows * (mediaSize + THUMBNAIL_CAPTION_HEIGHT + cardChrome) + (rows - 1) * gap

  const totalTiles = cols * rows
  const utilization = (totalTiles * mediaSize * mediaSize) / Math.max(1, canvasW * canvasH)

  return {
    cols,
    rows,
    cellSize,
    mediaSize,
    gap,
    totalTiles,
    utilization,
    idealGridWidth,
    idealGridHeight,
  }
}

function computeLevels(canvasW: number, canvasH: number, gap: number, cardChrome: number): TileConfig[] {
  if (canvasW < MIN_DIM || canvasH < MIN_DIM) {
    return []
  }

  const maxRows = Math.floor((canvasH + gap) / (MIN_DIM + THUMBNAIL_CAPTION_HEIGHT + cardChrome + gap))
  const configs: TileConfig[] = []

  for (let rows = 1; rows <= maxRows; rows += 1) {
    const cfg = calcConfig(canvasW, canvasH, rows, gap, cardChrome)
    if (cfg) {
      configs.push(cfg)
    }
  }

  configs.sort((a, b) => b.mediaSize * b.mediaSize - a.mediaSize * a.mediaSize)
  if (configs.length === 0) {
    return []
  }

  const result: TileConfig[] = [configs[0]]
  for (let i = 1; i < configs.length; i += 1) {
    const last = result[result.length - 1]
    const current = configs[i]
    const lastArea = last.mediaSize * last.mediaSize
    const currentArea = current.mediaSize * current.mediaSize
    const areaRatio = lastArea / currentArea

    if (areaRatio >= DEDUP_THRESHOLD) {
      result.push(current)
      continue
    }

    if (current.utilization > last.utilization + 0.06) {
      result[result.length - 1] = current
    }
  }

  return result
}

function pickNineLevels(levels: TileConfig[], targetMediaSize: number): TileConfig[] {
  if (levels.length === 0) {
    return []
  }

  if (levels.length <= THUMBNAIL_LEVEL_COUNT) {
    const result = [...levels]
    while (result.length < THUMBNAIL_LEVEL_COUNT) {
      result.unshift(result[0])
      if (result.length < THUMBNAIL_LEVEL_COUNT) {
        result.push(result[result.length - 1])
      }
    }
    return result
  }

  let anchorIndex = 0
  let minDiff = Number.POSITIVE_INFINITY
  for (let i = 0; i < levels.length; i += 1) {
    const diff = Math.abs(levels[i].mediaSize - targetMediaSize)
    if (diff < minDiff) {
      minDiff = diff
      anchorIndex = i
    }
  }

  let start = anchorIndex - Math.floor(THUMBNAIL_LEVEL_COUNT / 2)
  start = clamp(start, 0, levels.length - THUMBNAIL_LEVEL_COUNT)
  return levels.slice(start, start + THUMBNAIL_LEVEL_COUNT)
}

export function computeThumbnailGridLayout(params: {
  gridWidth: number
  gridHeight: number
  thumbnailWidth: number
  thumbnailGap: number
  zoomLevel: number
  cardChrome?: number
}): ThumbnailGridLayout {
  const safeWidth = Math.max(0, Math.floor(params.gridWidth))
  const safeHeight = Math.max(0, Math.floor(params.gridHeight))
  const safeGap = clamp(Math.round(params.thumbnailGap), 0, 24)
  const normalizedThumbnailWidth = clamp(Math.round(params.thumbnailWidth), 128, 2048)
  const safeCardChrome = Math.max(0, roundPx(params.cardChrome ?? DEFAULT_THUMBNAIL_CARD_CHROME))
  const targetMediaSize = Math.max(MIN_DIM, normalizedThumbnailWidth * 0.75 - safeCardChrome)

  if (safeWidth <= 0 || safeHeight <= 0) {
    const fallbackMedia = targetMediaSize
    const fallbackCell = fallbackMedia + safeCardChrome
    return {
      columns: 1,
      rows: 1,
      cellWidth: roundPx(Math.max(MIN_DIM + safeCardChrome, fallbackCell)),
      mediaHeight: roundPx(Math.max(MIN_DIM, fallbackMedia)),
      pageSize: 1,
      zoomLevel: THUMBNAIL_DEFAULT_LEVEL,
      zoomLevelCount: THUMBNAIL_LEVEL_COUNT,
      zoomValue: roundPx(fallbackMedia),
      gap: safeGap,
      idealGridWidth: roundPx(fallbackCell),
      idealGridHeight: roundPx(fallbackMedia + THUMBNAIL_CAPTION_HEIGHT + safeCardChrome),
    }
  }

  const allLevels = computeLevels(safeWidth, safeHeight, safeGap, safeCardChrome)
  const levels = pickNineLevels(allLevels, targetMediaSize)

  if (levels.length === 0) {
    const rows = Math.max(
      1,
      Math.round((safeHeight + safeGap) / (targetMediaSize + THUMBNAIL_CAPTION_HEIGHT + safeCardChrome + safeGap)),
    )
    const mediaSize = Math.max(MIN_DIM, (safeHeight - (rows - 1) * safeGap) / rows - THUMBNAIL_CAPTION_HEIGHT - safeCardChrome)
    const cellSize = mediaSize + safeCardChrome
    const cols = pickClosestCols(safeWidth, cellSize, safeGap)
    const idealGridWidth = cols * cellSize + (cols - 1) * safeGap
    const idealGridHeight = rows * (mediaSize + THUMBNAIL_CAPTION_HEIGHT + safeCardChrome) + (rows - 1) * safeGap
    return {
      columns: cols,
      rows,
      cellWidth: roundPx(cellSize),
      mediaHeight: roundPx(mediaSize),
      pageSize: Math.max(1, cols * rows),
      zoomLevel: THUMBNAIL_DEFAULT_LEVEL,
      zoomLevelCount: THUMBNAIL_LEVEL_COUNT,
      zoomValue: roundPx(mediaSize),
      gap: safeGap,
      idealGridWidth: roundPx(idealGridWidth),
      idealGridHeight: roundPx(idealGridHeight),
    }
  }

  const safeLevel = clamp(Math.round(params.zoomLevel), 1, levels.length)
  const picked = levels[safeLevel - 1]

  return {
    columns: picked.cols,
    rows: picked.rows,
    cellWidth: roundPx(picked.cellSize),
    mediaHeight: roundPx(picked.mediaSize),
    pageSize: Math.max(1, picked.totalTiles),
    zoomLevel: safeLevel,
    zoomLevelCount: levels.length,
    zoomValue: roundPx(picked.mediaSize),
    gap: picked.gap,
    idealGridWidth: roundPx(picked.idealGridWidth),
    idealGridHeight: roundPx(picked.idealGridHeight),
  }
}
