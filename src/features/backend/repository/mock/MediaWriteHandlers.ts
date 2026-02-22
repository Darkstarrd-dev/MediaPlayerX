import {
  clearDatabaseResponseSchema,
  deleteImageItemsResponseSchema,
  deleteSidebarNodesResponseSchema,
  moveSidebarNodesResponseSchema,
  renameSidebarNodeResponseSchema,
  renameSidebarNodesResponseSchema,
  enqueueImportTaskResponseSchema,
  retryImportTaskResponseSchema,
  saveVideoCoverResponseSchema,
  setImageHiddenResponseSchema,
  writePackageExternalMetadataResponseSchema,
  writePackageGradeResponseSchema,
  writePackageMetadataResponseSchema,
  writePlaylistResponseSchema,
  writeVideoMetadataResponseSchema,
  writeAudioMetadataResponseSchema,
  type ClearDatabaseResponseDto,
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
  type EnqueueImportTaskRequestDto,
  type EnqueueImportTaskResponseDto,
  type ImportTaskDto,
  type RetryImportTaskRequestDto,
  type RetryImportTaskResponseDto,
  type SaveVideoCoverRequestDto,
  type SaveVideoCoverResponseDto,
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
  type WritePackageExternalMetadataRequestDto,
  type WritePackageExternalMetadataResponseDto,
  type WritePackageGradeRequestDto,
  type WritePackageGradeResponseDto,
  type WritePackageMetadataRequestDto,
  type WritePackageMetadataResponseDto,
  type WritePlaylistRequestDto,
  type WritePlaylistResponseDto,
  type WriteVideoMetadataRequestDto,
  type WriteVideoMetadataResponseDto,
  type WriteAudioMetadataRequestDto,
  type WriteAudioMetadataResponseDto,
} from '../../../../contracts/backend'
import {
  deriveWorkTitleFromFileName,
  normalizePathKeyForMatch,
  normalizeTags,
  normalizeTextValue,
  parseSidebarNodePath,
  pathHasPrefix,
  renumberSourceImages,
  syncPackageNameFromWorkTitle,
  toDeterministicCoverColor,
} from './utils'
import { MOCK_LIBRARY_SNAPSHOT_REF, type MockRepositoryState } from './types'

function normalizeMockPath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/\/+/g, '/').trim()
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized
}

function basenameMockPath(value: string): string {
  const normalized = normalizeMockPath(value)
  const segments = normalized.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? normalized
}

function extnameMockPath(value: string): string {
  const fileName = basenameMockPath(value)
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) {
    return ''
  }
  return fileName.slice(dotIndex).toLowerCase()
}

function joinMockPath(basePath: string, childName: string): string {
  const normalizedBase = normalizeMockPath(basePath)
  return `${normalizedBase}/${childName}`
}

function relativeMockPath(rootPath: string, candidatePath: string): string {
  const normalizedRoot = normalizeMockPath(rootPath)
  const normalizedCandidate = normalizeMockPath(candidatePath)
  if (normalizedCandidate === normalizedRoot) {
    return ''
  }
  if (normalizedCandidate.startsWith(`${normalizedRoot}/`)) {
    return normalizedCandidate.slice(normalizedRoot.length + 1)
  }
  return normalizedCandidate
}

export class MockMediaWriteHandlers {
  private readonly state: MockRepositoryState

  constructor(state: MockRepositoryState) {
    this.state = state
  }

