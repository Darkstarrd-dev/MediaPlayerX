import { describe, expect, it } from 'vitest'

import type { MediaLocatorDto } from '../../../src/contracts/backend'
import { MediaTokenService } from './mediaTokenService'

const IMAGE_LOCATOR: MediaLocatorDto = {
  kind: 'filesystem',
  absolute_path: 'D:/sample.jpg',
  extension: '.jpg',
  media_type: 'image',
  mime_type: 'image/jpeg',
}

describe('MediaTokenService', () => {
  it('命中令牌时返回记录并更新命中审计', () => {
    const service = new MediaTokenService(200)
    const issued = service.issueToken(IMAGE_LOCATOR, 'image/jpeg', 1_000)

    const record = service.requireRecord(issued.token, 1_050)
    expect(record).toMatchObject({
      locator: IMAGE_LOCATOR,
      mimeType: 'image/jpeg',
      expiresAtMs: 1_200,
    })

    const audit = service.readAuditSnapshot(1_050)
    expect(audit).toMatchObject({
      tokenReads: 1,
      tokenHits: 1,
      tokenMisses: 0,
      tokenExpired: 0,
      tokenCleanupRemoved: 0,
      tokenActive: 1,
    })
  })

  it('过期令牌会记为 expired，清理计数可累计并与 miss 区分', () => {
    const service = new MediaTokenService(100)
    const first = service.issueToken(IMAGE_LOCATOR, 'image/jpeg', 1_000)
    service.issueToken(
      {
        ...IMAGE_LOCATOR,
        absolute_path: 'D:/another.jpg',
      },
      'image/jpeg',
      1_000,
    )

    expect(() => service.requireRecord(first.token, 1_200)).toThrow('媒体资源令牌已过期')
    expect(() => service.requireRecord(first.token, 1_200)).toThrow('媒体资源令牌不存在')

    const audit = service.readAuditSnapshot(1_200)
    expect(audit).toMatchObject({
      tokenReads: 2,
      tokenHits: 0,
      tokenMisses: 1,
      tokenExpired: 1,
      tokenCleanupRemoved: 1,
      tokenActive: 0,
    })
  })
})
