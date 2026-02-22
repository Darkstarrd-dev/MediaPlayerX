import { useCallback, useEffect, useRef } from "react";

import type { MediaRepository } from "../backend/repository";
import type { BrowserMode, ImagePackage, VideoItem } from "../../types";

const PREFERENCE_METRICS_STATE_KEY = "xp_preference_metrics_v1";

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
  sourceId: string;
  maxIndex: number;
  totalPages: number;
}

interface VideoSessionState {
  active: boolean;
  videoId: string;
  lastVideoTime: number;
  accumulatedSec: number;
  totalSeconds: number;
  hasFullscreen: boolean;
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
  const imageMetricsBySourceIdRef = useRef(new Map<string, BufferedImageMetric>());
  const videoMetricsByIdRef = useRef(new Map<string, BufferedVideoMetric>());
  const imageSessionRef = useRef<ImageSessionState>({
    active: false,
    sourceId: "",
    maxIndex: 0,
    totalPages: 0,
  });
  const videoSessionRef = useRef<VideoSessionState>({
    active: false,
    videoId: "",
    lastVideoTime: 0,
    accumulatedSec: 0,
    totalSeconds: 0,
    hasFullscreen: false,
  });
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
            totalSeconds > 0 ? clampRatio(existing.watchSeconds / totalSeconds) : 0;
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

  const flushToDatabase = useCallback((reason: string) => {
    const writeAppState = repositoryRef.current.writeAppState;
    if (!writeAppState) {
      return;
    }

    const imageBySourceId: Record<string, Record<string, number | null>> = {};
    for (const [sourceId, metric] of imageMetricsBySourceIdRef.current) {
      imageBySourceId[sourceId] = {
        event_count: clampNonNegativeInt(metric.eventCount),
        pages_read: clampNonNegativeInt(metric.pagesRead),
        total_pages: clampNonNegativeInt(metric.totalPages),
        completion_ratio: clampRatio(metric.completionRatio),
        last_event_time_ms: metric.lastEventTimeMs,
      };
    }

    const videoById: Record<string, Record<string, number | null>> = {};
    for (const [videoId, metric] of videoMetricsByIdRef.current) {
      videoById[videoId] = {
        event_count: clampNonNegativeInt(metric.eventCount),
        watch_seconds: clampNonNegativeFloat(metric.watchSeconds),
        total_seconds: clampNonNegativeInt(metric.totalSeconds),
        completion_ratio: clampRatio(metric.completionRatio),
        last_event_time_ms: metric.lastEventTimeMs,
      };
    }

    const payload = {
      version: 1,
      reason,
      updated_at_ms: Date.now(),
      image_by_source_id: imageBySourceId,
      video_by_id: videoById,
    };
    const stateJson = JSON.stringify(payload);
    if (stateJson === lastFlushedJsonRef.current) {
      return;
    }

    writeChainRef.current = writeChainRef.current
      .catch(() => undefined)
      .then(async () => {
        await writeAppState({
          state_key: PREFERENCE_METRICS_STATE_KEY,
          state_json: stateJson,
        });
        lastFlushedJsonRef.current = stateJson;
      });
  }, []);

