import { describe, expect, it } from "vitest";

import { resolveRuntimeSpacing } from "./runtimeSpacing";

describe("resolveRuntimeSpacing", () => {
  it("按 A/B/C/D/E 公式输出整数像素", () => {
    const spacing = resolveRuntimeSpacing({
      viewportWidth: 1200,
      layoutGapScaleCoeff: 1,
      paneInnerGapScaleCoeff: 1,
      paneStackGapScaleCoeff: 1,
      sidebarInnerGapScaleCoeff: 1,
      thumbnailGapScaleCoeff: 1,
      buttonGroupInsetScaleCoeff: 1,
      paneHeaderHeightScaleCoeff: 1,
      paneFooterHeightScaleCoeff: 1,
    });

    // A = 12, B2 = 12, C = round(12 * 0.75) = 9
    expect(spacing.layoutGapPx).toBe(12);
    expect(spacing.paneInnerPaddingPx).toBe(12);
    expect(spacing.paneStackGapPx).toBe(9);

    // D = round(12 * 0.8) = 10
    expect(spacing.sidebarGapPx).toBe(10);
    expect(spacing.thumbnailGapPx).toBe(10);

    // D1.2 = round(10 * 0.5) = 5, E = round((12 * 0.8 * 0.5) * 1) = 5
    expect(spacing.metadataEditGridLabelGapPx).toBe(5);
    expect(spacing.buttonGroupInsetPx).toBe(5);
    expect(spacing.controlGroupGapPx).toBe(5);
  });

  it("缩略图间距系数独立于 Sidebar 系数", () => {
    const spacing = resolveRuntimeSpacing({
      viewportWidth: 1600,
      layoutGapScaleCoeff: 1,
      paneInnerGapScaleCoeff: 1,
      paneStackGapScaleCoeff: 1,
      sidebarInnerGapScaleCoeff: 0.5,
      thumbnailGapScaleCoeff: 1.5,
      buttonGroupInsetScaleCoeff: 1,
      paneHeaderHeightScaleCoeff: 1,
      paneFooterHeightScaleCoeff: 1,
    });

    // B2 = 16, D-base = 12.8
    expect(spacing.sidebarGapPx).toBe(Math.round(12.8 * 0.5));
    expect(spacing.thumbnailGapPx).toBe(Math.round(12.8 * 1.5));
  });

  it("超范围系数会被裁剪", () => {
    const spacing = resolveRuntimeSpacing({
      viewportWidth: 1000,
      layoutGapScaleCoeff: 5,
      paneInnerGapScaleCoeff: 3,
      paneStackGapScaleCoeff: -1,
      sidebarInnerGapScaleCoeff: 3,
      thumbnailGapScaleCoeff: -1,
      buttonGroupInsetScaleCoeff: 3,
      paneHeaderHeightScaleCoeff: 3,
      paneFooterHeightScaleCoeff: 0,
    });

    expect(spacing.layoutGapScaleCoeff).toBe(3);
    expect(spacing.paneInnerGapScaleCoeff).toBe(2);
    expect(spacing.paneStackGapScaleCoeff).toBe(0);
    expect(spacing.sidebarInnerGapScaleCoeff).toBe(2);
    expect(spacing.thumbnailGapScaleCoeff).toBe(0);
    expect(spacing.buttonGroupInsetScaleCoeff).toBe(2);
    expect(spacing.paneHeaderHeightScaleCoeff).toBe(2);
    expect(spacing.paneFooterHeightScaleCoeff).toBe(0.5);
  });
});
