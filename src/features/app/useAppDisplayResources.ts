import { useEffect, useMemo, useState, type CSSProperties } from "react";

import { useEffectiveDisplayState } from "./useEffectiveDisplayState";
import { useMetadataWriteBindings } from "./useMetadataWriteBindings";
import { buildCoverImageLocator } from "./mediaPathUtils";
import { resolveAdReviewPageDerivations } from "./workspaceAdReviewPageDerivations";
import { resolveAdReviewSidebarContext } from "./workspaceAdReviewSidebarContext";
import { resolveRefsInPageForDisplay } from "./workspaceImageDerivations";
import { useResolvedMediaState } from "./useResolvedMediaState";
import type { AppReadAndNavigationResult } from "./useAppReadAndNavigation";
import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type { AppSessionStateResult } from "./useAppSessionState";
import type { RepositoryBootstrapDataResult } from "./useRepositoryBootstrapData";
import type { AppManageBindingsResult } from "./useAppManageBindings";
import type { SynchronousMediaRepository } from "../backend/repository";
import type { MediaStateResult } from "../media/useMediaState";
import type { UiBenchSettings } from "../perf/benchSettings";
import { useLiveSubtitles } from "../subtitles/useLiveSubtitles";
import type { MediaLocator } from "../../types";
import { useI18n } from "../../i18n/useI18n";
import { toErrorDetailWithCode } from "./errorCode";
import { FIXED_SUBTITLE_MODEL_ID } from "../subtitles/fixedModel";

function toAutoSubtitleLanguageLabel(
  language: string | null,
  t: ReturnType<typeof useI18n>["t"],
): string {
  const normalized = (language ?? "").trim().toLowerCase();
  if (normalized === "zh") {
    return t("ui.media.autoSubtitleLanguageZh");
  }
  if (normalized === "en") {
    return t("ui.media.autoSubtitleLanguageEn");
  }
  if (normalized === "ja") {
    return t("ui.media.autoSubtitleLanguageJa");
  }
  if (normalized === "ko") {
    return t("ui.media.autoSubtitleLanguageKo");
  }
  if (normalized === "yue") {
    return t("ui.media.autoSubtitleLanguageYue");
  }
  return t("ui.media.autoSubtitleLanguageAuto");
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function normalizeHexColor(value: string, fallback: string): string {
  const normalized = value.trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) {
    return fallback;
  }

  return normalized.toLowerCase();
}

function parseHexColor(value: string): [number, number, number] | null {
  const normalized = normalizeHexColor(value, "");
  if (!normalized) {
    return null;
  }

  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  if (!Number.isFinite(red) || !Number.isFinite(green) || !Number.isFinite(blue)) {
    return null;
  }

  return [red, green, blue];
}

function toHexChannel(value: number): string {
  const channel = Math.max(0, Math.min(255, Math.round(value)));
  return channel.toString(16).padStart(2, "0");
}

function mixHexColors(left: string, right: string, factor: number): string {
  const leftRgb = parseHexColor(left);
  const rightRgb = parseHexColor(right);
  if (!leftRgb || !rightRgb) {
    return normalizeHexColor(left, "#ffffff");
  }

  const t = Math.max(0, Math.min(1, factor));
  const mixedRed = leftRgb[0] + (rightRgb[0] - leftRgb[0]) * t;
  const mixedGreen = leftRgb[1] + (rightRgb[1] - leftRgb[1]) * t;
  const mixedBlue = leftRgb[2] + (rightRgb[2] - leftRgb[2]) * t;
  return `#${toHexChannel(mixedRed)}${toHexChannel(mixedGreen)}${toHexChannel(mixedBlue)}`;
}

function applyGradientCurve(curve: string, point: number): number {
  const x = Math.max(0, Math.min(1, point));
  if (curve === "linear") {
    return x;
  }

  if (curve === "smooth") {
    return x * x * (3 - 2 * x);
  }

  if (curve === "smoother") {
    return x * x * x * (x * (x * 6 - 15) + 10);
  }

  if (curve === "bezier") {
    const u = 1 - x;
    return 3 * u * u * x * 0.1 + 3 * u * x * x + x * x * x;
  }

  return x;
}

