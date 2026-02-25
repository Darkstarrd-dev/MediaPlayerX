import type { ImageConvertAdjustProfile } from "../../features/app/useAppSessionState";
import type { ImageItem, VideoItem } from "../../types";

export const IMAGE_ADJUST_HISTOGRAM_BIN_COUNT = 64;
export const IMAGE_ADJUST_CURVE_CANVAS_WIDTH = 360;
export const IMAGE_ADJUST_CURVE_CANVAS_HEIGHT = 220;
export const IMAGE_ADJUST_CURVE_PADDING = 18;
export const IMAGE_ADJUST_PANEL_DRAG_MARGIN = 8;

export function loadImageElementForAdjust(
  src: string,
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error("image adjust preview image load failed"));
    image.src = src;
  });
}

export function buildImageAdjustHistogramBins(
  imageData: Uint8ClampedArray,
  channelStride: number,
): number[] {
  const bins = Array.from(
    { length: IMAGE_ADJUST_HISTOGRAM_BIN_COUNT },
    () => 0,
  );
  if (channelStride <= 0) {
    return bins;
  }
  for (let index = 0; index < imageData.length; index += channelStride) {
    const red = imageData[index] ?? 0;
    const green = imageData[index + 1] ?? 0;
    const blue = imageData[index + 2] ?? 0;
    const luminance = Math.round(red * 0.2126 + green * 0.7152 + blue * 0.0722);
    const binIndex = Math.max(
      0,
      Math.min(
        IMAGE_ADJUST_HISTOGRAM_BIN_COUNT - 1,
        Math.floor((luminance / 256) * IMAGE_ADJUST_HISTOGRAM_BIN_COUNT),
      ),
    );
    bins[binIndex] += 1;
  }
  const peak = Math.max(1, ...bins);
  return bins.map((value) => Number((value / peak).toFixed(4)));
}

export function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function resolveNormalizedCurveAnchorX(
  shadowX: number,
  midtoneX: number,
  highlightX: number,
): { shadowX: number; midtoneX: number; highlightX: number } {
  const clampedShadowX = clampByte(shadowX);
  const clampedMidtoneX = clampByte(midtoneX);
  const clampedHighlightX = clampByte(highlightX);
  const normalizedShadowX = Math.max(
    1,
    Math.min(clampedShadowX, clampedMidtoneX - 2),
  );
  const normalizedMidtoneX = Math.max(
    normalizedShadowX + 1,
    Math.min(clampedMidtoneX, clampedHighlightX - 1),
  );
  const normalizedHighlightX = Math.max(
    normalizedMidtoneX + 2,
    Math.min(clampedHighlightX, 254),
  );
  return {
    shadowX: normalizedShadowX,
    midtoneX: normalizedMidtoneX,
    highlightX: normalizedHighlightX,
  };
}

function resolveNormalizedCurveAnchors(
  shadowX: number,
  midtoneX: number,
  highlightX: number,
  shadowYOffset: number,
  midtoneYOffset: number,
  highlightYOffset: number,
): {
  anchorX: [number, number, number, number, number];
  anchorY: [number, number, number, number, number];
} {
  const normalizedX = resolveNormalizedCurveAnchorX(
    shadowX,
    midtoneX,
    highlightX,
  );
  const anchorX: [number, number, number, number, number] = [
    0,
    normalizedX.shadowX,
    normalizedX.midtoneX,
    normalizedX.highlightX,
    255,
  ];
  const anchorY: [number, number, number, number, number] = [
    0,
    clampByte(anchorX[1] - shadowYOffset * 0.52),
    clampByte(anchorX[2] - midtoneYOffset * 0.52),
    clampByte(anchorX[3] - highlightYOffset * 0.52),
    255,
  ];
  return {
    anchorX,
    anchorY,
  };
}

