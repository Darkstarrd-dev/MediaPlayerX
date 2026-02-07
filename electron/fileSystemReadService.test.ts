import os from 'node:os'
import path from 'node:path'
import { promises as fs } from 'node:fs'

import { afterEach, describe, expect, it } from 'vitest'

import { FileSystemMediaReadService } from './fileSystemReadService'

async function writeBinary(filePath: string, bytes: number[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, Buffer.from(bytes))
}

describe('FileSystemMediaReadService', () => {
  const createdRoots: string[] = []

  afterEach(async () => {
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
    await writeBinary(path.join(root, '压缩_かな_!@#.zip'), [0x50, 0x4b, 0x03, 0x04, 0x00, 0x00])
    await writeBinary(path.join(root, '损坏_かな_!@#.rar'), [0x00, 0x01, 0x02, 0x03])
    await writeBinary(path.join(root, '動画_かな.mp4'), [0x00, 0x00, 0x00, 0x18])

    const service = new FileSystemMediaReadService(root)

    const snapshot = await service.readLibrarySnapshot()
    expect(snapshot.image_directories.length).toBeGreaterThan(0)
    expect(snapshot.image_packages.length).toBeGreaterThanOrEqual(2)
    expect(snapshot.videos.length).toBe(1)

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

    const sourceId = sidebar.image_packages[0]?.id ?? sidebar.image_directories[0]?.id
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
})
