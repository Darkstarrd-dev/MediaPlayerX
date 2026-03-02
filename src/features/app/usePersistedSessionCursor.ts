import { useCallback, useEffect, useRef, useState } from "react";

import type { BrowserMode } from "../../types";
import type { MediaRepository } from "../backend/repository";
import { getBenchSettings } from "../perf/benchSettings";

const SESSION_CURSOR_STATE_KEY = "ui_session_cursor_v1";

type VideoMetadataTab = "info" | "playlist";

interface PersistedSessionCursor {
  mode: BrowserMode;
  image: {
    packageId: string;
    imageIndex: number;
  };
  video: {
    videoId: string;
    timeSec: number;
    metadataTab: VideoMetadataTab;
  };
  music: {
    audioId: string;
    timeSec: number;
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
  metadataTab: VideoMetadataTab;
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
  setMetadataTab: (updater: VideoMetadataTab) => void;
  selectedAudioId: string;
  rootScopedAudioIds: Set<string>;
  setSelectedAudioId: (id: string) => void;
  setMusicTimeSec: (updater: number | ((previous: number) => number)) => void;
  setSelectedSidebarNodeId: (id: string | null) => void;
  imageSourceNodeIdMap: Map<string, string>;
  videoNodeIdMap: Map<string, string>;
  audioNodeIdMap: Map<string, string>;
}

function isBrowserMode(value: unknown): value is BrowserMode {
  return value === "image" || value === "video" || value === "music";
}

function isVideoMetadataTab(value: unknown): value is VideoMetadataTab {
  return value === "info" || value === "playlist";
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
      metadataTab: isVideoMetadataTab(videoRaw?.metadataTab)
        ? videoRaw.metadataTab
        : "info",
    },
    music: {
      audioId:
        typeof musicRaw?.audioId === "string" ? musicRaw.audioId.trim() : "",
      timeSec:
        typeof musicRaw?.timeSec === "number" &&
        Number.isFinite(musicRaw.timeSec)
          ? Math.max(0, musicRaw.timeSec)
          : 0,
    },
  };
}