function resolveGradientDirection(direction: string): string {
  if (direction === "right-to-left") {
    return "to left";
  }
  if (direction === "top-to-bottom") {
    return "to bottom";
  }
  if (direction === "bottom-to-top") {
    return "to top";
  }
  if (direction === "top-left-to-bottom-right") {
    return "to bottom right";
  }
  if (direction === "top-right-to-bottom-left") {
    return "to bottom left";
  }
  if (direction === "bottom-left-to-top-right") {
    return "to top right";
  }
  if (direction === "bottom-right-to-top-left") {
    return "to top left";
  }
  return "to right";
}

function buildSubtitleOverlayStyle(settings: AppSettingsStoreSnapshot): CSSProperties {
  const textFillMode = settings.subtitleTextFillMode;
  const textColor = normalizeHexColor(settings.subtitleTextColor, "#ffffff");
  const gradientStartColor = normalizeHexColor(
    settings.subtitleGradientStartColor,
    "#ffffff",
  );
  const gradientEndColor = normalizeHexColor(
    settings.subtitleGradientEndColor,
    "#7fd6ff",
  );
  const gradientDirection = resolveGradientDirection(settings.subtitleGradientDirection);
  const gradientCurve = settings.subtitleGradientCurve;
  const strokeColor = normalizeHexColor(settings.subtitleStrokeColor, "#000000");
  const strokeWidth = Math.max(0, Math.min(8, settings.subtitleStrokeWidth));
  const strokeShadowColor = normalizeHexColor(
    settings.subtitleStrokeShadowColor,
    "#000000",
  );
  const strokeShadowRadius = Math.max(0, Math.min(24, settings.subtitleStrokeShadowRadius));
  const offsetY = Math.max(-400, Math.min(400, settings.subtitleOffsetY));

  const style: CSSProperties = {
    color: textColor,
    textShadow:
      strokeShadowRadius > 0
        ? `0 0 ${strokeShadowRadius.toFixed(0)}px ${strokeShadowColor}`
        : "none",
    WebkitTextStroke:
      strokeWidth > 0 ? `${strokeWidth.toFixed(1)}px ${strokeColor}` : "0 transparent",
  };
  (style as Record<string, string>)["--mpx-subtitle-offset-y"] = `${offsetY.toFixed(0)}px`;

  if (textFillMode === "gradient") {
    const points = [0, 0.25, 0.5, 0.75, 1];
    const stops = points.map((point) => {
      const factor = applyGradientCurve(gradientCurve, point);
      const color = mixHexColors(gradientStartColor, gradientEndColor, factor);
      const percent = Math.round(point * 100);
      return `${color} ${percent}%`;
    });
    const styleRecord = style as Record<string, string>;
    style.backgroundImage = `linear-gradient(${gradientDirection}, ${stops.join(", ")})`;
    style.backgroundClip = "text";
    style.color = "transparent";
    styleRecord.WebkitBackgroundClip = "text";
    styleRecord.WebkitTextFillColor = "transparent";
  } else {
    const styleRecord = style as Record<string, string>;
    style.backgroundImage = "none";
    style.color = textColor;
    styleRecord.WebkitTextFillColor = textColor;
  }

  return style;
}

function toAutoSubtitleUiMessage(
  rawMessage: string | null,
  t: ReturnType<typeof useI18n>["t"],
): string | null {
  const normalized = (rawMessage ?? "").trim();
  if (!normalized) {
    return null;
  }

  if (
    normalized.startsWith("subtitle_model_missing_local:") ||
    normalized.startsWith("subtitle_model_files_missing:")
  ) {
    return t("ui.media.autoSubtitleModelFilesMissing");
  }

  if (normalized === "subtitle session API unavailable") {
    return t("ui.media.autoSubtitleUnavailable");
  }

  return normalized;
}

function isSyncSubtitleRepository(
  repository: unknown,
): repository is SynchronousMediaRepository {
  if (!repository || typeof repository !== "object") {
    return false;
  }

  const candidate = repository as Partial<SynchronousMediaRepository>;
  return (
    typeof candidate.listVideoSubtitlesSync === "function" &&
    typeof candidate.resolveMediaResourceSync === "function"
  );
}

