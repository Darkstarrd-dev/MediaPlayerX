import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
import { load as loadHtml } from 'cheerio'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { SocksProxyAgent } from 'socks-proxy-agent'
import type { ExternalAuthSessionManager } from '../auth/externalAuthSessionManager'

import type {
  SearchExternalMetadataRequestDto,
  SearchExternalMetadataResponseDto,
  ExternalMetadataResultItemDto,
} from '../../../src/contracts/backend'

const DEFAULT_TIMEOUT_MS = 25_000
const DEFAULT_EHENTAI_COOKIES = 'sl=dm_1; nw=1'
const PROXY_FALLBACK_CANDIDATES = ['socks5://127.0.0.1:2080', 'http://127.0.0.1:2080'] as const
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
  externalAuthSessionManager?: ExternalAuthSessionManager
}

type MetadataSource = 'nhentai' | 'ehentai'

interface SearchContext {
  input: ParsedInput
  nhClient: AxiosInstance
  ehClient: AxiosInstance
  proxyServer?: string
  ehentaiAuthSource: 'default' | 'session'
}

interface SourceSearchDebugStep {
  at_ms: number
  stage: string
  message: string
  request?: unknown
  response?: unknown
}

interface SourceSearchDebug {
  source: MetadataSource
  started_at_ms: number
  finished_at_ms: number
  success: boolean
  result_count: number
  error_message?: string
  steps: SourceSearchDebugStep[]
}

export class MetadataScraperService {
  private readonly defaultProxyServer: string
  private readonly externalAuthSessionManager: ExternalAuthSessionManager | null

  constructor(options?: MetadataScraperServiceOptions) {
    this.defaultProxyServer = options?.defaultProxyServer?.trim() ?? ''
    this.externalAuthSessionManager = options?.externalAuthSessionManager ?? null
  }

  async search(request: SearchExternalMetadataRequestDto): Promise<SearchExternalMetadataResponseDto> {
    const source = request.source
    const inputRaw = request.input_id?.trim() || request.input_text?.trim() || ''
    if (!inputRaw) {
      return { items: [] }
    }

    const input = parseInput(inputRaw)
    const sessionCookieHeader = await this.resolveEhentaiSessionCookieHeader()
    const ehentaiCookies = buildEhentaiCookieHeader(sessionCookieHeader)
    const ehentaiAuthSource = resolveEhentaiAuthSource(sessionCookieHeader)
    const proxyCandidates = resolveProxyCandidates(request.proxy_server, this.defaultProxyServer)

    if (source === 'nhentai') {
      return this.searchBySourceWithProxyFallback(
        'nhentai',
        input,
        ehentaiCookies,
        ehentaiAuthSource,
        proxyCandidates,
      )
    }
    if (source === 'ehentai') {
      return this.searchBySourceWithProxyFallback(
        'ehentai',
        input,
        ehentaiCookies,
        ehentaiAuthSource,
        proxyCandidates,
      )
    }

    const [nhResponse, ehResponse] = await Promise.all([
      this.searchBySourceWithProxyFallback(
        'nhentai',
        input,
        ehentaiCookies,
        ehentaiAuthSource,
        proxyCandidates,
      ),
      this.searchBySourceWithProxyFallback(
        'ehentai',
        input,
        ehentaiCookies,
        ehentaiAuthSource,
        proxyCandidates,
      ),
    ])

    return {
      items: [...nhResponse.items, ...ehResponse.items],
    }
  }

  private async searchBySourceWithProxyFallback(
    source: MetadataSource,
    input: ParsedInput,
    ehentaiCookies: string,
    ehentaiAuthSource: 'default' | 'session',
    proxyCandidates: Array<string | undefined>,
  ): Promise<SearchExternalMetadataResponseDto> {
    let lastResponse: SearchExternalMetadataResponseDto | null = null

    for (let index = 0; index < proxyCandidates.length; index += 1) {
      const proxyServer = proxyCandidates[index]
      const context = this.createSearchContext(
        input,
        proxyServer,
        ehentaiCookies,
        ehentaiAuthSource,
      )
      const response = await this.searchBySource(context, source)
      lastResponse = response

      const debug = response.debug
      const shouldRetry =
        Boolean(debug) && !debug.success && index < proxyCandidates.length - 1 && isLikelyNetworkError(debug.error_message)
      if (!shouldRetry) {
        return response
      }
    }

    return lastResponse ?? { items: [] }
  }

