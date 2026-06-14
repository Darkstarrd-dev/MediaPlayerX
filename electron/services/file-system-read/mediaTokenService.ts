import { randomUUID } from "node:crypto";

import type { MediaLocatorDto } from "../../../src/contracts/backend";

export interface MediaTokenRecord {
  locator: MediaLocatorDto;
  mimeType: string;
  expiresAtMs: number;
  locatorKey: string;
}

// 同一资源（locator + mime）的稳定标识：用于复用未过期 token，使 resource_url 稳定，
// 从而命中浏览器/解码缓存，消除连续翻页时同一张图被反复 resolve→新 URL→重复 fetch+decode。
function buildLocatorKey(locator: MediaLocatorDto, mimeType: string): string {
  if (locator.kind === "filesystem") {
    return `fs|${mimeType}|${locator.absolute_path}`;
  }
  return `ar|${mimeType}|${locator.archive_path}|${locator.entry_name}`;
}

export interface MediaTokenAuditSnapshot {
  tokenReads: number;
  tokenHits: number;
  tokenMisses: number;
  tokenExpired: number;
  tokenCleanupRemoved: number;
  tokenActive: number;
}

export class MediaTokenService {
  private readonly mediaTokenIndex = new Map<string, MediaTokenRecord>();

  // locatorKey -> token：按资源复用 token，避免同一图反复签发新 URL
  private readonly tokenByLocatorKey = new Map<string, string>();

  private tokenReads = 0;

  private tokenHits = 0;

  private tokenMisses = 0;

  private tokenExpired = 0;

  private tokenCleanupRemoved = 0;

  constructor(private readonly tokenTtlMs: number) {}

  // 同时维护反向索引，删除 token 时清掉其 locatorKey 映射（仅当仍指向该 token）
  private deleteToken(token: string): void {
    const record = this.mediaTokenIndex.get(token);
    this.mediaTokenIndex.delete(token);
    if (record && this.tokenByLocatorKey.get(record.locatorKey) === token) {
      this.tokenByLocatorKey.delete(record.locatorKey);
    }
  }

  cleanupExpiredTokens(nowMs = Date.now()): void {
    let removed = 0;
    for (const [token, record] of this.mediaTokenIndex) {
      if (record.expiresAtMs <= nowMs) {
        this.deleteToken(token);
        removed += 1;
      }
    }
    this.tokenCleanupRemoved += removed;
  }

  issueToken(
    locator: MediaLocatorDto,
    mimeType: string,
    nowMs = Date.now(),
  ): { token: string; expiresAtMs: number } {
    const locatorKey = buildLocatorKey(locator, mimeType);

    // 复用同一资源的未过期 token，使 resource_url 稳定、命中缓存；并遏制 token 无界增长
    const existingToken = this.tokenByLocatorKey.get(locatorKey);
    if (existingToken) {
      const existingRecord = this.mediaTokenIndex.get(existingToken);
      if (existingRecord && existingRecord.expiresAtMs > nowMs) {
        const expiresAtMs = nowMs + this.tokenTtlMs;
        existingRecord.expiresAtMs = expiresAtMs;
        return { token: existingToken, expiresAtMs };
      }
      this.deleteToken(existingToken);
    }

    const token = randomUUID();
    const expiresAtMs = nowMs + this.tokenTtlMs;

    this.mediaTokenIndex.set(token, {
      locator,
      mimeType,
      expiresAtMs,
      locatorKey,
    });
    this.tokenByLocatorKey.set(locatorKey, token);

    return {
      token,
      expiresAtMs,
    };
  }

  requireRecord(token: string, nowMs = Date.now()): MediaTokenRecord {
    this.tokenReads += 1;

    const record = this.mediaTokenIndex.get(token);
    if (!record) {
      // miss 分支也执行清理，避免无效 token 高频探测导致过期记录长期滞留。
      this.cleanupExpiredTokens(nowMs);
      this.tokenMisses += 1;
      throw new Error("媒体资源令牌不存在");
    }

    if (record.expiresAtMs <= nowMs) {
      this.tokenExpired += 1;
      this.deleteToken(token);
      this.cleanupExpiredTokens(nowMs);
      throw new Error("媒体资源令牌已过期");
    }

    record.expiresAtMs = nowMs + this.tokenTtlMs;
    this.cleanupExpiredTokens(nowMs);
    this.tokenHits += 1;
    return record;
  }

  clearActiveTokens(): void {
    this.mediaTokenIndex.clear();
    this.tokenByLocatorKey.clear();
  }

  readAuditSnapshot(nowMs = Date.now()): MediaTokenAuditSnapshot {
    this.cleanupExpiredTokens(nowMs);

    return {
      tokenReads: this.tokenReads,
      tokenHits: this.tokenHits,
      tokenMisses: this.tokenMisses,
      tokenExpired: this.tokenExpired,
      tokenCleanupRemoved: this.tokenCleanupRemoved,
      tokenActive: this.mediaTokenIndex.size,
    };
  }
}
