import { z } from 'zod'

export const browserModeSchema = z.enum(['image', 'video'])

export const searchFieldSchema = z.enum(['all', 'name', 'workTitle', 'circle', 'author', 'tags'])

export const appSettingsSchema = z.object({
  mode: browserModeSchema,
  vectorMode: z.boolean(),
  settingsOpen: z.boolean(),
  headerHeight: z.number().min(48).max(96),
  settingsFontSize: z.number().min(12).max(24),
  sidebarRatio: z.number().min(0).max(0.95),
  sidebarMinWidth: z.number().min(80).max(640),
  layoutLocked: z.boolean(),
  sidebarFontSize: z.number().min(11).max(24),
  sidebarCountFontSize: z.number().min(10).max(22),
  sidebarIndentStep: z.number().min(8).max(48),
  sidebarVerticalGap: z.number().min(0).max(24),
  metadataRatio: z.number().min(0.2).max(0.45),
  vectorPanelHeight: z.number().min(120).max(360),
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
  themeId: z.string().min(1),
  thumbnailQuality: z.number().min(1).max(100),
  thumbnailWidth: z.number().min(128).max(2048),
  lmStudioEndpoint: z.string().min(1),
  lmStudioModel: z.string().min(1),
  adReviewStrategyMode: z.enum(['all', 'head-tail']),
  adReviewHeadN: z.number().int().min(0).max(200),
  adReviewTailN: z.number().int().min(0).max(200),
  adReviewTailStopCleanStreak: z.number().int().min(1).max(200),
  adReviewMaxConcurrency: z.number().int().min(4).max(12),
  vectorUniverseMoveSpeed: z.number().min(4).max(80),
  vectorUniverseSprintMultiplier: z.number().min(1).max(4),
  vectorUniverseLookSensitivity: z.number().min(0.0005).max(0.01),
  vectorUniverseRaycastDistance: z.number().min(4).max(120),
  vectorUniverseHelperScale: z.number().min(40).max(600),
  vectorUniverseDispersion: z.number().min(0.2).max(6),
  vectorUniverseWidgetSize: z.number().min(140).max(340),
})

export type AppSettings = z.infer<typeof appSettingsSchema>
