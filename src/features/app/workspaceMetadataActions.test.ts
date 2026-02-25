import { describe, expect, it, vi } from 'vitest'

import { createSaveParsedMetadata } from './workspaceMetadataActions'
import type { ParsedExternalMetadata } from '../metadata/parseExternalMetadata'
import type { MetadataWriteBindingsResult } from './useMetadataWriteBindings'
import type { ImagePackage } from '../../types'

function createParsedMetadata(overrides: Partial<ParsedExternalMetadata> = {}): ParsedExternalMetadata {
  return {
    source: {
      site: 'nhentai',
      url: 'https://nhentai.net/g/474755/',
      id: '474755',
      token: '',
    },
    title: 'Jotaika Kishi Belveed / Feminized Knight Belveed',
    title_jpn: '女体化騎士ベルウィード',
    thumb: 'https://t.nhentai.net/galleries/2685430/cover.jpg',
    artist: 'tenro aya',
    group: '',
    artist_jpn: '天路あや',
    group_jpn: '',
    posted: '2023-09-24',
    favorited: '2141',
    tags: {
      parody: 'ero trap dungeon',
      character: '',
      tag: 'big breasts, gender bender',
    },
    ...overrides,
  }
}

function createMetadataWriteBindingsMock(): MetadataWriteBindingsResult {
  return {
    metadataPending: false,
    applyPackageGrade: vi.fn(),
    applyPackageMetadata: vi.fn(),
    applyPackageMetadataById: vi.fn().mockResolvedValue(undefined),
    applyPackageExternalMetadataById: vi.fn().mockResolvedValue(undefined),
    applyPackageSyncName: vi.fn(),
    applyVideoMetadata: vi.fn(),
    applyAudioMetadata: vi.fn(),
    applyVideoSyncName: vi.fn(),
  }
}

describe('createSaveParsedMetadata', () => {
  it('image 模式应将 parsed 字段完整映射到写入调用', async () => {
    const metadataWriteBindings = createMetadataWriteBindingsMock()
    const targetPackage = { id: 'pkg-1' } as ImagePackage
    const save = createSaveParsedMetadata({
      mode: 'image',
      metadataWriteBindings,
      metadataImagePackageEffective: targetPackage,
      saveParsedMetadataErrors: {
        unsupportedMode: 'unsupported-mode',
        noAvailablePackage: 'no-package',
      },
    })

    const parsed = createParsedMetadata()
    await save(parsed)

    expect(metadataWriteBindings.applyPackageMetadataById).toHaveBeenCalledWith(
      'pkg-1',
      expect.objectContaining({
        workTitle: parsed.title,
        circle: parsed.group,
        author: parsed.artist,
        tags: ['parody:ero trap dungeon', 'tag:big breasts', 'tag:gender bender'],
      }),
    )
    expect(metadataWriteBindings.applyPackageExternalMetadataById).toHaveBeenCalledWith(
      'pkg-1',
      expect.objectContaining({
        sourceSite: parsed.source.site,
        sourceUrl: parsed.source.url,
        sourceRemoteId: parsed.source.id,
        sourceToken: parsed.source.token,
        title: parsed.title,
        titleJpn: parsed.title_jpn,
        group: parsed.group,
        groupJpn: parsed.group_jpn,
        artist: parsed.artist,
        artistJpn: parsed.artist_jpn,
        posted: parsed.posted,
        favorited: parsed.favorited,
        thumbUrl: parsed.thumb,
        tags: parsed.tags,
      }),
    )
  })

  it('非 image 模式应抛出 unsupported 错误', async () => {
    const save = createSaveParsedMetadata({
      mode: 'video',
      metadataWriteBindings: createMetadataWriteBindingsMock(),
      metadataImagePackageEffective: { id: 'pkg-1' } as ImagePackage,
      saveParsedMetadataErrors: {
        unsupportedMode: 'unsupported-mode',
        noAvailablePackage: 'no-package',
      },
    })

    await expect(save(createParsedMetadata())).rejects.toThrow('unsupported-mode')
  })

  it('缺少包 id 时应抛出 no package 错误', async () => {
    const save = createSaveParsedMetadata({
      mode: 'image',
      metadataWriteBindings: createMetadataWriteBindingsMock(),
      metadataImagePackageEffective: null,
      saveParsedMetadataErrors: {
        unsupportedMode: 'unsupported-mode',
        noAvailablePackage: 'no-package',
      },
    })

    await expect(save(createParsedMetadata())).rejects.toThrow('no-package')
  })
})
