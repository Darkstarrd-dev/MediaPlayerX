import path from 'node:path'

import {
  manageAdReviewTaskExecutionSchema,
  type ImageItemDto,
  type ManageAdReviewImageSourceDto,
  type ManageAdReviewSourceDistributionDto,
  type ManageAdReviewTaskAuditDto,
  type ManageAdReviewTaskExecutionDto,
  type StartManageAdReviewRequestDto,
} from '../../../src/contracts/backend'
import type { ManageAdReviewDecision } from '../../manageAdReview'

const DEFAULT_REVIEW_MAX_CONCURRENCY = 4
const REVIEW_MAX_CONCURRENCY_LIMIT = 12
export const DEFAULT_VISION_TEST_TIMEOUT_MS = 12_000
export const MAX_VISION_TEST_IMAGE_BYTES = 12 * 1024 * 1024
const INVALID_DESCRIPTION_PATTERN =
  /(cannot|can't|unable|not able|as an ai|无法|不能|看不到|无法查看|无法识别|无法描述)/i
const RED_COLOR_PATTERN = /\b(red|crimson|scarlet|ruby|maroon|reddish)\b|红色?|赤红|绯红|#?ff0000/i

export interface ParsedSidebarNodeRef {
  kind: 'folder' | 'package' | 'video'
  pathKey: string
}

export function parseSidebarNodeId(nodeId: string): ParsedSidebarNodeRef | null {
  const delimiterIndex = nodeId.indexOf(':')
  if (delimiterIndex <= 0) {
    return null
  }

  const kind = nodeId.slice(0, delimiterIndex)
  if (kind !== 'folder' && kind !== 'package' && kind !== 'video') {
    return null
  }

  const pathKey = nodeId.slice(delimiterIndex + 1)
  if (!pathKey) {
    return null
  }

  return {
    kind,
    pathKey,
  }
}

export function pathKeyHasPrefix(pathKey: string, prefix: string): boolean {
  if (pathKey === prefix) {
    return true
  }
  return pathKey.startsWith(`${prefix}/`)
}

export function normalizeHashes(input: unknown): Set<string> {
  if (!Array.isArray(input)) {
    return new Set()
  }

  const next = new Set<string>()
  for (const value of input) {
    if (typeof value !== 'string') {
      continue
    }
    const normalized = value.trim().toLowerCase()
    if (normalized.length > 0) {
      next.add(normalized)
    }
  }

  return next
}

export function resolveCandidateSource(source: ManageAdReviewDecision['source']): 'known-hash' | 'llm' {
  return source === 'known-hash' ? 'known-hash' : 'llm'
}

export function toImageFileName(image: ImageItemDto): string | null {
  if (image.media_locator.kind === 'filesystem') {
    return path.basename(image.media_locator.absolute_path)
  }
  return path.basename(image.media_locator.entry_name)
}

function normalizeImageSource(source: ManageAdReviewDecision['source']): ManageAdReviewImageSourceDto {
  if (source === 'llm-error') {
    return 'llm-error'
  }
  if (source === 'strategy-skip') {
    return 'strategy-skip'
  }
  if (source === 'known-hash') {
    return 'known-hash'
  }
  return 'llm'
}

export function buildImageSourceById(decisions: ManageAdReviewDecision[]): Record<string, ManageAdReviewImageSourceDto> {
  const next: Record<string, ManageAdReviewImageSourceDto> = {}
  for (const decision of decisions) {
    next[decision.imageId] = normalizeImageSource(decision.source)
  }
  return next
}

export function createEmptySourceDistribution(): ManageAdReviewSourceDistributionDto {
  return {
    known_hash: 0,
    llm_suspected: 0,
    llm_clean: 0,
    llm_failed: 0,
    strategy_skipped: 0,
  }
}

export function toTaskAudit(params: {
  sourceDistribution: ManageAdReviewSourceDistributionDto
  suspectedCount: number
  totalCount: number
}): ManageAdReviewTaskAuditDto {
  const llmCalls =
    params.sourceDistribution.llm_suspected +
    params.sourceDistribution.llm_clean +
    params.sourceDistribution.llm_failed

  return {
    source_distribution: params.sourceDistribution,
    llm_hit_rate: llmCalls > 0 ? params.sourceDistribution.llm_suspected / llmCalls : 0,
    overall_hit_rate: params.totalCount > 0 ? params.suspectedCount / params.totalCount : 0,
  }
}

function normalizeMaxConcurrency(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_REVIEW_MAX_CONCURRENCY
  }

  return Math.min(REVIEW_MAX_CONCURRENCY_LIMIT, Math.max(DEFAULT_REVIEW_MAX_CONCURRENCY, Math.floor(value as number)))
}

