import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { SidebarNode } from "../../types";
import { useImageSidebarBaseState } from "./useImageSidebarBaseState";

function makeRootNode(pathKey: string): SidebarNode {
  return {
    id: `folder:${pathKey}`,
    label: pathKey,
    kind: "folder",
    children: [],
    pathKey,
  };
}

function makePackageNode(pathKey: string, sourceId: string): SidebarNode {
  return {
    id: `package:${pathKey}`,
    label: pathKey.split("/").pop() ?? pathKey,
    kind: "package",
    pathKey,
    imageNodeType: "package",
    packageId: sourceId,
    imageSourceId: sourceId,
    directImageCount: 1,
    children: [],
  };
}

describe("useImageSidebarBaseState", () => {
  it("moves CD Booklet root to the end", () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        ...makeRootNode("CD Booklet"),
        imageNodeType: "folder",
        children: [makePackageNode("CD Booklet/pkg-cd", "pkg-cd")],
      },
      {
        ...makeRootNode("D:"),
        imageNodeType: "folder",
        children: [makePackageNode("D:/pkg-d", "pkg-d")],
      },
      {
        ...makeRootNode("X:"),
        imageNodeType: "folder",
        children: [makePackageNode("X:/pkg-x", "pkg-x")],
      },
    ];

    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode: null,
      }),
    );

    expect(
      result.current.imageTreeForSidebarNormal.map((node) => node.pathKey),
    ).toEqual(["D:/pkg-d", "X:/pkg-x", "CD Booklet/pkg-cd"]);
  });

  it("压缩根路径后仍将 CD Booklet 分支放到末尾", () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        id: "folder:CD Booklet",
        label: "CD Booklet",
        kind: "folder",
        pathKey: "CD Booklet",
        imageNodeType: "folder",
        children: [
          {
            id: "folder:CD Booklet/Vol.1",
            label: "Vol.1",
            kind: "folder",
            pathKey: "CD Booklet/Vol.1",
            imageNodeType: "folder",
            children: [
              {
                id: "package:CD Booklet/Vol.1/pkg-a",
                label: "pkg-a",
                kind: "package",
                pathKey: "CD Booklet/Vol.1/pkg-a",
                imageNodeType: "package",
                packageId: "pkg-a",
                imageSourceId: "pkg-a",
                directImageCount: 1,
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: "folder:D:",
        label: "D:",
        kind: "folder",
        pathKey: "D:",
        imageNodeType: "folder",
        children: [
          {
            id: "folder:D:/Gallery",
            label: "Gallery",
            kind: "folder",
            pathKey: "D:/Gallery",
            imageNodeType: "folder",
            children: [
              {
                id: "package:D:/Gallery/pkg-b",
                label: "pkg-b",
                kind: "package",
                pathKey: "D:/Gallery/pkg-b",
                imageNodeType: "package",
                packageId: "pkg-b",
                imageSourceId: "pkg-b",
                directImageCount: 1,
                children: [],
              },
            ],
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode: null,
      }),
    );

    const pathKeys = result.current.imageTreeForSidebarNormal.map(
      (node) => node.pathKey,
    );
    expect(pathKeys[0]).toBe("D:/Gallery/pkg-b");
    expect(pathKeys[1]).toBe("CD Booklet/Vol.1/pkg-a");
  });

  it("compacts single-branch folder chain into one path node", () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        id: "folder:C:",
        label: "C:",
        kind: "folder",
        pathKey: "C:",
        imageNodeType: "folder",
        children: [
          {
            id: "folder:C:/Users",
            label: "Users",
            kind: "folder",
            pathKey: "C:/Users",
            imageNodeType: "folder",
            children: [
              {
                id: "folder:C:/Users/Houpy",
                label: "Houpy",
                kind: "folder",
                pathKey: "C:/Users/Houpy",
                imageNodeType: "folder",
                children: [
                  {
                    id: "folder:C:/Users/Houpy/Desktop",
                    label: "Desktop",
                    kind: "folder",
                    pathKey: "C:/Users/Houpy/Desktop",
                    imageNodeType: "folder",
                    children: [
                      {
                        id: "folder:C:/Users/Houpy/Desktop/20260215",
                        label: "20260215",
                        kind: "folder",
                        pathKey: "C:/Users/Houpy/Desktop/20260215",
                        imageNodeType: "folder",
                        children: [
                          {
                            id: "package:C:/Users/Houpy/Desktop/20260215/demo.zip",
                            label: "demo.zip",
                            kind: "package",
                            pathKey: "C:/Users/Houpy/Desktop/20260215/demo.zip",
                            imageNodeType: "package",
                            packageId: "pkg-demo",
                            imageSourceId: "pkg-demo",
                            directImageCount: 4,
                            children: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode: null,
      }),
    );

    const root = result.current.imageTreeForSidebarNormal[0];
    expect(root?.label).toBe("C:/Users/Houpy/Desktop/20260215/demo.zip");
    expect(root?.pathKey).toBe("C:/Users/Houpy/Desktop/20260215/demo.zip");
    expect(root?.children).toHaveLength(0);
  });

  it("指针目录显示完整路径并优先展示直属图包", () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        id: "folder:D:",
        label: "D:",
        kind: "folder",
        pathKey: "D:",
        imageNodeType: "folder",
        children: [
          {
            id: "folder:D:/Gallery",
            label: "Gallery",
            kind: "folder",
            pathKey: "D:/Gallery",
            imageNodeType: "folder",
            children: [
              {
                id: "package:D:/Gallery/1.zip",
                label: "1.zip",
                kind: "package",
                pathKey: "D:/Gallery/1.zip",
                imageNodeType: "package",
                packageId: "pkg-1",
                imageSourceId: "pkg-1",
                directImageCount: 1,
                children: [],
              },
              {
                id: "package:D:/Gallery/A.zip",
                label: "A.zip",
                kind: "package",
                pathKey: "D:/Gallery/A.zip",
                imageNodeType: "package",
                packageId: "pkg-a",
                imageSourceId: "pkg-a",
                directImageCount: 1,
                children: [],
              },
              {
                id: "folder:D:/Gallery/cool",
                label: "cool",
                kind: "folder",
                pathKey: "D:/Gallery/cool",
                imageNodeType: "folder",
                children: [
                  {
                    id: "package:D:/Gallery/cool/2.zip",
                    label: "2.zip",
                    kind: "package",
                    pathKey: "D:/Gallery/cool/2.zip",
                    imageNodeType: "package",
                    packageId: "pkg-2",
                    imageSourceId: "pkg-2",
                    directImageCount: 1,
                    children: [],
                  },
                  {
                    id: "folder:D:/Gallery/cool/cooler",
                    label: "cooler",
                    kind: "folder",
                    pathKey: "D:/Gallery/cool/cooler",
                    imageNodeType: "folder",
                    children: [
                      {
                        id: "package:D:/Gallery/cool/cooler/3.zip",
                        label: "3.zip",
                        kind: "package",
                        pathKey: "D:/Gallery/cool/cooler/3.zip",
                        imageNodeType: "package",
                        packageId: "pkg-3",
                        imageSourceId: "pkg-3",
                        directImageCount: 1,
                        children: [],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode: null,
      }),
    );

    const root = result.current.imageTreeForSidebarNormal[0];
    expect(root?.label).toBe("D:/Gallery");
    expect(root?.children.map((node) => node.label)).toEqual([
      "1.zip",
      "A.zip",
      "D:/Gallery/cool",
    ]);
    expect(root?.children[2]?.children.map((node) => node.label)).toEqual([
      "2.zip",
      "cooler/3.zip",
    ]);
  });

  it("设置指针根目录时不重复渲染根节点", () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        id: "folder:Z:/#Sorted",
        label: "Z:/#Sorted",
        kind: "folder",
        pathKey: "Z:/#Sorted",
        imageNodeType: "folder",
        directImageCount: 0,
        children: [
          {
            id: "folder:Z:/#Sorted/B",
            label: "B",
            kind: "folder",
            pathKey: "Z:/#Sorted/B",
            imageNodeType: "directory",
            imageSourceId: "dir-b",
            directImageCount: 3,
            children: [
              {
                id: "package:Z:/#Sorted/B/1.zip",
                label: "1.zip",
                kind: "package",
                pathKey: "Z:/#Sorted/B/1.zip",
                imageNodeType: "package",
                packageId: "pkg-b-1",
                imageSourceId: "pkg-b-1",
                directImageCount: 1,
                children: [],
              },
            ],
          },
          {
            id: "folder:Z:/#Sorted/C",
            label: "C",
            kind: "folder",
            pathKey: "Z:/#Sorted/C",
            imageNodeType: "directory",
            imageSourceId: "dir-c",
            directImageCount: 4,
            children: [
              {
                id: "package:Z:/#Sorted/C/1.zip",
                label: "1.zip",
                kind: "package",
                pathKey: "Z:/#Sorted/C/1.zip",
                imageNodeType: "package",
                packageId: "pkg-c-1",
                imageSourceId: "pkg-c-1",
                directImageCount: 1,
                children: [],
              },
            ],
          },
        ],
      },
    ];

    const imageRootNode = imageTreeRaw[0];
    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode,
      }),
    );

    expect(
      result.current.imageTreeForSidebarNormal.map((node) => node.pathKey),
    ).toEqual(["Z:/#Sorted/B", "Z:/#Sorted/C"]);
  });

  it("设置媒体根目录时保留根节点", () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        id: "folder:Z:/#Sorted/MediaRoot",
        label: "MediaRoot",
        kind: "folder",
        pathKey: "Z:/#Sorted/MediaRoot",
        imageNodeType: "directory",
        imageSourceId: "dir-root",
        directImageCount: 2,
        children: [
          {
            id: "package:Z:/#Sorted/MediaRoot/1.zip",
            label: "1.zip",
            kind: "package",
            pathKey: "Z:/#Sorted/MediaRoot/1.zip",
            imageNodeType: "package",
            packageId: "pkg-root-1",
            imageSourceId: "pkg-root-1",
            directImageCount: 1,
            children: [],
          },
        ],
      },
    ];

    const imageRootNode = imageTreeRaw[0];
    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode,
      }),
    );

    expect(
      result.current.imageTreeForSidebarNormal.map((node) => node.pathKey),
    ).toEqual(["Z:/#Sorted/MediaRoot"]);
  });

  it("过程性路径节点会被移除并提升有效节点", () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        id: "folder:Z:/#Sorted",
        label: "Z:/#Sorted",
        kind: "folder",
        pathKey: "Z:/#Sorted",
        imageNodeType: "folder",
        directImageCount: 0,
        children: [
          {
            id: "folder:Z:/#Sorted/Transit",
            label: "Transit",
            kind: "folder",
            pathKey: "Z:/#Sorted/Transit",
            imageNodeType: "folder",
            directImageCount: 0,
            children: [
              {
                id: "folder:Z:/#Sorted/Transit/Media",
                label: "Media",
                kind: "folder",
                pathKey: "Z:/#Sorted/Transit/Media",
                imageNodeType: "folder",
                directImageCount: 0,
                children: [
                  makePackageNode("Z:/#Sorted/Transit/Media/1.zip", "pkg-1"),
                ],
              },
            ],
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode: null,
      }),
    );

    expect(
      result.current.imageTreeForSidebarNormal.map((node) => node.pathKey),
    ).toEqual(["Z:/#Sorted/Transit/Media/1.zip"]);
  });

  it("层级模式下保留过程性路径节点", () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        id: "folder:Z:/#Sorted",
        label: "Z:/#Sorted",
        kind: "folder",
        pathKey: "Z:/#Sorted",
        imageNodeType: "folder",
        directImageCount: 0,
        children: [
          {
            id: "folder:Z:/#Sorted/Transit",
            label: "Transit",
            kind: "folder",
            pathKey: "Z:/#Sorted/Transit",
            imageNodeType: "folder",
            directImageCount: 0,
            children: [
              {
                id: "folder:Z:/#Sorted/Transit/Group-A",
                label: "Group-A",
                kind: "folder",
                pathKey: "Z:/#Sorted/Transit/Group-A",
                imageNodeType: "folder",
                directImageCount: 0,
                children: [
                  makePackageNode("Z:/#Sorted/Transit/Group-A/1.zip", "pkg-a1"),
                  makePackageNode("Z:/#Sorted/Transit/Group-A/2.zip", "pkg-a2"),
                ],
              },
              {
                id: "folder:Z:/#Sorted/Transit/Group-B",
                label: "Group-B",
                kind: "folder",
                pathKey: "Z:/#Sorted/Transit/Group-B",
                imageNodeType: "folder",
                directImageCount: 0,
                children: [
                  makePackageNode("Z:/#Sorted/Transit/Group-B/1.zip", "pkg-b1"),
                  makePackageNode("Z:/#Sorted/Transit/Group-B/2.zip", "pkg-b2"),
                ],
              },
            ],
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode: null,
        sidebarTreeDisplayMode: "hierarchy",
      }),
    );

    expect(
      result.current.imageTreeForSidebarNormal.map((node) => node.pathKey),
    ).toEqual(["Z:/#Sorted"]);
    expect(
      result.current.imageTreeForSidebarNormal[0]?.children.map(
        (node) => node.pathKey,
      ),
    ).toEqual(["Z:/#Sorted/Transit"]);
    expect(
      result.current.imageTreeForSidebarNormal[0]?.children[0]?.children.map(
        (node) => node.pathKey,
      ),
    ).toEqual(["Z:/#Sorted/Transit/Group-A", "Z:/#Sorted/Transit/Group-B"]);
  });

  it("层级模式下使用目录段名与文件名显示", () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        id: "folder:D:",
        label: "D:",
        kind: "folder",
        pathKey: "D:",
        imageNodeType: "folder",
        directImageCount: 0,
        children: [
          {
            id: "folder:D:/Gallery",
            label: "D:/Gallery",
            kind: "folder",
            pathKey: "D:/Gallery",
            imageNodeType: "folder",
            directImageCount: 0,
            children: [
              {
                id: "package:D:/Gallery/demo.zip",
                label: "[Meta] 展示标题",
                kind: "package",
                pathKey: "D:/Gallery/demo.zip",
                imageNodeType: "package",
                packageId: "pkg-demo",
                imageSourceId: "pkg-demo",
                directImageCount: 1,
                children: [],
              },
            ],
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode: null,
        sidebarTreeDisplayMode: "hierarchy",
      }),
    );

    const driveNode = result.current.imageTreeForSidebarNormal[0];
    expect(driveNode?.label).toBe("D:");
    expect(driveNode?.children[0]?.label).toBe("Gallery");
    expect(driveNode?.children[0]?.children[0]?.label).toBe("demo.zip");
  });

  it("层级模式下直属媒体节点保留在各自父级下方", () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        id: "folder:D:",
        label: "D:",
        kind: "folder",
        pathKey: "D:",
        imageNodeType: "folder",
        directImageCount: 0,
        children: [
          {
            id: "folder:D:/Gallery",
            label: "Gallery",
            kind: "folder",
            pathKey: "D:/Gallery",
            imageNodeType: "folder",
            directImageCount: 0,
            children: [
              makePackageNode("D:/Gallery/1.zip", "pkg-1"),
              {
                id: "folder:D:/Gallery/cool",
                label: "cool",
                kind: "folder",
                pathKey: "D:/Gallery/cool",
                imageNodeType: "folder",
                directImageCount: 0,
                children: [makePackageNode("D:/Gallery/cool/2.zip", "pkg-2")],
              },
            ],
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode: null,
        sidebarTreeDisplayMode: "hierarchy",
      }),
    );

    const galleryNode =
      result.current.imageTreeForSidebarNormal[0]?.children[0];
    expect(galleryNode?.children.map((node) => node.pathKey)).toEqual([
      "D:/Gallery/1.zip",
      "D:/Gallery/cool",
    ]);
    expect(
      galleryNode?.children[1]?.children.map((node) => node.pathKey),
    ).toEqual(["D:/Gallery/cool/2.zip"]);
  });

  it("媒体目录节点不再向下展开并复用父级映射", () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        id: "folder:Z:/Gallery",
        label: "Z:/Gallery",
        kind: "folder",
        pathKey: "Z:/Gallery",
        imageNodeType: "folder",
        directImageCount: 0,
        children: [
          {
            id: "folder:Z:/Gallery/DirSet",
            label: "DirSet",
            kind: "folder",
            pathKey: "Z:/Gallery/DirSet",
            imageNodeType: "directory",
            imageSourceId: "dir-set",
            directImageCount: 40,
            children: [
              makePackageNode("Z:/Gallery/DirSet/A/1.zip", "pkg-a-1"),
              makePackageNode("Z:/Gallery/DirSet/B/2.zip", "pkg-b-2"),
            ],
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode: null,
      }),
    );

    const root = result.current.imageTreeForSidebarNormal[0];
    expect(root?.pathKey).toBe("Z:/Gallery/DirSet");
    expect(root?.children).toEqual([]);
    expect(result.current.normalImageSourceNodeIdMap.get("dir-set")).toBe(
      "folder:Z:/Gallery/DirSet",
    );
    expect(result.current.normalImageSourceNodeIdMap.get("pkg-a-1")).toBe(
      "folder:Z:/Gallery/DirSet",
    );
    expect(result.current.normalImageSourceNodeIdMap.get("pkg-b-2")).toBe(
      "folder:Z:/Gallery/DirSet",
    );
  });
});
