import { create } from "zustand";

import { appSettingsSchema, type AppSettings } from "../contracts/settings";
import {
  DEFAULT_SHORTCUTS,
  normalizeShortcutBinding,
  type ShortcutAction,
  type ShortcutMap,
} from "../shortcuts";

const DEFAULT_MUSIC_SHADER_ID = "mcs-szb";

export const DEFAULT_SETTINGS: AppSettings = {
  mode: "image",
  vectorMode: false,
  settingsOpen: false,
  helpOpen: false,
  headerHeight: 56,
  settingsBackdropOpacity: 18,
  settingsFontSize: 14,
  sidebarRatio: 0.26,
  sidebarMinWidth: 180,
  layoutLocked: false,
  electronNativeChromeEnabled: false,
  themeParameterButtonVisible: false,
  sidebarFontSize: 14,
  sidebarCountFontSize: 12,
  sidebarIndentStep: 14,
  sidebarVerticalGap: 2,
  metadataRatio: 0.28,
  workspaceBottomPanelHeight: 164,
  fullscreenVideoControlsMaxWidth: 980,
  mediaPreloadMemoryBudgetMb: 1024,
  thumbnailScale: 5,
  thumbnailGap: 8,
  showNamesOnly: false,
  metadataCollapsed: false,
  autoPlayEnabled: false,
  autoPlayInterval: 2,
  searchField: "all",
  searchText: "",
  vectorThreshold: 0.62,
  sidebarFocus: "main",
  imageRootNodeId: null,
  videoRootNodeId: null,
  musicRootNodeId: null,
  imageCollapsedFolderNodeIds: [],
  videoCollapsedFolderNodeIds: [],
  musicCollapsedFolderNodeIds: [],
  uiLocale: "auto",
  themeId: "parchment",
  styleId: "flush",
  paletteId: "parchment",
  paletteMode: "day",
  paletteDayId: "parchment",
  paletteNightId: "tokyo-night",
  thumbnailQuality: 40,
  thumbnailWidth: 512,
  thumbnailGenerationConcurrency: 6,
  thumbnailResolveConcurrency: 8,
  thumbnailWarmupRadius: 1,
  thumbnailWarmupConcurrency: 2,
  fullscreenPrefetchRadius: 6,
  fullscreenDecodeCacheSize: 10,
  fullscreenResamplingEnabled: false,
  fullscreenUpsamplingKernel: "lanczos3",
  fullscreenDownsamplingKernel: "lanczos3",
  musicVisualizerRenderLongEdgePx: 1280,
  musicVisualizerFpsCap: 60,
  musicVisualizerSelectedShaderId: "",
  musicVisualizerToneMapMode: "aces",
  musicVisualizerToneMapExposure: 1,
  musicVisualizerToneMapStrength: 0.55,
  musicVisualizerShowFps: false,
  musicVisualizerRenderer: "gpu",
  musicVisualizerShaderSettingsById: {
    [DEFAULT_MUSIC_SHADER_ID]: {
      renderLongEdgePx: 1280,
      renderScaleCoeff: 2,
      compositionMode: "single",
      layeredBackgroundShaderId: "galaxy",
      layeredForegroundShaderId: DEFAULT_MUSIC_SHADER_ID,
      layeredBackgroundEnabled: true,
      layeredForegroundEnabled: true,
      layeredForegroundOffsetX: 0,
      layeredForegroundOffsetY: 0,
      layeredForegroundScale: 1,
      fpsCap: 60,
      toneMapMode: "aces",
      toneMapExposure: 1,
      toneMapStrength: 0.55,
      showFps: false,
      renderer: "gpu",
    },
  },
  proxyServer: "",
  ehentaiCookies: "",
  subtitleFeatureEnabled: false,
  subtitleRenderMode: "advanced",
  subtitleAdvancedVadPreset: "balanced",
  subtitleAdvancedVadThreshold: 0.42,
  subtitleAdvancedVadMinSilenceSec: 0.14,
  subtitleAdvancedVadMinSpeechSec: 0.18,
  subtitleAdvancedVadMaxSpeechSec: 3,
  subtitleAdvancedSpeakerThreshold: 0.5,
  subtitleValidPlaybackRateThreshold: 1,
  subtitleAcceleration: "cpu",
  subtitleLanguage: "auto",
  subtitleModelDir: "",
  subtitleSelectedModelId: "sensevoice-small-int8-2024-07-17",
  subtitleTextFillMode: "solid",
  subtitleTextColor: "#ffffff",
  subtitleGradientStartColor: "#ffffff",
  subtitleGradientEndColor: "#7fd6ff",
  subtitleGradientDirection: "left-to-right",
  subtitleGradientCurve: "smooth",
  subtitleStrokeColor: "#000000",
  subtitleStrokeWidth: 2,
  subtitleStrokeShadowColor: "#000000",
  subtitleStrokeShadowRadius: 6,
  subtitleFontSize: 24,
  subtitleMaxLineChars: 28,
  subtitleSelectionByVideoId: {},
  subtitleOffsetY: 180,
  subtitleStylePanelExpanded: false,
  videoSavedPlaylists: {},
  adReviewVisionEndpoint: "http://127.0.0.1:1234/v1/chat/completions",
  adReviewVisionModel: "",
  adReviewVisionVerified: false,
  subtitleCleanupLlmEndpoint: "http://127.0.0.1:1234/v1/chat/completions",
  subtitleCleanupLlmModel: "",
  subtitleCleanupLlmPrompt:
    "You are a subtitle cleanup assistant. Keep timing lines and numbering valid SRT format. Only return cleaned full SRT content. Remove obvious ASR mistakes, fix punctuation and segmentation, do not invent content.",
  adReviewStrategyMode: "all",
  adReviewHeadN: 4,
  adReviewTailN: 4,
  adReviewTailStopCleanStreak: 4,
  adReviewMaxConcurrency: 4,
};

