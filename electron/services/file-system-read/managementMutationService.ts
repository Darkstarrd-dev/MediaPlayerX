import { constants as fsConstants, promises as fs } from 'node:fs'
import path from 'node:path'

import {
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type DeleteSidebarNodesRequestDto,
  type DeleteSidebarNodesResponseDto,
  type MoveSidebarNodesRequestDto,
  type MoveSidebarNodesResponseDto,
  type RenameSidebarNodeRequestDto,
  type RenameSidebarNodeResponseDto,
  type RenameSidebarNodesRequestDto,
  type RenameSidebarNodesResponseDto,
  type RenameItemsRequestDto,
  type RenameItemsResponseDto,
  type RenameItemTargetDto,
  type ImagePackageDto,
  type LibrarySnapshotDto,
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
} from '../../../src/contracts/backend'
import {
  isPathAllowlisted,
  type MediaAccessGuardContext,
} from '../../fileSystemMediaAccessGuard'
import {
  isPathInsideRoot,
  normalizeAllowlistKey,
} from '../../fileSystemServiceHelpers'
import { writeStoredZipFromEntries } from '../../fileSystemZipStoreWriter'
import { MediaLibraryDatabase } from '../../mediaLibraryDatabase'
import { isSafeArchiveEntryName, readZipEntryContent, scanZipCentralEntries } from '../../zipArchiveHelpers'
import { ImportPathRegistry } from './importPathRegistry'

interface ParsedSidebarNodeRef {
  kind: 'folder' | 'package' | 'video' | 'audio'
  pathKey: string
}

const ZIP_IMAGE_ENTRY_EXTENSIONS = new Set<string>([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.avif',
])

function sanitizeTemplateHint(value: string): string {
  return value
    .replace(/\(if\s+exist\)/gi, '')
    .replace(/\(if\s+only\s+one\s+exist\)/gi, '')
    .replace(/\bautho\.jp\b/gi, 'author.jp')
}

