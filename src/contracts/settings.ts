import { z } from 'zod'

export const browserModeSchema = z.enum(['image', 'video'])

export const searchFieldSchema = z.enum(['all', 'name', 'workTitle', 'circle', 'author', 'tags'])

export const appSettingsSchema = z.object({
  mode: browserModeSchema,
  vectorMode: z.boolean(),
  settingsOpen: z.boolean(),
  headerHeight: z.number().min(48).max(96),
  sidebarRatio: z.number().min(0.16).max(0.45),
  metadataRatio: z.number().min(0.2).max(0.45),
  vectorPanelHeight: z.number().min(120).max(320),
  thumbnailScale: z.number().min(70).max(220),
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
  thumbnailQuality: z.number().min(1).max(100),
  thumbnailMaxEdge: z.number().min(128).max(2048),
  lmStudioEndpoint: z.string().min(1),
  lmStudioModel: z.string().min(1),
})

export type AppSettings = z.infer<typeof appSettingsSchema>
