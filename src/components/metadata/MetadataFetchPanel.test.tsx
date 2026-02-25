import { fireEvent, render, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import MetadataFetchPanel from './MetadataFetchPanel'

describe('MetadataFetchPanel', () => {
  afterEach(() => {
    window.mediaPlayerBackend = undefined
  })

  it('nhentai 在 [artist] 标题下解析并保存 artist / artist_jpn', async () => {
    const searchExternalMetadata = vi.fn(async () => ({
      items: [
        {
          source: 'nhentai' as const,
          id: '474755',
          title: '[Tenro Aya] ',
          title_original: '[天路あや]',
          cover: 'https://t.nhentai.net/galleries/2685430/cover.jpg',
          url: 'https://nhentai.net/g/474755/',
          token: '',
          tags: ['parody:ero trap dungeon', 'tag:big breasts'],
          pages: 1,
          posted: '1695513600',
          rating: null,
          favorited: 2141,
          raw: {
            id: 474755,
            title: {
              english: '[Tenro Aya] ',
              japanese: '[天路あや]',
            },
            tags: [],
          },
        },
      ],
      debug: null,
    }))

    window.mediaPlayerBackend = {
      searchExternalMetadata,
    } as unknown as typeof window.mediaPlayerBackend

    const onSaveParsedMetadata = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    const { container } = render(
      <MetadataFetchPanel
        open={true}
        defaultText="tenro aya"
        proxyServer=""
        ehentaiCookies=""
        metadataPending={false}
        targetPackageLabel="pkg-1"
        onClose={onClose}
        onSaveParsedMetadata={onSaveParsedMetadata}
      />,
    )

    fireEvent.click(within(container).getByRole('button', { name: '检索' }))

    await waitFor(() => {
      expect(searchExternalMetadata).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'nhentai' }),
      )
    })

    const nhColumn = container.querySelector('[data-source="nhentai"]') as HTMLElement | null
    expect(nhColumn).not.toBeNull()
    if (!nhColumn) {
      throw new Error('nhentai column not found')
    }

    fireEvent.click(within(nhColumn).getByRole('button', { name: '解析' }))

    await waitFor(() => {
      const parsed = within(nhColumn).getByLabelText('Parsed') as HTMLTextAreaElement
      expect(parsed.value).toContain('"artist": "Tenro Aya"')
      expect(parsed.value).toContain('"artist_jpn": "天路あや"')
      expect(parsed.value).toContain('"group": ""')
      expect(parsed.value).toContain('"group_jpn": ""')
    })

    fireEvent.click(within(nhColumn).getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(onSaveParsedMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          artist: 'Tenro Aya',
          artist_jpn: '天路あや',
          group: '',
          group_jpn: '',
        }),
      )
    })
  })
})
