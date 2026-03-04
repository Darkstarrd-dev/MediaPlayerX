import { useCallback, useEffect, useRef } from "react";
import type { AppSettings } from "../../contracts/settings";
import type { MediaRepository } from "../backend/repository/types";
import { resolvePaletteModeById } from "../theme/themeRegistry";
import { normalizeSubtitleModelSelectionId } from "../subtitles/fixedModel";
import { getBenchSettings } from "../perf/benchSettings";

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
type MusicVisualizerPluginInputBinding =
  AppSettings["musicVisualizerPluginInputBindingsByShaderId"][string];
type MusicVisualizerPluginCustomBinding =
  AppSettings["musicVisualizerPluginCustomBindingsByShaderId"][string];
type MusicVisualizerShaderLab = AppSettings["musicVisualizerShaderLab"];

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

function normalizePluginInputBindingEntry(
  value: unknown,
): MusicVisualizerPluginInputBinding | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const normalizeUniformName = (raw: unknown, fallback: string): string => {
    if (typeof raw !== "string") {
      return fallback;
    }
    const normalized = raw.trim().slice(0, 64);
    return normalized.length > 0 ? normalized : fallback;
  };

  return {
    audioLevelUniform: normalizeUniformName(
      source.audioLevelUniform,
      "iAudioLevel",
    ),
    audioBeatUniform: normalizeUniformName(source.audioBeatUniform, "iAudioBeat"),
    timeUniform: normalizeUniformName(source.timeUniform, "iTime"),
    audioTextureSampler: normalizeUniformName(
      source.audioTextureSampler,
      "iChannel0",
    ),
  };
}

function normalizePluginCustomBindingEntry(
  value: unknown,
): MusicVisualizerPluginCustomBinding | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const scalarBindingsRaw =
    source.scalarBindings && typeof source.scalarBindings === "object"
      ? (source.scalarBindings as Record<string, unknown>)
      : {};
  const samplerBindingsRaw =
    source.samplerBindings && typeof source.samplerBindings === "object"
      ? (source.samplerBindings as Record<string, unknown>)
      : {};
  const scalarTransformsRaw =
    source.scalarTransforms && typeof source.scalarTransforms === "object"
      ? (source.scalarTransforms as Record<string, unknown>)
      : {};

  const scalarBindings: MusicVisualizerPluginCustomBinding["scalarBindings"] =
    {};
  const scalarTransforms: MusicVisualizerPluginCustomBinding["scalarTransforms"] =
    {};
  const samplerBindings: MusicVisualizerPluginCustomBinding["samplerBindings"] =
    {};

  for (const [rawName, rawSignal] of Object.entries(scalarBindingsRaw)) {
    const uniformName = rawName.trim().slice(0, 64);
    if (!uniformName) {
      continue;
    }
    if (
      rawSignal === "none" ||
      rawSignal === "audioLevel" ||
      rawSignal === "audioBeat" ||
      rawSignal === "timeSec"
    ) {
      scalarBindings[uniformName] = rawSignal;
    }
  }

  for (const [rawName, rawSignal] of Object.entries(samplerBindingsRaw)) {
    const uniformName = rawName.trim().slice(0, 64);
    if (!uniformName) {
      continue;
    }
    if (rawSignal === "none" || rawSignal === "audioTexture") {
      samplerBindings[uniformName] = rawSignal;
    }
  }

  for (const [rawName, rawValue] of Object.entries(scalarTransformsRaw)) {
    const uniformName = rawName.trim().slice(0, 64);
    if (!uniformName || !rawValue || typeof rawValue !== "object") {
      continue;
    }
    const sourceTransform = rawValue as Record<string, unknown>;
    const normalizeNumber = (
      value: unknown,
      fallback: number,
      min: number,
      max: number,
    ): number => {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallback;
      }
      return Math.max(min, Math.min(max, value));
    };
    const clampEnabled =
      typeof sourceTransform.clampEnabled === "boolean"
        ? sourceTransform.clampEnabled
        : false;
    const clampMin = normalizeNumber(sourceTransform.clampMin, 0, -4, 4);
    const clampMaxRaw = normalizeNumber(sourceTransform.clampMax, 1, -4, 4);
    const clampMax = Math.max(clampMin, clampMaxRaw);
    scalarTransforms[uniformName] = {
      scale: normalizeNumber(sourceTransform.scale, 1, -16, 16),
      bias: normalizeNumber(sourceTransform.bias, 0, -4, 4),
      clampEnabled,
      clampMin,
      clampMax,
      smoothEnabled:
        typeof sourceTransform.smoothEnabled === "boolean"
          ? sourceTransform.smoothEnabled
          : false,
      smoothAttack: normalizeNumber(sourceTransform.smoothAttack, 0.35, 0, 1),
      smoothRelease: normalizeNumber(sourceTransform.smoothRelease, 0.12, 0, 1),
    };
  }

  return {
    scalarBindings,
    scalarTransforms,
    samplerBindings,
  };
}

