import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";

import type { ImageItem, ImagePackage } from "../types";
import MetadataPanel from "./MetadataPanel";

function createImage(id: string): ImageItem {
  return {
    id,
    ordinal: 1,
    width: 100,
    height: 100,
    sizeKb: 10,
    cluster: 0,
    color: "#000000",
    mediaLocator: {
      kind: "filesystem",
      absolutePath: `C:/images/${id}.jpg`,
      extension: ".jpg",
      mediaType: "image",
      mimeType: "image/jpeg",
    },
  };
}

function createPackage(id: string): ImagePackage {
  const image = createImage(`img-${id}`);
  return {
    id: `pkg-${id}`,
    packageName: `pkg-${id}.zip`,
    displayName: `pkg-${id}`,
    absolutePath: `C:/packages/pkg-${id}.zip`,
    treePath: ["C:", "packages", `pkg-${id}.zip`],
    workTitle: `work-${id}`,
    circle: "circle",
    author: "author",
    tags: [],
    images: [image],
  };
}

function createVideo(id: string) {
  return {
    id,
    fileName: `${id}.mp4`,
    absolutePath: `C:/videos/${id}.mp4`,
    treePath: ["C:", "videos", `${id}.mp4`],
    durationSec: 10,
    width: 1920,
    height: 1080,
    sizeMb: 42,
    coverColor: "hsl(220, 40%, 50%)",
    coverImagePath: null,
    workTitle: id,
    circle: "circle",
    author: "author",
    tags: [],
    grade: null,
    mediaLocator: {
      kind: "filesystem" as const,
      absolutePath: `C:/videos/${id}.mp4`,
      extension: ".mp4",
      mediaType: "video" as const,
      mimeType: "video/mp4",
    },
  };
}

function createBaseProps(
  overrides: Partial<ComponentProps<typeof MetadataPanel>> = {},
): ComponentProps<typeof MetadataPanel> {
  const pkg = createPackage("a");
  return {
    mode: "image",
    manageMode: false,
    searchModeActive: false,
    featureResultCount: 0,
    featureNameQuery: "",
    onFeatureNameQueryChange: vi.fn(),
    featureWorkTitleQuery: "",
    onFeatureWorkTitleQueryChange: vi.fn(),
    featureCircleQuery: "",
    onFeatureCircleQueryChange: vi.fn(),
    featureAuthorQuery: "",
    onFeatureAuthorQueryChange: vi.fn(),
    featureCircleOptions: [],
    featureAuthorOptions: [],
    featureTagOptions: [],
    featureTagPickerOpen: false,
    onToggleFeatureTagPicker: vi.fn(),
    featureTags: [],
    onSetFeatureTags: vi.fn(),
    onClearFeatureTags: vi.fn(),
    featureGradeFilter: null,
    onFeatureGradeFilterChange: vi.fn(),
    adReviewFeatureVisible: false,
    adReviewPanelOpen: false,
    canExecuteAdReview: false,
    adReviewPending: false,
    adReviewTask: null,
    adReviewQueueTasks: [],
    adReviewActiveTaskId: null,
    adReviewHideUncheckedNonChecked: false,
    hasCheckedAdReviewCandidates: false,
    selectedAdReviewCandidateCount: 0,
    adReviewFocusTaskId: null,
    adReviewStrategyMode: "all",
    adReviewMaxConcurrency: 4,
    adReviewHeadN: 8,
    adReviewTailN: 8,
    adReviewTailStopCleanStreak: 6,
    onStartAdReview: vi.fn(),
    onPauseAdReview: vi.fn(),
    onToggleHideUncheckedNonChecked: vi.fn(),
    onSelectAdReviewTask: vi.fn(),
    onRemoveAdReviewTask: vi.fn(),
    onToggleAdReviewFocus: vi.fn(),
    onAdReviewStrategyModeChange: vi.fn(),
    onAdReviewMaxConcurrencyChange: vi.fn(),
    onAdReviewHeadNChange: vi.fn(),
    onAdReviewTailNChange: vi.fn(),
    onAdReviewTailStopCleanStreakChange: vi.fn(),
    onDismissAdReviewTask: vi.fn(),
    metadataCollapsed: false,
    metadataRatio: 0.3,
    hasImageFocus: true,
    focusedImage: pkg.images[0],
    focusedImageSrc: "blob://img-a",
    focusedImagePackage: pkg,
    currentGrade: null,
    currentVideoGrade: null,
    metadataPending: false,
    editable: false,
    focusedVideo: null,
    focusedAudio: null,
    audioPlaylistIds: [],
    selectedAudioId: "",
    audioById: new Map(),
    musicBookletAlbumRootPath: "",
    musicBookletCandidates: [],
    musicCoverBindingValue: "",
    musicBookletBindingValue: "",
    canOpenMusicCover: false,
    canOpenMusicBooklet: false,
    metadataTab: "info",
    playlistIds: [],
    videoQueueSource: "sidebar",
    savedVideoPlaylists: {},
    selectedVideoId: "",
    dragVideoId: null,
    videoById: new Map(),
    onCollapse: vi.fn(),
    onExpand: vi.fn(),
    onGradeChange: vi.fn(),
    onSavePackageMetadata: vi.fn(),
    onSavePackageParsedMetadata: vi.fn(async () => undefined),
    onSaveVideoMetadata: vi.fn(),
    onSaveAudioMetadata: vi.fn(),
    onSearchByWorkTitle: vi.fn(),
    onSearchByCircle: vi.fn(),
    onSearchByAuthor: vi.fn(),
    onSearchByTag: vi.fn(),
    onMetadataTabChange: vi.fn(),
    onSelectVideo: vi.fn(),
    onSaveCurrentPlaylist: vi.fn(),
    onCreateNamedPlaylist: vi.fn(),
    onLoadSavedPlaylist: vi.fn(),
    onDeleteSavedPlaylist: vi.fn(),
    onRemoveVideoFromPlaylist: vi.fn(),
    onDragStart: vi.fn(),
    onDropToVideo: vi.fn(),
    onSelectAudio: vi.fn(),
    onSelectAudioAndPlay: vi.fn(),
    onMusicCoverBindingChange: vi.fn(),
    onMusicBookletBindingChange: vi.fn(),
    onOpenMusicCover: vi.fn(),
    onOpenMusicBooklet: vi.fn(),
    onResetMusicBookletBinding: vi.fn(),
    ...overrides,
  };
}

