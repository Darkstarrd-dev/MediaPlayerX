import { clamp } from "../../utils/ui";

const MIN_DIM = 36;
const THUMBNAIL_CAPTION_HEIGHT = 0;
// 这是布局侧有意加入的视觉留白补偿，不对应 .thumb-card 的 CSS padding。
const DEFAULT_CARD_PADDING_TOTAL = 10;
const DEFAULT_CARD_BORDER_WIDTH = 1;
const DEFAULT_THUMBNAIL_CARD_CHROME =
  DEFAULT_CARD_PADDING_TOTAL + DEFAULT_CARD_BORDER_WIDTH * 2;

export const THUMBNAIL_LEVEL_COUNT = 7;
export const THUMBNAIL_DEFAULT_LEVEL = 4;

export function resolveThumbnailCardChromePx(): number {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return DEFAULT_THUMBNAIL_CARD_CHROME;
  }

  const styles = window.getComputedStyle(document.documentElement);
  const borderWidthRaw = styles
    .getPropertyValue("--mpx-card-border-width")
    .trim();
  const borderWidth = Number.parseFloat(borderWidthRaw);
  const safeBorderWidth = Number.isFinite(borderWidth)
    ? Math.max(0, borderWidth)
    : DEFAULT_CARD_BORDER_WIDTH;
  return floorPx(DEFAULT_CARD_PADDING_TOTAL + safeBorderWidth * 2);
}

export interface ThumbnailGridLayout {
  columns: number;
  rows: number;
  cellWidth: number;
  mediaHeight: number;
  pageSize: number;
  zoomLevel: number;
  zoomLevelCount: number;
  zoomValue: number;
  gap: number;
  idealGridWidth: number;
  idealGridHeight: number;
}

export function computeRenderGap(params: {
  gridWidth: number;
  columns: number;
  cellWidth: number;
  baseGap: number;
}): number {
  if (params.columns <= 1) {
    return params.baseGap;
  }
  const totalGapSpace = params.gridWidth - params.columns * params.cellWidth;
  if (totalGapSpace <= 0) {
    return params.baseGap;
  }
  const perGap = totalGapSpace / (params.columns - 1);
  const maxPerGap = params.baseGap + Math.max(2, params.cellWidth * 0.08);
  return perGap <= maxPerGap ? perGap : params.baseGap;
}

function floorPx(value: number): number {
  return Math.floor(value);
}

function pickClosestCols(
  canvasW: number,
  cellSize: number,
  gap: number,
): number {
  const approx = Math.max(1, Math.round((canvasW + gap) / (cellSize + gap)));
  let bestCols = 1;
  let bestDiff = Number.POSITIVE_INFINITY;
  let bestOverflows = true;

  for (let cols = Math.max(1, approx - 2); cols <= approx + 2; cols += 1) {
    const width = cols * cellSize + (cols - 1) * gap;
    const diff = Math.abs(width - canvasW);
    const overflows = width > canvasW + 0.5;

    if (bestOverflows && !overflows) {
      bestCols = cols;
      bestDiff = diff;
      bestOverflows = false;
      continue;
    }
    if (!bestOverflows && overflows) {
      continue;
    }

    if (diff < bestDiff - 0.001) {
      bestOverflows = overflows;
      bestDiff = diff;
      bestCols = cols;
      continue;
    }

    if (Math.abs(diff - bestDiff) <= 0.001) {
      if (!overflows && cols > bestCols) {
        bestCols = cols;
      } else if (overflows && cols < bestCols) {
        bestCols = cols;
      }
    }
  }

  return bestCols;
}

/**
 * zoomLevel = 竖向可见行数。level 4（默认）= 竖向 4 行均分。
 * Cell size 由 gridHeight / rows 唯一确定，columns 由 gridWidth / cellSize 纯算术得出。
 * O(1) 计算（退化循环最多 7 次）。
 */
export function computeThumbnailGridLayout(params: {
  gridWidth: number;
  gridHeight: number;
  thumbnailWidth: number;
  thumbnailGap: number;
  zoomLevel: number;
  cardChrome?: number;
}): ThumbnailGridLayout {
  const safeWidth = Math.max(0, Math.floor(params.gridWidth));
  const safeHeight = Math.max(0, Math.floor(params.gridHeight));
  const safeGap = clamp(Math.round(params.thumbnailGap), 0, 24);
  const safeCardChrome = Math.max(
    0,
    floorPx(params.cardChrome ?? DEFAULT_THUMBNAIL_CARD_CHROME),
  );
  let rows = clamp(Math.round(params.zoomLevel), 1, THUMBNAIL_LEVEL_COUNT);

  // 容器为空的 fallback
  if (safeWidth <= 0 || safeHeight <= 0) {
    const fallbackMedia = Math.max(MIN_DIM, 128);
    const fallbackCell = fallbackMedia + safeCardChrome;
    return {
      columns: 1,
      rows: 1,
      cellWidth: floorPx(fallbackCell),
      mediaHeight: floorPx(fallbackMedia),
      pageSize: 1,
      zoomLevel: THUMBNAIL_DEFAULT_LEVEL,
      zoomLevelCount: THUMBNAIL_LEVEL_COUNT,
      zoomValue: floorPx(fallbackMedia),
      gap: safeGap,
      idealGridWidth: floorPx(fallbackCell),
      idealGridHeight: floorPx(
        fallbackMedia + THUMBNAIL_CAPTION_HEIGHT + safeCardChrome,
      ),
    };
  }

  // 行数退化：容器太矮时自动减少行数保证 MIN_DIM
  while (rows > 1) {
    const mediaByHeightTest = Math.floor(
      (safeHeight - (rows - 1) * safeGap) / rows -
        THUMBNAIL_CAPTION_HEIGHT -
        safeCardChrome,
    );
    if (mediaByHeightTest >= MIN_DIM) break;
    rows -= 1;
  }

  // 最终计算
  const mediaByHeight = Math.floor(
    (safeHeight - (rows - 1) * safeGap) / rows -
      THUMBNAIL_CAPTION_HEIGHT -
      safeCardChrome,
  );
  const mediaByWidth = safeWidth - safeCardChrome;
  const mediaSize = Math.max(
    MIN_DIM,
    Math.floor(Math.min(mediaByHeight, mediaByWidth)),
  );
  const cellSize = mediaSize + safeCardChrome;
  const cols = pickClosestCols(safeWidth, cellSize, safeGap);
  const idealGridWidth = cols * cellSize + (cols - 1) * safeGap;
  const idealGridHeight =
    rows * (mediaSize + THUMBNAIL_CAPTION_HEIGHT + safeCardChrome) +
    (rows - 1) * safeGap;

  return {
    columns: cols,
    rows,
    cellWidth: floorPx(cellSize),
    mediaHeight: floorPx(mediaSize),
    pageSize: Math.max(1, cols * rows),
    zoomLevel: rows,
    zoomLevelCount: THUMBNAIL_LEVEL_COUNT,
    zoomValue: floorPx(mediaSize),
    gap: safeGap,
    idealGridWidth: floorPx(idealGridWidth),
    idealGridHeight: floorPx(idealGridHeight),
  };
}