function createEmptyPersistedCursor(): PersistedSessionCursor {
  return {
    mode: "image",
    image: {
      packageId: "",
      imageIndex: 0,
    },
    video: {
      videoId: "",
      timeSec: 0,
      metadataTab: "info",
    },
    music: {
      audioId: "",
      timeSec: 0,
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
  metadataTab,
  rootScopedVideoIds,
  selectVideoFromBrowser,
  setVideoTime,
  setMetadataTab,
  selectedAudioId,
  rootScopedAudioIds,
  setSelectedAudioId,
  setMusicTimeSec,
  setSelectedSidebarNodeId,
  imageSourceNodeIdMap,
  videoNodeIdMap,
  audioNodeIdMap,
}: UsePersistedSessionCursorParams): void {
  const benchEnabled = getBenchSettings().enabled;
  const hydratedRef = useRef(false);
  const restoredModeRef = useRef({
    image: false,
    video: false,
    music: false,
  });
  const [hydrationVersion, setHydrationVersion] = useState(0);
  const pendingHydratedCursorRef = useRef<PersistedSessionCursor | null>(null);
  const cursorStateRef = useRef<PersistedSessionCursor>(
    createEmptyPersistedCursor(),
  );
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
      restoredModeRef.current = {
        image: true,
        video: true,
        music: true,
      };
      setHydrationVersion((value) => value + 1);
      return;
    }

    if (!repository.readAppState) {
      hydratedRef.current = true;
      restoredModeRef.current = {
        image: true,
        video: true,
        music: true,
      };
      setHydrationVersion((value) => value + 1);
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
            if (parsed) {
              cursorStateRef.current = parsed;
              lastSavedJsonRef.current = response.state_json;
            }
          } catch (error) {
            console.warn("Failed to parse persisted session cursor", error);
          }
        }
      })
      .finally(() => {
        hydratedRef.current = true;
        setHydrationVersion((value) => value + 1);
      });
  }, [benchEnabled, repository]);

  useEffect(() => {
    if (!hydratedRef.current || importBusy || fullscreenActive) {
      return;
    }

    const persisted = pendingHydratedCursorRef.current;
    if (!persisted) {
      restoredModeRef.current = {
        image: true,
        video: true,
        music: true,
      };
      return;
    }

    if (!restoredModeRef.current.image) {
      if (packageByIdEffective.size === 0) {
        if (!persisted.image.packageId) {
          restoredModeRef.current.image = true;
        }
      } else {
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

        if (resolvedImagePackageId && resolvedImagePackage) {
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
          const nextImageSidebarNodeId =
            imageSourceNodeIdMap.get(resolvedImagePackageId) ?? null;
          if (persisted.mode === "image" && nextImageSidebarNodeId) {
            setSelectedSidebarNodeId(nextImageSidebarNodeId);
          }
        }

        restoredModeRef.current.image = true;
      }
    }

    if (!restoredModeRef.current.video) {
      const targetVideoId = persisted.video.videoId;
      if (rootScopedVideoIds.size === 0) {
        if (!targetVideoId) {
          restoredModeRef.current.video = true;
        }
      } else {
        const resolvedVideoId = rootScopedVideoIds.has(targetVideoId)
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
        setMetadataTab(persisted.video.metadataTab);
        const nextVideoSidebarNodeId =
          videoNodeIdMap.get(resolvedVideoId) ?? null;
        if (nextVideoSidebarNodeId) {
          setSelectedSidebarNodeId(nextVideoSidebarNodeId);
        }
        restoredModeRef.current.video = true;
      }
    }

    if (!restoredModeRef.current.music) {
      const targetAudioId = persisted.music.audioId;
      if (rootScopedAudioIds.size === 0) {
        if (!targetAudioId) {
          restoredModeRef.current.music = true;
        }
      } else {
        const resolvedAudioId = rootScopedAudioIds.has(targetAudioId)
          ? targetAudioId
          : (Array.from(rootScopedAudioIds)[0] ?? "");
        if (resolvedAudioId && resolvedAudioId !== selectedAudioId) {
          setSelectedAudioId(resolvedAudioId);
        }
        setMusicTimeSec(0);
        const nextAudioSidebarNodeId =
          audioNodeIdMap.get(resolvedAudioId) ?? null;
        if (persisted.mode === "music" && nextAudioSidebarNodeId) {
          setSelectedSidebarNodeId(nextAudioSidebarNodeId);
        }
        restoredModeRef.current.music = true;
      }
    }

    if (
      restoredModeRef.current.image &&
      restoredModeRef.current.video &&
      restoredModeRef.current.music
    ) {
      pendingHydratedCursorRef.current = null;
    }
  }, [
    importBusy,
    fullscreenActive,
    hydrationVersion,
    packageByIdEffective,
    pagedPageSize,
    rootScopedAudioIds,
    rootScopedVideoIds,
    imageSourceNodeIdMap,
    videoNodeIdMap,
    audioNodeIdMap,
    selectedPackageId,
    selectVideoFromBrowser,
    selectedAudioId,
    selectedVideoId,
    setVideoTime,
    setMetadataTab,
    setFocusByPackage,
    setImageFocusActive,
    setPageByPackage,
    setSelectedAudioId,
    setMusicTimeSec,
    setSelectedSidebarNodeId,
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

    const modeRestored = restoredModeRef.current[mode];
    if (!modeRestored) {
      return;
    }

    const nextPayload: PersistedSessionCursor = {
      ...cursorStateRef.current,
      image: {
        ...cursorStateRef.current.image,
      },
      video: {
        ...cursorStateRef.current.video,
      },
      music: {
        ...cursorStateRef.current.music,
      },
    };

    if (mode === "image") {
      const normalizedPackageId = selectedPackageId.trim();
      if (normalizedPackageId.length === 0) {
        return;
      }
      nextPayload.mode = "image";
      nextPayload.image.packageId = normalizedPackageId;
      nextPayload.image.imageIndex = Math.max(
        0,
        focusByPackage[normalizedPackageId] ?? 0,
      );
    } else if (mode === "video") {
      const normalizedVideoId = selectedVideoId.trim();
      if (normalizedVideoId.length === 0) {
        return;
      }
      nextPayload.mode = "video";
      nextPayload.video.videoId = normalizedVideoId;
      nextPayload.video.timeSec = Math.max(0, videoTime);
      nextPayload.video.metadataTab = metadataTab;
    } else {
      const normalizedAudioId = selectedAudioId.trim();
      if (normalizedAudioId.length === 0) {
        return;
      }

      nextPayload.mode = "music";
      nextPayload.music.audioId = normalizedAudioId;
      nextPayload.music.timeSec = 0;
    }

    const nextJson = JSON.stringify(nextPayload);
    if (nextJson === lastSavedJsonRef.current) {
      pendingJsonRef.current = null;
      return;
    }

    cursorStateRef.current = nextPayload;
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
    hydrationVersion,
    mode,
    metadataTab,
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