function trimResult(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function parseSidebarNodeId(nodeId: string): ParsedSidebarNodeRef | null {
  const delimiterIndex = nodeId.indexOf(':')
  if (delimiterIndex <= 0) {
    return null
  }

  const rawKind = nodeId.slice(0, delimiterIndex)
  if (rawKind !== 'folder' && rawKind !== 'package' && rawKind !== 'video' && rawKind !== 'audio') {
    return null
  }

  const pathKey = nodeId.slice(delimiterIndex + 1)
  if (pathKey.length === 0) {
    return null
  }

  return {
    kind: rawKind,
    pathKey,
  }
}

function pathKeyHasPrefix(pathKey: string, prefix: string): boolean {
  if (pathKey === prefix) {
    return true
  }
  return pathKey.startsWith(`${prefix}/`)
}

function resolveAbsolutePathFromPathKey(pathKey: string): string {
  if (/^[a-zA-Z]:$/.test(pathKey)) {
    return path.resolve(`${pathKey}${path.sep}`)
  }
  return path.resolve(pathKey)
}

function isFileSystemRootPath(targetPath: string): boolean {
  const resolved = path.resolve(targetPath)
  const root = path.parse(resolved).root
  return normalizeAllowlistKey(resolved) === normalizeAllowlistKey(root)
}

interface ManagementMutationServiceOptions {
  rootDir: string
  thumbnailCacheRootDir: string
  database: MediaLibraryDatabase
  importPathRegistry: ImportPathRegistry
  ensureStateLoaded: () => Promise<void>
  ensureSnapshotLoaded: () => Promise<LibrarySnapshotDto>
  syncSnapshotFromDatabase: () => LibrarySnapshotDto
  refreshArchiveIndexesForPaths: (archivePaths: Iterable<string>) => Promise<void>
  pruneArchiveIndexesByDeletedRoots: (deletedPaths: Iterable<string>) => void
  removeImportSourcePaths: (pathsToRemove: string[]) => Promise<void>
  replaceImportSourcePaths: (mappings: Array<{ fromPath: string; toPath: string }>) => Promise<void>
  buildMediaAccessContext: () => MediaAccessGuardContext
  emitLibraryChanged: (payload: { reason: string; updated_at_ms: number }) => void
  withArchiveWriteLock?: <T>(archivePath: string, task: () => Promise<T>) => Promise<T>
}

export class ManagementMutationService {
  constructor(private readonly options: ManagementMutationServiceOptions) {}

  private async withArchiveWriteLock<T>(archivePath: string, task: () => Promise<T>): Promise<T> {
    if (this.options.withArchiveWriteLock) {
      return await this.options.withArchiveWriteLock(archivePath, task)
    }
    return await task()
  }

  async setImageHidden(
    request: SetImageHiddenRequestDto,
  ): Promise<SetImageHiddenResponseDto> {
    await this.options.ensureStateLoaded()
    const normalizedImageIds = Array.from(new Set(request.image_ids.map((value) => value.trim()).filter(Boolean)))
    if (normalizedImageIds.length === 0) {
      throw new Error('设置隐藏失败：未提供图片 id')
    }

    const updatedCount = this.options.database.setImagesHidden(normalizedImageIds, request.hidden)
    if (updatedCount > 0) {
      this.options.syncSnapshotFromDatabase()
      this.options.emitLibraryChanged({
        reason: 'manage-hide',
        updated_at_ms: Date.now(),
      })
    }

    return {
      updated_count: updatedCount,
      updated_at_ms: Date.now(),
    }
  }

  private async repackArchiveWithoutEntries(
    archivePath: string,
    deletedEntryNames: Set<string>,
  ): Promise<void> {
    await this.withArchiveWriteLock(archivePath, async () => {
      const allEntries = await scanZipCentralEntries(archivePath)
      const keepEntries = allEntries.filter((entry) => !deletedEntryNames.has(entry.entryName))

      const zipEntries: Array<{ entryName: string; content: Buffer }> = []
      for (const entry of keepEntries) {
        const content = await readZipEntryContent(archivePath, entry)
        zipEntries.push({
          entryName: entry.entryName,
          content,
        })
      }

      const tempPath = `${archivePath}.${Date.now()}.${Math.round(Math.random() * 100_000)}.mpx-tmp.zip`
      const backupPath = `${archivePath}.${Date.now()}.${Math.round(Math.random() * 100_000)}.mpx-bak`

      await writeStoredZipFromEntries(tempPath, zipEntries)
      await scanZipCentralEntries(tempPath)

      await fs.rename(archivePath, backupPath)
      let replaced = false
      try {
        await fs.rename(tempPath, archivePath)
        replaced = true
        await fs.rm(backupPath, { force: true })
      } finally {
        if (!replaced) {
          await fs.rename(backupPath, archivePath).catch(() => undefined)
        }
        await fs.rm(tempPath, { force: true }).catch(() => undefined)
      }
    })
  }

  private async repackArchiveWithRenamedEntries(
    archivePath: string,
    entryNameMappings: Array<{ fromEntryName: string; toEntryName: string }>,
  ): Promise<void> {
    await this.withArchiveWriteLock(archivePath, async () => {
      const mappingByFromEntry = new Map<string, string>()
      for (const mapping of entryNameMappings) {
        const fromEntryName = mapping.fromEntryName.trim()
        const toEntryName = mapping.toEntryName.trim()
        if (!fromEntryName || !toEntryName || fromEntryName === toEntryName) {
          continue
        }
        if (!isSafeArchiveEntryName(fromEntryName) || !isSafeArchiveEntryName(toEntryName)) {
          throw new Error('archive entry illegal')
        }
        const ext = path.extname(fromEntryName).toLowerCase()
        if (!ZIP_IMAGE_ENTRY_EXTENSIONS.has(ext)) {
          throw new Error('archive entry is not image')
        }
        mappingByFromEntry.set(fromEntryName, toEntryName)
      }

      if (mappingByFromEntry.size === 0) {
        return
      }

      const allEntries = await scanZipCentralEntries(archivePath)
      const presentEntryNames = new Set(allEntries.map((entry) => entry.entryName))
      for (const fromEntryName of mappingByFromEntry.keys()) {
        if (!presentEntryNames.has(fromEntryName)) {
          throw new Error(`archive entry not found: ${fromEntryName}`)
        }
      }

      const plannedEntryNameSet = new Set<string>()
      for (const entry of allEntries) {
        const nextEntryName = mappingByFromEntry.get(entry.entryName) ?? entry.entryName
        if (plannedEntryNameSet.has(nextEntryName)) {
          throw new Error('archive entry destination already exists')
        }
        plannedEntryNameSet.add(nextEntryName)
      }

      const zipEntries: Array<{ entryName: string; content: Buffer }> = []
      for (const entry of allEntries) {
        const content = await readZipEntryContent(archivePath, entry)
        zipEntries.push({
          entryName: mappingByFromEntry.get(entry.entryName) ?? entry.entryName,
          content,
        })
      }

      const tempPath = `${archivePath}.${Date.now()}.${Math.round(Math.random() * 100_000)}.mpx-tmp.zip`
      const backupPath = `${archivePath}.${Date.now()}.${Math.round(Math.random() * 100_000)}.mpx-bak`

      await writeStoredZipFromEntries(tempPath, zipEntries)
      await scanZipCentralEntries(tempPath)

      await fs.rename(archivePath, backupPath)
      let replaced = false
      try {
        await fs.rename(tempPath, archivePath)
        replaced = true
        await fs.rm(backupPath, { force: true })
      } finally {
        if (!replaced) {
          await fs.rename(backupPath, archivePath).catch(() => undefined)
        }
        await fs.rm(tempPath, { force: true }).catch(() => undefined)
      }
    })
  }

  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
  ): Promise<DeleteImageItemsResponseDto> {
    const normalizedImageIds = Array.from(new Set(request.image_ids.map((value) => value.trim()).filter(Boolean)))
    if (normalizedImageIds.length === 0) {
      throw new Error('删除失败：未提供图片 id')
    }

    const snapshot = await this.options.ensureSnapshotLoaded()
    await this.options.ensureStateLoaded()

    const sourceById = new Map<string, ImagePackageDto>([
      ...snapshot.image_packages.map((source) => [source.id, source] as const),
      ...snapshot.image_directories.map((source) => [source.id, source] as const),
    ])
    const mediaAccessContext = this.options.buildMediaAccessContext()

    const imageById = new Map<string, { image: ImagePackageDto['images'][number]; source: ImagePackageDto }>()
    for (const source of sourceById.values()) {
      for (const image of source.images) {
        imageById.set(image.id, { image, source })
      }
    }

    const failed: Array<{ image_id: string; reason: string }> = []
    const filesystemImageIdsByPath = new Map<string, Set<string>>()
    const archiveEntriesToDelete = new Map<string, Set<string>>()
    const archiveImageIdsByPath = new Map<string, Map<string, Set<string>>>()
    const importPathsToRemove = new Set<string>()

    for (const imageId of normalizedImageIds) {
      const found = imageById.get(imageId)
      if (!found) {
        failed.push({
          image_id: imageId,
          reason: 'image not found',
        })
        continue
      }

      const locator = found.image.media_locator
      if (locator.kind === 'filesystem') {
        const absolutePath = path.resolve(locator.absolute_path)
        if (!isPathAllowlisted(absolutePath, mediaAccessContext)) {
          failed.push({
            image_id: imageId,
            reason: 'path outside allowlist',
          })
          continue
        }
        const imageIds = filesystemImageIdsByPath.get(absolutePath) ?? new Set<string>()
        imageIds.add(imageId)
        filesystemImageIdsByPath.set(absolutePath, imageIds)
        continue
      }

      if (locator.archive_format !== 'zip') {
        failed.push({
          image_id: imageId,
          reason: 'archive format not supported',
        })
        continue
      }

      const archivePath = path.resolve(locator.archive_path)
      if (!isPathAllowlisted(archivePath, mediaAccessContext)) {
        failed.push({
          image_id: imageId,
          reason: 'archive path outside allowlist',
        })
        continue
      }
      const entryName = locator.entry_name
      if (!entryName || !isSafeArchiveEntryName(entryName)) {
        failed.push({
          image_id: imageId,
          reason: 'archive entry illegal',
        })
        continue
      }

      const entrySet = archiveEntriesToDelete.get(archivePath) ?? new Set<string>()
      entrySet.add(entryName)
      archiveEntriesToDelete.set(archivePath, entrySet)

      const imageIdsByEntry = archiveImageIdsByPath.get(archivePath) ?? new Map<string, Set<string>>()
      const imageIds = imageIdsByEntry.get(entryName) ?? new Set<string>()
      imageIds.add(imageId)
      imageIdsByEntry.set(entryName, imageIds)
      archiveImageIdsByPath.set(archivePath, imageIdsByEntry)
    }

    const deletedImageIds = new Set<string>()
    const changedArchivePaths = new Set<string>()

    for (const [absolutePath, imageIds] of filesystemImageIdsByPath) {
      try {
        await fs.rm(absolutePath, { force: true })
        for (const imageId of imageIds) {
          deletedImageIds.add(imageId)
        }
        if (this.options.importPathRegistry.hasImportFile(absolutePath)) {
          importPathsToRemove.add(absolutePath)
        }
      } catch (error) {
        const reason = error instanceof Error && error.message ? error.message : String(error)
        for (const imageId of imageIds) {
          failed.push({
            image_id: imageId,
            reason,
          })
        }
      }
    }

    for (const [archivePath, entryNames] of archiveEntriesToDelete) {
      try {
        await this.repackArchiveWithoutEntries(archivePath, entryNames)
        changedArchivePaths.add(archivePath)

        const imageIdsByEntry = archiveImageIdsByPath.get(archivePath) ?? new Map<string, Set<string>>()
        for (const entryName of entryNames) {
          const imageIds = imageIdsByEntry.get(entryName)
          if (!imageIds) {
            continue
          }
          for (const imageId of imageIds) {
            deletedImageIds.add(imageId)
          }
        }

        if (this.options.importPathRegistry.hasImportFile(archivePath)) {
          const source = Array.from(sourceById.values()).find(
            (item) => path.resolve(item.absolute_path) === archivePath,
          )
          if (source) {
            const remainingEntries = source.images.filter(
              (image) =>
                image.media_locator.kind === 'archive-entry' && !entryNames.has(image.media_locator.entry_name),
            )
            if (remainingEntries.length === 0) {
              importPathsToRemove.add(archivePath)
            }
          }
        }
      } catch (error) {
        const reason = error instanceof Error && error.message ? error.message : String(error)
        const imageIdsByEntry = archiveImageIdsByPath.get(archivePath) ?? new Map<string, Set<string>>()
        for (const entryName of entryNames) {
          const imageIds = imageIdsByEntry.get(entryName)
          if (!imageIds) {
            continue
          }
          for (const imageId of imageIds) {
            failed.push({
              image_id: imageId,
              reason,
            })
          }
        }
      }
    }

    if (deletedImageIds.size > 0) {
      this.options.database.deleteImageItems(Array.from(deletedImageIds))
      this.options.syncSnapshotFromDatabase()
      await this.options.refreshArchiveIndexesForPaths(changedArchivePaths)
    }

    if (importPathsToRemove.size > 0) {
      await this.options.removeImportSourcePaths(Array.from(importPathsToRemove))
    }

    const deletedCount = deletedImageIds.size
    if (deletedCount > 0) {
      await fs.rm(this.options.thumbnailCacheRootDir, { recursive: true, force: true }).catch(() => undefined)
      this.options.emitLibraryChanged({
        reason: 'manage-delete-image-items',
        updated_at_ms: Date.now(),
      })
    }

    return {
      deleted_count: deletedCount,
      failed,
      updated_at_ms: Date.now(),
    }
  }

  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
  ): Promise<DeleteSidebarNodesResponseDto> {
    const normalizedNodeIds = Array.from(new Set(request.node_ids.map((value) => value.trim()).filter(Boolean)))
    if (normalizedNodeIds.length === 0) {
      throw new Error('删除失败：未提供节点 id')
    }

    const parsedTargets = normalizedNodeIds.map((nodeId) => {
      const parsed = parseSidebarNodeId(nodeId)
      return {
        nodeId,
        parsed,
        matched: false,
      }
    })

    const failed: Array<{ node_id: string; reason: string }> = []
    const shouldDeleteFiles = request.delete_files ?? true
    const validTargets = parsedTargets.filter((target) => {
      if (target.parsed) {
        return true
      }
      failed.push({
        node_id: target.nodeId,
        reason: 'invalid node id',
      })
      return false
    })

    await this.options.ensureStateLoaded()
    const snapshot = await this.options.ensureSnapshotLoaded()
    const mediaAccessContext = this.options.buildMediaAccessContext()

    const selectedPaths = new Set<string>()
    const nodeIdsBySelectedPath = new Map<string, Set<string>>()
    const importPathsToRemove = new Set<string>()

    const rememberSelectedPath = (absolutePath: string, nodeId: string) => {
      const resolvedPath = path.resolve(absolutePath)
      selectedPaths.add(resolvedPath)
      const nodeIds = nodeIdsBySelectedPath.get(resolvedPath) ?? new Set<string>()
      nodeIds.add(nodeId)
      nodeIdsBySelectedPath.set(resolvedPath, nodeIds)
    }

    for (const target of validTargets) {
      const parsed = target.parsed
      if (!parsed || parsed.kind !== 'folder') {
        continue
      }
      const folderPath = resolveAbsolutePathFromPathKey(parsed.pathKey)
      rememberSelectedPath(folderPath, target.nodeId)
      target.matched = true
    }

    const markMatchedAndSelect = (pathKey: string, kind: 'package' | 'directory' | 'video' | 'audio', absolutePath: string): boolean => {
      for (const target of validTargets) {
        const parsed = target.parsed
        if (!parsed) {
          continue
        }

        if (parsed.kind === 'folder') {
          if (pathKeyHasPrefix(pathKey, parsed.pathKey)) {
            target.matched = true
            rememberSelectedPath(absolutePath, target.nodeId)
            return true
          }
          continue
        }

        if (parsed.kind === 'package' && kind === 'package' && pathKey === parsed.pathKey) {
          target.matched = true
          rememberSelectedPath(absolutePath, target.nodeId)
          return true
        }

        if (parsed.kind === 'video' && kind === 'video' && pathKey === parsed.pathKey) {
          target.matched = true
          rememberSelectedPath(absolutePath, target.nodeId)
          return true
        }

        if (parsed.kind === 'audio' && kind === 'audio' && pathKey === parsed.pathKey) {
          target.matched = true
          rememberSelectedPath(absolutePath, target.nodeId)
          return true
        }
      }

      return false
    }

    for (const source of snapshot.image_packages) {
      const pathKey = source.tree_path.join('/')
      markMatchedAndSelect(pathKey, 'package', source.absolute_path)
    }

    for (const source of snapshot.image_directories) {
      const pathKey = source.tree_path.join('/')
      markMatchedAndSelect(pathKey, 'directory', source.absolute_path)
    }

    for (const video of snapshot.videos) {
      const pathKey = video.tree_path.join('/')
      markMatchedAndSelect(pathKey, 'video', video.absolute_path)
    }

    for (const audio of snapshot.audios ?? []) {
      const pathKey = audio.tree_path.join('/')
      markMatchedAndSelect(pathKey, 'audio', audio.absolute_path)
    }

    for (const target of validTargets) {
      if (!target.matched) {
        failed.push({
          node_id: target.nodeId,
          reason: 'node not found',
        })
      }
    }

    const sortedPaths = Array.from(selectedPaths).sort((left, right) => left.length - right.length)
    const prunedPaths: string[] = []
    for (const candidatePath of sortedPaths) {
      if (prunedPaths.some((existingPath) => isPathInsideRoot(existingPath, candidatePath))) {
        continue
      }
      prunedPaths.push(candidatePath)
    }

    let deletedCount = 0
    const pathsToPurgeFromSnapshot = new Set<string>()
    for (const absolutePath of prunedPaths) {
      try {
        if (isFileSystemRootPath(absolutePath)) {
          const nodeIds = nodeIdsBySelectedPath.get(absolutePath) ?? new Set<string>()
          for (const nodeId of nodeIds) {
            failed.push({
              node_id: nodeId,
              reason: 'refuse to delete filesystem root',
            })
          }
          continue
        }

        if (!isPathAllowlisted(absolutePath, mediaAccessContext)) {
          const nodeIds = nodeIdsBySelectedPath.get(absolutePath) ?? new Set<string>()
          for (const nodeId of nodeIds) {
            failed.push({
              node_id: nodeId,
              reason: 'path outside allowlist',
            })
          }
          continue
        }

        let stat: { isDirectory: () => boolean; isFile: () => boolean } | null = null
        try {
          stat = await fs.stat(absolutePath)
        } catch (error) {
          const maybeFsError = error as NodeJS.ErrnoException
          if (maybeFsError?.code !== 'ENOENT') {
            throw error
          }
        }

        if (!stat) {
          pathsToPurgeFromSnapshot.add(absolutePath)
          importPathsToRemove.add(absolutePath)
          deletedCount += 1
          continue
        }

        if (!shouldDeleteFiles) {
          pathsToPurgeFromSnapshot.add(absolutePath)
          importPathsToRemove.add(absolutePath)
          deletedCount += 1
          continue
        }

        if (stat.isDirectory()) {
          await fs.rm(absolutePath, { recursive: true, force: true })
          deletedCount += 1
          pathsToPurgeFromSnapshot.add(absolutePath)
          importPathsToRemove.add(absolutePath)
          continue
        }
        if (stat.isFile()) {
          await fs.rm(absolutePath, { force: true })
          deletedCount += 1
          pathsToPurgeFromSnapshot.add(absolutePath)
          importPathsToRemove.add(absolutePath)
        }
      } catch (error) {
        const reason = error instanceof Error && error.message ? error.message : String(error)
        const nodeIds = nodeIdsBySelectedPath.get(absolutePath) ?? new Set<string>()
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason,
          })
        }
      }
    }

    if (pathsToPurgeFromSnapshot.size > 0) {
      this.options.database.deleteSnapshotEntriesByPaths(Array.from(pathsToPurgeFromSnapshot))
      this.options.syncSnapshotFromDatabase()
      this.options.pruneArchiveIndexesByDeletedRoots(pathsToPurgeFromSnapshot)
    }

    if (importPathsToRemove.size > 0) {
      await this.options.removeImportSourcePaths(Array.from(importPathsToRemove))
    }

    if (pathsToPurgeFromSnapshot.size > 0) {
      await fs.rm(this.options.thumbnailCacheRootDir, { recursive: true, force: true }).catch(() => undefined)
      this.options.emitLibraryChanged({
        reason: 'manage-delete-sidebar-nodes',
        updated_at_ms: Date.now(),
      })
    }

    return {
      deleted_count: deletedCount,
      failed,
      updated_at_ms: Date.now(),
    }
  }

  private async movePathWithFallback(
    sourcePath: string,
    targetPath: string,
    directory: boolean,
  ): Promise<void> {
    try {
      await fs.rename(sourcePath, targetPath)
      return
    } catch (error) {
      const maybeFsError = error as NodeJS.ErrnoException
      if (maybeFsError?.code !== 'EXDEV') {
        throw error
      }
    }

    if (directory) {
      await fs.cp(sourcePath, targetPath, {
        recursive: true,
        force: false,
        errorOnExist: true,
      })
      await fs.rm(sourcePath, { recursive: true, force: true })
      return
    }

    await fs.copyFile(sourcePath, targetPath, fsConstants.COPYFILE_EXCL)
    await fs.rm(sourcePath, { force: true })
  }

  private isValidGroupName(groupName: string): boolean {
    if (!groupName || groupName === '.' || groupName === '..') {
      return false
    }
    if (groupName.includes('/') || groupName.includes('\\')) {
      return false
    }
    return !/[:*?"<>|]/.test(groupName)
  }

  private resolveSidebarNodeSourcePath(parsed: ParsedSidebarNodeRef, snapshot: LibrarySnapshotDto): string | null {
    if (parsed.kind === 'folder') {
      return resolveAbsolutePathFromPathKey(parsed.pathKey)
    }

    if (parsed.kind === 'package') {
      for (const source of snapshot.image_packages) {
        const pathKey = source.tree_path.join('/')
        if (pathKey === parsed.pathKey) {
          return source.absolute_path
        }
      }
      for (const source of snapshot.image_directories) {
        const pathKey = source.tree_path.join('/')
        if (pathKey === parsed.pathKey) {
          return source.absolute_path
        }
      }
      return null
    }

    if (parsed.kind === 'video') {
      for (const video of snapshot.videos) {
        const pathKey = video.tree_path.join('/')
        if (pathKey === parsed.pathKey) {
          return video.absolute_path
        }
      }
      return null
    }

    for (const audio of snapshot.audios ?? []) {
      const pathKey = audio.tree_path.join('/')
      if (pathKey === parsed.pathKey) {
        return audio.absolute_path
      }
    }
    return null
  }

  private buildMetadataSynthesisName(parsed: ParsedSidebarNodeRef, snapshot: LibrarySnapshotDto, sourcePath: string): string {
    const fallbackName = path.basename(sourcePath, path.extname(sourcePath))
    const compact = (value: string | null | undefined) => value?.trim() ?? ''

    const combinePrimarySecondary = (primary: string, secondary: string, fallback: string): string => {
      if (primary && secondary) {
        return `${primary}(${secondary})`
      }
      if (primary) {
        return primary
      }
      if (secondary) {
        return secondary
      }
      return fallback
    }

    if (parsed.kind === 'video') {
      const video = snapshot.videos.find((item) => item.tree_path.join('/') === parsed.pathKey)
      if (!video) {
        return fallbackName
      }
      const author = combinePrimarySecondary(compact(video.author_jpn), compact(video.author), compact(video.author) || fallbackName)
      const circle = combinePrimarySecondary(compact(video.circle_jpn), compact(video.circle), compact(video.circle) || fallbackName)
      const title = compact(video.work_title_jpn) || compact(video.work_title) || fallbackName
      return `${author}-${circle} - ${title}`
    }

    if (parsed.kind === 'package') {
      const source = [...snapshot.image_packages, ...snapshot.image_directories].find(
        (item) => item.tree_path.join('/') === parsed.pathKey,
      )
      if (!source) {
        return fallbackName
      }
      const metadata = source.external_metadata
      const authorPrimary = compact(metadata?.artist_jpn)
      const authorSecondary = compact(metadata?.artist) || compact(source.author)
      const circlePrimary = compact(metadata?.group_name_jpn)
      const circleSecondary = compact(metadata?.group_name) || compact(source.circle)
      const title = compact(metadata?.title_jpn) || compact(metadata?.title) || compact(source.work_title) || fallbackName
      const author = combinePrimarySecondary(authorPrimary, authorSecondary, authorSecondary || fallbackName)
      const circle = combinePrimarySecondary(circlePrimary, circleSecondary, circleSecondary || fallbackName)
      return `${author}-${circle} - ${title}`
    }

    if (parsed.kind === 'audio') {
      const audio = (snapshot.audios ?? []).find((item) => item.tree_path.join('/') === parsed.pathKey)
      if (!audio) {
        return fallbackName
      }
      const author = compact(audio.author) || fallbackName
      const circle = compact(audio.album) || fallbackName
      const title = compact(audio.track_title) || fallbackName
      return `${author}-${circle} - ${title}`
    }

    return fallbackName
  }

  private renderMetadataTemplate(
    template: string,
    fields: {
      authorJp: string
      authorEn: string
      circleJp: string
      circleEn: string
      titleJp: string
      titleEn: string
    },
  ): string {
    const combinePrimarySecondary = (primary: string, secondary: string): string => {
      if (primary && secondary) {
        return `${primary}(${secondary})`
      }
      return primary || secondary
    }

    const tokens: Record<string, string> = {
      'author.jp': fields.authorJp,
      'author.en': fields.authorEn,
      author: combinePrimarySecondary(fields.authorJp, fields.authorEn),
      'circle.jp': fields.circleJp,
      'circle.en': fields.circleEn,
      circle: combinePrimarySecondary(fields.circleJp, fields.circleEn),
      'title.jp': fields.titleJp,
      'title.en': fields.titleEn,
      title: fields.titleJp || fields.titleEn,
      authorAuto: combinePrimarySecondary(fields.authorJp, fields.authorEn),
      circleAuto: combinePrimarySecondary(fields.circleJp, fields.circleEn),
      titleAuto: fields.titleJp || fields.titleEn,
    }

    const renderExpression = (rawExpr: string): string => {
      const expr = sanitizeTemplateHint(rawExpr).trim()
      if (!expr) {
        return ''
      }
      if (expr.toLowerCase().includes('circle') && expr.toLowerCase().includes('author')) {
        return tokens.circle
      }

      const pairMatch = expr.match(/^([a-zA-Z.]+)\(([a-zA-Z.]+)\)$/)
      if (pairMatch) {
        const primary = tokens[pairMatch[1]] ?? ''
        const secondary = tokens[pairMatch[2]] ?? ''
        return combinePrimarySecondary(primary, secondary)
      }

      if (expr in tokens) {
        return tokens[expr]
      }

      return expr.replace(/\{([a-zA-Z.]+)\}/g, (_value, tokenName: string) => tokens[tokenName] ?? '')
    }

    let rendered = sanitizeTemplateHint(template)
    rendered = rendered.replace(/\[([^\]]+)\]\s*\/\s*\[([^\]]+)\]/g, (_value, left: string, right: string) => {
      const leftValue = renderExpression(left)
      if (leftValue.trim().length > 0) {
        return leftValue
      }
      return renderExpression(right)
    })
    rendered = rendered.replace(/\[([^\]]+)\]/g, (_value, expression: string) => renderExpression(expression))
    rendered = rendered.replace(/\{([a-zA-Z.]+)\}/g, (_value, tokenName: string) => tokens[tokenName] ?? '')
    return trimResult(rendered)
  }

  async renameItems(
    request: RenameItemsRequestDto,
  ): Promise<RenameItemsResponseDto> {
    const normalizedTargets = request.targets
    const previewOnly = request.preview_only ?? false
    const failFast = request.fail_fast ?? true
    await this.options.ensureStateLoaded()
    const snapshot = await this.options.ensureSnapshotLoaded()
    const mediaAccessContext = this.options.buildMediaAccessContext()

    const sourceById = new Map<string, ImagePackageDto>([
      ...snapshot.image_packages.map((source) => [source.id, source] as const),
      ...snapshot.image_directories.map((source) => [source.id, source] as const),
    ])
    const imageById = new Map<string, { image: ImagePackageDto['images'][number]; source: ImagePackageDto }>()
    for (const source of sourceById.values()) {
      for (const image of source.images) {
        imageById.set(image.id, { image, source })
      }
    }

    type PlannedOperation = {
      target: RenameItemTargetDto
      sourceName: string
      targetName: string
      sourcePath: string
      targetPath: string
      filesystemFromPath?: string
      filesystemToPath?: string
      archivePath?: string
      archiveFromEntryName?: string
      archiveToEntryName?: string
    }

    const failed: RenameItemsResponseDto['failed'] = []
    const plannedOperations: PlannedOperation[] = []

    const toTargetKey = (target: RenameItemTargetDto): string => {
      if (target.kind === 'sidebar-node') {
        return `sidebar-node:${target.node_id}`
      }
      if (target.kind === 'image-item') {
        return `image-item:${target.image_id}`
      }
      return `archive-entry:${path.resolve(target.archive_path)}#${target.entry_name}`
    }

    const buildFields = (
      source: ImagePackageDto | null,
      video: LibrarySnapshotDto['videos'][number] | null,
      audio: LibrarySnapshotDto['audios'][number] | null,
      fallbackTitle: string,
    ) => {
      if (video) {
        return {
          authorJp: video.author_jpn.trim(),
          authorEn: video.author.trim(),
          circleJp: video.circle_jpn.trim(),
          circleEn: video.circle.trim(),
          titleJp: video.work_title_jpn.trim(),
          titleEn: video.work_title.trim() || fallbackTitle,
        }
      }
      if (audio) {
        return {
          authorJp: '',
          authorEn: audio.author.trim(),
          circleJp: '',
          circleEn: audio.album.trim(),
          titleJp: '',
          titleEn: audio.track_title.trim() || fallbackTitle,
        }
      }

      const metadata = source?.external_metadata
      return {
        authorJp: (metadata?.artist_jpn ?? '').trim(),
        authorEn: ((metadata?.artist ?? '').trim() || (source?.author ?? '').trim()),
        circleJp: (metadata?.group_name_jpn ?? '').trim(),
        circleEn: ((metadata?.group_name ?? '').trim() || (source?.circle ?? '').trim()),
        titleJp: (metadata?.title_jpn ?? '').trim(),
        titleEn: ((metadata?.title ?? '').trim() || (source?.work_title ?? '').trim() || fallbackTitle),
      }
    }

    for (const [index, target] of normalizedTargets.entries()) {
      let sourcePath = ''
      let sourceName = ''
      let sourceExtension = ''
      let sourceIsFile = true
      let metadataFields = buildFields(null, null, null, '')
      let archivePath = ''
      let archiveEntryName = ''

      if (target.kind === 'sidebar-node') {
        const parsed = parseSidebarNodeId(target.node_id)
        if (!parsed) {
          failed.push({ target, reason: 'invalid node id' })
          if (failFast) {
            break
          }
          continue
        }
        const resolvedSourcePath = this.resolveSidebarNodeSourcePath(parsed, snapshot)
        if (!resolvedSourcePath) {
          failed.push({ target, reason: 'node not found' })
          if (failFast) {
            break
          }
          continue
        }
        sourcePath = path.resolve(resolvedSourcePath)
        const sourceStat = await fs.stat(sourcePath).catch(() => null)
        if (!sourceStat) {
          failed.push({ target, reason: 'path not found' })
          if (failFast) {
            break
          }
          continue
        }
        sourceIsFile = sourceStat.isFile()
        sourceExtension = sourceIsFile ? path.extname(sourcePath) : ''
        sourceName = sourceIsFile ? path.basename(sourcePath, sourceExtension) : path.basename(sourcePath)
        if (parsed.kind === 'video') {
          const video = snapshot.videos.find((item) => item.tree_path.join('/') === parsed.pathKey) ?? null
          metadataFields = buildFields(null, video, null, sourceName)
        } else if (parsed.kind === 'audio') {
          const audio = (snapshot.audios ?? []).find((item) => item.tree_path.join('/') === parsed.pathKey) ?? null
          metadataFields = buildFields(null, null, audio, sourceName)
        } else if (parsed.kind === 'package') {
          const source = [...snapshot.image_packages, ...snapshot.image_directories].find(
            (item) => item.tree_path.join('/') === parsed.pathKey,
          ) ?? null
          metadataFields = buildFields(source, null, null, sourceName)
        }
      } else if (target.kind === 'image-item') {
        const found = imageById.get(target.image_id)
        if (!found) {
          failed.push({ target, reason: 'image not found' })
          if (failFast) {
            break
          }
          continue
        }
        metadataFields = buildFields(found.source, null, null, '')
        if (found.image.media_locator.kind === 'filesystem') {
          sourcePath = path.resolve(found.image.media_locator.absolute_path)
          sourceExtension = path.extname(sourcePath)
          sourceName = path.basename(sourcePath, sourceExtension)
        } else {
          archivePath = path.resolve(found.image.media_locator.archive_path)
          archiveEntryName = found.image.media_locator.entry_name
          sourceExtension = path.extname(archiveEntryName)
          sourceName = path.basename(archiveEntryName, sourceExtension)
          sourcePath = `${archivePath}#${archiveEntryName}`
        }
      } else {
        archivePath = path.resolve(target.archive_path)
        archiveEntryName = target.entry_name
        sourceExtension = path.extname(archiveEntryName)
        sourceName = path.basename(archiveEntryName, sourceExtension)
        sourcePath = `${archivePath}#${archiveEntryName}`
      }

      const accessiblePath = archivePath || sourcePath.split('#')[0]
      if (!isPathAllowlisted(accessiblePath, mediaAccessContext)) {
        failed.push({ target, reason: 'path outside allowlist' })
        if (failFast) {
          break
        }
        continue
      }

      let nextBaseName = sourceName
      if (request.mode === 'single') {
        nextBaseName = request.single_new_name?.trim() ?? ''
      } else if (request.mode === 'replace') {
        const replaceFrom = request.replace_from ?? ''
        if (!replaceFrom) {
          failed.push({ target, reason: 'replace_from empty' })
          if (failFast) {
            break
          }
          continue
        }
        nextBaseName = sourceName.replaceAll(replaceFrom, request.replace_to ?? '')
      } else if (request.mode === 'numbering') {
        const start = request.numbering_start ?? 1
        const step = request.numbering_step ?? 1
        const padWidth = request.numbering_pad_width ?? 3
        const value = start + index * step
        nextBaseName = `${request.numbering_base_name ?? ''}${String(value).padStart(padWidth, '0')}`
      } else if (request.mode === 'remove-range') {
        const startIndex = Math.max(0, (request.remove_start ?? 1) - 1)
        const endIndexExclusive = Math.min(sourceName.length, request.remove_end ?? request.remove_start ?? 1)
        nextBaseName = sourceName.slice(0, startIndex) + sourceName.slice(endIndexExclusive)
      } else {
        nextBaseName = this.renderMetadataTemplate(request.metadata_template ?? '', metadataFields)
      }

      const normalizedBaseName = nextBaseName.trim()
      if (!this.isValidGroupName(normalizedBaseName)) {
        failed.push({ target, reason: 'invalid target name' })
        if (failFast) {
          break
        }
        continue
      }

      const targetName = sourceExtension
        ? normalizedBaseName.toLowerCase().endsWith(sourceExtension.toLowerCase())
          ? normalizedBaseName
          : `${normalizedBaseName}${sourceExtension}`
        : normalizedBaseName

      if (archivePath) {
        const baseDir = path.posix.dirname(archiveEntryName.replace(/\\/g, '/'))
        const targetEntryName = baseDir === '.' ? targetName : `${baseDir}/${targetName}`
        plannedOperations.push({
          target,
          sourceName,
          targetName,
          sourcePath,
          targetPath: `${archivePath}#${targetEntryName}`,
          archivePath,
          archiveFromEntryName: archiveEntryName,
          archiveToEntryName: targetEntryName,
        })
      } else {
        const toPath = path.resolve(path.join(path.dirname(sourcePath), targetName))
        plannedOperations.push({
          target,
          sourceName,
          targetName,
          sourcePath,
          targetPath: toPath,
          filesystemFromPath: sourcePath,
          filesystemToPath: toPath,
        })
      }
    }

    if (failed.length === 0) {
      const plannedFileTargetByKey = new Set<string>()
      const sourcePathKeySet = new Set<string>()
      for (const operation of plannedOperations) {
        if (!operation.filesystemFromPath || !operation.filesystemToPath) {
          continue
        }
        sourcePathKeySet.add(normalizeAllowlistKey(operation.filesystemFromPath))
      }

      for (const operation of plannedOperations) {
        if (operation.filesystemToPath) {
          const targetKey = normalizeAllowlistKey(operation.filesystemToPath)
          if (plannedFileTargetByKey.has(targetKey)) {
            failed.push({ target: operation.target, reason: 'duplicate destination in batch' })
            break
          }
          plannedFileTargetByKey.add(targetKey)
          const exists = await fs.stat(operation.filesystemToPath).catch(() => null)
          if (exists && !sourcePathKeySet.has(targetKey)) {
            failed.push({ target: operation.target, reason: 'destination already exists' })
            break
          }
        }
      }
    }

    const failedTargetKeySet = new Set(failed.map((item) => toTargetKey(item.target)))
    const operationByTargetKey = new Map<string, PlannedOperation>()
    for (const operation of plannedOperations) {
      operationByTargetKey.set(toTargetKey(operation.target), operation)
    }

    const operationsToApply = failFast && failed.length > 0
      ? []
      : plannedOperations.filter((operation) => !failedTargetKeySet.has(toTargetKey(operation.target)))

    const results: RenameItemsResponseDto['results'] = operationsToApply.map((operation) => ({
      target: operation.target,
      source_name: operation.sourceName,
      target_name: operation.targetName,
      source_path: operation.sourcePath,
      target_path: operation.targetPath,
      applied: !previewOnly,
      reason: null,
    }))

    for (const failedItem of failed) {
      const operation = operationByTargetKey.get(toTargetKey(failedItem.target))
      if (!operation) {
        continue
      }
      results.push({
        target: operation.target,
        source_name: operation.sourceName,
        target_name: operation.targetName,
        source_path: operation.sourcePath,
        target_path: operation.targetPath,
        applied: false,
        reason: failedItem.reason,
      })
    }

    let renamedCount = 0
    const movedMappings: Array<{ fromPath: string; toPath: string }> = []
    const archiveEntryMappings: Array<{ archivePath: string; fromEntryName: string; toEntryName: string }> = []

    if (!previewOnly) {
      for (const operation of operationsToApply) {
        if (operation.filesystemFromPath && operation.filesystemToPath) {
          try {
            await this.movePathWithFallback(operation.filesystemFromPath, operation.filesystemToPath, false)
            movedMappings.push({ fromPath: operation.filesystemFromPath, toPath: operation.filesystemToPath })
            renamedCount += 1
          } catch (error) {
            const reason = error instanceof Error && error.message ? error.message : String(error)
            failed.push({ target: operation.target, reason })
            if (failFast) {
              break
            }
          }
        }
      }

      const archiveMappingsByArchivePath = new Map<string, Array<{ fromEntryName: string; toEntryName: string; target: RenameItemTargetDto }>>()
      for (const operation of operationsToApply) {
        if (!operation.archivePath || !operation.archiveFromEntryName || !operation.archiveToEntryName) {
          continue
        }
        const list = archiveMappingsByArchivePath.get(operation.archivePath) ?? []
        list.push({
          fromEntryName: operation.archiveFromEntryName,
          toEntryName: operation.archiveToEntryName,
          target: operation.target,
        })
        archiveMappingsByArchivePath.set(operation.archivePath, list)
      }

      for (const [archivePath, mappingList] of archiveMappingsByArchivePath) {
        try {
          await this.repackArchiveWithRenamedEntries(
            archivePath,
            mappingList.map((item) => ({
              fromEntryName: item.fromEntryName,
              toEntryName: item.toEntryName,
            })),
          )
          for (const item of mappingList) {
            archiveEntryMappings.push({ archivePath, fromEntryName: item.fromEntryName, toEntryName: item.toEntryName })
            renamedCount += 1
          }
        } catch (error) {
          const reason = error instanceof Error && error.message ? error.message : String(error)
          for (const item of mappingList) {
            failed.push({ target: item.target, reason })
          }
          if (failFast) {
            break
          }
        }
      }

      if (movedMappings.length > 0) {
        this.options.database.moveSnapshotEntriesByPaths(movedMappings)
      }
      if (archiveEntryMappings.length > 0) {
        this.options.database.renameImageArchiveEntries(archiveEntryMappings)
        await this.options.refreshArchiveIndexesForPaths(new Set(archiveEntryMappings.map((item) => item.archivePath)))
      }

      if (movedMappings.length > 0 || archiveEntryMappings.length > 0) {
        this.options.syncSnapshotFromDatabase()
        this.options.pruneArchiveIndexesByDeletedRoots(movedMappings.map((item) => item.fromPath))
        await this.options.refreshArchiveIndexesForPaths(movedMappings.map((item) => item.toPath)).catch(() => undefined)
        await this.options.replaceImportSourcePaths(movedMappings).catch(() => undefined)
        await fs.rm(this.options.thumbnailCacheRootDir, { recursive: true, force: true }).catch(() => undefined)
        this.options.emitLibraryChanged({ reason: 'manage-rename-items', updated_at_ms: Date.now() })
      }
    }

    return {
      renamed_count: previewOnly ? 0 : renamedCount,
      failed,
      preview_only: previewOnly,
      results,
      updated_at_ms: Date.now(),
    }
  }

  async renameSidebarNodes(
    request: RenameSidebarNodesRequestDto,
  ): Promise<RenameSidebarNodesResponseDto> {
    const now = Date.now()
    const previewOnly = request.preview_only ?? false
    const failFast = request.fail_fast ?? true
    const normalizedNodeIds = Array.from(new Set(request.node_ids.map((value) => value.trim()).filter(Boolean)))
    if (normalizedNodeIds.length === 0) {
      throw new Error('批量重命名失败：未提供节点 id')
    }

    await this.options.ensureStateLoaded()
    const snapshot = await this.options.ensureSnapshotLoaded()
    const mediaAccessContext = this.options.buildMediaAccessContext()
    const failed: Array<{ node_id: string; reason: string }> = []
    const results: RenameSidebarNodesResponseDto['results'] = []

    const resolvedTargets: Array<{
      nodeId: string
      parsed: ParsedSidebarNodeRef
      sourcePath: string
      sourceName: string
      sourceStat: Awaited<ReturnType<typeof fs.stat>>
      targetName: string
      targetPath: string
    }> = []

    if (request.mode === 'replace' && (request.replace_from ?? '').length === 0) {
      throw new Error('批量重命名失败：replace_from 不能为空')
    }

    for (const [index, nodeId] of normalizedNodeIds.entries()) {
      const parsed = parseSidebarNodeId(nodeId)
      if (!parsed) {
        failed.push({ node_id: nodeId, reason: 'invalid node id' })
        if (failFast) {
          break
        }
        continue
      }

      const sourcePath = this.resolveSidebarNodeSourcePath(parsed, snapshot)
      if (!sourcePath) {
        failed.push({ node_id: nodeId, reason: 'node not found' })
        if (failFast) {
          break
        }
        continue
      }

      const resolvedSourcePath = path.resolve(sourcePath)
      if (isFileSystemRootPath(resolvedSourcePath)) {
        failed.push({ node_id: nodeId, reason: 'refuse to rename filesystem root' })
        if (failFast) {
          break
        }
        continue
      }

      if (!isPathAllowlisted(resolvedSourcePath, mediaAccessContext)) {
        failed.push({ node_id: nodeId, reason: 'path outside allowlist' })
        if (failFast) {
          break
        }
        continue
      }

      const sourceStat = await fs.stat(resolvedSourcePath).catch(() => null)
      if (!sourceStat) {
        failed.push({ node_id: nodeId, reason: 'path not found' })
        if (failFast) {
          break
        }
        continue
      }

      const sourceExtension = sourceStat.isFile() ? path.extname(resolvedSourcePath) : ''
      const sourceBaseName = sourceStat.isFile() ? path.basename(resolvedSourcePath, sourceExtension) : path.basename(resolvedSourcePath)

      let nextBaseName = sourceBaseName
      if (request.mode === 'replace') {
        nextBaseName = sourceBaseName.replaceAll(request.replace_from ?? '', request.replace_to ?? '')
      } else if (request.mode === 'numbering') {
        const start = request.numbering_start ?? 1
        const step = request.numbering_step ?? 1
        const padWidth = request.numbering_pad_width ?? 3
        const value = start + index * step
        nextBaseName = `${request.numbering_base_name ?? ''}${String(value).padStart(padWidth, '0')}`
      } else if (request.mode === 'remove-range') {
        const startPosition = request.remove_start ?? 1
        const endPosition = request.remove_end ?? startPosition
        const startIndex = Math.max(0, startPosition - 1)
        const endIndexExclusive = Math.min(sourceBaseName.length, endPosition)
        nextBaseName = sourceBaseName.slice(0, startIndex) + sourceBaseName.slice(endIndexExclusive)
      } else {
        nextBaseName = this.buildMetadataSynthesisName(parsed, snapshot, resolvedSourcePath)
      }

      const normalizedTargetBaseName = nextBaseName.trim()
      if (!this.isValidGroupName(normalizedTargetBaseName)) {
        failed.push({ node_id: nodeId, reason: 'invalid target name' })
        if (failFast) {
          break
        }
        continue
      }

      const targetName = sourceStat.isFile()
        ? normalizedTargetBaseName.toLowerCase().endsWith(sourceExtension.toLowerCase())
          ? normalizedTargetBaseName
          : `${normalizedTargetBaseName}${sourceExtension}`
        : normalizedTargetBaseName
      const targetPath = path.resolve(path.join(path.dirname(resolvedSourcePath), targetName))

      if (normalizeAllowlistKey(targetPath) === normalizeAllowlistKey(resolvedSourcePath)) {
        failed.push({ node_id: nodeId, reason: 'source equals target' })
        if (failFast) {
          break
        }
        continue
      }

      resolvedTargets.push({
        nodeId,
        parsed,
        sourcePath: resolvedSourcePath,
        sourceName: sourceBaseName,
        sourceStat,
        targetName,
        targetPath,
      })
    }

    if (failed.length === 0) {
      const sourceKeySet = new Set(resolvedTargets.map((item) => normalizeAllowlistKey(item.sourcePath)))
      const plannedTargetByKey = new Map<string, string>()
      for (const target of resolvedTargets) {
        const targetKey = normalizeAllowlistKey(target.targetPath)
        if (plannedTargetByKey.has(targetKey)) {
          failed.push({ node_id: target.nodeId, reason: 'duplicate destination in batch' })
          if (failFast) {
            break
          }
          continue
        }
        plannedTargetByKey.set(targetKey, target.nodeId)

        const exists = await fs.stat(target.targetPath).catch(() => null)
        if (exists && !sourceKeySet.has(targetKey)) {
          failed.push({ node_id: target.nodeId, reason: 'destination already exists' })
          if (failFast) {
            break
          }
        }
      }
    }

    const failureNodeIdSet = new Set(failed.map((item) => item.node_id))
    const applyTargets = failFast && failed.length > 0
      ? []
      : resolvedTargets.filter((item) => !failureNodeIdSet.has(item.nodeId))

    const movedMappings: Array<{ fromPath: string; toPath: string }> = []
    for (const target of applyTargets) {
      if (!previewOnly) {
        try {
          await this.movePathWithFallback(target.sourcePath, target.targetPath, target.sourceStat.isDirectory())
          movedMappings.push({ fromPath: target.sourcePath, toPath: target.targetPath })
        } catch (error) {
          const reason = error instanceof Error && error.message ? error.message : String(error)
          failed.push({ node_id: target.nodeId, reason })
          if (failFast) {
            break
          }
          continue
        }
      }

      results.push({
        node_id: target.nodeId,
        source_name: target.sourceName,
        target_name: target.targetName,
        source_path: target.sourcePath,
        target_path: target.targetPath,
        applied: !previewOnly,
        reason: null,
      })
    }

    for (const item of failed) {
      const target = resolvedTargets.find((candidate) => candidate.nodeId === item.node_id)
      if (!target) {
        continue
      }
      if (results.some((entry) => entry.node_id === item.node_id)) {
        continue
      }
      results.push({
        node_id: item.node_id,
        source_name: target.sourceName,
        target_name: target.targetName,
        source_path: target.sourcePath,
        target_path: target.targetPath,
        applied: false,
        reason: item.reason,
      })
    }

    if (!previewOnly && movedMappings.length > 0) {
      this.options.database.moveSnapshotEntriesByPaths(movedMappings)
      this.options.syncSnapshotFromDatabase()
      this.options.pruneArchiveIndexesByDeletedRoots(movedMappings.map((item) => item.fromPath))
      await this.options.refreshArchiveIndexesForPaths(movedMappings.map((item) => item.toPath)).catch(() => undefined)
      await this.options.replaceImportSourcePaths(movedMappings).catch(() => undefined)
      await fs.rm(this.options.thumbnailCacheRootDir, { recursive: true, force: true }).catch(() => undefined)
      this.options.emitLibraryChanged({ reason: 'manage-rename-sidebar-nodes', updated_at_ms: Date.now() })
    }

    return {
      renamed_count: movedMappings.length,
      failed,
      preview_only: previewOnly,
      results,
      updated_at_ms: now,
    }
  }

  async renameSidebarNode(
    request: RenameSidebarNodeRequestDto,
  ): Promise<RenameSidebarNodeResponseDto> {
    const normalizedNodeId = request.node_id.trim()
    const normalizedNewName = request.new_name.trim()
    if (!normalizedNodeId) {
      throw new Error('重命名失败：未提供节点 id')
    }

    if (!normalizedNewName) {
      throw new Error('重命名失败：未提供新名称')
    }

    const failed: Array<{ node_id: string; reason: string }> = []
    const parsed = parseSidebarNodeId(normalizedNodeId)
    if (!parsed) {
      failed.push({
        node_id: normalizedNodeId,
        reason: 'invalid node id',
      })
      return {
        renamed_count: 0,
        failed,
        target_path: null,
        updated_at_ms: Date.now(),
      }
    }

    if (!this.isValidGroupName(normalizedNewName)) {
      failed.push({
        node_id: normalizedNodeId,
        reason: 'invalid target name',
      })
      return {
        renamed_count: 0,
        failed,
        target_path: null,
        updated_at_ms: Date.now(),
      }
    }

    await this.options.ensureStateLoaded()
    const snapshot = await this.options.ensureSnapshotLoaded()
    const mediaAccessContext = this.options.buildMediaAccessContext()

    const sourcePath = this.resolveSidebarNodeSourcePath(parsed, snapshot)

    if (!sourcePath) {
      failed.push({
        node_id: normalizedNodeId,
        reason: 'node not found',
      })
      return {
        renamed_count: 0,
        failed,
        target_path: null,
        updated_at_ms: Date.now(),
      }
    }

    const resolvedSourcePath = path.resolve(sourcePath)
    if (isFileSystemRootPath(resolvedSourcePath)) {
      failed.push({
        node_id: normalizedNodeId,
        reason: 'refuse to rename filesystem root',
      })
      return {
        renamed_count: 0,
        failed,
        target_path: null,
        updated_at_ms: Date.now(),
      }
    }

    if (!isPathAllowlisted(resolvedSourcePath, mediaAccessContext)) {
      failed.push({
        node_id: normalizedNodeId,
        reason: 'path outside allowlist',
      })
      return {
        renamed_count: 0,
        failed,
        target_path: null,
        updated_at_ms: Date.now(),
      }
    }

    const sourceStat = await fs.stat(resolvedSourcePath).catch(() => null)
    if (!sourceStat) {
      failed.push({
        node_id: normalizedNodeId,
        reason: 'path not found',
      })
      return {
        renamed_count: 0,
        failed,
        target_path: null,
        updated_at_ms: Date.now(),
      }
    }

    let normalizedTargetName = normalizedNewName
    if (sourceStat.isFile()) {
      const sourceExtension = path.extname(resolvedSourcePath)
      if (sourceExtension) {
        const normalizedSourceExtension = sourceExtension.toLowerCase()
        if (!normalizedTargetName.toLowerCase().endsWith(normalizedSourceExtension)) {
          normalizedTargetName = `${normalizedTargetName}${sourceExtension}`
        }
      }
    }

    const targetPath = path.resolve(path.join(path.dirname(resolvedSourcePath), normalizedTargetName))
    if (normalizeAllowlistKey(targetPath) === normalizeAllowlistKey(resolvedSourcePath)) {
      failed.push({
        node_id: normalizedNodeId,
        reason: 'source equals target',
      })
      return {
        renamed_count: 0,
        failed,
        target_path: null,
        updated_at_ms: Date.now(),
      }
    }

    const targetExists = await fs.stat(targetPath).catch(() => null)
    if (targetExists) {
      failed.push({
        node_id: normalizedNodeId,
        reason: 'destination already exists',
      })
      return {
        renamed_count: 0,
        failed,
        target_path: null,
        updated_at_ms: Date.now(),
      }
    }

    try {
      await this.movePathWithFallback(resolvedSourcePath, targetPath, sourceStat.isDirectory())
    } catch (error) {
      const reason = error instanceof Error && error.message ? error.message : String(error)
      failed.push({
        node_id: normalizedNodeId,
        reason,
      })
      return {
        renamed_count: 0,
        failed,
        target_path: null,
        updated_at_ms: Date.now(),
      }
    }

    const movedMappings = [{ fromPath: resolvedSourcePath, toPath: targetPath }]
    this.options.database.moveSnapshotEntriesByPaths(movedMappings)
    this.options.syncSnapshotFromDatabase()
    this.options.pruneArchiveIndexesByDeletedRoots([resolvedSourcePath])
    await this.options.refreshArchiveIndexesForPaths([targetPath]).catch(() => undefined)
    await this.options.replaceImportSourcePaths(movedMappings).catch(() => undefined)
    await fs.rm(this.options.thumbnailCacheRootDir, { recursive: true, force: true }).catch(() => undefined)

    this.options.emitLibraryChanged({
      reason: 'manage-rename-sidebar-node',
      updated_at_ms: Date.now(),
    })

    return {
      renamed_count: 1,
      failed,
      target_path: targetPath,
      updated_at_ms: Date.now(),
    }
  }

  async moveSidebarNodes(
    request: MoveSidebarNodesRequestDto,
  ): Promise<MoveSidebarNodesResponseDto> {
    const normalizedNodeIds = Array.from(new Set(request.node_ids.map((value) => value.trim()).filter(Boolean)))
    if (normalizedNodeIds.length === 0) {
      throw new Error('移动失败：未提供节点 id')
    }

    const destinationRootDir = path.resolve(request.destination_directory)
    const destinationRootStat = await fs.stat(destinationRootDir).catch(() => null)
    if (!destinationRootStat || !destinationRootStat.isDirectory()) {
      throw new Error(`移动失败：目标目录不存在 ${destinationRootDir}`)
    }

    const groupName = request.group_name?.trim() ?? ''
    if (groupName.length > 0 && !this.isValidGroupName(groupName)) {
      throw new Error('分组失败：目录名不合法')
    }

    let targetDirectory = destinationRootDir
    if (groupName.length > 0) {
      targetDirectory = path.resolve(path.join(destinationRootDir, groupName))
      if (path.dirname(targetDirectory) !== destinationRootDir) {
        throw new Error('分组失败：目录名不合法')
      }

      try {
        await fs.mkdir(targetDirectory)
      } catch (error) {
        const maybeFsError = error as NodeJS.ErrnoException
        if (maybeFsError?.code === 'EEXIST') {
          throw new Error(`分组失败：目录已存在 ${targetDirectory}`)
        }
        throw error
      }
    }

    const parsedTargets = normalizedNodeIds.map((nodeId) => {
      const parsed = parseSidebarNodeId(nodeId)
      return {
        nodeId,
        parsed,
        matched: false,
      }
    })

    const failed: Array<{ node_id: string; reason: string }> = []
    const validTargets = parsedTargets.filter((target) => {
      if (target.parsed) {
        return true
      }
      failed.push({
        node_id: target.nodeId,
        reason: 'invalid node id',
      })
      return false
    })

    await this.options.ensureStateLoaded()
    const snapshot = await this.options.ensureSnapshotLoaded()
    const mediaAccessContext = this.options.buildMediaAccessContext()

    const selectedPaths = new Set<string>()
    const nodeIdsBySelectedPath = new Map<string, Set<string>>()

    const rememberSelectedPath = (absolutePath: string, nodeId: string) => {
      const resolvedPath = path.resolve(absolutePath)
      selectedPaths.add(resolvedPath)
      const nodeIds = nodeIdsBySelectedPath.get(resolvedPath) ?? new Set<string>()
      nodeIds.add(nodeId)
      nodeIdsBySelectedPath.set(resolvedPath, nodeIds)
    }

    for (const target of validTargets) {
      const parsed = target.parsed
      if (!parsed || parsed.kind !== 'folder') {
        continue
      }
      const folderPath = resolveAbsolutePathFromPathKey(parsed.pathKey)
      rememberSelectedPath(folderPath, target.nodeId)
      target.matched = true
    }

    const markMatchedAndSelect = (pathKey: string, kind: 'package' | 'directory' | 'video' | 'audio', absolutePath: string): boolean => {
      for (const target of validTargets) {
        const parsed = target.parsed
        if (!parsed) {
          continue
        }

        if (parsed.kind === 'folder') {
          if (pathKeyHasPrefix(pathKey, parsed.pathKey)) {
            target.matched = true
            rememberSelectedPath(absolutePath, target.nodeId)
            return true
          }
          continue
        }

        if (parsed.kind === 'package' && kind === 'package' && pathKey === parsed.pathKey) {
          target.matched = true
          rememberSelectedPath(absolutePath, target.nodeId)
          return true
        }

        if (parsed.kind === 'video' && kind === 'video' && pathKey === parsed.pathKey) {
          target.matched = true
          rememberSelectedPath(absolutePath, target.nodeId)
          return true
        }

        if (parsed.kind === 'audio' && kind === 'audio' && pathKey === parsed.pathKey) {
          target.matched = true
          rememberSelectedPath(absolutePath, target.nodeId)
          return true
        }
      }

      return false
    }

    for (const source of snapshot.image_packages) {
      const pathKey = source.tree_path.join('/')
      markMatchedAndSelect(pathKey, 'package', source.absolute_path)
    }

    for (const source of snapshot.image_directories) {
      const pathKey = source.tree_path.join('/')
      markMatchedAndSelect(pathKey, 'directory', source.absolute_path)
    }

    for (const video of snapshot.videos) {
      const pathKey = video.tree_path.join('/')
      markMatchedAndSelect(pathKey, 'video', video.absolute_path)
    }

    for (const audio of snapshot.audios ?? []) {
      const pathKey = audio.tree_path.join('/')
      markMatchedAndSelect(pathKey, 'audio', audio.absolute_path)
    }

    for (const target of validTargets) {
      if (target.matched) {
        continue
      }
      failed.push({
        node_id: target.nodeId,
        reason: 'node not found',
      })
    }

    const sortedPaths = Array.from(selectedPaths).sort((left, right) => left.length - right.length)
    const prunedPaths: string[] = []
    for (const candidatePath of sortedPaths) {
      if (prunedPaths.some((existingPath) => isPathInsideRoot(existingPath, candidatePath))) {
        continue
      }
      prunedPaths.push(candidatePath)
    }

    const movedMappings: Array<{ fromPath: string; toPath: string }> = []
    for (const absolutePath of prunedPaths) {
      const nodeIds = nodeIdsBySelectedPath.get(absolutePath) ?? new Set<string>()

      if (!isPathAllowlisted(absolutePath, mediaAccessContext)) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: 'path outside allowlist',
          })
        }
        continue
      }

      if (normalizeAllowlistKey(absolutePath) === normalizeAllowlistKey(targetDirectory)) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: 'source equals destination',
          })
        }
        continue
      }

      if (isPathInsideRoot(absolutePath, targetDirectory)) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: 'destination inside source path',
          })
        }
        continue
      }

      const sourceStat = await fs.stat(absolutePath).catch(() => null)
      if (!sourceStat) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: 'path not found',
          })
        }
        continue
      }

      const toPath = path.resolve(path.join(targetDirectory, path.basename(absolutePath)))
      if (normalizeAllowlistKey(absolutePath) === normalizeAllowlistKey(toPath)) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: 'source already in destination',
          })
        }
        continue
      }

      const targetExists = await fs.stat(toPath).catch(() => null)
      if (targetExists) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: 'destination already exists',
          })
        }
        continue
      }

      try {
        await this.movePathWithFallback(absolutePath, toPath, sourceStat.isDirectory())
        movedMappings.push({
          fromPath: absolutePath,
          toPath,
        })
      } catch (error) {
        const reason = error instanceof Error && error.message ? error.message : String(error)
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason,
          })
        }
      }
    }

    if (movedMappings.length > 0) {
      this.options.database.moveSnapshotEntriesByPaths(movedMappings)
      this.options.syncSnapshotFromDatabase()
      this.options.pruneArchiveIndexesByDeletedRoots(movedMappings.map((mapping) => mapping.fromPath))
      await this.options.refreshArchiveIndexesForPaths(movedMappings.map((mapping) => mapping.toPath))
      await this.options.replaceImportSourcePaths(movedMappings)
      await fs.rm(this.options.thumbnailCacheRootDir, { recursive: true, force: true }).catch(() => undefined)

      this.options.emitLibraryChanged({
        reason: groupName.length > 0 ? 'manage-group-sidebar-nodes' : 'manage-move-sidebar-nodes',
        updated_at_ms: Date.now(),
      })
    }

    return {
      moved_count: movedMappings.length,
      failed,
      target_directory: targetDirectory,
      updated_at_ms: Date.now(),
    }
  }
}
