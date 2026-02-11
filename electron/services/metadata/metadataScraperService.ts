import axios, { type AxiosInstance } from 'axios'
import { load as loadHtml } from 'cheerio'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'

import type {
  SearchExternalMetadataRequestDto,
  SearchExternalMetadataResponseDto,
  ExternalMetadataResultItemDto,
} from '../../../src/contracts/backend'

const DEFAULT_TIMEOUT_MS = 25_000
const DEFAULT_COOKIES = 'sl=dm_1'
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

interface ParsedInput {
  type: 'id' | 'keyword' | 'nh_link' | 'eh_link' | 'eh_page_link'
  value?: string
  id?: string
  gid?: string
  token?: string
  pageToken?: string
  pageNumber?: string
}

interface MetadataScraperServiceOptions {
  defaultProxyServer?: string
}

interface SearchContext {
  input: ParsedInput
  client: AxiosInstance
}

export class MetadataScraperService {
  private readonly defaultProxyServer: string

  constructor(options?: MetadataScraperServiceOptions) {
    this.defaultProxyServer = options?.defaultProxyServer?.trim() ?? ''
  }

  async search(request: SearchExternalMetadataRequestDto): Promise<SearchExternalMetadataResponseDto> {
    const source = request.source
    const inputRaw = request.input_id?.trim() || request.input_text?.trim() || ''
    if (!inputRaw) {
      return { items: [] }
    }

    const proxyServer = request.proxy_server?.trim() || this.defaultProxyServer || undefined
    const context: SearchContext = {
      input: parseInput(inputRaw),
      client: createHttpClient(proxyServer),
    }

    if (source === 'nhentai') {
      return { items: await this.searchNhentai(context) }
    }
    if (source === 'ehentai') {
      return { items: await this.searchEhentai(context) }
    }

    const [nhItems, ehItems] = await Promise.all([this.searchNhentai(context), this.searchEhentai(context)])
    return {
      items: [...nhItems, ...ehItems],
    }
  }

  private async searchNhentai(context: SearchContext): Promise<ExternalMetadataResultItemDto[]> {
    try {
      let entries: Array<Record<string, unknown>> = []
      if (context.input.type === 'id' || context.input.type === 'nh_link') {
        const id = context.input.value ?? context.input.id
        if (!id) {
          return []
        }
        const response = await context.client.get(`https://nhentai.net/api/gallery/${id}`)
        if (response.data && typeof response.data === 'object') {
          entries = [response.data as Record<string, unknown>]
        }
      } else {
        const response = await context.client.get('https://nhentai.net/api/galleries/search', {
          params: {
            query: context.input.value,
            page: 1,
          },
        })
        const list = (response.data as { result?: Array<Record<string, unknown>> } | null)?.result
        entries = Array.isArray(list) ? list : []
      }

      return entries.map((entry) => toNhentaiResult(entry))
    } catch {
      return []
    }
  }

  private async searchEhentai(context: SearchContext): Promise<ExternalMetadataResultItemDto[]> {
    try {
      let gidlist: Array<[number, string]> = []
      if (context.input.type === 'eh_link') {
        const gid = Number(context.input.gid)
        const token = context.input.token?.trim() ?? ''
        if (Number.isInteger(gid) && token) {
          gidlist = [[gid, token]]
        }
      } else if (context.input.type === 'eh_page_link') {
        const tokenInfo = await this.fetchTokenFromPage(context)
        if (tokenInfo) {
          gidlist = [[tokenInfo.gid, tokenInfo.token]]
        }
      } else if (context.input.type === 'id') {
        gidlist = await this.searchEhGidList(context, `gid:${context.input.value ?? ''}`)
      } else {
        gidlist = await this.searchEhGidList(context, context.input.value ?? '')
      }

      if (gidlist.length === 0) {
        return []
      }

      const metadata = await this.fetchEhMetadata(context, gidlist)
      return metadata.map((entry) => toEhentaiResult(entry))
    } catch {
      return []
    }
  }

