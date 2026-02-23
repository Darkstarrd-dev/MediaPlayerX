import { useCallback, useEffect, useRef } from "react";

import type { MediaRepository } from "../backend/repository";
import type { BrowserMode, ImagePackage, VideoItem } from "../../types";

const PREFERENCE_METRICS_STATE_KEY = "xp_preference_metrics_v1";
const PREFERENCE_RUNTIME_HEARTBEAT_MS = 2_000;

interface UsePreferenceMetricsBufferParams {
  repository: MediaRepository;
  mode: BrowserMode;
  fullscreenActive: boolean;
  focusedImageRef: { packageId: string; imageIndex: number } | null;
  packageById: Map<string, ImagePackage>;
  videos: VideoItem[];
  selectedVideoId: string;
  videoPlaying: boolean;
  videoTime: number;
}

interface BufferedImageMetric {
  eventCount: number;
  pagesRead: number;
  totalPages: number;
  completionRatio: number;
  lastEventTimeMs: number | null;
}

interface BufferedVideoMetric {
  eventCount: number;
  watchSeconds: number;
  totalSeconds: number;
  completionRatio: number;
  lastEventTimeMs: number | null;
}

interface ImageSessionState {
  active: boolean;
  sessionId: string;
  checkpointSeq: number;
  sourceId: string;
  startedAtMs: number;
  maxIndex: number;
  totalPages: number;
}

interface VideoSessionState {
  active: boolean;
  sessionId: string;
  checkpointSeq: number;
  videoId: string;
  startedAtMs: number;
  lastVideoTime: number;
  accumulatedSec: number;
  totalSeconds: number;
  hasFullscreen: boolean;
}

interface BufferedImageSessionEvent {
  session_id: string;
  source_id: string;
  started_at_ms: number;
  ended_at_ms: number;
  pages_read: number;
  total_pages: number;
  completion_ratio: number;
  is_fullscreen: boolean;
  end_reason: string;
}

interface BufferedVideoSessionEvent {
  session_id: string;
  video_id: string;
  started_at_ms: number;
  ended_at_ms: number;
  watch_seconds: number;
  total_seconds: number;
  completion_ratio: number;
  had_fullscreen: boolean;
  is_noise: boolean;
  end_reason: string;
}

interface BufferedImageRuntimeCheckpoint {
  session_id: string;
  source_id: string;
  started_at_ms: number;
  last_checkpoint_ms: number;
  checkpoint_seq: number;
  pages_read: number;
  total_pages: number;
  completion_ratio: number;
  is_fullscreen: boolean;
}

interface BufferedVideoRuntimeCheckpoint {
  session_id: string;
  video_id: string;
  started_at_ms: number;
  last_checkpoint_ms: number;
  checkpoint_seq: number;
  watch_seconds: number;
  total_seconds: number;
  completion_ratio: number;
  had_fullscreen: boolean;
  last_video_time: number;
}

function clampNonNegativeInt(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}

