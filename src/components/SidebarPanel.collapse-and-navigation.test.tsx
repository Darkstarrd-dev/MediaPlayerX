import { useState, type ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { SidebarNode } from "../types";
import SidebarPanel from "./SidebarPanel";

const IMAGE_TREE_COLLAPSIBLE_FIXTURE: SidebarNode[] = [
  {
    id: "folder:图库",
    label: "图库",
    kind: "folder",
    pathKey: "图库",
    imageNodeType: "folder",
    directImageCount: 0,
    descendantNodeCount: 2,
    descendantPackageCount: 1,
    descendantImageCount: 6,
    children: [
      {
        id: "package:图库/Vol.1",
        label: "Vol.1",
        kind: "package",
        packageId: "pkg-1",
        imageSourceId: "pkg-1",
        pathKey: "图库/Vol.1",
        imageNodeType: "package",
        directImageCount: 6,
        descendantNodeCount: 1,
        descendantPackageCount: 1,
        descendantImageCount: 6,
        children: [],
      },
    ],
  },
];

const IMAGE_TREE_PARENT_NAV_FIXTURE: SidebarNode[] = [
  {
    id: "folder:X盘",
    label: "X盘",
    kind: "folder",
    pathKey: "X盘",
    imageNodeType: "folder",
    directImageCount: 0,
    descendantNodeCount: 7,
    descendantPackageCount: 3,
    descendantImageCount: 12,
    children: [
      {
        id: "folder:X盘/图库A",
        label: "图库A",
        kind: "folder",
        pathKey: "X盘/图库A",
        imageNodeType: "folder",
        directImageCount: 0,
        descendantNodeCount: 2,
        descendantPackageCount: 1,
        descendantImageCount: 4,
        children: [
          {
            id: "package:X盘/图库A/Vol.1",
            label: "Vol.1",
            kind: "package",
            packageId: "pkg-a-1",
            imageSourceId: "pkg-a-1",
            pathKey: "X盘/图库A/Vol.1",
            imageNodeType: "package",
            directImageCount: 4,
            descendantNodeCount: 1,
            descendantPackageCount: 1,
            descendantImageCount: 4,
            children: [],
          },
        ],
      },
      {
        id: "folder:X盘/CoverRoot",
        label: "CoverRoot",
        kind: "folder",
        pathKey: "X盘/CoverRoot",
        imageNodeType: "directory",
        imageSourceId: "cover-root",
        directImageCount: 2,
        descendantNodeCount: 2,
        descendantPackageCount: 1,
        descendantImageCount: 3,
        children: [
          {
            id: "package:X盘/CoverRoot/CoverPkg",
            label: "CoverPkg",
            kind: "package",
            packageId: "pkg-cover",
            imageSourceId: "pkg-cover",
            pathKey: "X盘/CoverRoot/CoverPkg",
            imageNodeType: "package",
            directImageCount: 1,
            descendantNodeCount: 1,
            descendantPackageCount: 1,
            descendantImageCount: 1,
            children: [],
          },
        ],
      },
      {
        id: "folder:X盘/图库B",
        label: "图库B",
        kind: "folder",
        pathKey: "X盘/图库B",
        imageNodeType: "folder",
        directImageCount: 0,
        descendantNodeCount: 2,
        descendantPackageCount: 1,
        descendantImageCount: 5,
        children: [
          {
            id: "package:X盘/图库B/Vol.1",
            label: "Vol.1",
            kind: "package",
            packageId: "pkg-b-1",
            imageSourceId: "pkg-b-1",
            pathKey: "X盘/图库B/Vol.1",
            imageNodeType: "package",
            directImageCount: 5,
            descendantNodeCount: 1,
            descendantPackageCount: 1,
            descendantImageCount: 5,
            children: [],
          },
        ],
      },
    ],
  },
];

const IMAGE_TREE_MULTI_DRIVE_FIXTURE: SidebarNode[] = [
  {
    id: "folder:C:",
    label: "C:",
    kind: "folder",
    pathKey: "C:",
    imageNodeType: "folder",
    directImageCount: 0,
    descendantNodeCount: 3,
    descendantPackageCount: 1,
    descendantImageCount: 2,
    children: [
      {
        id: "folder:C:/图库C",
        label: "图库C",
        kind: "folder",
        pathKey: "C:/图库C",
        imageNodeType: "folder",
        directImageCount: 0,
        descendantNodeCount: 2,
        descendantPackageCount: 1,
        descendantImageCount: 2,
        children: [
          {
            id: "package:C:/图库C/Vol.1",
            label: "C-Vol",
            kind: "package",
            packageId: "pkg-c-1",
            imageSourceId: "pkg-c-1",
            pathKey: "C:/图库C/Vol.1",
            imageNodeType: "package",
            directImageCount: 2,
            descendantNodeCount: 1,
            descendantPackageCount: 1,
            descendantImageCount: 2,
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
    directImageCount: 0,
    descendantNodeCount: 3,
    descendantPackageCount: 1,
    descendantImageCount: 3,
    children: [
      {
        id: "folder:D:/图库D",
        label: "图库D",
        kind: "folder",
        pathKey: "D:/图库D",
        imageNodeType: "folder",
        directImageCount: 0,
        descendantNodeCount: 2,
        descendantPackageCount: 0,
        descendantImageCount: 3,
        children: [
          {
            id: "folder:D:/图库D/解压包",
            label: "D-Dir",
            kind: "folder",
            pathKey: "D:/图库D/解压包",
            imageNodeType: "directory",
            imageSourceId: "dir-d-1",
            directImageCount: 3,
            descendantNodeCount: 1,
            descendantPackageCount: 0,
            descendantImageCount: 3,
            children: [],
          },
        ],
      },
    ],
  },
];

const IMAGE_TREE_POINTER_COLLAPSE_FIXTURE: SidebarNode[] = [
  {
    id: "folder:D:/Gallery",
    label: "D:/Gallery",
    kind: "folder",
    pathKey: "D:/Gallery",
    imageNodeType: "folder",
    directImageCount: 0,
    descendantNodeCount: 8,
    descendantPackageCount: 6,
    descendantImageCount: 6,
    children: [
      {
        id: "package:D:/Gallery/1.zip",
        label: "1.zip",
        kind: "package",
        packageId: "pkg-1",
        imageSourceId: "pkg-1",
        pathKey: "D:/Gallery/1.zip",
        imageNodeType: "package",
        directImageCount: 1,
        descendantNodeCount: 1,
        descendantPackageCount: 1,
        descendantImageCount: 1,
        children: [],
      },
      {
        id: "package:D:/Gallery/A.zip",
        label: "A.zip",
        kind: "package",
        packageId: "pkg-a",
        imageSourceId: "pkg-a",
        pathKey: "D:/Gallery/A.zip",
        imageNodeType: "package",
        directImageCount: 1,
        descendantNodeCount: 1,
        descendantPackageCount: 1,
        descendantImageCount: 1,
        children: [],
      },
      {
        id: "package:D:/Gallery/Octosoup.zip",
        label: "Octosoup.zip",
        kind: "package",
        packageId: "pkg-octo",
        imageSourceId: "pkg-octo",
        pathKey: "D:/Gallery/Octosoup.zip",
        imageNodeType: "package",
        directImageCount: 1,
        descendantNodeCount: 1,
        descendantPackageCount: 1,
        descendantImageCount: 1,
        children: [],
      },
      {
        id: "folder:D:/Gallery/cool",
        label: "D:/Gallery/cool",
        kind: "folder",
        pathKey: "D:/Gallery/cool",
        imageNodeType: "folder",
        directImageCount: 0,
        descendantNodeCount: 4,
        descendantPackageCount: 3,
        descendantImageCount: 3,
        children: [
          {
            id: "package:D:/Gallery/cool/2.zip",
            label: "2.zip",
            kind: "package",
            packageId: "pkg-2",
            imageSourceId: "pkg-2",
            pathKey: "D:/Gallery/cool/2.zip",
            imageNodeType: "package",
            directImageCount: 1,
            descendantNodeCount: 1,
            descendantPackageCount: 1,
            descendantImageCount: 1,
            children: [],
          },
          {
            id: "folder:D:/Gallery/cool/cooler",
            label: "D:/Gallery/cool/cooler",
            kind: "folder",
            pathKey: "D:/Gallery/cool/cooler",
            imageNodeType: "folder",
            directImageCount: 0,
            descendantNodeCount: 3,
            descendantPackageCount: 2,
            descendantImageCount: 2,
            children: [
              {
                id: "package:D:/Gallery/cool/cooler/3.zip",
                label: "3.zip",
                kind: "package",
                packageId: "pkg-3",
                imageSourceId: "pkg-3",
                pathKey: "D:/Gallery/cool/cooler/3.zip",
                imageNodeType: "package",
                directImageCount: 1,
                descendantNodeCount: 1,
                descendantPackageCount: 1,
                descendantImageCount: 1,
                children: [],
              },
              {
                id: "folder:D:/Gallery/cool/cooler/coolest",
                label: "D:/Gallery/cool/cooler/coolest",
                kind: "folder",
                pathKey: "D:/Gallery/cool/cooler/coolest",
                imageNodeType: "folder",
                directImageCount: 0,
                descendantNodeCount: 2,
                descendantPackageCount: 1,
                descendantImageCount: 1,
                children: [
                  {
                    id: "package:D:/Gallery/cool/cooler/coolest/4.zip",
                    label: "4.zip",
                    kind: "package",
                    packageId: "pkg-4",
                    imageSourceId: "pkg-4",
                    pathKey: "D:/Gallery/cool/cooler/coolest/4.zip",
                    imageNodeType: "package",
                    directImageCount: 1,
                    descendantNodeCount: 1,
                    descendantPackageCount: 1,
                    descendantImageCount: 1,
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

function renderImageSidebar(
  nodes: SidebarNode[],
  overrides: Partial<ComponentProps<typeof SidebarPanel>> = {},
) {
  const onSelectNode = vi.fn();
  const onSelectPackage = vi.fn();
  const onCollapseSidebar = vi.fn();
  const onToggleSidebarTreeDisplayMode = vi.fn();
  const result = render(
    <SidebarPanel
      mode="image"
      sidebarFocus="sidebar"
      sidebarRatio={0.3}
      sidebarMinWidth={220}
      sidebarFontSize={14}
      sidebarCountFontSize={12}
      sidebarIndentStep={16}
      sidebarVerticalGap={4}
      currentRootLabel={null}
      selectedSidebarNodeId={null}
      canSetCurrentRoot={true}
      imageRootNodeId={null}
      videoRootNodeId={null}
      musicRootNodeId={null}
      imageTreeNodes={nodes}
      videoTreeNodes={[]}
      audioTreeNodes={[]}
      selectedPackageId=""
      selectedVideoId=""
      selectedAudioId=""
      playlistIds={[]}
      audioPlaylistIds={[]}
      onSelectNode={onSelectNode}
      onSelectPackage={onSelectPackage}
      onSelectVideo={vi.fn()}
      onSelectAudio={vi.fn()}
      onCollapseSidebar={onCollapseSidebar}
      onSetCurrentRoot={vi.fn()}
      onGoToFromSearchMode={vi.fn()}
      onResetRoot={vi.fn()}
      onToggleVideoPlaylist={vi.fn()}
      onToggleAudioPlaylist={vi.fn()}
      onToggleManageNode={vi.fn()}
      onToggleSidebarTreeDisplayMode={onToggleSidebarTreeDisplayMode}
      {...overrides}
    />,
  );

  return {
    ...result,
    onSelectNode,
    onSelectPackage,
    onCollapseSidebar,
    onToggleSidebarTreeDisplayMode,
  };
}

function renderControlledImageSidebar(
  nodes: SidebarNode[],
  selectedSidebarNodeId: string,
) {
  function ControlledSidebar() {
    const [collapsedFolderNodeIds, setCollapsedFolderNodeIds] = useState<
      string[]
    >([]);
    return (
      <SidebarPanel
        mode="image"
        sidebarFocus="sidebar"
        sidebarRatio={0.3}
        sidebarMinWidth={220}
        sidebarFontSize={14}
        sidebarCountFontSize={12}
        sidebarIndentStep={16}
        sidebarVerticalGap={4}
        currentRootLabel={null}
        selectedSidebarNodeId={selectedSidebarNodeId}
        canSetCurrentRoot={true}
        imageRootNodeId={null}
        videoRootNodeId={null}
        musicRootNodeId={null}
        imageTreeNodes={nodes}
        videoTreeNodes={[]}
        audioTreeNodes={[]}
        selectedPackageId=""
        selectedVideoId=""
        selectedAudioId=""
        playlistIds={[]}
        audioPlaylistIds={[]}
        onSelectNode={vi.fn()}
        onSelectPackage={vi.fn()}
        onSelectVideo={vi.fn()}
        onSelectAudio={vi.fn()}
        onCollapseSidebar={vi.fn()}
        onSetCurrentRoot={vi.fn()}
        onGoToFromSearchMode={vi.fn()}
        onResetRoot={vi.fn()}
        onToggleVideoPlaylist={vi.fn()}
        onToggleAudioPlaylist={vi.fn()}
        onToggleManageNode={vi.fn()}
        collapsedFolderNodeIds={collapsedFolderNodeIds}
        onSetCollapsedFolderNodeIds={setCollapsedFolderNodeIds}
      />
    );
  }

  render(<ControlledSidebar />);
}

describe("SidebarPanel music interactions", () => {
  it("点击标题按钮切换侧栏树显示模式", () => {
    const { onCollapseSidebar, onToggleSidebarTreeDisplayMode } =
      renderImageSidebar(IMAGE_TREE_COLLAPSIBLE_FIXTURE);
    const titleButton = document.querySelector<HTMLButtonElement>(
      '[data-slot="fg-sidebar-header-btn-group-title-btn-root"]',
    );
    expect(titleButton).not.toBeNull();

    fireEvent.click(titleButton!);

    expect(onToggleSidebarTreeDisplayMode).toHaveBeenCalledTimes(1);
    expect(onCollapseSidebar).not.toHaveBeenCalled();
  });

  it("层级模式下按 depth 应用缩进", () => {
    const tree: SidebarNode[] = [
      {
        id: "folder:Root",
        label: "Root",
        kind: "folder",
        pathKey: "Root",
        imageNodeType: "folder",
        directImageCount: 0,
        children: [
          {
            id: "folder:Root/Child",
            label: "Child",
            kind: "folder",
            pathKey: "Root/Child",
            imageNodeType: "folder",
            directImageCount: 0,
            children: [
              {
                id: "package:Root/Child/Pkg.zip",
                label: "Pkg.zip",
                kind: "package",
                imageNodeType: "package",
                packageId: "pkg-child",
                imageSourceId: "pkg-child",
                pathKey: "Root/Child/Pkg.zip",
                directImageCount: 1,
                children: [],
              },
            ],
          },
        ],
      },
    ];

    renderImageSidebar(tree, {
      sidebarTreeDisplayMode: "hierarchy",
      sidebarIndentStep: 20,
    });

    const rootRow = document.querySelector<HTMLElement>(
      '[data-sidebar-node-id="folder:Root"]',
    );
    const childRow = document.querySelector<HTMLElement>(
      '[data-sidebar-node-id="folder:Root/Child"]',
    );
    const packageRow = document.querySelector<HTMLElement>(
      '[data-sidebar-node-id="package:Root/Child/Pkg.zip"]',
    );

    expect(rootRow).not.toBeNull();
    expect(childRow).not.toBeNull();
    expect(packageRow).not.toBeNull();
    expect(rootRow?.getAttribute("style")).toBeNull();
    const childLabel = childRow?.querySelector<HTMLElement>(".sidebar-label");
    const packageLabel =
      packageRow?.querySelector<HTMLElement>(".sidebar-label");
    expect(childLabel).not.toBeNull();
    expect(packageLabel).not.toBeNull();
    expect(childLabel).toHaveStyle("--mpx-sidebar-node-indent: 20px");
    expect(packageLabel).toHaveStyle("--mpx-sidebar-node-indent: 40px");
  });

  it("直属模式下不应用层级缩进", () => {
    const tree: SidebarNode[] = [
      {
        id: "folder:Root",
        label: "Root",
        kind: "folder",
        pathKey: "Root",
        imageNodeType: "folder",
        directImageCount: 0,
        children: [
          {
            id: "folder:Root/Child",
            label: "Child",
            kind: "folder",
            pathKey: "Root/Child",
            imageNodeType: "folder",
            directImageCount: 0,
            children: [
              {
                id: "package:Root/Child/Pkg.zip",
                label: "Pkg.zip",
                kind: "package",
                imageNodeType: "package",
                packageId: "pkg-child",
                imageSourceId: "pkg-child",
                pathKey: "Root/Child/Pkg.zip",
                directImageCount: 1,
                children: [],
              },
            ],
          },
        ],
      },
    ];

    renderImageSidebar(tree, {
      sidebarTreeDisplayMode: "direct",
      sidebarIndentStep: 20,
    });

    const rootRow = document.querySelector<HTMLElement>(
      '[data-sidebar-node-id="folder:Root"]',
    );
    const childRow = document.querySelector<HTMLElement>(
      '[data-sidebar-node-id="folder:Root/Child"]',
    );
    const packageRow = document.querySelector<HTMLElement>(
      '[data-sidebar-node-id="package:Root/Child/Pkg.zip"]',
    );

    expect(rootRow).not.toBeNull();
    expect(childRow).not.toBeNull();
    expect(packageRow).not.toBeNull();
    expect(rootRow?.getAttribute("style")).toBeNull();
    expect(childRow?.getAttribute("style")).toBeNull();
    expect(packageRow?.getAttribute("style")).toBeNull();
  });

  it("受控折叠状态在临时树切换后保持，不会因模式返回被重置", () => {
    const onSetCollapsedFolderNodeIds = vi.fn();
    const { rerender } = renderImageSidebar(IMAGE_TREE_COLLAPSIBLE_FIXTURE, {
      collapsedFolderNodeIds: ["folder:图库"],
      onSetCollapsedFolderNodeIds,
    });

    expect(screen.queryByRole("button", { name: "Vol.1" })).toBeNull();

    rerender(
      <SidebarPanel
        mode="image"
        sidebarFocus="sidebar"
        sidebarRatio={0.3}
        sidebarMinWidth={220}
        sidebarFontSize={14}
        sidebarCountFontSize={12}
        sidebarIndentStep={16}
        sidebarVerticalGap={4}
        currentRootLabel={null}
        selectedSidebarNodeId={null}
        canSetCurrentRoot={true}
        imageRootNodeId={null}
        videoRootNodeId={null}
        musicRootNodeId={null}
        imageTreeNodes={[]}
        videoTreeNodes={[]}
        audioTreeNodes={[]}
        selectedPackageId=""
        selectedVideoId=""
        selectedAudioId=""
        playlistIds={[]}
        audioPlaylistIds={[]}
        onSelectNode={vi.fn()}
        onSelectPackage={vi.fn()}
        onSelectVideo={vi.fn()}
        onSelectAudio={vi.fn()}
        onCollapseSidebar={vi.fn()}
        onSetCurrentRoot={vi.fn()}
        onGoToFromSearchMode={vi.fn()}
        onResetRoot={vi.fn()}
        onToggleVideoPlaylist={vi.fn()}
        onToggleAudioPlaylist={vi.fn()}
        onToggleManageNode={vi.fn()}
        collapsedFolderNodeIds={["folder:图库"]}
        onSetCollapsedFolderNodeIds={onSetCollapsedFolderNodeIds}
      />,
    );

    rerender(
      <SidebarPanel
        mode="image"
        sidebarFocus="sidebar"
        sidebarRatio={0.3}
        sidebarMinWidth={220}
        sidebarFontSize={14}
        sidebarCountFontSize={12}
        sidebarIndentStep={16}
        sidebarVerticalGap={4}
        currentRootLabel={null}
        selectedSidebarNodeId={null}
        canSetCurrentRoot={true}
        imageRootNodeId={null}
        videoRootNodeId={null}
        musicRootNodeId={null}
        imageTreeNodes={IMAGE_TREE_COLLAPSIBLE_FIXTURE}
        videoTreeNodes={[]}
        audioTreeNodes={[]}
        selectedPackageId=""
        selectedVideoId=""
        selectedAudioId=""
        playlistIds={[]}
        audioPlaylistIds={[]}
        onSelectNode={vi.fn()}
        onSelectPackage={vi.fn()}
        onSelectVideo={vi.fn()}
        onSelectAudio={vi.fn()}
        onCollapseSidebar={vi.fn()}
        onSetCurrentRoot={vi.fn()}
        onGoToFromSearchMode={vi.fn()}
        onResetRoot={vi.fn()}
        onToggleVideoPlaylist={vi.fn()}
        onToggleAudioPlaylist={vi.fn()}
        onToggleManageNode={vi.fn()}
        collapsedFolderNodeIds={["folder:图库"]}
        onSetCollapsedFolderNodeIds={onSetCollapsedFolderNodeIds}
      />,
    );

    expect(screen.queryByRole("button", { name: "Vol.1" })).toBeNull();
  });

  it("受控折叠状态下定位到子节点时会自动展开祖先节点", () => {
    const onSetCollapsedFolderNodeIds = vi.fn();
    const { rerender } = renderImageSidebar(IMAGE_TREE_COLLAPSIBLE_FIXTURE, {
      selectedSidebarNodeId: "package:图库/Vol.1",
      collapsedFolderNodeIds: ["folder:图库"],
      onSetCollapsedFolderNodeIds,
    });

    expect(onSetCollapsedFolderNodeIds).toHaveBeenCalledWith([]);

    rerender(
      <SidebarPanel
        mode="image"
        sidebarFocus="sidebar"
        sidebarRatio={0.3}
        sidebarMinWidth={220}
        sidebarFontSize={14}
        sidebarCountFontSize={12}
        sidebarIndentStep={16}
        sidebarVerticalGap={4}
        currentRootLabel={null}
        selectedSidebarNodeId="package:图库/Vol.1"
        canSetCurrentRoot={true}
        imageRootNodeId={null}
        videoRootNodeId={null}
        musicRootNodeId={null}
        imageTreeNodes={IMAGE_TREE_COLLAPSIBLE_FIXTURE}
        videoTreeNodes={[]}
        audioTreeNodes={[]}
        selectedPackageId=""
        selectedVideoId=""
        selectedAudioId=""
        playlistIds={[]}
        audioPlaylistIds={[]}
        onSelectNode={vi.fn()}
        onSelectPackage={vi.fn()}
        onSelectVideo={vi.fn()}
        onSelectAudio={vi.fn()}
        onCollapseSidebar={vi.fn()}
        onSetCurrentRoot={vi.fn()}
        onGoToFromSearchMode={vi.fn()}
        onResetRoot={vi.fn()}
        onToggleVideoPlaylist={vi.fn()}
        onToggleAudioPlaylist={vi.fn()}
        onToggleManageNode={vi.fn()}
        collapsedFolderNodeIds={[]}
        onSetCollapsedFolderNodeIds={onSetCollapsedFolderNodeIds}
      />,
    );

    expect(screen.getByRole("button", { name: "Vol.1" })).toBeInTheDocument();
  });

  it("点击折叠全部按钮会折叠所有含图父级节点", () => {
    renderImageSidebar(IMAGE_TREE_PARENT_NAV_FIXTURE);

    fireEvent.click(screen.getByRole("button", { name: "折叠全部含图父级" }));

    expect(screen.getByRole("button", { name: "X盘" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "图库A" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "图库B" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CoverRoot" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Vol.1" })).toBeNull();
    expect(screen.queryByRole("button", { name: "CoverPkg" })).toBeNull();
  });

  it("一键折叠在指针模式下仅保留指针节点", () => {
    renderImageSidebar(IMAGE_TREE_POINTER_COLLAPSE_FIXTURE);

    fireEvent.click(screen.getByRole("button", { name: "折叠全部含图父级" }));

    expect(
      screen.getByRole("button", { name: "D:/Gallery" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "D:/Gallery/cool" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "D:/Gallery/cool/cooler" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "D:/Gallery/cool/cooler/coolest" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "1.zip" })).toBeNull();
    expect(screen.queryByRole("button", { name: "2.zip" })).toBeNull();
    expect(screen.queryByRole("button", { name: "3.zip" })).toBeNull();
    expect(screen.queryByRole("button", { name: "4.zip" })).toBeNull();
  });

  it("多盘符场景下折叠会对所有目标父级节点生效", () => {
    renderImageSidebar(IMAGE_TREE_MULTI_DRIVE_FIXTURE);

    fireEvent.click(screen.getByRole("button", { name: "折叠全部含图父级" }));

    expect(screen.queryByRole("button", { name: "C-Vol" })).toBeNull();
    expect(screen.queryByRole("button", { name: "D-Dir" })).toBeNull();
    expect(screen.getByRole("button", { name: "图库C" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "图库D" })).toBeInTheDocument();
  });

  it("折叠全部按钮再次点击会展开所有含图父级节点", () => {
    renderImageSidebar(IMAGE_TREE_PARENT_NAV_FIXTURE);

    fireEvent.click(screen.getByRole("button", { name: "折叠全部含图父级" }));
    fireEvent.click(screen.getByRole("button", { name: "展开全部含图父级" }));

    expect(screen.getAllByRole("button", { name: "Vol.1" }).length).toBe(2);
  });

  it("受控模式下折叠全部后不会被自动展开回去", async () => {
    renderControlledImageSidebar(
      IMAGE_TREE_PARENT_NAV_FIXTURE,
      "package:X盘/图库A/Vol.1",
    );

    fireEvent.click(screen.getByRole("button", { name: "折叠全部含图父级" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Vol.1" })).toBeNull();
      expect(screen.queryByRole("button", { name: "CoverPkg" })).toBeNull();
    });
  });

  it("图片模式可跳转到下一个目标父级节点", () => {
    const { onSelectNode } = renderImageSidebar(IMAGE_TREE_PARENT_NAV_FIXTURE, {
      selectedSidebarNodeId: "folder:X盘/图库A",
    });

    fireEvent.click(screen.getByRole("button", { name: "下一个含图父级" }));

    expect(onSelectNode).toHaveBeenCalledWith("folder:X盘/CoverRoot");
  });

  it("图片模式可跳转到上一个目标父级节点", () => {
    const { onSelectNode } = renderImageSidebar(IMAGE_TREE_PARENT_NAV_FIXTURE, {
      selectedSidebarNodeId: "folder:X盘/图库A",
    });

    fireEvent.click(screen.getByRole("button", { name: "上一个含图父级" }));

    expect(onSelectNode).toHaveBeenCalledWith("folder:X盘");
  });

  it("侧栏标签支持完整路径与末段名切换", () => {
    renderImageSidebar(IMAGE_TREE_POINTER_COLLAPSE_FIXTURE);

    expect(
      screen.getByRole("button", { name: "D:/Gallery/cool/cooler" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "F" }));

    expect(screen.getByRole("button", { name: "L" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cooler" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "D:/Gallery/cool/cooler" }),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "L" }));

    expect(screen.getByRole("button", { name: "F" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "D:/Gallery/cool/cooler" }),
    ).toBeInTheDocument();
  });

  it("超长路径在获得焦点时启用跑马灯，失焦后恢复静态省略", async () => {
    const longLabel =
      "X:/Very/Long/Path/That/Should/Overflow/When/Focused/And/Scroll/Left";
    const longPathNodes: SidebarNode[] = [
      {
        id: "folder:long-path",
        label: longLabel,
        kind: "folder",
        pathKey: "long-path",
        imageNodeType: "folder",
        directImageCount: 0,
        descendantNodeCount: 1,
        descendantPackageCount: 1,
        descendantImageCount: 1,
        children: [
          {
            id: "package:long-path/item",
            label: "item",
            kind: "package",
            packageId: "pkg-long",
            imageSourceId: "pkg-long",
            pathKey: "long-path/item",
            imageNodeType: "package",
            directImageCount: 1,
            descendantNodeCount: 1,
            descendantPackageCount: 1,
            descendantImageCount: 1,
            children: [],
          },
        ],
      },
    ];

    const scrollWidthSpy = vi
      .spyOn(HTMLElement.prototype, "scrollWidth", "get")
      .mockImplementation(function mockScrollWidth(this: HTMLElement) {
        if (this.classList.contains("sidebar-label-text")) {
          return 320;
        }
        return 88;
      });
    const clientWidthSpy = vi
      .spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockReturnValue(88);

    try {
      renderImageSidebar(longPathNodes);

      const labelButton = screen.getByRole("button", { name: longLabel });
      fireEvent.focus(labelButton);

      await waitFor(() => {
        expect(
          labelButton.querySelector(".sidebar-label-marquee.is-overflow"),
        ).not.toBeNull();
      });

      fireEvent.blur(labelButton);

      await waitFor(() => {
        expect(
          labelButton.querySelector(".sidebar-label-marquee.is-overflow"),
        ).toBeNull();
      });
    } finally {
      scrollWidthSpy.mockRestore();
      clientWidthSpy.mockRestore();
    }
  });

  it("超长路径在侧栏逻辑焦点且节点选中时也会触发跑马灯", async () => {
    const longLabel =
      "X:/Very/Long/Path/That/Should/Overflow/When/Sidebar/Is/Focused";
    const longPathNodes: SidebarNode[] = [
      {
        id: "folder:long-path-2",
        label: longLabel,
        kind: "folder",
        pathKey: "long-path-2",
        imageNodeType: "folder",
        directImageCount: 0,
        descendantNodeCount: 1,
        descendantPackageCount: 1,
        descendantImageCount: 1,
        children: [
          {
            id: "package:long-path-2/item",
            label: "item",
            kind: "package",
            packageId: "pkg-long-2",
            imageSourceId: "pkg-long-2",
            pathKey: "long-path-2/item",
            imageNodeType: "package",
            directImageCount: 1,
            descendantNodeCount: 1,
            descendantPackageCount: 1,
            descendantImageCount: 1,
            children: [],
          },
        ],
      },
    ];

    const scrollWidthSpy = vi
      .spyOn(HTMLElement.prototype, "scrollWidth", "get")
      .mockImplementation(function mockScrollWidth(this: HTMLElement) {
        if (this.classList.contains("sidebar-label-text")) {
          return 320;
        }
        return 88;
      });
    const clientWidthSpy = vi
      .spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockReturnValue(88);

    try {
      renderImageSidebar(longPathNodes, {
        selectedSidebarNodeId: "folder:long-path-2",
      });

      const labelButton = screen.getByRole("button", { name: longLabel });

      await waitFor(() => {
        expect(
          labelButton.querySelector(".sidebar-label-marquee.is-overflow"),
        ).not.toBeNull();
      });
    } finally {
      scrollWidthSpy.mockRestore();
      clientWidthSpy.mockRestore();
    }
  });
});
