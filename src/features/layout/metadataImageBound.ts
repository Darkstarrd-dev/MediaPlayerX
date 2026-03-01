interface MetadataImageHeightBoundMetrics {
  imageHeight: number;
  canvasHeight: number;
  canvasPaddingTop: number;
  canvasPaddingBottom: number;
  epsilonPx: number;
}

export function isMetadataImageHeightBoundByMetrics({
  imageHeight,
  canvasHeight,
  canvasPaddingTop,
  canvasPaddingBottom,
  epsilonPx,
}: MetadataImageHeightBoundMetrics): boolean {
  if (imageHeight <= 0 || canvasHeight <= 0) {
    return false;
  }

  const canvasContentHeight = Math.max(
    0,
    canvasHeight - canvasPaddingTop - canvasPaddingBottom,
  );
  if (canvasContentHeight <= 0) {
    return false;
  }

  return imageHeight >= canvasContentHeight - Math.max(0, epsilonPx);
}
