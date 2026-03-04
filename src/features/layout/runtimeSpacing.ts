interface RuntimeSpacingInput {
  viewportWidth: number;
  layoutGapScaleCoeff: number;
  paneInnerGapScaleCoeff: number;
  paneStackGapScaleCoeff: number;
  sidebarInnerGapScaleCoeff: number;
  thumbnailGapScaleCoeff: number;
  buttonGroupInsetScaleCoeff: number;
  paneHeaderHeightScaleCoeff?: number;
  paneFooterHeightScaleCoeff?: number;
}

interface RuntimeSpacingResult {
  layoutGapScaleCoeff: number;
  paneInnerGapScaleCoeff: number;
  paneStackGapScaleCoeff: number;
  sidebarInnerGapScaleCoeff: number;
  thumbnailGapScaleCoeff: number;
  buttonGroupInsetScaleCoeff: number;
  paneHeaderHeightScaleCoeff: number;
  paneFooterHeightScaleCoeff: number;
  layoutGapPx: number;
  paneInnerPaddingPx: number;
  paneStackGapPx: number;
  paneSectionGapPx: number;
  paneRecessedPaddingPx: number;
  sidebarGapPx: number;
  thumbnailGapPx: number;
  buttonGroupInsetPx: number;
  controlGroupGapPx: number;
  metadataEditGridLabelGapPx: number;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveRuntimeViewportWidth(): number {
  if (typeof window === "undefined") {
    return 0;
  }
  return window.innerWidth > 0
    ? window.innerWidth
    : document.documentElement.clientWidth;
}

export function resolveRuntimeSpacing(
  input: RuntimeSpacingInput,
): RuntimeSpacingResult {
  const layoutGapScaleCoeff = clampNumber(input.layoutGapScaleCoeff, 0, 3);
  const paneInnerGapScaleCoeff = clampNumber(
    input.paneInnerGapScaleCoeff,
    0,
    2,
  );
  const paneStackGapScaleCoeff = clampNumber(
    input.paneStackGapScaleCoeff,
    0,
    2,
  );
  const sidebarInnerGapScaleCoeff = clampNumber(
    input.sidebarInnerGapScaleCoeff,
    0,
    2,
  );
  const thumbnailGapScaleCoeff = clampNumber(
    input.thumbnailGapScaleCoeff,
    0,
    2,
  );
  const buttonGroupInsetScaleCoeff = clampNumber(
    input.buttonGroupInsetScaleCoeff,
    0,
    2,
  );
  const paneHeaderHeightScaleCoeff = clampNumber(
    input.paneHeaderHeightScaleCoeff ?? 1,
    0.5,
    2,
  );
  const paneFooterHeightScaleCoeff = clampNumber(
    input.paneFooterHeightScaleCoeff ?? 1,
    0.5,
    2,
  );

  const safeViewportWidth = Math.max(0, input.viewportWidth);
  const baseUnitPx = safeViewportWidth * 0.01;
  const layoutGapPx = Math.max(0, Math.round(baseUnitPx * layoutGapScaleCoeff));
  const paneInnerPaddingPx = Math.max(
    0,
    Math.round(baseUnitPx * paneInnerGapScaleCoeff),
  );
  const paneStackGapPx = Math.max(
    0,
    Math.round(paneInnerPaddingPx * 0.75 * paneStackGapScaleCoeff),
  );
  const paneSectionGapPx = paneStackGapPx;
  const paneRecessedPaddingPx = Math.max(0, Math.round(paneInnerPaddingPx / 3));
  const dBasePx = paneInnerPaddingPx * 0.8;
  const sidebarGapPx = Math.max(
    0,
    Math.round(dBasePx * sidebarInnerGapScaleCoeff),
  );
  const thumbnailGapPx = Math.max(
    0,
    Math.round(dBasePx * thumbnailGapScaleCoeff),
  );
  const buttonGroupInsetPx = Math.max(
    0,
    Math.round(dBasePx * 0.5 * buttonGroupInsetScaleCoeff),
  );
  const controlGroupGapPx = buttonGroupInsetPx;
  const metadataEditGridLabelGapPx = Math.max(
    0,
    Math.round(sidebarGapPx * 0.5),
  );

  return {
    layoutGapScaleCoeff,
    paneInnerGapScaleCoeff,
    paneStackGapScaleCoeff,
    sidebarInnerGapScaleCoeff,
    thumbnailGapScaleCoeff,
    buttonGroupInsetScaleCoeff,
    paneHeaderHeightScaleCoeff,
    paneFooterHeightScaleCoeff,
    layoutGapPx,
    paneInnerPaddingPx,
    paneStackGapPx,
    paneSectionGapPx,
    paneRecessedPaddingPx,
    sidebarGapPx,
    thumbnailGapPx,
    buttonGroupInsetPx,
    controlGroupGapPx,
    metadataEditGridLabelGapPx,
  };
}
