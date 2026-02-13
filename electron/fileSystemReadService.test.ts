import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import { promises as fs } from 'node:fs'

import { afterEach, describe, expect, it } from 'vitest'

import { MEDIA_PROTOCOL_SCHEME } from './channels'
import { FileSystemMediaReadService } from './fileSystemReadService'

const ONE_PIXEL_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO5XKx8AAAAASUVORK5CYII='

async function writeBinary(filePath: string, bytes: number[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, Buffer.from(bytes))
}

async function writeTinyPng(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, Buffer.from(ONE_PIXEL_PNG_BASE64, 'base64'))
}

async function commandExists(command: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const child = spawn(command, ['-version'], { windowsHide: true })
    child.on('error', () => resolve(false))
    child.on('close', (code) => resolve(code === 0))
  })
}

async function createSampleVideo(videoPath: string): Promise<void> {
  await fs.mkdir(path.dirname(videoPath), { recursive: true })
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      'ffmpeg',
      [
        '-y',
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        'color=c=#224466:s=640x360:d=1.2',
        '-f',
        'lavfi',
        '-i',
        'anullsrc=channel_layout=stereo:sample_rate=44100',
        '-shortest',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        videoPath,
      ],
      { windowsHide: true },
    )

    let stderr = ''
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(stderr || `ffmpeg failed: ${code}`))
    })
  })
}

async function waitForImportTaskDone(
  service: FileSystemMediaReadService,
  taskId: string,
  timeoutMs = 15_000,
): Promise<{ task_id: string; status: 'completed' | 'failed'; processed_count: number; total_count: number }> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const snapshot = await service.readImportTasks()
    const task = snapshot.tasks.find((item) => item.task_id === taskId)
    if (task && (task.status === 'completed' || task.status === 'failed')) {
      return {
        task_id: task.task_id,
        status: task.status,
        processed_count: task.processed_count,
        total_count: task.total_count,
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 80))
  }

  throw new Error(`import task timeout: ${taskId}`)
}

async function enqueueImportAndWait(
  service: FileSystemMediaReadService,
  source: 'dialog-files' | 'dialog-folders' | 'drag-drop' | 'paste',
  paths: string[],
): Promise<void> {
  const queued = await service.enqueueImportTask({ source, paths })
  expect(['pending', 'running', 'completed']).toContain(queued.task.status)
  const done = await waitForImportTaskDone(service, queued.task.task_id)
  expect(done.status).toBe('completed')
}

async function writeStoredZip(
  filePath: string,
  entries: Array<{ name: string; content: Buffer }>,
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })

  const localChunks: Buffer[] = []
  const centralChunks: Buffer[] = []
  let cursor = 0

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8')
    const data = entry.content

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0x0800, 6)
    localHeader.writeUInt16LE(0, 8)
    localHeader.writeUInt16LE(0, 10)
    localHeader.writeUInt16LE(0, 12)
    localHeader.writeUInt32LE(0, 14)
    localHeader.writeUInt32LE(data.length, 18)
    localHeader.writeUInt32LE(data.length, 22)
    localHeader.writeUInt16LE(nameBuffer.length, 26)
    localHeader.writeUInt16LE(0, 28)

    localChunks.push(localHeader, nameBuffer, data)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0x0800, 8)
    centralHeader.writeUInt16LE(0, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt16LE(0, 14)
    centralHeader.writeUInt32LE(0, 16)
    centralHeader.writeUInt32LE(data.length, 20)
    centralHeader.writeUInt32LE(data.length, 24)
    centralHeader.writeUInt16LE(nameBuffer.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt16LE(0, 36)
    centralHeader.writeUInt32LE(0, 38)
    centralHeader.writeUInt32LE(cursor, 42)

    centralChunks.push(centralHeader, nameBuffer)

    cursor += localHeader.length + nameBuffer.length + data.length
  }

  const centralDirectoryBuffer = Buffer.concat(centralChunks)
  const endOfCentralDirectory = Buffer.alloc(22)
  endOfCentralDirectory.writeUInt32LE(0x06054b50, 0)
  endOfCentralDirectory.writeUInt16LE(0, 4)
  endOfCentralDirectory.writeUInt16LE(0, 6)
  endOfCentralDirectory.writeUInt16LE(entries.length, 8)
  endOfCentralDirectory.writeUInt16LE(entries.length, 10)
  endOfCentralDirectory.writeUInt32LE(centralDirectoryBuffer.length, 12)
  endOfCentralDirectory.writeUInt32LE(cursor, 16)
  endOfCentralDirectory.writeUInt16LE(0, 20)

  await fs.writeFile(filePath, Buffer.concat([...localChunks, centralDirectoryBuffer, endOfCentralDirectory]))
}

