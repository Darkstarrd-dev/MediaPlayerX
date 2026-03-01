import { describe, expect, it } from "vitest";

import { resolveMetadataMainDelta } from "./thumbnailGapPolicy";

describe("resolveMetadataMainDelta", () => {
  it("收缩会掉列时优先改为右避让", () => {
    const next = resolveMetadataMainDelta({
      proposedMainDelta: -60,
      rightGap: 60,
      cellSpan: 208,
      maxExpandableMainDelta: 220,
      maxShrinkMainDelta: 80,
      minActionPx: 4,
      expandBufferPx: 2,
      shrinkWouldDropColumns: true,
    });

    expect(next).toBe(150);
  });

  it("收缩会掉列且右避让不可达时保持不动", () => {
    const next = resolveMetadataMainDelta({
      proposedMainDelta: -60,
      rightGap: 60,
      cellSpan: 208,
      maxExpandableMainDelta: 40,
      maxShrinkMainDelta: 80,
      minActionPx: 4,
      expandBufferPx: 2,
      shrinkWouldDropColumns: true,
    });

    expect(next).toBe(0);
  });

  it("扩展不可达时回退到左吸附", () => {
    const next = resolveMetadataMainDelta({
      proposedMainDelta: 132,
      rightGap: 76,
      cellSpan: 208,
      maxExpandableMainDelta: 120,
      maxShrinkMainDelta: 80,
      minActionPx: 4,
      expandBufferPx: 2,
      shrinkWouldDropColumns: false,
    });

    expect(next).toBe(-76);
  });

  it("左吸附受上限约束无法完成时应改为右避让", () => {
    const next = resolveMetadataMainDelta({
      proposedMainDelta: -96,
      rightGap: 96,
      cellSpan: 208,
      maxExpandableMainDelta: 160,
      maxShrinkMainDelta: 48,
      minActionPx: 4,
      expandBufferPx: 2,
      shrinkWouldDropColumns: false,
    });

    expect(next).toBe(114);
  });

  it("左吸附和右避让都不可达时才回弹", () => {
    const next = resolveMetadataMainDelta({
      proposedMainDelta: -96,
      rightGap: 96,
      cellSpan: 208,
      maxExpandableMainDelta: 64,
      maxShrinkMainDelta: 48,
      minActionPx: 4,
      expandBufferPx: 2,
      shrinkWouldDropColumns: false,
    });

    expect(next).toBe(0);
  });

  it("图片高度贴边时强制走右避让", () => {
    const next = resolveMetadataMainDelta({
      proposedMainDelta: -60,
      rightGap: 60,
      cellSpan: 208,
      maxExpandableMainDelta: 220,
      maxShrinkMainDelta: 80,
      minActionPx: 4,
      expandBufferPx: 2,
      shrinkWouldDropColumns: false,
      forceAvoidByImageHeightBound: true,
    });

    expect(next).toBe(150);
  });

  it("图片高度贴边且右避让不可达时保持不动", () => {
    const next = resolveMetadataMainDelta({
      proposedMainDelta: -60,
      rightGap: 60,
      cellSpan: 208,
      maxExpandableMainDelta: 40,
      maxShrinkMainDelta: 80,
      minActionPx: 4,
      expandBufferPx: 2,
      shrinkWouldDropColumns: false,
      forceAvoidByImageHeightBound: true,
    });

    expect(next).toBe(0);
  });
});