function buildCurveLutFromAnchors(
  shadowX: number,
  midtoneX: number,
  highlightX: number,
  shadowYOffset: number,
  midtoneYOffset: number,
  highlightYOffset: number,
): Uint8ClampedArray {
  const { anchorX, anchorY } = resolveNormalizedCurveAnchors(
    shadowX,
    midtoneX,
    highlightX,
    shadowYOffset,
    midtoneYOffset,
    highlightYOffset,
  );

  const slope = new Array<number>(anchorX.length).fill(0);
  slope[0] = (anchorY[1] - anchorY[0]) / (anchorX[1] - anchorX[0]);
  slope[slope.length - 1] =
    (anchorY[anchorY.length - 1] - anchorY[anchorY.length - 2]) /
    (anchorX[anchorX.length - 1] - anchorX[anchorX.length - 2]);
  for (let index = 1; index < slope.length - 1; index += 1) {
    slope[index] =
      (anchorY[index + 1] - anchorY[index - 1]) /
      (anchorX[index + 1] - anchorX[index - 1]);
  }

  const lut = new Uint8ClampedArray(256);
  for (let x = 0; x <= 255; x += 1) {
    let segmentIndex = 0;
    while (segmentIndex < anchorX.length - 2 && x > anchorX[segmentIndex + 1]) {
      segmentIndex += 1;
    }
    const x0 = anchorX[segmentIndex];
    const x1 = anchorX[segmentIndex + 1];
    const y0 = anchorY[segmentIndex];
    const y1 = anchorY[segmentIndex + 1];
    const span = Math.max(1, x1 - x0);
    const t = (x - x0) / span;
    const m0 = slope[segmentIndex];
    const m1 = slope[segmentIndex + 1];
    const h00 = 2 * t * t * t - 3 * t * t + 1;
    const h10 = t * t * t - 2 * t * t + t;
    const h01 = -2 * t * t * t + 3 * t * t;
    const h11 = t * t * t - t * t;
    const y = h00 * y0 + h10 * span * m0 + h01 * y1 + h11 * span * m1;
    lut[x] = clampByte(y);
  }

  return lut;
}

export function resolveCurveControlPoints(
  profile: ImageConvertAdjustProfile,
): Array<{
  key: "shadow" | "midtone" | "highlight";
  x: number;
  y: number;
  value: number;
}> {
  const innerWidth =
    IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING * 2;
  const innerHeight =
    IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING * 2;
  const { anchorX, anchorY } = resolveNormalizedCurveAnchors(
    profile.curve_shadow_x,
    profile.curve_midtone_x,
    profile.curve_highlight_x,
    profile.curve_shadow,
    profile.curve_midtone,
    profile.curve_highlight,
  );

  return [
    {
      key: "shadow",
      x: Math.round((anchorX[1] / 255) * innerWidth),
      y: Math.round((1 - anchorY[1] / 255) * innerHeight),
      value: profile.curve_shadow,
    },
    {
      key: "midtone",
      x: Math.round((anchorX[2] / 255) * innerWidth),
      y: Math.round((1 - anchorY[2] / 255) * innerHeight),
      value: profile.curve_midtone,
    },
    {
      key: "highlight",
      x: Math.round((anchorX[3] / 255) * innerWidth),
      y: Math.round((1 - anchorY[3] / 255) * innerHeight),
      value: profile.curve_highlight,
    },
  ];
}

export function resolveCurvePathD(profile: ImageConvertAdjustProfile): string {
  const innerWidth =
    IMAGE_ADJUST_CURVE_CANVAS_WIDTH - IMAGE_ADJUST_CURVE_PADDING * 2;
  const innerHeight =
    IMAGE_ADJUST_CURVE_CANVAS_HEIGHT - IMAGE_ADJUST_CURVE_PADDING * 2;
  const lut = buildCurveLutFromAnchors(
    profile.curve_shadow_x,
    profile.curve_midtone_x,
    profile.curve_highlight_x,
    profile.curve_shadow,
    profile.curve_midtone,
    profile.curve_highlight,
  );
  let pathData = "";
  for (let x = 0; x <= 255; x += 2) {
    const output = lut[x] ?? x;
    const px = IMAGE_ADJUST_CURVE_PADDING + (x / 255) * innerWidth;
    const py = IMAGE_ADJUST_CURVE_PADDING + (1 - output / 255) * innerHeight;
    pathData += `${x === 0 ? "M" : " L"} ${px} ${py}`;
  }
  const output = lut[255] ?? 255;
  const px = IMAGE_ADJUST_CURVE_PADDING + innerWidth;
  const py = IMAGE_ADJUST_CURVE_PADDING + (1 - output / 255) * innerHeight;
  pathData += ` L ${px} ${py}`;
  return pathData;
}

function replacePathExtension(pathLike: string, nextExtension: string): string {
  const normalizedNextExtension = nextExtension.startsWith(".")
    ? nextExtension
    : `.${nextExtension}`;
  const slashIndex = Math.max(
    pathLike.lastIndexOf("/"),
    pathLike.lastIndexOf("\\"),
  );
  const dotIndex = pathLike.lastIndexOf(".");
  if (dotIndex <= slashIndex) {
    return `${pathLike}${normalizedNextExtension}`;
  }
  return `${pathLike.slice(0, dotIndex)}${normalizedNextExtension}`;
}

