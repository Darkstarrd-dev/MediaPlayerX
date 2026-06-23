import {
  mediaAccessAuditResponseSchema,
  resolveMediaResourceResponseSchema,
  type MediaAccessAuditResponseDto,
  type MediaLocatorDto,
  type ResolveMediaResourceRequestDto,
  type ResolveMediaResourceResponseDto,
} from "../../../src/contracts/backend";
import {
  assertLocatorAllowed,
  MediaAccessError,
  type MediaAccessGuardContext,
  type MediaAuditRejectReason,
} from "../../fileSystemMediaAccessGuard";
import {
  readArchiveEntryMedia,
  readArchiveEntryMediaStream,
  readFilesystemMedia,
  readFilesystemMediaStream,
  type MediaProtocolResponsePayload,
  type MediaProtocolStreamResponsePayload,
} from "../../fileSystemMediaReaders";
import {
  detectMimeTypeByExtension,
  normalizeAllowlistKey,
} from "../../fileSystemServiceHelpers";
import { maybeResolveFullscreenLocator } from "../../fileSystemFullscreenResizer";
import { maybeResolveThumbnailLocator } from "../../fileSystemThumbnailResolver";
import type { MediaTokenRecord, MediaTokenService } from "./mediaTokenService";
import type { RuntimeDependencySnapshot } from "./runtimeDependencyService";

interface MediaAccessAuditCounters {
  resolveRequests: number;
  resolveGranted: number;
  resolveDeniedByReason: Record<string, number>;
}

interface MediaResourceServiceOptions {
  mediaProtocolScheme: string;
  thumbnailCacheRootDir: string;
  archiveNormalizeRecheckMs: number;
  mediaTokenService: MediaTokenService;
  ensureSnapshotLoaded: () => Promise<unknown>;
  refreshArchiveIndexesForPaths: (
    archivePaths: Iterable<string>,
  ) => Promise<void>;
  buildMediaAccessContext: () => MediaAccessGuardContext;
  ensureRuntimeDependencies: () => Promise<RuntimeDependencySnapshot>;
  readImageBufferForThumbnail: (locator: MediaLocatorDto) => Promise<Buffer>;
  onThumbnailRenderingStart: (taskKey: string) => void;
  onThumbnailRenderingProgress: (
    taskKey: string,
    payload: { progress: number | null; message: string | null },
  ) => void;
  onThumbnailRenderingEnd: (taskKey: string) => void;
  runWithThumbnailCpuToken?: <T>(
    taskName: string,
    task: () => Promise<T>,
  ) => Promise<T>;
  withArchiveReadLock?: <T>(
    archivePath: string,
    task: () => Promise<T>,
  ) => Promise<T>;
  hasPendingArchiveNormalization: () => boolean;
  scheduleArchiveNormalizationDrain: (delayMs: number) => void;
  getZipEntryIndexByPath: () => Map<
    string,
    Map<string, import("../../zipArchiveHelpers").ZipCentralEntry>
  >;
}

export class MediaResourceService {
  private mediaAudit: MediaAccessAuditCounters = {
    resolveRequests: 0,
    resolveGranted: 0,
    resolveDeniedByReason: {},
  };

  private resolveDeniedLogAtByKey = new Map<string, number>();

  private archiveIndexRefreshByPath = new Map<string, Promise<void>>();

  constructor(private readonly options: MediaResourceServiceOptions) {}

  private countResolveDenied(reason: MediaAuditRejectReason): void {
    this.mediaAudit.resolveDeniedByReason[reason] =
      (this.mediaAudit.resolveDeniedByReason[reason] ?? 0) + 1;
  }

  private shouldLogResolveDenied(
    reason: MediaAuditRejectReason,
    pathHint: string,
  ): boolean {
    const now = Date.now();
    const key = `${reason}|${normalizeAllowlistKey(pathHint)}`;
    const previousAt = this.resolveDeniedLogAtByKey.get(key);
    if (typeof previousAt === "number" && now - previousAt < 2_500) {
      return false;
    }
    this.resolveDeniedLogAtByKey.set(key, now);

    if (this.resolveDeniedLogAtByKey.size > 2_048) {
      this.resolveDeniedLogAtByKey.clear();
    }

    return true;
  }

  private async refreshArchiveIndexForPath(archivePath: string): Promise<void> {
    const key = normalizeAllowlistKey(archivePath);
    const existing = this.archiveIndexRefreshByPath.get(key);
    if (existing) {
      await existing;
      return;
    }

    const refreshPromise = this.options
      .refreshArchiveIndexesForPaths([archivePath])
      .catch((error) => {
        console.warn("resolveMediaResource archive index refresh failed", {
          archivePath,
          reason:
            error instanceof Error && error.message
              ? error.message
              : String(error),
        });
      })
      .finally(() => {
        this.archiveIndexRefreshByPath.delete(key);
      });

    this.archiveIndexRefreshByPath.set(key, refreshPromise);
    await refreshPromise;
  }

  private async assertLocatorAllowedWithRecovery(
    locator: MediaLocatorDto,
  ): Promise<MediaLocatorDto> {
    try {
      return await assertLocatorAllowed(
        locator,
        this.options.buildMediaAccessContext(),
      );
    } catch (error) {
      if (
        !(error instanceof MediaAccessError) ||
        error.reason !== "archive_entry_not_allowlisted" ||
        locator.kind !== "archive-entry"
      ) {
        throw error;
      }

      await this.refreshArchiveIndexForPath(locator.archive_path);
      return assertLocatorAllowed(
        locator,
        this.options.buildMediaAccessContext(),
      );
    }
  }