  private createSearchContext(
    input: ParsedInput,
    proxyServer: string | undefined,
    ehentaiCookies: string,
    ehentaiAuthSource: 'default' | 'session',
  ): SearchContext {
    return {
      input,
      proxyServer,
      ehentaiAuthSource,
      nhClient: createHttpClient(proxyServer),
      ehClient: createHttpClient(proxyServer, {
        cookie: ehentaiCookies,
        referer: 'https://e-hentai.org/',
      }),
    }
  }

  private async searchBySource(
    context: SearchContext,
    source: MetadataSource,
  ): Promise<SearchExternalMetadataResponseDto> {
    const debug = createSourceSearchDebug(source)
    appendDebugStep(debug, {
      stage: `${source}.start`,
      message: '开始检索',
      request: {
        source,
        input: context.input,
        proxy_server: context.proxyServer ?? '(direct)',
        ehentai_auth_source:
          source === 'ehentai' ? context.ehentaiAuthSource : undefined,
      },
    })

    try {
      const items =
        source === 'nhentai'
          ? await this.searchNhentai(context, debug)
          : await this.searchEhentai(context, debug)
      appendDebugStep(debug, {
        stage: `${source}.result`,
        message: '检索完成',
        response: {
          item_count: items.length,
        },
      })
      finishSourceSearchDebug(debug, true, items.length)
      return {
        items,
        debug,
      }
    } catch (error) {
      const errorDetail = describeRequestError(error)
      appendDebugStep(debug, {
        stage: `${source}.failed`,
        message: '检索失败',
        response: errorDetail.response,
      })
      finishSourceSearchDebug(debug, false, 0, errorDetail.message)
      return {
        items: [],
        debug,
      }
    }
  }

  private async searchNhentai(
    context: SearchContext,
    debug: SourceSearchDebug,
  ): Promise<ExternalMetadataResultItemDto[]> {
    let entries: Array<Record<string, unknown>> = []
    if (context.input.type === 'id' || context.input.type === 'nh_link') {
      const id = context.input.value ?? context.input.id
      if (!id) {
        return []
      }
      const response = await tracedGet(
        context.nhClient,
        debug,
        'nhentai.gallery',
        `https://nhentai.net/api/gallery/${id}`,
      )
      if (response.data && typeof response.data === 'object') {
        entries = [response.data as Record<string, unknown>]
      }
    } else {
      const response = await tracedGet(
        context.nhClient,
        debug,
        'nhentai.search',
        'https://nhentai.net/api/galleries/search',
        {
          query: context.input.value,
          page: 1,
        },
      )
      const list = (response.data as { result?: Array<Record<string, unknown>> } | null)?.result
      entries = Array.isArray(list) ? list : []
    }

    return entries.map((entry) => toNhentaiResult(entry))
  }

  private async searchEhentai(
    context: SearchContext,
    debug: SourceSearchDebug,
  ): Promise<ExternalMetadataResultItemDto[]> {
    let gidlist: Array<[number, string]> = []
    if (context.input.type === 'eh_link') {
      const gid = Number(context.input.gid)
      const token = context.input.token?.trim() ?? ''
      if (Number.isInteger(gid) && token) {
        gidlist = [[gid, token]]
      }
    } else if (context.input.type === 'eh_page_link') {
      const tokenInfo = await this.fetchTokenFromPage(context, debug)
      if (tokenInfo) {
        gidlist = [[tokenInfo.gid, tokenInfo.token]]
      }
    } else if (context.input.type === 'id') {
      gidlist = await this.searchEhGidList(context, `gid:${context.input.value ?? ''}`, debug)
    } else {
      gidlist = await this.searchEhGidList(context, context.input.value ?? '', debug)
    }

    if (gidlist.length === 0) {
      appendDebugStep(debug, {
        stage: 'ehentai.gidlist.empty',
        message: '未解析到 gid/token，跳过 gdata 请求',
      })
      return []
    }

    const metadata = await this.fetchEhMetadata(context, gidlist, debug)
    return metadata.map((entry) => toEhentaiResult(entry))
  }

  private async searchEhGidList(
    context: SearchContext,
    query: string,
    debug: SourceSearchDebug,
  ): Promise<Array<[number, string]>> {
    const response = await tracedGet(
      context.ehClient,
      debug,
      'ehentai.search-page',
      'https://e-hentai.org/',
      {
        f_search: query,
      },
    )
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

    appendDebugStep(debug, {
      stage: 'ehentai.search-page.parse',
      message: '解析搜索页 gid/token',
      response: {
        gid_token_count: gidlist.length,
      },
    })

    return gidlist
  }

