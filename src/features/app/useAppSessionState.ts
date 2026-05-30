import { useRef, useState } from "react";

import type {
  AudioItem,
  BrowserMode,
  ImagePackage,
  MusicLoopMode,
  VectorCandidate,
} from "../../types";

const SIDEBAR_COLLAPSE_RATIO = 0.03;

export interface ImageConvertAdjustProfile {
  mode: "basic" | "levels" | "curve";
  brightness: number;
  contrast: number;
  level_input_black: number;
  level_input_white: number;
  level_gamma: number;
  curve_shadow_x: number;
  curve_midtone_x: number;
  curve_highlight_x: number;
  curve_shadow: number;
  curve_midtone: number;
  curve_highlight: number;
}

const DEFAULT_IMAGE_CONVERT_ADJUST_PROFILE: ImageConvertAdjustProfile = {
  mode: "basic",
  brightness: 0,
  contrast: 0,
  level_input_black: 0,
  level_input_white: 255,
  level_gamma: 1,
  curve_shadow_x: 64,
  curve_midtone_x: 128,
  curve_highlight_x: 192,
  curve_shadow: 0,
  curve_midtone: 0,
  curve_highlight: 0,
};

interface UseAppSessionStateParams {
  imageSources: ImagePackage[];
  audios: AudioItem[];
  mode: BrowserMode;
  sidebarRatio: number;
}

