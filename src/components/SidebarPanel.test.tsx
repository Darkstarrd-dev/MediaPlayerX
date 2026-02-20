import type { ComponentProps } from "react";
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
  return render(
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
      {...overrides}
    />,
  );
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

  it("元数据管理模式下点击节点标签仅切换勾选并保留管理样式", () => {
    const { onSelectAudio, onSelectNode, onToggleManageNode } =
      renderMusicSidebar({ metadataManageMode: true });

    fireEvent.click(screen.getByRole("button", { name: "Album A" }));

    expect(onToggleManageNode).toHaveBeenCalledWith(
      "folder:X盘/Album A",
      false,
    );
    expect(onSelectNode).not.toHaveBeenCalled();
    expect(onSelectAudio).not.toHaveBeenCalled();
    expect(
      document.querySelectorAll(".sidebar-row.is-manage").length,
    ).toBeGreaterThan(0);
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
    expect(onToggleManageNode).toHaveBeenCalledWith(
      "folder:X盘/Album A",
      true,
    );
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
});

describe("SidebarPanel image collapse interactions", () => {
  it("双击无自身图片的目录节点可折叠/展开子节点", () => {
    renderImageSidebar(IMAGE_TREE_COLLAPSIBLE_FIXTURE);

    expect(screen.getByRole("button", { name: "Vol.1" })).toBeInTheDocument();

    fireEvent.doubleClick(screen.getByRole("button", { name: "图库" }));
    expect(screen.queryByRole("button", { name: "Vol.1" })).toBeNull();

    fireEvent.doubleClick(screen.getByRole("button", { name: "图库" }));
    expect(screen.getByRole("button", { name: "Vol.1" })).toBeInTheDocument();
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
});
