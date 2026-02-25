import { describe, expect, it } from 'vitest'

import type { ExternalMetadataResultItemDto } from '../../contracts/backend'
import { parseExternalMetadataToHitomi } from './parseExternalMetadata'

function createNhentaiItem(overrides: Partial<ExternalMetadataResultItemDto> = {}): ExternalMetadataResultItemDto {
  return {
    source: 'nhentai',
    id: '474755',
    title: 'fallback english title',
    title_original: 'fallback japanese title',
    cover: null,
    url: 'https://nhentai.net/g/474755/',
    token: '',
    tags: [],
    pages: 1,
    posted: '1695513600',
    rating: null,
    favorited: 2141,
    raw: {
      title: {
        english: 'fallback english title',
        japanese: 'fallback japanese title',
      },
      tags: [],
    },
    ...overrides,
  }
}

describe('parseExternalMetadataToHitomi', () => {
  it('nhentai 标题含 group(artist) 时保持 group 和 artist 分离', () => {
    const parsed = parseExternalMetadataToHitomi(
      createNhentaiItem({
        title: '[Chococornet (Tenro Aya)] ',
        title_original: '[チョココロネ (天路あや)] ',
        raw: {
          title: {
            english: '[Chococornet (Tenro Aya)] ',
            japanese: '[チョココロネ (天路あや)] ',
          },
          tags: [],
        },
      }),
    )

    expect(parsed.group).toBe('Chococornet')
    expect(parsed.artist).toBe('Tenro Aya')
    expect(parsed.group_jpn).toBe('チョココロネ')
    expect(parsed.artist_jpn).toBe('天路あや')
  })

  it('nhentai 标题仅 [artist] 时应解析为 artist 而不是 group', () => {
    const parsed = parseExternalMetadataToHitomi(
      createNhentaiItem({
        title: '[Tenro Aya] ',
        title_original: '[天路あや]',
        raw: {
          title: {
            english: '[Tenro Aya] ',
            japanese: '[天路あや]',
          },
          tags: [],
        },
      }),
    )

    expect(parsed.group).toBe('')
    expect(parsed.artist).toBe('Tenro Aya')
    expect(parsed.group_jpn).toBe('')
    expect(parsed.artist_jpn).toBe('天路あや')
  })

  it('ehentai 保持原有 [group] 解析行为不变', () => {
    const item: ExternalMetadataResultItemDto = {
      source: 'ehentai',
      id: '123',
      title: '[CircleName] Some Title',
      title_original: null,
      cover: null,
      url: 'https://e-hentai.org/g/123/abcdef/',
      token: 'abcdef',
      tags: [],
      pages: 1,
      posted: '1700000000',
      rating: '4.5',
      favorited: null,
      raw: {
        title: '[CircleName] Some Title',
        title_jpn: '',
      },
    }

    const parsed = parseExternalMetadataToHitomi(item)
    expect(parsed.group).toBe('CircleName')
    expect(parsed.artist).toBe('')
  })
})