export function useAppSessionState({
  imageSources,
  audios,
  mode,
  sidebarRatio,
}: UseAppSessionStateParams) {
  const [selectedPackageId, setSelectedPackageId] = useState(
    imageSources[0]?.id ?? "",
  );
  const [selectedSidebarNodeId, setSelectedSidebarNodeId] = useState<
    string | null
  >(null);
  const [selectedAudioId, setSelectedAudioId] = useState(audios[0]?.id ?? "");
  const [musicTimeSec, setMusicTimeSec] = useState(0);
  const [audioPlaylistIds, setAudioPlaylistIds] = useState<string[]>(
    audios.slice(0, 3).map((audio) => audio.id),
  );
  const [musicLoopMode, setMusicLoopMode] = useState<MusicLoopMode>("library");
  const [musicPlayRequestNonce, setMusicPlayRequestNonce] = useState(0);
  const [imageSidebarLocateRequestNonce, setImageSidebarLocateRequestNonce] =
    useState(0);
  const [videoSidebarLocateRequestNonce, setVideoSidebarLocateRequestNonce] =
    useState(0);
  const [imageFocusActive, setImageFocusActive] = useState(false);
  const [focusByPackage, setFocusByPackage] = useState<Record<string, number>>(
    () => Object.fromEntries(imageSources.map((source) => [source.id, 0])),
  );
  const [pageByPackage, setPageByPackage] = useState<Record<string, number>>(
    () => Object.fromEntries(imageSources.map((source) => [source.id, 0])),
  );
  const [vectorSearchResults, setVectorSearchResults] = useState<
    VectorCandidate[]
  >([]);
  const [vectorFocusIndex, setVectorFocusIndex] = useState(0);
  const [vectorPage, setVectorPage] = useState(0);
  const [gradeByPackage, setGradeByPackage] = useState<
    Record<string, number | null>
  >(() =>
    Object.fromEntries(
      imageSources.map((source) => [source.id, source.mockGrade ?? null]),
    ),
  );
  const [manageMode, setManageMode] = useState(false);
  const [metadataManageMode, setMetadataManageMode] = useState(false);
  const [manageReviewMode, setManageReviewMode] = useState<"ad" | "cover">(
    "ad",
  );
  const [manageOperationHint, setManageOperationHint] = useState<string | null>(
    null,
  );
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [sidebarRenameDialogOpen, setSidebarRenameDialogOpen] = useState(false);
  const [sidebarRenameTargetNodeId, setSidebarRenameTargetNodeId] = useState<
    string | null
  >(null);
  const [sidebarRenameTargetNodeIds, setSidebarRenameTargetNodeIds] = useState<
    string[]
  >([]);
  const [sidebarRenameTargetImageIds, setSidebarRenameTargetImageIds] =
    useState<string[]>([]);
  const [sidebarRenameDraft, setSidebarRenameDraft] = useState("");
  const [sidebarRenameMode, setSidebarRenameMode] = useState<
    "single" | "replace" | "numbering" | "remove-range" | "metadata"
  >("single");
  const [sidebarRenameReplaceFrom, setSidebarRenameReplaceFrom] = useState("");
  const [sidebarRenameReplaceTo, setSidebarRenameReplaceTo] = useState("");
  const [sidebarRenameNumberBase, setSidebarRenameNumberBase] =
    useState("item-");
  const [sidebarRenameNumberStart, setSidebarRenameNumberStart] = useState("1");
  const [sidebarRenameNumberStep, setSidebarRenameNumberStep] = useState("1");
  const [sidebarRenameNumberPadWidth, setSidebarRenameNumberPadWidth] =
    useState("3");
  const [sidebarRenameRemoveStart, setSidebarRenameRemoveStart] = useState("0");
  const [sidebarRenameRemoveEnd, setSidebarRenameRemoveEnd] = useState("0");
  const [sidebarRenameRemoveHead, setSidebarRenameRemoveHead] = useState("0");
  const [sidebarRenameRemoveTail, setSidebarRenameRemoveTail] = useState("0");
  const [sidebarRenameMetadataTemplate, setSidebarRenameMetadataTemplate] =
    useState(
      "[author.jp(if exist)(author.en(if exist))]/[author(if only one exist)]-[circle just like author ] - [title.jp(if exist)]/[title(if only one exist)]",
    );
  const [sidebarRenamePreviewRows, setSidebarRenamePreviewRows] = useState<
    Array<{
      nodeId: string;
      sourceName: string;
      targetName: string;
      reason: string | null;
    }>
  >([]);
  const [importMenuOpen, setImportMenuOpen] = useState(false);
  const [adReviewPanelOpen, setAdReviewPanelOpen] = useState(false);
  const [adReviewFocusTaskId, setAdReviewFocusTaskId] = useState<string | null>(
    null,
  );
  const [adReviewPageIndex, setAdReviewPageIndex] = useState(0);
  // ad-review 结果涉及的源 id（候选包），用于按需预加载这些源的图片
  const [adReviewResultSourceIds, setAdReviewResultSourceIds] = useState<
    string[]
  >([]);
  // ad-review 候选 image id，纳入 validImageIdSet 防止按需加载窗口内被剪枝
  const [adReviewResultImageIds, setAdReviewResultImageIds] = useState<
    string[]
  >([]);
  const [dismissedImportTaskIds, setDismissedImportTaskIds] = useState<
    Record<string, true>
  >({});
  const [importTaskPanelOpen, setImportTaskPanelOpen] = useState(false);
  const [helpOverlayOpen, setHelpOverlayOpen] = useState(false);
  const [themeParameterPanelOpen, setThemeParameterPanelOpen] = useState(false);
  const [themeParameterPanelHidden, setThemeParameterPanelHidden] =
    useState(false);
  const [fullscreenEntryDisplay, setFullscreenEntryDisplay] = useState<
    "image-only" | "video-only"
  >(mode === "video" ? "video-only" : "image-only");
  const [imageConvertScale, setImageConvertScale] = useState(1);
  const [imageConvertLongestEdgePx, setImageConvertLongestEdgePx] = useState<
    number | null
  >(null);
  const [imageConvertAdjustProfile, setImageConvertAdjustProfile] =
    useState<ImageConvertAdjustProfile>(DEFAULT_IMAGE_CONVERT_ADJUST_PROFILE);
  const [imageConvertFormat, setImageConvertFormat] = useState<
    "webp" | "jpeg" | "png" | "avif"
  >("webp");
  const [imageConvertQuality, setImageConvertQuality] = useState(80);
  const [imageConvertPreviewMode, setImageConvertPreviewMode] = useState(false);
  const [imageConvertPreviewScale, setImageConvertPreviewScale] = useState(1);
  const [
    imageConvertPreviewLongestEdgePx,
    setImageConvertPreviewLongestEdgePx,
  ] = useState<number | null>(null);
  const [
    imageConvertPreviewAdjustProfile,
    setImageConvertPreviewAdjustProfile,
  ] = useState<ImageConvertAdjustProfile>(DEFAULT_IMAGE_CONVERT_ADJUST_PROFILE);
  const [imageConvertPreviewFormat, setImageConvertPreviewFormat] = useState<
    "webp" | "jpeg" | "png" | "avif"
  >("webp");
  const [imageConvertPreviewQuality, setImageConvertPreviewQuality] =
    useState(80);

  const appBodyRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLElement>(null);
  const workspaceBodyRef = useRef<HTMLDivElement>(null);
  const vectorPanelRef = useRef<HTMLDivElement>(null);
  const vectorPanelContentRef = useRef<HTMLDivElement>(null);
  const wasFullscreenRef = useRef(false);
  const lastExpandedSidebarRatioRef = useRef(
    sidebarRatio >= SIDEBAR_COLLAPSE_RATIO ? sidebarRatio : 0.26,
  );
  const [appBodyWidth, setAppBodyWidth] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridElement, setGridElement] = useState<HTMLDivElement | null>(null);
  const [gridSize, setGridSize] = useState({ width: 1200, height: 700 });

  return {
    selectedPackageId,
    setSelectedPackageId,
    selectedSidebarNodeId,
    setSelectedSidebarNodeId,
    selectedAudioId,
    setSelectedAudioId,
    musicTimeSec,
    setMusicTimeSec,
    audioPlaylistIds,
    setAudioPlaylistIds,
    musicLoopMode,
    setMusicLoopMode,
    musicPlayRequestNonce,
    requestMusicPlay: () => {
      setMusicPlayRequestNonce((value) => value + 1);
    },
    imageSidebarLocateRequestNonce,
    requestImageSidebarLocateFromMain: () => {
      setImageSidebarLocateRequestNonce((value) => value + 1);
    },
    videoSidebarLocateRequestNonce,
    requestVideoSidebarLocateFromMain: () => {
      setVideoSidebarLocateRequestNonce((value) => value + 1);
    },
    imageFocusActive,
    setImageFocusActive,
    focusByPackage,
    setFocusByPackage,
    pageByPackage,
    setPageByPackage,
    vectorSearchResults,
    setVectorSearchResults,
    vectorFocusIndex,
    setVectorFocusIndex,
    vectorPage,
    setVectorPage,
    gradeByPackage,
    setGradeByPackage,
    manageMode,
    setManageMode,
    metadataManageMode,
    setMetadataManageMode,
    manageReviewMode,
    setManageReviewMode,
    manageOperationHint,
    setManageOperationHint,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    sidebarRenameDialogOpen,
    setSidebarRenameDialogOpen,
    sidebarRenameTargetNodeId,
    setSidebarRenameTargetNodeId,
    sidebarRenameTargetNodeIds,
    setSidebarRenameTargetNodeIds,
    sidebarRenameTargetImageIds,
    setSidebarRenameTargetImageIds,
    sidebarRenameDraft,
    setSidebarRenameDraft,
    sidebarRenameMode,
    setSidebarRenameMode,
    sidebarRenameReplaceFrom,
    setSidebarRenameReplaceFrom,
    sidebarRenameReplaceTo,
    setSidebarRenameReplaceTo,
    sidebarRenameNumberBase,
    setSidebarRenameNumberBase,
    sidebarRenameNumberStart,
    setSidebarRenameNumberStart,
    sidebarRenameNumberStep,
    setSidebarRenameNumberStep,
    sidebarRenameNumberPadWidth,
    setSidebarRenameNumberPadWidth,
    sidebarRenameRemoveStart,
    setSidebarRenameRemoveStart,
    sidebarRenameRemoveEnd,
    setSidebarRenameRemoveEnd,
    sidebarRenameRemoveHead,
    setSidebarRenameRemoveHead,
    sidebarRenameRemoveTail,
    setSidebarRenameRemoveTail,
    sidebarRenameMetadataTemplate,
    setSidebarRenameMetadataTemplate,
    sidebarRenamePreviewRows,
    setSidebarRenamePreviewRows,
    importMenuOpen,
    setImportMenuOpen,
    adReviewPanelOpen,
    setAdReviewPanelOpen,
    adReviewFocusTaskId,
    setAdReviewFocusTaskId,
    adReviewPageIndex,
    setAdReviewPageIndex,
    adReviewResultSourceIds,
    setAdReviewResultSourceIds,
    adReviewResultImageIds,
    setAdReviewResultImageIds,
    dismissedImportTaskIds,
    setDismissedImportTaskIds,
    importTaskPanelOpen,
    setImportTaskPanelOpen,
    helpOverlayOpen,
    setHelpOverlayOpen,
    themeParameterPanelOpen,
    setThemeParameterPanelOpen,
    themeParameterPanelHidden,
    setThemeParameterPanelHidden,
    fullscreenEntryDisplay,
    setFullscreenEntryDisplay,
    imageConvertScale,
    setImageConvertScale,
    imageConvertLongestEdgePx,
    setImageConvertLongestEdgePx,
    imageConvertAdjustProfile,
    setImageConvertAdjustProfile,
    imageConvertFormat,
    setImageConvertFormat,
    imageConvertQuality,
    setImageConvertQuality,
    imageConvertPreviewMode,
    setImageConvertPreviewMode,
    imageConvertPreviewScale,
    setImageConvertPreviewScale,
    imageConvertPreviewLongestEdgePx,
    setImageConvertPreviewLongestEdgePx,
    imageConvertPreviewAdjustProfile,
    setImageConvertPreviewAdjustProfile,
    imageConvertPreviewFormat,
    setImageConvertPreviewFormat,
    imageConvertPreviewQuality,
    setImageConvertPreviewQuality,
    appBodyRef,
    workspaceRef,
    workspaceBodyRef,
    vectorPanelRef,
    vectorPanelContentRef,
    wasFullscreenRef,
    lastExpandedSidebarRatioRef,
    appBodyWidth,
    setAppBodyWidth,
    gridRef,
    gridElement,
    setGridElement,
    gridSize,
    setGridSize,
  };
}

export type AppSessionStateResult = ReturnType<typeof useAppSessionState>;
