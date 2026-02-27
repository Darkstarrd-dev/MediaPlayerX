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

    const onSaveParsedMetadataToTarget = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    const { container } = render(
        <MetadataFetchPanel
          open={true}
          targets={[
            {
              packageId: 'pkg-1',
              label: 'pkg-1',
              defaultText: 'tenro aya',
            },
          ]}
          proxyServer=""
          ehentaiCookies=""
          metadataPending={false}
          onClose={onClose}
          onSaveParsedMetadataToTarget={onSaveParsedMetadataToTarget}
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
      expect(onSaveParsedMetadataToTarget).toHaveBeenCalledWith(
        'pkg-1',
        expect.objectContaining({
          artist: 'Tenro Aya',
          artist_jpn: '天路あや',
          group: '',
          group_jpn: '',
        }),
      )
    })
  })

  it('复数目标支持切换并按目标 packageId 保存', async () => {
    const searchExternalMetadata = vi.fn(
      async (request: { source?: 'nhentai' | 'ehentai'; input_text?: string }) => ({
        items:
          request.source === 'nhentai'
            ? [
                {
                  source: 'nhentai' as const,
                  id: request.input_text === 'kw-2' ? '2002' : '1001',
                  title: request.input_text === 'kw-2' ? '[Artist Two]' : '[Artist One]',
                  title_original: request.input_text === 'kw-2' ? '[作者二]' : '[作者一]',
                  cover: null,
                  url: 'https://nhentai.net/g/1/',
                  token: '',
                  tags: [],
                  pages: 1,
                  posted: '1695513600',
                  rating: null,
                  favorited: 1,
                  raw: {
                    title: {
                      english: request.input_text === 'kw-2' ? '[Artist Two]' : '[Artist One]',
                      japanese: request.input_text === 'kw-2' ? '[作者二]' : '[作者一]',
                    },
                    tags: [],
                  },
                },
              ]
            : [],
        debug: null,
      }),
    )

    window.mediaPlayerBackend = {
      searchExternalMetadata,
    } as unknown as typeof window.mediaPlayerBackend

    const onSaveParsedMetadataToTarget = vi.fn().mockResolvedValue(undefined)

    const { container } = render(
      <MetadataFetchPanel
        open={true}
        targets={[
          { packageId: 'pkg-1', label: 'pkg-1', defaultText: 'kw-1' },
          { packageId: 'pkg-2', label: 'pkg-2', defaultText: 'kw-2' },
        ]}
        proxyServer=""
        ehentaiCookies=""
        metadataPending={false}
        onClose={vi.fn()}
        onSaveParsedMetadataToTarget={onSaveParsedMetadataToTarget}
      />,
    )

    fireEvent.change(within(container).getByPlaceholderText('请求间隔(ms)'), {
      target: { value: '0' },
    })

    fireEvent.click(within(container).getByRole('button', { name: '检索' }))

    await waitFor(() => {
      expect(searchExternalMetadata).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'nhentai', input_text: 'kw-1' }),
      )
      expect(searchExternalMetadata).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'nhentai', input_text: 'kw-2' }),
      )
    })

    const nhColumn = container.querySelector('[data-source="nhentai"]') as HTMLElement | null
    expect(nhColumn).not.toBeNull()
    if (!nhColumn) {
      throw new Error('nhentai column not found')
    }

    fireEvent.click(within(nhColumn).getByRole('button', { name: '下一页' }))
    fireEvent.click(within(nhColumn).getByRole('button', { name: '解析' }))
    fireEvent.click(within(nhColumn).getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(onSaveParsedMetadataToTarget).toHaveBeenCalledWith(
        'pkg-2',
        expect.objectContaining({ artist: 'Artist Two' }),
      )
    })
  })

  it('targets 引用变化但 packageId 不变时不重置输入与结果', async () => {
    const searchExternalMetadata = vi.fn(async () => ({
      items: [
        {
          source: 'nhentai' as const,
          id: '1001',
          title: '[Artist One]',
          title_original: '[作者一]',
          cover: null,
          url: 'https://nhentai.net/g/1001/',
          token: '',
          tags: [],
          pages: 1,
          posted: '1695513600',
          rating: null,
          favorited: 1,
          raw: {
            title: {
              english: '[Artist One]',
              japanese: '[作者一]',
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

    const { container, rerender } = render(
      <MetadataFetchPanel
        open={true}
        targets={[{ packageId: 'pkg-1', label: 'pkg-1', defaultText: 'kw-1' }]}
        proxyServer=""
        ehentaiCookies=""
        metadataPending={false}
        onClose={vi.fn()}
        onSaveParsedMetadataToTarget={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    const keywordInput = within(container).getByPlaceholderText('检索关键字') as HTMLInputElement
    fireEvent.change(keywordInput, { target: { value: 'manual-keyword' } })
    fireEvent.click(within(container).getByRole('button', { name: '检索' }))

    await waitFor(() => {
      expect(searchExternalMetadata).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'nhentai', input_text: 'manual-keyword' }),
      )
      expect(within(container).getByText('[Artist One]')).toBeInTheDocument()
    })

    rerender(
      <MetadataFetchPanel
        open={true}
        targets={[{ packageId: 'pkg-1', label: 'pkg-1-new', defaultText: 'kw-reset' }]}
        proxyServer=""
        ehentaiCookies=""
        metadataPending={false}
        onClose={vi.fn()}
        onSaveParsedMetadataToTarget={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    await waitFor(() => {
      const nextKeywordInput = within(container).getByPlaceholderText('检索关键字') as HTMLInputElement
      expect(nextKeywordInput.value).toBe('manual-keyword')
      expect(within(container).getByText('[Artist One]')).toBeInTheDocument()
    })
  })
})
