import { describe, expect, it } from "vitest";

import { isMetadataImageHeightBoundByMetrics } from "./metadataImageBound";

describe("isMetadataImageHeightBoundByMetrics", () => {
  it("图片高度达到容器内容高度时应判定为贴边", () => {
    const next = isMetadataImageHeightBoundByMetrics({
      imageHeight: 498,
      canvasHeight: 520,
      canvasPaddingTop: 10,
      canvasPaddingBottom: 10,
      epsilonPx: 2,
    });

    expect(next).toBe(true);
  });

  it("图片高度低于容器内容高度且超过容差时不应判定贴边", () => {
    const next = isMetadataImageHeightBoundByMetrics({
      imageHeight: 494,
      canvasHeight: 520,
      canvasPaddingTop: 10,
      canvasPaddingBottom: 10,
      epsilonPx: 2,
    });

    expect(next).toBe(false);
  });

  it("容器高度或图片高度无效时返回 false", () => {
    const next = isMetadataImageHeightBoundByMetrics({
      imageHeight: 0,
      canvasHeight: 520,
      canvasPaddingTop: 10,
      canvasPaddingBottom: 10,
      epsilonPx: 2,
    });

    expect(next).toBe(false);
  });
});
