import os from 'node:os'
import path from 'node:path'
import { promises as fs } from 'node:fs'

import { afterEach, describe, expect, it, vi } from 'vitest'

import type { LibrarySnapshotDto } from '../../../src/contracts/backend'
import type { MediaAccessGuardContext } from '../../fileSystemMediaAccessGuard'
import { writeStoredZipFromEntries } from '../../fileSystemZipStoreWriter'
import { MediaLibraryDatabase } from '../../mediaLibraryDatabase'
import { createImageSourceFixture, createVideoFixture } from '../../test-utils/mediaLibraryFixtures'
import { scanZipCentralEntries } from '../../zipArchiveHelpers'
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

const ONE_PIXEL_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5XKx8AAAAASUVORK5CYII='

async function writeTinyPng(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64'))
}

function createServiceHarness(rootDir: string, snapshot: LibrarySnapshotDto) {
  const database = {
    moveSnapshotEntriesByPaths: vi.fn(),
    renameImageArchiveEntries: vi.fn(),
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

describe('ManagementMutationService.renameItems', () => {
  const tempRoots: string[] = []

  afterEach(async () => {
    vi.restoreAllMocks()
    await Promise.all(tempRoots.map((rootDir) => fs.rm(rootDir, { recursive: true, force: true })))
    tempRoots.length = 0
  })

  it('应支持 image-item 的 preview-only 与 metadata 模板预览', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-rename-items-preview-'))
    tempRoots.push(rootDir)

    const sourcePath = path.join(rootDir, 'pkg', 'sample.zip')
    await ensureFile(sourcePath)
    const snapshot = createSnapshotForPackages([sourcePath])
    snapshot.image_packages[0].author = 'AuthorEn'
    snapshot.image_packages[0].circle = 'CircleEn'
    snapshot.image_packages[0].work_title = 'TitleEn'
    snapshot.image_packages[0].external_metadata = {
      source_site: 'others',
      source_url: 'https://example.com',
      source_remote_id: '1',
      source_token: '',
      title: 'TitleEn',
      title_jpn: 'TitleJp',
      group_name: 'CircleEn',
      group_name_jpn: 'CircleJp',
      artist: 'AuthorEn',
      artist_jpn: 'AuthorJp',
      posted: '',
      rating: null,
      favorited: null,
      tags: {},
      raw_json: '{}',
    }
    const imageId = snapshot.image_packages[0].images[0].id
    const harness = createServiceHarness(rootDir, snapshot)

    const response = await harness.service.renameItems({
      targets: [{ kind: 'image-item', image_id: imageId }],
      mode: 'metadata',
      metadata_template:
        '[author.jp(if exist)(author.en(if exist))]/[author(if only one exist)]-[circle just like author ] - [title.jp(if exist)]/[title(if only one exist)]',
      fail_fast: true,
      preview_only: true,
    })

    expect(response.preview_only).toBe(true)
    expect(response.renamed_count).toBe(0)
    expect(response.failed).toEqual([])
    expect(response.results).toHaveLength(1)
    expect(response.results[0].target_name).toBe('AuthorJp(AuthorEn)-CircleJp(CircleEn) - TitleJp.jpg')
    expect(harness.database.moveSnapshotEntriesByPaths).not.toHaveBeenCalled()
    expect(harness.database.renameImageArchiveEntries).not.toHaveBeenCalled()
  })

  it('应支持 archive-entry 改名并回写 zip 与数据库映射', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-rename-items-zip-'))
    tempRoots.push(rootDir)

    const archivePath = path.join(rootDir, 'pkg', 'archive.zip')
    await writeStoredZipFromEntries(archivePath, [
      { entryName: '01.jpg', content: Buffer.from('a') },
      { entryName: '02.jpg', content: Buffer.from('b') },
    ])

    const snapshot = createSnapshotForPackages([archivePath])
    snapshot.image_packages[0].images[0].media_locator = {
      kind: 'archive-entry',
      archive_path: archivePath,
      archive_format: 'zip',
      entry_name: '01.jpg',
      extension: '.jpg',
      media_type: 'image',
      mime_type: 'image/jpeg',
    }

    const harness = createServiceHarness(rootDir, snapshot)

    const response = await harness.service.renameItems({
      targets: [{ kind: 'archive-entry', archive_path: archivePath, entry_name: '01.jpg' }],
      mode: 'single',
      single_new_name: 'renamed-01',
      fail_fast: true,
      preview_only: false,
    })

    expect(response.failed).toEqual([])
    expect(response.renamed_count).toBe(1)
    expect(harness.database.renameImageArchiveEntries).toHaveBeenCalledWith([
      {
        archivePath: path.resolve(archivePath),
        fromEntryName: '01.jpg',
        toEntryName: 'renamed-01.jpg',
      },
    ])

    const entries = await scanZipCentralEntries(archivePath)
    const names = entries.map((entry) => entry.entryName).sort()
    expect(names).toEqual(['02.jpg', 'renamed-01.jpg'])
  })

  it('fail_fast 开启时命中重名冲突应中断并不落盘', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-rename-items-failfast-'))
    tempRoots.push(rootDir)

    const sourcePathA = path.join(rootDir, 'source', 'a.zip')
    const sourcePathB = path.join(rootDir, 'source', 'b.zip')
    await ensureFile(sourcePathA)
    await ensureFile(sourcePathB)

    const snapshot = createSnapshotForPackages([sourcePathA, sourcePathB])
    const harness = createServiceHarness(rootDir, snapshot)

    const response = await harness.service.renameItems({
      targets: [
        { kind: 'sidebar-node', node_id: 'package:a.zip' },
        { kind: 'sidebar-node', node_id: 'package:b.zip' },
      ],
      mode: 'single',
      single_new_name: 'same',
      fail_fast: true,
      preview_only: false,
    })

    expect(response.renamed_count).toBe(0)
    expect(response.failed.length).toBeGreaterThan(0)
    expect(response.failed[0]?.reason).toContain('duplicate destination in batch')
    expect(harness.database.moveSnapshotEntriesByPaths).not.toHaveBeenCalled()
  })

  it('archive-entry 非图片扩展名应拒绝重命名', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-rename-items-non-image-'))
    tempRoots.push(rootDir)

    const archivePath = path.join(rootDir, 'pkg', 'archive.zip')
    await writeStoredZipFromEntries(archivePath, [
      { entryName: 'note.txt', content: Buffer.from('hello') },
    ])

    const snapshot = createSnapshotForPackages([archivePath])
    const harness = createServiceHarness(rootDir, snapshot)

    const response = await harness.service.renameItems({
      targets: [{ kind: 'archive-entry', archive_path: archivePath, entry_name: 'note.txt' }],
      mode: 'single',
      single_new_name: 'note-renamed',
      fail_fast: true,
      preview_only: false,
    })

    expect(response.renamed_count).toBe(0)
    expect(response.failed.length).toBe(1)
    expect(response.failed[0]?.reason).toContain('archive entry is not image')
    expect(harness.database.renameImageArchiveEntries).not.toHaveBeenCalled()

    const entries = await scanZipCentralEntries(archivePath)
    expect(entries.map((entry) => entry.entryName)).toEqual(['note.txt'])
  })
})

