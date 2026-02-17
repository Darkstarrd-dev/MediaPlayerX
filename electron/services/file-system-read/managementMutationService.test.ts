import os from 'node:os'
import path from 'node:path'
import { promises as fs } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LibrarySnapshotDto } from '../../../src/contracts/backend'
import type { MediaAccessGuardContext } from '../../fileSystemMediaAccessGuard'
import { MediaLibraryDatabase } from '../../mediaLibraryDatabase'
import { createImageSourceFixture, createVideoFixture } from '../../test-utils/mediaLibraryFixtures'
import { ImportPathRegistry } from './importPathRegistry'
import { ManagementMutationService } from './managementMutationService'

function buildAccessContext(rootDir: string): MediaAccessGuardContext {
  return {
    rootDir,
    importDirectoryRoots: [],
    importFileAllowlistKeys: new Set<string>(),
    archiveEntryIndexByPath: new Map<string, Set<string>>(),
    imageExtensions: new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']),
    videoExtensions: new Set(['.mp4', '.webm', '.mkv']),
    audioExtensions: new Set(['.mp3', '.flac', '.wav']),
    subtitleExtensions: new Set(['.srt', '.vtt']),
  }
}

function createSnapshotForPackages(packagePaths: string[]): LibrarySnapshotDto {
  return {
    image_packages: packagePaths.map((absolutePath, index) =>
      createImageSourceFixture({
        sourceId: `pkg-${index + 1}`,
        packageName: path.basename(absolutePath),
        absolutePath,
        sourceType: 'package',
      }),
    ),
    image_directories: [],
    videos: [],
    audios: [],
  }
}

function createSnapshotForVideos(videoPaths: string[]): LibrarySnapshotDto {
  return {
    image_packages: [],
    image_directories: [],
    videos: videoPaths.map((absolutePath, index) => createVideoFixture(`video-${index + 1}`, absolutePath)),
    audios: [],
  }
}

async function ensureFile(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, Buffer.from('fixture'))
}

function createServiceHarness(rootDir: string, snapshot: LibrarySnapshotDto) {
  const database = {
    moveSnapshotEntriesByPaths: vi.fn(),
  }
  const ensureStateLoaded = vi.fn().mockResolvedValue(undefined)
  const ensureSnapshotLoaded = vi.fn().mockResolvedValue(snapshot)
  const syncSnapshotFromDatabase = vi.fn().mockReturnValue(snapshot)
  const refreshArchiveIndexesForPaths = vi.fn().mockResolvedValue(undefined)
  const pruneArchiveIndexesByDeletedRoots = vi.fn()
  const removeImportSourcePaths = vi.fn().mockResolvedValue(undefined)
  const replaceImportSourcePaths = vi.fn().mockResolvedValue(undefined)
  const emitLibraryChanged = vi.fn()

  const service = new ManagementMutationService({
    rootDir,
    thumbnailCacheRootDir: path.join(rootDir, '.thumb-cache'),
    database: database as unknown as MediaLibraryDatabase,
    importPathRegistry: new ImportPathRegistry(),
    ensureStateLoaded,
    ensureSnapshotLoaded,
    syncSnapshotFromDatabase,
    refreshArchiveIndexesForPaths,
    pruneArchiveIndexesByDeletedRoots,
    removeImportSourcePaths,
    replaceImportSourcePaths,
    buildMediaAccessContext: () => buildAccessContext(rootDir),
    emitLibraryChanged,
  })

  return {
    service,
    database,
    ensureStateLoaded,
    ensureSnapshotLoaded,
    syncSnapshotFromDatabase,
    refreshArchiveIndexesForPaths,
    pruneArchiveIndexesByDeletedRoots,
    removeImportSourcePaths,
    replaceImportSourcePaths,
    emitLibraryChanged,
  }
}

