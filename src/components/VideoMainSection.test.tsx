import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { VideoItem } from "../types";
import VideoMainSection from "./VideoMainSection";

function createVideo(id: string, fileName: string): VideoItem {
  return {
    id,
    fileName,
    absolutePath: `C:/videos/${fileName}`,
    treePath: ["videos", fileName],
    durationSec: 120,
    width: 1920,
    height: 1080,
    sizeMb: 64,
    coverColor: "#123456",
    coverImagePath: null,
    workTitle: fileName.replace(/\.mp4$/i, ""),
    circle: "circle",
    author: "author",
    tags: [],
    grade: null,
    mediaLocator: {
      kind: "filesystem",
      absolutePath: `C:/videos/${fileName}`,
      extension: ".mp4",
      mediaType: "video",
      mimeType: "video/mp4",
    },
  };
}

function buildProps(
  overrides: Partial<ComponentProps<typeof VideoMainSection>> = {},
): ComponentProps<typeof VideoMainSection> {
  const focusedVideo = createVideo("video-a", "a.mp4");
  return {
    manageMode: false,
    metadataManageMode: false,
    metadataManageSelectionMode: "multiple",
    sidebarSelectedCount: 0,
    imageSelectedCount: 0,
    activeSelectionScope: null,
    pendingManageAction: false,
    manageOperationHint: null,
    canManageDelete: false,
    canManageMoveNodes: false,
    canManageAddToPlaylist: false,
    nodeBrowseMode: true,
    nodeBrowseLabel: "Videos",
    nodeBrowseItems: [
      {
        nodeId: "video:Videos/a.mp4",
        videoId: "video-a",
        label: "a.mp4",
        coverImageUrl: null,
      },
      {
        nodeId: "video:Videos/b.mp4",
        videoId: "video-b",
        label: "b.mp4",
        coverImageUrl: null,
      },
    ],
    nodeBrowsePageStart: 0,
    nodeBrowsePageSize: 12,
    thumbnailColumns: 3,
    actualCellWidth: 140,
    thumbnailGap: 10,
    thumbnailScaleLevelCount: 9,
    displayThumbnailScaleLevel: 4,
    canThumbnailScaleDown: true,
    canThumbnailScaleUp: true,
    onThumbnailScaleLevelChange: vi.fn(),
    onGridElementChange: undefined,
    onPreviewNodeBrowseItem: vi.fn(),
    onActivateNodeBrowseItem: vi.fn(),
    canManageHide: false,
    canManageUnhide: false,
    onManageDelete: vi.fn(),
    onManageRename: vi.fn(),
    onManageGroup: vi.fn(),
    onManageMove: vi.fn(),
    onManageAddToPlaylist: vi.fn(),
    onManageHide: vi.fn(),
    onManageUnhide: vi.fn(),
    onClearManageSelection: vi.fn(),
    metadataPending: false,
    onMetadataSyncName: vi.fn(),
    onToggleMetadataManageSelectionMode: vi.fn(),
    canJumpToManga: false,
    canJumpToMusic: false,
    onJumpToManga: vi.fn(),
    onJumpToMusic: vi.fn(),
    durationSec: 0,
    videoTime: 0,
    videoPlaying: false,
    videoRate: 1,
    videoVolume: 60,
    videoMuted: false,
    videoFitMode: "contain",
    videoLoopMode: "list",
    videoLoopModeLabel: "list",
    mediaPreloadMemoryBudgetMb: 128,
    videoPreloadItems: [],
    videoSourceUrl: null,
    popoverDebugPinned: false,
    subtitleTrackUrl: null,
    subtitleVisible: false,
    subtitleLoading: false,
    subtitleMessage: null,
    subtitleOptions: [],
    selectedSubtitleId: null,
    autoSubtitleActive: false,
    liveSubtitleText: null,
    subtitleOverlayStyle: {},
    bindVideoElement: vi.fn(),
    onRequestMainFocus: vi.fn(),
    fullscreenActive: false,
    coverImageUrl: null,
    focusedVideo,
    subtitleCleanupVideoId: focusedVideo.id,
    subtitleCleanupLlmEndpoint: "",
    subtitleCleanupLlmModel: "",
    subtitleCleanupLlmPrompt: "",
    onSubtitleCleanupSaved: vi.fn(),
    onSubtitleCleanupLlmEndpointChange: vi.fn(),
    onSubtitleCleanupLlmModelChange: vi.fn(),
    active: true,
    onTogglePlay: vi.fn(),
    onPrevVideo: vi.fn(),
    onNextVideo: vi.fn(),
    onVideoEnded: vi.fn(),
    onSeekVideo: vi.fn(),
    onSeekCommitted: vi.fn(),
    onVideoTimeUpdate: vi.fn(),
    onVideoDurationDetected: vi.fn(),
    onToggleMute: vi.fn(),
    onToggleSubtitle: vi.fn(),
    onSelectSubtitle: vi.fn(),
    onChangeVolume: vi.fn(),
    onChangeRate: vi.fn(),
    onCycleVideoLoopMode: vi.fn(),
    onCycleVideoFitMode: vi.fn(),
    onSetVideoFitMode: vi.fn(),
    onSaveCover: vi.fn(),
    onSaveCoverAtTime: vi.fn(),
    onEnterFullscreen: vi.fn(),
    ...overrides,
  };
}