  async readMediaAccessAudit(): Promise<MediaAccessAuditResponseDto> {
    const tokenAudit = this.options.mediaTokenService.readAuditSnapshot();

    const deniedTotal = Object.values(
      this.mediaAudit.resolveDeniedByReason,
    ).reduce((sum, value) => sum + value, 0);
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
    });
  }

  async resolveMediaResource(
    request: ResolveMediaResourceRequestDto,
  ): Promise<ResolveMediaResourceResponseDto> {
    await this.options.ensureSnapshotLoaded();
    this.options.mediaTokenService.cleanupExpiredTokens();

    this.mediaAudit.resolveRequests += 1;

    let locator: MediaLocatorDto;
    try {
      locator = await this.assertLocatorAllowedWithRecovery(request.locator);
    } catch (error) {
      if (error instanceof MediaAccessError) {
        this.countResolveDenied(error.reason);
        const pathHint =
          request.locator.kind === "filesystem"
            ? request.locator.absolute_path
            : request.locator.archive_path;
        if (this.shouldLogResolveDenied(error.reason, pathHint)) {
          console.warn("resolveMediaResource denied", {
            reason: error.reason,
            message: error.message,
          });
        }
      } else {
        this.countResolveDenied("filesystem_file_missing");
      }
      throw error;
    }

    const thumbnailLocator = await maybeResolveThumbnailLocator({
      locator,
      request,
      thumbnailCacheRootDir: this.options.thumbnailCacheRootDir,
      ensureRuntimeDependencies: this.options.ensureRuntimeDependencies,
      readImageBufferForThumbnail: this.options.readImageBufferForThumbnail,
      onRenderingStart: this.options.onThumbnailRenderingStart,
      onRenderingProgress: this.options.onThumbnailRenderingProgress,
      onRenderingEnd: this.options.onThumbnailRenderingEnd,
      runWithCpuToken: this.options.runWithThumbnailCpuToken,
      hasPendingArchiveNormalization:
        this.options.hasPendingArchiveNormalization,
      scheduleArchiveNormalizationDrain:
        this.options.scheduleArchiveNormalizationDrain,
      archiveNormalizeRecheckMs: this.options.archiveNormalizeRecheckMs,
    });
    if (thumbnailLocator) {
      locator = thumbnailLocator;
    }

    if (!thumbnailLocator && request.fullscreen_resize) {
      const fullscreenLocator = await maybeResolveFullscreenLocator({
        locator,
        request,
        thumbnailCacheRootDir: this.options.thumbnailCacheRootDir,
        ensureRuntimeDependencies: this.options.ensureRuntimeDependencies,
        readImageBufferForThumbnail: this.options.readImageBufferForThumbnail,
        runWithCpuToken: this.options.runWithThumbnailCpuToken,
      });
      if (fullscreenLocator) {
        locator = fullscreenLocator;
      }
    }

    const mimeType =
      locator.mime_type ||
      detectMimeTypeByExtension(locator.extension, locator.media_type);
    const { token, expiresAtMs } = this.options.mediaTokenService.issueToken(
      locator,
      mimeType,
    );

    this.mediaAudit.resolveGranted += 1;

    return resolveMediaResourceResponseSchema.parse({
      resource_url: `${this.options.mediaProtocolScheme}://resource/${encodeURIComponent(token)}`,
      mime_type: mimeType,
      expires_at_ms: expiresAtMs,
    });
  }

  async readMediaResourceByToken(
    token: string,
    rangeHeader: string | null,
  ): Promise<MediaProtocolResponsePayload> {
    const record = this.requireMediaTokenRecord(token);

    const locator = record.locator;
    if (locator.kind === "filesystem") {
      return readFilesystemMedia(locator, record.mimeType, rangeHeader);
    }

    const readTask = () =>
      readArchiveEntryMedia(
        locator,
        record.mimeType,
        this.options.getZipEntryIndexByPath(),
      );
    if (this.options.withArchiveReadLock) {
      return await this.options.withArchiveReadLock(
        locator.archive_path,
        readTask,
      );
    }
    return await readTask();
  }

  async readMediaResourceByTokenStream(
    token: string,
    rangeHeader: string | null,
    signal?: AbortSignal | null,
  ): Promise<MediaProtocolStreamResponsePayload> {
    const record = this.requireMediaTokenRecord(token);

    const locator = record.locator;
    if (locator.kind === "filesystem") {
      return readFilesystemMediaStream(
        locator,
        record.mimeType,
        rangeHeader,
        signal,
      );
    }

    const readTask = () =>
      readArchiveEntryMediaStream(
        locator,
        record.mimeType,
        this.options.getZipEntryIndexByPath(),
        signal,
      );
    if (this.options.withArchiveReadLock) {
      return await this.options.withArchiveReadLock(
        locator.archive_path,
        readTask,
      );
    }
    return await readTask();
  }

  private requireMediaTokenRecord(token: string): MediaTokenRecord {
    return this.options.mediaTokenService.requireRecord(token);
  }
}
