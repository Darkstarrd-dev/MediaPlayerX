import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Dispatch, SetStateAction } from "react";

import type { ImageItem, ImagePackage } from "../../types";
import {
  resolveFocusableImageRef,
  useImageBrowserViewModel,
} from "./useImageBrowserViewModel";

function createImage(packageId: string, ordinal: number): ImageItem {
  return {
    id: `${packageId}-img-${ordinal}`,
    ordinal,
    width: 1200,
    height: 800,
    sizeKb: 512,
    cluster: 0,
    color: "#223344",
    mediaLocator: {
      kind: "filesystem",
      absolutePath: `D:/images/${packageId}/${ordinal}.jpg`,
      extension: ".jpg",
      mediaType: "image",
      mimeType: "image/jpeg",
    },
  };
}

function createPackage(packageId: string, imageCount: number): ImagePackage {
  return {
    id: packageId,
    packageName: packageId,
    displayName: packageId,
    absolutePath: `D:/images/${packageId}`,
    treePath: ["D:", "images", packageId],
    workTitle: packageId,
    circle: "circle",
    author: "author",
    tags: [],
    images: Array.from({ length: imageCount }, (_, index) =>
      createImage(packageId, index + 1),
    ),
  };
}

function applyStateUpdater<T>(
  updater: React.SetStateAction<T>,
  previous: T,
): T {
  if (typeof updater === "function") {
    return (updater as (prevState: T) => T)(previous);
  }
  return updater;
}

function asMock<T extends (...args: never[]) => unknown>(value: T) {
  return value as unknown as ReturnType<typeof vi.fn>;
}

function expectSelectedPackage(
  params: Parameters<typeof useImageBrowserViewModel>[0],
  expectedId: string,
) {
  const mock = asMock(
    params.setSelectedPackageId as Dispatch<SetStateAction<string>>,
  );
  expect(mock).toHaveBeenCalledWith(expectedId);
}

function readFocusUpdate(
  params: Parameters<typeof useImageBrowserViewModel>[0],
): Record<string, number> {
  const mock = asMock(
    params.setFocusByPackage as Dispatch<
      SetStateAction<Record<string, number>>
    >,
  );
  const updater = mock.mock.calls[0]?.[0];
  return applyStateUpdater(updater, {});
}

function createParams(
  overrides: Partial<Parameters<typeof useImageBrowserViewModel>[0]> = {},
): Parameters<typeof useImageBrowserViewModel>[0] {
  const pkg = createPackage("pkg-1", 3);

  return {
    mode: "video",
    selectedPackageId: pkg.id,
    setSelectedPackageId: vi.fn(),
    imageFocusActive: true,
    setImageFocusActive: vi.fn(),
    focusByPackage: { [pkg.id]: 0 },
    setFocusByPackage: vi.fn(),
    pageByPackage: { [pkg.id]: 0 },
    setPageByPackage: vi.fn(),
    vectorSearchResults: [],
    vectorFocusIndex: 0,
    setVectorFocusIndex: vi.fn(),
    vectorPage: 0,
    setVectorPage: vi.fn(),
    gradeByPackage: {},
    setGradeByPackage: vi.fn(),
    packageById: new Map([[pkg.id, pkg]]),
    orderedRootScopedPackages: [pkg],
    vectorResultsActive: false,
    showNamesOnly: false,
    thumbnailColumns: 4,
    pagedPageSize: 40,
    fullscreenActive: true,
    fullscreenDisplay: "dual",
    fullscreenVideoFocus: true,
    ...overrides,
  };
}