describe("MetadataPanel auto original-image mode", () => {
  it("non-manage模式下焦点图片变化会自动切回原图显示", () => {
    const firstPkg = createPackage("a");
    const secondPkg = createPackage("b");
    const { rerender } = render(
      <MetadataPanel
        {...createBaseProps({
          focusedImage: firstPkg.images[0],
          focusedImagePackage: firstPkg,
          focusedImageSrc: "blob://img-a",
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "切换到元数据显示" }));
    expect(
      screen.getByRole("button", { name: "切换到原图显示" }),
    ).toBeInTheDocument();

    rerender(
      <MetadataPanel
        {...createBaseProps({
          focusedImage: secondPkg.images[0],
          focusedImagePackage: secondPkg,
          focusedImageSrc: "blob://img-b",
        })}
      />,
    );

    expect(
      screen.getByRole("button", { name: "切换到元数据显示" }),
    ).toBeInTheDocument();
  });

  it("non-manage模式下 Esc 与右键会返回元数据显示", () => {
    const { container } = render(<MetadataPanel {...createBaseProps()} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.getByRole("button", { name: "切换到原图显示" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "切换到原图显示" }));
    expect(
      screen.getByRole("button", { name: "切换到元数据显示" }),
    ).toBeInTheDocument();

    const panel = container.querySelector(".metadata-panel");
    expect(panel).toBeTruthy();
    fireEvent.contextMenu(panel!);
    expect(
      screen.getByRole("button", { name: "切换到原图显示" }),
    ).toBeInTheDocument();
  });

  it("manage 或 metadata-manage 模式下禁用自动切回原图行为", () => {
    const firstPkg = createPackage("a");
    const secondPkg = createPackage("b");
    const { rerender } = render(
      <MetadataPanel
        {...createBaseProps({
          manageMode: true,
          editable: false,
          focusedImage: firstPkg.images[0],
          focusedImagePackage: firstPkg,
        })}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "切换到元数据显示" }));
    expect(
      screen.getByRole("button", { name: "切换到原图显示" }),
    ).toBeInTheDocument();

    rerender(
      <MetadataPanel
        {...createBaseProps({
          manageMode: true,
          editable: false,
          focusedImage: secondPkg.images[0],
          focusedImagePackage: secondPkg,
        })}
      />,
    );

    expect(
      screen.getByRole("button", { name: "切换到原图显示" }),
    ).toBeInTheDocument();
  });
});

