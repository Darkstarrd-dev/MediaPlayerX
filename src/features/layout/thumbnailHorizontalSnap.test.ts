import { describe, expect, it } from "vitest";

import {
  calcIdealWidthByCols,
  resolveSnapTargetColumns,
  type GridSnapAnchor,
  type HorizontalResizeCommitContext,
} from "./thumbnailHorizontalSnap";

function resolve(
  anchor: GridSnapAnchor,
  commit: HorizontalResizeCommitContext,
): number {
  return resolveSnapTargetColumns({ anchor, commit });
}

describe("resolveSnapTargetColumns", () => {
  const anchor: GridSnapAnchor = {
    columns: 3,
    cellWidth: 200,
    gap: 8,
  };

  it("收窄方向超过半格阈值时减列", () => {
    const next = resolve(anchor, {
      source: "sidebar",
      deltaX: 120,
      commitId: 1,
    });
    expect(next).toBe(2);
  });

  it("扩宽方向超过半格阈值时加列", () => {
    const next = resolve(anchor, {
      source: "sidebar",
      deltaX: -120,
      commitId: 1,
    });
    expect(next).toBe(4);
  });

  it("metadata 拖动方向映射正确（左拖收窄，右拖扩宽）", () => {
    const shrink = resolve(anchor, {
      source: "metadata",
      deltaX: -120,
      commitId: 1,
    });
    const expand = resolve(anchor, {
      source: "metadata",
      deltaX: 120,
      commitId: 2,
    });
    expect(shrink).toBe(2);
    expect(expand).toBe(4);
  });

  it("未超过半格阈值保持原列数", () => {
    const next = resolve(anchor, {
      source: "sidebar",
      deltaX: 95,
      commitId: 1,
    });
    expect(next).toBe(3);
  });

  it("一次大幅拖动可跨多列", () => {
    const next = resolve(anchor, {
      source: "sidebar",
      deltaX: -340,
      commitId: 1,
    });
    expect(next).toBe(5);
  });

  it("列数最小为 1", () => {
    const next = resolve(anchor, {
      source: "sidebar",
      deltaX: 2000,
      commitId: 1,
    });
    expect(next).toBe(1);
  });
});

describe("calcIdealWidthByCols", () => {
  it("按列数计算目标宽度", () => {
    expect(calcIdealWidthByCols(3, 200, 8)).toBe(616);
  });
});
