export type HorizontalResizeSource = "sidebar" | "metadata";

export interface HorizontalResizeCommitContext {
  source: HorizontalResizeSource;
  deltaX: number;
  commitId: number;
}

export interface HorizontalResizeLiveContext {
  source: HorizontalResizeSource;
  deltaX: number;
  tickId: number;
}

export interface GridSnapAnchor {
  columns: number;
  cellWidth: number;
  gap: number;
}

interface ResolveSnapTargetColumnsParams {
  anchor: GridSnapAnchor;
  commit: HorizontalResizeCommitContext;
}

function mapMainDeltaFromResize(commit: HorizontalResizeCommitContext): number {
  if (commit.source === "sidebar") {
    return -commit.deltaX;
  }
  return commit.deltaX;
}

export function resolveSnapTargetColumns({
  anchor,
  commit,
}: ResolveSnapTargetColumnsParams): number {
  const threshold = anchor.cellWidth * 0.5;
  const mainDelta = mapMainDeltaFromResize(commit);
  const absMainDelta = Math.abs(mainDelta);

  if (absMainDelta <= threshold) {
    return anchor.columns;
  }

  const stepSpan = Math.max(1, anchor.cellWidth + anchor.gap);
  const steps = 1 + Math.floor((absMainDelta - threshold) / stepSpan);
  const direction = mainDelta > 0 ? 1 : -1;
  return Math.max(1, anchor.columns + direction * steps);
}

export function calcIdealWidthByCols(
  cols: number,
  cellWidth: number,
  gap: number,
): number {
  if (cols <= 0) {
    return 0;
  }
  return cols * cellWidth + (cols - 1) * gap;
}