describe('ManagementMutationService.runImageConvertTask', () => {
  const tempRoots: string[] = []

  afterEach(async () => {
    vi.restoreAllMocks()
    await Promise.all(tempRoots.map((rootDir) => fs.rm(rootDir, { recursive: true, force: true })))
    tempRoots.length = 0
  })

  it('目录目标重名冲突时应失败并保持源文件与目标文件不变', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-image-convert-dir-collision-'))
    tempRoots.push(rootDir)

    const sourcePath = path.join(rootDir, 'gallery', 'page-01.jpg')
    const destinationPath = path.join(rootDir, 'gallery', 'page-01.webp')
    await writeTinyPng(sourcePath)
    await fs.writeFile(destinationPath, Buffer.from('existing-target'))

    const source = createImageSourceFixture({
      sourceId: 'dir-1',
      packageName: 'gallery',
      absolutePath: path.join(rootDir, 'gallery'),
      sourceType: 'directory',
    })
    source.tree_path = ['gallery']
    source.images = [
      {
        ...source.images[0],
        media_locator: {
          kind: 'filesystem',
          absolute_path: sourcePath,
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        },
      },
    ]

    const snapshot: LibrarySnapshotDto = {
      image_packages: [],
      image_directories: [source],
      videos: [],
      audios: [],
    }

    const harness = createServiceHarness(rootDir, snapshot)

    const response = await harness.service.runImageConvertTask({
      node_ids: ['package:gallery'],
      scale_factor: 1,
      target_format: 'webp',
      quality: 80,
      concurrency: 2,
    })

    expect(response.total_count).toBe(1)
    expect(response.processed_count).toBe(1)
    expect(response.success_count).toBe(0)
    expect(response.failed_count).toBe(1)
    expect(response.first_error_detail).toContain('destination already exists')
    expect(harness.emitLibraryChanged).not.toHaveBeenCalled()

    const sourceBuffer = await fs.readFile(sourcePath)
    const destinationBuffer = await fs.readFile(destinationPath)
    expect(sourceBuffer.length).toBeGreaterThan(0)
    expect(destinationBuffer.toString('utf8')).toBe('existing-target')
  })

  it('zip 原子替换失败时应回滚到原始压缩包', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-image-convert-zip-rollback-'))
    tempRoots.push(rootDir)

    const archivePath = path.join(rootDir, 'pkg', 'bundle.zip')
    await writeStoredZipFromEntries(archivePath, [
      { entryName: '01.png', content: Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64') },
      { entryName: '02.png', content: Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64') },
      { entryName: 'note.txt', content: Buffer.from('note', 'utf8') },
    ])

    const source = createImageSourceFixture({
      sourceId: 'pkg-1',
      packageName: 'bundle.zip',
      absolutePath: archivePath,
      sourceType: 'package',
    })
    source.tree_path = ['bundle.zip']
    source.images = [
      {
        ...source.images[0],
        media_locator: {
          kind: 'archive-entry',
          archive_path: archivePath,
          archive_format: 'zip',
          entry_name: '01.png',
          extension: '.png',
          media_type: 'image',
          mime_type: 'image/png',
        },
      },
      {
        ...source.images[1],
        media_locator: {
          kind: 'archive-entry',
          archive_path: archivePath,
          archive_format: 'zip',
          entry_name: '02.png',
          extension: '.png',
          media_type: 'image',
          mime_type: 'image/png',
        },
      },
    ]

    const snapshot: LibrarySnapshotDto = {
      image_packages: [source],
      image_directories: [],
      videos: [],
      audios: [],
    }

    const harness = createServiceHarness(rootDir, snapshot)
    const originalRename = fs.rename.bind(fs)
    vi.spyOn(fs, 'rename').mockImplementation(async (fromPath, toPath) => {
      const from = path.resolve(String(fromPath))
      const to = path.resolve(String(toPath))
      if (from.includes('.mpx-tmp.zip') && to === path.resolve(archivePath)) {
        throw new Error('injected replace failure')
      }
      return originalRename(fromPath, toPath)
    })

    const response = await harness.service.runImageConvertTask({
      node_ids: ['package:bundle.zip'],
      scale_factor: 1,
      target_format: 'webp',
      quality: 80,
      concurrency: 1,
    })

    expect(response.total_count).toBe(2)
    expect(response.success_count).toBe(0)
    expect(response.failed_count).toBe(2)
    expect(response.first_error_detail).toContain('injected replace failure')
    expect(harness.emitLibraryChanged).not.toHaveBeenCalled()

    const entries = await scanZipCentralEntries(archivePath)
    expect(entries.map((entry) => entry.entryName).sort()).toEqual(['01.png', '02.png', 'note.txt'])
  })
})