function normalizeShaderLabConfig(value: unknown): MusicVisualizerShaderLab | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const adapterModeRaw = source.adapterMode;
  const previewFpsCapRaw = source.previewFpsCap;
  const previewRenderLongEdgePxRaw = source.previewRenderLongEdgePx;
  const previewInputSourceRaw = source.previewInputSource;

  const adapterMode =
    adapterModeRaw === "auto" ||
    adapterModeRaw === "shadertoy" ||
    adapterModeRaw === "glsl"
      ? adapterModeRaw
      : "auto";
  const previewFpsCap =
    previewFpsCapRaw === 30 || previewFpsCapRaw === 60 || previewFpsCapRaw === 120
      ? previewFpsCapRaw
      : 60;
  const previewRenderLongEdgePx =
    typeof previewRenderLongEdgePxRaw === "number" &&
    Number.isFinite(previewRenderLongEdgePxRaw)
      ? Math.max(240, Math.min(2048, Math.floor(previewRenderLongEdgePxRaw)))
      : 1280;
  const previewInputSource =
    previewInputSourceRaw === "demo" || previewInputSourceRaw === "player"
      ? previewInputSourceRaw
      : "demo";

  return {
    adapterMode,
    previewFpsCap,
    previewRenderLongEdgePx,
    previewInputSource,
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
  const rawSettingsPanelSection =
    typeof next.settingsPanelSection === "string"
      ? next.settingsPanelSection.trim()
      : "";
  const rawSidebarLabelDisplayMode =
    typeof next.sidebarLabelDisplayMode === "string"
      ? next.sidebarLabelDisplayMode.trim()
      : "";
  const rawSidebarTreeDisplayMode =
    typeof next.sidebarTreeDisplayMode === "string"
      ? next.sidebarTreeDisplayMode.trim()
      : "";

  next.styleId = rawStyleId || "soft-skeuomorphic";
  next.paletteId = rawPaletteId || rawThemeId || "skeuomorphic-luxury-white";
  next.paletteMode = rawPaletteMode;
  next.paletteDayId =
    rawPaletteDayId ||
    (rawPaletteMode === "day" ? next.paletteId : "skeuomorphic-luxury-white");
  next.paletteNightId =
    rawPaletteNightId ||
    (rawPaletteMode === "night" ? next.paletteId : "skeuomorphic-luxury-white");
  if (
    rawUiLocale === "auto" ||
    rawUiLocale === "zh-CN" ||
    rawUiLocale === "en-US"
  ) {
    next.uiLocale = rawUiLocale;
  } else if ("uiLocale" in next) {
    delete next.uiLocale;
  }
  if (
    rawSettingsPanelSection === "layout" ||
    rawSettingsPanelSection === "performance" ||
    rawSettingsPanelSection === "shader" ||
    rawSettingsPanelSection === "audio" ||
    rawSettingsPanelSection === "debug" ||
    rawSettingsPanelSection === "system" ||
    rawSettingsPanelSection === "model" ||
    rawSettingsPanelSection === "database" ||
    rawSettingsPanelSection === "shortcuts"
  ) {
    next.settingsPanelSection = rawSettingsPanelSection;
  } else if ("settingsPanelSection" in next) {
    delete next.settingsPanelSection;
  }
  if (
    rawSidebarLabelDisplayMode === "full" ||
    rawSidebarLabelDisplayMode === "leaf"
  ) {
    next.sidebarLabelDisplayMode = rawSidebarLabelDisplayMode;
  } else if ("sidebarLabelDisplayMode" in next) {
    delete next.sidebarLabelDisplayMode;
  }
  if (
    rawSidebarTreeDisplayMode === "direct" ||
    rawSidebarTreeDisplayMode === "hierarchy"
  ) {
    next.sidebarTreeDisplayMode = rawSidebarTreeDisplayMode;
  } else if ("sidebarTreeDisplayMode" in next) {
    delete next.sidebarTreeDisplayMode;
  }
  next.themeId = next.paletteId;

  if ("layoutGapScaleCoeff" in next) {
    next.layoutGapScaleCoeff = normalizeNumberInRange(
      next.layoutGapScaleCoeff,
      1,
      0,
      3,
    );
  }

  if ("paneInnerGapScaleCoeff" in next) {
    next.paneInnerGapScaleCoeff = normalizeNumberInRange(
      next.paneInnerGapScaleCoeff,
      1,
      0,
      2,
    );
  }

  if ("paneStackGapScaleCoeff" in next) {
    next.paneStackGapScaleCoeff = normalizeNumberInRange(
      next.paneStackGapScaleCoeff,
      1,
      0,
      2,
    );
  }

  if ("sidebarInnerGapScaleCoeff" in next) {
    next.sidebarInnerGapScaleCoeff = normalizeNumberInRange(
      next.sidebarInnerGapScaleCoeff,
      1,
      0,
      2,
    );
  }

  if ("thumbnailGapScaleCoeff" in next) {
    next.thumbnailGapScaleCoeff = normalizeNumberInRange(
      next.thumbnailGapScaleCoeff,
      1,
      0,
      2,
    );
  }

  if ("buttonGroupInsetScaleCoeff" in next) {
    next.buttonGroupInsetScaleCoeff = normalizeNumberInRange(
      next.buttonGroupInsetScaleCoeff,
      1,
      0,
      2,
    );
  }

  if ("paneHeaderHeightScaleCoeff" in next) {
    next.paneHeaderHeightScaleCoeff = normalizeNumberInRange(
      next.paneHeaderHeightScaleCoeff,
      1,
      0.5,
      2,
    );
  }

  if ("paneFooterHeightScaleCoeff" in next) {
    next.paneFooterHeightScaleCoeff = normalizeNumberInRange(
      next.paneFooterHeightScaleCoeff,
      1,
      0.5,
      2,
    );
  }

  if ("radiusCascadeScaleCoeff" in next) {
    next.radiusCascadeScaleCoeff = normalizeNumberInRange(
      next.radiusCascadeScaleCoeff,
      1,
      0,
      2,
    );
  }

  if ("radiusValueScaleCoeff" in next) {
    next.radiusValueScaleCoeff = normalizeNumberInRange(
      next.radiusValueScaleCoeff,
      1,
      0,
      2,
    );
  }

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

  const normalizedSubtitleModelDirByProfile: Record<string, string> = {};
  if (
    next.subtitleModelDirByProfile &&
    typeof next.subtitleModelDirByProfile === "object"
  ) {
    for (const [rawModelId, rawModelDir] of Object.entries(
      next.subtitleModelDirByProfile as Record<string, unknown>,
    )) {
      if (typeof rawModelDir !== "string") {
        continue;
      }
      const normalizedModelDir = rawModelDir.trim().slice(0, 1024);
      if (!normalizedModelDir) {
        continue;
      }
      const normalizedModelId = normalizeSubtitleModelSelectionId(rawModelId);
      normalizedSubtitleModelDirByProfile[normalizedModelId] =
        normalizedModelDir;
    }
  }

  const legacySubtitleModelDir =
    typeof next.subtitleModelDir === "string"
      ? next.subtitleModelDir.trim().slice(0, 1024)
      : "";

  const normalizedSubtitleSelectedModelId = normalizeSubtitleModelSelectionId(
    typeof next.subtitleSelectedModelId === "string"
      ? next.subtitleSelectedModelId
      : null,
  );
  next.subtitleSelectedModelId = normalizedSubtitleSelectedModelId;

  const activeSubtitleModelDir =
    normalizedSubtitleModelDirByProfile[normalizedSubtitleSelectedModelId] ??
    legacySubtitleModelDir;
  if (activeSubtitleModelDir) {
    normalizedSubtitleModelDirByProfile[normalizedSubtitleSelectedModelId] =
      activeSubtitleModelDir;
  }

  next.subtitleModelDir = activeSubtitleModelDir;
  next.subtitleModelDirByProfile = normalizedSubtitleModelDirByProfile;
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
    next.adReviewHashCompareStage !== "ad-review" &&
    next.adReviewHashCompareStage !== "import" &&
    "adReviewHashCompareStage" in next
  ) {
    delete next.adReviewHashCompareStage;
  }

  if (
    next.adReviewHashHitAction !== "silent-delete" &&
    next.adReviewHashHitAction !== "user-confirm" &&
    "adReviewHashHitAction" in next
  ) {
    delete next.adReviewHashHitAction;
  }

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
    "thumbnailAdaptiveResolution" in next &&
    typeof next.thumbnailAdaptiveResolution !== "boolean"
  ) {
    delete next.thumbnailAdaptiveResolution;
  }

  if (
    typeof next.thumbnailQueueSize === "number" &&
    Number.isFinite(next.thumbnailQueueSize)
  ) {
    next.thumbnailQueueSize = Math.max(
      16,
      Math.min(256, Math.floor(next.thumbnailQueueSize)),
    );
  } else if ("thumbnailQueueSize" in next) {
    delete next.thumbnailQueueSize;
  }

  if (
    typeof next.cpuTokenLimit === "number" &&
    Number.isFinite(next.cpuTokenLimit)
  ) {
    next.cpuTokenLimit = Math.max(
      1,
      Math.min(16, Math.floor(next.cpuTokenLimit)),
    );
  } else if ("cpuTokenLimit" in next) {
    delete next.cpuTokenLimit;
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
    typeof next.thumbnailWarmupRadius === "number" &&
    Number.isFinite(next.thumbnailWarmupRadius)
  ) {
    next.thumbnailWarmupRadius = Math.max(
      0,
      Math.min(3, Math.floor(next.thumbnailWarmupRadius)),
    );
  } else if ("thumbnailWarmupRadius" in next) {
    delete next.thumbnailWarmupRadius;
  }

  if (
    typeof next.thumbnailWarmupConcurrency === "number" &&
    Number.isFinite(next.thumbnailWarmupConcurrency)
  ) {
    next.thumbnailWarmupConcurrency = Math.max(
      1,
      Math.min(4, Math.floor(next.thumbnailWarmupConcurrency)),
    );
  } else if ("thumbnailWarmupConcurrency" in next) {
    delete next.thumbnailWarmupConcurrency;
  }

  // 缩略图级别迁移：旧 1-9 → 新 1-7，超出范围 clamp
  if (
    typeof next.thumbnailScale === "number" &&
    Number.isFinite(next.thumbnailScale)
  ) {
    next.thumbnailScale = Math.max(
      1,
      Math.min(7, Math.round(next.thumbnailScale)),
    );
  }

  if (
    typeof next.fullscreenPrefetchRadius === "number" &&
    Number.isFinite(next.fullscreenPrefetchRadius)
  ) {
    next.fullscreenPrefetchRadius = Math.max(
      2,
      Math.min(12, Math.floor(next.fullscreenPrefetchRadius)),
    );
  } else if ("fullscreenPrefetchRadius" in next) {
    delete next.fullscreenPrefetchRadius;
  }

  if (
    typeof next.fullscreenDecodeCacheSize === "number" &&
    Number.isFinite(next.fullscreenDecodeCacheSize)
  ) {
    next.fullscreenDecodeCacheSize = Math.max(
      4,
      Math.min(16, Math.floor(next.fullscreenDecodeCacheSize)),
    );
  } else if ("fullscreenDecodeCacheSize" in next) {
    delete next.fullscreenDecodeCacheSize;
  }

  if (
    typeof next.fullscreenResamplingEnabled !== "boolean" &&
    "fullscreenResamplingEnabled" in next
  ) {
    delete next.fullscreenResamplingEnabled;
  }

  const isValidFullscreenKernel = (
    value: unknown,
  ): value is AppSettings["fullscreenUpsamplingKernel"] => {
    return (
      value === "lanczos3" ||
      value === "mitchell" ||
      value === "nearest" ||
      value === "cubic"
    );
  };

  if (!isValidFullscreenKernel(next.fullscreenUpsamplingKernel)) {
    if ("fullscreenUpsamplingKernel" in next) {
      delete next.fullscreenUpsamplingKernel;
    }
  }

  if (!isValidFullscreenKernel(next.fullscreenDownsamplingKernel)) {
    if ("fullscreenDownsamplingKernel" in next) {
      delete next.fullscreenDownsamplingKernel;
    }
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

  if (
    next.musicVisualizerRuntimeMode !== "legacy" &&
    next.musicVisualizerRuntimeMode !== "plugin" &&
    "musicVisualizerRuntimeMode" in next
  ) {
    delete next.musicVisualizerRuntimeMode;
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

  const normalizedPluginBindingsById: AppSettings["musicVisualizerPluginInputBindingsByShaderId"] =
    {};
  const rawPluginBindingsById = next.musicVisualizerPluginInputBindingsByShaderId;
  if (rawPluginBindingsById && typeof rawPluginBindingsById === "object") {
    for (const [rawShaderId, rawValue] of Object.entries(
      rawPluginBindingsById as Record<string, unknown>,
    )) {
      const shaderId = rawShaderId.trim().slice(0, 64);
      if (!shaderId) {
        continue;
      }
      const normalizedEntry = normalizePluginInputBindingEntry(rawValue);
      if (normalizedEntry) {
        normalizedPluginBindingsById[shaderId] = normalizedEntry;
      }
    }
  }

  if (Object.keys(normalizedPluginBindingsById).length > 0) {
    next.musicVisualizerPluginInputBindingsByShaderId = normalizedPluginBindingsById;
  } else if ("musicVisualizerPluginInputBindingsByShaderId" in next) {
    delete next.musicVisualizerPluginInputBindingsByShaderId;
  }

  const normalizedPluginCustomBindingsById: AppSettings["musicVisualizerPluginCustomBindingsByShaderId"] =
    {};
  const rawPluginCustomBindingsById =
    next.musicVisualizerPluginCustomBindingsByShaderId;
  if (
    rawPluginCustomBindingsById &&
    typeof rawPluginCustomBindingsById === "object"
  ) {
    for (const [rawShaderId, rawValue] of Object.entries(
      rawPluginCustomBindingsById as Record<string, unknown>,
    )) {
      const shaderId = rawShaderId.trim().slice(0, 64);
      if (!shaderId) {
        continue;
      }
      const normalizedEntry = normalizePluginCustomBindingEntry(rawValue);
      if (normalizedEntry) {
        normalizedPluginCustomBindingsById[shaderId] = normalizedEntry;
      }
    }
  }

  if (Object.keys(normalizedPluginCustomBindingsById).length > 0) {
    next.musicVisualizerPluginCustomBindingsByShaderId =
      normalizedPluginCustomBindingsById;
  } else if ("musicVisualizerPluginCustomBindingsByShaderId" in next) {
    delete next.musicVisualizerPluginCustomBindingsByShaderId;
  }

  const normalizedShaderLabConfig = normalizeShaderLabConfig(
    next.musicVisualizerShaderLab,
  );
  if (normalizedShaderLabConfig) {
    next.musicVisualizerShaderLab = normalizedShaderLabConfig;
  } else if ("musicVisualizerShaderLab" in next) {
    delete next.musicVisualizerShaderLab;
  }

  return next as Partial<AppSettings>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isSameHydrationValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }
    for (let index = 0; index < left.length; index += 1) {
      if (!isSameHydrationValue(left[index], right[index])) {
        return false;
      }
    }
    return true;
  }

  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) {
      return false;
    }

    for (const key of leftKeys) {
      if (!(key in right)) {
        return false;
      }
      if (!isSameHydrationValue(left[key], right[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

export function useSettingsPersistence({
  settings,
  repository,
  updateSettings,
}: UseSettingsPersistenceParams) {
  const benchEnabled = getBenchSettings().enabled;
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
      if (isSameHydrationValue(latest[key], initial[key])) {
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
    if (benchEnabled) {
      isHydratedRef.current = true;
      return;
    }

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
  }, [benchEnabled, repository, updateSettings]);

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
    if (benchEnabled || !isHydratedRef.current || !repository.writeAppState) {
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
  }, [benchEnabled, settings, repository, persistSettingsJson]);

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
      void persistSettingsJson(pending);
    };

    window.addEventListener("beforeunload", flushPending);
    return () => {
      flushPending();
      window.removeEventListener("beforeunload", flushPending);
    };
  }, [benchEnabled, persistSettingsJson]);

  // cpuTokenLimit 变更时通知后端动态调整信号量
  useEffect(() => {
    if (benchEnabled || !isHydratedRef.current) {
      return;
    }

    if (repository.updatePerformanceConfig) {
      repository
        .updatePerformanceConfig({ cpu_token_limit: settings.cpuTokenLimit })
        .catch(() => {
          // 忽略 IPC 调用失败（如后端未就绪）
        });
    }
  }, [benchEnabled, repository, settings.cpuTokenLimit]);
}