describe('ManagementMutationService.moveSidebarNodes', () => {
  const tempRoots: string[] = []

  afterEach(async () => {
    vi.restoreAllMocks()
    await Promise.all(tempRoots.map((rootDir) => fs.rm(rootDir, { recursive: true, force: true })))
    tempRoots.length = 0
  })

  it('分组目录已存在时应直接报错并且不触发后续写入', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-move-group-exists-'))
    tempRoots.push(rootDir)

    const sourcePath = path.join(rootDir, 'source', 'pkg-a.zip')
    await ensureFile(sourcePath)

    const destinationRootDir = path.join(rootDir, 'destination')
    await fs.mkdir(path.join(destinationRootDir, 'group-a'), { recursive: true })

    const snapshot = createSnapshotForPackages([sourcePath])
    const harness = createServiceHarness(rootDir, snapshot)

    await expect(
      harness.service.moveSidebarNodes({
        node_ids: ['package:pkg-a.zip'],
        destination_directory: destinationRootDir,
        group_name: 'group-a',
      }),
    ).rejects.toThrow(`分组失败：目录已存在 ${path.resolve(destinationRootDir, 'group-a')}`)

    expect(harness.ensureStateLoaded).not.toHaveBeenCalled()
    expect(harness.database.moveSnapshotEntriesByPaths).not.toHaveBeenCalled()
    expect(harness.replaceImportSourcePaths).not.toHaveBeenCalled()
  })

  it('rename 返回 EXDEV 时应回退 copy+remove 并完成快照更新', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-move-exdev-'))
    tempRoots.push(rootDir)

    const sourcePath = path.join(rootDir, 'source', 'pkg-exdev.zip')
    await ensureFile(sourcePath)

    const destinationRootDir = path.join(rootDir, 'destination')
    await fs.mkdir(destinationRootDir, { recursive: true })

    const snapshot = createSnapshotForPackages([sourcePath])
    const harness = createServiceHarness(rootDir, snapshot)

    const targetPath = path.resolve(path.join(destinationRootDir, 'pkg-exdev.zip'))
    const sourceResolved = path.resolve(sourcePath)
    const originalRename = fs.rename.bind(fs)

    vi.spyOn(fs, 'rename').mockImplementation(async (fromPath, toPath) => {
      if (path.resolve(String(fromPath)) === sourceResolved && path.resolve(String(toPath)) === targetPath) {
        const error = new Error('cross-device link not permitted') as NodeJS.ErrnoException
        error.code = 'EXDEV'
        throw error
      }
      return originalRename(fromPath, toPath)
    })

    const response = await harness.service.moveSidebarNodes({
      node_ids: ['package:pkg-exdev.zip'],
      destination_directory: destinationRootDir,
    })

    expect(response.moved_count).toBe(1)
    expect(response.failed).toEqual([])
    expect(response.target_directory).toBe(path.resolve(destinationRootDir))

    await expect(fs.stat(sourcePath)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(fs.stat(targetPath)).resolves.toMatchObject({ isFile: expect.any(Function) })

    const expectedMappings = [{ fromPath: sourceResolved, toPath: targetPath }]
    expect(harness.database.moveSnapshotEntriesByPaths).toHaveBeenCalledWith(expectedMappings)
    expect(harness.pruneArchiveIndexesByDeletedRoots).toHaveBeenCalledWith([sourceResolved])
    expect(harness.refreshArchiveIndexesForPaths).toHaveBeenCalledWith([targetPath])
    expect(harness.replaceImportSourcePaths).toHaveBeenCalledWith(expectedMappings)
    expect(harness.emitLibraryChanged).toHaveBeenCalledWith({
      reason: 'manage-move-sidebar-nodes',
      updated_at_ms: expect.any(Number),
    })
  })

  it('部分节点冲突时应返回部分成功并保留失败明细', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-move-partial-'))
    tempRoots.push(rootDir)

    const sourcePathA = path.join(rootDir, 'source', 'pkg-a.zip')
    const sourcePathB = path.join(rootDir, 'source', 'pkg-b.zip')
    await ensureFile(sourcePathA)
    await ensureFile(sourcePathB)

    const destinationRootDir = path.join(rootDir, 'destination')
    await fs.mkdir(destinationRootDir, { recursive: true })
    await ensureFile(path.join(destinationRootDir, 'pkg-b.zip'))

    const snapshot = createSnapshotForPackages([sourcePathA, sourcePathB])
    const harness = createServiceHarness(rootDir, snapshot)

    const response = await harness.service.moveSidebarNodes({
      node_ids: ['package:pkg-a.zip', 'package:pkg-b.zip'],
      destination_directory: destinationRootDir,
    })

    const movedPathA = path.resolve(path.join(destinationRootDir, 'pkg-a.zip'))
    const sourceResolvedA = path.resolve(sourcePathA)
    const sourceResolvedB = path.resolve(sourcePathB)

    expect(response.moved_count).toBe(1)
    expect(response.failed).toEqual([
      {
        node_id: 'package:pkg-b.zip',
        reason: 'destination already exists',
      },
    ])
    expect(response.target_directory).toBe(path.resolve(destinationRootDir))

    await expect(fs.stat(sourcePathA)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(fs.stat(movedPathA)).resolves.toMatchObject({ isFile: expect.any(Function) })
    await expect(fs.stat(sourcePathB)).resolves.toMatchObject({ isFile: expect.any(Function) })

    expect(harness.database.moveSnapshotEntriesByPaths).toHaveBeenCalledWith([
      { fromPath: sourceResolvedA, toPath: movedPathA },
    ])
    expect(harness.pruneArchiveIndexesByDeletedRoots).toHaveBeenCalledWith([sourceResolvedA])
    expect(harness.refreshArchiveIndexesForPaths).toHaveBeenCalledWith([movedPathA])
    expect(harness.replaceImportSourcePaths).toHaveBeenCalledWith([
      { fromPath: sourceResolvedA, toPath: movedPathA },
    ])
    expect(sourceResolvedB).not.toBe(sourceResolvedA)
  })
})

