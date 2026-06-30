import { describe, expect, it } from "vitest";

import type { ImagePackage } from "../../types";
import { resolvePreserveImageFocus } from "./useAppInteractionLayer";

function makePackage(overrides: Partial<ImagePackage> = {}): ImagePackage {
  return {
    id: "pkg-1",
    packageName: "pkg-1",
    displayName: "pkg-1",
    absolutePath: "/tmp/pkg-1",
    treePath: [],
    workTitle: "",
    circle: "",
    author: "",
    tags: [],
    images: [],
    imageCount: 0,
    ...overrides,
  };
}

describe("resolvePreserveImageFocus", () => {
  const packageById = new Map<string, ImagePackage>([
    ["pkg-1", makePackage({ id: "pkg-1", imageCount: 100, images: [] })],
    ["pkg-2", makePackage({ id: "pkg-2", imageCount: 50, images: [] })],
  ]);
  const imageSourceNodeIdMap = new Map<string, string>([["pkg-1", "node-1"]]);
  const normalImageSourceNodeIdMap = new Map<string, string>([
    ["pkg-1", "normal-node-1"],
  ]);

  it("当前包存在且焦点合法时返回应保留的 focus 索引", () => {
    const result = resolvePreserveImageFocus({
      selectedPackageId: "pkg-1",
      focusByPackage: { "pkg-1": 17 },
      packageByIdEffective: packageById,
      imageSourceNodeIdMap,
      normalImageSourceNodeIdMap,
      pagedPageSize: 12,
    });

    expect(result.shouldPreserve).toBe(true);
    expect(result.focusIndex).toBe(17);
    expect(result.pageIndex).toBe(1);
    expect(result.sidebarNodeId).toBe("normal-node-1");
  });

  it("当前包不存在时返回不保留", () => {
    const result = resolvePreserveImageFocus({
      selectedPackageId: "missing",
      focusByPackage: { missing: 0 },
      packageByIdEffective: packageById,
      imageSourceNodeIdMap,
      normalImageSourceNodeIdMap,
      pagedPageSize: 12,
    });

    expect(result.shouldPreserve).toBe(false);
  });

  it("当前包 imageCount 为 0 时返回不保留", () => {
    const emptyPackage = new Map<string, ImagePackage>([
      ["empty", makePackage({ id: "empty", imageCount: 0 })],
    ]);
    const result = resolvePreserveImageFocus({
      selectedPackageId: "empty",
      focusByPackage: { empty: 0 },
      packageByIdEffective: emptyPackage,
      imageSourceNodeIdMap,
      normalImageSourceNodeIdMap,
      pagedPageSize: 12,
    });

    expect(result.shouldPreserve).toBe(false);
  });

  it("focusByPackage 中没有当前包记录时返回不保留", () => {
    const result = resolvePreserveImageFocus({
      selectedPackageId: "pkg-1",
      focusByPackage: { "pkg-2": 5 },
      packageByIdEffective: packageById,
      imageSourceNodeIdMap,
      normalImageSourceNodeIdMap,
      pagedPageSize: 12,
    });

    expect(result.shouldPreserve).toBe(false);
  });

  it("焦点为负数时返回不保留", () => {
    const result = resolvePreserveImageFocus({
      selectedPackageId: "pkg-1",
      focusByPackage: { "pkg-1": -1 },
      packageByIdEffective: packageById,
      imageSourceNodeIdMap,
      normalImageSourceNodeIdMap,
      pagedPageSize: 12,
    });

    expect(result.shouldPreserve).toBe(false);
  });

  it("焦点越界时 clamp 到最大索引", () => {
    const result = resolvePreserveImageFocus({
      selectedPackageId: "pkg-1",
      focusByPackage: { "pkg-1": 9999 },
      packageByIdEffective: packageById,
      imageSourceNodeIdMap,
      normalImageSourceNodeIdMap,
      pagedPageSize: 12,
    });

    expect(result.shouldPreserve).toBe(true);
    expect(result.focusIndex).toBe(99);
    expect(result.pageIndex).toBe(8);
  });

  it("normalImageSourceNodeIdMap 缺失时回退到 imageSourceNodeIdMap", () => {
    const result = resolvePreserveImageFocus({
      selectedPackageId: "pkg-1",
      focusByPackage: { "pkg-1": 5 },
      packageByIdEffective: packageById,
      imageSourceNodeIdMap,
      normalImageSourceNodeIdMap: new Map(),
      pagedPageSize: 12,
    });

    expect(result.shouldPreserve).toBe(true);
    expect(result.sidebarNodeId).toBe("node-1");
  });

  it("pagedPageSize 为 0 时不抛错（回退为 1 即 focusIndex 本身）", () => {
    const result = resolvePreserveImageFocus({
      selectedPackageId: "pkg-1",
      focusByPackage: { "pkg-1": 3 },
      packageByIdEffective: packageById,
      imageSourceNodeIdMap,
      normalImageSourceNodeIdMap,
      pagedPageSize: 0,
    });

    expect(result.shouldPreserve).toBe(true);
    // pagedPageSize=0 时被 Math.max(1, 0) 收敛为 1，pageIndex 等于 focusIndex。
    expect(result.pageIndex).toBe(3);
  });
});