export function normalizeTaskExecution(request: StartManageAdReviewRequestDto): ManageAdReviewTaskExecutionDto {
  const strategy = request.strategy
  const normalizedStrategy: ManageAdReviewTaskExecutionDto['strategy'] =
    !strategy || strategy.mode === 'all'
      ? { mode: 'all' }
      : {
          mode: 'head-tail',
          head_n: Math.max(0, Math.floor(strategy.head_n)),
          tail_n: Math.max(0, Math.floor(strategy.tail_n)),
          tail_stop_clean_streak: Math.max(1, Math.floor(strategy.tail_stop_clean_streak)),
        }

  return manageAdReviewTaskExecutionSchema.parse({
    strategy: normalizedStrategy,
    max_concurrency: normalizeMaxConcurrency(request.max_concurrency),
  })
}

export function toEngineStrategy(execution: ManageAdReviewTaskExecutionDto) {
  if (execution.strategy.mode === 'head-tail') {
    return {
      mode: 'head-tail' as const,
      headN: execution.strategy.head_n,
      tailN: execution.strategy.tail_n,
      tailStopCleanStreak: execution.strategy.tail_stop_clean_streak,
    }
  }

  return {
    mode: 'all' as const,
  }
}

function applyDecisionToSourceDistribution(
  current: ManageAdReviewSourceDistributionDto,
  decision: Pick<ManageAdReviewDecision, 'source' | 'status'>,
): ManageAdReviewSourceDistributionDto {
  const next: ManageAdReviewSourceDistributionDto = {
    ...current,
  }

  if (decision.source === 'known-hash') {
    next.known_hash += 1
    return next
  }

  if (decision.source === 'llm-error') {
    next.llm_failed += 1
    return next
  }

  if (decision.source === 'strategy-skip') {
    next.strategy_skipped += 1
    return next
  }

  if (decision.status === 'suspected') {
    next.llm_suspected += 1
  } else {
    next.llm_clean += 1
  }
  return next
}

export function buildSourceDistribution(decisions: ManageAdReviewDecision[]): ManageAdReviewSourceDistributionDto {
  let distribution = createEmptySourceDistribution()
  for (const decision of decisions) {
    distribution = applyDecisionToSourceDistribution(distribution, decision)
  }
  return distribution
}

export function decodeVisionTestImageBytes(base64Value: string): Uint8Array {
  try {
    const imageBytes = Buffer.from(base64Value, 'base64')
    if (imageBytes.length <= 0) {
      throw new Error('图片为空')
    }
    if (imageBytes.length > MAX_VISION_TEST_IMAGE_BYTES) {
      throw new Error(`图片超过 ${Math.floor(MAX_VISION_TEST_IMAGE_BYTES / (1024 * 1024))}MB 限制`)
    }
    return imageBytes
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : '图片 base64 非法')
  }
}

export function isValidVisionDescription(value: string): boolean {
  const normalized = value.trim()
  if (!normalized) {
    return false
  }

  if (INVALID_DESCRIPTION_PATTERN.test(normalized)) {
    return false
  }

  return RED_COLOR_PATTERN.test(normalized)
}
