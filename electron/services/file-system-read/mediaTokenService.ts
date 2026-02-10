import { randomUUID } from 'node:crypto'

import type { MediaLocatorDto } from '../../../src/contracts/backend'

export interface MediaTokenRecord {
  locator: MediaLocatorDto
  mimeType: string
  expiresAtMs: number
}

export interface MediaTokenAuditSnapshot {
  tokenReads: number
  tokenHits: number
  tokenMisses: number
  tokenExpired: number
  tokenCleanupRemoved: number
  tokenActive: number
}

export class MediaTokenService {
  private readonly mediaTokenIndex = new Map<string, MediaTokenRecord>()

  private tokenReads = 0

  private tokenHits = 0

  private tokenMisses = 0

  private tokenExpired = 0

  private tokenCleanupRemoved = 0

  constructor(private readonly tokenTtlMs: number) {}

  cleanupExpiredTokens(nowMs = Date.now()): void {
    let removed = 0
    for (const [token, record] of this.mediaTokenIndex) {
      if (record.expiresAtMs <= nowMs) {
        this.mediaTokenIndex.delete(token)
        removed += 1
      }
    }
    this.tokenCleanupRemoved += removed
  }

  issueToken(locator: MediaLocatorDto, mimeType: string, nowMs = Date.now()): { token: string; expiresAtMs: number } {
    const token = randomUUID()
    const expiresAtMs = nowMs + this.tokenTtlMs

    this.mediaTokenIndex.set(token, {
      locator,
      mimeType,
      expiresAtMs,
    })

    return {
      token,
      expiresAtMs,
    }
  }

  requireRecord(token: string, nowMs = Date.now()): MediaTokenRecord {
    this.cleanupExpiredTokens(nowMs)
    this.tokenReads += 1

    const record = this.mediaTokenIndex.get(token)
    if (!record) {
      this.tokenMisses += 1
      throw new Error('媒体资源令牌不存在')
    }

    if (record.expiresAtMs <= nowMs) {
      this.tokenExpired += 1
      this.mediaTokenIndex.delete(token)
      throw new Error('媒体资源令牌已过期')
    }

    this.tokenHits += 1
    return record
  }

  clearActiveTokens(): void {
    this.mediaTokenIndex.clear()
  }

  readAuditSnapshot(nowMs = Date.now()): MediaTokenAuditSnapshot {
    this.cleanupExpiredTokens(nowMs)

    return {
      tokenReads: this.tokenReads,
      tokenHits: this.tokenHits,
      tokenMisses: this.tokenMisses,
      tokenExpired: this.tokenExpired,
      tokenCleanupRemoved: this.tokenCleanupRemoved,
      tokenActive: this.mediaTokenIndex.size,
    }
  }
}