  private async searchEhGidList(context: SearchContext, query: string): Promise<Array<[number, string]>> {
    const response = await context.client.get('https://e-hentai.org/', {
      params: {
        f_search: query,
      },
    })
    const html = typeof response.data === 'string' ? response.data : ''
    const $ = loadHtml(html)
    const gidlist: Array<[number, string]> = []
    const seen = new Set<number>()

    $('.gl1t a, .gl3c a, .gl2c a').each((_index, element) => {
      const href = $(element).attr('href') ?? ''
      const matched = href.match(/\/g\/(\d+)\/([a-f0-9]+)/i)
      if (!matched) {
        return
      }
      const gid = Number(matched[1])
      const token = matched[2]
      if (!Number.isInteger(gid) || seen.has(gid) || !token) {
        return
      }
      seen.add(gid)
      gidlist.push([gid, token])
    })

    return gidlist
  }

  private async fetchEhMetadata(
    context: SearchContext,
    gidlist: Array<[number, string]>,
  ): Promise<Array<Record<string, unknown>>> {
    const response = await context.client.post('https://api.e-hentai.org/api.php', {
      method: 'gdata',
      gidlist,
      namespace: 1,
    })
    const list = (response.data as { gmetadata?: Array<Record<string, unknown>> } | null)?.gmetadata
    if (!Array.isArray(list)) {
      return []
    }
    return list.filter((item) => !('error' in item))
  }

  private async fetchTokenFromPage(context: SearchContext): Promise<{ gid: number; token: string } | null> {
    const gid = Number(context.input.gid)
    const pageToken = context.input.pageToken?.trim() ?? ''
    const pageNumber = Number(context.input.pageNumber)
    if (!Number.isInteger(gid) || !pageToken || !Number.isInteger(pageNumber)) {
      return null
    }

    const response = await context.client.post('https://api.e-hentai.org/api.php', {
      method: 'gtoken',
      pagelist: [[pageToken, gid, pageNumber]],
    })

    const tokenItem = (response.data as { tokenlist?: Array<Record<string, unknown>> } | null)?.tokenlist?.[0]
    if (!tokenItem || typeof tokenItem !== 'object') {
      return null
    }
    const token = typeof tokenItem.gtoken === 'string' ? tokenItem.gtoken : ''
    const gidValue = Number(tokenItem.gid)
    if (!token || !Number.isInteger(gidValue)) {
      return null
    }
    return {
      gid: gidValue,
      token,
    }
  }
}

function createHttpClient(proxyServer?: string): AxiosInstance {
  const normalizedProxy = proxyServer?.trim() ?? ''
  if (!normalizedProxy) {
    return axios.create({
      timeout: DEFAULT_TIMEOUT_MS,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Cookie: DEFAULT_COOKIES,
        Referer: 'https://e-hentai.org/',
      },
    })
  }

  const agent = normalizedProxy.startsWith('socks')
    ? new SocksProxyAgent(normalizedProxy)
    : new HttpsProxyAgent(normalizedProxy)

  return axios.create({
    timeout: DEFAULT_TIMEOUT_MS,
    proxy: false,
    httpsAgent: agent,
    httpAgent: agent,
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Cookie: DEFAULT_COOKIES,
      Referer: 'https://e-hentai.org/',
    },
  })
}

