import path from 'node:path'

import type { ImageItemDto, ImagePackageDto, MediaLocatorDto } from '../src/contracts/backend'
import {
  detectMimeTypeByExtension,
  makeStableId,
  toAbsoluteTreePath,
  toSafeSizeKb,
} from './fileSystemServiceHelpers'
import type { FileRecord } from './fileSystemFileCollector'
import type { ZipCentralEntry } from './zipArchiveHelpers'

function createDirectoryImageItem(
  record: FileRecord,
  sourceId: string,
  ordinal: number,
  colorPalette: readonly string[],
): ImageItemDto {
  const cluster = ordinal % colorPalette.length
  const mediaLocator: MediaLocatorDto = {
    kind: 'filesystem',
    absolute_path: record.absolutePath,
    extension: record.extension,
    media_type: 'image',
    mime_type: detectMimeTypeByExtension(record.extension, 'image'),
  }

  return {
    id: makeStableId('img', `${sourceId}:${record.absolutePath}`),
    ordinal,
    width: record.width,
    height: record.height,
    size_kb: toSafeSizeKb(record.sizeBytes),
    cluster,
    color: colorPalette[cluster] ?? '#4f86cf',
    feature_vector: [0, 0, 0, 0, 0, 0, 0, 0],
    media_locator: mediaLocator,
  }
}

function createArchiveImageItem(
  sourceId: string,
  archivePath: string,
  entry: ZipCentralEntry,
  ordinal: number,
  colorPalette: readonly string[],
): ImageItemDto {
  const cluster = ordinal % colorPalette.length
  const mediaLocator: MediaLocatorDto = {
    kind: 'archive-entry',
    archive_path: archivePath,
    archive_format: 'zip',
    entry_name: entry.entryName,
    extension: entry.extension,
    media_type: 'image',
    mime_type: detectMimeTypeByExtension(entry.extension, 'image'),
  }

  return {
    id: makeStableId('img', `${sourceId}:${archivePath}::${entry.entryName}`),
    ordinal,
    width: 0,
    height: 0,
    size_kb: toSafeSizeKb(entry.uncompressedSize),
    cluster,
    color: colorPalette[cluster] ?? '#4f86cf',
    feature_vector: [0, 0, 0, 0, 0, 0, 0, 0],
    media_locator: mediaLocator,
  }
}

interface CreateDirectorySourceParams {
  directoryPath: string
  imageFiles: FileRecord[]
  colorPalette: readonly string[]
  packageGradeOverridesBySourceId: Map<string, number | null>
}

export function createDirectorySource(params: CreateDirectorySourceParams): ImagePackageDto {
  const treePath = toAbsoluteTreePath(params.directoryPath)
  const sourceId = makeStableId('dir', params.directoryPath)
  const displayName = path.basename(params.directoryPath) || treePath[treePath.length - 1] || sourceId
  const persistedGrade = params.packageGradeOverridesBySourceId.get(sourceId)

  return {
    id: sourceId,
    package_name: displayName,
    display_name: displayName,
    absolute_path: params.directoryPath,
    tree_path: treePath,
    work_title: displayName,
    circle: '未知',
    author: '未知',
    tags: [],
    mock_grade: persistedGrade ?? null,
    images: params.imageFiles.map((file, index) => createDirectoryImageItem(file, sourceId, index + 1, params.colorPalette)),
  }
}

interface CreateArchiveSourceParams {
  file: FileRecord
  imageEntries: ZipCentralEntry[]
  archivePathForMediaRead: string
  colorPalette: readonly string[]
  packageGradeOverridesBySourceId: Map<string, number | null>
}

export function createArchiveSource(params: CreateArchiveSourceParams): ImagePackageDto {
  const sourceId = makeStableId('pkg', params.file.absolutePath)
  const fileName = path.basename(params.file.absolutePath)
  const displayName = path.basename(params.file.absolutePath, params.file.extension)
  const persistedGrade = params.packageGradeOverridesBySourceId.get(sourceId)

  const sortedEntries = [...params.imageEntries].sort((left, right) => left.entryName.localeCompare(right.entryName, 'zh-CN'))

  return {
    id: sourceId,
    package_name: fileName,
    display_name: displayName,
    absolute_path: params.file.absolutePath,
    tree_path: toAbsoluteTreePath(params.file.absolutePath),
    work_title: displayName,
    circle: '未知',
    author: '未知',
    tags: [],
    mock_grade: persistedGrade ?? null,
    images: sortedEntries.map((entry, index) =>
      createArchiveImageItem(sourceId, params.archivePathForMediaRead, entry, index + 1, params.colorPalette),
    ),
  }
}
