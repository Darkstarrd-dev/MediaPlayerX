import { useCallback, useEffect, useRef } from "react";
import type { AppSettings } from "../../contracts/settings";
import type { MediaRepository } from "../backend/repository/types";
import { resolvePaletteModeById } from "../theme/themeRegistry";
import { FIXED_SUBTITLE_MODEL_ID } from "../subtitles/fixedModel";

interface UseSettingsPersistenceParams {
  settings: AppSettings;
  repository: MediaRepository;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const SETTINGS_STATE_KEY = "ui_settings_v1";
const DEFAULT_MUSIC_SHADER_ID = "mcs-szb";
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

type MusicVisualizerShaderSettings =
  AppSettings["musicVisualizerShaderSettingsById"][string];

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) {
    return fallback;
  }

  return normalized.toLowerCase();
}

function normalizeNumberInRange(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, value));
}

function normalizeShaderSettingEntry(
  value: unknown,
): MusicVisualizerShaderSettings | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const renderLongEdgePxRaw = source.renderLongEdgePx;
  const renderScaleCoeffRaw = source.renderScaleCoeff;
  const foregroundBackgroundScaleRatioRaw =
    source.foregroundBackgroundScaleRatio;
  const compositionModeRaw = source.compositionMode;
  const layeredBackgroundShaderIdRaw = source.layeredBackgroundShaderId;
  const layeredForegroundShaderIdRaw = source.layeredForegroundShaderId;
  const layeredBackgroundEnabledRaw = source.layeredBackgroundEnabled;
  const layeredForegroundEnabledRaw = source.layeredForegroundEnabled;
  const layeredForegroundOffsetXRaw = source.layeredForegroundOffsetX;
  const layeredForegroundOffsetYRaw = source.layeredForegroundOffsetY;
  const layeredForegroundScaleRaw = source.layeredForegroundScale;
  const fpsCapRaw = source.fpsCap;
  const toneMapModeRaw = source.toneMapMode;
  const toneMapExposureRaw = source.toneMapExposure;
  const toneMapStrengthRaw = source.toneMapStrength;
  const showFpsRaw = source.showFps;
  const rendererRaw = source.renderer;

  if (
    typeof renderLongEdgePxRaw !== "number" ||
    !Number.isFinite(renderLongEdgePxRaw)
  ) {
    return null;
  }
  if (fpsCapRaw !== 30 && fpsCapRaw !== 60 && fpsCapRaw !== 120) {
    return null;
  }
  if (
    toneMapModeRaw !== "off" &&
    toneMapModeRaw !== "reinhard" &&
    toneMapModeRaw !== "aces" &&
    toneMapModeRaw !== "filmic" &&
    toneMapModeRaw !== "agx" &&
    toneMapModeRaw !== "khronos"
  ) {
    return null;
  }
  if (
    typeof toneMapExposureRaw !== "number" ||
    !Number.isFinite(toneMapExposureRaw)
  ) {
    return null;
  }
  if (
    typeof toneMapStrengthRaw !== "number" ||
    !Number.isFinite(toneMapStrengthRaw)
  ) {
    return null;
  }
  if (typeof showFpsRaw !== "boolean") {
    return null;
  }
  if (rendererRaw !== "gpu" && rendererRaw !== "cpu") {
    return null;
  }

  const normalizedCompositionMode =
    compositionModeRaw === "layered" ? "layered" : "single";
  const normalizedLayeredBackgroundShaderId =
    typeof layeredBackgroundShaderIdRaw === "string"
      ? layeredBackgroundShaderIdRaw.trim().slice(0, 64)
      : "";
  const normalizedLayeredForegroundShaderId =
    typeof layeredForegroundShaderIdRaw === "string"
      ? layeredForegroundShaderIdRaw.trim().slice(0, 64)
      : "";

  const normalizedRenderScaleCoeff =
    typeof renderScaleCoeffRaw === "number" &&
    Number.isFinite(renderScaleCoeffRaw)
      ? Math.max(1, Math.min(5, renderScaleCoeffRaw))
      : typeof foregroundBackgroundScaleRatioRaw === "number" &&
          Number.isFinite(foregroundBackgroundScaleRatioRaw)
        ? Math.max(1, Math.min(5, foregroundBackgroundScaleRatioRaw))
        : 2;

  return {
    renderLongEdgePx: Math.max(
      240,
      Math.min(4096, Math.floor(renderLongEdgePxRaw)),
    ),
    renderScaleCoeff: normalizedRenderScaleCoeff,
    compositionMode: normalizedCompositionMode,
    layeredBackgroundShaderId: normalizedLayeredBackgroundShaderId || "galaxy",
    layeredForegroundShaderId:
      normalizedLayeredForegroundShaderId || DEFAULT_MUSIC_SHADER_ID,
    layeredBackgroundEnabled:
      typeof layeredBackgroundEnabledRaw === "boolean"
        ? layeredBackgroundEnabledRaw
        : true,
    layeredForegroundEnabled:
      typeof layeredForegroundEnabledRaw === "boolean"
        ? layeredForegroundEnabledRaw
        : true,
    layeredForegroundOffsetX:
      typeof layeredForegroundOffsetXRaw === "number" &&
      Number.isFinite(layeredForegroundOffsetXRaw)
        ? Math.max(-1, Math.min(1, layeredForegroundOffsetXRaw))
        : 0,
    layeredForegroundOffsetY:
      typeof layeredForegroundOffsetYRaw === "number" &&
      Number.isFinite(layeredForegroundOffsetYRaw)
        ? Math.max(-1, Math.min(1, layeredForegroundOffsetYRaw))
        : 0,
    layeredForegroundScale:
      typeof layeredForegroundScaleRaw === "number" &&
      Number.isFinite(layeredForegroundScaleRaw)
        ? Math.max(0.25, Math.min(3, layeredForegroundScaleRaw))
        : 1,
    fpsCap: fpsCapRaw,
    toneMapMode: toneMapModeRaw,
    toneMapExposure: Math.max(0.5, Math.min(2, toneMapExposureRaw)),
    toneMapStrength: Math.max(0, Math.min(1, toneMapStrengthRaw)),
    showFps: showFpsRaw,
    renderer: rendererRaw,
  };
}

