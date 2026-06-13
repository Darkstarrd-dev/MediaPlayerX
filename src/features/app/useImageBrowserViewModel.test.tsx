import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Dispatch, SetStateAction } from "react";

import type { ImageItem, ImagePackage } from "../../types";
import { useImageBrowserViewModel } from "./useImageBrowserViewModel";

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
