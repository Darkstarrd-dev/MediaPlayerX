import { z } from 'zod'

export const browserModeSchema = z.enum(['image', 'video', 'music'])

export const searchFieldSchema = z.enum(['all', 'name', 'workTitle', 'circle', 'author', 'tags'])

export const musicVisualizerFpsCapSchema = z.union([z.literal(30), z.literal(60), z.literal(120)])
export const musicVisualizerToneMapModeSchema = z.enum(['off', 'reinhard', 'aces', 'filmic', 'agx', 'khronos'])
export const musicVisualizerRendererSchema = z.enum(['gpu', 'cpu'])
export const musicVisualizerCompositionModeSchema = z.enum(['single', 'layered'])
export const paletteModeSchema = z.enum(['day', 'night'])

export const musicVisualizerShaderSettingsSchema = z.object({
  renderLongEdgePx: z.number().int().min(240).max(4096),
  renderScaleCoeff: z.number().min(1).max(5).default(2),
  compositionMode: musicVisualizerCompositionModeSchema.default('single'),
  layeredBackgroundShaderId: z.string().max(64).default('galaxy'),
  layeredForegroundShaderId: z.string().max(64).default('mcs-szb'),
  layeredBackgroundEnabled: z.boolean().default(true),
  layeredForegroundEnabled: z.boolean().default(true),
  layeredForegroundOffsetX: z.number().min(-1).max(1).default(0),
  layeredForegroundOffsetY: z.number().min(-1).max(1).default(0),
  layeredForegroundScale: z.number().min(0.25).max(3).default(1),
  fpsCap: musicVisualizerFpsCapSchema,
  toneMapMode: musicVisualizerToneMapModeSchema,
  toneMapExposure: z.number().min(0.5).max(2),
  toneMapStrength: z.number().min(0).max(1),
  showFps: z.boolean(),
  renderer: musicVisualizerRendererSchema,
})

export const musicVisualizerShaderSettingsByIdSchema = z.record(z.string().max(64), musicVisualizerShaderSettingsSchema)

export const appSettingsSchema = z.object({
  mode: browserModeSchema,
  vectorMode: z.boolean(),
  settingsOpen: z.boolean(),
  headerHeight: z.number().min(48).max(96),
  settingsBackdropOpacity: z.number().min(0).max(100),
  settingsFontSize: z.number().min(12).max(24),
  sidebarRatio: z.number().min(0).max(0.95),
  sidebarMinWidth: z.number().min(80).max(640),
  layoutLocked: z.boolean(),
  electronNativeChromeEnabled: z.boolean(),
  sidebarFontSize: z.number().min(11).max(24),
  sidebarCountFontSize: z.number().min(10).max(22),
  sidebarIndentStep: z.number().min(8).max(48),
  sidebarVerticalGap: z.number().min(0).max(24),
  metadataRatio: z.number().min(0.2).max(0.45),
  workspaceBottomPanelHeight: z.number().min(80).max(360),
  fullscreenVideoControlsMaxWidth: z.number().min(640).max(1920),
  thumbnailScale: z.number().min(1).max(9),
  thumbnailGap: z.number().min(0).max(24),
  showNamesOnly: z.boolean(),
  metadataCollapsed: z.boolean(),
  autoPlayEnabled: z.boolean(),
  autoPlayInterval: z.number().min(1).max(60),
  searchField: searchFieldSchema,
  searchText: z.string().max(120),
  vectorThreshold: z.number().min(0).max(1),
  sidebarFocus: z.enum(['sidebar', 'main']),
  imageRootNodeId: z.string().nullable(),
  videoRootNodeId: z.string().nullable(),
  musicRootNodeId: z.string().nullable(),
  themeId: z.string().min(1),
  styleId: z.string().min(1).default('flush'),
  paletteId: z.string().min(1).default('parchment'),
  paletteMode: paletteModeSchema.default('day'),
  paletteDayId: z.string().min(1).default('parchment'),
  paletteNightId: z.string().min(1).default('tokyo-night'),
  thumbnailQuality: z.number().min(1).max(100),
  thumbnailWidth: z.number().min(128).max(2048),
  musicVisualizerRenderLongEdgePx: z.number().int().min(240).max(4096),
  musicVisualizerFpsCap: musicVisualizerFpsCapSchema,
  musicVisualizerSelectedShaderId: z.string().max(64),
  musicVisualizerToneMapMode: musicVisualizerToneMapModeSchema,
  musicVisualizerToneMapExposure: z.number().min(0.5).max(2),
  musicVisualizerToneMapStrength: z.number().min(0).max(1),
  musicVisualizerShowFps: z.boolean(),
  musicVisualizerRenderer: musicVisualizerRendererSchema,
  musicVisualizerShaderSettingsById: musicVisualizerShaderSettingsByIdSchema,
  proxyServer: z.string().max(512),
  ehentaiCookies: z.string().max(4096),
  adReviewVisionEndpoint: z.string().max(512),
  adReviewVisionModel: z.string().max(256),
  adReviewVisionVerified: z.boolean(),
  adReviewStrategyMode: z.enum(['all', 'head-tail']),
  adReviewHeadN: z.number().int().min(0).max(200),
  adReviewTailN: z.number().int().min(0).max(200),
  adReviewTailStopCleanStreak: z.number().int().min(1).max(200),
  adReviewMaxConcurrency: z.number().int().min(4).max(12),
})

export type AppSettings = z.infer<typeof appSettingsSchema>