describe("VideoMainSection 节点浏览交互", () => {
  it("单击仅预览，双击与 Enter/Space 才激活播放", () => {
    const onPreviewNodeBrowseItem = vi.fn();
    const onActivateNodeBrowseItem = vi.fn();

    render(
      <VideoMainSection
        {...buildProps({
          onPreviewNodeBrowseItem,
          onActivateNodeBrowseItem,
        })}
      />,
    );

    const firstCardButton = screen.getByRole("button", {
      name: "Videos / a.mp4",
    });
    const secondCardButton = screen.getByRole("button", {
      name: "Videos / b.mp4",
    });
    const grid = document.querySelector(
      '[data-slot="fg-main-content-image-node-grid"]',
    ) as HTMLDivElement;

    fireEvent.click(firstCardButton);
    expect(onPreviewNodeBrowseItem).toHaveBeenCalledWith(
      "video:Videos/a.mp4",
      "video-a",
    );
    expect(onActivateNodeBrowseItem).not.toHaveBeenCalled();

    fireEvent.keyDown(grid, { key: "ArrowRight", code: "ArrowRight" });
    expect(onPreviewNodeBrowseItem).toHaveBeenLastCalledWith(
      "video:Videos/b.mp4",
      "video-b",
    );
    expect(onActivateNodeBrowseItem).not.toHaveBeenCalled();

    fireEvent.doubleClick(secondCardButton);
    expect(onActivateNodeBrowseItem).toHaveBeenCalledWith(
      "video:Videos/b.mp4",
      "video-b",
    );
    const activateCountAfterDoubleClick =
      onActivateNodeBrowseItem.mock.calls.length;

    fireEvent.keyDown(firstCardButton, { key: "Enter", code: "Enter" });
    const activateCountAfterEnter = onActivateNodeBrowseItem.mock.calls.length;
    fireEvent.keyDown(firstCardButton, { key: " ", code: "Space" });
    const activateCountAfterSpace = onActivateNodeBrowseItem.mock.calls.length;
    expect(onActivateNodeBrowseItem).toHaveBeenCalledWith(
      "video:Videos/a.mp4",
      "video-a",
    );
    expect(activateCountAfterEnter).toBeGreaterThan(
      activateCountAfterDoubleClick,
    );
    expect(activateCountAfterSpace).toBeGreaterThan(activateCountAfterEnter);
  });

  it("节点浏览网格挂载时上报元素，卸载时清空", () => {
    const onGridElementChange = vi.fn();
    const { unmount } = render(
      <VideoMainSection
        {...buildProps({
          onGridElementChange,
        })}
      />,
    );

    expect(onGridElementChange).toHaveBeenCalled();
    expect(onGridElementChange.mock.calls[0]?.[0]).toBeInstanceOf(
      HTMLDivElement,
    );

    unmount();
    expect(onGridElementChange.mock.calls.at(-1)?.[0]).toBeNull();
  });

  it("管理模式打开视频转码面板后应按已选视频触发体积预估", async () => {
    const readVideoTranscodeCapabilities = vi.fn().mockResolvedValue({
      ffmpeg_available: true,
      ffprobe_available: true,
      containers: {
        mp4: { available: true, required_muxer: "mp4" },
        mkv: { available: true, required_muxer: "matroska" },
        webm: { available: true, required_muxer: "webm" },
      },
      video_codecs: {
        h264: { available: true, required_encoder: "libx264" },
        h265: { available: true, required_encoder: "libx265" },
        vp9: { available: true, required_encoder: "libvpx-vp9" },
        av1: { available: true, required_encoder: "libaom-av1" },
        copy: { available: true, required_encoder: "copy" },
      },
      checked_at_ms: Date.now(),
    });
    const estimateVideoTranscodeOutputSize = vi.fn().mockResolvedValue({
      source_total_bytes: 1024,
      estimated_bytes: 512,
      method: "crf_heuristic",
      confidence: "medium",
      range: { low_bytes: 480, high_bytes: 560 },
      details: { video_ids: ["video-a", "video-b"] },
    });

    (window as Window & { mediaPlayerBackend?: unknown }).mediaPlayerBackend = {
      readVideoTranscodeCapabilities,
      estimateVideoTranscodeOutputSize,
    } as unknown as NonNullable<Window["mediaPlayerBackend"]>;

    render(
      <VideoMainSection
        {...buildProps({
          manageMode: true,
          activeSelectionScope: "sidebar",
          sidebarSelectedCount: 2,
          manageSelectedVideoIds: ["video-a", "video-b"],
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "视频转码" }));

    await waitFor(() => {
      expect(estimateVideoTranscodeOutputSize).toHaveBeenCalledWith({
        video_ids: ["video-a", "video-b"],
        params_override: {
          container: "mp4",
          video_codec: "h264",
          quality_mode: "crf",
          crf: 23,
          encoder_preset: "medium",
          audio_mode: "copy",
          faststart: true,
        },
      });
    });
  });

  it("视频转码开始时应提交管理模式视频ID与默认参数", async () => {
    const readVideoTranscodeCapabilities = vi.fn().mockResolvedValue({
      ffmpeg_available: true,
      ffprobe_available: true,
      containers: {
        mp4: { available: true, required_muxer: "mp4" },
        mkv: { available: true, required_muxer: "matroska" },
        webm: { available: true, required_muxer: "webm" },
      },
      video_codecs: {
        h264: { available: true, required_encoder: "libx264" },
        h265: { available: true, required_encoder: "libx265" },
        vp9: { available: true, required_encoder: "libvpx-vp9" },
        av1: { available: true, required_encoder: "libaom-av1" },
        copy: { available: true, required_encoder: "copy" },
      },
      checked_at_ms: Date.now(),
    });
    const startVideoTranscodeTask = vi.fn().mockResolvedValue({
      task: {
        task_id: "video-transcode-1",
        status: "pending",
        progress: 0,
        total_count: 2,
        processed_count: 0,
        success_count: 0,
        failed_count: 0,
        output_files: [],
        message: null,
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    });

    (window as Window & { mediaPlayerBackend?: unknown }).mediaPlayerBackend = {
      readVideoTranscodeCapabilities,
      estimateVideoTranscodeOutputSize: vi.fn().mockResolvedValue({
        source_total_bytes: 1024,
        estimated_bytes: 512,
        method: "crf_heuristic",
        confidence: "medium",
        range: null,
        details: {},
      }),
      startVideoTranscodeTask,
    } as unknown as NonNullable<Window["mediaPlayerBackend"]>;

    render(
      <VideoMainSection
        {...buildProps({
          manageMode: true,
          activeSelectionScope: "sidebar",
          sidebarSelectedCount: 2,
          manageSelectedVideoIds: ["video-a", "video-b"],
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "视频转码" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "开始" })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "开始" }));

    await waitFor(() => {
      expect(startVideoTranscodeTask).toHaveBeenCalledWith({
        video_ids: ["video-a", "video-b"],
        params_override: {
          container: "mp4",
          video_codec: "h264",
          quality_mode: "crf",
          crf: 23,
          encoder_preset: "medium",
          audio_mode: "copy",
          faststart: true,
        },
        overwrite: false,
        add_output_to_sources: true,
      });
    });
  });

  it("视频转码完成后应可打开输出目录", async () => {
    const readVideoTranscodeCapabilities = vi.fn().mockResolvedValue({
      ffmpeg_available: true,
      ffprobe_available: true,
      containers: {
        mp4: { available: true, required_muxer: "mp4" },
        mkv: { available: true, required_muxer: "matroska" },
        webm: { available: true, required_muxer: "webm" },
      },
      video_codecs: {
        h264: { available: true, required_encoder: "libx264" },
        h265: { available: true, required_encoder: "libx265" },
        vp9: { available: true, required_encoder: "libvpx-vp9" },
        av1: { available: true, required_encoder: "libaom-av1" },
        copy: { available: true, required_encoder: "copy" },
      },
      default_output_dir: "C:/media/library/transcoded/video",
      checked_at_ms: Date.now(),
    });
    const startVideoTranscodeTask = vi.fn().mockResolvedValue({
      task: {
        task_id: "video-transcode-2",
        status: "completed",
        progress: 1,
        total_count: 1,
        processed_count: 1,
        success_count: 1,
        failed_count: 0,
        output_files: ["D:/Video/output.mp4"],
        message: "done",
        error_detail: null,
        created_at_ms: Date.now(),
        updated_at_ms: Date.now(),
      },
    });
    const openExternalUrl = vi.fn().mockResolvedValue({ ok: true });

    (window as Window & { mediaPlayerBackend?: unknown }).mediaPlayerBackend = {
      readVideoTranscodeCapabilities,
      estimateVideoTranscodeOutputSize: vi.fn().mockResolvedValue({
        source_total_bytes: 1024,
        estimated_bytes: 512,
        method: "crf_heuristic",
        confidence: "medium",
        range: null,
        details: {},
      }),
      startVideoTranscodeTask,
      openExternalUrl,
    } as unknown as NonNullable<Window["mediaPlayerBackend"]>;

    render(
      <VideoMainSection
        {...buildProps({
          manageMode: true,
          activeSelectionScope: "sidebar",
          sidebarSelectedCount: 1,
          manageSelectedVideoIds: ["video-a"],
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "视频转码" }));
    fireEvent.click(screen.getByRole("button", { name: "开始" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "打开输出目录" }),
      ).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: "打开输出目录" }));

    await waitFor(() => {
      expect(openExternalUrl).toHaveBeenCalledWith({
        url: "file:///C:/media/library/transcoded/video",
      });
    });
  });

  it("非激活状态下不会通过隐藏视频回写播放进度或触发自动封面抓帧", async () => {
    const onVideoTimeUpdate = vi.fn();
    const onSaveCoverAtTime = vi.fn();

    render(
      <VideoMainSection
        {...buildProps({
          nodeBrowseMode: false,
          videoSourceUrl: "file:///C:/videos/a.mp4",
          active: false,
          fullscreenActive: true,
          onVideoTimeUpdate,
          onSaveCoverAtTime,
        })}
      />,
    );

    const video = document.querySelector(".video-screen-media") as
      | HTMLVideoElement
      | null;
    expect(video).not.toBeNull();

    if (video) {
      video.currentTime = 12.34;
      fireEvent.timeUpdate(video);
      fireEvent.seeked(video);
    }

    expect(onVideoTimeUpdate).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(onSaveCoverAtTime).not.toHaveBeenCalled();
    });
  });
});
