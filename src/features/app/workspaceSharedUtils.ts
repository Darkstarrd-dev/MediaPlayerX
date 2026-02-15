import { resolveActiveLocale } from '../../i18n/locale'
import { useUiStore } from '../../store/useUiStore'
import type { AudioItem, SidebarNode } from '../../types'

function resolveSortLocale(overrideLocale?: string): string {
  if (overrideLocale) {
    return overrideLocale
  }

  const uiLocale = useUiStore.getState()?.uiLocale ?? 'auto'
  const browserLocale = typeof navigator === 'undefined' ? null : navigator.language
  return resolveActiveLocale(uiLocale, browserLocale)
}

export function normalizeFeatureTags(values: string[]): string[] {
  return values
    .flatMap((value) => value.split(/[\n,，;；|/]+/g))
    .map((value) => value.trim())
    .filter(Boolean)
}

export function flattenExternalTags(value: Record<string, string>): string[] {
  const tags: string[] = []
  for (const [namespace, raw] of Object.entries(value)) {
    const normalizedNamespace = namespace.trim()
    if (!normalizedNamespace) {
      continue
    }
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    for (const part of parts) {
      tags.push(`${normalizedNamespace}:${part}`)
    }
  }
  return Array.from(new Set(tags))
}

export function flattenExternalTagValues(value: Record<string, string>): string[] {
  const tags: string[] = []
  for (const raw of Object.values(value)) {
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
    tags.push(...parts)
  }
  return Array.from(new Set(tags))
}

export function normalizeSeriesId(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function compareByLocale(left: string, right: string, locale: string): number {
  return left.localeCompare(right, locale, { sensitivity: 'base' })
}

function compareAbsolutePath(left: { absolutePath: string }, right: { absolutePath: string }, locale: string): number {
  return compareByLocale(left.absolutePath, right.absolutePath, locale)
}

export function pickFirstBySeriesId<T extends { seriesId?: string; absolutePath: string }>(
  items: Iterable<T>,
  seriesId: string,
  locale?: string,
): T | null {
  if (!seriesId) {
    return null
  }

  const matches: T[] = []
  for (const item of items) {
    if (normalizeSeriesId(item.seriesId) === seriesId) {
      matches.push(item)
    }
  }

  if (matches.length === 0) {
    return null
  }
  const sortLocale = resolveSortLocale(locale)
  matches.sort((left, right) => compareAbsolutePath(left, right, sortLocale))
  return matches[0]
}

export function collectAudioIdsBySidebarOrder(nodes: SidebarNode[], audios: AudioItem[], locale?: string): string[] {
  const sortLocale = resolveSortLocale(locale)
  const folderOrderByPath = new Map<string, number>()
  let order = 0
  const walk = (currentNodes: SidebarNode[]) => {
    for (const node of currentNodes) {
      folderOrderByPath.set(node.pathKey, order)
      order += 1
      if (node.children.length > 0) {
        walk(node.children)
      }
    }
  }
  walk(nodes)

  const resolveFolderPath = (audio: AudioItem): string => audio.treePath.slice(0, Math.max(0, audio.treePath.length - 1)).join('/')

  return [...audios]
    .sort((left, right) => {
      const leftOrder = folderOrderByPath.get(resolveFolderPath(left)) ?? Number.MAX_SAFE_INTEGER
      const rightOrder = folderOrderByPath.get(resolveFolderPath(right)) ?? Number.MAX_SAFE_INTEGER
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder
      }
      return compareByLocale(left.absolutePath, right.absolutePath, sortLocale)
    })
    .map((audio) => audio.id)
}

export function collectVideoIdsBySidebarOrder(nodes: SidebarNode[]): string[] {
  const orderedIds: string[] = []
  const seen = new Set<string>()

  const walk = (currentNodes: SidebarNode[]) => {
    for (const node of currentNodes) {
      if (node.videoId && !seen.has(node.videoId)) {
        seen.add(node.videoId)
        orderedIds.push(node.videoId)
      }
      if (node.children.length > 0) {
        walk(node.children)
      }
    }
  }

  walk(nodes)
  return orderedIds
}

export function collectScopedAudioIdsByFolderNode(params: {
  selectedSidebarNode: SidebarNode | null
  audiosForSidebar: AudioItem[]
  audioSidebarOrderedIds: string[]
}): string[] {
  const { selectedSidebarNode, audiosForSidebar, audioSidebarOrderedIds } = params
  if (!selectedSidebarNode || selectedSidebarNode.kind !== 'folder') {
    return audioSidebarOrderedIds
  }

  const selectedPath = selectedSidebarNode.pathKey
  const selectedPrefix = `${selectedPath}/`
  const scopedIdSet = new Set(
    audiosForSidebar
      .filter((audio) => {
        const folderPath = audio.treePath.slice(0, Math.max(0, audio.treePath.length - 1)).join('/')
        return folderPath === selectedPath || folderPath.startsWith(selectedPrefix)
      })
      .map((audio) => audio.id),
  )

  if (scopedIdSet.size === 0) {
    return audioSidebarOrderedIds
  }

  return audioSidebarOrderedIds.filter((audioId) => scopedIdSet.has(audioId))
}
