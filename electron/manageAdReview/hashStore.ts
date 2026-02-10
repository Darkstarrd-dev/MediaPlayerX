import { createHash } from 'node:crypto'

import type { KnownHashStore } from './types'

function normalizeHash(hash: string): string {
  return hash.trim().toLowerCase()
}

export function computeSha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex')
}

export class InMemoryKnownHashStore implements KnownHashStore {
  private readonly hashes = new Set<string>()

  constructor(initialHashes: string[] = []) {
    for (const hash of initialHashes) {
      const normalized = normalizeHash(hash)
      if (normalized) {
        this.hashes.add(normalized)
      }
    }
  }

  async has(hash: string): Promise<boolean> {
    return this.hashes.has(normalizeHash(hash))
  }

  async addMany(hashes: string[]): Promise<void> {
    for (const hash of hashes) {
      const normalized = normalizeHash(hash)
      if (normalized) {
        this.hashes.add(normalized)
      }
    }
  }

  snapshot(): string[] {
    return [...this.hashes]
  }
}
