import { describe, expect, it } from "vitest";

import {
  computeRenderGap,
  computeThumbnailGridLayout,
  THUMBNAIL_LEVEL_COUNT,
} from "./thumbnailLayout";

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pickInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

describe("computeThumbnailGridLayout", () => {
  it("zoomLevel 直接等于输出 rows（无退化时）", () => {
    for (let level = 1; level <= THUMBNAIL_LEVEL_COUNT; level += 1) {
      const layout = computeThumbnailGridLayout({
        gridWidth: 960,
        gridHeight: 800,
        thumbnailWidth: 420,
        thumbnailGap: 8,
        zoomLevel: level,
      });
      expect(layout.rows).toBe(level);
      expect(layout.zoomLevel).toBe(level);
    }
  });

  it("相同 (gridHeight, gap, chrome, zoomLevel) → 相同 cellSize，不论 gridWidth", () => {
    const widths = [400, 800, 1200, 1600];
    const cellSizes = new Set<number>();

    for (const w of widths) {
      const layout = computeThumbnailGridLayout({
        gridWidth: w,
        gridHeight: 600,
        thumbnailWidth: 420,
        thumbnailGap: 8,
        zoomLevel: 4,
        cardChrome: 12,
      });
      cellSizes.add(layout.cellWidth);
    }

    expect(cellSizes.size).toBe(1);
  });

  it("thumbnailWidth 变化不影响布局输出", () => {
    const base = computeThumbnailGridLayout({
      gridWidth: 960,
      gridHeight: 600,
      thumbnailWidth: 200,
      thumbnailGap: 8,
      zoomLevel: 4,
    });
    const varied = computeThumbnailGridLayout({
      gridWidth: 960,
      gridHeight: 600,
      thumbnailWidth: 1200,
      thumbnailGap: 8,
      zoomLevel: 4,
    });

    expect(base.columns).toBe(varied.columns);
    expect(base.rows).toBe(varied.rows);
    expect(base.cellWidth).toBe(varied.cellWidth);
    expect(base.mediaHeight).toBe(varied.mediaHeight);
    expect(base.idealGridWidth).toBe(varied.idealGridWidth);
    expect(base.idealGridHeight).toBe(varied.idealGridHeight);
  });

  it("idealGridWidth ≤ gridWidth 不变式（多组参数 + 7 级缩放）", () => {
    const scenarios = [
      { gridWidth: 500, gridHeight: 600, thumbnailWidth: 420, thumbnailGap: 8 },
      { gridWidth: 501, gridHeight: 333, thumbnailWidth: 320, thumbnailGap: 8 },
      {
        gridWidth: 920,
        gridHeight: 540,
        thumbnailWidth: 1200,
        thumbnailGap: 10,
      },
      {
        gridWidth: 1366,
        gridHeight: 768,
        thumbnailWidth: 640,
        thumbnailGap: 6,
      },
      { gridWidth: 278, gridHeight: 719, thumbnailWidth: 280, thumbnailGap: 7 },
    ];

    for (const scenario of scenarios) {
      for (
        let zoomLevel = 1;
        zoomLevel <= THUMBNAIL_LEVEL_COUNT;
        zoomLevel += 1
      ) {
        const layout = computeThumbnailGridLayout({
          ...scenario,
          zoomLevel,
        });

        expect(layout.idealGridWidth).toBeLessThanOrEqual(
          Math.floor(scenario.gridWidth),
        );
      }
    }
  });

  it("行数退化场景（极矮容器）", () => {
    // 容器高度 60px，zoomLevel=7 无法满足 MIN_DIM=36，行数应退化
    const layout = computeThumbnailGridLayout({
      gridWidth: 960,
      gridHeight: 60,
      thumbnailWidth: 420,
      thumbnailGap: 8,
      zoomLevel: 7,
    });

    expect(layout.rows).toBeLessThan(7);
    expect(layout.rows).toBeGreaterThanOrEqual(1);
    expect(layout.mediaHeight).toBeGreaterThanOrEqual(36);
  });

  it("退化后 rows 仍等于输出 zoomLevel", () => {
    const layout = computeThumbnailGridLayout({
      gridWidth: 960,
      gridHeight: 60,
      thumbnailWidth: 420,
      thumbnailGap: 8,
      zoomLevel: 7,
    });

    expect(layout.zoomLevel).toBe(layout.rows);
  });

  it("关键像素输出均为整数", () => {
    for (
      let zoomLevel = 1;
      zoomLevel <= THUMBNAIL_LEVEL_COUNT;
      zoomLevel += 1
    ) {
      const layout = computeThumbnailGridLayout({
        gridWidth: 987,
        gridHeight: 654,
        thumbnailWidth: 733,
        thumbnailGap: 9,
        zoomLevel,
      });

      expect(Number.isInteger(layout.cellWidth)).toBe(true);
      expect(Number.isInteger(layout.mediaHeight)).toBe(true);
      expect(Number.isInteger(layout.idealGridWidth)).toBe(true);
      expect(Number.isInteger(layout.idealGridHeight)).toBe(true);
      expect(Number.isInteger(layout.zoomValue)).toBe(true);
    }
  });

  it("极窄容器 50x50 不崩溃且不溢出", () => {
    const layout = computeThumbnailGridLayout({
      gridWidth: 50,
      gridHeight: 50,
      thumbnailWidth: 256,
      thumbnailGap: 8,
      zoomLevel: 4,
    });

    expect(layout.columns).toBeGreaterThanOrEqual(1);
    expect(layout.rows).toBeGreaterThanOrEqual(1);
    expect(layout.pageSize).toBeGreaterThanOrEqual(1);
    expect(layout.idealGridWidth).toBeLessThanOrEqual(50);
  });

  it("neobrutalism 风格 cardChrome=14 时不溢出", () => {
    for (
      let zoomLevel = 1;
      zoomLevel <= THUMBNAIL_LEVEL_COUNT;
      zoomLevel += 1
    ) {
      const layout = computeThumbnailGridLayout({
        gridWidth: 840,
        gridHeight: 610,
        thumbnailWidth: 512,
        thumbnailGap: 8,
        zoomLevel,
        cardChrome: 14,
      });

      expect(layout.idealGridWidth).toBeLessThanOrEqual(840);
    }
  });

  it("幂等性：相同输入产生相同输出", () => {
    const params = {
      gridWidth: 960,
      gridHeight: 540,
      thumbnailWidth: 420,
      thumbnailGap: 8,
      zoomLevel: 4,
      cardChrome: 12,
    };

    const a = computeThumbnailGridLayout(params);
    const b = computeThumbnailGridLayout(params);

    expect(a).toEqual(b);
  });

  it("容器为空时返回安全 fallback", () => {
    const layout = computeThumbnailGridLayout({
      gridWidth: 0,
      gridHeight: 0,
      thumbnailWidth: 420,
      thumbnailGap: 8,
      zoomLevel: 4,
    });

    expect(layout.columns).toBe(1);
    expect(layout.rows).toBe(1);
    expect(layout.pageSize).toBe(1);
    expect(layout.mediaHeight).toBeGreaterThanOrEqual(36);
  });

  it("zoomLevelCount 始终为 7", () => {
    const layout = computeThumbnailGridLayout({
      gridWidth: 960,
      gridHeight: 540,
      thumbnailWidth: 420,
      thumbnailGap: 8,
      zoomLevel: 4,
    });

    expect(layout.zoomLevelCount).toBe(7);
  });

  it("随机参数扫描 500 组均满足无溢出不变式", () => {
    const rng = createSeededRandom(20260222);

    for (let i = 0; i < 500; i += 1) {
      const gridHeight = pickInt(rng, 50, 1600);
      const thumbnailWidth = pickInt(rng, 128, 2048);
      const thumbnailGap = pickInt(rng, 0, 24);
      const zoomLevel = pickInt(rng, 1, THUMBNAIL_LEVEL_COUNT);
      const cardChrome = pickInt(rng, 0, 24);
      const minGridWidth = 36 + cardChrome;
      const gridWidth = pickInt(rng, minGridWidth, 2600);

      const layout = computeThumbnailGridLayout({
        gridWidth,
        gridHeight,
        thumbnailWidth,
        thumbnailGap,
        zoomLevel,
        cardChrome,
      });

      expect(layout.idealGridWidth).toBeLessThanOrEqual(gridWidth);
    }
  });
});