describe("autoplay-regression/image-browser-view-model", () => {
  it("dual + video focus 时，autoplay 来源仍可推进图片焦点", () => {
    const params = createParams();
    const { result } = renderHook(() => useImageBrowserViewModel(params));

    act(() => {
      result.current.moveImage(1, "autoplay");
    });

    const setFocusByPackageMock = asMock(
      params.setFocusByPackage as Dispatch<
        SetStateAction<Record<string, number>>
      >,
    );
    expect(setFocusByPackageMock).toHaveBeenCalledTimes(1);
    const updater = setFocusByPackageMock.mock.calls[0]?.[0];
    const nextFocus = applyStateUpdater(updater, { "pkg-1": 0 });
    expect(nextFocus["pkg-1"]).toBe(1);
  });

  it("dual + video focus 时，manual 来源仍遵循焦点限制不推进", () => {
    const params = createParams();
    const { result } = renderHook(() => useImageBrowserViewModel(params));

    act(() => {
      result.current.moveImage(1);
    });

    const setFocusByPackageMock = asMock(
      params.setFocusByPackage as Dispatch<
        SetStateAction<Record<string, number>>
      >,
    );
    const setPageByPackageMock = asMock(
      params.setPageByPackage as Dispatch<
        SetStateAction<Record<string, number>>
      >,
    );
    expect(setFocusByPackageMock).not.toHaveBeenCalled();
    expect(setPageByPackageMock).not.toHaveBeenCalled();
  });
});

describe("fullscreen-cross-package/image-browser-view-model", () => {
  const pkg1 = createPackage("pkg-1", 3);
  const pkg2 = createPackage("pkg-2", 2);
  const multiPackageById = new Map<string, ImagePackage>([
    [pkg1.id, pkg1],
    [pkg2.id, pkg2],
  ]);

  function crossParams(
    overrides: Partial<Parameters<typeof useImageBrowserViewModel>[0]> = {},
  ) {
    return createParams({
      mode: "image",
      fullscreenActive: true,
      fullscreenDisplay: "image-only",
      fullscreenVideoFocus: false,
      packageById: multiPackageById,
      orderedRootScopedPackages: [pkg1, pkg2],
      ...overrides,
    });
  }

  function expectSelectedPackage(
    params: Parameters<typeof useImageBrowserViewModel>[0],
    expectedId: string,
  ) {
    const mock = asMock(
      params.setSelectedPackageId as Dispatch<SetStateAction<string>>,
    );
    expect(mock).toHaveBeenCalledWith(expectedId);
  }

  function readFocusUpdate(
    params: Parameters<typeof useImageBrowserViewModel>[0],
  ): Record<string, number> {
    const mock = asMock(
      params.setFocusByPackage as Dispatch<
        SetStateAction<Record<string, number>>
      >,
    );
    const updater = mock.mock.calls[0]?.[0];
    return applyStateUpdater(updater, {});
  }

  it("浏览到当前包末尾，manual 翻页跳到下一个包第一张（按 sidebar 顺序）", () => {
    const params = crossParams({
      selectedPackageId: "pkg-1",
      focusByPackage: { "pkg-1": 2 },
    });
    const { result } = renderHook(() => useImageBrowserViewModel(params));

    act(() => {
      result.current.moveImage(1);
    });

    expectSelectedPackage(params, "pkg-2");
    expect(readFocusUpdate(params)["pkg-2"]).toBe(0);
  });

  it("autoplay 翻到包末尾同样跳到下一个包第一张（修复 autoplay 停止）", () => {
    const params = crossParams({
      selectedPackageId: "pkg-1",
      focusByPackage: { "pkg-1": 2 },
    });
    const { result } = renderHook(() => useImageBrowserViewModel(params));

    act(() => {
      result.current.moveImage(1, "autoplay");
    });

    expectSelectedPackage(params, "pkg-2");
    expect(readFocusUpdate(params)["pkg-2"]).toBe(0);
  });

  it("在下一个包首张向前翻，跳到上一个包最后一张", () => {
    const params = crossParams({
      selectedPackageId: "pkg-2",
      focusByPackage: { "pkg-2": 0 },
    });
    const { result } = renderHook(() => useImageBrowserViewModel(params));

    act(() => {
      result.current.moveImage(-1);
    });

    expectSelectedPackage(params, "pkg-1");
    expect(readFocusUpdate(params)["pkg-1"]).toBe(2);
  });

  it("全库末尾：最后一个包末张继续向后翻，停在末张", () => {
    const params = crossParams({
      selectedPackageId: "pkg-2",
      focusByPackage: { "pkg-2": 1 },
    });
    const { result } = renderHook(() => useImageBrowserViewModel(params));

    act(() => {
      result.current.moveImage(1);
    });

    expectSelectedPackage(params, "pkg-2");
    expect(readFocusUpdate(params)["pkg-2"]).toBe(1);
  });

  it("全库开头：第一个包首张继续向前翻，停在首张", () => {
    const params = crossParams({
      selectedPackageId: "pkg-1",
      focusByPackage: { "pkg-1": 0 },
    });
    const { result } = renderHook(() => useImageBrowserViewModel(params));

    act(() => {
      result.current.moveImage(-1);
    });

    expectSelectedPackage(params, "pkg-1");
    expect(readFocusUpdate(params)["pkg-1"]).toBe(0);
  });
});