function parseInput(value: string): ParsedInput {
  if (/^\d+$/.test(value)) {
    return { type: 'id', value }
  }

  const ehMatch = value.match(/e-hentai\.org\/g\/(\d+)\/([a-f0-9]+)/i)
  if (ehMatch) {
    return {
      type: 'eh_link',
      gid: ehMatch[1],
      token: ehMatch[2],
    }
  }

  const ehPageMatch = value.match(/e-hentai\.org\/s\/([a-f0-9]+)\/(\d+)-(\d+)/i)
  if (ehPageMatch) {
    return {
      type: 'eh_page_link',
      pageToken: ehPageMatch[1],
      gid: ehPageMatch[2],
      pageNumber: ehPageMatch[3],
    }
  }

  const nhMatch = value.match(/nhentai\.net\/g\/(\d+)/i)
  if (nhMatch) {
    return {
      type: 'nh_link',
      id: nhMatch[1],
    }
  }

  return {
    type: 'keyword',
    value: value.replace(/\.(zip|rar|cbz|cbr|7z)$/i, '').trim(),
  }
}

function toNhentaiResult(raw: Record<string, unknown>): ExternalMetadataResultItemDto {
  const idValue = Number(raw.id)
  const title = asNhTitle(raw)
  const titleOriginal = asString((raw.title as Record<string, unknown> | undefined)?.japanese)
  const mediaId = asString(raw.media_id)
  const coverType = asString(
    ((raw.images as Record<string, unknown> | undefined)?.cover as Record<string, unknown> | undefined)?.t,
  )
  const coverExt = coverType === 'p' ? 'png' : 'jpg'
  const cover = mediaId ? `https://t.nhentai.net/galleries/${mediaId}/cover.${coverExt}` : null
  const postedRaw = raw.upload_date
  const posted = typeof postedRaw === 'number' || typeof postedRaw === 'string' ? String(postedRaw) : null
  const favorited = Number(raw.num_favorites)
  const pages = Number(raw.num_pages)
  const tagsRaw = Array.isArray(raw.tags) ? raw.tags : []

  return {
    source: 'nhentai',
    id: Number.isInteger(idValue) ? String(idValue) : '0',
    title: title || 'Unknown',
    title_original: titleOriginal || null,
    cover,
    url: Number.isInteger(idValue) ? `https://nhentai.net/g/${idValue}/` : 'https://nhentai.net/',
    token: '',
    tags: tagsRaw
      .map((tag) => {
        if (!tag || typeof tag !== 'object') {
          return ''
        }
        const tagType = asString((tag as Record<string, unknown>).type)
        const tagName = asString((tag as Record<string, unknown>).name)
        if (!tagType || !tagName) {
          return ''
        }
        return `${tagType}:${tagName}`
      })
      .filter(Boolean),
    pages: Number.isInteger(pages) ? pages : null,
    posted,
    rating: null,
    favorited: Number.isFinite(favorited) ? Math.max(0, Math.floor(favorited)) : null,
    raw,
  }
}

function toEhentaiResult(raw: Record<string, unknown>): ExternalMetadataResultItemDto {
  const gid = Number(raw.gid)
  const token = asString(raw.token)
  const title = asString(raw.title)
  const titleOriginal = asString(raw.title_jpn)
  const pages = Number(raw.filecount)
  const postedRaw = raw.posted
  const posted = typeof postedRaw === 'number' || typeof postedRaw === 'string' ? String(postedRaw) : null
  const rating = asString(raw.rating)

  return {
    source: 'ehentai',
    id: Number.isInteger(gid) ? String(gid) : '0',
    title: title || 'Unknown',
    title_original: titleOriginal || null,
    cover: asString(raw.thumb) || null,
    url: Number.isInteger(gid) && token ? `https://e-hentai.org/g/${gid}/${token}/` : 'https://e-hentai.org/',
    token: token || null,
    tags: (Array.isArray(raw.tags) ? raw.tags : []).map((item) => String(item ?? '')).filter(Boolean),
    pages: Number.isInteger(pages) ? pages : null,
    posted,
    rating: rating || null,
    favorited: null,
    raw,
  }
}

function asNhTitle(raw: Record<string, unknown>): string {
  const title = raw.title
  if (!title || typeof title !== 'object') {
    return ''
  }
  const titleObj = title as Record<string, unknown>
  return asString(titleObj.pretty) || asString(titleObj.english)
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