describe("computeRenderGap", () => {
  it("单列时返回 baseGap", () => {
    const renderGap = computeRenderGap({
      gridWidth: 800,
      columns: 1,
      cellWidth: 320,
      baseGap: 8,
    });

    expect(renderGap).toBe(8);
  });

  it("多列时优先吸收右侧 epsilon", () => {
    const params = {
      gridWidth: 1003,
      columns: 4,
      cellWidth: 244,
      baseGap: 8,
    };
    const renderGap = computeRenderGap(params);
    const renderWidth =
      params.columns * params.cellWidth + (params.columns - 1) * renderGap;

    expect(renderGap).toBeGreaterThanOrEqual(params.baseGap);
    expect(renderWidth).toBeCloseTo(params.gridWidth, 6);
  });

  it("epsilon 过大时回退到 baseGap，避免 gap 暴增", () => {
    const renderGap = computeRenderGap({
      gridWidth: 700,
      columns: 4,
      cellWidth: 150,
      baseGap: 8,
    });

    expect(renderGap).toBe(8);
  });

  it("gridWidth 小于列宽总和时回退到 baseGap", () => {
    const renderGap = computeRenderGap({
      gridWidth: 700,
      columns: 3,
      cellWidth: 240,
      baseGap: 8,
    });

    expect(renderGap).toBe(8);
  });
});
