import { z } from 'zod'

export const browserModeSchema = z.enum(['image', 'video', 'music'])

export const searchFieldSchema = z.enum(['all', 'name', 'workTitle', 'circle', 'author', 'tags'])

export const musicVisualizerFpsCapSchema = z.union([z.literal(30), z.literal(60), z.literal(120)])

export const appSettingsSchema = z.object({
  mode: browserModeSchema,
  vectorMode: z.boolean(),
  settingsOpen: z.boolean(),
  headerHeight: z.number().min(48).max(96),
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
  thumbnailQuality: z.number().min(1).max(100),
  thumbnailWidth: z.number().min(128).max(2048),
  musicVisualizerRenderLongEdgePx: z.number().int().min(240).max(4096),
  musicVisualizerFpsCap: musicVisualizerFpsCapSchema,
  musicVisualizerShowFps: z.boolean(),
  musicVisualizerRenderer: z.enum(['gpu', 'cpu']),
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