describe("resolveFocusableImageRef/backspace-soft-remove", () => {
  const pkg1 = createPackage("pkg-1", 3);
  const pkg2 = createPackage("pkg-2", 2);
  const packages = [pkg1, pkg2];

  function imageIdOf(packageId: string, ordinalOneBased: number): string {
    return `${packageId}-img-${ordinalOneBased}`;
  }

  it("向前跳过被软删的相邻单张图", () => {
    // 起点在 pkg-1#0，pkg-1#1 被删 → 应回到 pkg-1#2
    const removed = new Set([imageIdOf("pkg-1", 2)]);
    const next = resolveFocusableImageRef(packages, "pkg-1", 0, 1, removed);
    expect(next).toEqual({ packageId: "pkg-1", imageIndex: 2 });
  });

  it("向前连续跳过多张被软删图，并跨包", () => {
    // 起点在 pkg-1#0，pkg-1#1、pkg-1#2、pkg-2#0 全被删 → 应回到 pkg-2#1
    const removed = new Set([
      imageIdOf("pkg-1", 2),
      imageIdOf("pkg-1", 3),
      imageIdOf("pkg-2", 1),
    ]);
    const next = resolveFocusableImageRef(packages, "pkg-1", 0, 1, removed);
    expect(next).toEqual({ packageId: "pkg-2", imageIndex: 1 });
  });

  it("向后跳过被软删图并跨包回退", () => {
    // 起点在 pkg-2#1，pkg-2#0、pkg-1#2 全被删 → 应回到 pkg-1#1
    const removed = new Set([imageIdOf("pkg-2", 1), imageIdOf("pkg-1", 3)]);
    const next = resolveFocusableImageRef(packages, "pkg-2", 1, -1, removed);
    expect(next).toEqual({ packageId: "pkg-1", imageIndex: 1 });
  });

  it("向后越界无更多可聚焦位时返回 null", () => {
    // 起点在 pkg-1#0，向前无图
    const next = resolveFocusableImageRef(packages, "pkg-1", 0, -1, new Set());
    expect(next).toBeNull();
  });

  it("全库都被软删时返回 null", () => {
    const removed = new Set([
      imageIdOf("pkg-1", 1),
      imageIdOf("pkg-1", 2),
      imageIdOf("pkg-1", 3),
      imageIdOf("pkg-2", 1),
      imageIdOf("pkg-2", 2),
    ]);
    const next = resolveFocusableImageRef(packages, "pkg-1", 0, 1, removed);
    expect(next).toBeNull();
  });

  it("空集合时落在紧邻的下一张（与既有 moveImage 行为一致）", () => {
    const next = resolveFocusableImageRef(packages, "pkg-1", 0, 1, new Set());
    expect(next).toEqual({ packageId: "pkg-1", imageIndex: 1 });
  });

  it("集合为空时 moveImage 走既有逻辑（向前跳到下一张，无跳过）", () => {
    const params = createParams({
      mode: "image",
      fullscreenActive: true,
      fullscreenDisplay: "image-only",
      fullscreenVideoFocus: false,
    });
    const { result } = renderHook(() => useImageBrowserViewModel(params));

    act(() => {
      result.current.moveImage(1);
    });

    expect(readFocusUpdate(params)["pkg-1"]).toBe(1);
  });

  it("Backspace 标记当前图后，moveImage(+1) 跳过被标记图", () => {
    // pkg-1 有 3 张：img-1(idx0)/img-2(idx1)/img-3(idx2)。
    // 标记 idx1（img-2）→ 从 idx0 moveImage(+1) 跳过 idx1 → idx2
    const params = createParams({
      mode: "image",
      fullscreenActive: true,
      fullscreenDisplay: "image-only",
      fullscreenVideoFocus: false,
      selectedPackageId: "pkg-1",
      focusByPackage: { "pkg-1": 0 },
    });
    const { result } = renderHook(() => useImageBrowserViewModel(params));

    act(() => {
      result.current.markImageRemoved(imageIdOf("pkg-1", 2));
    });
    act(() => {
      result.current.moveImage(1);
    });

    // 从 idx0 向前，idx1 被删 → 跳到 idx2
    expect(readFocusUpdate(params)["pkg-1"]).toBe(2);
  });

  it("Backspace 标记后回翻不再命中被软删的图（跨包回退）", () => {
    const multiPackageById = new Map<string, ImagePackage>([
      [pkg1.id, pkg1],
      [pkg2.id, pkg2],
    ]);
    const params = createParams({
      mode: "image",
      fullscreenActive: true,
      fullscreenDisplay: "image-only",
      fullscreenVideoFocus: false,
      packageById: multiPackageById,
      orderedRootScopedPackages: [pkg1, pkg2],
      selectedPackageId: "pkg-2",
      focusByPackage: { "pkg-2": 0 },
    });
    const { result } = renderHook(() => useImageBrowserViewModel(params));

    // 软删 pkg-1#3（pkg-1 末张）与 pkg-2#1（pkg-2 末张）
    act(() => {
      result.current.markImageRemoved(imageIdOf("pkg-1", 3));
      result.current.markImageRemoved(imageIdOf("pkg-2", 2));
    });
    // 从 pkg-2#0 向后翻：pkg-1#2 应是落点（pkg-1#3 被删，跳过）
    act(() => {
      result.current.moveImage(-1);
    });

    expectSelectedPackage(params, "pkg-1");
    expect(readFocusUpdate(params)["pkg-1"]).toBe(1);
  });

  it("clearImageRemovalMarks 清空后 moveImage 恢复既有行为", () => {
    const params = createParams({
      mode: "image",
      fullscreenActive: true,
      fullscreenDisplay: "image-only",
      fullscreenVideoFocus: false,
      selectedPackageId: "pkg-1",
      focusByPackage: { "pkg-1": 0 },
    });
    const { result } = renderHook(() => useImageBrowserViewModel(params));

    act(() => {
      result.current.markImageRemoved(imageIdOf("pkg-1", 1));
    });
    act(() => {
      result.current.clearImageRemovalMarks();
    });
    act(() => {
      result.current.moveImage(1);
    });

    // 清空后不再跳过 idx1
    expect(readFocusUpdate(params)["pkg-1"]).toBe(1);
  });

  it("removedImageIds 反映当前标记集合", () => {
    const params = createParams({
      mode: "image",
      fullscreenActive: true,
      fullscreenDisplay: "image-only",
      fullscreenVideoFocus: false,
    });
    const { result } = renderHook(() => useImageBrowserViewModel(params));

    act(() => {
      result.current.markImageRemoved("img-a");
      result.current.markImageRemoved("img-b");
    });
    expect(result.current.removedImageIds().sort()).toEqual(["img-a", "img-b"]);

    act(() => {
      result.current.clearImageRemovalMarks();
    });
    expect(result.current.removedImageIds()).toEqual([]);
  });
});