function normalizePersistedSettings(value: unknown): Partial<AppSettings> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const next = {
    ...(value as Record<string, unknown>),
  };

  const rawStyleId =
    typeof next.styleId === "string" ? next.styleId.trim() : "";
  const rawPaletteId =
    typeof next.paletteId === "string" ? next.paletteId.trim() : "";
  const rawThemeId =
    typeof next.themeId === "string" ? next.themeId.trim() : "";
  const rawPaletteMode =
    next.paletteMode === "night"
      ? "night"
      : next.paletteMode === "day"
        ? "day"
        : resolvePaletteModeById(rawPaletteId || rawThemeId || "");
  const rawPaletteDayId =
    typeof next.paletteDayId === "string" ? next.paletteDayId.trim() : "";
  const rawPaletteNightId =
    typeof next.paletteNightId === "string" ? next.paletteNightId.trim() : "";
  const rawUiLocale =
    typeof next.uiLocale === "string" ? next.uiLocale.trim() : "";

  next.styleId = rawStyleId || "flush";
  next.paletteId = rawPaletteId || rawThemeId || "parchment";
  next.paletteMode = rawPaletteMode;
  next.paletteDayId =
    rawPaletteDayId ||
    (rawPaletteMode === "day" ? next.paletteId : "parchment");
  next.paletteNightId =
    rawPaletteNightId ||
    (rawPaletteMode === "night" ? next.paletteId : "tokyo-night");
  if (
    rawUiLocale === "auto" ||
    rawUiLocale === "zh-CN" ||
    rawUiLocale === "en-US"
  ) {
    next.uiLocale = rawUiLocale;
  } else if ("uiLocale" in next) {
    delete next.uiLocale;
  }
  next.themeId = next.paletteId;

  if (
    typeof next.subtitleFeatureEnabled !== "boolean" &&
    "subtitleFeatureEnabled" in next
  ) {
    delete next.subtitleFeatureEnabled;
  }

  if (
    next.subtitleAcceleration !== "auto" &&
    next.subtitleAcceleration !== "cpu" &&
    next.subtitleAcceleration !== "directml" &&
    "subtitleAcceleration" in next
  ) {
    delete next.subtitleAcceleration;
  }
  next.subtitleAcceleration = "cpu";

  if (
    next.subtitleLanguage !== "auto" &&
    next.subtitleLanguage !== "zh" &&
    next.subtitleLanguage !== "en" &&
    next.subtitleLanguage !== "ja" &&
    next.subtitleLanguage !== "ko" &&
    next.subtitleLanguage !== "yue" &&
    "subtitleLanguage" in next
  ) {
    delete next.subtitleLanguage;
  }

  if (typeof next.subtitleModelDir === "string") {
    next.subtitleModelDir = next.subtitleModelDir.trim().slice(0, 1024);
  } else if ("subtitleModelDir" in next) {
    delete next.subtitleModelDir;
  }

  next.subtitleSelectedModelId = FIXED_SUBTITLE_MODEL_ID;
  next.subtitleTextFillMode =
    next.subtitleTextFillMode === "gradient" ? "gradient" : "solid";
  next.subtitleTextColor = normalizeHexColor(next.subtitleTextColor, "#ffffff");
  next.subtitleGradientStartColor = normalizeHexColor(
    next.subtitleGradientStartColor,
    "#ffffff",
  );
  next.subtitleGradientEndColor = normalizeHexColor(
    next.subtitleGradientEndColor,
    "#7fd6ff",
  );
  next.subtitleGradientDirection =
    next.subtitleGradientDirection === "left-to-right" ||
    next.subtitleGradientDirection === "right-to-left" ||
    next.subtitleGradientDirection === "top-to-bottom" ||
    next.subtitleGradientDirection === "bottom-to-top" ||
    next.subtitleGradientDirection === "top-left-to-bottom-right" ||
    next.subtitleGradientDirection === "top-right-to-bottom-left" ||
    next.subtitleGradientDirection === "bottom-left-to-top-right" ||
    next.subtitleGradientDirection === "bottom-right-to-top-left"
      ? next.subtitleGradientDirection
      : "left-to-right";
  next.subtitleGradientCurve =
    next.subtitleGradientCurve === "linear" ||
    next.subtitleGradientCurve === "smooth" ||
    next.subtitleGradientCurve === "bezier" ||
    next.subtitleGradientCurve === "smoother"
      ? next.subtitleGradientCurve
      : "smooth";
  next.subtitleStrokeColor = normalizeHexColor(
    next.subtitleStrokeColor,
    "#000000",
  );
  next.subtitleStrokeWidth = normalizeNumberInRange(
    next.subtitleStrokeWidth,
    2,
    0,
    8,
  );
  next.subtitleStrokeShadowColor = normalizeHexColor(
    next.subtitleStrokeShadowColor,
    "#000000",
  );
  next.subtitleStrokeShadowRadius = normalizeNumberInRange(
    next.subtitleStrokeShadowRadius,
    6,
    0,
    24,
  );
  next.subtitleFontSize = normalizeNumberInRange(
    next.subtitleFontSize,
    24,
    14,
    72,
  );
  next.subtitleMaxLineChars = Math.round(
    normalizeNumberInRange(next.subtitleMaxLineChars, 28, 8, 80),
  );
  if (
    next.subtitleSelectionByVideoId &&
    typeof next.subtitleSelectionByVideoId === "object" &&
    !Array.isArray(next.subtitleSelectionByVideoId)
  ) {
    const normalizedByVideoId: AppSettings["subtitleSelectionByVideoId"] = {};
    for (const [rawVideoId, rawSubtitleId] of Object.entries(
      next.subtitleSelectionByVideoId as Record<string, unknown>,
    )) {
      const videoId = rawVideoId.trim();
      const subtitleId =
        typeof rawSubtitleId === "string" ? rawSubtitleId.trim() : "";
      if (!videoId || !subtitleId) {
        continue;
      }
      normalizedByVideoId[videoId] = subtitleId.slice(0, 512);
    }
    next.subtitleSelectionByVideoId = normalizedByVideoId;
  } else if ("subtitleSelectionByVideoId" in next) {
    delete next.subtitleSelectionByVideoId;
  }
  if (typeof next.subtitleCleanupLlmPrompt === "string") {
    next.subtitleCleanupLlmPrompt = next.subtitleCleanupLlmPrompt.slice(
      0,
      12000,
    );
  } else if ("subtitleCleanupLlmPrompt" in next) {
    delete next.subtitleCleanupLlmPrompt;
  }
  next.subtitleOffsetY = normalizeNumberInRange(
    next.subtitleOffsetY,
    180,
    -400,
    400,
  );
  next.subtitleValidPlaybackRateThreshold = normalizeNumberInRange(
    next.subtitleValidPlaybackRateThreshold,
    1,
    0.1,
    10,
  );
  next.subtitleStylePanelExpanded =
    typeof next.subtitleStylePanelExpanded === "boolean"
      ? next.subtitleStylePanelExpanded
      : false;
  if (
    next.videoSavedPlaylists &&
    typeof next.videoSavedPlaylists === "object" &&
    !Array.isArray(next.videoSavedPlaylists)
  ) {
    const normalizedSavedPlaylists: AppSettings["videoSavedPlaylists"] = {};
    for (const [rawName, rawIds] of Object.entries(
      next.videoSavedPlaylists as Record<string, unknown>,
    )) {
      const name = rawName.trim().slice(0, 64);
      if (!name || !Array.isArray(rawIds)) {
        continue;
      }
      const ids = Array.from(
        new Set(
          rawIds
            .map((id) => (typeof id === "string" ? id.trim() : ""))
            .filter(Boolean),
        ),
      ).slice(0, 2000);
      normalizedSavedPlaylists[name] = ids;
    }
    next.videoSavedPlaylists = normalizedSavedPlaylists;
  } else {
    next.videoSavedPlaylists = {};
  }

  const normalizeCollapsedFolderNodeIds = (raw: unknown): string[] | null => {
    if (!Array.isArray(raw)) {
      return null;
    }
    return Array.from(
      new Set(
        raw
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean),
      ),
    );
  };

  const normalizedImageCollapsedFolderNodeIds = normalizeCollapsedFolderNodeIds(
    next.imageCollapsedFolderNodeIds,
  );
  if (normalizedImageCollapsedFolderNodeIds) {
    next.imageCollapsedFolderNodeIds = normalizedImageCollapsedFolderNodeIds;
  } else if ("imageCollapsedFolderNodeIds" in next) {
    delete next.imageCollapsedFolderNodeIds;
  }

  const normalizedVideoCollapsedFolderNodeIds = normalizeCollapsedFolderNodeIds(
    next.videoCollapsedFolderNodeIds,
  );
  if (normalizedVideoCollapsedFolderNodeIds) {
    next.videoCollapsedFolderNodeIds = normalizedVideoCollapsedFolderNodeIds;
  } else if ("videoCollapsedFolderNodeIds" in next) {
    delete next.videoCollapsedFolderNodeIds;
  }

  const normalizedMusicCollapsedFolderNodeIds = normalizeCollapsedFolderNodeIds(
    next.musicCollapsedFolderNodeIds,
  );
  if (normalizedMusicCollapsedFolderNodeIds) {
    next.musicCollapsedFolderNodeIds = normalizedMusicCollapsedFolderNodeIds;
  } else if ("musicCollapsedFolderNodeIds" in next) {
    delete next.musicCollapsedFolderNodeIds;
  }

  const legacyVectorPanelHeight = next.vectorPanelHeight;
  const hasNextWorkspaceBottomPanelHeight =
    typeof next.workspaceBottomPanelHeight === "number" &&
    Number.isFinite(next.workspaceBottomPanelHeight);
  if (
    !hasNextWorkspaceBottomPanelHeight &&
    typeof legacyVectorPanelHeight === "number" &&
    Number.isFinite(legacyVectorPanelHeight)
  ) {
    next.workspaceBottomPanelHeight = legacyVectorPanelHeight;
  }
  delete next.vectorPanelHeight;

  if (
    typeof next.adReviewMaxConcurrency === "number" &&
    Number.isFinite(next.adReviewMaxConcurrency)
  ) {
    next.adReviewMaxConcurrency = Math.max(
      1,
      Math.min(20, Math.floor(next.adReviewMaxConcurrency)),
    );
  }

  if (
    typeof next.settingsBackdropOpacity === "number" &&
    Number.isFinite(next.settingsBackdropOpacity)
  ) {
    next.settingsBackdropOpacity = Math.max(
      0,
      Math.min(100, next.settingsBackdropOpacity),
    );
  } else if (
    typeof next.settingsBackdropBlur === "number" &&
    Number.isFinite(next.settingsBackdropBlur)
  ) {
    const migratedOpacity = Math.max(
      0,
      Math.min(100, (next.settingsBackdropBlur / 24) * 100),
    );
    next.settingsBackdropOpacity = Number(migratedOpacity.toFixed(0));
  } else if ("settingsBackdropOpacity" in next) {
    delete next.settingsBackdropOpacity;
  }

  if ("settingsBackdropBlur" in next) {
    delete next.settingsBackdropBlur;
  }

  if (
    typeof next.thumbnailGenerationConcurrency === "number" &&
    Number.isFinite(next.thumbnailGenerationConcurrency)
  ) {
    next.thumbnailGenerationConcurrency = Math.max(
      1,
      Math.min(16, Math.floor(next.thumbnailGenerationConcurrency)),
    );
  } else if ("thumbnailGenerationConcurrency" in next) {
    delete next.thumbnailGenerationConcurrency;
  }

  if (
    typeof next.thumbnailResolveConcurrency === "number" &&
    Number.isFinite(next.thumbnailResolveConcurrency)
  ) {
    next.thumbnailResolveConcurrency = Math.max(
      1,
      Math.min(32, Math.floor(next.thumbnailResolveConcurrency)),
    );
  } else if ("thumbnailResolveConcurrency" in next) {
    delete next.thumbnailResolveConcurrency;
  }

  if (
    typeof next.musicVisualizerRenderLongEdgePx === "number" &&
    Number.isFinite(next.musicVisualizerRenderLongEdgePx)
  ) {
    next.musicVisualizerRenderLongEdgePx = Math.max(
      240,
      Math.min(4096, Math.floor(next.musicVisualizerRenderLongEdgePx)),
    );
  } else if ("musicVisualizerRenderLongEdgePx" in next) {
    delete next.musicVisualizerRenderLongEdgePx;
  }

  if (
    next.musicVisualizerFpsCap !== 30 &&
    next.musicVisualizerFpsCap !== 60 &&
    next.musicVisualizerFpsCap !== 120 &&
    "musicVisualizerFpsCap" in next
  ) {
    delete next.musicVisualizerFpsCap;
  }

  if (typeof next.musicVisualizerSelectedShaderId === "string") {
    next.musicVisualizerSelectedShaderId = next.musicVisualizerSelectedShaderId
      .trim()
      .slice(0, 64);
  } else if ("musicVisualizerSelectedShaderId" in next) {
    delete next.musicVisualizerSelectedShaderId;
  }

  if (
    next.musicVisualizerToneMapMode !== "off" &&
    next.musicVisualizerToneMapMode !== "reinhard" &&
    next.musicVisualizerToneMapMode !== "aces" &&
    next.musicVisualizerToneMapMode !== "filmic" &&
    next.musicVisualizerToneMapMode !== "agx" &&
    next.musicVisualizerToneMapMode !== "khronos" &&
    "musicVisualizerToneMapMode" in next
  ) {
    delete next.musicVisualizerToneMapMode;
  }

  if (
    typeof next.musicVisualizerToneMapExposure === "number" &&
    Number.isFinite(next.musicVisualizerToneMapExposure)
  ) {
    next.musicVisualizerToneMapExposure = Math.max(
      0.5,
      Math.min(2, next.musicVisualizerToneMapExposure),
    );
  } else if ("musicVisualizerToneMapExposure" in next) {
    delete next.musicVisualizerToneMapExposure;
  }

  if (
    typeof next.musicVisualizerToneMapStrength === "number" &&
    Number.isFinite(next.musicVisualizerToneMapStrength)
  ) {
    next.musicVisualizerToneMapStrength = Math.max(
      0,
      Math.min(1, next.musicVisualizerToneMapStrength),
    );
  } else if ("musicVisualizerToneMapStrength" in next) {
    delete next.musicVisualizerToneMapStrength;
  }

  if (
    typeof next.musicVisualizerShowFps !== "boolean" &&
    "musicVisualizerShowFps" in next
  ) {
    delete next.musicVisualizerShowFps;
  }

  if (
    next.musicVisualizerRenderer !== "gpu" &&
    next.musicVisualizerRenderer !== "cpu" &&
    "musicVisualizerRenderer" in next
  ) {
    delete next.musicVisualizerRenderer;
  }

  const normalizedShaderSettingsById: AppSettings["musicVisualizerShaderSettingsById"] =
    {};
  const rawShaderSettingsById = next.musicVisualizerShaderSettingsById;
  if (rawShaderSettingsById && typeof rawShaderSettingsById === "object") {
    for (const [rawShaderId, rawValue] of Object.entries(
      rawShaderSettingsById as Record<string, unknown>,
    )) {
      const shaderId = rawShaderId.trim().slice(0, 64);
      if (!shaderId) {
        continue;
      }
      const normalizedEntry = normalizeShaderSettingEntry(rawValue);
      if (normalizedEntry) {
        normalizedShaderSettingsById[shaderId] = normalizedEntry;
      }
    }
  }

  const selectedShaderIdRaw =
    typeof next.musicVisualizerSelectedShaderId === "string"
      ? next.musicVisualizerSelectedShaderId.trim().slice(0, 64)
      : "";
  const selectedShaderId = selectedShaderIdRaw || DEFAULT_MUSIC_SHADER_ID;

  const migratedLegacyEntry: MusicVisualizerShaderSettings | null =
    typeof next.musicVisualizerRenderLongEdgePx === "number" &&
    Number.isFinite(next.musicVisualizerRenderLongEdgePx) &&
    (next.musicVisualizerFpsCap === 30 ||
      next.musicVisualizerFpsCap === 60 ||
      next.musicVisualizerFpsCap === 120) &&
    (next.musicVisualizerToneMapMode === "off" ||
      next.musicVisualizerToneMapMode === "reinhard" ||
      next.musicVisualizerToneMapMode === "aces" ||
      next.musicVisualizerToneMapMode === "filmic" ||
      next.musicVisualizerToneMapMode === "agx" ||
      next.musicVisualizerToneMapMode === "khronos") &&
    typeof next.musicVisualizerToneMapExposure === "number" &&
    Number.isFinite(next.musicVisualizerToneMapExposure) &&
    typeof next.musicVisualizerToneMapStrength === "number" &&
    Number.isFinite(next.musicVisualizerToneMapStrength) &&
    typeof next.musicVisualizerShowFps === "boolean" &&
    (next.musicVisualizerRenderer === "gpu" ||
      next.musicVisualizerRenderer === "cpu")
      ? {
          renderLongEdgePx: Math.max(
            240,
            Math.min(4096, Math.floor(next.musicVisualizerRenderLongEdgePx)),
          ),
          renderScaleCoeff: 2,
          compositionMode: "single",
          layeredBackgroundShaderId: "galaxy",
          layeredForegroundShaderId: DEFAULT_MUSIC_SHADER_ID,
          layeredBackgroundEnabled: true,
          layeredForegroundEnabled: true,
          layeredForegroundOffsetX: 0,
          layeredForegroundOffsetY: 0,
          layeredForegroundScale: 1,
          fpsCap: next.musicVisualizerFpsCap,
          toneMapMode: next.musicVisualizerToneMapMode,
          toneMapExposure: Math.max(
            0.5,
            Math.min(2, next.musicVisualizerToneMapExposure),
          ),
          toneMapStrength: Math.max(
            0,
            Math.min(1, next.musicVisualizerToneMapStrength),
          ),
          showFps: next.musicVisualizerShowFps,
          renderer: next.musicVisualizerRenderer,
        }
      : null;

  if (!normalizedShaderSettingsById[selectedShaderId] && migratedLegacyEntry) {
    normalizedShaderSettingsById[selectedShaderId] = migratedLegacyEntry;
  }

  if (Object.keys(normalizedShaderSettingsById).length > 0) {
    next.musicVisualizerShaderSettingsById = normalizedShaderSettingsById;
  } else if ("musicVisualizerShaderSettingsById" in next) {
    delete next.musicVisualizerShaderSettingsById;
  }

  return next as Partial<AppSettings>;
}

