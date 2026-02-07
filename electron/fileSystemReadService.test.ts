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

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)

    const snapshot = await service.readLibrarySnapshot()
    expect(snapshot.image_directories.length).toBeGreaterThan(0)
    expect(snapshot.image_packages.length).toBeGreaterThanOrEqual(2)
    expect(snapshot.videos.length).toBe(1)

    const zipPackage = snapshot.image_packages.find((item) => item.absolute_path.endsWith('.zip'))
    expect(zipPackage?.images.length).toBe(2)
    expect(zipPackage?.images.map((item) => item.media_locator.kind)).toEqual(['archive-entry', 'archive-entry'])

    const sidebar = await service.readImageSidebarTree({
      feature_filter: {
        name_query: '',
        work_title_query: '',
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
    ).rejects.toThrow(/越界/)
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

  it('写链路可持久化评分与封面，失败时由调用端回滚', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-write-chain-'))
    createdRoots.push(root)

    await writeBinary(path.join(root, 'pkg', 'img_001.jpg'), [0xff, 0xd8, 0xff, 0xd9])
    await writeBinary(path.join(root, 'video.mp4'), [0x00, 0x00, 0x00, 0x18])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
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

    const refreshed = await service.readLibrarySnapshot()
    expect(refreshed.image_directories[0]?.mock_grade).toBe(5)
    expect(refreshed.videos[0]?.cover_color).toBe('hsl(210, 44%, 40%)')
  })

  it('播放列表写入后可在服务重启后恢复', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-playlist-'))
    createdRoots.push(root)

    await writeBinary(path.join(root, 'video-a.mp4'), [0x00, 0x00, 0x00, 0x18])
    await writeBinary(path.join(root, 'video-b.mp4'), [0x00, 0x00, 0x00, 0x18])

    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
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

  it('resolveMediaResource 输出审计统计（拒绝分类、token 命中/过期）', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mpx-audit-'))
    createdRoots.push(root)

    const imagePath = path.join(root, 'inside.jpg')
    await writeBinary(imagePath, [0xff, 0xd8, 0xff, 0xd9])
    const service = new FileSystemMediaReadService(root)
    createdServices.push(service)
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
    ).rejects.toThrow(/越界/)

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