describe("MetadataPanel video playlist controls", () => {
  it("仅播放列表模式显示保存/下拉/加载/删除控件", () => {
    const video = createVideo("video-a");
    const { rerender } = render(
      <MetadataPanel
        {...createBaseProps({
          mode: "video",
          metadataTab: "info",
          focusedVideo: video,
          playlistIds: [video.id],
          selectedVideoId: video.id,
          videoById: new Map([[video.id, video]]),
          savedVideoPlaylists: { A: [video.id] },
        })}
      />,
    );

    expect(screen.queryByLabelText("保存播放列表")).toBeNull();
    expect(screen.queryByLabelText("已保存播放列表")).toBeNull();
    expect(screen.queryByLabelText("新建播放列表")).toBeNull();
    expect(screen.queryByLabelText("删除播放列表")).toBeNull();

    rerender(
      <MetadataPanel
        {...createBaseProps({
          mode: "video",
          metadataTab: "playlist",
          focusedVideo: video,
          playlistIds: [video.id],
          selectedVideoId: video.id,
          videoById: new Map([[video.id, video]]),
          savedVideoPlaylists: { A: [video.id] },
        })}
      />,
    );

    expect(screen.getByLabelText("保存播放列表")).toBeInTheDocument();
    expect(screen.getByLabelText("已保存播放列表")).toBeInTheDocument();
    expect(screen.getByLabelText("新建播放列表")).toBeInTheDocument();
    expect(screen.getByLabelText("删除播放列表")).toBeInTheDocument();
  });

  it("下拉选择即加载，新建按钮弹窗创建空列表", () => {
    const videoA = createVideo("video-a");
    const videoB = createVideo("video-b");
    const onLoadSavedPlaylist = vi.fn();
    const onCreateNamedPlaylist = vi.fn();
    render(
      <MetadataPanel
        {...createBaseProps({
          mode: "video",
          metadataTab: "playlist",
          focusedVideo: videoA,
          playlistIds: [videoA.id],
          selectedVideoId: videoA.id,
          videoById: new Map([
            [videoA.id, videoA],
            [videoB.id, videoB],
          ]),
          savedVideoPlaylists: { A: [videoA.id], B: [videoB.id] },
          onLoadSavedPlaylist,
          onCreateNamedPlaylist,
        })}
      />,
    );

    const playlistSelect = screen.getByLabelText("已保存播放列表");
    fireEvent.change(playlistSelect, { target: { value: "B" } });
    expect(onLoadSavedPlaylist).toHaveBeenCalledWith("B");

    fireEvent.click(screen.getByLabelText("新建播放列表"));
    fireEvent.change(screen.getByPlaceholderText("输入播放列表名称"), {
      target: { value: "C" },
    });
    fireEvent.click(screen.getByRole("button", { name: "确定" }));
    expect(onCreateNamedPlaylist).toHaveBeenCalledWith("C");
  });

  it("仅有一个已保存列表时，清空后仍可通过下拉重新加载", () => {
    const videoA = createVideo("video-a");
    const onLoadSavedPlaylist = vi.fn();
    const onCreateNamedPlaylist = vi.fn();
    render(
      <MetadataPanel
        {...createBaseProps({
          mode: "video",
          metadataTab: "playlist",
          focusedVideo: videoA,
          playlistIds: [videoA.id],
          selectedVideoId: videoA.id,
          videoById: new Map([[videoA.id, videoA]]),
          savedVideoPlaylists: { Only: [videoA.id] },
          onLoadSavedPlaylist,
          onCreateNamedPlaylist,
        })}
      />,
    );

    fireEvent.click(screen.getByLabelText("新建播放列表"));
    fireEvent.change(screen.getByPlaceholderText("输入播放列表名称"), {
      target: { value: "Temp" },
    });
    fireEvent.click(screen.getByRole("button", { name: "确定" }));
    expect(onCreateNamedPlaylist).toHaveBeenCalledWith("Temp");

    const playlistSelect = screen.getByLabelText("已保存播放列表");
    fireEvent.change(playlistSelect, { target: { value: "Only" } });
    expect(onLoadSavedPlaylist).toHaveBeenCalledWith("Only");
  });

  it("仅剩一个已保存列表时仍可删除；无列表时下拉不可用", () => {
    const videoA = createVideo("video-a");
    const { rerender } = render(
      <MetadataPanel
        {...createBaseProps({
          mode: "video",
          metadataTab: "playlist",
          focusedVideo: videoA,
          playlistIds: [],
          selectedVideoId: videoA.id,
          videoById: new Map([[videoA.id, videoA]]),
          savedVideoPlaylists: { Only: [videoA.id] },
        })}
      />,
    );

    expect(screen.getByLabelText("删除播放列表")).toBeEnabled();

    rerender(
      <MetadataPanel
        {...createBaseProps({
          mode: "video",
          metadataTab: "playlist",
          focusedVideo: videoA,
          playlistIds: [],
          selectedVideoId: videoA.id,
          videoById: new Map([[videoA.id, videoA]]),
          savedVideoPlaylists: {},
        })}
      />,
    );

    expect(screen.getByLabelText("已保存播放列表")).toBeDisabled();
    expect(screen.getByLabelText("删除播放列表")).toBeDisabled();
  });

  it("播放列表来源时，当前播放项会自动获得焦点并随选中项切换", () => {
    const videoA = createVideo("video-a");
    const videoB = createVideo("video-b");
    const { rerender } = render(
      <MetadataPanel
        {...createBaseProps({
          mode: "video",
          metadataTab: "playlist",
          videoQueueSource: "playlist",
          focusedVideo: videoA,
          playlistIds: [videoA.id, videoB.id],
          selectedVideoId: videoA.id,
          videoById: new Map([
            [videoA.id, videoA],
            [videoB.id, videoB],
          ]),
        })}
      />,
    );

    const firstButton = screen.getByRole("button", { name: videoA.fileName });
    expect(document.activeElement).toBe(firstButton);

    rerender(
      <MetadataPanel
        {...createBaseProps({
          mode: "video",
          metadataTab: "playlist",
          videoQueueSource: "playlist",
          focusedVideo: videoB,
          playlistIds: [videoA.id, videoB.id],
          selectedVideoId: videoB.id,
          videoById: new Map([
            [videoA.id, videoA],
            [videoB.id, videoB],
          ]),
        })}
      />,
    );

    const secondButton = screen.getByRole("button", { name: videoB.fileName });
    expect(document.activeElement).toBe(secondButton);
  });
});
