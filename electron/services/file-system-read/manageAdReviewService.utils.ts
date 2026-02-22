import path from "node:path";
import { createHash } from "node:crypto";

import {
  manageAdReviewTaskExecutionSchema,
  type ImageItemDto,
  type ImagePackageDto,
  type ManageAdReviewImageSourceDto,
  type ManageAdReviewCandidateDto,
  type ManageAdReviewSourceDistributionDto,
  type ManageAdReviewTaskAuditDto,
  type ManageAdReviewTaskExecutionDto,
  type StartManageAdReviewRequestDto,
} from "../../../src/contracts/backend";
import type { ManageAdReviewDecision } from "../../manageAdReview";

const DEFAULT_REVIEW_MAX_CONCURRENCY = 4;
const REVIEW_MIN_CONCURRENCY_LIMIT = 1;
const REVIEW_MAX_CONCURRENCY_LIMIT = 20;
export const DEFAULT_VISION_TEST_TIMEOUT_MS = 12_000;
export const MAX_VISION_TEST_IMAGE_BYTES = 12 * 1024 * 1024;
const INVALID_DESCRIPTION_PATTERN =
  /(cannot|can't|unable|not able|as an ai|无法|不能|看不到|无法查看|无法识别|无法描述)/i;
const RED_COLOR_PATTERN =
  /\b(red|crimson|scarlet|ruby|maroon|reddish)\b|红色?|赤红|绯红|#?ff0000/i;

export interface ParsedSidebarNodeRef {
  kind: "folder" | "package" | "video";
  pathKey: string;
}

export function parseSidebarNodeId(
  nodeId: string,
): ParsedSidebarNodeRef | null {
  const delimiterIndex = nodeId.indexOf(":");
  if (delimiterIndex <= 0) {
    return null;
  }

  const kind = nodeId.slice(0, delimiterIndex);
  if (kind !== "folder" && kind !== "package" && kind !== "video") {
    return null;
  }

  const pathKey = nodeId.slice(delimiterIndex + 1);
  if (!pathKey) {
    return null;
  }

  return {
    kind,
    pathKey,
  };
}

export function pathKeyHasPrefix(pathKey: string, prefix: string): boolean {
  if (pathKey === prefix) {
    return true;
  }
  return pathKey.startsWith(`${prefix}/`);
}

export function toSourcePathKey(
  source: Pick<ImagePackageDto, "tree_path">,
): string {
  return source.tree_path.join("/");
}

export function normalizeSidebarNodeSelection(
  nodeRefs: ParsedSidebarNodeRef[],
): ParsedSidebarNodeRef[] {
  const deduped = new Map<string, ParsedSidebarNodeRef>();
  for (const nodeRef of nodeRefs) {
    const key = `${nodeRef.kind}:${nodeRef.pathKey}`;
    deduped.set(key, nodeRef);
  }

  const ordered = Array.from(deduped.values()).sort((left, right) => {
    if (left.pathKey.length !== right.pathKey.length) {
      return left.pathKey.length - right.pathKey.length;
    }
    if (left.pathKey !== right.pathKey) {
      return left.pathKey.localeCompare(right.pathKey);
    }
    return left.kind.localeCompare(right.kind);
  });

  const normalized: ParsedSidebarNodeRef[] = [];
  for (const nodeRef of ordered) {
    const coveredByAncestor = normalized.some((candidate) => {
      if (candidate.kind !== "folder") {
        return false;
      }
      return pathKeyHasPrefix(nodeRef.pathKey, candidate.pathKey);
    });

    if (!coveredByAncestor) {
      normalized.push(nodeRef);
    }
  }

  return normalized;
}

export function collectImageIdsForSidebarNode(
  nodeRef: ParsedSidebarNodeRef,
  sources: Array<Pick<ImagePackageDto, "tree_path" | "images">>,
): string[] {
  const selected = new Set<string>();
  for (const source of sources) {
    const sourcePathKey = toSourcePathKey(source);
    const matched =
      nodeRef.kind === "folder"
        ? pathKeyHasPrefix(sourcePathKey, nodeRef.pathKey)
        : sourcePathKey === nodeRef.pathKey;
    if (!matched) {
      continue;
    }

    for (const image of source.images) {
      selected.add(image.id);
    }
  }

  return Array.from(selected);
}

function resolveLocatorSignature(image: ImageItemDto): string {
  const locator = image.media_locator;
  if (locator.kind === "filesystem") {
    return `fs:${locator.absolute_path}`;
  }
  return `arc:${locator.archive_path}::${locator.entry_name}`;
}

export function computeSidebarNodeHash(
  nodeRef: ParsedSidebarNodeRef,
  sources: Array<Pick<ImagePackageDto, "id" | "tree_path" | "images">>,
): string {
  const signatures: string[] = [];

  for (const source of sources) {
    const sourcePathKey = toSourcePathKey(source);
    const matched =
      nodeRef.kind === "folder"
        ? pathKeyHasPrefix(sourcePathKey, nodeRef.pathKey)
        : sourcePathKey === nodeRef.pathKey;
    if (!matched) {
      continue;
    }

    for (const image of source.images) {
      signatures.push(
        [
          source.id,
          sourcePathKey,
          image.id,
          String(image.ordinal),
          String(image.size_kb),
          resolveLocatorSignature(image),
        ].join("|"),
      );
    }
  }

  signatures.sort((left, right) => left.localeCompare(right));
  const payload =
    signatures.length > 0
      ? signatures.join("\n")
      : `empty:${nodeRef.kind}:${nodeRef.pathKey}`;
  return createHash("sha256").update(payload).digest("hex");
}

export function normalizeHashes(input: unknown): Set<string> {
  if (!Array.isArray(input)) {
    return new Set();
  }

  const next = new Set<string>();
  for (const value of input) {
    if (typeof value !== "string") {
      continue;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized.length > 0) {
      next.add(normalized);
    }
  }

  return next;
}

export function resolveCandidateSource(
  source: ManageAdReviewDecision["source"],
): "known-hash" | "llm" {
  return source === "known-hash" ? "known-hash" : "llm";
}

export function toImageFileName(image: ImageItemDto): string | null {
  if (image.media_locator.kind === "filesystem") {
    return path.basename(image.media_locator.absolute_path);
  }
  return path.basename(image.media_locator.entry_name);
}

export function buildAdReviewCandidates(
  decisions: ManageAdReviewDecision[],
  imageById: Map<string, { source: ImagePackageDto; image: ImageItemDto }>,
): ManageAdReviewCandidateDto[] {
  const candidates: ManageAdReviewCandidateDto[] = [];

  for (const decision of decisions) {
    if (decision.status !== "suspected") {
      continue;
    }

    const found = imageById.get(decision.imageId);
    if (!found) {
      continue;
    }

    candidates.push({
      image_id: decision.imageId,
      package_id: found.source.id,
      package_name: found.source.package_name,
      display_name: found.source.display_name,
      ordinal: found.image.ordinal,
      file_name: toImageFileName(found.image),
      reason: decision.reason.trim() || "suspected_ad",
      source: resolveCandidateSource(decision.source),
      hash: decision.hash,
    });
  }

  candidates.sort((left, right) => {
    if (left.package_id !== right.package_id) {
      return left.package_id.localeCompare(right.package_id);
    }
    return left.ordinal - right.ordinal;
  });

  return candidates;
}

export function mergeAdReviewCandidates(
  previous: ManageAdReviewCandidateDto[],
  incoming: ManageAdReviewCandidateDto[],
): ManageAdReviewCandidateDto[] {
  const candidateByImageId = new Map<string, ManageAdReviewCandidateDto>();
  for (const candidate of previous) {
    candidateByImageId.set(candidate.image_id, candidate);
  }
  for (const candidate of incoming) {
    candidateByImageId.set(candidate.image_id, candidate);
  }

  return Array.from(candidateByImageId.values()).sort((left, right) => {
    if (left.package_id !== right.package_id) {
      return left.package_id.localeCompare(right.package_id);
    }
    return left.ordinal - right.ordinal;
  });
}

export function normalizeImageSource(
  source: ManageAdReviewDecision["source"],
): ManageAdReviewImageSourceDto {
  if (source === "llm-error") {
    return "llm-error";
  }
  if (source === "strategy-skip") {
    return "strategy-skip";
  }
  if (source === "known-hash") {
    return "known-hash";
  }
  return "llm";
}

export function buildImageSourceById(
  decisions: ManageAdReviewDecision[],
): Record<string, ManageAdReviewImageSourceDto> {
  const next: Record<string, ManageAdReviewImageSourceDto> = {};
  for (const decision of decisions) {
    next[decision.imageId] = normalizeImageSource(decision.source);
  }
  return next;
}

export function createEmptySourceDistribution(): ManageAdReviewSourceDistributionDto {
  return {
    known_hash: 0,
    llm_suspected: 0,
    llm_clean: 0,
    llm_failed: 0,
    strategy_skipped: 0,
  };
}

export function toTaskAudit(params: {
  sourceDistribution: ManageAdReviewSourceDistributionDto;
  suspectedCount: number;
  totalCount: number;
}): ManageAdReviewTaskAuditDto {
  const llmCalls =
    params.sourceDistribution.llm_suspected +
    params.sourceDistribution.llm_clean +
    params.sourceDistribution.llm_failed;

  return {
    source_distribution: params.sourceDistribution,
    llm_hit_rate:
      llmCalls > 0 ? params.sourceDistribution.llm_suspected / llmCalls : 0,
    overall_hit_rate:
      params.totalCount > 0 ? params.suspectedCount / params.totalCount : 0,
  };
}

function normalizeMaxConcurrency(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_REVIEW_MAX_CONCURRENCY;
  }

  return Math.min(
    REVIEW_MAX_CONCURRENCY_LIMIT,
    Math.max(REVIEW_MIN_CONCURRENCY_LIMIT, Math.floor(value as number)),
  );
}

