import { clamp } from '../../utils/ui'

const TARGET_RATIO = 3 / 4
const RATIO_TOLERANCE = 0.1
const MIN_RATIO = TARGET_RATIO * (1 - RATIO_TOLERANCE)
const MAX_RATIO = TARGET_RATIO * (1 + RATIO_TOLERANCE)
const MIN_DIM = 36
const DEDUP_THRESHOLD = 1.18
const THUMBNAIL_CAPTION_HEIGHT = 52

export const THUMBNAIL_LEVEL_COUNT = 9
export const THUMBNAIL_DEFAULT_LEVEL = 5

interface TileConfig {
  cols: number
  rows: number
  tileW: number
  tileH: number
  gap: number
  totalTiles: number
  utilization: number
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
}

function calcConfig(
  canvasW: number,
  canvasH: number,
  cols: number,
  rows: number,
  gap: number,
): TileConfig | null {
  if (cols <= 0 || rows <= 0 || canvasW <= 0 || canvasH <= 0) {
    return null
  }

  const maxW = (canvasW - (cols - 1) * gap) / cols
  const maxCardH = (canvasH - (rows - 1) * gap) / rows
  const maxH = maxCardH - THUMBNAIL_CAPTION_HEIGHT

  if (maxW < MIN_DIM || maxH < MIN_DIM) {
    return null
  }

  let tileW: number
  let tileH: number
  const cellRatio = maxW / maxH

  if (cellRatio >= MIN_RATIO && cellRatio <= MAX_RATIO) {
    tileW = maxW
    tileH = maxH
  } else if (cellRatio < MIN_RATIO) {
    tileW = maxW
    tileH = maxW / MIN_RATIO
  } else {
    tileH = maxH
    tileW = maxH * MAX_RATIO
  }

  if (tileW < MIN_DIM || tileH < MIN_DIM) {
    return null
  }

  const gridW = cols * tileW + (cols - 1) * gap
  const gridH = rows * (tileH + THUMBNAIL_CAPTION_HEIGHT) + (rows - 1) * gap
  const marginX = (canvasW - gridW) / 2
  const marginY = (canvasH - gridH) / 2
  if (marginX < -0.5 || marginY < -0.5) {
    return null
  }

  const totalTiles = cols * rows
  const utilization = (totalTiles * tileW * tileH) / (canvasW * canvasH)

  return {
    cols,
    rows,
    tileW,
    tileH,
    gap,
    totalTiles,
    utilization,
  }
}

function computeLevels(canvasW: number, canvasH: number, gap: number): TileConfig[] {
  if (canvasW < MIN_DIM || canvasH < MIN_DIM) {
    return []
  }

  const maxCols = Math.floor((canvasW + gap) / (MIN_DIM + gap))
  const maxRows = Math.floor((canvasH + gap) / (MIN_DIM + THUMBNAIL_CAPTION_HEIGHT + gap))

  const configs: TileConfig[] = []
  for (let cols = 1; cols <= maxCols; cols += 1) {
    for (let rows = 1; rows <= maxRows; rows += 1) {
      const cfg = calcConfig(canvasW, canvasH, cols, rows, gap)
      if (cfg) {
        configs.push(cfg)
      }
    }
  }

  configs.sort((a, b) => b.tileW * b.tileH - a.tileW * a.tileH)
  if (configs.length === 0) {
    return []
  }

  const result: TileConfig[] = [configs[0]]
  for (let i = 1; i < configs.length; i += 1) {
    const last = result[result.length - 1]
    const current = configs[i]
    const lastArea = last.tileW * last.tileH
    const currentArea = current.tileW * current.tileH
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

function pickNineLevels(levels: TileConfig[], targetWidth: number): TileConfig[] {
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
    const diff = Math.abs(levels[i].tileW - targetWidth)
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
}): ThumbnailGridLayout {
  const safeWidth = Math.max(0, Math.floor(params.gridWidth))
  const safeHeight = Math.max(0, Math.floor(params.gridHeight))
  const safeGap = clamp(Math.round(params.thumbnailGap), 0, 24)
  const normalizedThumbnailWidth = clamp(Math.round(params.thumbnailWidth), 128, 2048)
  const targetWidth = Math.max(MIN_DIM, normalizedThumbnailWidth * 0.75)

  if (safeWidth <= 0 || safeHeight <= 0) {
    const fallbackHeight = Math.floor(targetWidth / TARGET_RATIO)
    return {
      columns: 1,
      rows: 1,
      cellWidth: Math.max(MIN_DIM, Math.floor(targetWidth)),
      mediaHeight: Math.max(MIN_DIM, fallbackHeight),
      pageSize: 1,
      zoomLevel: THUMBNAIL_DEFAULT_LEVEL,
      zoomLevelCount: THUMBNAIL_LEVEL_COUNT,
      zoomValue: targetWidth,
      gap: safeGap,
    }
  }

  const allLevels = computeLevels(safeWidth, safeHeight, safeGap)
  const levels = pickNineLevels(allLevels, targetWidth)

  if (levels.length === 0) {
    const fallbackWidth = Math.max(MIN_DIM, Math.floor(targetWidth))
    const fallbackHeight = Math.max(MIN_DIM, Math.floor(fallbackWidth / TARGET_RATIO))
    const columns = Math.max(1, Math.floor((safeWidth + safeGap) / (fallbackWidth + safeGap)))
    const rows = Math.max(1, Math.floor((safeHeight + safeGap) / (fallbackHeight + THUMBNAIL_CAPTION_HEIGHT + safeGap)))
    return {
      columns,
      rows,
      cellWidth: fallbackWidth,
      mediaHeight: fallbackHeight,
      pageSize: Math.max(1, columns * rows),
      zoomLevel: THUMBNAIL_DEFAULT_LEVEL,
      zoomLevelCount: THUMBNAIL_LEVEL_COUNT,
      zoomValue: fallbackWidth,
      gap: safeGap,
    }
  }

  const safeLevel = clamp(Math.round(params.zoomLevel), 1, levels.length)
  const picked = levels[safeLevel - 1]

  return {
    columns: picked.cols,
    rows: picked.rows,
    cellWidth: Math.floor(picked.tileW),
    mediaHeight: Math.floor(picked.tileH),
    pageSize: Math.max(1, picked.totalTiles),
    zoomLevel: safeLevel,
    zoomLevelCount: levels.length,
    zoomValue: picked.tileW,
    gap: picked.gap,
  }
}
