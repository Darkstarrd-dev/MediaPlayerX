import { promises as fs } from 'node:fs'
import path from 'node:path'

import type { MediaLocatorDto } from '../src/contracts/backend'
import { isPathInsideRoot, normalizeAllowlistKey } from './fileSystemServiceHelpers'
import { isSafeArchiveEntryName, normalizeArchiveEntryName } from './zipArchiveHelpers'

export type MediaAuditRejectReason =
  | 'path_outside_root'
  | 'filesystem_extension_mismatch'
  | 'filesystem_media_type_not_allowed'
  | 'filesystem_file_missing'
  | 'archive_format_not_supported'
  | 'archive_extension_invalid'
  | 'archive_entry_illegal'
  | 'archive_entry_not_allowlisted'
  | 'archive_not_exists'

export class MediaAccessError extends Error {
  readonly reason: MediaAuditRejectReason

  constructor(reason: MediaAuditRejectReason, message: string) {
    super(message)
    this.reason = reason
    this.name = 'MediaAccessError'
  }
}

export interface MediaAccessGuardContext {
  rootDir: string
  importDirectoryRoots: string[]
  importFileAllowlistKeys: Set<string>
  archiveEntryIndexByPath: Map<string, Set<string>>
  imageExtensions: ReadonlySet<string>
  videoExtensions: ReadonlySet<string>
}

export function isPathAllowlisted(absolutePath: string, context: MediaAccessGuardContext): boolean {
  if (isPathInsideRoot(context.rootDir, absolutePath)) {
    return true
  }

  for (const root of context.importDirectoryRoots) {
    if (isPathInsideRoot(root, absolutePath)) {
      return true
    }
  }

  const key = normalizeAllowlistKey(absolutePath)
  return context.importFileAllowlistKeys.has(key)
}

export async function assertLocatorAllowed(
  locator: MediaLocatorDto,
  context: MediaAccessGuardContext,
): Promise<MediaLocatorDto> {
  if (locator.kind === 'filesystem') {
    const absolutePath = path.resolve(locator.absolute_path)

    if (!isPathAllowlisted(absolutePath, context)) {
      throw new MediaAccessError('path_outside_root', `媒体访问被拒绝（未导入/未允许）: ${absolutePath}`)
    }

    const extension = path.extname(absolutePath).toLowerCase()
    if (!extension || extension !== locator.extension.toLowerCase()) {
      throw new MediaAccessError('filesystem_extension_mismatch', `媒体访问被拒绝（扩展名不一致）: ${absolutePath}`)
    }

    const extensionAllowed =
      locator.media_type === 'image'
        ? context.imageExtensions.has(extension)
        : context.videoExtensions.has(extension)
    if (!extensionAllowed) {
      throw new MediaAccessError('filesystem_media_type_not_allowed', `媒体访问被拒绝（类型不允许）: ${absolutePath}`)
    }

    const stat = await fs.stat(absolutePath).catch(() => null)
    if (!stat || !stat.isFile()) {
      throw new MediaAccessError('filesystem_file_missing', `媒体访问失败（文件不存在）: ${absolutePath}`)
    }

    return {
      ...locator,
      absolute_path: absolutePath,
      extension,
    }
  }

  const archivePath = path.resolve(locator.archive_path)
  if (!isPathAllowlisted(archivePath, context)) {
    throw new MediaAccessError('path_outside_root', `压缩包媒体访问被拒绝（未导入/未允许）: ${archivePath}`)
  }

  const archiveStat = await fs.stat(archivePath).catch(() => null)
  if (!archiveStat || !archiveStat.isFile()) {
    throw new MediaAccessError('archive_not_exists', `压缩包媒体访问被拒绝（文件不存在）: ${archivePath}`)
  }

  if (locator.archive_format !== 'zip') {
    throw new MediaAccessError('archive_format_not_supported', `压缩包媒体访问被拒绝（暂仅支持 zip）: ${archivePath}`)
  }
  if (path.extname(archivePath).toLowerCase() !== '.zip') {
    throw new MediaAccessError('archive_extension_invalid', `压缩包媒体访问被拒绝（扩展名异常）: ${archivePath}`)
  }

  const normalizedEntryName = normalizeArchiveEntryName(locator.entry_name)
  if (!isSafeArchiveEntryName(normalizedEntryName)) {
    throw new MediaAccessError('archive_entry_illegal', `压缩包媒体访问被拒绝（entry 非法）: ${archivePath}`)
  }

  const allowedEntries = context.archiveEntryIndexByPath.get(archivePath)
  if (!allowedEntries || !allowedEntries.has(normalizedEntryName)) {
    throw new MediaAccessError(
      'archive_entry_not_allowlisted',
      `压缩包媒体访问被拒绝（entry 不在白名单）: ${archivePath}::${normalizedEntryName}`,
    )
  }

  return {
    ...locator,
    archive_path: archivePath,
    entry_name: normalizedEntryName,
    extension: path.extname(normalizedEntryName).toLowerCase(),
  }
}
