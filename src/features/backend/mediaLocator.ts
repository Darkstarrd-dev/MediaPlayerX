import type { MediaLocatorDto } from '../../contracts/backend'
import type { MediaLocator } from '../../types'

export function mediaLocatorKey(locator: MediaLocator): string {
  if (locator.kind === 'filesystem') {
    return `fs:${locator.absolutePath}`
  }
  return `archive:${locator.archivePath}::${locator.entryName}`
}

export function mapMediaLocatorToDto(locator: MediaLocator): MediaLocatorDto {
  if (locator.kind === 'filesystem') {
    return {
      kind: 'filesystem',
      absolute_path: locator.absolutePath,
      extension: locator.extension,
      media_type: locator.mediaType,
      mime_type: locator.mimeType,
    }
  }

  return {
    kind: 'archive-entry',
    archive_path: locator.archivePath,
    archive_format: locator.archiveFormat,
    entry_name: locator.entryName,
    extension: locator.extension,
    media_type: locator.mediaType,
    mime_type: locator.mimeType,
  }
}

export function mediaLocatorDisplayPath(locator: MediaLocator): string {
  if (locator.kind === 'filesystem') {
    return locator.absolutePath
  }
  return `${locator.archivePath}::${locator.entryName}`
}

export function mediaLocatorFileName(locator: MediaLocator): string {
  if (locator.kind === 'filesystem') {
    const normalized = locator.absolutePath.replace(/\\/g, '/')
    return normalized.split('/').at(-1) ?? locator.absolutePath
  }
  const normalized = locator.entryName.replace(/\\/g, '/')
  return normalized.split('/').at(-1) ?? locator.entryName
}
