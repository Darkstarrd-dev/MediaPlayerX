import { useCallback, useEffect, useRef } from "react";

import type { BrowserMode } from "../../types";
import type { MediaRepository } from "../backend/repository";
import { getBenchSettings } from "../perf/benchSettings";

const SESSION_CURSOR_STATE_KEY = "ui_session_cursor_v1";

interface PersistedSessionCursor {
  mode: BrowserMode;
  image: {
    packageId: string;
    imageIndex: number;
  };
  video: {
    videoId: string;
    timeSec: number;
  };
  music: {
    audioId: string;
  };
}

interface UsePersistedSessionCursorParams {
  repository: MediaRepository;
  mode: BrowserMode;
  importBusy: boolean;
  fullscreenActive: boolean;
  selectedPackageId: string;
  focusByPackage: Record<string, number>;
  pagedPageSize: number;
  packageByIdEffective: Map<
    string,
    { id: string; images: Array<{ hidden?: boolean }> }
  >;
  setSelectedPackageId: (id: string) => void;
  setImageFocusActive: (active: boolean) => void;
  setFocusByPackage: (
    updater: (previous: Record<string, number>) => Record<string, number>,
  ) => void;
  setPageByPackage: (
    updater: (previous: Record<string, number>) => Record<string, number>,
  ) => void;
  selectedVideoId: string;
  videoTime: number;
  rootScopedVideoIds: Set<string>;
  selectVideoFromBrowser: (
    videoId: string,
    options?: {
      play?: boolean;
      queueSource?: "sidebar" | "playlist";
      preserveRate?: boolean;
    },
  ) => void;
  setVideoTime: (updater: number | ((previous: number) => number)) => void;
  selectedAudioId: string;
  rootScopedAudioIds: Set<string>;
  setSelectedAudioId: (id: string) => void;
}

function isBrowserMode(value: unknown): value is BrowserMode {
  return value === "image" || value === "video" || value === "music";
}

function normalizePersistedCursor(
  value: unknown,
): PersistedSessionCursor | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  if (!isBrowserMode(raw.mode)) {
    return null;
  }

  const imageRaw = raw.image as Record<string, unknown> | undefined;
  const videoRaw = raw.video as Record<string, unknown> | undefined;
  const musicRaw = raw.music as Record<string, unknown> | undefined;

  return {
    mode: raw.mode,
    image: {
      packageId:
        typeof imageRaw?.packageId === "string"
          ? imageRaw.packageId.trim()
          : "",
      imageIndex:
        typeof imageRaw?.imageIndex === "number" &&
        Number.isFinite(imageRaw.imageIndex)
          ? Math.max(0, Math.floor(imageRaw.imageIndex))
          : 0,
    },
    video: {
      videoId:
        typeof videoRaw?.videoId === "string" ? videoRaw.videoId.trim() : "",
      timeSec:
        typeof videoRaw?.timeSec === "number" &&
        Number.isFinite(videoRaw.timeSec)
          ? Math.max(0, videoRaw.timeSec)
          : 0,
    },
    music: {
      audioId:
        typeof musicRaw?.audioId === "string" ? musicRaw.audioId.trim() : "",
    },
  };
}