function toLocatorDto(locator: MediaLocator) {
  if (locator.kind === "filesystem") {
    return {
      kind: "filesystem" as const,
      absolute_path: locator.absolutePath,
      extension: locator.extension,
      media_type: locator.mediaType,
      mime_type: locator.mimeType,
    };
  }

  return {
    kind: "archive-entry" as const,
    archive_path: locator.archivePath,
    archive_format: locator.archiveFormat,
    entry_name: locator.entryName,
    extension: locator.extension,
    media_type: locator.mediaType,
    mime_type: locator.mimeType,
  };
}

export interface VideoSubtitleOption {
  id: string;
  label: string;
  format: "vtt" | "srt" | "ass" | "ssa";
  locator: MediaLocator;
}

interface UseAppDisplayResourcesParams {
  appSettings: AppSettingsStoreSnapshot;
  benchSettings: UiBenchSettings;
  mediaRepository: RepositoryBootstrapDataResult["mediaRepository"];
  sessionState: AppSessionStateResult;
  mediaState: MediaStateResult;
  readNavigationState: AppReadAndNavigationResult;
  manageBindings: AppManageBindingsResult;
}

export function useAppDisplayResources({
  appSettings,
  benchSettings,
  mediaRepository,
  sessionState,
  mediaState,
  readNavigationState,
  manageBindings,
}: UseAppDisplayResourcesParams) {
  const { t } = useI18n();
  const { showNamesOnly } = appSettings;
  const isVideoMode = appSettings.mode === "video";
  const syncMediaRepository = isSyncSubtitleRepository(mediaRepository)
    ? mediaRepository
    : null;
  const isSynchronousSubtitleMode =
    import.meta.env.MODE === "test" && Boolean(syncMediaRepository);
  const {
    imageFocusActive,
    manageMode,
    metadataManageMode,
    adReviewFocusTaskId,
    adReviewPageIndex,
    selectedSidebarNodeId,
    setManageOperationHint,
  } = sessionState;

  const {
    selectedVideoId,
    videoTime,
    videoDurationById,
    videoCoverById,
    videoCoverImageById,
    fullscreenActive,
  } = mediaState;

  const {
    backendRead,
    vectorResultsActive,
    packageByIdEffective,
    scopedImageSourcesEffective,
    videoByIdEffective,
    audioByIdEffective,
    audiosForSidebar,
    videosForSidebar,
    selectedAudioId,
    focusedRef,
    focusedImage,
    activePackage,
    visibleImageRefs,
    refsInPage,
    pageStart,
    normalizedPageIndex,
    imageTotalPages,
    pagedPageSize,
    thumbnailColumns,
    metadataImagePackage,
    currentGrade,
    actualCellWidth,
    actualMediaHeight,
    orderedRootScopedImageRefs,
    imageTreeForSidebar,
    sidebarCheckedNodeIds,
    imageCheckedIdSet,
    sidebarNodeById,
  } = readNavigationState;

  const {
    backendPageSnapshot,
    activePackageForDisplay,
    refsInPageEffective,
    pageStartEffective,
    normalizedPageIndexEffective,
    imageTotalPagesEffective,
    metadataImageEffective,
    metadataImagePackageEffective,
    currentGradeEffective,
    focusedVideo,
    focusedAudio,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    focusedVideoCoverImageLocator,
    focusedVideoEffective,
  } = useEffectiveDisplayState({
    backendPageData: backendRead.page.data,
    backendPageSnapshot: backendRead.page.snapshot,
    backendMetadataData: backendRead.metadata.data,
    backendMetadataSnapshot: backendRead.metadata.snapshot,
    vectorResultsActive,
    imageFocusActive,
    focusedRef,
    focusedImage,
    activePackage,
    refsInPage,
    pageStart,
    normalizedPageIndex,
    imageTotalPages,
    pagedPageSize,
    showNamesOnly,
    packageById: packageByIdEffective,
    metadataImagePackage,
    currentGrade,
    selectedVideoId,
    selectedAudioId,
    videosForSidebar,
    audiosForSidebar,
    videoDurationById,
    videoCoverById,
    videoCoverImageById,
  });

  const { adReviewFocusTask, adReviewResultsMode, selectedSidebarNode } =
    resolveAdReviewSidebarContext({
      mode: appSettings.mode,
      adReviewFocusTaskId,
      queueTasks: manageBindings.manageAdReview.queueTasks,
      packageByIdEffective,
      sidebarNodeById,
      selectedSidebarNodeId,
      imageTreeForSidebar,
    });
  const adReviewGroupByPackageRows =
    adReviewResultsMode &&
    Boolean(
      selectedSidebarNode &&
      (selectedSidebarNode.kind === "folder" ||
        selectedSidebarNode.imageNodeType === "folder"),
    );

  const nodeBrowseMode =
    appSettings.mode === "image" &&
    !vectorResultsActive &&
    !metadataManageMode &&
    !adReviewResultsMode &&
    Boolean(
      selectedSidebarNode &&
      selectedSidebarNode.imageNodeType === "folder" &&
      selectedSidebarNode.children.length > 0,
    );

  const canWarmupNodeBrowseCoverThumbnails =
    !(backendRead.library?.loading ?? false) &&
    !(backendRead.sidebar?.loading ?? false) &&
    !(backendRead.page?.loading ?? false) &&
    !(backendRead.metadata?.loading ?? false);

  const nodeBrowseCoverThumbnailLocators = useMemo(
    () => {
      if (
        !nodeBrowseMode ||
        !canWarmupNodeBrowseCoverThumbnails ||
        !selectedSidebarNode
      ) {
        return [];
      }

      const next: Array<{
        sourceId: string;
        imageId: string;
        locator: MediaLocator;
      }> = [];
      const seenImageIds = new Set<string>();

      for (const child of selectedSidebarNode.children) {
        const sourceId = child.coverSourceId?.trim() ?? "";
        const imageId = child.coverImageId?.trim() ?? "";
        if (!sourceId || !imageId || seenImageIds.has(imageId)) {
          continue;
        }

        const source = packageByIdEffective.get(sourceId);
        if (!source || source.sourceCover?.coverImagePath) {
          continue;
        }

        const image = source.images.find(
          (item) => item.id === imageId && !item.hidden,
        );
        if (!image) {
          continue;
        }

        seenImageIds.add(imageId);
        next.push({
          sourceId,
          imageId,
          locator: image.mediaLocator,
        });
      }

      return next;
    },
    [
      canWarmupNodeBrowseCoverThumbnails,
      nodeBrowseMode,
      packageByIdEffective,
      selectedSidebarNode,
    ],
  );

  const { refsInPageBase } = resolveAdReviewPageDerivations({
    adReviewResultsMode,
    orderedRootScopedImageRefs,
    packageByIdEffective,
    adReviewFocusTask,
    selectedSidebarNode,
    pagedPageSize,
    thumbnailColumns,
    adReviewGroupByPackageRows,
    adReviewPageIndex,
    normalizedPageIndexEffective,
    visibleImageRefs,
    refsInPageEffective,
    pageStartEffective,
    imageTotalPagesEffective,
  });

  const refsInPageForResolve = resolveRefsInPageForDisplay(refsInPageBase, {
    manageMode,
    hideUncheckedNonChecked: false,
    imageCheckedIdSet,
    packageByIdEffective,
  });

  const metadataWriteBindings = useMetadataWriteBindings({
    metadataManageMode,
    backendWrite: manageBindings.backendWrite,
    packageById: packageByIdEffective,
    videoById: videoByIdEffective,
    audioById: audioByIdEffective,
    metadataImagePackageId: metadataImagePackageEffective?.id ?? null,
    focusedVideoId: focusedVideoEffective?.id ?? null,
    focusedAudioId: focusedAudio?.id ?? null,
    sidebarCheckedNodeIds,
    sidebarNodeById,
    setManageOperationHint,
  });

  const {
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedAudioSrc,
    videoUrlById,
    audioUrlById,
    focusedVideoCoverImageSrc,
    sourceCoverImageUrlBySourceId,
  } = useResolvedMediaState({
    repository: mediaRepository,
    benchSettings,
    maxConcurrent: appSettings.thumbnailResolveConcurrency,
    actualCellWidth,
    actualMediaHeight,
    thumbnailQuality: appSettings.thumbnailQuality,
    thumbnailWidth: appSettings.thumbnailWidth,
    thumbnailGenerationConcurrency: appSettings.thumbnailGenerationConcurrency,
    packageById: packageByIdEffective,
    focusedImage,
    metadataImage: metadataImageEffective,
    focusedRef,
    orderedRootScopedImageRefs,
    fullscreenActive,
    showNamesOnly,
    refsInPage: refsInPageForResolve,
    focusedVideo,
    focusedAudio,
    focusedVideoCoverImageLocator,
    nodeBrowseCoverThumbnailLocators,
    sourceCoverLocators: scopedImageSourcesEffective
      .map((source) => {
        const locator = buildCoverImageLocator(
          source.sourceCover?.coverImagePath ?? null,
        );
        if (!locator) {
          return null;
        }
        return {
          sourceId: source.id,
          locator,
        };
      })
      .filter(
        (
          item,
        ): item is {
          sourceId: string;
          locator: NonNullable<ReturnType<typeof buildCoverImageLocator>>;
        } => Boolean(item),
      ),
  });

  const [subtitleVisible, setSubtitleVisible] = useState(false);
  const [subtitleOptions, setSubtitleOptions] = useState<VideoSubtitleOption[]>(
    [],
  );
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(
    null,
  );
  const [selectedSubtitleLocator, setSelectedSubtitleLocator] =
    useState<MediaLocator | null>(null);
  const [subtitleTrackUrl, setSubtitleTrackUrl] = useState<string | null>(null);
  const [subtitleLoading, setSubtitleLoading] = useState(false);
  const [subtitleMessage, setSubtitleMessage] = useState<string | null>(null);
  const [mainVideoElement, setMainVideoElement] =
    useState<HTMLVideoElement | null>(null);
  const [fullscreenVideoElement, setFullscreenVideoElement] =
    useState<HTMLVideoElement | null>(null);

  const subtitleModelDir = appSettings.subtitleModelDir.trim();
  const subtitleModelId = FIXED_SUBTITLE_MODEL_ID;
  const autoSubtitleConfigured =
    appSettings.subtitleFeatureEnabled &&
    subtitleModelDir.length > 0;
  const autoSubtitleApiAvailable =
    typeof mediaRepository.startSubtitleSession === "function" &&
    typeof mediaRepository.stopSubtitleSession === "function" &&
    typeof mediaRepository.resetSubtitleSession === "function" &&
    typeof mediaRepository.flushSubtitleSession === "function" &&
    typeof mediaRepository.pushSubtitleAudio === "function";
  const autoSubtitleActive =
    isVideoMode && autoSubtitleConfigured && autoSubtitleApiAvailable;

  const activeVideoElement = fullscreenActive
    ? fullscreenVideoElement
    : mainVideoElement;
  const liveSubtitle = useLiveSubtitles({
    enabled: autoSubtitleActive,
    videoElement: activeVideoElement,
    currentTimeSec: Math.max(0, videoTime),
    modelDir: subtitleModelDir,
    modelId: subtitleModelId,
    providerPreference: "cpu",
    language: appSettings.subtitleLanguage,
    repository: mediaRepository,
  });
  const autoSubtitleUiMessage = toAutoSubtitleUiMessage(liveSubtitle.message, t);
  const subtitleOverlayStyle = buildSubtitleOverlayStyle(appSettings);
  const configuredSubtitleLanguage = (appSettings.subtitleLanguage ?? "auto").trim().toLowerCase();
  const autoSubtitleStatusMessage = autoSubtitleUiMessage
    ? autoSubtitleUiMessage
    : configuredSubtitleLanguage !== "auto"
      ? t("ui.media.autoSubtitleUsingLanguage", {
          language: toAutoSubtitleLanguageLabel(configuredSubtitleLanguage, t),
        })
      : t("ui.media.autoSubtitleDetectingLanguage", {
          language: toAutoSubtitleLanguageLabel(liveSubtitle.detectedLanguage, t),
        });

  useEffect(() => {
    if (!autoSubtitleActive) {
      return;
    }
    setSubtitleVisible(true);
    setSelectedSubtitleId(null);
    setSelectedSubtitleLocator(null);
    setSubtitleTrackUrl(null);
  }, [autoSubtitleActive]);

  useEffect(() => {
    const api = mediaRepository.listVideoSubtitles;
    const apiSync = syncMediaRepository?.listVideoSubtitlesSync;
    const videoId = isVideoMode ? (focusedVideoEffective?.id ?? null) : null;
    if (autoSubtitleActive || !isVideoMode || !videoId || (!api && !apiSync)) {
      setSubtitleOptions([]);
      setSelectedSubtitleId(null);
      setSelectedSubtitleLocator(null);
      setSubtitleTrackUrl(null);
      if (!autoSubtitleActive) {
        setSubtitleVisible(false);
      }
      setSubtitleLoading(false);
      setSubtitleMessage(null);
      return;
    }

    if (isSynchronousSubtitleMode && apiSync) {
      const response = apiSync({ video_id: videoId });
      const options = response.subtitles.map((item) => ({
        id: item.id,
        label: item.label,
        format: item.format,
        locator: {
          kind: item.locator.kind,
          ...(item.locator.kind === "filesystem"
            ? {
                absolutePath: item.locator.absolute_path,
                extension: item.locator.extension,
                mediaType: item.locator.media_type,
                mimeType: item.locator.mime_type,
              }
            : {
                archivePath: item.locator.archive_path,
                archiveFormat: item.locator.archive_format,
                entryName: item.locator.entry_name,
                extension: item.locator.extension,
                mediaType: item.locator.media_type,
                mimeType: item.locator.mime_type,
              }),
        } as MediaLocator,
      }));
      setSubtitleOptions(options);
      if (options.length === 0) {
        setSubtitleVisible(false);
        setSubtitleMessage(t("ui.media.subtitleNotFoundInDirectory"));
      }
      setSubtitleLoading(false);
      return;
    }

    if (!api) {
      setSubtitleOptions([]);
      setSelectedSubtitleId(null);
      setSelectedSubtitleLocator(null);
      setSubtitleTrackUrl(null);
      setSubtitleVisible(false);
      setSubtitleLoading(false);
      setSubtitleMessage(null);
      return;
    }

    let active = true;
    setSelectedSubtitleId(null);
    setSelectedSubtitleLocator(null);
    setSubtitleTrackUrl(null);
    setSubtitleVisible(false);
    setSubtitleLoading(true);
    setSubtitleMessage(null);

    void api({ video_id: videoId })
      .then((response) => {
        if (!active) {
          return;
        }
        const options = response.subtitles.map((item) => ({
          id: item.id,
          label: item.label,
          format: item.format,
          locator: {
            kind: item.locator.kind,
            ...(item.locator.kind === "filesystem"
              ? {
                  absolutePath: item.locator.absolute_path,
                  extension: item.locator.extension,
                  mediaType: item.locator.media_type,
                  mimeType: item.locator.mime_type,
                }
              : {
                  archivePath: item.locator.archive_path,
                  archiveFormat: item.locator.archive_format,
                  entryName: item.locator.entry_name,
                  extension: item.locator.extension,
                  mediaType: item.locator.media_type,
                  mimeType: item.locator.mime_type,
                }),
          } as MediaLocator,
        }));
        setSubtitleOptions(options);
        if (options.length === 0) {
          setSubtitleVisible(false);
          setSubtitleMessage(t("ui.media.subtitleNotFoundInDirectory"));
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        const message = toErrorDetailWithCode(error, t);
        setSubtitleOptions([]);
        setSelectedSubtitleId(null);
        setSelectedSubtitleLocator(null);
        setSubtitleTrackUrl(null);
        setSubtitleVisible(false);
        setSubtitleMessage(t("ui.media.subtitleLoadFailed", { message }));
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setSubtitleLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    focusedVideoEffective?.id,
    autoSubtitleActive,
    isSynchronousSubtitleMode,
    isVideoMode,
    mediaRepository,
    syncMediaRepository,
    t,
  ]);

  useEffect(() => {
    if (
      autoSubtitleActive ||
      !isVideoMode ||
      !focusedVideoEffective?.id ||
      !selectedSubtitleLocator
    ) {
      setSubtitleTrackUrl(null);
      return;
    }

    if (isSynchronousSubtitleMode && syncMediaRepository) {
      const response = syncMediaRepository.resolveMediaResourceSync({
        locator: toLocatorDto(selectedSubtitleLocator),
        preferred_variant: "original",
      });
      setSubtitleTrackUrl(response.resource_url);
      return;
    }

    let active = true;
    void mediaRepository
      .resolveMediaResource({
        locator: toLocatorDto(selectedSubtitleLocator),
        preferred_variant: "original",
      })
      .then((response) => {
        if (!active) {
          return;
        }
        setSubtitleTrackUrl(response.resource_url);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setSubtitleTrackUrl(null);
        setSubtitleMessage(
          t("ui.media.subtitleResolveFailed", {
            message: toErrorDetailWithCode(error, t),
          }),
        );
      });

    return () => {
      active = false;
    };
  }, [
    focusedVideoEffective?.id,
    autoSubtitleActive,
    isSynchronousSubtitleMode,
    isVideoMode,
    mediaRepository,
    selectedSubtitleLocator,
    syncMediaRepository,
    t,
  ]);

  const selectSubtitleById = async (subtitleId: string) => {
    if (autoSubtitleActive) {
      return;
    }

    const option = subtitleOptions.find((item) => item.id === subtitleId);
    if (!option) {
      return;
    }

    setSubtitleLoading(true);
    setSubtitleMessage(null);
    try {
      let locator = option.locator;
      if (option.format !== "vtt") {
        if (!mediaRepository.prepareSubtitleTrack) {
          throw new Error(t("ui.media.subtitleConverterUnsupported"));
        }
        const prepared = await mediaRepository.prepareSubtitleTrack({
          subtitle_id: option.id,
          format: option.format,
          locator: toLocatorDto(locator),
        });
        locator =
          prepared.locator.kind === "filesystem"
            ? {
                kind: "filesystem",
                absolutePath: prepared.locator.absolute_path,
                extension: prepared.locator.extension,
                mediaType: prepared.locator.media_type,
                mimeType: prepared.locator.mime_type,
              }
            : {
                kind: "archive-entry",
                archivePath: prepared.locator.archive_path,
                archiveFormat: prepared.locator.archive_format,
                entryName: prepared.locator.entry_name,
                extension: prepared.locator.extension,
                mediaType: prepared.locator.media_type,
                mimeType: prepared.locator.mime_type,
              };
      }

      setSelectedSubtitleId(option.id);
      setSelectedSubtitleLocator(locator);
      setSubtitleVisible(true);
    } catch (error: unknown) {
      setSubtitleMessage(
        t("ui.media.subtitleSelectFailed", {
          message: toErrorDetailWithCode(error, t),
        }),
      );
      setSubtitleVisible(false);
    } finally {
      setSubtitleLoading(false);
    }
  };

  return {
    backendPageSnapshot,
    activePackageForDisplay,
    refsInPageEffective,
    pageStartEffective,
    normalizedPageIndexEffective,
    imageTotalPagesEffective,
    metadataImageEffective,
    metadataImagePackageEffective,
    currentGradeEffective,
    focusedVideo,
    focusedAudio,
    focusedVideoDurationSec,
    focusedVideoCoverColor,
    focusedVideoCoverImageLocator,
    focusedVideoEffective,
    metadataWriteBindings,
    thumbnailImageUrlById,
    metadataImageSrc,
    fullscreenImageSrc,
    focusedVideoSrc,
    focusedAudioSrc,
    videoUrlById,
    audioUrlById,
    focusedVideoCoverImageSrc,
    sourceCoverImageUrlBySourceId,
    subtitleVisible,
    subtitleOptions: autoSubtitleActive ? [] : subtitleOptions,
    selectedSubtitleId,
    subtitleTrackUrl: autoSubtitleActive ? null : subtitleTrackUrl,
    subtitleLoading: autoSubtitleActive ? liveSubtitle.loading : subtitleLoading,
    subtitleMessage: autoSubtitleActive ? autoSubtitleStatusMessage : subtitleMessage,
    autoSubtitleActive,
    liveSubtitleText: liveSubtitle.activeText,
    subtitleOverlayStyle,
    bindMainVideoElement: setMainVideoElement,
    bindFullscreenVideoElement: setFullscreenVideoElement,
    setSubtitleVisible,
    selectSubtitleById,
  };
}

export type AppDisplayResourcesResult = ReturnType<
  typeof useAppDisplayResources
>;
