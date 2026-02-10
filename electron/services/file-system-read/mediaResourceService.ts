import {
  mediaAccessAuditResponseSchema,
  resolveMediaResourceResponseSchema,
  type MediaAccessAuditResponseDto,
  type MediaLocatorDto,
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
} from '../../../src/contracts/backend'
import {
  assertLocatorAllowed,
  MediaAccessError,
  type MediaAccessGuardContext,
  type MediaAuditRejectReason,
} from '../../fileSystemMediaAccessGuard'
import {
  readArchiveEntryMedia,
  readArchiveEntryMediaStream,
  readFilesystemMedia,
  readFilesystemMediaStream,
  type MediaProtocolResponsePayload,
  type MediaProtocolStreamResponsePayload,
} from '../../fileSystemMediaReaders'
import { detectMimeTypeByExtension, normalizeAllowlistKey } from '../../fileSystemServiceHelpers'
import { maybeResolveThumbnailLocator } from '../../fileSystemThumbnailResolver'
import type { MediaTokenRecord, MediaTokenService } from './mediaTokenService'
import type { RuntimeDependencySnapshot } from './runtimeDependencyService'

interface MediaAccessAuditCounters {
  resolveRequests: number
  resolveGranted: number
  resolveDeniedByReason: Record<string, number>
}

interface MediaResourceServiceOptions {
  mediaProtocolScheme: string
  thumbnailCacheRootDir: string
  archiveNormalizeRecheckMs: number
  mediaTokenService: MediaTokenService
  ensureSnapshotLoaded: () => Promise<unknown>
  markInteractiveRead: () => void
  buildMediaAccessContext: () => MediaAccessGuardContext
  ensureRuntimeDependencies: () => Promise<RuntimeDependencySnapshot>
  readImageBufferForThumbnail: (locator: MediaLocatorDto) => Promise<Buffer>
  onThumbnailRenderingStart: () => void
  onThumbnailRenderingEnd: () => void
  hasPendingArchiveNormalization: () => boolean
  scheduleArchiveNormalizationDrain: (delayMs: number) => void
  getZipEntryIndexByPath: () => Map<string, Map<string, import('../../zipArchiveHelpers').ZipCentralEntry>>
}

export class MediaResourceService {
  private mediaAudit: MediaAccessAuditCounters = {
    resolveRequests: 0,
    resolveGranted: 0,
    resolveDeniedByReason: {},
  }

  private resolveDeniedLogAtByKey = new Map<string, number>()

  constructor(private readonly options: MediaResourceServiceOptions) {}

  private countResolveDenied(reason: MediaAuditRejectReason): void {
    this.mediaAudit.resolveDeniedByReason[reason] = (this.mediaAudit.resolveDeniedByReason[reason] ?? 0) + 1
  }

  private shouldLogResolveDenied(reason: MediaAuditRejectReason, pathHint: string): boolean {
    const now = Date.now()
    const key = `${reason}|${normalizeAllowlistKey(pathHint)}`
    const previousAt = this.resolveDeniedLogAtByKey.get(key)
    if (typeof previousAt === 'number' && now - previousAt < 2_500) {
      return false
    }
    this.resolveDeniedLogAtByKey.set(key, now)

    if (this.resolveDeniedLogAtByKey.size > 2_048) {
      this.resolveDeniedLogAtByKey.clear()
    }

    return true
  }