export function usePersistedSessionCursor({
  repository,
  mode,
  importBusy,
  fullscreenActive,
  selectedPackageId,
  focusByPackage,
  pagedPageSize,
  packageByIdEffective,
  setSelectedPackageId,
  setImageFocusActive,
  setFocusByPackage,
  setPageByPackage,
  selectedVideoId,
  videoTime,
  rootScopedVideoIds,
  selectVideoFromBrowser,
  setVideoTime,
  selectedAudioId,
  rootScopedAudioIds,
  setSelectedAudioId,
}: UsePersistedSessionCursorParams): void {
  const benchEnabled = getBenchSettings().enabled;
  const hydratedRef = useRef(false);
  const appliedRef = useRef(false);
  const pendingHydratedCursorRef = useRef<PersistedSessionCursor | null>(null);
  const pendingJsonRef = useRef<string | null>(null);
  const lastSavedJsonRef = useRef("");

  const persistCursorJson = useCallback(
    async (json: string): Promise<void> => {
      if (!repository.writeAppState) {
        return;
      }

      try {
        await repository.writeAppState({
          state_key: SESSION_CURSOR_STATE_KEY,
          state_json: json,
        });
        lastSavedJsonRef.current = json;
      } catch (error) {
        console.warn("Failed to persist session cursor", error);
      }
    },
    [repository],
  );

  useEffect(() => {
    if (benchEnabled) {
      hydratedRef.current = true;
      appliedRef.current = true;
      return;
    }

    if (!repository.readAppState) {
      hydratedRef.current = true;
      return;
    }

    repository
      .readAppState({ state_key: SESSION_CURSOR_STATE_KEY })
      .then((response) => {
        if (response.state_json && response.state_json !== "null") {
          try {
            const parsed = normalizePersistedCursor(
              JSON.parse(response.state_json),
            );
            pendingHydratedCursorRef.current = parsed;
          } catch (error) {
            console.warn("Failed to parse persisted session cursor", error);
          }
        }
      })
      .finally(() => {
        hydratedRef.current = true;
      });
  }, [benchEnabled, repository]);

  useEffect(() => {
    if (!hydratedRef.current || appliedRef.current || importBusy || fullscreenActive) {
      return;
    }

    const persisted = pendingHydratedCursorRef.current;
    if (!persisted) {
      appliedRef.current = true;
      return;
    }

    if (persisted.mode === "image" && packageByIdEffective.size === 0) {
      return;
    }
    if (persisted.mode === "video" && rootScopedVideoIds.size === 0) {
      return;
    }
    if (persisted.mode === "music" && rootScopedAudioIds.size === 0) {
      return;
    }

    let resolvedImagePackageId = persisted.image.packageId;
    let resolvedImagePackage = resolvedImagePackageId
      ? (packageByIdEffective.get(resolvedImagePackageId) ?? null)
      : null;

    if (
      !resolvedImagePackageId ||
      !resolvedImagePackage ||
      !resolvedImagePackage.images.some((image) => !image.hidden)
    ) {
      for (const candidate of packageByIdEffective.values()) {
        if (!candidate.images.some((image) => !image.hidden)) {
          continue;
        }
        resolvedImagePackageId = candidate.id;
        resolvedImagePackage = candidate;
        break;
      }
    }

    if (persisted.mode === "image") {
      if (!resolvedImagePackageId || !resolvedImagePackage) {
        return;
      }

      const maxIndex = Math.max(0, resolvedImagePackage.images.length - 1);
      const nextImageIndex = Math.min(persisted.image.imageIndex, maxIndex);
      if (resolvedImagePackageId !== selectedPackageId) {
        setSelectedPackageId(resolvedImagePackageId);
      }
      setImageFocusActive(true);
      setFocusByPackage((previous) => ({
        ...previous,
        [resolvedImagePackageId]: nextImageIndex,
      }));
      setPageByPackage((previous) => ({
        ...previous,
        [resolvedImagePackageId]: Math.floor(
          nextImageIndex / Math.max(1, pagedPageSize),
        ),
      }));
    }

    let resolvedVideoId = "";
    const targetVideoId = persisted.video.videoId;
    if (rootScopedVideoIds.size > 0) {
      resolvedVideoId = rootScopedVideoIds.has(targetVideoId)
        ? targetVideoId
        : (Array.from(rootScopedVideoIds)[0] ?? "");
      if (resolvedVideoId && resolvedVideoId !== selectedVideoId) {
        selectVideoFromBrowser(resolvedVideoId, {
          queueSource: "sidebar",
          preserveRate: true,
        });
      }
      const nextTime =
        resolvedVideoId === targetVideoId ? persisted.video.timeSec : 0;
      setVideoTime(Math.max(0, nextTime));
    }

    const targetAudioId = persisted.music.audioId;
    if (rootScopedAudioIds.size > 0) {
      const resolvedAudioId = rootScopedAudioIds.has(targetAudioId)
        ? targetAudioId
        : (Array.from(rootScopedAudioIds)[0] ?? "");
      if (resolvedAudioId && resolvedAudioId !== selectedAudioId) {
        setSelectedAudioId(resolvedAudioId);
      }
    }

    appliedRef.current = true;
  }, [
    importBusy,
    fullscreenActive,
    packageByIdEffective,
    pagedPageSize,
    rootScopedAudioIds,
    rootScopedVideoIds,
    selectedPackageId,
    selectVideoFromBrowser,
    selectedAudioId,
    selectedVideoId,
    setVideoTime,
    setFocusByPackage,
    setImageFocusActive,
    setPageByPackage,
    setSelectedAudioId,
    setSelectedPackageId,
  ]);

  useEffect(() => {
    if (
      benchEnabled ||
      !hydratedRef.current ||
      !repository.writeAppState ||
      fullscreenActive
    ) {
      return;
    }

    const nextPayload: PersistedSessionCursor = {
      mode,
      image: {
        packageId: selectedPackageId,
        imageIndex: Math.max(0, focusByPackage[selectedPackageId] ?? 0),
      },
      video: {
        videoId: selectedVideoId,
        timeSec: Math.max(0, videoTime),
      },
      music: {
        audioId: selectedAudioId,
      },
    };

    const nextJson = JSON.stringify(nextPayload);
    if (nextJson === lastSavedJsonRef.current) {
      pendingJsonRef.current = null;
      return;
    }

    pendingJsonRef.current = nextJson;

    const timer = window.setTimeout(() => {
      const pending = pendingJsonRef.current;
      if (!pending) {
        return;
      }

      pendingJsonRef.current = null;
      void persistCursorJson(pending);
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [
    focusByPackage,
    fullscreenActive,
    mode,
    repository,
    persistCursorJson,
    selectedAudioId,
    selectedPackageId,
    selectedVideoId,
    videoTime,
    benchEnabled,
  ]);

  useEffect(() => {
    if (benchEnabled) {
      return;
    }

    const flushPending = () => {
      const pending = pendingJsonRef.current;
      if (!pending || pending === lastSavedJsonRef.current) {
        return;
      }

      pendingJsonRef.current = null;
      void persistCursorJson(pending);
    };

    window.addEventListener("beforeunload", flushPending);
    return () => {
      flushPending();
      window.removeEventListener("beforeunload", flushPending);
    };
  }, [benchEnabled, persistCursorJson]);
}