export function normalizeTaskExecution(
  request: StartManageAdReviewRequestDto,
): ManageAdReviewTaskExecutionDto {
  const strategy = request.strategy;
  const normalizedStrategy: ManageAdReviewTaskExecutionDto["strategy"] =
    !strategy || strategy.mode === "all"
      ? { mode: "all" }
      : {
          mode: "head-tail",
          head_n: Math.max(1, Math.min(20, Math.floor(strategy.head_n))),
          tail_n: Math.max(1, Math.min(20, Math.floor(strategy.tail_n))),
          tail_stop_clean_streak: Math.max(
            1,
            Math.min(20, Math.floor(strategy.tail_stop_clean_streak)),
          ),
        };

  return manageAdReviewTaskExecutionSchema.parse({
    strategy: normalizedStrategy,
    max_concurrency: normalizeMaxConcurrency(request.max_concurrency),
  });
}

export function toEngineStrategy(execution: ManageAdReviewTaskExecutionDto) {
  if (execution.strategy.mode === "head-tail") {
    return {
      mode: "head-tail" as const,
      headN: execution.strategy.head_n,
      tailN: execution.strategy.tail_n,
      tailStopCleanStreak: execution.strategy.tail_stop_clean_streak,
    };
  }

  return {
    mode: "all" as const,
  };
}

