import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  ListVideoSubtitlesResponseDto,
  PrepareSubtitleTrackResponseDto,
} from "../../contracts/backend";
import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type {
  MediaRepository,
  SynchronousMediaRepository,
} from "../backend/repository";
import { useLiveSubtitles } from "../subtitles/useLiveSubtitles";
import { normalizeSubtitleModelSelectionId } from "../subtitles/fixedModel";
import type { MediaLocator, VideoItem } from "../../types";
import type { useI18n } from "../../i18n/useI18n";
import { toErrorDetailWithCode } from "./errorCode";
import {
  AUTO_SUBTITLE_ID,
  buildSubtitleOverlayStyle,
  toAutoSubtitleLanguageLabel,
  toAutoSubtitleUiMessage,
  toLocatorDto,
} from "./useAppDisplayResources.helpers";

export interface VideoSubtitleOption {
  id: string;
  label: string;
  format: "vtt" | "srt" | "ass" | "ssa";
  locator: MediaLocator;
}

interface UseVideoSubtitleStateParams {
  appSettings: AppSettingsStoreSnapshot;
  mediaRepository: MediaRepository;
  syncMediaRepository: SynchronousMediaRepository | null;
  isSynchronousSubtitleMode: boolean;
  isVideoMode: boolean;
  focusedVideoEffective: Pick<VideoItem, "id" | "absolutePath"> | null;
  videoTime: number;
  fullscreenActive: boolean;
  t: ReturnType<typeof useI18n>["t"];
}

type SubtitleListItemDto = ListVideoSubtitlesResponseDto["subtitles"][number];
type SubtitleLocatorDto =
  | SubtitleListItemDto["locator"]
  | PrepareSubtitleTrackResponseDto["locator"];

function mapSubtitleLocator(locator: SubtitleLocatorDto): MediaLocator {
  if (locator.kind === "filesystem") {
    return {
      kind: "filesystem",
      absolutePath: locator.absolute_path,
      extension: locator.extension,
      mediaType: locator.media_type,
      mimeType: locator.mime_type,
    };
  }
  return {
    kind: "archive-entry",
    archivePath: locator.archive_path,
    archiveFormat: locator.archive_format,
    entryName: locator.entry_name,
    extension: locator.extension,
    mediaType: locator.media_type,
    mimeType: locator.mime_type,
  };
}

function toVideoSubtitleOptions(params: {
  subtitles: ListVideoSubtitlesResponseDto["subtitles"];
  autoSubtitleActive: boolean;
  autoSubtitleLabel: string;
}): VideoSubtitleOption[] {
  const options = params.subtitles.map((item) => ({
    id: item.id,
    label: item.label,
    format: item.format,
    locator: mapSubtitleLocator(item.locator),
  }));

  if (!params.autoSubtitleActive) {
    return options;
  }

  return [
    {
      id: AUTO_SUBTITLE_ID,
      label: params.autoSubtitleLabel,
      format: "vtt",
      locator: null as unknown as MediaLocator,
    },
    ...options,
  ];
}