function clampNonNegativeFloat(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return value;
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function createSessionId(prefix: string, counterRef: { current: number }): string {
  counterRef.current += 1;
  return `${prefix}-${Date.now()}-${counterRef.current}`;
}

export function usePreferenceMetricsBuffer({
  repository,
  mode,
  fullscreenActive,
  focusedImageRef,
  packageById,
  videos,
  selectedVideoId,
  videoPlaying,
  videoTime,
}: UsePreferenceMetricsBufferParams): void {
  const repositoryRef = useRef(repository);
  const imageMetricsBySourceIdRef = useRef(
    new Map<string, BufferedImageMetric>(),
  );
  const videoMetricsByIdRef = useRef(new Map<string, BufferedVideoMetric>());
  const imageSessionRef = useRef<ImageSessionState>({
    active: false,
    sessionId: "",
    checkpointSeq: 0,
    sourceId: "",
    startedAtMs: 0,
    maxIndex: 0,
    totalPages: 0,
  });
  const videoSessionRef = useRef<VideoSessionState>({
    active: false,
    sessionId: "",
    checkpointSeq: 0,
    videoId: "",
    startedAtMs: 0,
    lastVideoTime: 0,
    accumulatedSec: 0,
    totalSeconds: 0,
    hasFullscreen: false,
  });
  const pendingImageSessionsRef = useRef<BufferedImageSessionEvent[]>([]);
  const pendingVideoSessionsRef = useRef<BufferedVideoSessionEvent[]>([]);
  const pendingImageRuntimeCheckpointsRef = useRef<
    BufferedImageRuntimeCheckpoint[]
  >([]);
  const pendingVideoRuntimeCheckpointsRef = useRef<
    BufferedVideoRuntimeCheckpoint[]
  >([]);
  const sessionCounterRef = useRef(0);
  const writeChainRef = useRef(Promise.resolve());
  const lastFlushedJsonRef = useRef("");

  useEffect(() => {
    repositoryRef.current = repository;
  }, [repository]);

  useEffect(() => {
    for (const source of packageById.values()) {
      const totalPages = clampNonNegativeInt(source.images.length);
      const existing = imageMetricsBySourceIdRef.current.get(source.id);
      if (existing) {
        if (totalPages > 0 && totalPages > existing.totalPages) {
          existing.totalPages = totalPages;
          existing.completionRatio =
            totalPages > 0 ? clampRatio(existing.pagesRead / totalPages) : 0;
        }
        continue;
      }

      const seed = source.preferenceMetrics;
      imageMetricsBySourceIdRef.current.set(source.id, {
        eventCount: clampNonNegativeInt(seed?.eventCount ?? 0),
        pagesRead: clampNonNegativeInt(seed?.pagesRead ?? 0),
        totalPages: clampNonNegativeInt(seed?.totalPages ?? totalPages),
        completionRatio: clampRatio(seed?.completionRatio ?? 0),
        lastEventTimeMs:
          typeof seed?.lastEventTimeMs === "number" && seed.lastEventTimeMs > 0
            ? Math.floor(seed.lastEventTimeMs)
            : null,
      });
    }
  }, [packageById]);

  useEffect(() => {
    for (const video of videos) {
      const totalSeconds = clampNonNegativeInt(video.durationSec);
      const existing = videoMetricsByIdRef.current.get(video.id);
      if (existing) {
        if (totalSeconds > 0 && totalSeconds > existing.totalSeconds) {
          existing.totalSeconds = totalSeconds;
          existing.completionRatio =
            totalSeconds > 0
              ? clampRatio(existing.watchSeconds / totalSeconds)
              : 0;
        }
        continue;
      }

      const seed = video.preferenceMetrics;
      videoMetricsByIdRef.current.set(video.id, {
        eventCount: clampNonNegativeInt(seed?.eventCount ?? 0),
        watchSeconds: clampNonNegativeFloat(seed?.watchSeconds ?? 0),
        totalSeconds: clampNonNegativeInt(seed?.totalSeconds ?? totalSeconds),
        completionRatio: clampRatio(seed?.completionRatio ?? 0),
        lastEventTimeMs:
          typeof seed?.lastEventTimeMs === "number" && seed.lastEventTimeMs > 0
            ? Math.floor(seed.lastEventTimeMs)
            : null,
      });
    }
  }, [videos]);

  const flushToDatabase = useCallback(
    (reason: string, options?: { includeMetrics?: boolean }) => {
      const repository = repositoryRef.current;
      if (!repository?.writeAppState) {
        return;
      }

      const includeMetrics = options?.includeMetrics ?? true;

      writeChainRef.current = writeChainRef.current
        .catch(() => undefined)
        .then(async () => {
          const pendingImageSessions = [...pendingImageSessionsRef.current];
          const pendingVideoSessions = [...pendingVideoSessionsRef.current];
          const pendingImageRuntimeCheckpoints = [
            ...pendingImageRuntimeCheckpointsRef.current,
          ];
          const pendingVideoRuntimeCheckpoints = [
            ...pendingVideoRuntimeCheckpointsRef.current,
          ];

          if (
            !includeMetrics &&
            pendingImageSessions.length === 0 &&
            pendingVideoSessions.length === 0 &&
            pendingImageRuntimeCheckpoints.length === 0 &&
            pendingVideoRuntimeCheckpoints.length === 0
          ) {
            return;
          }

          const imageBySourceId: Record<string, Record<string, number | null>> =
            {};
          const videoById: Record<string, Record<string, number | null>> = {};

          if (includeMetrics) {
            for (const [sourceId, metric] of imageMetricsBySourceIdRef.current) {
              imageBySourceId[sourceId] = {
                event_count: clampNonNegativeInt(metric.eventCount),
                pages_read: clampNonNegativeInt(metric.pagesRead),
                total_pages: clampNonNegativeInt(metric.totalPages),
                completion_ratio: clampRatio(metric.completionRatio),
                last_event_time_ms: metric.lastEventTimeMs,
              };
            }

            for (const [videoId, metric] of videoMetricsByIdRef.current) {
              videoById[videoId] = {
                event_count: clampNonNegativeInt(metric.eventCount),
                watch_seconds: clampNonNegativeFloat(metric.watchSeconds),
                total_seconds: clampNonNegativeInt(metric.totalSeconds),
                completion_ratio: clampRatio(metric.completionRatio),
                last_event_time_ms: metric.lastEventTimeMs,
              };
            }
          }

          const payload = {
            version: 2,
            reason,
            updated_at_ms: Date.now(),
            image_by_source_id: imageBySourceId,
            video_by_id: videoById,
            image_session_events: pendingImageSessions,
            video_session_events: pendingVideoSessions,
            image_runtime_checkpoints: pendingImageRuntimeCheckpoints,
            video_runtime_checkpoints: pendingVideoRuntimeCheckpoints,
          };
          const stateJson = JSON.stringify(payload);
          if (stateJson === lastFlushedJsonRef.current) {
            return;
          }

          await repository.writeAppState?.({
            state_key: PREFERENCE_METRICS_STATE_KEY,
            state_json: stateJson,
          });
          if (pendingImageSessions.length > 0) {
            pendingImageSessionsRef.current.splice(0, pendingImageSessions.length);
          }
          if (pendingVideoSessions.length > 0) {
            pendingVideoSessionsRef.current.splice(0, pendingVideoSessions.length);
          }
          if (pendingImageRuntimeCheckpoints.length > 0) {
            pendingImageRuntimeCheckpointsRef.current.splice(
              0,
              pendingImageRuntimeCheckpoints.length,
            );
          }
          if (pendingVideoRuntimeCheckpoints.length > 0) {
            pendingVideoRuntimeCheckpointsRef.current.splice(
              0,
              pendingVideoRuntimeCheckpoints.length,
            );
          }
          lastFlushedJsonRef.current = stateJson;
        });
    },
    [],
  );

  const captureImageRuntimeCheckpoint = useCallback((): boolean => {
    const session = imageSessionRef.current;
    if (!session.active || !session.sourceId || !session.sessionId) {
      return false;
    }

    const lastCheckpointMs = Date.now();
    const pagesRead = clampNonNegativeInt(session.maxIndex + 1);
    const totalPages = clampNonNegativeInt(session.totalPages);
    const completionRatio =
      totalPages > 0 ? clampRatio(pagesRead / totalPages) : 0;
    session.checkpointSeq += 1;

    pendingImageRuntimeCheckpointsRef.current.push({
      session_id: session.sessionId,
      source_id: session.sourceId,
      started_at_ms:
        session.startedAtMs > 0 ? session.startedAtMs : lastCheckpointMs,
      last_checkpoint_ms: lastCheckpointMs,
      checkpoint_seq: session.checkpointSeq,
      pages_read: pagesRead,
      total_pages: totalPages,
      completion_ratio: completionRatio,
      is_fullscreen: true,
    });
    return true;
  }, []);

  const captureVideoRuntimeCheckpoint = useCallback((): boolean => {
    const session = videoSessionRef.current;
    if (!session.active || !session.videoId || !session.sessionId) {
      return false;
    }

    const lastCheckpointMs = Date.now();
    const watchSeconds = clampNonNegativeFloat(session.accumulatedSec);
    const totalSeconds = clampNonNegativeInt(session.totalSeconds);
    const completionRatio =
      totalSeconds > 0 ? clampRatio(watchSeconds / totalSeconds) : 0;
    session.checkpointSeq += 1;

    pendingVideoRuntimeCheckpointsRef.current.push({
      session_id: session.sessionId,
      video_id: session.videoId,
      started_at_ms:
        session.startedAtMs > 0 ? session.startedAtMs : lastCheckpointMs,
      last_checkpoint_ms: lastCheckpointMs,
      checkpoint_seq: session.checkpointSeq,
      watch_seconds: watchSeconds,
      total_seconds: totalSeconds,
      completion_ratio: completionRatio,
      had_fullscreen: session.hasFullscreen,
      last_video_time: clampNonNegativeFloat(session.lastVideoTime),
    });
    return true;
  }, []);

  const commitImageSession = useCallback((endReason: string): boolean => {
    const session = imageSessionRef.current;
    if (!session.active || !session.sourceId || !session.sessionId) {
      return false;
    }

    const endedAtMs = Date.now();
    const pagesRead = clampNonNegativeInt(session.maxIndex + 1);
    const totalPages = clampNonNegativeInt(session.totalPages);
    const completionRatio =
      totalPages > 0 ? clampRatio(pagesRead / totalPages) : 0;
    const existing = imageMetricsBySourceIdRef.current.get(
      session.sourceId,
    ) ?? {
      eventCount: 0,
      pagesRead: 0,
      totalPages,
      completionRatio: 0,
      lastEventTimeMs: null,
    };

    existing.eventCount += 1;
    existing.pagesRead = Math.max(existing.pagesRead, pagesRead);
    existing.totalPages = Math.max(existing.totalPages, totalPages);
    existing.completionRatio =
      existing.totalPages > 0
        ? clampRatio(existing.pagesRead / existing.totalPages)
        : 0;
    existing.lastEventTimeMs = endedAtMs;
    imageMetricsBySourceIdRef.current.set(session.sourceId, existing);

    pendingImageSessionsRef.current.push({
      session_id: session.sessionId,
      source_id: session.sourceId,
      started_at_ms: session.startedAtMs > 0 ? session.startedAtMs : endedAtMs,
      ended_at_ms: endedAtMs,
      pages_read: pagesRead,
      total_pages: totalPages,
      completion_ratio: completionRatio,
      is_fullscreen: true,
      end_reason: endReason,
    });

    imageSessionRef.current = {
      active: false,
      sessionId: "",
      checkpointSeq: 0,
      sourceId: "",
      startedAtMs: 0,
      maxIndex: 0,
      totalPages: 0,
    };
    return true;
  }, []);

  const commitVideoSession = useCallback(
    (
      endReason: string,
    ): {
      committed: boolean;
      metricsChanged: boolean;
    } => {
    const session = videoSessionRef.current;
    if (!session.active || !session.videoId || !session.sessionId) {
      return {
        committed: false,
        metricsChanged: false,
      };
    }

    const endedAtMs = Date.now();
    const effectiveDuration = clampNonNegativeFloat(session.accumulatedSec);
    const shouldDropAsNoise = !session.hasFullscreen && effectiveDuration < 10;
    const totalSeconds = clampNonNegativeInt(session.totalSeconds);
    const completionRatio =
      totalSeconds > 0 ? clampRatio(effectiveDuration / totalSeconds) : 0;

    pendingVideoSessionsRef.current.push({
      session_id: session.sessionId,
      video_id: session.videoId,
      started_at_ms: session.startedAtMs > 0 ? session.startedAtMs : endedAtMs,
      ended_at_ms: endedAtMs,
      watch_seconds: effectiveDuration,
      total_seconds: totalSeconds,
      completion_ratio: completionRatio,
      had_fullscreen: session.hasFullscreen,
      is_noise: shouldDropAsNoise,
      end_reason: endReason,
    });

    videoSessionRef.current = {
      active: false,
      sessionId: "",
      checkpointSeq: 0,
      videoId: "",
      startedAtMs: 0,
      lastVideoTime: 0,
      accumulatedSec: 0,
      totalSeconds: 0,
      hasFullscreen: false,
    };

    if (shouldDropAsNoise) {
      return {
        committed: true,
        metricsChanged: false,
      };
    }

    const existing = videoMetricsByIdRef.current.get(session.videoId) ?? {
      eventCount: 0,
      watchSeconds: 0,
      totalSeconds,
      completionRatio: 0,
      lastEventTimeMs: null,
    };

    existing.eventCount += 1;
    existing.watchSeconds += effectiveDuration;
    existing.totalSeconds = Math.max(
      existing.totalSeconds,
      totalSeconds,
    );
    existing.completionRatio =
      existing.totalSeconds > 0
        ? clampRatio(existing.watchSeconds / existing.totalSeconds)
        : 0;
    existing.lastEventTimeMs = endedAtMs;
    videoMetricsByIdRef.current.set(session.videoId, existing);
      return {
        committed: true,
        metricsChanged: true,
      };
    },
    [],
  );

  useEffect(() => {
    const shouldTrackImage =
      mode === "image" &&
      fullscreenActive &&
      Boolean(focusedImageRef?.packageId);
    const currentImageSession = imageSessionRef.current;

    if (currentImageSession.active && !shouldTrackImage) {
      const committed = commitImageSession("image-session-end");
      if (committed) {
        flushToDatabase("image-session-end", { includeMetrics: true });
      }
    } else if (shouldTrackImage && focusedImageRef) {
      const currentPackage = packageById.get(focusedImageRef.packageId) ?? null;
      const totalPages = clampNonNegativeInt(
        currentPackage?.images.length ?? 0,
      );
      if (!currentImageSession.active) {
        imageSessionRef.current = {
          active: true,
          sessionId: createSessionId("img", sessionCounterRef),
          checkpointSeq: 0,
          sourceId: focusedImageRef.packageId,
          startedAtMs: Date.now(),
          maxIndex: clampNonNegativeInt(focusedImageRef.imageIndex),
          totalPages,
        };
        if (captureImageRuntimeCheckpoint()) {
          flushToDatabase("image-session-start", { includeMetrics: false });
        }
      } else if (currentImageSession.sourceId !== focusedImageRef.packageId) {
        const committed = commitImageSession("image-switch-node");
        if (committed) {
          flushToDatabase("image-switch-node", { includeMetrics: true });
        }
        imageSessionRef.current = {
          active: true,
          sessionId: createSessionId("img", sessionCounterRef),
          checkpointSeq: 0,
          sourceId: focusedImageRef.packageId,
          startedAtMs: Date.now(),
          maxIndex: clampNonNegativeInt(focusedImageRef.imageIndex),
          totalPages,
        };
        if (captureImageRuntimeCheckpoint()) {
          flushToDatabase("image-session-start", { includeMetrics: false });
        }
      } else {
        currentImageSession.maxIndex = Math.max(
          currentImageSession.maxIndex,
          clampNonNegativeInt(focusedImageRef.imageIndex),
        );
        currentImageSession.totalPages = Math.max(
          currentImageSession.totalPages,
          totalPages,
        );
      }
    }

    const shouldTrackVideo =
      mode === "video" && videoPlaying && Boolean(selectedVideoId);
    const currentVideoSession = videoSessionRef.current;
    const selectedVideo =
      videos.find((video) => video.id === selectedVideoId) ?? null;
    const selectedVideoDuration = clampNonNegativeInt(
      selectedVideo?.durationSec ?? 0,
    );

    if (!shouldTrackVideo) {
      if (currentVideoSession.active) {
        const commitResult = commitVideoSession("video-session-end");
        if (commitResult.committed) {
          flushToDatabase("video-session-end", {
            includeMetrics: commitResult.metricsChanged,
          });
        }
      }
      return;
    }

    if (!currentVideoSession.active) {
      videoSessionRef.current = {
        active: true,
        sessionId: createSessionId("vid", sessionCounterRef),
        checkpointSeq: 0,
        videoId: selectedVideoId,
        startedAtMs: Date.now(),
        lastVideoTime: clampNonNegativeFloat(videoTime),
        accumulatedSec: 0,
        totalSeconds: selectedVideoDuration,
        hasFullscreen: fullscreenActive,
      };
      if (captureVideoRuntimeCheckpoint()) {
        flushToDatabase("video-session-start", { includeMetrics: false });
      }
      return;
    }

    if (currentVideoSession.videoId !== selectedVideoId) {
      const commitResult = commitVideoSession("video-switch-node");
      if (commitResult.committed) {
        flushToDatabase("video-switch-node", {
          includeMetrics: commitResult.metricsChanged,
        });
      }
      videoSessionRef.current = {
        active: true,
        sessionId: createSessionId("vid", sessionCounterRef),
        checkpointSeq: 0,
        videoId: selectedVideoId,
        startedAtMs: Date.now(),
        lastVideoTime: clampNonNegativeFloat(videoTime),
        accumulatedSec: 0,
        totalSeconds: selectedVideoDuration,
        hasFullscreen: fullscreenActive,
      };
      if (captureVideoRuntimeCheckpoint()) {
        flushToDatabase("video-session-start", { includeMetrics: false });
      }
      return;
    }

    const nextVideoTime = clampNonNegativeFloat(videoTime);
    const delta = nextVideoTime - currentVideoSession.lastVideoTime;
    if (delta > 0 && delta < 120) {
      currentVideoSession.accumulatedSec += delta;
    }
    currentVideoSession.lastVideoTime = nextVideoTime;
    currentVideoSession.totalSeconds = Math.max(
      currentVideoSession.totalSeconds,
      selectedVideoDuration,
    );
    currentVideoSession.hasFullscreen =
      currentVideoSession.hasFullscreen || fullscreenActive;
  }, [
    commitImageSession,
    commitVideoSession,
    captureImageRuntimeCheckpoint,
    captureVideoRuntimeCheckpoint,
    focusedImageRef,
    flushToDatabase,
    fullscreenActive,
    mode,
    packageById,
    selectedVideoId,
    videoPlaying,
    videoTime,
    videos,
  ]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const imageCheckpointed = captureImageRuntimeCheckpoint();
      const videoCheckpointed = captureVideoRuntimeCheckpoint();
      if (imageCheckpointed || videoCheckpointed) {
        flushToDatabase("runtime-heartbeat", { includeMetrics: false });
      }
    }, PREFERENCE_RUNTIME_HEARTBEAT_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    captureImageRuntimeCheckpoint,
    captureVideoRuntimeCheckpoint,
    flushToDatabase,
  ]);

  useEffect(() => {
    const flushRuntimeCheckpoint = () => {
      const imageCheckpointed = captureImageRuntimeCheckpoint();
      const videoCheckpointed = captureVideoRuntimeCheckpoint();
      if (imageCheckpointed || videoCheckpointed) {
        flushToDatabase("runtime-pagehide", { includeMetrics: false });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushRuntimeCheckpoint();
      }
    };

    window.addEventListener("pagehide", flushRuntimeCheckpoint);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      flushRuntimeCheckpoint();
      window.removeEventListener("pagehide", flushRuntimeCheckpoint);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    captureImageRuntimeCheckpoint,
    captureVideoRuntimeCheckpoint,
    flushToDatabase,
  ]);

  useEffect(() => {
    const flushBeforeUnload = () => {
      const imageCommitted = commitImageSession("beforeunload");
      const videoResult = commitVideoSession("beforeunload");
      if (imageCommitted || videoResult.committed) {
        flushToDatabase("beforeunload", {
          includeMetrics: imageCommitted || videoResult.metricsChanged,
        });
        return;
      }

      const imageCheckpointed = captureImageRuntimeCheckpoint();
      const videoCheckpointed = captureVideoRuntimeCheckpoint();
      if (imageCheckpointed || videoCheckpointed) {
        flushToDatabase("beforeunload-runtime", { includeMetrics: false });
      }
    };

    window.addEventListener("beforeunload", flushBeforeUnload);
    return () => {
      flushBeforeUnload();
      window.removeEventListener("beforeunload", flushBeforeUnload);
    };
  }, [
    captureImageRuntimeCheckpoint,
    captureVideoRuntimeCheckpoint,
    commitImageSession,
    commitVideoSession,
    flushToDatabase,
  ]);
}
