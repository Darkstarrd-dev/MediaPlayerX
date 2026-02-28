import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import type { AppSettings } from "../contracts/settings";
import type {
  AudioTranscodeTaskDto,
  ReadAudioTranscodeCapabilitiesResponseDto,
  StartAudioTranscodeTaskRequestDto,
} from "../contracts/backend";
import type { TranslateFn } from "../i18n/context";
import { useUiStore } from "../store/useUiStore";

export interface MusicAudioTranscodeTaskHistoryItem {
  taskId: string;
  status: AudioTranscodeTaskDto["status"];
  progress: number;
  outputCount: number;
  message: string | null;
  updatedAtMs: number;
}

interface MusicAudioTranscodeControllerOptions {
  t: TranslateFn;
  manageMode: boolean;
  pendingManageAction: boolean;
  fullscreenActive: boolean;
  activeSelectionScope: "sidebar" | "image" | null;
  focusedAudioId: string | null;
  manageSelectedAudioIds: string[];
}

const AUDIO_TRANSCODE_PRESET_ORDER: StartAudioTranscodeTaskRequestDto["preset"][] =
  ["flac", "alac", "wav", "opus", "aac", "mp3"];

type AudioTranscodePreset = StartAudioTranscodeTaskRequestDto["preset"];
type AudioTranscodeDefaultParams =
  AppSettings["audioTranscodeDefaultsByPreset"][AudioTranscodePreset];
type AudioTranscodeDefaultsByPreset =
  AppSettings["audioTranscodeDefaultsByPreset"];

const EMPTY_AUDIO_TRANSCODE_DEFAULT_PARAMS: AudioTranscodeDefaultParams = {
  bitrateKbps: null,
  vbrQuality: null,
  sampleRateHz: null,
  channels: null,
  flacCompressionLevel: null,
  wavBitDepth: null,
  metadataMode: "copy",
  metadataOverrideKey: "",
  metadataOverrideValue: "",
};

function cloneAudioTranscodeDefaultsByPreset(
  source: AudioTranscodeDefaultsByPreset,
): AudioTranscodeDefaultsByPreset {
  return {
    flac: { ...source.flac },
    alac: { ...source.alac },
    wav: { ...source.wav },
    opus: { ...source.opus },
    aac: { ...source.aac },
    mp3: { ...source.mp3 },
  };
}

