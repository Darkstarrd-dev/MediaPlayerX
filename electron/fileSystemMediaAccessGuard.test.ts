import path from 'node:path'
import { promises as fs } from 'node:fs'

import { afterEach, describe, expect, it } from 'vitest'

import type { MediaLocatorDto } from '../src/contracts/backend'
import { assertLocatorAllowed, type MediaAccessGuardContext } from './fileSystemMediaAccessGuard'
import { normalizeAllowlistKey } from './fileSystemServiceHelpers'
import { cleanupTempMediaRoot, createTempMediaRoot } from './test-utils/mediaLibraryFixtures'

async function writeFile(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, Buffer.from([0x61]))
}

function createBaseContext(rootDir: string): MediaAccessGuardContext {
  return {
    rootDir,
    importDirectoryRoots: [],
    importFileAllowlistKeys: new Set<string>(),
    archiveEntryIndexByPath: new Map<string, Set<string>>(),
    imageExtensions: new Set(['.jpg', '.png', '.webp']),
    videoExtensions: new Set(['.mp4', '.webm']),
    subtitleExtensions: new Set(['.vtt', '.srt', '.ass', '.ssa']),
  }
}

describe('fileSystemMediaAccessGuard', () => {
  const roots: string[] = []

  afterEach(async () => {
    for (const root of roots) {
      await cleanupTempMediaRoot(root)
    }
    roots.length = 0
  })

  it('filesystem 定位可通过 root/import-directory/import-file 三类白名单', async () => {
    const root = await createTempMediaRoot('mpx-guard-allow-')
    roots.push(root)

    const importRoot = await createTempMediaRoot('mpx-guard-import-root-')
    roots.push(importRoot)

    const outsideRoot = await createTempMediaRoot('mpx-guard-outside-')
    roots.push(outsideRoot)

    const insideImage = path.join(root, 'inside.jpg')
    const importDirImage = path.join(importRoot, 'from-dir.jpg')
    const importFileImage = path.join(outsideRoot, 'from-file.jpg')
    await writeFile(insideImage)
    await writeFile(importDirImage)
    await writeFile(importFileImage)

    const context = createBaseContext(root)
    context.importDirectoryRoots = [importRoot]
    context.importFileAllowlistKeys = new Set([normalizeAllowlistKey(importFileImage)])

    const locatorInside: MediaLocatorDto = {
      kind: 'filesystem',
      absolute_path: insideImage,
      extension: '.jpg',
      media_type: 'image',
      mime_type: 'image/jpeg',
    }
    const locatorImportDir: MediaLocatorDto = {
      kind: 'filesystem',
      absolute_path: importDirImage,
      extension: '.jpg',
      media_type: 'image',
      mime_type: 'image/jpeg',
    }
    const locatorImportFile: MediaLocatorDto = {
      kind: 'filesystem',
      absolute_path: importFileImage,
      extension: '.jpg',
      media_type: 'image',
      mime_type: 'image/jpeg',
    }

    await expect(assertLocatorAllowed(locatorInside, context)).resolves.toMatchObject({
      absolute_path: path.resolve(insideImage),
      extension: '.jpg',
    })
    await expect(assertLocatorAllowed(locatorImportDir, context)).resolves.toMatchObject({
      absolute_path: path.resolve(importDirImage),
      extension: '.jpg',
    })
    await expect(assertLocatorAllowed(locatorImportFile, context)).resolves.toMatchObject({
      absolute_path: path.resolve(importFileImage),
      extension: '.jpg',
    })
  })

  it('filesystem 定位在越界/扩展名不匹配/类型不允许/文件缺失时拒绝', async () => {
    const root = await createTempMediaRoot('mpx-guard-filesystem-reject-')
    roots.push(root)

    const outsideRoot = await createTempMediaRoot('mpx-guard-filesystem-outside-')
    roots.push(outsideRoot)

    const insideImage = path.join(root, 'inside.jpg')
    const outsideImage = path.join(outsideRoot, 'outside.jpg')
    await writeFile(insideImage)
    await writeFile(outsideImage)

    const context = createBaseContext(root)

    await expect(
      assertLocatorAllowed(
        {
          kind: 'filesystem',
          absolute_path: outsideImage,
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        },
        context,
      ),
    ).rejects.toMatchObject({ reason: 'path_outside_root' })

    await expect(
      assertLocatorAllowed(
        {
          kind: 'filesystem',
          absolute_path: insideImage,
          extension: '.png',
          media_type: 'image',
          mime_type: 'image/png',
        },
        context,
      ),
    ).rejects.toMatchObject({ reason: 'filesystem_extension_mismatch' })

    await expect(
      assertLocatorAllowed(
        {
          kind: 'filesystem',
          absolute_path: insideImage,
          extension: '.jpg',
          media_type: 'video',
          mime_type: 'video/mp4',
        },
        context,
      ),
    ).rejects.toMatchObject({ reason: 'filesystem_media_type_not_allowed' })

    await expect(
      assertLocatorAllowed(
        {
          kind: 'filesystem',
          absolute_path: path.join(root, 'missing.jpg'),
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        },
        context,
      ),
    ).rejects.toMatchObject({ reason: 'filesystem_file_missing' })
  })

  it('archive-entry 定位可拒绝非法输入并允许白名单 entry', async () => {
    const root = await createTempMediaRoot('mpx-guard-archive-')
    roots.push(root)

    const zipPath = path.join(root, 'gallery.zip')
    await writeFile(zipPath)

    const context = createBaseContext(root)
    context.archiveEntryIndexByPath = new Map([[path.resolve(zipPath), new Set(['safe/001.JPG'])]])

    await expect(
      assertLocatorAllowed(
        {
          kind: 'archive-entry',
          archive_path: zipPath,
          archive_format: 'zip',
          entry_name: '../secret.jpg',
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        },
        context,
      ),
    ).rejects.toMatchObject({ reason: 'archive_entry_illegal' })

    await expect(
      assertLocatorAllowed(
        {
          kind: 'archive-entry',
          archive_path: zipPath,
          archive_format: 'zip',
          entry_name: 'safe/002.jpg',
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        },
        context,
      ),
    ).rejects.toMatchObject({ reason: 'archive_entry_not_allowlisted' })

    await expect(
      assertLocatorAllowed(
        {
          kind: 'archive-entry',
          archive_path: zipPath,
          archive_format: 'rar',
          entry_name: 'safe/001.JPG',
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        },
        context,
      ),
    ).rejects.toMatchObject({ reason: 'archive_format_not_supported' })

    const fakeRarPath = path.join(root, 'gallery.rar')
    await writeFile(fakeRarPath)

    await expect(
      assertLocatorAllowed(
        {
          kind: 'archive-entry',
          archive_path: fakeRarPath,
          archive_format: 'zip',
          entry_name: 'safe/001.JPG',
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        },
        context,
      ),
    ).rejects.toMatchObject({ reason: 'archive_extension_invalid' })

    await expect(
      assertLocatorAllowed(
        {
          kind: 'archive-entry',
          archive_path: zipPath,
          archive_format: 'zip',
          entry_name: 'safe\\001.JPG',
          extension: '.jpg',
          media_type: 'image',
          mime_type: 'image/jpeg',
        },
        context,
      ),
    ).resolves.toMatchObject({
      archive_path: path.resolve(zipPath),
      entry_name: 'safe/001.JPG',
      extension: '.jpg',
    })
  })
})