describe('FileSystemMediaReadService', () => {
  const createdRoots: string[] = []
  const createdServices: FileSystemMediaReadService[] = []

  afterEach(async () => {
    for (const service of createdServices) {
      service.dispose()
    }
    createdServices.length = 0

    await Promise.all(
      createdRoots.map(async (root) => {
        await fs.rm(root, { recursive: true, force: true })
      }),
    )
    createdRoots.length = 0
  })

  it('可读取真实目录并保留中文/日文/特殊符号路径', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-fs-service-'))
    createdRoots.push(root)

    await writeBinary(path.join(root, '中文目录', 'かな!@#', 'img_001.jpg'), [0xff, 0xd8, 0xff, 0xd9])
    await writeBinary(path.join(root, '中文目录', 'かな!@#', 'img_002.png'), [0x89, 0x50, 0x4e, 0x47])
    await writeStoredZip(path.join(root, '压缩_かな_!@#.zip'), [
      { name: '封面/001.jpg', content: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
      { name: '封面/002.png', content: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
      { name: 'README.txt', content: Buffer.from('zip-entry') },
    ])
    await writeBinary(path.join(root, '损坏_かな_!@#.rar'), [0x00, 0x01, 0x02, 0x03])
    await writeBinary(path.join(root, '動画_かな.mp4'), [0x00, 0x00, 0x00, 0x18])
    await writeBinary(path.join(root, '音声_かな.mp3'), [0x49, 0x44, 0x33, 0x04])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-folders', [root])

    const snapshot = await service.readLibrarySnapshot()
    expect(snapshot.image_directories.length).toBeGreaterThan(0)
    expect(snapshot.image_packages.length).toBeGreaterThanOrEqual(2)
    expect(snapshot.videos.length).toBe(1)
    expect(snapshot.audios).toHaveLength(1)
    expect(snapshot.audios?.[0]?.track_title).toBe('音声_かな')

    const zipPackage = snapshot.image_packages.find((item) => item.absolute_path.endsWith('.zip'))
    expect(zipPackage?.images.length).toBe(2)
    expect(zipPackage?.images.map((item) => item.media_locator.kind)).toEqual(['archive-entry', 'archive-entry'])

    const sidebar = await service.readImageSidebarTree({
      feature_filter: {
        name_query: '',
        work_title_query: '',
        series_id_query: '',
        circle_query: '',
        author_query: '',
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    })

    const serializedTree = JSON.stringify(sidebar.tree)
    expect(serializedTree).toContain('中文目录')
    expect(serializedTree).toContain('かな!@#')

    const sourceId =
      sidebar.image_packages.find((item) => item.images.length > 0)?.id ??
      sidebar.image_directories.find((item) => item.images.length > 0)?.id
    expect(sourceId).toBeTruthy()

    const page = await service.readImagePage({
      source_id: sourceId ?? null,
      page_index: 0,
      page_size: 16,
      show_names_only: false,
      feature_filter: {
        name_query: '',
        work_title_query: '',
        series_id_query: '',
        circle_query: '',
        author_query: '',
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    })

    expect(page.refs.length).toBeGreaterThan(0)

    const metadata = await service.readImageMetadata({
      package_id: page.refs[0].package_id,
      image_index: page.refs[0].image_index,
    })

    expect(metadata).not.toBeNull()
  })

  it('媒体访问通道执行根目录白名单并可读取令牌资源', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-media-channel-'))
    createdRoots.push(root)

    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-media-outside-'))
    createdRoots.push(outsideRoot)

    const insideImagePath = path.join(root, 'inside.jpg')
    const outsideImagePath = path.join(outsideRoot, 'outside.jpg')
    await writeBinary(insideImagePath, [0xff, 0xd8, 0xff, 0xd9])
    await writeBinary(outsideImagePath, [0xff, 0xd8, 0xff, 0xd9])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-files', [insideImagePath])
    await service.readLibrarySnapshot()

    const allowed = await service.resolveMediaResource({
      locator: {
        kind: 'filesystem',
        absolute_path: insideImagePath,
        extension: '.jpg',
        media_type: 'image',
        mime_type: 'image/jpeg',
      },
    })

    expect(allowed.resource_url.startsWith(`${MEDIA_PROTOCOL_SCHEME}://resource/`)).toBe(true)
    const token = decodeURIComponent(new URL(allowed.resource_url).pathname.replace(/^\//, ''))
    const payload = await service.readMediaResourceByToken(token, null)
    expect(payload.status).toBe(200)
    expect(payload.headers['content-type']).toBe('image/jpeg')
    expect(payload.body.length).toBeGreaterThan(0)

    await expect(
      service.resolveMediaResource({
        locator: {
          kind: 'filesystem',
          absolute_path: outsideImagePath,
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        },
      }),
    ).rejects.toThrow(/未导入\/未允许|越界/)
  })

  it('压缩包轻扫仅使用 entry name，并可按白名单读取 zip 内图片', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-zip-light-scan-'))
    createdRoots.push(root)

    const zipPath = path.join(root, 'gallery.zip')
    await writeStoredZip(zipPath, [
      { name: 'pages/0001.jpg', content: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
      { name: 'pages/0002.png', content: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
      { name: 'doc/readme.txt', content: Buffer.from('not-image') },
    ])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-files', [zipPath])
    const snapshot = await service.readLibrarySnapshot()
    const packageDto = snapshot.image_packages.find((item) => item.absolute_path === zipPath)

    expect(packageDto).toBeTruthy()
    expect(packageDto?.images.length).toBe(2)
    expect(packageDto?.images[0]?.media_locator.kind).toBe('archive-entry')
    expect(packageDto?.images[0]?.media_locator.entry_name).toBe('pages/0001.jpg')
    expect(packageDto?.images[1]?.media_locator.entry_name).toBe('pages/0002.png')

    const resolved = await service.resolveMediaResource({
      locator: {
        kind: 'archive-entry',
        archive_path: zipPath,
        archive_format: 'zip',
        entry_name: 'pages/0001.jpg',
        extension: '.jpg',
        media_type: 'image',
        mime_type: 'image/jpeg',
      },
    })

    const token = decodeURIComponent(new URL(resolved.resource_url).pathname.replace(/^\//, ''))
    const payload = await service.readMediaResourceByToken(token, null)
    expect(payload.status).toBe(200)
    expect(payload.headers['content-type']).toBe('image/jpeg')
    expect(payload.body.length).toBeGreaterThan(0)

    await expect(
      service.resolveMediaResource({
        locator: {
          kind: 'archive-entry',
          archive_path: zipPath,
          archive_format: 'zip',
          entry_name: '../secret.jpg',
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        },
      }),
    ).rejects.toThrow(/entry 非法|entry 不在白名单/)
  })

  it('缩略图请求可生成 Sharp WebP 缓存并复用受控协议返回', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-thumb-cache-'))
    createdRoots.push(root)

    const imagePath = path.join(root, 'thumb-source.png')
    await writeTinyPng(imagePath)

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-files', [imagePath])
    await service.readLibrarySnapshot()

    const resolved = await service.resolveMediaResource({
      locator: {
        kind: 'filesystem',
        absolute_path: imagePath,
        extension: '.png',
        media_type: 'image',
        mime_type: 'image/png',
      },
      preferred_variant: 'thumbnail',
      thumbnail: {
        max_edge: 256,
        quality: 82,
      },
    })

    expect(resolved.mime_type).toBe('image/webp')
    const token = decodeURIComponent(new URL(resolved.resource_url).pathname.replace(/^\//, ''))
    const payload = await service.readMediaResourceByToken(token, null)
    expect(payload.status).toBe(200)
    expect(payload.headers['content-type']).toBe('image/webp')
    expect(payload.body.length).toBeGreaterThan(0)

    const thumbnailCacheRoot = path.join(root, '.mediaplayerx', 'thumbnail-cache')
    const cachedFiles = await fs.readdir(thumbnailCacheRoot)
    expect(cachedFiles.some((fileName) => fileName.endsWith('.webp'))).toBe(true)
  })

  it('可输出运行时依赖预检与最小可用矩阵', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-runtime-cap-'))
    createdRoots.push(root)

    await writeTinyPng(path.join(root, 'sample.png'))

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)

    const capabilities = await service.readRuntimeCapabilities()
    expect(typeof capabilities.dependencies.sharp).toBe('boolean')
    expect(typeof capabilities.dependencies.ffmpeg).toBe('boolean')
    expect(typeof capabilities.dependencies.ffprobe).toBe('boolean')
    expect(typeof capabilities.dependencies.seven_zip).toBe('boolean')
    expect(typeof capabilities.dependencies.powershell).toBe('boolean')
    expect(capabilities.minimum_matrix.length).toBeGreaterThan(0)
    expect(capabilities.minimum_matrix.some((item) => item.capability.includes('rar/7z'))).toBe(true)
  })

  it('写链路可持久化评分与封面，失败时由调用端回滚', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-write-chain-'))
    createdRoots.push(root)

    await writeBinary(path.join(root, 'pkg', 'img_001.jpg'), [0xff, 0xd8, 0xff, 0xd9])
    await writeBinary(path.join(root, 'video.mp4'), [0x00, 0x00, 0x00, 0x18])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-folders', [root])
    const snapshot = await service.readLibrarySnapshot()
    const source = snapshot.image_directories[0]
    const video = snapshot.videos[0]

    expect(source).toBeTruthy()
    expect(video).toBeTruthy()
    if (!source || !video) {
      throw new Error('snapshot missing source/video')
    }

    const grade = await service.writePackageGrade({
      package_id: source.id,
      grade: 5,
    })
    expect(grade.grade).toBe(5)

    const cover = await service.saveVideoCover({
      video_id: video.id,
      time_sec: 0.3,
      fallback_color: 'hsl(210, 44%, 40%)',
    })
    expect(cover.cover_color).toBe('hsl(210, 44%, 40%)')

    const videoMetadata = await service.writeVideoMetadata({
      video_id: video.id,
      work_title: '视频新标题',
      circle: '视频新社团',
      author: '视频新作者',
      tags: ['tag-a', 'tag-b', 'tag-a'],
      grade: 4,
    })
    expect(videoMetadata.video.work_title).toBe('视频新标题')
    expect(videoMetadata.video.circle).toBe('视频新社团')
    expect(videoMetadata.video.author).toBe('视频新作者')
    expect(videoMetadata.video.tags).toEqual(['tag-a', 'tag-b'])
    expect(videoMetadata.video.grade).toBe(4)

    const refreshed = await service.readLibrarySnapshot()
    expect(refreshed.image_directories[0]?.mock_grade).toBe(5)
    expect(refreshed.videos[0]?.cover_color).toBe('hsl(210, 44%, 40%)')
    expect(refreshed.videos[0]?.work_title).toBe('视频新标题')
    expect(refreshed.videos[0]?.circle).toBe('视频新社团')
    expect(refreshed.videos[0]?.author).toBe('视频新作者')
    expect(refreshed.videos[0]?.tags).toEqual(['tag-a', 'tag-b'])
    expect(refreshed.videos[0]?.grade).toBe(4)
  })

  it('视频元数据支持同步文件名到作品名并持久化', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-video-meta-sync-'))
    createdRoots.push(root)

    await writeBinary(path.join(root, 'clip_a.mp4'), [0x00, 0x00, 0x00, 0x18])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-files', [path.join(root, 'clip_a.mp4')])

    const snapshot = await service.readLibrarySnapshot()
    const video = snapshot.videos[0]
    expect(video).toBeTruthy()
    if (!video) {
      throw new Error('video not found')
    }

    const updated = await service.writeVideoMetadata({
      video_id: video.id,
      work_title: '临时标题',
      circle: '同步社团',
      author: '同步作者',
      tags: ['sync-tag'],
      sync_file_name_to_work_title: true,
    })

    expect(updated.video.work_title).toBe('clip_a')
    expect(updated.video.circle).toBe('同步社团')
    expect(updated.video.author).toBe('同步作者')
    expect(updated.video.tags).toEqual(['sync-tag'])

    service.invalidateCache()
    const refreshed = await service.readLibrarySnapshot()
    expect(refreshed.videos[0]?.work_title).toBe('clip_a')
    expect(refreshed.videos[0]?.circle).toBe('同步社团')
    expect(refreshed.videos[0]?.author).toBe('同步作者')
    expect(refreshed.videos[0]?.tags).toEqual(['sync-tag'])
  })

  it('写链路可写入图包元数据并按作品名同步图包名后缀', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-write-meta-'))
    createdRoots.push(root)

    const zipPath = path.join(root, 'meta_pkg.zip')
    await writeStoredZip(zipPath, [{ name: '001.jpg', content: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-files', [zipPath])

    const snapshot = await service.readLibrarySnapshot()
    const source = snapshot.image_packages.find((item) => item.absolute_path === zipPath)
    expect(source).toBeTruthy()
    if (!source) {
      throw new Error('snapshot missing zip source')
    }

    const updated = await service.writePackageMetadata({
      package_id: source.id,
      work_title: '新的作品名',
      circle: '新社团',
      author: '新作者',
      tags: ['tag-A', 'tag-B', 'tag-A'],
      sync_work_title_to_package_name: true,
    })

    expect(updated.package.work_title).toBe('新的作品名')
    expect(updated.package.circle).toBe('新社团')
    expect(updated.package.author).toBe('新作者')
    expect(updated.package.tags).toEqual(['tag-A', 'tag-B'])
    expect(updated.package.package_name).toBe('新的作品名.zip')
    expect(updated.package.display_name).toBe('新的作品名')

    service.invalidateCache()
    const refreshed = await service.readLibrarySnapshot()
    const refreshedSource = refreshed.image_packages.find((item) => item.id === source.id)
    expect(refreshedSource?.work_title).toBe('新的作品名')
    expect(refreshedSource?.package_name).toBe('新的作品名.zip')
    expect(refreshedSource?.display_name).toBe('新的作品名')
  })

  it('播放列表写入后可在服务重启后恢复', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-playlist-'))
    createdRoots.push(root)

    await writeBinary(path.join(root, 'video-a.mp4'), [0x00, 0x00, 0x00, 0x18])
    await writeBinary(path.join(root, 'video-b.mp4'), [0x00, 0x00, 0x00, 0x18])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-folders', [root])
    const snapshot = await service.readLibrarySnapshot()
    const targetVideoIds = snapshot.videos.slice(0, 2).map((video) => video.id)

    expect(targetVideoIds.length).toBe(2)
    await service.writePlaylist({ video_ids: targetVideoIds })

    service.dispose()

    const restarted = new FileSystemMediaReadService(root)
    createdServices.push(restarted)
    await restarted.readLibrarySnapshot()
    const restored = await restarted.readPlaylist()

    expect(restored.video_ids).toEqual(targetVideoIds)
  })

  it('读取快照时会自动清理磁盘已删除的 source/video 并广播变更', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-auto-prune-missing-'))
    createdRoots.push(root)

    const imageDirectory = path.join(root, 'gallery')
    const videoPath = path.join(root, 'clip.mp4')
    await writeBinary(path.join(imageDirectory, 'a.jpg'), [0xff, 0xd8, 0xff, 0xd9])
    await writeBinary(videoPath, [0x00, 0x00, 0x00, 0x18])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-folders', [root])

    const before = await service.readLibrarySnapshot()
    expect(before.image_directories.length).toBeGreaterThan(0)
    expect(before.videos.length).toBeGreaterThan(0)

    const eventPayloads: Array<{ reason: string; updated_at_ms: number }> = []
    const unsubscribe = service.onLibraryChanged((payload) => {
      eventPayloads.push(payload)
    })

    await fs.rm(imageDirectory, { recursive: true, force: true })
    await fs.rm(videoPath, { force: true })

    const after = await service.readLibrarySnapshot()
    unsubscribe()

    expect(after.image_directories).toHaveLength(0)
    expect(after.videos).toHaveLength(0)
    expect(eventPayloads.some((payload) => payload.reason === 'auto-prune-missing-sources')).toBe(true)
  })

  it('导入任务以纯引用登记库外文件并完成刷新', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-import-root-'))
    const outsideRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-import-source-'))
    createdRoots.push(root)
    createdRoots.push(outsideRoot)

    const outsideImagePath = path.join(outsideRoot, 'incoming', 'scene.jpg')
    await writeBinary(outsideImagePath, [0xff, 0xd8, 0xff, 0xd9])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)

    const before = await service.readLibrarySnapshot()
    const beforeImageCount = [...before.image_packages, ...before.image_directories].reduce(
      (sum, source) => sum + source.images.length,
      0,
    )
    expect(beforeImageCount).toBe(0)

    const queued = await service.enqueueImportTask({
      source: 'dialog-files',
      paths: [outsideImagePath],
    })
    expect(['pending', 'running', 'completed']).toContain(queued.task.status)

    const doneTask = await waitForImportTaskDone(service, queued.task.task_id)
    expect(doneTask.status).toBe('completed')
    expect(doneTask.processed_count).toBe(1)

    const importedDirectory = path.join(root, 'imports', 'files')
    const importedDirectoryStat = await fs.stat(importedDirectory).catch(() => null)
    expect(importedDirectoryStat).toBeNull()

    const after = await service.readLibrarySnapshot()
    const afterImageCount = [...after.image_packages, ...after.image_directories].reduce(
      (sum, source) => sum + source.images.length,
      0,
    )
    expect(afterImageCount).toBeGreaterThan(beforeImageCount)

    const importedByReference = [...after.image_packages, ...after.image_directories]
      .flatMap((source) => source.images)
      .some((image) => image.media_locator.kind === 'filesystem' && image.media_locator.absolute_path === outsideImagePath)
    expect(importedByReference).toBe(true)
  })

  it('管理删除图片文件后会返回正确 deleted_count 并刷新快照', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-delete-image-'))
    createdRoots.push(root)

    const imagePathA = path.join(root, 'gallery', 'a.jpg')
    const imagePathB = path.join(root, 'gallery', 'b.jpg')
    await writeBinary(imagePathA, [0xff, 0xd8, 0xff, 0xd9])
    await writeBinary(imagePathB, [0xff, 0xd8, 0xff, 0xd9])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-folders', [root])

    const sidebar = await service.readImageSidebarTree({
      feature_filter: {
        name_query: '',
        work_title_query: '',
        series_id_query: '',
        circle_query: '',
        author_query: '',
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    })

    const source = sidebar.image_directories.find((item) => path.resolve(item.absolute_path) === path.resolve(path.join(root, 'gallery')))
    expect(source).toBeTruthy()
    if (!source) {
      throw new Error('source not found')
    }
    const firstImage = source.images[0]
    expect(firstImage?.media_locator.kind).toBe('filesystem')
    if (!firstImage || firstImage.media_locator.kind !== 'filesystem') {
      throw new Error('image locator not found')
    }

    const result = await service.deleteImageItems({
      image_ids: [firstImage.id],
    })
    expect(result.deleted_count).toBe(1)
    expect(result.failed).toHaveLength(0)

    const removedStat = await fs.stat(firstImage.media_locator.absolute_path).catch(() => null)
    expect(removedStat).toBeNull()

    const snapshotAfter = await service.readLibrarySnapshot()
    const idStillExists = [...snapshotAfter.image_packages, ...snapshotAfter.image_directories]
      .flatMap((item) => item.images)
      .some((image) => image.id === firstImage.id)
    expect(idStillExists).toBe(false)
  })

  it('管理删除图片部分失败时返回 deleted_count 与 failed[] 明细', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-delete-image-partial-'))
    createdRoots.push(root)

    const imagePathA = path.join(root, 'gallery', 'a.jpg')
    await writeBinary(imagePathA, [0xff, 0xd8, 0xff, 0xd9])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-folders', [root])

    const snapshotBefore = await service.readLibrarySnapshot()
    const source = snapshotBefore.image_directories.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(path.join(root, 'gallery')),
    )
    expect(source).toBeTruthy()
    if (!source) {
      throw new Error('source not found')
    }

    const targetImage = source.images[0]
    expect(targetImage).toBeTruthy()
    if (!targetImage) {
      throw new Error('target image not found')
    }

    const missingImageId = 'missing-image-id'
    const result = await service.deleteImageItems({
      image_ids: [targetImage.id, missingImageId],
    })

    expect(result.deleted_count).toBe(1)
    expect(result.failed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          image_id: missingImageId,
          reason: 'image not found',
        }),
      ]),
    )

    const removedStat = await fs.stat(imagePathA).catch(() => null)
    expect(removedStat).toBeNull()
  })

  it('管理删除 Sidebar 文件夹节点不会抛 isPathInsideRoot 异常并移除节点', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-delete-folder-'))
    createdRoots.push(root)

    const folderPath = path.join(root, 'to-delete')
    await writeBinary(path.join(folderPath, 'img_01.jpg'), [0xff, 0xd8, 0xff, 0xd9])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-folders', [root])

    const sidebarBefore = await service.readImageSidebarTree({
      feature_filter: {
        name_query: '',
        work_title_query: '',
        series_id_query: '',
        circle_query: '',
        author_query: '',
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    })

    const targetSource = sidebarBefore.image_directories.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(folderPath),
    )
    expect(targetSource).toBeTruthy()
    if (!targetSource) {
      throw new Error('target source not found')
    }

    const targetNodeId = `folder:${targetSource.tree_path.join('/')}`
    const result = await service.deleteSidebarNodes({
      node_ids: [targetNodeId],
    })
    expect(result.failed).toHaveLength(0)
    expect(result.deleted_count).toBeGreaterThan(0)

    const folderStat = await fs.stat(folderPath).catch(() => null)
    expect(folderStat).toBeNull()

    const sidebarAfter = await service.readImageSidebarTree({
      feature_filter: {
        name_query: '',
        work_title_query: '',
        series_id_query: '',
        circle_query: '',
        author_query: '',
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    })
    const nodeStillExists = sidebarAfter.image_directories.some(
      (item) => path.resolve(item.absolute_path) === path.resolve(folderPath),
    )
    expect(nodeStillExists).toBe(false)
  })

  it('管理删除 Sidebar 节点部分失败时返回 deleted_count 与 failed[] 明细', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-delete-sidebar-partial-'))
    createdRoots.push(root)

    const folderPath = path.join(root, 'to-delete')
    await writeBinary(path.join(folderPath, 'img_01.jpg'), [0xff, 0xd8, 0xff, 0xd9])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-folders', [root])

    const sidebarBefore = await service.readImageSidebarTree({
      feature_filter: {
        name_query: '',
        work_title_query: '',
        series_id_query: '',
        circle_query: '',
        author_query: '',
        tags: [],
        grade: null,
      },
      grade_overrides: {},
    })

    const targetSource = sidebarBefore.image_directories.find(
      (item) => path.resolve(item.absolute_path) === path.resolve(folderPath),
    )
    expect(targetSource).toBeTruthy()
    if (!targetSource) {
      throw new Error('target source not found')
    }

    const targetNodeId = `folder:${targetSource.tree_path.join('/')}`
    const missingNodeId = 'package:missing/path'
    const result = await service.deleteSidebarNodes({
      node_ids: [targetNodeId, missingNodeId],
    })

    expect(result.deleted_count).toBeGreaterThanOrEqual(1)
    expect(result.failed).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          node_id: missingNodeId,
          reason: 'node not found',
        }),
      ]),
    )

    const folderStat = await fs.stat(folderPath).catch(() => null)
    expect(folderStat).toBeNull()
  })

  it('管理删除压缩包中的图片后会刷新 zip 条目白名单并保留剩余条目可读', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-delete-zip-entry-'))
    createdRoots.push(root)

    const zipPath = path.join(root, 'gallery.zip')
    await writeStoredZip(zipPath, [
      { name: 'a/001.jpg', content: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
      { name: 'a/002.jpg', content: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) },
      { name: 'docs/readme.txt', content: Buffer.from('hello') },
    ])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-files', [zipPath])

    const snapshotBefore = await service.readLibrarySnapshot()
    const sourceBefore = snapshotBefore.image_packages.find((item) => path.resolve(item.absolute_path) === path.resolve(zipPath))
    expect(sourceBefore).toBeTruthy()
    if (!sourceBefore) {
      throw new Error('zip source not found')
    }
    expect(sourceBefore.images.length).toBeGreaterThanOrEqual(2)
    const deletedImage = sourceBefore.images[0]
    const remainingImage = sourceBefore.images[1]
    expect(deletedImage?.media_locator.kind).toBe('archive-entry')
    expect(remainingImage?.media_locator.kind).toBe('archive-entry')
    if (!deletedImage || !remainingImage || deletedImage.media_locator.kind !== 'archive-entry' || remainingImage.media_locator.kind !== 'archive-entry') {
      throw new Error('zip image locators not found')
    }

    const deleteResult = await service.deleteImageItems({
      image_ids: [deletedImage.id],
    })
    expect(deleteResult.deleted_count).toBe(1)
    expect(deleteResult.failed).toHaveLength(0)

    const snapshotAfter = await service.readLibrarySnapshot()
    const sourceAfter = snapshotAfter.image_packages.find((item) => path.resolve(item.absolute_path) === path.resolve(zipPath))
    expect(sourceAfter).toBeTruthy()
    if (!sourceAfter) {
      throw new Error('zip source not found after delete')
    }
    expect(sourceAfter.images.some((item) => item.id === deletedImage.id)).toBe(false)
    expect(sourceAfter.images.some((item) => item.id === remainingImage.id)).toBe(true)

    const remainingResolved = await service.resolveMediaResource({
      locator: remainingImage.media_locator,
    })
    expect(remainingResolved.resource_url.startsWith(`${MEDIA_PROTOCOL_SCHEME}://`)).toBe(true)

    await expect(
      service.resolveMediaResource({
        locator: deletedImage.media_locator,
      }),
    ).rejects.toThrow(/entry 不在白名单|allowlist/i)
  })

  it('管理删除 Sidebar 压缩包和视频节点后快照同步移除并物理删除文件', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-manage-delete-zip-video-'))
    createdRoots.push(root)

    const zipPath = path.join(root, 'drop.zip')
    const videoPath = path.join(root, 'drop.mp4')
    await writeStoredZip(zipPath, [{ name: '001.jpg', content: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) }])
    await writeBinary(videoPath, [0x00, 0x00, 0x00, 0x18])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-files', [zipPath, videoPath])

    const snapshotBefore = await service.readLibrarySnapshot()
    const zipSource = snapshotBefore.image_packages.find((item) => path.resolve(item.absolute_path) === path.resolve(zipPath))
    const videoSource = snapshotBefore.videos.find((item) => path.resolve(item.absolute_path) === path.resolve(videoPath))
    expect(zipSource).toBeTruthy()
    expect(videoSource).toBeTruthy()
    if (!zipSource || !videoSource) {
      throw new Error('zip/video sources not found before delete')
    }

    const deleteResult = await service.deleteSidebarNodes({
      node_ids: [`package:${zipSource.tree_path.join('/')}`, `video:${videoSource.tree_path.join('/')}`],
    })
    expect(deleteResult.failed).toHaveLength(0)
    expect(deleteResult.deleted_count).toBeGreaterThanOrEqual(2)

    const zipStat = await fs.stat(zipPath).catch(() => null)
    const videoStat = await fs.stat(videoPath).catch(() => null)
    expect(zipStat).toBeNull()
    expect(videoStat).toBeNull()

    const snapshotAfter = await service.readLibrarySnapshot()
    expect(snapshotAfter.image_packages.some((item) => path.resolve(item.absolute_path) === path.resolve(zipPath))).toBe(false)
    expect(snapshotAfter.videos.some((item) => path.resolve(item.absolute_path) === path.resolve(videoPath))).toBe(false)
  })

  it('resolveMediaResource 输出审计统计（拒绝分类、token 命中/过期）', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-audit-'))
    createdRoots.push(root)

    const imagePath = path.join(root, 'inside.jpg')
    await writeBinary(imagePath, [0xff, 0xd8, 0xff, 0xd9])
    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-files', [imagePath])
    await service.readLibrarySnapshot()

    const allowed = await service.resolveMediaResource({
      locator: {
        kind: 'filesystem',
        absolute_path: imagePath,
        extension: '.jpg',
        media_type: 'image',
        mime_type: 'image/jpeg',
      },
    })
    const token = decodeURIComponent(new URL(allowed.resource_url).pathname.replace(/^\//, ''))
    await service.readMediaResourceByToken(token, null)

    await expect(
      service.resolveMediaResource({
        locator: {
          kind: 'filesystem',
          absolute_path: path.join(root, '..', 'outside.jpg'),
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        },
      }),
    ).rejects.toThrow(/未导入\/未允许|越界/)

    const audit = await service.readMediaAccessAudit()
    expect(audit.resolve_requests).toBeGreaterThanOrEqual(2)
    expect(audit.resolve_granted).toBeGreaterThanOrEqual(1)
    expect(audit.resolve_denied_by_reason.path_outside_root).toBeGreaterThanOrEqual(1)
    expect(audit.token_hits).toBeGreaterThanOrEqual(1)
  })

  it('可通过 ffprobe 探测真实视频元数据并回填时长/分辨率', async () => {
    if (!(await commandExists('ffmpeg')) || !(await commandExists('ffprobe'))) {
      return
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-video-probe-'))
    createdRoots.push(root)

    const videoPath = path.join(root, 'sample.mp4')
    await createSampleVideo(videoPath)

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
    await enqueueImportAndWait(service, 'dialog-files', [videoPath])
    const snapshot = await service.readLibrarySnapshot()
    const video = snapshot.videos[0]

    expect(video).toBeTruthy()
    if (!video) {
      throw new Error('video not found')
    }
    expect(video.duration_sec).toBeGreaterThan(0)
    expect(video.width).toBe(640)
    expect(video.height).toBe(360)
  })
})