  writePackageGradeSync(
    request: WritePackageGradeRequestDto,
  ): WritePackageGradeResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`mock 仓库写入评分失败：source 不存在 ${request.package_id}`)
    }

    source.mock_grade = request.grade
    return writePackageGradeResponseSchema.parse({
      package_id: request.package_id,
      grade: request.grade,
      updated_at_ms: Date.now(),
    })
  }

  setImageHiddenSync(
    request: SetImageHiddenRequestDto,
  ): SetImageHiddenResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const targetImageIds = new Set(request.image_ids)
    const touchedImageIds = new Set<string>()

    for (const source of allSources) {
      for (const image of source.images) {
        if (!targetImageIds.has(image.id)) {
          continue
        }
        image.hidden = request.hidden
        touchedImageIds.add(image.id)
      }
    }

    return setImageHiddenResponseSchema.parse({
      updated_count: touchedImageIds.size,
      updated_at_ms: Date.now(),
    })
  }

  deleteImageItemsSync(
    request: DeleteImageItemsRequestDto,
  ): DeleteImageItemsResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const targetImageIds = new Set(request.image_ids)
    const deletedImageIds = new Set<string>()

    for (const source of allSources) {
      const nextImages = source.images.filter((image) => {
        if (!targetImageIds.has(image.id)) {
          return true
        }
        deletedImageIds.add(image.id)
        return false
      })

      if (nextImages.length !== source.images.length) {
        source.images = nextImages
        renumberSourceImages(source)
      }
    }

    const failed = request.image_ids
      .filter((imageId) => !deletedImageIds.has(imageId))
      .map((imageId) => ({
        image_id: imageId,
        reason: 'image not found',
      }))

    return deleteImageItemsResponseSchema.parse({
      deleted_count: deletedImageIds.size,
      failed,
      updated_at_ms: Date.now(),
    })
  }

  deleteSidebarNodesSync(
    request: DeleteSidebarNodesRequestDto,
  ): DeleteSidebarNodesResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const parsedTargets = request.node_ids.map((nodeId) => {
      const parsed = parseSidebarNodePath(nodeId)
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

    const matchesTarget = (pathKey: string, kind: 'package' | 'directory' | 'video') => {
      for (const target of validTargets) {
        const parsed = target.parsed
        if (!parsed) {
          continue
        }

        if (parsed.kind === 'folder') {
          if (pathHasPrefix(pathKey, parsed.pathKey)) {
            target.matched = true
            return true
          }
          continue
        }

        if (parsed.kind === 'package' && kind === 'package' && pathKey === parsed.pathKey) {
          target.matched = true
          return true
        }

        if (parsed.kind === 'video' && kind === 'video' && pathKey === parsed.pathKey) {
          target.matched = true
          return true
        }
      }

      return false
    }

    const prevPackageCount = snapshot.image_packages.length
    const prevDirectoryCount = snapshot.image_directories.length
    const prevVideoCount = snapshot.videos.length

    snapshot.image_packages = snapshot.image_packages.filter((source) => {
      const pathKey = normalizePathKeyForMatch(source.tree_path)
      return !matchesTarget(pathKey, 'package')
    })

    snapshot.image_directories = snapshot.image_directories.filter((source) => {
      const pathKey = normalizePathKeyForMatch(source.tree_path)
      return !matchesTarget(pathKey, 'directory')
    })

    snapshot.videos = snapshot.videos.filter((video) => {
      const pathKey = normalizePathKeyForMatch(video.tree_path)
      return !matchesTarget(pathKey, 'video')
    })

    const remainingVideoIds = new Set(snapshot.videos.map((video) => video.id))
    this.state.playlistIds = this.state.playlistIds.filter((videoId) => remainingVideoIds.has(videoId))

    for (const target of validTargets) {
      if (target.matched) {
        continue
      }
      failed.push({
        node_id: target.nodeId,
        reason: 'node not found',
      })
    }

    const deletedCount =
      (prevPackageCount - snapshot.image_packages.length) +
      (prevDirectoryCount - snapshot.image_directories.length) +
      (prevVideoCount - snapshot.videos.length)

    return deleteSidebarNodesResponseSchema.parse({
      deleted_count: Math.max(0, deletedCount),
      failed,
      updated_at_ms: Date.now(),
    })
  }

  moveSidebarNodesSync(
    request: MoveSidebarNodesRequestDto,
  ): MoveSidebarNodesResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const normalizePathKey = (value: string): string => normalizeMockPath(value).toLowerCase()
    const isPathInside = (rootPath: string, candidatePath: string): boolean => {
      const normalizedRoot = normalizePathKey(rootPath)
      const normalizedCandidate = normalizePathKey(candidatePath)
      return normalizedCandidate === normalizedRoot || normalizedCandidate.startsWith(`${normalizedRoot}/`)
    }
    const toTreePath = (absolutePath: string): string[] => {
      const normalized = normalizeMockPath(absolutePath)
      return normalized.split('/').filter(Boolean)
    }

    const destinationRoot = normalizeMockPath(request.destination_directory)
    const groupName = request.group_name?.trim() ?? ''
    const targetDirectory = groupName.length > 0
      ? joinMockPath(destinationRoot, groupName)
      : destinationRoot

    const parsedTargets = request.node_ids.map((nodeId) => {
      const parsed = parseSidebarNodePath(nodeId)
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

    const selectedPaths = new Set<string>()
    const nodeIdsBySelectedPath = new Map<string, Set<string>>()
    const rememberSelectedPath = (absolutePath: string, nodeId: string) => {
      const resolvedPath = normalizeMockPath(absolutePath)
      selectedPaths.add(resolvedPath)
      const nodeIds = nodeIdsBySelectedPath.get(resolvedPath) ?? new Set<string>()
      nodeIds.add(nodeId)
      nodeIdsBySelectedPath.set(resolvedPath, nodeIds)
    }

    for (const target of validTargets) {
      if (!target.parsed || target.parsed.kind !== 'folder') {
        continue
      }
      rememberSelectedPath(target.parsed.pathKey, target.nodeId)
      target.matched = true
    }

    const markMatchedAndSelect = (
      pathKey: string,
      kind: 'package' | 'directory' | 'video',
      absolutePath: string,
    ): boolean => {
      for (const target of validTargets) {
        const parsed = target.parsed
        if (!parsed) {
          continue
        }

        if (parsed.kind === 'folder') {
          if (pathHasPrefix(pathKey, parsed.pathKey)) {
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
      }

      return false
    }

    for (const source of snapshot.image_packages) {
      markMatchedAndSelect(normalizePathKeyForMatch(source.tree_path), 'package', source.absolute_path)
    }
    for (const source of snapshot.image_directories) {
      markMatchedAndSelect(normalizePathKeyForMatch(source.tree_path), 'directory', source.absolute_path)
    }
    for (const video of snapshot.videos) {
      markMatchedAndSelect(normalizePathKeyForMatch(video.tree_path), 'video', video.absolute_path)
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
      if (prunedPaths.some((existingPath) => isPathInside(existingPath, candidatePath))) {
        continue
      }
      prunedPaths.push(candidatePath)
    }

    const occupiedPathKeys = new Set<string>([
      ...snapshot.image_packages.map((source) => normalizePathKey(source.absolute_path)),
      ...snapshot.image_directories.map((source) => normalizePathKey(source.absolute_path)),
      ...snapshot.videos.map((video) => normalizePathKey(video.absolute_path)),
      ...(snapshot.audios ?? []).map((audio) => normalizePathKey(audio.absolute_path)),
    ])

    const movedMappings: Array<{ fromPath: string; toPath: string }> = []
    for (const absolutePath of prunedPaths) {
      const nodeIds = nodeIdsBySelectedPath.get(absolutePath) ?? new Set<string>()
      const toPath = joinMockPath(targetDirectory, basenameMockPath(absolutePath))
      const sourceKey = normalizePathKey(absolutePath)
      const targetKey = normalizePathKey(toPath)

      if (sourceKey === targetKey) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: 'source already in destination',
          })
        }
        continue
      }

      const conflictWithSnapshot = occupiedPathKeys.has(targetKey) &&
        !prunedPaths.some((candidatePath) => normalizePathKey(candidatePath) === targetKey)
      const conflictWithBatch = movedMappings.some((mapping) => normalizePathKey(mapping.toPath) === targetKey)
      if (conflictWithSnapshot || conflictWithBatch) {
        for (const nodeId of nodeIds) {
          failed.push({
            node_id: nodeId,
            reason: 'destination already exists',
          })
        }
        continue
      }

      movedMappings.push({
        fromPath: absolutePath,
        toPath,
      })
      occupiedPathKeys.delete(sourceKey)
      occupiedPathKeys.add(targetKey)
    }

    const resolveMovedPath = (candidatePath: string): string | null => {
      const resolvedCandidate = normalizeMockPath(candidatePath)
      for (const mapping of movedMappings) {
        if (normalizePathKey(mapping.fromPath) === normalizePathKey(resolvedCandidate)) {
          return mapping.toPath
        }
        if (isPathInside(mapping.fromPath, resolvedCandidate)) {
          const relativePath = relativeMockPath(mapping.fromPath, resolvedCandidate)
          return relativePath.length > 0 ? joinMockPath(mapping.toPath, relativePath) : mapping.toPath
        }
      }
      return null
    }

    if (movedMappings.length > 0) {
      const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
      for (const source of allSources) {
        const movedPath = resolveMovedPath(source.absolute_path)
        if (movedPath) {
          source.absolute_path = movedPath
          source.tree_path = toTreePath(movedPath)
        }

        for (const image of source.images) {
          if (image.media_locator.kind === 'filesystem') {
            const movedImagePath = resolveMovedPath(image.media_locator.absolute_path)
            if (movedImagePath) {
              image.media_locator.absolute_path = movedImagePath
            }
          } else {
            const movedArchivePath = resolveMovedPath(image.media_locator.archive_path)
            if (movedArchivePath) {
              image.media_locator.archive_path = movedArchivePath
            }
          }
        }
      }

      for (const video of snapshot.videos) {
        const movedPath = resolveMovedPath(video.absolute_path)
        if (!movedPath) {
          continue
        }
        video.absolute_path = movedPath
        video.tree_path = toTreePath(movedPath)
        if (video.media_locator.kind === 'filesystem') {
          video.media_locator.absolute_path = movedPath
        }
      }

      for (const audio of snapshot.audios ?? []) {
        const movedPath = resolveMovedPath(audio.absolute_path)
        if (!movedPath) {
          continue
        }
        audio.absolute_path = movedPath
        audio.tree_path = toTreePath(movedPath)
        if (audio.media_locator.kind === 'filesystem') {
          audio.media_locator.absolute_path = movedPath
        }
      }
    }

    return moveSidebarNodesResponseSchema.parse({
      moved_count: movedMappings.length,
      failed,
      target_directory: targetDirectory,
      updated_at_ms: Date.now(),
    })
  }

  renameSidebarNodeSync(
    request: RenameSidebarNodeRequestDto,
  ): RenameSidebarNodeResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const parsedTarget = parseSidebarNodePath(request.node_id)
    if (!parsedTarget) {
      return renameSidebarNodeResponseSchema.parse({
        renamed_count: 0,
        failed: [{ node_id: request.node_id, reason: 'invalid node id' }],
        target_path: null,
        updated_at_ms: Date.now(),
      })
    }

    const normalizedName = request.new_name.trim()
    if (!normalizedName) {
      return renameSidebarNodeResponseSchema.parse({
        renamed_count: 0,
        failed: [{ node_id: request.node_id, reason: 'empty target name' }],
        target_path: null,
        updated_at_ms: Date.now(),
      })
    }

    const toComparablePathKey = (pathValue: string): string =>
      normalizePathKeyForMatch(normalizeMockPath(pathValue).split('/').filter(Boolean))

    const resolveMatchedPath = (): { path: string; isFile: boolean } | null => {
      if (parsedTarget.kind === 'folder') {
        return {
          path: parsedTarget.pathKey,
          isFile: false,
        }
      }

      const targetPathKey = toComparablePathKey(parsedTarget.pathKey)
      const isMatched = (candidatePathKey: string) =>
        toComparablePathKey(candidatePathKey) === targetPathKey

      if (parsedTarget.kind === 'package') {
        const source = [...snapshot.image_packages, ...snapshot.image_directories].find((item) =>
          isMatched(item.tree_path.join('/')),
        )
        if (!source) {
          return null
        }
        const isFile = snapshot.image_packages.some((item) => item.id === source.id)
        return {
          path: source.absolute_path,
          isFile,
        }
      }

      if (parsedTarget.kind === 'video') {
        const video = snapshot.videos.find((item) => isMatched(item.tree_path.join('/')))
        if (!video) {
          return null
        }
        return {
          path: video.absolute_path,
          isFile: true,
        }
      }

      return null
    }

    const matchedPath = resolveMatchedPath()
    if (!matchedPath) {
      return renameSidebarNodeResponseSchema.parse({
        renamed_count: 0,
        failed: [{ node_id: request.node_id, reason: 'node not found' }],
        target_path: null,
        updated_at_ms: Date.now(),
      })
    }

    const fromPath = matchedPath.path
    let normalizedTargetName = normalizedName
    if (matchedPath.isFile) {
      const sourceExtension = extnameMockPath(fromPath)
      if (sourceExtension) {
        if (!normalizedTargetName.toLowerCase().endsWith(sourceExtension)) {
          normalizedTargetName = `${normalizedTargetName}${sourceExtension}`
        }
      }
    }

    const fromDir = normalizeMockPath(fromPath).split('/').slice(0, -1).join('/')
    const toPath = joinMockPath(fromDir, normalizedTargetName)

    if (toComparablePathKey(toPath) === toComparablePathKey(fromPath)) {
      return renameSidebarNodeResponseSchema.parse({
        renamed_count: 0,
        failed: [{ node_id: request.node_id, reason: 'source equals target' }],
        target_path: null,
        updated_at_ms: Date.now(),
      })
    }

    const movedMappings = [{ fromPath, toPath }]
    const movedPathByFromPath = new Map<string, string>([[toComparablePathKey(fromPath), toPath]])
    const resolveMovedPath = (candidatePath: string): string | null => {
      const normalizedCandidate = toComparablePathKey(candidatePath)
      const direct = movedPathByFromPath.get(normalizedCandidate)
      if (direct) {
        return direct
      }

      for (const mapping of movedMappings) {
        const normalizedFromPath = toComparablePathKey(mapping.fromPath)
        if (!pathHasPrefix(normalizedCandidate, normalizedFromPath)) {
          continue
        }
        const relativePath = relativeMockPath(mapping.fromPath, candidatePath)
        if (!relativePath) {
          return mapping.toPath
        }
        return joinMockPath(mapping.toPath, relativePath)
      }
      return null
    }

    const updateSourcePath = (source: { absolute_path: string; tree_path: string[]; images?: Array<{ media_locator: { kind: string; absolute_path?: string; archive_path?: string } }> }) => {
      const movedPath = resolveMovedPath(source.absolute_path)
      if (!movedPath) {
        return
      }

      source.absolute_path = movedPath
      source.tree_path = movedPath.split('/').filter(Boolean)
      if (source.images) {
        for (const image of source.images) {
          if (image.media_locator.kind === 'filesystem') {
            image.media_locator.absolute_path = resolveMovedPath(image.media_locator.absolute_path ?? '') ?? image.media_locator.absolute_path
            continue
          }
          if (image.media_locator.kind === 'archive-entry') {
            image.media_locator.archive_path = resolveMovedPath(image.media_locator.archive_path ?? '') ?? image.media_locator.archive_path
          }
        }
      }
    }

    for (const source of snapshot.image_packages) {
      updateSourcePath(source)
    }
    for (const source of snapshot.image_directories) {
      updateSourcePath(source)
    }
    for (const video of snapshot.videos) {
      const movedPath = resolveMovedPath(video.absolute_path)
      if (!movedPath) {
        continue
      }
      video.absolute_path = movedPath
      video.tree_path = movedPath.split('/').filter(Boolean)
      if (video.media_locator.kind === 'filesystem') {
        video.media_locator.absolute_path = movedPath
      }
    }

    return renameSidebarNodeResponseSchema.parse({
      renamed_count: 1,
      failed: [],
      target_path: toPath,
      updated_at_ms: Date.now(),
    })
  }

  renameSidebarNodesSync(
    request: RenameSidebarNodesRequestDto,
  ): RenameSidebarNodesResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const normalizedNodeIds = Array.from(new Set(request.node_ids.map((value) => value.trim()).filter(Boolean)))
    const failed: Array<{ node_id: string; reason: string }> = []
    const results: RenameSidebarNodesResponseDto['results'] = []
    const previewOnly = request.preview_only ?? false

    const getNodeLabel = (nodeId: string): string => {
      const parsed = parseSidebarNodePath(nodeId)
      if (!parsed) {
        return 'unknown'
      }
      const targetPathKey = normalizePathKeyForMatch(parsed.pathKey.split('/').filter(Boolean))
      if (parsed.kind === 'package') {
        const source = [...snapshot.image_packages, ...snapshot.image_directories].find(
          (item) => normalizePathKeyForMatch(item.tree_path) === targetPathKey,
        )
        return source?.display_name ?? basenameMockPath(parsed.pathKey)
      }
      if (parsed.kind === 'video') {
        const video = snapshot.videos.find((item) => normalizePathKeyForMatch(item.tree_path) === targetPathKey)
        return video?.file_name ?? basenameMockPath(parsed.pathKey)
      }
      if (parsed.kind === 'audio') {
        const audio = (snapshot.audios ?? []).find((item) => normalizePathKeyForMatch(item.tree_path) === targetPathKey)
        return audio?.file_name ?? basenameMockPath(parsed.pathKey)
      }
      return basenameMockPath(parsed.pathKey)
    }

    if (previewOnly) {
      for (const nodeId of normalizedNodeIds) {
        const sourceName = getNodeLabel(nodeId)
        results.push({
          node_id: nodeId,
          source_name: sourceName,
          target_name: sourceName,
          source_path: sourceName,
          target_path: sourceName,
          applied: false,
          reason: null,
        })
      }
      return renameSidebarNodesResponseSchema.parse({
        renamed_count: 0,
        failed,
        preview_only: true,
        results,
        updated_at_ms: Date.now(),
      })
    }

    for (const nodeId of normalizedNodeIds) {
      const sourceName = getNodeLabel(nodeId)
      results.push({
        node_id: nodeId,
        source_name: sourceName,
        target_name: sourceName,
        source_path: sourceName,
        target_path: sourceName,
        applied: true,
        reason: null,
      })
    }

    return renameSidebarNodesResponseSchema.parse({
      renamed_count: normalizedNodeIds.length,
      failed,
      preview_only: false,
      results,
      updated_at_ms: Date.now(),
    })
  }

  renameItemsSync(
    request: RenameItemsRequestDto,
  ): RenameItemsResponseDto {
    const toSidebarRequest = {
      node_ids: request.targets
        .filter((target) => target.kind === 'sidebar-node')
        .map((target) => target.node_id),
      mode: request.mode === 'single' ? 'replace' : request.mode,
      preview_only: request.preview_only,
      fail_fast: request.fail_fast,
      replace_from: request.replace_from,
      replace_to: request.replace_to,
      numbering_base_name: request.numbering_base_name,
      numbering_start: request.numbering_start,
      numbering_step: request.numbering_step,
      numbering_pad_width: request.numbering_pad_width,
      remove_start: request.remove_start,
      remove_end: request.remove_end,
      remove_head: request.remove_head,
      remove_tail: request.remove_tail,
    }

    const sidebarResponse = this.renameSidebarNodesSync(toSidebarRequest)
    return {
      renamed_count: sidebarResponse.renamed_count,
      failed: sidebarResponse.failed.map((item) => ({
        target: {
          kind: 'sidebar-node',
          node_id: item.node_id,
        },
        reason: item.reason,
      })),
      preview_only: sidebarResponse.preview_only,
      results: sidebarResponse.results.map((item) => ({
        target: {
          kind: 'sidebar-node',
          node_id: item.node_id,
        },
        source_name: item.source_name,
        target_name: item.target_name,
        source_path: item.source_path,
        target_path: item.target_path,
        applied: item.applied,
        reason: item.reason,
      })),
      updated_at_ms: sidebarResponse.updated_at_ms,
    }
  }

  writePackageMetadataSync(
    request: WritePackageMetadataRequestDto,
  ): WritePackageMetadataResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`mock 仓库写入元数据失败：source 不存在 ${request.package_id}`)
    }

    const workTitle = normalizeTextValue(request.work_title, source.work_title)
    source.work_title = workTitle
    source.series_id = (request.series_id ?? source.series_id ?? '').trim()
    source.circle = normalizeTextValue(request.circle, source.circle)
    source.author = normalizeTextValue(request.author, source.author)
    source.tags = normalizeTags(request.tags)

    if (request.sync_work_title_to_package_name) {
      const synced = syncPackageNameFromWorkTitle(source, workTitle)
      source.package_name = synced.packageName
      source.display_name = synced.displayName
    }

    return writePackageMetadataResponseSchema.parse({
      package: source,
      updated_at_ms: Date.now(),
    })
  }

  writePackageExternalMetadataSync(
    request: WritePackageExternalMetadataRequestDto,
  ): WritePackageExternalMetadataResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const allSources = [...snapshot.image_packages, ...snapshot.image_directories]
    const source = allSources.find((item) => item.id === request.package_id)
    if (!source) {
      throw new Error(`mock 仓库写入外部元数据失败：source 不存在 ${request.package_id}`)
    }

    source.external_metadata = {
      source_site: request.source_site,
      source_url: request.source_url,
      source_remote_id: request.source_remote_id,
      source_token: request.source_token?.trim() ?? '',
      title: request.title?.trim() ?? '',
      title_jpn: request.title_jpn?.trim() ?? '',
      group_name: request.group_name?.trim() ?? '',
      group_name_jpn: request.group_name_jpn?.trim() ?? '',
      artist: request.artist?.trim() ?? '',
      artist_jpn: request.artist_jpn?.trim() ?? '',
      posted: request.posted?.trim() ?? '',
      rating: request.rating ?? null,
      favorited: request.favorited ?? null,
      tags: request.tags,
      raw_json: request.raw_json,
    }

    return writePackageExternalMetadataResponseSchema.parse({
      package: source,
      updated_at_ms: Date.now(),
    })
  }

  writeVideoMetadataSync(
    request: WriteVideoMetadataRequestDto,
  ): WriteVideoMetadataResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const video = snapshot.videos.find((item) => item.id === request.video_id)
    if (!video) {
      throw new Error(`mock 仓库写入视频元数据失败：video 不存在 ${request.video_id}`)
    }

    const nextWorkTitle = request.sync_file_name_to_work_title
      ? deriveWorkTitleFromFileName(video.file_name)
      : normalizeTextValue(request.work_title, video.work_title)

    video.work_title = nextWorkTitle
    video.work_title_jpn = (request.work_title_jpn ?? video.work_title_jpn ?? '').trim()
    video.series_id = (request.series_id ?? video.series_id ?? '').trim()
    video.circle = normalizeTextValue(request.circle, video.circle)
    video.circle_jpn = (request.circle_jpn ?? video.circle_jpn ?? '').trim()
    video.author = normalizeTextValue(request.author, video.author)
    video.author_jpn = (request.author_jpn ?? video.author_jpn ?? '').trim()
    video.tags = normalizeTags(request.tags)
    if (typeof request.grade !== 'undefined') {
      video.grade = request.grade
    }

    return writeVideoMetadataResponseSchema.parse({
      video,
      updated_at_ms: Date.now(),
    })
  }

  writeAudioMetadataSync(
    request: WriteAudioMetadataRequestDto,
  ): WriteAudioMetadataResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const audio = snapshot.audios?.find((item) => item.id === request.audio_id)
    if (!audio) {
      throw new Error(`mock 仓库写入音频元数据失败：audio 不存在 ${request.audio_id}`)
    }

    if (typeof request.album !== 'undefined') {
      audio.album = request.album.trim()
    }
    if (typeof request.author !== 'undefined') {
      audio.author = request.author.trim()
    }
    if (typeof request.track_title !== 'undefined') {
      audio.track_title = request.track_title.trim()
    }
    if (typeof request.series_id !== 'undefined') {
      audio.series_id = request.series_id.trim()
    }

    return writeAudioMetadataResponseSchema.parse({
      audio,
      updated_at_ms: Date.now(),
    })
  }

  saveVideoCoverSync(
    request: SaveVideoCoverRequestDto,
  ): SaveVideoCoverResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const video = snapshot.videos.find((item) => item.id === request.video_id)
    if (!video) {
      throw new Error(`mock 仓库保存封面失败：video 不存在 ${request.video_id}`)
    }

    const coverColor = request.fallback_color ?? video.cover_color ?? toDeterministicCoverColor(request.video_id)
    video.cover_color = coverColor

    return saveVideoCoverResponseSchema.parse({
      video_id: request.video_id,
      cover_color: coverColor,
      cover_image_path: null,
      updated_at_ms: Date.now(),
    })
  }

  writePlaylistSync(request: WritePlaylistRequestDto): WritePlaylistResponseDto {
    const snapshot = MOCK_LIBRARY_SNAPSHOT_REF.current
    if (!snapshot) throw new Error('Mock snapshot not initialized')

    const validVideoIds = new Set(snapshot.videos.map((video) => video.id))
    this.state.playlistIds = Array.from(new Set(request.video_ids)).filter((id) => validVideoIds.has(id))
    return writePlaylistResponseSchema.parse({
      video_ids: this.state.playlistIds,
      updated_at_ms: Date.now(),
    })
  }

  enqueueImportTaskSync(request: EnqueueImportTaskRequestDto): EnqueueImportTaskResponseDto {
    const now = Date.now()
    const task: ImportTaskDto = {
      task_id: `mock-import-${now}-${Math.round(Math.random() * 10_000)}`,
      task_type: 'import',
      source: request.source,
      paths: request.paths,
      status: 'completed',
      progress: 1,
      processed_count: request.paths.length,
      total_count: request.paths.length,
      message: 'mock import completed',
      error_detail: null,
      created_at_ms: now,
      updated_at_ms: now,
    }

    this.state.importTasks = [task, ...this.state.importTasks]
    return enqueueImportTaskResponseSchema.parse({ task })
  }

  retryImportTaskSync(request: RetryImportTaskRequestDto): RetryImportTaskResponseDto {
    const found = this.state.importTasks.find((task) => task.task_id === request.task_id)
    if (!found) {
      throw new Error(`mock 导入重试失败：task 不存在 ${request.task_id}`)
    }

    const updated: ImportTaskDto = {
      ...found,
      status: 'completed',
      progress: 1,
      processed_count: Math.max(found.processed_count, found.total_count),
      message: 'mock import retried',
      error_detail: null,
      updated_at_ms: Date.now(),
    }

    this.state.importTasks = this.state.importTasks.map((task) => (task.task_id === request.task_id ? updated : task))
    return retryImportTaskResponseSchema.parse({ task: updated })
  }

  clearDatabaseSync(): ClearDatabaseResponseDto {
    this.state.playlistIds = []
    this.state.importTasks = []
    this.state.manageAdReviewTasks.clear()

    return clearDatabaseResponseSchema.parse({
      cleared: true,
      cleared_at_ms: Date.now(),
    })
  }
}