describe('ManagementMutationService.renameSidebarNode', () => {
  const tempRoots: string[] = []

  afterEach(async () => {
    vi.restoreAllMocks()
    await Promise.all(tempRoots.map((rootDir) => fs.rm(rootDir, { recursive: true, force: true })))
    tempRoots.length = 0
  })

  it('重命名视频文件时未输入扩展名应保留原扩展名', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-rename-video-ext-'))
    tempRoots.push(rootDir)

    const sourcePath = path.join(rootDir, 'videos', 'clip-a.mp4')
    await ensureFile(sourcePath)

    const snapshot = createSnapshotForVideos([sourcePath])
    const harness = createServiceHarness(rootDir, snapshot)

    const response = await harness.service.renameSidebarNode({
      node_id: 'video:clip-a.mp4',
      new_name: 'clip-b',
    })

    const sourceResolved = path.resolve(sourcePath)
    const targetPath = path.resolve(path.join(rootDir, 'videos', 'clip-b.mp4'))
    const expectedMappings = [{ fromPath: sourceResolved, toPath: targetPath }]

    expect(response.renamed_count).toBe(1)
    expect(response.failed).toEqual([])
    expect(response.target_path).toBe(targetPath)

    await expect(fs.stat(sourcePath)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(fs.stat(targetPath)).resolves.toMatchObject({ isFile: expect.any(Function) })

    expect(harness.database.moveSnapshotEntriesByPaths).toHaveBeenCalledWith(expectedMappings)
    expect(harness.pruneArchiveIndexesByDeletedRoots).toHaveBeenCalledWith([sourceResolved])
    expect(harness.refreshArchiveIndexesForPaths).toHaveBeenCalledWith([targetPath])
    expect(harness.replaceImportSourcePaths).toHaveBeenCalledWith(expectedMappings)
    expect(harness.emitLibraryChanged).toHaveBeenCalledWith({
      reason: 'manage-rename-sidebar-node',
      updated_at_ms: expect.any(Number),
    })
  })

  it('重命名视频文件时允许名称包含点号并自动保留原扩展名', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-rename-video-change-ext-'))
    tempRoots.push(rootDir)

    const sourcePath = path.join(rootDir, 'videos', 'clip-a.mp4')
    await ensureFile(sourcePath)

    const snapshot = createSnapshotForVideos([sourcePath])
    const harness = createServiceHarness(rootDir, snapshot)

    const response = await harness.service.renameSidebarNode({
      node_id: 'video:clip-a.mp4',
      new_name: 'clip-b.mkv',
    })

    const sourceResolved = path.resolve(sourcePath)
    const targetPath = path.resolve(path.join(rootDir, 'videos', 'clip-b.mkv.mp4'))
    const expectedMappings = [{ fromPath: sourceResolved, toPath: targetPath }]

    expect(response.renamed_count).toBe(1)
    expect(response.failed).toEqual([])
    expect(response.target_path).toBe(targetPath)

    await expect(fs.stat(sourcePath)).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(fs.stat(targetPath)).resolves.toMatchObject({ isFile: expect.any(Function) })
    expect(harness.database.moveSnapshotEntriesByPaths).toHaveBeenCalledWith(expectedMappings)
    expect(harness.replaceImportSourcePaths).toHaveBeenCalledWith(expectedMappings)
    expect(harness.emitLibraryChanged).toHaveBeenCalledWith({
      reason: 'manage-rename-sidebar-node',
      updated_at_ms: expect.any(Number),
    })
  })
})