const SETTINGS_KEYS: (keyof AppSettings)[] = [
  "mode",
  "vectorMode",
  "settingsOpen",
  "helpOpen",
  "headerHeight",
  "settingsBackdropOpacity",
  "settingsFontSize",
  "sidebarRatio",
  "sidebarMinWidth",
  "layoutLocked",
  "electronNativeChromeEnabled",
  "themeParameterButtonVisible",
  "sidebarFontSize",
  "sidebarCountFontSize",
  "sidebarIndentStep",
  "sidebarVerticalGap",
  "metadataRatio",
  "workspaceBottomPanelHeight",
  "fullscreenVideoControlsMaxWidth",
  "mediaPreloadMemoryBudgetMb",
  "thumbnailScale",
  "thumbnailGap",
  "showNamesOnly",
  "metadataCollapsed",
  "autoPlayEnabled",
  "autoPlayInterval",
  "searchField",
  "searchText",
  "vectorThreshold",
  "sidebarFocus",
  "imageRootNodeId",
  "videoRootNodeId",
  "musicRootNodeId",
  "imageCollapsedFolderNodeIds",
  "videoCollapsedFolderNodeIds",
  "musicCollapsedFolderNodeIds",
  "uiLocale",
  "themeId",
  "styleId",
  "paletteId",
  "paletteMode",
  "paletteDayId",
  "paletteNightId",
  "thumbnailQuality",
  "thumbnailWidth",
  "thumbnailGenerationConcurrency",
  "thumbnailResolveConcurrency",
  "thumbnailWarmupRadius",
  "thumbnailWarmupConcurrency",
  "fullscreenPrefetchRadius",
  "fullscreenDecodeCacheSize",
  "fullscreenResamplingEnabled",
  "fullscreenUpsamplingKernel",
  "fullscreenDownsamplingKernel",
  "musicVisualizerRenderLongEdgePx",
  "musicVisualizerFpsCap",
  "musicVisualizerSelectedShaderId",
  "musicVisualizerToneMapMode",
  "musicVisualizerToneMapExposure",
  "musicVisualizerToneMapStrength",
  "musicVisualizerShowFps",
  "musicVisualizerRenderer",
  "musicVisualizerShaderSettingsById",
  "proxyServer",
  "ehentaiCookies",
  "subtitleFeatureEnabled",
  "subtitleRenderMode",
  "subtitleAdvancedVadPreset",
  "subtitleAdvancedVadThreshold",
  "subtitleAdvancedVadMinSilenceSec",
  "subtitleAdvancedVadMinSpeechSec",
  "subtitleAdvancedVadMaxSpeechSec",
  "subtitleAdvancedSpeakerThreshold",
  "subtitleValidPlaybackRateThreshold",
  "subtitleAcceleration",
  "subtitleLanguage",
  "subtitleModelDir",
  "subtitleSelectedModelId",
  "subtitleTextFillMode",
  "subtitleTextColor",
  "subtitleGradientStartColor",
  "subtitleGradientEndColor",
  "subtitleGradientDirection",
  "subtitleGradientCurve",
  "subtitleStrokeColor",
  "subtitleStrokeWidth",
  "subtitleStrokeShadowColor",
  "subtitleStrokeShadowRadius",
  "subtitleFontSize",
  "subtitleMaxLineChars",
  "subtitleSelectionByVideoId",
  "subtitleOffsetY",
  "subtitleStylePanelExpanded",
  "videoSavedPlaylists",
  "adReviewVisionEndpoint",
  "adReviewVisionModel",
  "adReviewVisionVerified",
  "subtitleCleanupLlmEndpoint",
  "subtitleCleanupLlmModel",
  "subtitleCleanupLlmPrompt",
  "adReviewStrategyMode",
  "adReviewHeadN",
  "adReviewTailN",
  "adReviewTailStopCleanStreak",
  "adReviewMaxConcurrency",
];

function pickSettings(state: UiStore): AppSettings {
  const settings = {} as AppSettings;
  for (const key of SETTINGS_KEYS) {
    (settings as Record<string, unknown>)[key] = state[key];
  }
  return settings;
}

interface UiStore extends AppSettings {
  shortcuts: ShortcutMap;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setShortcut: (action: ShortcutAction, binding: string) => void;
  resetShortcuts: () => void;
}

export const useUiStore = create<UiStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  shortcuts: { ...DEFAULT_SHORTCUTS },
  updateSettings: (patch) => {
    const current = pickSettings(get());
    const candidate = {
      ...current,
      ...patch,
    };

    const parsed = appSettingsSchema.safeParse(candidate);
    if (!parsed.success) {
      console.warn("设置更新失败，输入未通过校验", parsed.error.flatten());
      return;
    }

    const hasChanges = SETTINGS_KEYS.some(
      (key) => !Object.is(parsed.data[key], current[key]),
    );
    if (!hasChanges) {
      return;
    }

    set(parsed.data);
  },
  setShortcut: (action, binding) => {
    const normalized = normalizeShortcutBinding(binding);
    set((state) => ({
      shortcuts: {
        ...state.shortcuts,
        [action]: normalized,
      },
    }));
  },
  resetShortcuts: () => {
    set({ shortcuts: { ...DEFAULT_SHORTCUTS } });
  },
}));

export function resetUiStoreState(): void {
  useUiStore.setState((state) => ({
    ...state,
    ...DEFAULT_SETTINGS,
    shortcuts: { ...DEFAULT_SHORTCUTS },
  }));
}