export function useVideoSubtitleState({
  appSettings,
  mediaRepository,
  syncMediaRepository,
  isSynchronousSubtitleMode,
  isVideoMode,
  focusedVideoEffective,
  videoTime,
  fullscreenActive,
  t,
}: UseVideoSubtitleStateParams) {
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
  const [subtitleReloadNonce, setSubtitleReloadNonce] = useState(0);
  const [manualSubtitleOverride, setManualSubtitleOverride] = useState(false);
  const autoLoadAttemptedRef = useRef(new Set<string>());
  const subtitleOptionsRef = useRef<VideoSubtitleOption[]>([]);
  const [mainVideoElement, setMainVideoElement] =
    useState<HTMLVideoElement | null>(null);
  const [fullscreenVideoElement, setFullscreenVideoElement] =
    useState<HTMLVideoElement | null>(null);

  const subtitleModelDir = (appSettings.subtitleModelDir ?? "").trim();
  const subtitleModelId = normalizeSubtitleModelSelectionId(
    appSettings.subtitleSelectedModelId,
  );
  const subtitleModelDirByProfile = appSettings.subtitleModelDirByProfile ?? {};
  const activeSubtitleModelDir = (
    subtitleModelDirByProfile[subtitleModelId] ?? subtitleModelDir
  ).trim();
  const autoSubtitleConfigured =
    appSettings.subtitleFeatureEnabled && activeSubtitleModelDir.length > 0;
  const autoSubtitleApiAvailable =
    typeof mediaRepository.startSubtitleSession === "function" &&
    typeof mediaRepository.stopSubtitleSession === "function" &&
    typeof mediaRepository.resetSubtitleSession === "function" &&
    typeof mediaRepository.flushSubtitleSession === "function" &&
    typeof mediaRepository.pushSubtitleAudio === "function";
  const autoSubtitleActive =
    isVideoMode && autoSubtitleConfigured && autoSubtitleApiAvailable;
  const autoSubtitleRunning = autoSubtitleActive && !manualSubtitleOverride;

  const activeVideoElement = fullscreenActive
    ? fullscreenVideoElement
    : mainVideoElement;
  const liveSubtitle = useLiveSubtitles({
    enabled: autoSubtitleRunning,
    videoElement: activeVideoElement,
    videoPath: focusedVideoEffective?.absolutePath ?? null,
    currentTimeSec: Math.max(0, videoTime),
    modelDir: activeSubtitleModelDir,
    modelId: subtitleModelId,
    providerPreference: "cpu",
    language: appSettings.subtitleLanguage,
    validPlaybackRateThreshold: appSettings.subtitleValidPlaybackRateThreshold,
    renderMode: appSettings.subtitleRenderMode,
    advancedOptions: {
      vad: {
        preset: appSettings.subtitleAdvancedVadPreset,
        threshold: appSettings.subtitleAdvancedVadThreshold,
        minSilenceSec: appSettings.subtitleAdvancedVadMinSilenceSec,
        minSpeechSec: appSettings.subtitleAdvancedVadMinSpeechSec,
        maxSpeechSec: appSettings.subtitleAdvancedVadMaxSpeechSec,
      },
      speaker: {
        similarityThreshold: appSettings.subtitleAdvancedSpeakerThreshold,
      },
    },
    repository: mediaRepository,
  });
  const autoSubtitleUiMessage = toAutoSubtitleUiMessage(
    liveSubtitle.message,
    t,
  );
  const autoSubtitleBannerMessage = toAutoSubtitleUiMessage(
    liveSubtitle.bannerMessage,
    t,
  );
  const subtitleOverlayStyle = buildSubtitleOverlayStyle(appSettings);
  const configuredSubtitleLanguage = (appSettings.subtitleLanguage ?? "auto")
    .trim()
    .toLowerCase();
  const autoSubtitleStatusMessage = autoSubtitleUiMessage
    ? autoSubtitleUiMessage
    : configuredSubtitleLanguage !== "auto"
      ? t("ui.media.autoSubtitleUsingLanguage", {
          language: toAutoSubtitleLanguageLabel(configuredSubtitleLanguage, t),
        })
      : t("ui.media.autoSubtitleDetectingLanguage", {
          language: toAutoSubtitleLanguageLabel(
            liveSubtitle.detectedLanguage,
            t,
          ),
        });

  const refreshSubtitleOptions = useCallback(() => {
    setSubtitleReloadNonce((value) => value + 1);
  }, []);
  const subtitleSelectionByVideoId = appSettings.subtitleSelectionByVideoId;
  const subtitleSelectionByVideoIdRef = useRef(subtitleSelectionByVideoId);

  const selectSubtitleById = useCallback(
    async (subtitleId: string, sourceOptions?: VideoSubtitleOption[]) => {
      if (subtitleId === AUTO_SUBTITLE_ID) {
        setManualSubtitleOverride(false);
        setSelectedSubtitleId(AUTO_SUBTITLE_ID);
        setSelectedSubtitleLocator(null);
        setSubtitleTrackUrl(null);
        setSubtitleVisible(true);
        if (focusedVideoEffective?.id) {
          const currentMap = subtitleSelectionByVideoIdRef.current;
          const current = currentMap[focusedVideoEffective.id] ?? "";
          if (current !== AUTO_SUBTITLE_ID) {
            appSettings.updateSettings({
              subtitleSelectionByVideoId: {
                ...currentMap,
                [focusedVideoEffective.id]: AUTO_SUBTITLE_ID,
              },
            });
          }
        }
        return;
      }

      const option = (sourceOptions ?? subtitleOptionsRef.current).find(
        (item) => item.id === subtitleId,
      );
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
          locator = mapSubtitleLocator(prepared.locator);
        }

        setManualSubtitleOverride(true);
        setSelectedSubtitleId(option.id);
        setSelectedSubtitleLocator(locator);
        setSubtitleVisible(true);
        if (focusedVideoEffective?.id) {
          const currentMap = subtitleSelectionByVideoIdRef.current;
          const current = currentMap[focusedVideoEffective.id] ?? "";
          if (current !== option.id) {
            appSettings.updateSettings({
              subtitleSelectionByVideoId: {
                ...currentMap,
                [focusedVideoEffective.id]: option.id,
              },
            });
          }
        }
      } catch (error: unknown) {
        console.error("[Subtitle] Failed to load subtitle:", error);
        setSubtitleMessage(
          t("ui.media.subtitleSelectFailed", {
            message: toErrorDetailWithCode(error, t),
          }),
        );
        setSubtitleVisible(false);
      } finally {
        setSubtitleLoading(false);
      }
    },
    [appSettings, focusedVideoEffective?.id, mediaRepository, t],
  );

  const clearPersistedSubtitleSelection = useCallback(
    (videoId: string) => {
      const currentMap = subtitleSelectionByVideoIdRef.current;
      if (!(videoId in currentMap)) {
        return;
      }
      const next = { ...currentMap };
      delete next[videoId];
      appSettings.updateSettings({ subtitleSelectionByVideoId: next });
    },
    [appSettings],
  );

  useEffect(() => {
    subtitleSelectionByVideoIdRef.current = subtitleSelectionByVideoId;
  }, [subtitleSelectionByVideoId]);

  useEffect(() => {
    subtitleOptionsRef.current = subtitleOptions;
  }, [subtitleOptions]);

  useEffect(() => {
    const videoId = focusedVideoEffective?.id;
    if (!videoId) {
      setManualSubtitleOverride(false);
      return;
    }
    const persistedSubtitleId =
      subtitleSelectionByVideoIdRef.current[videoId] ?? null;
    if (persistedSubtitleId === AUTO_SUBTITLE_ID) {
      setManualSubtitleOverride(false);
    } else if (persistedSubtitleId) {
      setManualSubtitleOverride(true);
    } else {
      setManualSubtitleOverride(false);
    }
  }, [focusedVideoEffective?.id]);

  useEffect(() => {
    if (!autoSubtitleActive) {
      return;
    }
    setSubtitleVisible(true);
    setSelectedSubtitleLocator(null);
    setSubtitleTrackUrl(null);
  }, [autoSubtitleActive]);

  useEffect(() => {
    const api = mediaRepository.listVideoSubtitles;
    const apiSync = syncMediaRepository?.listVideoSubtitlesSync;
    const videoId = isVideoMode ? (focusedVideoEffective?.id ?? null) : null;
    if (!isVideoMode || !videoId || (!api && !apiSync)) {
      setSubtitleOptions((previous) => (previous.length === 0 ? previous : []));
      setSelectedSubtitleId(null);
      setSelectedSubtitleLocator(null);
      setSubtitleTrackUrl(null);
      setSubtitleVisible(false);
      setSubtitleLoading(false);
      setSubtitleMessage(null);
      return;
    }

    const autoSubtitleLabel = t("ui.media.autoSubtitleOption");

    const applySubtitleOptions = (options: VideoSubtitleOption[]) => {
      setSubtitleOptions(options);
      const persistedSubtitleId =
        subtitleSelectionByVideoIdRef.current[videoId] ?? null;
      const autoLoadKey = `${videoId}:${persistedSubtitleId}`;
      const currentlySelectedIsAuto = selectedSubtitleId === AUTO_SUBTITLE_ID;
      if (
        persistedSubtitleId &&
        options.some((item) => item.id === persistedSubtitleId) &&
        !autoSubtitleRunning &&
        !currentlySelectedIsAuto
      ) {
        setSelectedSubtitleId(persistedSubtitleId);
        if (!autoLoadAttemptedRef.current.has(autoLoadKey)) {
          autoLoadAttemptedRef.current.add(autoLoadKey);
          void selectSubtitleById(persistedSubtitleId, options);
        }
      } else if (
        persistedSubtitleId &&
        !options.some((item) => item.id === persistedSubtitleId)
      ) {
        clearPersistedSubtitleSelection(videoId);
        setSelectedSubtitleId(null);
      }
      if (options.length === 0) {
        setSubtitleVisible(false);
        setSubtitleMessage(t("ui.media.subtitleNotFoundInDirectory"));
      }
    };

    if (isSynchronousSubtitleMode && apiSync) {
      const response = apiSync({ video_id: videoId });
      const options = toVideoSubtitleOptions({
        subtitles: response.subtitles,
        autoSubtitleActive,
        autoSubtitleLabel,
      });
      applySubtitleOptions(options);
      setSubtitleLoading(false);
      return;
    }

    if (!api) {
      setSubtitleOptions((previous) => (previous.length === 0 ? previous : []));
      setSelectedSubtitleId(null);
      setSelectedSubtitleLocator(null);
      setSubtitleTrackUrl(null);
      setSubtitleVisible(false);
      setSubtitleLoading(false);
      setSubtitleMessage(null);
      return;
    }

    let active = true;
    setSubtitleLoading(true);
    setSubtitleMessage(null);

    void api({ video_id: videoId })
      .then((response) => {
        if (!active) {
          return;
        }
        const options = toVideoSubtitleOptions({
          subtitles: response.subtitles,
          autoSubtitleActive,
          autoSubtitleLabel,
        });
        applySubtitleOptions(options);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        const message = toErrorDetailWithCode(error, t);
        setSubtitleOptions((previous) =>
          previous.length === 0 ? previous : [],
        );
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
    autoSubtitleActive,
    autoSubtitleRunning,
    clearPersistedSubtitleSelection,
    focusedVideoEffective?.id,
    isSynchronousSubtitleMode,
    isVideoMode,
    mediaRepository,
    selectSubtitleById,
    selectedSubtitleId,
    subtitleReloadNonce,
    syncMediaRepository,
    t,
  ]);

  useEffect(() => {
    if (
      autoSubtitleRunning ||
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
        console.error("[Subtitle Track] Failed to resolve track URL:", error);
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
    autoSubtitleRunning,
    focusedVideoEffective?.id,
    isSynchronousSubtitleMode,
    isVideoMode,
    mediaRepository,
    selectedSubtitleLocator,
    syncMediaRepository,
    t,
  ]);

  return useMemo(
    () => ({
      subtitleVisible,
      subtitleOptions,
      selectedSubtitleId,
      subtitleTrackUrl: autoSubtitleRunning ? null : subtitleTrackUrl,
      subtitleLoading: autoSubtitleRunning
        ? liveSubtitle.loading
        : subtitleLoading,
      subtitleMessage: autoSubtitleRunning
        ? autoSubtitleStatusMessage
        : subtitleMessage,
      subtitleRuntimeErrorMessage: autoSubtitleRunning
        ? autoSubtitleBannerMessage
        : null,
      autoSubtitleActive: autoSubtitleRunning,
      liveSubtitleText: liveSubtitle.activeText,
      subtitleOverlayStyle,
      bindMainVideoElement: setMainVideoElement,
      bindFullscreenVideoElement: setFullscreenVideoElement,
      setSubtitleVisible,
      selectSubtitleById,
      refreshSubtitleOptions,
    }),
    [
      autoSubtitleBannerMessage,
      autoSubtitleRunning,
      autoSubtitleStatusMessage,
      liveSubtitle.activeText,
      liveSubtitle.loading,
      refreshSubtitleOptions,
      selectSubtitleById,
      selectedSubtitleId,
      subtitleLoading,
      subtitleMessage,
      subtitleOptions,
      subtitleOverlayStyle,
      subtitleTrackUrl,
      subtitleVisible,
    ],
  );
}