  async readMediaAccessAudit(): Promise<MediaAccessAuditResponseDto> {
    const tokenAudit = this.options.mediaTokenService.readAuditSnapshot()

    const deniedTotal = Object.values(this.mediaAudit.resolveDeniedByReason).reduce((sum, value) => sum + value, 0)
    return mediaAccessAuditResponseSchema.parse({
      resolve_requests: this.mediaAudit.resolveRequests,
      resolve_granted: this.mediaAudit.resolveGranted,
      resolve_denied_total: deniedTotal,
      resolve_denied_by_reason: this.mediaAudit.resolveDeniedByReason,
      token_reads: tokenAudit.tokenReads,
      token_hits: tokenAudit.tokenHits,
      token_misses: tokenAudit.tokenMisses,
      token_expired: tokenAudit.tokenExpired,
      token_cleanup_removed: tokenAudit.tokenCleanupRemoved,
      token_active: tokenAudit.tokenActive,
      generated_at_ms: Date.now(),
    })
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
  ): Promise<ResolveMediaResourceResponseDto> {
    this.options.markInteractiveRead()
    await this.options.ensureSnapshotLoaded()
    this.options.mediaTokenService.cleanupExpiredTokens()

    this.mediaAudit.resolveRequests += 1

    let locator: MediaLocatorDto
    try {
      locator = await assertLocatorAllowed(request.locator, this.options.buildMediaAccessContext())
    } catch (error) {
      if (error instanceof MediaAccessError) {
        this.countResolveDenied(error.reason)
        const pathHint =
          request.locator.kind === 'filesystem' ? request.locator.absolute_path : request.locator.archive_path
        if (this.shouldLogResolveDenied(error.reason, pathHint)) {
          console.warn('resolveMediaResource denied', {
            reason: error.reason,
            message: error.message,
          })
        }
      } else {
        this.countResolveDenied('filesystem_file_missing')
      }
      throw error
    }

    const thumbnailLocator = await maybeResolveThumbnailLocator({
      locator,
      request,
      thumbnailCacheRootDir: this.options.thumbnailCacheRootDir,
      ensureRuntimeDependencies: this.options.ensureRuntimeDependencies,
      readImageBufferForThumbnail: this.options.readImageBufferForThumbnail,
      onRenderingStart: this.options.onThumbnailRenderingStart,
      onRenderingEnd: this.options.onThumbnailRenderingEnd,
      hasPendingArchiveNormalization: this.options.hasPendingArchiveNormalization,
      scheduleArchiveNormalizationDrain: this.options.scheduleArchiveNormalizationDrain,
      archiveNormalizeRecheckMs: this.options.archiveNormalizeRecheckMs,
    })
    if (thumbnailLocator) {
      locator = thumbnailLocator
    }

    const mimeType = locator.mime_type || detectMimeTypeByExtension(locator.extension, locator.media_type)
    const { token, expiresAtMs } = this.options.mediaTokenService.issueToken(locator, mimeType)

    this.mediaAudit.resolveGranted += 1

    return resolveMediaResourceResponseSchema.parse({
      resource_url: `${this.options.mediaProtocolScheme}://resource/${encodeURIComponent(token)}`,
      mime_type: mimeType,
      expires_at_ms: expiresAtMs,
    })
  }

  async readMediaResourceByToken(
    token: string,
    rangeHeader: string | null,
  ): Promise<MediaProtocolResponsePayload> {
    const record = this.requireMediaTokenRecord(token)

    const locator = record.locator
    if (locator.kind === 'filesystem') {
      return readFilesystemMedia(locator, record.mimeType, rangeHeader)
    }

    return readArchiveEntryMedia(locator, record.mimeType, this.options.getZipEntryIndexByPath())
  }

  async readMediaResourceByTokenStream(
    token: string,
    rangeHeader: string | null,
    signal?: AbortSignal | null,
  ): Promise<MediaProtocolStreamResponsePayload> {
    const record = this.requireMediaTokenRecord(token)

    const locator = record.locator
    if (locator.kind === 'filesystem') {
      return readFilesystemMediaStream(locator, record.mimeType, rangeHeader, signal)
    }

    return readArchiveEntryMediaStream(locator, record.mimeType, this.options.getZipEntryIndexByPath(), signal)
  }

  private requireMediaTokenRecord(token: string): MediaTokenRecord {
    return this.options.mediaTokenService.requireRecord(token)
  }
}