  const commitImageSession = useCallback((): boolean => {
    const session = imageSessionRef.current;
    if (!session.active || !session.sourceId) {
      return false;
    }

    const pagesRead = clampNonNegativeInt(session.maxIndex + 1);
    const totalPages = clampNonNegativeInt(session.totalPages);
    const existing = imageMetricsBySourceIdRef.current.get(session.sourceId) ?? {
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
    existing.lastEventTimeMs = Date.now();
    imageMetricsBySourceIdRef.current.set(session.sourceId, existing);

    imageSessionRef.current = {
      active: false,
      sourceId: "",
      maxIndex: 0,
      totalPages: 0,
    };
    return true;
  }, []);

  const commitVideoSession = useCallback((): boolean => {
    const session = videoSessionRef.current;
    if (!session.active || !session.videoId) {
      return false;
    }

    const effectiveDuration = clampNonNegativeFloat(session.accumulatedSec);
    const shouldDropAsNoise = !session.hasFullscreen && effectiveDuration < 10;
    videoSessionRef.current = {
      active: false,
      videoId: "",
      lastVideoTime: 0,
      accumulatedSec: 0,
      totalSeconds: 0,
      hasFullscreen: false,
    };

    if (shouldDropAsNoise) {
      return false;
    }

    const existing = videoMetricsByIdRef.current.get(session.videoId) ?? {
      eventCount: 0,
      watchSeconds: 0,
      totalSeconds: clampNonNegativeInt(session.totalSeconds),
      completionRatio: 0,
      lastEventTimeMs: null,
    };

    existing.eventCount += 1;
    existing.watchSeconds += effectiveDuration;
    existing.totalSeconds = Math.max(
      existing.totalSeconds,
      clampNonNegativeInt(session.totalSeconds),
    );
    existing.completionRatio =
      existing.totalSeconds > 0
        ? clampRatio(existing.watchSeconds / existing.totalSeconds)
        : 0;
    existing.lastEventTimeMs = Date.now();
    videoMetricsByIdRef.current.set(session.videoId, existing);
    return true;
  }, []);

  useEffect(() => {
    const shouldTrackImage =
      mode === "image" &&
      fullscreenActive &&
      Boolean(focusedImageRef?.packageId);
    const currentImageSession = imageSessionRef.current;

    if (currentImageSession.active && !shouldTrackImage) {
      const committed = commitImageSession();
      if (committed) {
        flushToDatabase("image-session-end");
      }
    } else if (shouldTrackImage && focusedImageRef) {
      const currentPackage = packageById.get(focusedImageRef.packageId) ?? null;
      const totalPages = clampNonNegativeInt(currentPackage?.images.length ?? 0);
      if (!currentImageSession.active) {
        imageSessionRef.current = {
          active: true,
          sourceId: focusedImageRef.packageId,
          maxIndex: clampNonNegativeInt(focusedImageRef.imageIndex),
          totalPages,
        };
      } else if (currentImageSession.sourceId !== focusedImageRef.packageId) {
        commitImageSession();
        imageSessionRef.current = {
          active: true,
          sourceId: focusedImageRef.packageId,
          maxIndex: clampNonNegativeInt(focusedImageRef.imageIndex),
          totalPages,
        };
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
    const selectedVideo = videos.find((video) => video.id === selectedVideoId) ?? null;
    const selectedVideoDuration = clampNonNegativeInt(selectedVideo?.durationSec ?? 0);

    if (!shouldTrackVideo) {
      if (currentVideoSession.active) {
        const committed = commitVideoSession();
        if (committed) {
          flushToDatabase("video-session-end");
        }
      }
      return;
    }

    if (!currentVideoSession.active) {
      videoSessionRef.current = {
        active: true,
        videoId: selectedVideoId,
        lastVideoTime: clampNonNegativeFloat(videoTime),
        accumulatedSec: 0,
        totalSeconds: selectedVideoDuration,
        hasFullscreen: fullscreenActive,
      };
      return;
    }

    if (currentVideoSession.videoId !== selectedVideoId) {
      const committed = commitVideoSession();
      if (committed) {
        flushToDatabase("video-switch-node");
      }
      videoSessionRef.current = {
        active: true,
        videoId: selectedVideoId,
        lastVideoTime: clampNonNegativeFloat(videoTime),
        accumulatedSec: 0,
        totalSeconds: selectedVideoDuration,
        hasFullscreen: fullscreenActive,
      };
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
    const flushBeforeUnload = () => {
      const imageCommitted = commitImageSession();
      const videoCommitted = commitVideoSession();
      if (imageCommitted || videoCommitted) {
        flushToDatabase("beforeunload");
      }
    };

    window.addEventListener("beforeunload", flushBeforeUnload);
    return () => {
      flushBeforeUnload();
      window.removeEventListener("beforeunload", flushBeforeUnload);
    };
  }, [commitImageSession, commitVideoSession, flushToDatabase]);
}
