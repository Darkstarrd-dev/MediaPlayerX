import { type ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { SidebarNode } from "../types";
import SidebarPanel from "./SidebarPanel";

const AUDIO_TREE_FIXTURE: SidebarNode[] = [
  {
    id: "folder:X盘",
    label: "X盘",
    kind: "folder",
    pathKey: "X盘",
    descendantNodeCount: 1,
    directAudioCount: 0,
    descendantAudioFolderCount: 1,
    audioId: "audio-1",
    children: [
      {
        id: "folder:X盘/Album A",
        label: "Album A",
        kind: "folder",
        audioId: "audio-1",
        pathKey: "X盘/Album A",
        descendantNodeCount: 2,
        directAudioCount: 2,
        descendantAudioFolderCount: 1,
        children: [],
      },
    ],
  },
];

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

const IMAGE_TREE_DIRECTORY_FIXTURE: SidebarNode[] = [
  {
    id: "folder:目录源",
    label: "目录源",
    kind: "folder",
    pathKey: "目录源",
    imageNodeType: "directory",
    imageSourceId: "dir-1",
    directImageCount: 5,
    descendantNodeCount: 2,
    descendantPackageCount: 1,
    descendantImageCount: 8,
    children: [
      {
        id: "package:目录源/Extra",
        label: "Extra",
        kind: "package",
        packageId: "pkg-extra",
        imageSourceId: "pkg-extra",
        pathKey: "目录源/Extra",
        imageNodeType: "package",
        directImageCount: 3,
        descendantNodeCount: 1,
        descendantPackageCount: 1,
        descendantImageCount: 3,
        children: [],
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

const IMAGE_TREE_DIRECTORY_WITH_COVER_CHILDREN_FIXTURE: SidebarNode[] = [
  {
    id: "folder:A",
    label: "A",
    kind: "folder",
    pathKey: "A",
    imageNodeType: "folder",
    directImageCount: 0,
    descendantNodeCount: 11,
    descendantPackageCount: 7,
    descendantImageCount: 14,
    children: [
      {
        id: "folder:A/B",
        label: "B",
        kind: "folder",
        pathKey: "A/B",
        imageNodeType: "directory",
        imageSourceId: "dir-b",
        directImageCount: 3,
        descendantNodeCount: 4,
        descendantPackageCount: 3,
        descendantImageCount: 6,
        children: [
          {
            id: "package:A/B/1.zip",
            label: "1.zip",
            kind: "package",
            packageId: "pkg-b-1",
            imageSourceId: "pkg-b-1",
            pathKey: "A/B/1.zip",
            imageNodeType: "package",
            directImageCount: 1,
            descendantNodeCount: 1,
            descendantPackageCount: 1,
            descendantImageCount: 1,
            children: [],
          },
          {
            id: "package:A/B/2.zip",
            label: "2.zip",
            kind: "package",
            packageId: "pkg-b-2",
            imageSourceId: "pkg-b-2",
            pathKey: "A/B/2.zip",
            imageNodeType: "package",
            directImageCount: 1,
            descendantNodeCount: 1,
            descendantPackageCount: 1,
            descendantImageCount: 1,
            children: [],
          },
          {
            id: "package:A/B/3.zip",
            label: "3.zip",
            kind: "package",
            packageId: "pkg-b-3",
            imageSourceId: "pkg-b-3",
            pathKey: "A/B/3.zip",
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
        id: "folder:A/C",
        label: "C",
        kind: "folder",
        pathKey: "A/C",
        imageNodeType: "directory",
        imageSourceId: "dir-c",
        directImageCount: 4,
        descendantNodeCount: 5,
        descendantPackageCount: 4,
        descendantImageCount: 8,
        children: [
          {
            id: "package:A/C/1.zip",
            label: "1.zip",
            kind: "package",
            packageId: "pkg-c-1",
            imageSourceId: "pkg-c-1",
            pathKey: "A/C/1.zip",
            imageNodeType: "package",
            directImageCount: 1,
            descendantNodeCount: 1,
            descendantPackageCount: 1,
            descendantImageCount: 1,
            children: [],
          },
          {
            id: "package:A/C/2.zip",
            label: "2.zip",
            kind: "package",
            packageId: "pkg-c-2",
            imageSourceId: "pkg-c-2",
            pathKey: "A/C/2.zip",
            imageNodeType: "package",
            directImageCount: 1,
            descendantNodeCount: 1,
            descendantPackageCount: 1,
            descendantImageCount: 1,
            children: [],
          },
          {
            id: "package:A/C/3.zip",
            label: "3.zip",
            kind: "package",
            packageId: "pkg-c-3",
            imageSourceId: "pkg-c-3",
            pathKey: "A/C/3.zip",
            imageNodeType: "package",
            directImageCount: 1,
            descendantNodeCount: 1,
            descendantPackageCount: 1,
            descendantImageCount: 1,
            children: [],
          },
          {
            id: "package:A/C/4.zip",
            label: "4.zip",
            kind: "package",
            packageId: "pkg-c-4",
            imageSourceId: "pkg-c-4",
            pathKey: "A/C/4.zip",
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
];

function renderMusicSidebar(
  overrides: Partial<ComponentProps<typeof SidebarPanel>> = {},
) {
  const onSelectAudio = vi.fn();
  const onSelectNode = vi.fn();
  const onToggleManageNode = vi.fn();
  const onClearSidebarSelection = vi.fn();

  render(
    <SidebarPanel
      mode="music"
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
      audioTreeNodes={AUDIO_TREE_FIXTURE}
      selectedPackageId=""
      selectedVideoId=""
      selectedAudioId="audio-1"
      playlistIds={[]}
      audioPlaylistIds={[]}
      onSelectNode={onSelectNode}
      onSelectPackage={vi.fn()}
      onSelectVideo={vi.fn()}
      onSelectAudio={onSelectAudio}
      onCollapseSidebar={vi.fn()}
      onSetCurrentRoot={vi.fn()}
      onGoToFromSearchMode={vi.fn()}
      onResetRoot={vi.fn()}
      onToggleVideoPlaylist={vi.fn()}
      onToggleAudioPlaylist={vi.fn()}
      onClearSidebarSelection={onClearSidebarSelection}
      onToggleManageNode={onToggleManageNode}
      {...overrides}
    />,
  );

  return {
    onSelectAudio,
    onSelectNode,
    onToggleManageNode,
    onClearSidebarSelection,
  };
}

function renderImageSidebar(
  nodes: SidebarNode[],
  overrides: Partial<ComponentProps<typeof SidebarPanel>> = {},
) {
  const onSelectNode = vi.fn();
  const onSelectPackage = vi.fn();
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
      onCollapseSidebar={vi.fn()}
      onSetCurrentRoot={vi.fn()}
      onGoToFromSearchMode={vi.fn()}
      onResetRoot={vi.fn()}
      onToggleVideoPlaylist={vi.fn()}
      onToggleAudioPlaylist={vi.fn()}
      onToggleManageNode={vi.fn()}
      {...overrides}
    />,
  );

  return {
    ...result,
    onSelectNode,
    onSelectPackage,
  };
}

function renderVideoSidebar(nodes: SidebarNode[]) {
  render(
    <SidebarPanel
      mode="video"
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
      videoTreeNodes={nodes}
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
    />,
  );
}

describe("SidebarPanel music interactions", () => {
  it("点击音乐文件夹节点会定位到该节点下第一首音频", () => {
    const { onSelectAudio, onSelectNode } = renderMusicSidebar();

    fireEvent.click(screen.getByRole("button", { name: "Album A" }));

    expect(onSelectNode).toHaveBeenCalledWith("folder:X盘/Album A");
    expect(onSelectAudio).toHaveBeenCalledWith("audio-1");
  });

  it("音乐模式目录节点显示文件夹数，曲目目录显示曲目数", () => {
    renderMusicSidebar();

    expect(screen.getByLabelText("夹 1")).toBeInTheDocument();
    expect(screen.getByLabelText("曲 2")).toBeInTheDocument();
  });

  it("元数据管理模式下点击节点标签会切换勾选并同步导航", () => {
    const { onSelectAudio, onSelectNode, onToggleManageNode } =
      renderMusicSidebar({ metadataManageMode: true });

    fireEvent.click(screen.getByRole("button", { name: "Album A" }));

    expect(onToggleManageNode).toHaveBeenCalledWith(
      "folder:X盘/Album A",
      false,
    );
    expect(onSelectNode).toHaveBeenCalledWith("folder:X盘/Album A");
    expect(onSelectAudio).toHaveBeenCalledWith("audio-1");
    expect(
      document.querySelectorAll(".sidebar-row.is-manage").length,
    ).toBeGreaterThan(0);
  });

  it("元数据管理单选模式下点击节点标签仅同步单选目标与导航", () => {
    const onSelectMetadataSingleNode = vi.fn();
    const { onSelectAudio, onSelectNode, onToggleManageNode } =
      renderMusicSidebar({
        metadataManageMode: true,
        metadataManageSelectionMode: "single",
        onSelectMetadataSingleNode,
      });

    fireEvent.click(screen.getByRole("button", { name: "Album A" }));

    expect(onToggleManageNode).not.toHaveBeenCalled();
    expect(onSelectMetadataSingleNode).toHaveBeenCalledWith(
      "folder:X盘/Album A",
    );
    expect(onSelectNode).toHaveBeenCalledWith("folder:X盘/Album A");
    expect(onSelectAudio).toHaveBeenCalledWith("audio-1");
  });

  it("管理模式下点击节点标签仅切换勾选，不触发导航", () => {
    const { onSelectAudio, onSelectNode, onToggleManageNode } =
      renderMusicSidebar({ manageMode: true });

    fireEvent.click(screen.getByRole("button", { name: "Album A" }));

    expect(onToggleManageNode).toHaveBeenCalledWith(
      "folder:X盘/Album A",
      false,
    );
    expect(onSelectNode).not.toHaveBeenCalled();
    expect(onSelectAudio).not.toHaveBeenCalled();
  });

  it("管理模式下支持 shift 点击范围选择", () => {
    const { onToggleManageNode } = renderMusicSidebar({ manageMode: true });

    fireEvent.click(screen.getByRole("button", { name: "X盘" }));
    onToggleManageNode.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Album A" }), {
      shiftKey: true,
    });
    expect(onToggleManageNode).toHaveBeenCalledWith("folder:X盘/Album A", true);
  });

  it("管理模式下侧栏头部显示清空选择按钮并仅清空侧栏勾选", () => {
    const { onClearSidebarSelection } = renderMusicSidebar({
      manageMode: true,
      checkedSidebarNodeIds: new Set<string>(["folder:X盘/Album A"]),
    });

    fireEvent.click(screen.getByRole("button", { name: /清.*选/ }));

    expect(onClearSidebarSelection).toHaveBeenCalledTimes(1);
  });

  it("元数据管理模式下侧栏头部同样显示清空选择按钮", () => {
    const { onClearSidebarSelection } = renderMusicSidebar({
      metadataManageMode: true,
      checkedSidebarNodeIds: new Set<string>(["folder:X盘/Album A"]),
    });

    fireEvent.click(screen.getByRole("button", { name: /清.*选/ }));

    expect(onClearSidebarSelection).toHaveBeenCalledTimes(1);
  });

  it("音乐模式目录节点支持双击折叠/展开", () => {
    renderMusicSidebar();

    expect(screen.getByRole("button", { name: "Album A" })).toBeInTheDocument();

    fireEvent.doubleClick(screen.getByRole("button", { name: "X盘" }));
    expect(screen.queryByRole("button", { name: "Album A" })).toBeNull();

    fireEvent.doubleClick(screen.getByRole("button", { name: "X盘" }));
    expect(screen.getByRole("button", { name: "Album A" })).toBeInTheDocument();
  });

  it("音乐模式折叠指针仅隐藏直属专辑，保留下级指针", () => {
    const pointerTree: SidebarNode[] = [
      {
        id: "folder:X盘/Music",
        label: "X盘/Music",
        kind: "folder",
        pathKey: "X盘/Music",
        directAudioCount: 0,
        descendantAudioFolderCount: 3,
        descendantNodeCount: 4,
        children: [
          {
            id: "folder:X盘/Music/Album A",
            label: "Album A",
            kind: "folder",
            pathKey: "X盘/Music/Album A",
            directAudioCount: 2,
            descendantAudioFolderCount: 1,
            descendantNodeCount: 1,
            audioId: "audio-1",
            children: [],
          },
          {
            id: "folder:X盘/Music/Sub",
            label: "X盘/Music/Sub",
            kind: "folder",
            pathKey: "X盘/Music/Sub",
            directAudioCount: 0,
            descendantAudioFolderCount: 1,
            descendantNodeCount: 2,
            children: [
              {
                id: "folder:X盘/Music/Sub/Album B",
                label: "Album B",
                kind: "folder",
                pathKey: "X盘/Music/Sub/Album B",
                directAudioCount: 1,
                descendantAudioFolderCount: 1,
                descendantNodeCount: 1,
                audioId: "audio-2",
                children: [],
              },
            ],
          },
        ],
      },
    ];

    renderMusicSidebar({
      audioTreeNodes: pointerTree,
      selectedAudioId: "audio-1",
    });

    expect(screen.queryByLabelText("夹 3")).toBeNull();

    fireEvent.doubleClick(screen.getByRole("button", { name: "X盘/Music" }));

    expect(screen.queryByRole("button", { name: "Album A" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "X盘/Music/Sub" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Album B" })).toBeInTheDocument();
  });
});

describe("SidebarPanel image collapse interactions", () => {
  it("元数据管理模式下点击图片节点会切换勾选并同步包选择", () => {
    const onToggleManageNode = vi.fn();
    const { onSelectNode, onSelectPackage } = renderImageSidebar(
      IMAGE_TREE_COLLAPSIBLE_FIXTURE,
      {
        metadataManageMode: true,
        onToggleManageNode,
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "Vol.1" }));

    expect(onToggleManageNode).toHaveBeenCalledWith(
      "package:图库/Vol.1",
      false,
    );
    expect(onSelectNode).toHaveBeenCalledWith("package:图库/Vol.1");
    expect(onSelectPackage).toHaveBeenCalledWith("pkg-1");
  });

  it("元数据管理单选模式下点击图片节点只同步单选目标与包选择", () => {
    const onToggleManageNode = vi.fn();
    const onSelectMetadataSingleNode = vi.fn();
    const { onSelectNode, onSelectPackage } = renderImageSidebar(
      IMAGE_TREE_COLLAPSIBLE_FIXTURE,
      {
        metadataManageMode: true,
        metadataManageSelectionMode: "single",
        onToggleManageNode,
        onSelectMetadataSingleNode,
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "Vol.1" }));

    expect(onToggleManageNode).not.toHaveBeenCalled();
    expect(onSelectMetadataSingleNode).toHaveBeenCalledWith(
      "package:图库/Vol.1",
    );
    expect(onSelectNode).toHaveBeenCalledWith("package:图库/Vol.1");
    expect(onSelectPackage).toHaveBeenCalledWith("pkg-1");
  });

  it("处理中图片节点点击仅聚焦，不触发包切换", () => {
    const { onSelectNode, onSelectPackage } = renderImageSidebar(
      IMAGE_TREE_COLLAPSIBLE_FIXTURE,
      {
        imageNodeLoadStateById: {
          "package:图库/Vol.1": "running",
        },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "Vol.1" }));

    expect(onSelectNode).toHaveBeenCalledWith("package:图库/Vol.1");
    expect(onSelectPackage).not.toHaveBeenCalled();
    expect(screen.getByText("...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vol.1" })).toHaveAttribute(
      "data-tooltip-label",
      "归一化处理中，暂不可预览",
    );
  });

  it("双击无自身图片的目录节点可折叠/展开子节点", () => {
    renderImageSidebar(IMAGE_TREE_COLLAPSIBLE_FIXTURE);

    expect(screen.getByRole("button", { name: "Vol.1" })).toBeInTheDocument();

    fireEvent.doubleClick(screen.getByRole("button", { name: "图库" }));
    expect(screen.queryByRole("button", { name: "Vol.1" })).toBeNull();

    fireEvent.doubleClick(screen.getByRole("button", { name: "图库" }));
    expect(screen.getByRole("button", { name: "Vol.1" })).toBeInTheDocument();
  });

  it("折叠指针节点时仅隐藏直属媒体，保留下级指针与其内容", () => {
    renderImageSidebar(IMAGE_TREE_POINTER_COLLAPSE_FIXTURE);

    expect(screen.getByLabelText("节点 3")).toBeInTheDocument();
    expect(screen.queryByLabelText("节点 8")).toBeNull();
    expect(screen.getByRole("button", { name: "1.zip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2.zip" })).toBeInTheDocument();

    fireEvent.doubleClick(screen.getByRole("button", { name: "D:/Gallery" }));

    expect(screen.queryByRole("button", { name: "1.zip" })).toBeNull();
    expect(screen.queryByRole("button", { name: "A.zip" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Octosoup.zip" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "D:/Gallery/cool" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2.zip" })).toBeInTheDocument();

    fireEvent.doubleClick(
      screen.getByRole("button", { name: "D:/Gallery/cool" }),
    );

    expect(screen.queryByRole("button", { name: "2.zip" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "D:/Gallery/cool/cooler" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3.zip" })).toBeInTheDocument();
  });

  it("层级模式下折叠目录会隐藏整个子树", () => {
    renderImageSidebar(IMAGE_TREE_POINTER_COLLAPSE_FIXTURE, {
      sidebarTreeDisplayMode: "hierarchy",
    });

    fireEvent.doubleClick(screen.getByRole("button", { name: "D:/Gallery" }));

    expect(screen.queryByRole("button", { name: "1.zip" })).toBeNull();
    expect(screen.queryByRole("button", { name: "A.zip" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Octosoup.zip" })).toBeNull();
    expect(
      screen.queryByRole("button", { name: "D:/Gallery/cool" }),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "2.zip" })).toBeNull();
  });

  it("含图目录会计入父级直属媒体并随折叠隐藏", () => {
    renderImageSidebar(IMAGE_TREE_DIRECTORY_WITH_COVER_CHILDREN_FIXTURE);

    expect(screen.getByLabelText("节点 2")).toBeInTheDocument();

    fireEvent.doubleClick(screen.getByRole("button", { name: "A" }));

    expect(screen.queryByRole("button", { name: "B" })).toBeNull();
    expect(screen.queryByRole("button", { name: "C" })).toBeNull();
  });

  it("自身包含图片的目录节点双击不触发折叠", () => {
    renderImageSidebar(IMAGE_TREE_DIRECTORY_FIXTURE);

    fireEvent.doubleClick(screen.getByRole("button", { name: "目录源" }));
    expect(screen.getByRole("button", { name: "Extra" })).toBeInTheDocument();
  });

  it("视频模式目录节点支持双击折叠/展开", () => {
    const videoTree: SidebarNode[] = [
      {
        id: "folder:Videos",
        label: "Videos",
        kind: "folder",
        pathKey: "Videos",
        children: [
          {
            id: "video:Videos/clip.mp4",
            label: "clip.mp4",
            kind: "video",
            videoId: "video-1",
            pathKey: "Videos/clip.mp4",
            children: [],
          },
        ],
      },
    ];

    renderVideoSidebar(videoTree);

    expect(
      screen.getByRole("button", { name: "clip.mp4" }),
    ).toBeInTheDocument();

    fireEvent.doubleClick(screen.getByRole("button", { name: "Videos" }));
    expect(screen.queryByRole("button", { name: "clip.mp4" })).toBeNull();

    fireEvent.doubleClick(screen.getByRole("button", { name: "Videos" }));
    expect(
      screen.getByRole("button", { name: "clip.mp4" }),
    ).toBeInTheDocument();
  });

  it("视频模式可折叠目录显示直属媒体计数", () => {
    const videoTree: SidebarNode[] = [
      {
        id: "folder:Videos",
        label: "Videos",
        kind: "folder",
        pathKey: "Videos",
        children: [
          {
            id: "video:Videos/clip.mp4",
            label: "clip.mp4",
            kind: "video",
            videoId: "video-1",
            pathKey: "Videos/clip.mp4",
            children: [],
          },
        ],
      },
    ];

    renderVideoSidebar(videoTree);

    expect(screen.getByLabelText("节点 1")).toBeInTheDocument();
  });

  it("视频模式折叠指针仅隐藏直属视频，保留下级指针", () => {
    const videoTree: SidebarNode[] = [
      {
        id: "folder:Videos",
        label: "Videos",
        kind: "folder",
        pathKey: "Videos",
        children: [
          {
            id: "video:Videos/clip.mp4",
            label: "clip.mp4",
            kind: "video",
            videoId: "video-1",
            pathKey: "Videos/clip.mp4",
            children: [],
          },
          {
            id: "folder:Videos/Sub",
            label: "Videos/Sub",
            kind: "folder",
            pathKey: "Videos/Sub",
            children: [
              {
                id: "video:Videos/Sub/sub.mp4",
                label: "sub.mp4",
                kind: "video",
                videoId: "video-2",
                pathKey: "Videos/Sub/sub.mp4",
                children: [],
              },
            ],
          },
        ],
      },
    ];

    renderVideoSidebar(videoTree);

    fireEvent.doubleClick(screen.getByRole("button", { name: "Videos" }));

    expect(screen.queryByRole("button", { name: "clip.mp4" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Videos/Sub" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "sub.mp4" })).toBeInTheDocument();
  });

  it("管理模式下双击可折叠目录", () => {
    const onToggleManageNode = vi.fn();
    renderImageSidebar(IMAGE_TREE_COLLAPSIBLE_FIXTURE, {
      manageMode: true,
      onToggleManageNode,
    });

    fireEvent.doubleClick(screen.getByRole("button", { name: "图库" }));

    expect(screen.queryByRole("button", { name: "Vol.1" })).toBeNull();
    expect(onToggleManageNode).not.toHaveBeenCalled();

    fireEvent.doubleClick(screen.getByRole("button", { name: "图库" }));
    expect(screen.getByRole("button", { name: "Vol.1" })).toBeInTheDocument();
    expect(onToggleManageNode).not.toHaveBeenCalled();
  });
});