function normalizeFsPathForCompare(rawPath: string): string {
  const normalized = rawPath
    .trim()
    .replace(/\//g, "\\")
    .replace(/\\+/g, "\\")
    .replace(/\\$/, "");
  return normalized.toLowerCase();
}

function isPathInsideRootForHint(
  candidatePath: string,
  rootPath: string,
): boolean {
  const normalizedCandidate = normalizeFsPathForCompare(candidatePath);
  const normalizedRoot = normalizeFsPathForCompare(rootPath);
  if (!normalizedCandidate || !normalizedRoot) {
    return false;
  }
  return (
    normalizedCandidate === normalizedRoot ||
    normalizedCandidate.startsWith(`${normalizedRoot}\\`)
  );
}

export function useMusicAudioTranscodeController({
  t,
  manageMode,
  pendingManageAction,
  fullscreenActive,
  activeSelectionScope,
  focusedAudioId,
  manageSelectedAudioIds,
}: MusicAudioTranscodeControllerOptions) {
  const audioTranscodePollTimerRef = useRef<number | null>(null);
  const audioTranscodeRequestByTaskIdRef = useRef<
    Map<string, StartAudioTranscodeTaskRequestDto>
  >(new Map());
  const {
    audioTranscodeDefaultPreset,
    audioTranscodeDefaultsByPreset,
    updateSettings,
  } = useUiStore(
    useShallow((state) => ({
      audioTranscodeDefaultPreset: state.audioTranscodeDefaultPreset,
      audioTranscodeDefaultsByPreset: state.audioTranscodeDefaultsByPreset,
      updateSettings: state.updateSettings,
    })),
  );

  const [audioTranscodePanelOpen, setAudioTranscodePanelOpen] = useState(false);
  const [audioTranscodePreset, setAudioTranscodePreset] =
    useState<AudioTranscodePreset>(audioTranscodeDefaultPreset);
  const [
    audioTranscodeDefaultsByPresetDraft,
    setAudioTranscodeDefaultsByPresetDraft,
  ] = useState<AudioTranscodeDefaultsByPreset>(() =>
    cloneAudioTranscodeDefaultsByPreset(audioTranscodeDefaultsByPreset),
  );
  const [audioTranscodeOutputDir, setAudioTranscodeOutputDir] = useState("");
  const [audioTranscodePickingOutputDir, setAudioTranscodePickingOutputDir] =
    useState(false);
  const [audioTranscodeOverwrite, setAudioTranscodeOverwrite] = useState(false);
  const [audioTranscodeCopyMetadata, setAudioTranscodeCopyMetadata] =
    useState(true);
  const [
    audioTranscodeAddOutputToMusicSources,
    setAudioTranscodeAddOutputToMusicSources,
  ] = useState(true);
  const [audioTranscodeTaskId, setAudioTranscodeTaskId] = useState<
    string | null
  >(null);
  const [audioTranscodeTaskStatus, setAudioTranscodeTaskStatus] = useState<
    "pending" | "running" | "completed" | "cancelled" | "failed" | null
  >(null);
  const [audioTranscodeTaskProgress, setAudioTranscodeTaskProgress] =
    useState(0);
  const [audioTranscodeTaskMessage, setAudioTranscodeTaskMessage] = useState<
    string | null
  >(null);
  const [audioTranscodeOutputCount, setAudioTranscodeOutputCount] = useState(0);
  const [audioTranscodeTaskHistory, setAudioTranscodeTaskHistory] = useState<
    MusicAudioTranscodeTaskHistoryItem[]
  >([]);
  const [
    audioTranscodeCapabilitiesLoading,
    setAudioTranscodeCapabilitiesLoading,
  ] = useState(false);
  const [audioTranscodeCapabilities, setAudioTranscodeCapabilities] =
    useState<ReadAudioTranscodeCapabilitiesResponseDto | null>(null);

  const canManageAudioTranscode =
    manageMode &&
    (manageSelectedAudioIds.length > 0 || Boolean(focusedAudioId));

  const audioTranscodeExecuting =
    audioTranscodeTaskStatus === "pending" ||
    audioTranscodeTaskStatus === "running";

  const audioTranscodeTaskHistoryView = useMemo(
    () =>
      [...audioTranscodeTaskHistory]
        .sort((left, right) => right.updatedAtMs - left.updatedAtMs)
        .slice(0, 6),
    [audioTranscodeTaskHistory],
  );

  useEffect(() => {
    setAudioTranscodePreset(audioTranscodeDefaultPreset);
  }, [audioTranscodeDefaultPreset]);

  useEffect(() => {
    setAudioTranscodeDefaultsByPresetDraft(
      cloneAudioTranscodeDefaultsByPreset(audioTranscodeDefaultsByPreset),
    );
  }, [audioTranscodeDefaultsByPreset]);

  const audioTranscodeActiveDefaults = useMemo(() => {
    return (
      audioTranscodeDefaultsByPresetDraft[audioTranscodePreset] ??
      EMPTY_AUDIO_TRANSCODE_DEFAULT_PARAMS
    );
  }, [audioTranscodeDefaultsByPresetDraft, audioTranscodePreset]);

  const updateAudioTranscodeActiveDefaults = useCallback(
    (patch: Partial<AudioTranscodeDefaultParams>) => {
      setAudioTranscodeDefaultsByPresetDraft((previous) => ({
        ...previous,
        [audioTranscodePreset]: {
          ...(previous[audioTranscodePreset] ??
            EMPTY_AUDIO_TRANSCODE_DEFAULT_PARAMS),
          ...patch,
        },
      }));
    },
    [audioTranscodePreset],
  );

  const buildAudioTranscodeParamsOverride = useCallback(
    (preset: AudioTranscodePreset) => {
      const defaults =
        audioTranscodeDefaultsByPresetDraft[preset] ??
        EMPTY_AUDIO_TRANSCODE_DEFAULT_PARAMS;
      const params: NonNullable<
        StartAudioTranscodeTaskRequestDto["params_override"]
      > = {};
      if (typeof defaults.bitrateKbps === "number") {
        params.bitrate_kbps = defaults.bitrateKbps;
      }
      if (typeof defaults.vbrQuality === "number") {
        params.vbr_quality = defaults.vbrQuality;
      }
      if (typeof defaults.sampleRateHz === "number") {
        params.sample_rate_hz = defaults.sampleRateHz;
      }
      if (typeof defaults.channels === "number") {
        params.channels = defaults.channels;
      }
      if (typeof defaults.flacCompressionLevel === "number") {
        params.flac_compression_level = defaults.flacCompressionLevel;
      }
      if (typeof defaults.wavBitDepth === "number") {
        params.wav_bit_depth = defaults.wavBitDepth;
      }
      params.metadata_mode = defaults.metadataMode;
      const metadataOverrideKey = defaults.metadataOverrideKey.trim();
      if (
        defaults.metadataMode === "copy_and_override" &&
        metadataOverrideKey.length > 0
      ) {
        params.metadata_override = {
          [metadataOverrideKey]: defaults.metadataOverrideValue,
        };
      }
      return params;
    },
    [audioTranscodeDefaultsByPresetDraft],
  );

  const resolveAudioTranscodeErrorMessage = useCallback(
    (rawMessage: string | null | undefined) => {
      const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
      if (!message) {
        return null;
      }

      if (message.includes("ffmpeg unavailable")) {
        return t("ui.music.audioTranscodeCapabilityFfmpegUnavailable");
      }

      const encoderMissingMatched = message.match(/missing encoder\s+([^)]+)/i);
      if (encoderMissingMatched) {
        return t("ui.music.audioTranscodePresetUnavailable", {
          encoder: encoderMissingMatched[1] ?? "",
        });
      }

      const muxerMissingMatched = message.match(/missing muxer\s+([^)]+)/i);
      if (muxerMissingMatched) {
        return t("ui.music.audioTranscodePresetMuxerUnavailable", {
          muxer: muxerMissingMatched[1] ?? "",
        });
      }

      if (message.includes("no valid audio selected")) {
        return t("ui.music.audioTranscodeNoTarget");
      }

      const outputOutsideAllowlistMatched = message.match(
        /^output directory outside allowlist:\s*(.+)$/i,
      );
      if (outputOutsideAllowlistMatched) {
        return t("ui.music.audioTranscodeOutputDirectoryOutsideAllowlist", {
          path: outputOutsideAllowlistMatched[1] ?? "",
        });
      }

      const destinationExistsMatched = message.match(
        /^destination already exists:\s*(.+)$/i,
      );
      if (destinationExistsMatched) {
        return t("ui.music.audioTranscodeOutputFileExists", {
          path: destinationExistsMatched[1] ?? "",
        });
      }

      return message;
    },
    [t],
  );

  const resolveAudioTranscodeCapabilityBlockReason = useCallback(
    (preset: StartAudioTranscodeTaskRequestDto["preset"]) => {
      if (audioTranscodeCapabilitiesLoading) {
        return t("ui.music.audioTranscodeCapabilityLoading");
      }

      const capabilities = audioTranscodeCapabilities;
      if (!capabilities) {
        return null;
      }
      if (!capabilities.ffmpeg_available) {
        return t("ui.music.audioTranscodeCapabilityFfmpegUnavailable");
      }

      const presetCapability = capabilities.presets[preset];
      if (!presetCapability.available) {
        if (presetCapability.reason === "muxer_unavailable") {
          return t("ui.music.audioTranscodePresetMuxerUnavailable", {
            muxer: presetCapability.required_muxer,
          });
        }
        return t("ui.music.audioTranscodePresetUnavailable", {
          encoder: presetCapability.required_encoder,
        });
      }
      if (!capabilities.enabled) {
        return t("ui.music.audioTranscodeCapabilityNoPresetAvailable");
      }
      return null;
    },
    [audioTranscodeCapabilities, audioTranscodeCapabilitiesLoading, t],
  );

  const audioTranscodeOutputPolicyHint = useMemo(() => {
    const capabilities = audioTranscodeCapabilities;
    if (!capabilities) {
      return null;
    }

    const outputDir = audioTranscodeOutputDir.trim();
    if (!outputDir) {
      return t("ui.music.audioTranscodeDefaultOutputDirectoryHint", {
        path: capabilities.default_output_dir,
      });
    }

    if (isPathInsideRootForHint(outputDir, capabilities.library_root_dir)) {
      return null;
    }

    return audioTranscodeAddOutputToMusicSources
      ? t("ui.music.audioTranscodeOutputOutsideLibraryAutoImportHint")
      : t("ui.music.audioTranscodeOutputOutsideLibraryManualImportHint");
  }, [
    audioTranscodeAddOutputToMusicSources,
    audioTranscodeCapabilities,
    audioTranscodeOutputDir,
    t,
  ]);

  const audioTranscodeConfirmDisabledReason = useMemo(
    () => resolveAudioTranscodeCapabilityBlockReason(audioTranscodePreset),
    [audioTranscodePreset, resolveAudioTranscodeCapabilityBlockReason],
  );

  const resolveAudioTranscodeTaskProgress = useCallback(
    (task: AudioTranscodeTaskDto) => {
      return task.total_count > 0
        ? Math.max(0, Math.min(1, task.processed_count / task.total_count))
        : Math.max(0, Math.min(1, task.progress ?? 0));
    },
    [],
  );

  const applyAudioTranscodeTaskSnapshot = useCallback(
    (task: AudioTranscodeTaskDto) => {
      const progress = resolveAudioTranscodeTaskProgress(task);
      setAudioTranscodeTaskStatus(task.status);
      setAudioTranscodeTaskProgress(progress);
      const failureDetail = resolveAudioTranscodeErrorMessage(
        task.error_detail ?? task.message,
      );
      setAudioTranscodeTaskMessage(
        task.status === "failed" ? failureDetail : null,
      );
      setAudioTranscodeOutputCount(task.output_files?.length ?? 0);
    },
    [resolveAudioTranscodeErrorMessage, resolveAudioTranscodeTaskProgress],
  );

  const upsertAudioTranscodeTaskHistory = useCallback(
    (task: AudioTranscodeTaskDto) => {
      const progress = resolveAudioTranscodeTaskProgress(task);
      const nextItem: MusicAudioTranscodeTaskHistoryItem = {
        taskId: task.task_id,
        status: task.status,
        progress,
        outputCount: task.output_files?.length ?? 0,
        message:
          task.status === "failed"
            ? resolveAudioTranscodeErrorMessage(
                task.error_detail ?? task.message,
              )
            : null,
        updatedAtMs: task.updated_at_ms,
      };

      setAudioTranscodeTaskHistory((previous) => {
        const deduped = previous.filter((item) => item.taskId !== task.task_id);
        return [nextItem, ...deduped].slice(0, 16);
      });
    },
    [resolveAudioTranscodeErrorMessage, resolveAudioTranscodeTaskProgress],
  );

  const clearAudioTranscodePollTimer = useCallback(() => {
    if (audioTranscodePollTimerRef.current != null) {
      window.clearInterval(audioTranscodePollTimerRef.current);
      audioTranscodePollTimerRef.current = null;
    }
  }, []);

  const stopAudioTranscodeExecution = useCallback(() => {
    clearAudioTranscodePollTimer();
    setAudioTranscodeTaskId(null);
    setAudioTranscodeTaskStatus(null);
    setAudioTranscodeTaskProgress(0);
    setAudioTranscodeTaskMessage(null);
    setAudioTranscodeOutputCount(0);
  }, [clearAudioTranscodePollTimer]);

  const resolveAudioTranscodeTargetIds = useCallback((): string[] => {
    if (
      manageMode &&
      (activeSelectionScope === "sidebar" ||
        activeSelectionScope === "image") &&
      manageSelectedAudioIds.length > 0
    ) {
      return Array.from(new Set(manageSelectedAudioIds));
    }
    if (focusedAudioId) {
      return [focusedAudioId];
    }
    return [];
  }, [
    activeSelectionScope,
    focusedAudioId,
    manageMode,
    manageSelectedAudioIds,
  ]);

  useEffect(() => {
    if (!manageMode) {
      setAudioTranscodePanelOpen(false);
    }
  }, [manageMode]);

  useEffect(() => {
    if (fullscreenActive) {
      setAudioTranscodePanelOpen(false);
    }
  }, [fullscreenActive]);

  useEffect(() => {
    if (!audioTranscodePanelOpen) {
      return;
    }

    const backendApi =
      typeof window !== "undefined" ? window.mediaPlayerBackend : undefined;
    const readAudioTranscodeCapabilities =
      backendApi?.readAudioTranscodeCapabilities;
    if (typeof readAudioTranscodeCapabilities !== "function") {
      setAudioTranscodeCapabilities(null);
      setAudioTranscodeCapabilitiesLoading(false);
      return;
    }

    let active = true;
    setAudioTranscodeCapabilitiesLoading(true);
    void readAudioTranscodeCapabilities()
      .then((response) => {
        if (!active) {
          return;
        }
        setAudioTranscodeCapabilities(response);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        const reason =
          error instanceof Error && error.message
            ? error.message
            : String(error);
        setAudioTranscodeCapabilities(null);
        setAudioTranscodeTaskStatus("failed");
        setAudioTranscodeTaskMessage(
          t("ui.music.audioTranscodeCapabilityReadFailed", { message: reason }),
        );
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setAudioTranscodeCapabilitiesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [audioTranscodePanelOpen, t]);

  useEffect(() => {
    if (!audioTranscodeCapabilities) {
      return;
    }
    const currentPresetCapability =
      audioTranscodeCapabilities.presets[audioTranscodePreset];
    if (currentPresetCapability.available) {
      return;
    }
    const firstAvailablePreset = AUDIO_TRANSCODE_PRESET_ORDER.find(
      (preset) => audioTranscodeCapabilities.presets[preset].available,
    );
    if (!firstAvailablePreset) {
      return;
    }
    setAudioTranscodePreset(firstAvailablePreset);
  }, [audioTranscodeCapabilities, audioTranscodePreset]);

  useEffect(() => {
    if (!audioTranscodeTaskId || !audioTranscodeExecuting) {
      clearAudioTranscodePollTimer();
      return;
    }

    const backendApi =
      typeof window !== "undefined" ? window.mediaPlayerBackend : undefined;
    const readAudioTranscodeTask = backendApi?.readAudioTranscodeTask;
    if (typeof readAudioTranscodeTask !== "function") {
      return;
    }

    const pollTask = () => {
      void readAudioTranscodeTask({ task_id: audioTranscodeTaskId })
        .then((response) => {
          const task = response.task;
          if (!task) {
            return;
          }
          const nextStatus = task.status ?? "running";
          applyAudioTranscodeTaskSnapshot(task);
          upsertAudioTranscodeTaskHistory(task);

          if (
            nextStatus === "completed" ||
            nextStatus === "cancelled" ||
            nextStatus === "failed"
          ) {
            clearAudioTranscodePollTimer();
          }
        })
        .catch(() => undefined);
    };

    pollTask();
    clearAudioTranscodePollTimer();
    audioTranscodePollTimerRef.current = window.setInterval(pollTask, 350);
    return () => {
      clearAudioTranscodePollTimer();
    };
  }, [
    applyAudioTranscodeTaskSnapshot,
    audioTranscodeExecuting,
    audioTranscodeTaskId,
    clearAudioTranscodePollTimer,
    upsertAudioTranscodeTaskHistory,
  ]);

  useEffect(() => {
    return () => {
      clearAudioTranscodePollTimer();
    };
  }, [clearAudioTranscodePollTimer]);

  const toggleAudioTranscodePanel = useCallback(() => {
    if (
      !canManageAudioTranscode ||
      pendingManageAction ||
      audioTranscodeExecuting
    ) {
      return;
    }
    setAudioTranscodePanelOpen((value) => !value);
  }, [audioTranscodeExecuting, canManageAudioTranscode, pendingManageAction]);

  const executeAudioTranscodeTask = useCallback(
    async (request: StartAudioTranscodeTaskRequestDto) => {
      const capabilityBlockedReason =
        resolveAudioTranscodeCapabilityBlockReason(request.preset);
      if (capabilityBlockedReason) {
        setAudioTranscodeTaskStatus("failed");
        setAudioTranscodeTaskMessage(capabilityBlockedReason);
        return;
      }

      const backendApi =
        typeof window !== "undefined" ? window.mediaPlayerBackend : undefined;
      const startAudioTranscodeTask = backendApi?.startAudioTranscodeTask;
      if (typeof startAudioTranscodeTask !== "function") {
        setAudioTranscodeTaskStatus("failed");
        setAudioTranscodeTaskMessage(
          t("ui.music.audioTranscodeBackendUnavailable"),
        );
        return;
      }

      setAudioTranscodeTaskStatus("pending");
      setAudioTranscodeTaskProgress(0);
      setAudioTranscodeTaskMessage(null);
      setAudioTranscodeOutputCount(0);

      try {
        const response = await startAudioTranscodeTask(request);
        const task = response.task;
        if (!task?.task_id) {
          setAudioTranscodeTaskStatus("failed");
          setAudioTranscodeTaskMessage(
            t("ui.music.audioTranscodeMissingTaskId"),
          );
          return;
        }

        const requestForStore: StartAudioTranscodeTaskRequestDto = {
          ...request,
          audio_ids: [...request.audio_ids],
        };
        audioTranscodeRequestByTaskIdRef.current.set(
          task.task_id,
          requestForStore,
        );
        setAudioTranscodeTaskId(task.task_id);
        applyAudioTranscodeTaskSnapshot(task);
        upsertAudioTranscodeTaskHistory(task);
      } catch (error) {
        const reason =
          error instanceof Error && error.message
            ? error.message
            : String(error);
        setAudioTranscodeTaskStatus("failed");
        setAudioTranscodeTaskMessage(resolveAudioTranscodeErrorMessage(reason));
      }
    },
    [
      applyAudioTranscodeTaskSnapshot,
      resolveAudioTranscodeCapabilityBlockReason,
      resolveAudioTranscodeErrorMessage,
      t,
      upsertAudioTranscodeTaskHistory,
    ],
  );

  const handleAudioTranscodeConfirm = useCallback(async () => {
    const targetAudioIds = resolveAudioTranscodeTargetIds();
    if (targetAudioIds.length <= 0) {
      setAudioTranscodeTaskStatus("failed");
      setAudioTranscodeTaskMessage(t("ui.music.audioTranscodeNoTarget"));
      return;
    }

    const request: StartAudioTranscodeTaskRequestDto = {
      audio_ids: targetAudioIds,
      preset: audioTranscodePreset,
      params_override: buildAudioTranscodeParamsOverride(audioTranscodePreset),
      overwrite: audioTranscodeOverwrite,
      copy_metadata: audioTranscodeCopyMetadata,
      add_output_to_music_sources: audioTranscodeAddOutputToMusicSources,
    };
    const outputDir = audioTranscodeOutputDir.trim();
    if (outputDir.length > 0) {
      request.output_dir = outputDir;
    }

    await executeAudioTranscodeTask(request);
  }, [
    audioTranscodeAddOutputToMusicSources,
    audioTranscodePreset,
    buildAudioTranscodeParamsOverride,
    audioTranscodeCopyMetadata,
    audioTranscodeOutputDir,
    audioTranscodeOverwrite,
    executeAudioTranscodeTask,
    resolveAudioTranscodeTargetIds,
    t,
  ]);

  const handleAudioTranscodeRetryFailedTasks = useCallback(async () => {
    if (audioTranscodeExecuting || audioTranscodePickingOutputDir) {
      return;
    }

    const failedTaskIds = audioTranscodeTaskHistory
      .filter((task) => task.status === "failed")
      .map((task) => task.taskId);
    if (failedTaskIds.length <= 0) {
      setAudioTranscodeTaskStatus("failed");
      setAudioTranscodeTaskMessage(
        t("ui.music.audioTranscodeNoFailedTaskInHistory"),
      );
      return;
    }

    const mergedAudioIds = new Set<string>();
    for (const taskId of failedTaskIds) {
      const request = audioTranscodeRequestByTaskIdRef.current.get(taskId);
      if (!request?.audio_ids) {
        continue;
      }
      for (const audioId of request.audio_ids) {
        if (audioId.trim().length > 0) {
          mergedAudioIds.add(audioId);
        }
      }
    }

    const retryAudioIds = Array.from(mergedAudioIds);
    if (retryAudioIds.length <= 0) {
      setAudioTranscodeTaskStatus("failed");
      setAudioTranscodeTaskMessage(
        t("ui.music.audioTranscodeRetryFailedTaskTargetsMissing"),
      );
      return;
    }

    const request: StartAudioTranscodeTaskRequestDto = {
      audio_ids: retryAudioIds,
      preset: audioTranscodePreset,
      params_override: buildAudioTranscodeParamsOverride(audioTranscodePreset),
      overwrite: audioTranscodeOverwrite,
      copy_metadata: audioTranscodeCopyMetadata,
      add_output_to_music_sources: audioTranscodeAddOutputToMusicSources,
    };
    const outputDir = audioTranscodeOutputDir.trim();
    if (outputDir.length > 0) {
      request.output_dir = outputDir;
    }

    await executeAudioTranscodeTask(request);
  }, [
    audioTranscodeAddOutputToMusicSources,
    audioTranscodeCopyMetadata,
    audioTranscodeExecuting,
    audioTranscodeOutputDir,
    audioTranscodeOverwrite,
    audioTranscodePickingOutputDir,
    audioTranscodePreset,
    audioTranscodeTaskHistory,
    buildAudioTranscodeParamsOverride,
    executeAudioTranscodeTask,
    t,
  ]);

  const handleAudioTranscodeRetry = useCallback(
    async (taskId: string) => {
      if (audioTranscodeExecuting || audioTranscodePickingOutputDir) {
        return;
      }

      const previousRequest =
        audioTranscodeRequestByTaskIdRef.current.get(taskId);
      if (!previousRequest) {
        setAudioTranscodeTaskStatus("failed");
        setAudioTranscodeTaskMessage(
          t("ui.music.audioTranscodeRetryRequestMissing"),
        );
        return;
      }

      setAudioTranscodePreset(previousRequest.preset);
      if (previousRequest.params_override) {
        setAudioTranscodeDefaultsByPresetDraft((previous) => ({
          ...previous,
          [previousRequest.preset]: {
            ...(previous[previousRequest.preset] ??
              EMPTY_AUDIO_TRANSCODE_DEFAULT_PARAMS),
            bitrateKbps: previousRequest.params_override?.bitrate_kbps ?? null,
            vbrQuality: previousRequest.params_override?.vbr_quality ?? null,
            sampleRateHz:
              previousRequest.params_override?.sample_rate_hz ?? null,
            channels: previousRequest.params_override?.channels ?? null,
            flacCompressionLevel:
              previousRequest.params_override?.flac_compression_level ?? null,
            wavBitDepth: previousRequest.params_override?.wav_bit_depth ?? null,
            metadataMode:
              previousRequest.params_override?.metadata_mode ?? "copy",
            metadataOverrideKey:
              Object.keys(
                previousRequest.params_override?.metadata_override ?? {},
              )[0] ?? "",
            metadataOverrideValue:
              Object.values(
                previousRequest.params_override?.metadata_override ?? {},
              )[0] ?? "",
          },
        }));
      }
      setAudioTranscodeOutputDir(previousRequest.output_dir ?? "");
      setAudioTranscodeOverwrite(Boolean(previousRequest.overwrite));
      setAudioTranscodeCopyMetadata(previousRequest.copy_metadata ?? true);
      setAudioTranscodeAddOutputToMusicSources(
        previousRequest.add_output_to_music_sources ?? true,
      );

      const retryRequest: StartAudioTranscodeTaskRequestDto = {
        ...previousRequest,
        audio_ids: [...previousRequest.audio_ids],
      };
      await executeAudioTranscodeTask(retryRequest);
    },
    [
      audioTranscodeExecuting,
      audioTranscodePickingOutputDir,
      executeAudioTranscodeTask,
      t,
    ],
  );

  const handleAudioTranscodeClearTaskHistory = useCallback(() => {
    setAudioTranscodeTaskHistory([]);
    audioTranscodeRequestByTaskIdRef.current.clear();
  }, []);

  const handleAudioTranscodePickOutputDir = useCallback(async () => {
    if (audioTranscodeExecuting || audioTranscodePickingOutputDir) {
      return;
    }

    const backendApi =
      typeof window !== "undefined" ? window.mediaPlayerBackend : undefined;
    const pickDirectoryPath = backendApi?.pickDirectoryPath;
    if (typeof pickDirectoryPath !== "function") {
      setAudioTranscodeTaskStatus("failed");
      setAudioTranscodeTaskMessage(
        t("ui.music.audioTranscodePickOutputDirectoryUnsupported"),
      );
      return;
    }

    setAudioTranscodePickingOutputDir(true);
    try {
      const response = await pickDirectoryPath({
        title: t("ui.music.audioTranscodePickOutputDirectoryTitle"),
        default_path: audioTranscodeOutputDir.trim() || undefined,
      });
      const pickedPath = response.path?.trim() ?? "";
      if (!response.canceled && pickedPath.length > 0) {
        setAudioTranscodeOutputDir(pickedPath);
      }
    } catch (error) {
      const reason =
        error instanceof Error && error.message ? error.message : String(error);
      setAudioTranscodeTaskStatus("failed");
      setAudioTranscodeTaskMessage(
        t("ui.music.audioTranscodePickOutputDirectoryFailed", {
          message: reason,
        }),
      );
    } finally {
      setAudioTranscodePickingOutputDir(false);
    }
  }, [
    audioTranscodeExecuting,
    audioTranscodeOutputDir,
    audioTranscodePickingOutputDir,
    t,
  ]);

  const handleAudioTranscodeCancel = useCallback(async () => {
    const backendApi =
      typeof window !== "undefined" ? window.mediaPlayerBackend : undefined;
    if (
      audioTranscodeExecuting &&
      audioTranscodeTaskId &&
      typeof backendApi?.cancelAudioTranscodeTask === "function"
    ) {
      try {
        const response = await backendApi.cancelAudioTranscodeTask({
          task_id: audioTranscodeTaskId,
        });
        if (response.task) {
          upsertAudioTranscodeTaskHistory(response.task);
        }
      } catch {
        // ignore cancel error and close panel anyway
      }
    }
    stopAudioTranscodeExecution();
    setAudioTranscodePanelOpen(false);
  }, [
    audioTranscodeExecuting,
    audioTranscodeTaskId,
    stopAudioTranscodeExecution,
    upsertAudioTranscodeTaskHistory,
  ]);

  const setAudioTranscodeBitrateKbps = useCallback(
    (value: number | null) => {
      updateAudioTranscodeActiveDefaults({ bitrateKbps: value });
    },
    [updateAudioTranscodeActiveDefaults],
  );

  const setAudioTranscodeVbrQuality = useCallback(
    (value: number | null) => {
      updateAudioTranscodeActiveDefaults({ vbrQuality: value });
    },
    [updateAudioTranscodeActiveDefaults],
  );

  const setAudioTranscodeSampleRateHz = useCallback(
    (value: 44_100 | 48_000 | 96_000 | null) => {
      updateAudioTranscodeActiveDefaults({ sampleRateHz: value });
    },
    [updateAudioTranscodeActiveDefaults],
  );

  const setAudioTranscodeChannels = useCallback(
    (value: 1 | 2 | null) => {
      updateAudioTranscodeActiveDefaults({ channels: value });
    },
    [updateAudioTranscodeActiveDefaults],
  );

  const setAudioTranscodeFlacCompressionLevel = useCallback(
    (value: number | null) => {
      updateAudioTranscodeActiveDefaults({ flacCompressionLevel: value });
    },
    [updateAudioTranscodeActiveDefaults],
  );

  const setAudioTranscodeWavBitDepth = useCallback(
    (value: 16 | 24 | null) => {
      updateAudioTranscodeActiveDefaults({ wavBitDepth: value });
    },
    [updateAudioTranscodeActiveDefaults],
  );

  const setAudioTranscodeMetadataMode = useCallback(
    (value: AudioTranscodeDefaultParams["metadataMode"]) => {
      updateAudioTranscodeActiveDefaults({ metadataMode: value });
    },
    [updateAudioTranscodeActiveDefaults],
  );

  const setAudioTranscodeMetadataOverrideKey = useCallback(
    (value: string) => {
      updateAudioTranscodeActiveDefaults({
        metadataOverrideKey: value.slice(0, 64),
      });
    },
    [updateAudioTranscodeActiveDefaults],
  );

  const setAudioTranscodeMetadataOverrideValue = useCallback(
    (value: string) => {
      updateAudioTranscodeActiveDefaults({
        metadataOverrideValue: value.slice(0, 256),
      });
    },
    [updateAudioTranscodeActiveDefaults],
  );

  const handleAudioTranscodeSaveDefaults = useCallback(() => {
    updateSettings({
      audioTranscodeDefaultPreset: audioTranscodePreset,
      audioTranscodeDefaultsByPreset: cloneAudioTranscodeDefaultsByPreset(
        audioTranscodeDefaultsByPresetDraft,
      ),
    });
  }, [
    audioTranscodeDefaultsByPresetDraft,
    audioTranscodePreset,
    updateSettings,
  ]);

  return {
    canManageAudioTranscode,
    audioTranscodePanelOpen,
    setAudioTranscodePanelOpen,
    audioTranscodePreset,
    setAudioTranscodePreset,
    audioTranscodeActiveDefaults,
    setAudioTranscodeBitrateKbps,
    setAudioTranscodeVbrQuality,
    setAudioTranscodeSampleRateHz,
    setAudioTranscodeChannels,
    setAudioTranscodeFlacCompressionLevel,
    setAudioTranscodeWavBitDepth,
    setAudioTranscodeMetadataMode,
    setAudioTranscodeMetadataOverrideKey,
    setAudioTranscodeMetadataOverrideValue,
    audioTranscodeOutputDir,
    setAudioTranscodeOutputDir,
    audioTranscodePickingOutputDir,
    audioTranscodeOverwrite,
    setAudioTranscodeOverwrite,
    audioTranscodeCopyMetadata,
    setAudioTranscodeCopyMetadata,
    audioTranscodeAddOutputToMusicSources,
    setAudioTranscodeAddOutputToMusicSources,
    audioTranscodeTaskStatus,
    audioTranscodeTaskProgress,
    audioTranscodeTaskMessage,
    audioTranscodeOutputCount,
    audioTranscodeCapabilitiesLoading,
    audioTranscodeCapabilities,
    audioTranscodeTaskHistoryView,
    audioTranscodeExecuting,
    audioTranscodeConfirmDisabledReason,
    audioTranscodeOutputPolicyHint,
    toggleAudioTranscodePanel,
    handleAudioTranscodeConfirm,
    handleAudioTranscodeRetry,
    handleAudioTranscodeRetryFailedTasks,
    handleAudioTranscodeClearTaskHistory,
    handleAudioTranscodePickOutputDir,
    handleAudioTranscodeSaveDefaults,
    handleAudioTranscodeCancel,
  };
}