export function applyDecisionToSourceDistribution(
  current: ManageAdReviewSourceDistributionDto,
  decision: Pick<ManageAdReviewDecision, "source" | "status">,
): ManageAdReviewSourceDistributionDto {
  const next: ManageAdReviewSourceDistributionDto = {
    ...current,
  };

  if (decision.source === "known-hash") {
    next.known_hash += 1;
    return next;
  }

  if (decision.source === "llm-error") {
    next.llm_failed += 1;
    return next;
  }

  if (decision.source === "strategy-skip") {
    next.strategy_skipped += 1;
    return next;
  }

  if (decision.status === "suspected") {
    next.llm_suspected += 1;
  } else {
    next.llm_clean += 1;
  }
  return next;
}

export function buildSourceDistribution(
  decisions: ManageAdReviewDecision[],
): ManageAdReviewSourceDistributionDto {
  let distribution = createEmptySourceDistribution();
  for (const decision of decisions) {
    distribution = applyDecisionToSourceDistribution(distribution, decision);
  }
  return distribution;
}

export function decodeVisionTestImageBytes(base64Value: string): Uint8Array {
  try {
    const imageBytes = Buffer.from(base64Value, "base64");
    if (imageBytes.length <= 0) {
      throw new Error("图片为空");
    }
    if (imageBytes.length > MAX_VISION_TEST_IMAGE_BYTES) {
      throw new Error(
        `图片超过 ${Math.floor(MAX_VISION_TEST_IMAGE_BYTES / (1024 * 1024))}MB 限制`,
      );
    }
    return imageBytes;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "图片 base64 非法",
    );
  }
}

export function isValidVisionDescription(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) {
    return false;
  }

  if (INVALID_DESCRIPTION_PATTERN.test(normalized)) {
    return false;
  }

  return RED_COLOR_PATTERN.test(normalized);
}
