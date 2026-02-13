import os from 'node:os'
import path from 'node:path'
import { promises as fs } from 'node:fs'

import type { AudioItemDto, ImagePackageDto, LibrarySnapshotDto, MediaLocatorDto, VideoItemDto } from '../../src/contracts/backend'

export async function createTempMediaRoot(prefix = 'mpx-test-'): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix))
}

export async function cleanupTempMediaRoot(rootDir: string): Promise<void> {
  await fs.rm(rootDir, { recursive: true, force: true })
}

export function createFilesystemImageLocator(absolutePath: string, extension = '.jpg'): MediaLocatorDto {
  return {
    kind: 'filesystem',
    absolute_path: absolutePath,
    extension,
    media_type: 'image',
    mime_type: extension === '.png' ? 'image/png' : 'image/jpeg',
  }
}

export function createFilesystemVideoLocator(absolutePath: string, extension = '.mp4'): MediaLocatorDto {
  return {
    kind: 'filesystem',
    absolute_path: absolutePath,
    extension,
    media_type: 'video',
    mime_type: 'video/mp4',
  }
}

export function createFilesystemAudioLocator(absolutePath: string, extension = '.mp3'): MediaLocatorDto {
  return {
    kind: 'filesystem',
    absolute_path: absolutePath,
    extension,
    media_type: 'audio',
    mime_type: extension === '.flac' ? 'audio/flac' : extension === '.wav' ? 'audio/wav' : 'audio/mpeg',
  }
}

export function createImageSourceFixture(params: {
  sourceId: string
  packageName: string
  absolutePath: string
  sourceType: 'package' | 'directory'
  hiddenSecondImage?: boolean
}): ImagePackageDto {
  const displayName = params.packageName.replace(/\.[^./\\]+$/, '')
  const basePath = params.absolutePath.replace(/\.[^./\\]+$/, '')

  return {
    id: params.sourceId,
    package_name: params.packageName,
    display_name: displayName,
    absolute_path: params.absolutePath,
    tree_path: params.sourceType === 'package' ? [params.packageName] : [displayName],
    work_title: displayName,
    series_id: '',
    circle: '未知',
    author: '未知',
    tags: ['fixture'],
    mock_grade: null,
    images: [
      {
        id: `${params.sourceId}-img-1`,
        ordinal: 1,
        width: 1920,
        height: 1080,
        size_kb: 256,
        cluster: 0,
        color: '#335577',
        feature_vector: [0, 0, 0, 0],
        media_locator: createFilesystemImageLocator(`${basePath}_001.jpg`),
        hidden: false,
      },
      {
        id: `${params.sourceId}-img-2`,
        ordinal: 2,
        width: 1080,
        height: 1080,
        size_kb: 128,
        cluster: 1,
        color: '#775533',
        feature_vector: [1, 1, 1, 1],
        media_locator: createFilesystemImageLocator(`${basePath}_002.jpg`),
        hidden: params.hiddenSecondImage ?? false,
      },
    ],
  }
}

export function createVideoFixture(videoId: string, absolutePath: string): VideoItemDto {
  const fileName = path.basename(absolutePath)
  const workTitle = fileName.replace(/\.[^./\\]+$/, '')

  return {
    id: videoId,
    file_name: fileName,
    absolute_path: absolutePath,
    tree_path: [fileName],
    duration_sec: 10,
    width: 1920,
    height: 1080,
    size_mb: 42,
    cover_color: 'hsl(220, 30%, 30%)',
    cover_image_path: null,
    work_title: workTitle,
    work_title_jpn: '',
    series_id: '',
    circle: '未知',
    circle_jpn: '',
    author: '未知',
    author_jpn: '',
    tags: ['fixture'],
    grade: null,
    media_locator: createFilesystemVideoLocator(absolutePath),
  }
}

export function createAudioFixture(audioId: string, absolutePath: string): AudioItemDto {
  const fileName = path.basename(absolutePath)
  const trackTitle = fileName.replace(/\.[^./\\]+$/, '')

  return {
    id: audioId,
    file_name: fileName,
    absolute_path: absolutePath,
    tree_path: [fileName],
    duration_sec: 0,
    size_mb: 1,
    album: '',
    author: '',
    track_title: trackTitle,
    series_id: '',
    media_locator: createFilesystemAudioLocator(absolutePath),
  }
}

export function createLibrarySnapshotFixture(params?: {
  packageAbsolutePath?: string
  directoryAbsolutePath?: string
  videoAbsolutePath?: string
  audioAbsolutePath?: string
}): LibrarySnapshotDto {
  const packageAbsolutePath = params?.packageAbsolutePath ?? 'Z:/fixtures/pkg-fixture.zip'
  const directoryAbsolutePath = params?.directoryAbsolutePath ?? 'Z:/fixtures/gallery-fixture'
  const videoAbsolutePath = params?.videoAbsolutePath ?? 'Z:/fixtures/video-fixture.mp4'
  const audioAbsolutePath = params?.audioAbsolutePath ?? 'Z:/fixtures/audio-fixture.mp3'

  return {
    image_packages: [
      createImageSourceFixture({
        sourceId: 'pkg-fixture',
        packageName: path.basename(packageAbsolutePath),
        absolutePath: packageAbsolutePath,
        sourceType: 'package',
      }),
    ],
    image_directories: [
      createImageSourceFixture({
        sourceId: 'dir-fixture',
        packageName: path.basename(directoryAbsolutePath),
        absolutePath: directoryAbsolutePath,
        sourceType: 'directory',
      }),
    ],
    videos: [createVideoFixture('video-fixture', videoAbsolutePath)],
    audios: [createAudioFixture('audio-fixture', audioAbsolutePath)],
  }
}