export function resolveMediaPathForFooter(
  item:
    | { mediaLocator: ImageItem["mediaLocator"] }
    | { mediaLocator: VideoItem["mediaLocator"] },
): string {
  const locator = item.mediaLocator;
  if (locator.kind === "filesystem") {
    return locator.absolutePath;
  }
  return `${locator.archivePath} :: ${locator.entryName}`;
}

export function resolveConvertedImagePathForFooter(
  image: ImageItem,
  targetFormat: "webp" | "jpeg" | "png" | "avif",
): string {
  const targetExtension = targetFormat === "jpeg" ? ".jpg" : `.${targetFormat}`;
  const locator = image.mediaLocator;
  if (locator.kind === "filesystem") {
    return replacePathExtension(locator.absolutePath, targetExtension);
  }
  const nextEntryName = replacePathExtension(
    locator.entryName,
    targetExtension,
  );
  return `${locator.archivePath} :: ${nextEntryName}`;
}

export function estimateDataUrlSizeKb(
  dataUrl: string | null | undefined,
): number {
  if (!dataUrl || !dataUrl.startsWith("data:")) {
    return 0;
  }
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex <= 0) {
    return 0;
  }
  const metadata = dataUrl.slice(0, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1).replace(/\s/g, "");
  if (metadata.includes(";base64")) {
    const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
    const bytes = Math.max(0, Math.floor((payload.length * 3) / 4) - padding);
    return bytes / 1024;
  }
  try {
    const decoded = decodeURIComponent(payload);
    return new TextEncoder().encode(decoded).byteLength / 1024;
  } catch {
    return payload.length / 1024;
  }
}

export function resolveDataUrlMimeType(
  dataUrl: string | null | undefined,
): string | null {
  if (!dataUrl || !dataUrl.startsWith("data:")) {
    return null;
  }
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex <= 0) {
    return null;
  }
  const metadata = dataUrl.slice(5, commaIndex);
  const semicolonIndex = metadata.indexOf(";");
  const mimeType =
    semicolonIndex >= 0 ? metadata.slice(0, semicolonIndex) : metadata;
  return mimeType.trim().toLowerCase() || null;
}

export function resolveFormatLabelByMimeType(
  mimeType: string | null,
): string | null {
  if (!mimeType) {
    return null;
  }
  if (mimeType === "image/jpeg") {
    return "JPEG";
  }
  if (mimeType === "image/png") {
    return "PNG";
  }
  if (mimeType === "image/webp") {
    return "WEBP";
  }
  if (mimeType === "image/avif") {
    return "AVIF";
  }
  return mimeType.toUpperCase();
}

export function resolveImageConvertTargetSize(
  sourceWidth: number,
  sourceHeight: number,
  scaleFactor: number,
  longestEdgePx: number | null,
): { width: number; height: number } {
  const safeSourceWidth = Math.max(1, Math.round(sourceWidth));
  const safeSourceHeight = Math.max(1, Math.round(sourceHeight));

  if (
    longestEdgePx != null &&
    Number.isFinite(longestEdgePx) &&
    longestEdgePx > 0
  ) {
    const sourceLongestEdge = Math.max(safeSourceWidth, safeSourceHeight);
    const resizeRatio = Math.min(1, longestEdgePx / sourceLongestEdge);
    return {
      width: Math.max(1, Math.round(safeSourceWidth * resizeRatio)),
      height: Math.max(1, Math.round(safeSourceHeight * resizeRatio)),
    };
  }

  const safeScaleFactor = Math.max(0.1, Math.min(1, scaleFactor));
  return {
    width: Math.max(1, Math.round(safeSourceWidth * safeScaleFactor)),
    height: Math.max(1, Math.round(safeSourceHeight * safeScaleFactor)),
  };
}

export function formatImageSizeForFooter(sizeKb: number): string {
  if (!Number.isFinite(sizeKb) || sizeKb <= 0) {
    return "-";
  }
  if (sizeKb >= 1024) {
    return `${(sizeKb / 1024).toFixed(2)}MB`;
  }
  return `${Math.round(sizeKb)}KB`;
}

export function formatVideoSizeForFooter(sizeMb: number): string {
  if (!Number.isFinite(sizeMb) || sizeMb <= 0) {
    return "-";
  }
  return `${Number(sizeMb.toFixed(2))}MB`;
}