  private async fetchEhMetadata(
    context: SearchContext,
    gidlist: Array<[number, string]>,
    debug: SourceSearchDebug,
  ): Promise<Array<Record<string, unknown>>> {
    const response = await tracedPost(context.ehClient, debug, 'ehentai.gdata', 'https://api.e-hentai.org/api.php', {
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

  private async fetchTokenFromPage(
    context: SearchContext,
    debug: SourceSearchDebug,
  ): Promise<{ gid: number; token: string } | null> {
    const gid = Number(context.input.gid)
    const pageToken = context.input.pageToken?.trim() ?? ''
    const pageNumber = Number(context.input.pageNumber)
    if (!Number.isInteger(gid) || !pageToken || !Number.isInteger(pageNumber)) {
      return null
    }

    const response = await tracedPost(context.ehClient, debug, 'ehentai.gtoken', 'https://api.e-hentai.org/api.php', {
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

  private async resolveEhentaiSessionCookieHeader(): Promise<string | null> {
    if (!this.externalAuthSessionManager) {
      return null
    }

    const status = await this.externalAuthSessionManager.getStatus('ehentai')
    if (!status.connected) {
      return null
    }

    const ses = this.externalAuthSessionManager.getProviderSession('ehentai')
    const cookies = await ses.cookies.get({
      url: 'https://e-hentai.org/',
    })
    const header = cookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join('; ')
      .trim()

    return header.length > 0 ? header : null
  }
}

interface HttpClientHeaderOptions {
  cookie?: string
  referer?: string
}

function createHttpClient(proxyServer: string | undefined, headerOptions?: HttpClientHeaderOptions): AxiosInstance {
  const normalizedProxy = proxyServer?.trim() ?? ''
  const headers: Record<string, string> = {
    'User-Agent': DEFAULT_USER_AGENT,
  }
  if (headerOptions?.cookie) {
    headers.Cookie = headerOptions.cookie
  }
  if (headerOptions?.referer) {
    headers.Referer = headerOptions.referer
  }

  if (!normalizedProxy) {
    return axios.create({
      timeout: DEFAULT_TIMEOUT_MS,
      headers,
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
    headers,
  })
}

function buildEhentaiCookieHeader(sessionCookies?: string | null): string {
  const merged = new Map<string, string>()
  for (const [key, value] of parseCookieMap(DEFAULT_EHENTAI_COOKIES)) {
    merged.set(key, value)
  }
  for (const [key, value] of parseCookieMap(sessionCookies ?? '')) {
    merged.set(key, value)
  }
  return Array.from(merged.entries())
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')
}

function resolveEhentaiAuthSource(sessionCookies: string | null): 'default' | 'session' {
  if (sessionCookies && sessionCookies.trim().length > 0) {
    return 'session'
  }
  return 'default'
}

function parseCookieMap(rawCookies: string): Map<string, string> {
  const sanitized = Array.from(rawCookies)
    .map((char) => {
      const code = char.charCodeAt(0)
      return code < 0x20 || code === 0x7f ? ' ' : char
    })
    .join('')
    .trim()
  const map = new Map<string, string>()
  for (const segment of sanitized.split(';')) {
    const token = segment.trim()
    if (!token) {
      continue
    }
    const separator = token.indexOf('=')
    if (separator <= 0) {
      continue
    }
    const key = token.slice(0, separator).trim()
    const value = token.slice(separator + 1).trim()
    if (!key) {
      continue
    }
    map.set(key, value)
  }
  return map
}

function resolveProxyCandidates(
  rawRequestProxyServer: string | undefined,
  defaultProxyServer: string,
): Array<string | undefined> {
  const requestProxyServer = rawRequestProxyServer?.trim() ?? ''
  if (requestProxyServer) {
    return [requestProxyServer]
  }

  const candidates: Array<string | undefined> = [
    defaultProxyServer.trim() || undefined,
    undefined,
    ...PROXY_FALLBACK_CANDIDATES,
  ]

  const unique = new Map<string, string | undefined>()
  for (const candidate of candidates) {
    const normalized = candidate?.trim() || undefined
    const key = normalized ?? '__direct__'
    if (!unique.has(key)) {
      unique.set(key, normalized)
    }
  }

  return Array.from(unique.values())
}

function isLikelyNetworkError(rawMessage: string | undefined): boolean {
  const message = (rawMessage ?? '').toLowerCase()
  if (!message) {
    return false
  }

  return [
    'econnrefused',
    'econnreset',
    'enotfound',
    'eai_again',
    'etimedout',
    'socket hang up',
    'proxy',
    'connect timeout',
    'network error',
    'tunneling socket',
  ].some((keyword) => message.includes(keyword))
}

function createSourceSearchDebug(source: MetadataSource): SourceSearchDebug {
  return {
    source,
    started_at_ms: Date.now(),
    finished_at_ms: Date.now(),
    success: false,
    result_count: 0,
    steps: [],
  }
}

function finishSourceSearchDebug(
  debug: SourceSearchDebug,
  success: boolean,
  resultCount: number,
  errorMessage?: string,
): void {
  debug.finished_at_ms = Date.now()
  debug.success = success
  debug.result_count = resultCount
  if (errorMessage) {
    debug.error_message = errorMessage
  }
}

function appendDebugStep(
  debug: SourceSearchDebug,
  step: Omit<SourceSearchDebugStep, 'at_ms'>,
): void {
  debug.steps.push({
    at_ms: Date.now(),
    ...step,
  })
}

async function tracedGet(
  client: AxiosInstance,
  debug: SourceSearchDebug,
  stage: string,
  url: string,
  params?: Record<string, unknown>,
): Promise<AxiosResponse<unknown>> {
  appendDebugStep(debug, {
    stage: `${stage}.request`,
    message: '开始请求',
    request: {
      method: 'GET',
      url,
      params: params ?? null,
    },
  })

  try {
    const response = await client.get(url, {
      params,
    })
    appendDebugStep(debug, {
      stage: `${stage}.response`,
      message: '请求成功',
      response: summarizeResponse(response),
    })
    return response
  } catch (error) {
    const detail = describeRequestError(error)
    appendDebugStep(debug, {
      stage: `${stage}.response`,
      message: '请求失败',
      response: detail.response,
    })
    throw error
  }
}

async function tracedPost(
  client: AxiosInstance,
  debug: SourceSearchDebug,
  stage: string,
  url: string,
  data: Record<string, unknown>,
): Promise<AxiosResponse<unknown>> {
  appendDebugStep(debug, {
    stage: `${stage}.request`,
    message: '开始请求',
    request: {
      method: 'POST',
      url,
      body: data,
    },
  })

  try {
    const response = await client.post(url, data)
    appendDebugStep(debug, {
      stage: `${stage}.response`,
      message: '请求成功',
      response: summarizeResponse(response),
    })
    return response
  } catch (error) {
    const detail = describeRequestError(error)
    appendDebugStep(debug, {
      stage: `${stage}.response`,
      message: '请求失败',
      response: detail.response,
    })
    throw error
  }
}

function summarizeResponse(response: AxiosResponse<unknown>): Record<string, unknown> {
  return {
    status: response.status,
    status_text: response.statusText,
    headers: pickResponseHeaders(response.headers),
    body_preview: toResponsePreview(response.data),
  }
}

function describeRequestError(error: unknown): {
  message: string
  response: Record<string, unknown>
} {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    const statusText = error.response?.statusText
    const detailMessage = [
      error.message,
      error.code ? `code=${error.code}` : '',
      status ? `status=${status}` : '',
      statusText ? `status_text=${statusText}` : '',
    ]
      .filter(Boolean)
      .join(' | ')

    return {
      message: detailMessage || '请求失败',
      response: {
        status,
        status_text: statusText,
        code: error.code,
        headers: pickResponseHeaders(error.response?.headers),
        body_preview: toResponsePreview(error.response?.data),
      },
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      response: {
        message: error.message,
        name: error.name,
      },
    }
  }

  return {
    message: String(error),
    response: {
      message: String(error),
    },
  }
}

function pickResponseHeaders(headers: unknown): Record<string, string> {
  const target = headers && typeof headers === 'object' ? (headers as Record<string, unknown>) : {}
  const selectedKeys = ['content-type', 'content-length', 'server', 'date', 'cf-ray']
  const result: Record<string, string> = {}
  for (const key of selectedKeys) {
    const value = target[key] ?? target[key.toLowerCase()] ?? target[key.toUpperCase()]
    if (typeof value === 'string' && value.trim()) {
      result[key] = value
    }
  }
  return result
}

function toResponsePreview(value: unknown): string {
  if (typeof value === 'string') {
    return value.length > 1200 ? `${value.slice(0, 1200)}...` : value
  }
  try {
    const serialized = JSON.stringify(value)
    if (!serialized) {
      return ''
    }
    return serialized.length > 1200 ? `${serialized.slice(0, 1200)}...` : serialized
  } catch {
    return ''
  }
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
