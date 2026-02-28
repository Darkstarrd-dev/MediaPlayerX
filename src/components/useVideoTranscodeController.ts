import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  EstimateVideoTranscodeOutputSizeResponseDto,
  ReadVideoTranscodeCapabilitiesResponseDto,
  StartVideoTranscodeTaskRequestDto,
  VideoTranscodeTaskDto,
} from "../contracts/backend";
import type { TranslateFn } from "../i18n/context";

interface VideoTranscodeControllerOptions {
  t: TranslateFn;
  manageMode: boolean;
  pendingManageAction: boolean;
  fullscreenActive: boolean;
  activeSelectionScope: "sidebar" | "image" | null;
  focusedVideoId: string | null;
  manageSelectedVideoIds: string[];
}

type VideoTranscodePreset = NonNullable<
  NonNullable<StartVideoTranscodeTaskRequestDto["params_override"]>["encoder_preset"]
>;

const VIDEO_TRANSCODE_PRESETS: VideoTranscodePreset[] = [
  "ultrafast",
  "superfast",
  "veryfast",
  "faster",
  "fast",
  "medium",
  "slow",
  "slower",
  "veryslow",
];

export function useVideoTranscodeController({
  t,
  manageMode,
  pendingManageAction,
  fullscreenActive,
  activeSelectionScope,
  focusedVideoId,
  manageSelectedVideoIds,
}: VideoTranscodeControllerOptions) {
  const taskPollTimerRef = useRef<number | null>(null);
  const estimateDebounceTimerRef = useRef<number | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [container, setContainer] = useState<"mp4" | "mkv" | "webm">("mp4");
  const [videoCodec, setVideoCodec] = useState<
    "h264" | "h265" | "vp9" | "av1" | "copy"
  >("h264");
  const [qualityMode, setQualityMode] = useState<"copy" | "crf" | "bitrate">(
    "crf",
  );
  const [crf, setCrf] = useState(23);
  const [videoBitrateKbps, setVideoBitrateKbps] = useState<number | null>(null);
  const [encoderPreset, setEncoderPreset] = useState<VideoTranscodePreset>(
    "medium",
  );
  const [scaleLongEdgePx, setScaleLongEdgePx] = useState<number | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [audioMode, setAudioMode] = useState<"copy" | "encode" | "drop">(
    "copy",
  );
  const [audioBitrateKbps, setAudioBitrateKbps] = useState<number | null>(128);
  const [faststart, setFaststart] = useState(true);
  const [outputDir, setOutputDir] = useState("");
  const [pickingOutputDir, setPickingOutputDir] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [addOutputToSources, setAddOutputToSources] = useState(true);

  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<VideoTranscodeTaskDto["status"] | null>(
    null,
  );
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskMessage, setTaskMessage] = useState<string | null>(null);
  const [outputCount, setOutputCount] = useState(0);
  const [taskHistory, setTaskHistory] = useState<
    Array<{
      taskId: string;
      status: VideoTranscodeTaskDto["status"];
      progress: number;
      outputCount: number;
      message: string | null;
      updatedAtMs: number;
    }>
  >([]);

  const [capabilitiesLoading, setCapabilitiesLoading] = useState(false);
  const [capabilities, setCapabilities] =
    useState<ReadVideoTranscodeCapabilitiesResponseDto | null>(null);

  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateMessage, setEstimateMessage] = useState<string | null>(null);
  const [estimateResult, setEstimateResult] =
    useState<EstimateVideoTranscodeOutputSizeResponseDto | null>(null);

  const canManageVideoTranscode =
    manageMode && (manageSelectedVideoIds.length > 0 || Boolean(focusedVideoId));
  const executing = taskStatus === "pending" || taskStatus === "running";

  const clearTaskPollTimer = useCallback(() => {
    if (taskPollTimerRef.current != null) {
      window.clearInterval(taskPollTimerRef.current);
      taskPollTimerRef.current = null;
    }
  }, []);

  const clearEstimateDebounceTimer = useCallback(() => {
    if (estimateDebounceTimerRef.current != null) {
      window.clearTimeout(estimateDebounceTimerRef.current);
      estimateDebounceTimerRef.current = null;
    }
  }, []);

  const resolveTargetVideoIds = useCallback((): string[] => {
    if (
      manageMode &&
      (activeSelectionScope === "sidebar" || activeSelectionScope === "image") &&
      manageSelectedVideoIds.length > 0
    ) {
      return Array.from(new Set(manageSelectedVideoIds));
    }
    if (focusedVideoId) {
      return [focusedVideoId];
    }
    return [];
  }, [
    activeSelectionScope,
    focusedVideoId,
    manageMode,
    manageSelectedVideoIds,
  ]);

  const buildParamsOverride = useCallback(() => {
    const params: NonNullable<StartVideoTranscodeTaskRequestDto["params_override"]> = {
      container,
      video_codec: videoCodec,
      quality_mode: qualityMode,
      audio_mode: audioMode,
      faststart: faststart,
    };
    if (qualityMode === "crf") {
      params.crf = Math.max(0, Math.min(51, Math.round(crf)));
    }
    if (qualityMode === "bitrate" && typeof videoBitrateKbps === "number") {
      params.video_bitrate_kbps = Math.max(100, Math.round(videoBitrateKbps));
    }
    if ((videoCodec === "h264" || videoCodec === "h265") && encoderPreset) {
      params.encoder_preset = encoderPreset;
    }
    if (typeof scaleLongEdgePx === "number") {
      params.scale_long_edge_px = Math.max(240, Math.round(scaleLongEdgePx));
    }
    if (typeof fps === "number") {
      params.fps = Math.max(1, Math.min(240, Number(fps.toFixed(3))));
    }
    if (audioMode === "encode" && typeof audioBitrateKbps === "number") {
      params.audio_bitrate_kbps = Math.max(16, Math.round(audioBitrateKbps));
    }
    return params;
  }, [
    audioBitrateKbps,
    audioMode,
    container,
    crf,
    encoderPreset,
    faststart,
    fps,
    qualityMode,
    scaleLongEdgePx,
    videoBitrateKbps,
    videoCodec,
  ]);

  const applyTaskSnapshot = useCallback((task: VideoTranscodeTaskDto) => {
    setTaskStatus(task.status);
    setTaskProgress(Math.max(0, Math.min(1, task.progress ?? 0)));
    setTaskMessage(task.status === "failed" ? task.error_detail ?? task.message : null);
    setOutputCount(task.output_files?.length ?? 0);
    setTaskHistory((previous) => {
      const nextItem = {
        taskId: task.task_id,
        status: task.status,
        progress: Math.max(0, Math.min(1, task.progress ?? 0)),
        outputCount: task.output_files?.length ?? 0,
        message: task.status === "failed" ? task.error_detail ?? task.message : null,
        updatedAtMs: task.updated_at_ms,
      };
      return [nextItem, ...previous.filter((item) => item.taskId !== task.task_id)].slice(0, 16);
    });
  }, []);

  const confirmDisabledReason = useMemo(() => {
    if (capabilitiesLoading) {
      return t("ui.media.videoTranscodeCapabilityLoading");
    }
    if (!capabilities) {
      return null;
    }
    if (!capabilities.ffmpeg_available) {
      return t("ui.media.videoTranscodeCapabilityFfmpegUnavailable");
    }
    const containerCapability = capabilities.containers[container];
    if (!containerCapability.available) {
      return t("ui.media.videoTranscodeContainerUnavailable", {
        muxer: containerCapability.required_muxer,
      });
    }
    const codecCapability = capabilities.video_codecs[videoCodec];
    if (!codecCapability.available) {
      return t("ui.media.videoTranscodeCodecUnavailable", {
        encoder: codecCapability.required_encoder,
      });
    }
    return null;
  }, [capabilities, capabilitiesLoading, container, t, videoCodec]);

  useEffect(() => {
    if (!manageMode || fullscreenActive) {
      setPanelOpen(false);
    }
  }, [fullscreenActive, manageMode]);

  useEffect(() => {
    if (!panelOpen) {
      return;
    }
    const backendApi = typeof window !== "undefined" ? window.mediaPlayerBackend : undefined;
    const readVideoTranscodeCapabilities = backendApi?.readVideoTranscodeCapabilities;
    if (typeof readVideoTranscodeCapabilities !== "function") {
      return;
    }
    let active = true;
    setCapabilitiesLoading(true);
    void readVideoTranscodeCapabilities()
      .then((response) => {
        if (!active) {
          return;
        }
        setCapabilities(response);
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        const reason = error instanceof Error && error.message ? error.message : String(error);
        setTaskStatus("failed");
        setTaskMessage(t("ui.media.videoTranscodeCapabilityReadFailed", { message: reason }));
      })
      .finally(() => {
        if (active) {
          setCapabilitiesLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [panelOpen, t]);

  useEffect(() => {
    if (!taskId || !executing) {
      clearTaskPollTimer();
      return;
    }
    const backendApi = typeof window !== "undefined" ? window.mediaPlayerBackend : undefined;
    const readVideoTranscodeTask = backendApi?.readVideoTranscodeTask;
    if (typeof readVideoTranscodeTask !== "function") {
      return;
    }
    const poll = () => {
      void readVideoTranscodeTask({ task_id: taskId })
        .then((response) => {
          if (!response.task) {
            return;
          }
          applyTaskSnapshot(response.task);
          if (
            response.task.status === "completed" ||
            response.task.status === "cancelled" ||
            response.task.status === "failed"
          ) {
            clearTaskPollTimer();
          }
        })
        .catch(() => undefined);
    };

    poll();
    clearTaskPollTimer();
    taskPollTimerRef.current = window.setInterval(poll, 350);
    return () => {
      clearTaskPollTimer();
    };
  }, [applyTaskSnapshot, clearTaskPollTimer, executing, taskId]);

  useEffect(() => {
    if (!panelOpen) {
      setEstimateResult(null);
      setEstimateLoading(false);
      setEstimateMessage(null);
      clearEstimateDebounceTimer();
      return;
    }
    const targetVideoIds = resolveTargetVideoIds();
    if (targetVideoIds.length <= 0) {
      setEstimateResult(null);
      setEstimateLoading(false);
      setEstimateMessage(t("ui.media.videoTranscodeNoTarget"));
      clearEstimateDebounceTimer();
      return;
    }
    const backendApi = typeof window !== "undefined" ? window.mediaPlayerBackend : undefined;
    const estimate = backendApi?.estimateVideoTranscodeOutputSize;
    if (typeof estimate !== "function") {
      setEstimateMessage(t("ui.media.videoTranscodeEstimateUnsupported"));
      return;
    }
    clearEstimateDebounceTimer();
    estimateDebounceTimerRef.current = window.setTimeout(() => {
      setEstimateLoading(true);
      setEstimateMessage(null);
      void estimate({
        video_ids: targetVideoIds,
        params_override: buildParamsOverride(),
      })
        .then((response) => {
          setEstimateResult(response);
        })
        .catch((error) => {
          const reason = error instanceof Error && error.message ? error.message : String(error);
          setEstimateResult(null);
          setEstimateMessage(
            t("ui.media.videoTranscodeEstimateFailed", { message: reason }),
          );
        })
        .finally(() => {
          setEstimateLoading(false);
        });
    }, 320);
    return () => {
      clearEstimateDebounceTimer();
    };
  }, [
    buildParamsOverride,
    clearEstimateDebounceTimer,
    container,
    panelOpen,
    qualityMode,
    resolveTargetVideoIds,
    t,
    videoCodec,
  ]);

  const togglePanel = useCallback(() => {
    if (!canManageVideoTranscode || pendingManageAction || executing) {
      return;
    }
    setPanelOpen((value) => !value);
  }, [canManageVideoTranscode, executing, pendingManageAction]);

  const handleConfirm = useCallback(async () => {
    const targetVideoIds = resolveTargetVideoIds();
    if (targetVideoIds.length <= 0) {
      setTaskStatus("failed");
      setTaskMessage(t("ui.media.videoTranscodeNoTarget"));
      return;
    }
    if (confirmDisabledReason) {
      setTaskStatus("failed");
      setTaskMessage(confirmDisabledReason);
      return;
    }
    const backendApi = typeof window !== "undefined" ? window.mediaPlayerBackend : undefined;
    const startVideoTranscodeTask = backendApi?.startVideoTranscodeTask;
    if (typeof startVideoTranscodeTask !== "function") {
      setTaskStatus("failed");
      setTaskMessage(t("ui.media.videoTranscodeBackendUnavailable"));
      return;
    }

    const request: StartVideoTranscodeTaskRequestDto = {
      video_ids: targetVideoIds,
      params_override: buildParamsOverride(),
      overwrite,
      add_output_to_sources: addOutputToSources,
    };
    const normalizedOutputDir = outputDir.trim();
    if (normalizedOutputDir) {
      request.output_dir = normalizedOutputDir;
    }

    setTaskStatus("pending");
    setTaskProgress(0);
    setTaskMessage(null);
    setOutputCount(0);
    try {
      const response = await startVideoTranscodeTask(request);
      if (!response.task?.task_id) {
        setTaskStatus("failed");
        setTaskMessage(t("ui.media.videoTranscodeMissingTaskId"));
        return;
      }
      setTaskId(response.task.task_id);
      applyTaskSnapshot(response.task);
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : String(error);
      setTaskStatus("failed");
      setTaskMessage(reason);
    }
  }, [
    addOutputToSources,
    applyTaskSnapshot,
    buildParamsOverride,
    confirmDisabledReason,
    outputDir,
    overwrite,
    resolveTargetVideoIds,
    t,
  ]);

  const handleCancel = useCallback(async () => {
    const backendApi = typeof window !== "undefined" ? window.mediaPlayerBackend : undefined;
    if (executing && taskId && typeof backendApi?.cancelVideoTranscodeTask === "function") {
      try {
        const response = await backendApi.cancelVideoTranscodeTask({ task_id: taskId });
        if (response.task) {
          applyTaskSnapshot(response.task);
        }
      } catch {
        // ignore
      }
    }
    clearTaskPollTimer();
    setTaskId(null);
    setPanelOpen(false);
  }, [applyTaskSnapshot, clearTaskPollTimer, executing, taskId]);

  const handlePickOutputDir = useCallback(async () => {
    if (executing || pickingOutputDir) {
      return;
    }
    const backendApi = typeof window !== "undefined" ? window.mediaPlayerBackend : undefined;
    if (typeof backendApi?.pickDirectoryPath !== "function") {
      setTaskStatus("failed");
      setTaskMessage(t("ui.media.videoTranscodePickOutputDirectoryUnsupported"));
      return;
    }
    setPickingOutputDir(true);
    try {
      const response = await backendApi.pickDirectoryPath({
        title: t("ui.media.videoTranscodePickOutputDirectoryTitle"),
        default_path: outputDir.trim() || undefined,
      });
      const picked = response.path?.trim() ?? "";
      if (!response.canceled && picked) {
        setOutputDir(picked);
      }
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : String(error);
      setTaskStatus("failed");
      setTaskMessage(t("ui.media.videoTranscodePickOutputDirectoryFailed", { message: reason }));
    } finally {
      setPickingOutputDir(false);
    }
  }, [executing, outputDir, pickingOutputDir, t]);

  useEffect(() => {
    return () => {
      clearTaskPollTimer();
      clearEstimateDebounceTimer();
    };
  }, [clearEstimateDebounceTimer, clearTaskPollTimer]);

  return {
    canManageVideoTranscode,
    panelOpen,
    setPanelOpen,
    container,
    setContainer,
    videoCodec,
    setVideoCodec,
    qualityMode,
    setQualityMode,
    crf,
    setCrf,
    videoBitrateKbps,
    setVideoBitrateKbps,
    encoderPreset,
    setEncoderPreset,
    encoderPresetOptions: VIDEO_TRANSCODE_PRESETS,
    scaleLongEdgePx,
    setScaleLongEdgePx,
    fps,
    setFps,
    audioMode,
    setAudioMode,
    audioBitrateKbps,
    setAudioBitrateKbps,
    faststart,
    setFaststart,
    outputDir,
    setOutputDir,
    pickingOutputDir,
    overwrite,
    setOverwrite,
    addOutputToSources,
    setAddOutputToSources,
    taskStatus,
    taskProgress,
    taskMessage,
    outputCount,
    taskHistory,
    capabilitiesLoading,
    capabilities,
    confirmDisabledReason,
    estimateLoading,
    estimateMessage,
    estimateResult,
    togglePanel,
    handleConfirm,
    handleCancel,
    handlePickOutputDir,
  };
}