export function useSettingsPersistence({
  settings,
  repository,
  updateSettings,
}: UseSettingsPersistenceParams) {
  const isHydratedRef = useRef(false);
  const lastSavedJsonRef = useRef("");
  const pendingJsonRef = useRef<string | null>(null);

  const initialSettingsRef = useRef<AppSettings | null>(null);
  if (initialSettingsRef.current == null) {
    initialSettingsRef.current = settings;
  }

  const latestSettingsRef = useRef(settings);
  useEffect(() => {
    latestSettingsRef.current = settings;
  }, [settings]);

  const buildHydrationPatch = (
    persisted: Partial<AppSettings>,
  ): Partial<AppSettings> => {
    const initial = initialSettingsRef.current;
    const latest = latestSettingsRef.current;
    if (!initial) {
      return persisted;
    }

    const next: Partial<AppSettings> = {};
    const applyHydrationKey = <K extends keyof AppSettings>(key: K): void => {
      const persistedValue = persisted[key];
      if (typeof persistedValue === "undefined") {
        return;
      }

      // If the user (or other logic) has already modified a key before hydration completes,
      // do not let stale persisted values override it.
      if (Object.is(latest[key], initial[key])) {
        next[key] = persistedValue;
      }
    };

    for (const key of Object.keys(persisted) as Array<keyof AppSettings>) {
      applyHydrationKey(key);
    }
    return next;
  };

  // Hydrate from DB on mount
  useEffect(() => {
    if (!repository.readAppState) {
      isHydratedRef.current = true;
      return;
    }

    repository
      .readAppState({ state_key: SETTINGS_STATE_KEY })
      .then((response) => {
        if (response.state_json && response.state_json !== "null") {
          try {
            const parsed = JSON.parse(response.state_json);
            // Only update if we haven't modified settings locally yet (or just apply it once)
            if (!isHydratedRef.current) {
              updateSettings(
                buildHydrationPatch(normalizePersistedSettings(parsed)),
              );
            }
          } catch (e) {
            console.warn("Failed to parse persisted settings", e);
          }
        }
        isHydratedRef.current = true;
      })
      .catch((err) => {
        console.warn("Failed to hydrate settings from DB", err);
        isHydratedRef.current = true;
      });
  }, [repository, updateSettings]);

  // Persist to DB on change
  const persistSettingsJson = useCallback(
    async (json: string): Promise<void> => {
      if (!repository.writeAppState) {
        return;
      }

      try {
        await repository.writeAppState({
          state_key: SETTINGS_STATE_KEY,
          state_json: json,
        });
        lastSavedJsonRef.current = json;
      } catch (err) {
        console.warn("Failed to persist settings to DB", err);
      }
    },
    [repository],
  );

  useEffect(() => {
    if (!isHydratedRef.current || !repository.writeAppState) {
      return;
    }

    const currentJson = JSON.stringify(settings);
    if (currentJson === lastSavedJsonRef.current) {
      pendingJsonRef.current = null;
      return;
    }

    pendingJsonRef.current = currentJson;

    const timer = window.setTimeout(() => {
      const jsonToPersist = pendingJsonRef.current;
      if (!jsonToPersist) {
        return;
      }

      pendingJsonRef.current = null;
      void persistSettingsJson(jsonToPersist);
    }, 300);

    return () => clearTimeout(timer);
  }, [settings, repository, persistSettingsJson]);

  useEffect(() => {
    const flushPending = () => {
      const pending = pendingJsonRef.current;
      if (!pending || pending === lastSavedJsonRef.current) {
        return;
      }

      pendingJsonRef.current = null;
      void persistSettingsJson(pending);
    };

    window.addEventListener("beforeunload", flushPending);
    return () => {
      flushPending();
      window.removeEventListener("beforeunload", flushPending);
    };
  }, [persistSettingsJson]);
}
