import {
  assertNotAborted,
  mapWithConcurrency,
  normalizeConcurrency,
} from "./concurrency";
import { computeSha256Hex } from "./hashStore";
import type {
  AdReviewBatchResult,
  AdReviewHeadTailStrategy,
  AdReviewStrategy,
  ManageAdReviewContainerInput,
  ManageAdReviewDecision,
  ManageAdReviewEngineOptions,
  ManageAdReviewImageInput,
  ManageAdReviewInput,
  ManageAdReviewPerformanceResult,
  ManageAdReviewResult,
  ManageAdReviewSummary,
} from "./types";

interface PreparedImage {
  containerId: string;
  image: ManageAdReviewImageInput;
  imageBytes: Uint8Array;
  hash: string;
}

const DEFAULT_STRATEGY: AdReviewStrategy = {
  mode: "all",
};

function normalizeHeadTailStrategy(
  strategy: AdReviewHeadTailStrategy,
): AdReviewHeadTailStrategy {
  return {
    mode: "head-tail",
    headN: Math.max(1, Math.min(20, Math.floor(strategy.headN))),
    tailN: Math.max(1, Math.min(20, Math.floor(strategy.tailN))),
    tailStopCleanStreak: Math.max(
      1,
      Math.min(20, Math.floor(strategy.tailStopCleanStreak)),
    ),
  };
}

function normalizeStrategy(
  strategy: AdReviewStrategy | undefined,
): AdReviewStrategy {
  if (!strategy) {
    return DEFAULT_STRATEGY;
  }

  if (strategy.mode === "head-tail") {
    return normalizeHeadTailStrategy(strategy);
  }

  return {
    mode: "all",
  };
}

function sortImages(
  images: ManageAdReviewImageInput[],
): ManageAdReviewImageInput[] {
  return [...images].sort((left, right) => {
    if (left.ordinal !== right.ordinal) {
      return left.ordinal - right.ordinal;
    }
    return left.imageId.localeCompare(right.imageId);
  });
}

function decisionKey(containerId: string, imageId: string): string {
  return `${containerId}::${imageId}`;
}

function buildOrderedIdArray(
  ids: Iterable<string>,
  orderedImageIds: string[],
): string[] {
  const set = new Set(ids);
  return orderedImageIds.filter((id) => set.has(id));
}

function unionSets(...sets: Array<Set<string>>): Set<string> {
  const next = new Set<string>();
  for (const set of sets) {
    for (const id of set) {
      next.add(id);
    }
  }
  return next;
}

function toItemReasonById(batch: AdReviewBatchResult): Map<string, string> {
  const next = new Map<string, string>();
  for (const item of batch.items) {
    next.set(item.imageId, item.reason.trim());
  }
  return next;
}

function createSummary(items: ManageAdReviewDecision[]): ManageAdReviewSummary {
  const summary: ManageAdReviewSummary = {
    total: items.length,
    suspected: 0,
    clean: 0,
    failed: 0,
    skipped: 0,
    knownHashHits: 0,
    llmCalls: 0,
  };

  for (const item of items) {
    if (item.status === "suspected") {
      summary.suspected += 1;
    }
    if (item.status === "clean") {
      summary.clean += 1;
    }
    if (item.status === "failed") {
      summary.failed += 1;
    }
    if (item.status === "skipped") {
      summary.skipped += 1;
    }
    if (item.source === "known-hash") {
      summary.knownHashHits += 1;
    }
    if (item.source === "llm" || item.source === "llm-error") {
      summary.llmCalls += 1;
    }
  }

  return summary;
}

function normalizeBytes(bytes: Uint8Array): Uint8Array {
  if (bytes instanceof Uint8Array) {
    return bytes;
  }
  return new Uint8Array(bytes);
}

function createDecision(params: {
  prepared: PreparedImage;
  status: ManageAdReviewDecision["status"];
  source: ManageAdReviewDecision["source"];
  reason: string;
}): ManageAdReviewDecision {
  return {
    containerId: params.prepared.containerId,
    imageId: params.prepared.image.imageId,
    ordinal: params.prepared.image.ordinal,
    fileName: params.prepared.image.fileName ?? null,
    hash: params.prepared.hash,
    status: params.status,
    source: params.source,
    reason: params.reason,
    reviewedAtMs: Date.now(),
  };
}

async function prepareContainerImages(
  container: ManageAdReviewContainerInput,
  concurrency: number,
  signal?: AbortSignal,
): Promise<PreparedImage[]> {
  const sorted = sortImages(container.images);

  const prepared = await mapWithConcurrency({
    items: sorted,
    concurrency,
    signal,
    worker: async (image) => {
      assertNotAborted(signal);
      const imageBytes = normalizeBytes(await image.getImageBytes());
      assertNotAborted(signal);

      return {
        containerId: container.containerId,
        image,
        imageBytes,
        hash: computeSha256Hex(imageBytes),
      };
    },
  });

  return prepared;
}

export async function runManageAdReview(
  input: ManageAdReviewInput,
  options: ManageAdReviewEngineOptions,
): Promise<ManageAdReviewResult> {
  const normalizedConcurrency = normalizeConcurrency(options.concurrency, 2);
  const strategy = normalizeStrategy(options.strategy);
  const executionMode =
    options.executionMode === "performance" ? "performance" : "normal";

  const allDecisions: ManageAdReviewDecision[] = [];
  const containerOrder = new Map<string, number>();
  let aggregatedPerformance: ManageAdReviewPerformanceResult | null = null;

  for (
    let containerIndex = 0;
    containerIndex < input.containers.length;
    containerIndex += 1
  ) {
    const container = input.containers[containerIndex];
    containerOrder.set(container.containerId, containerIndex);
    options.onEvent?.({
      type: "container-start",
      containerId: container.containerId,
      total: container.images.length,
    });

    assertNotAborted(options.signal);

    const preparedImages = await prepareContainerImages(
      container,
      normalizedConcurrency,
      options.signal,
    );
    const decisions: ManageAdReviewDecision[] = [];
    const decidedKeySet = new Set<string>();

    // 先做哈希短路，避免不必要的 LLM 请求。
    for (const prepared of preparedImages) {
      assertNotAborted(options.signal);
      const key = decisionKey(prepared.containerId, prepared.image.imageId);
      const hitKnownHash = options.hashStore
        ? await options.hashStore.has(prepared.hash)
        : false;

      if (!hitKnownHash) {
        continue;
      }

      const decision = createDecision({
        prepared,
        status: "suspected",
        source: "known-hash",
        reason: "known_hash",
      });

      decisions.push(decision);
      decidedKeySet.add(key);
      options.onEvent?.({
        type: "image-reviewed",
        containerId: decision.containerId,
        imageId: decision.imageId,
        status: decision.status,
        source: decision.source,
        hash: decision.hash,
        reason: decision.reason,
      });
    }

    const remaining = preparedImages.filter(
      (item) =>
        !decidedKeySet.has(decisionKey(item.containerId, item.image.imageId)),
    );

    const reviewImageWithLlm = async (
      prepared: PreparedImage,
    ): Promise<ManageAdReviewDecision> => {
      assertNotAborted(options.signal);
      try {
        const result = await options.client.detectAd({
          imageBytes: prepared.imageBytes,
          signal: options.signal,
        });

        if (result.isAd) {
          return createDecision({
            prepared,
            status: "suspected",
            source: "llm",
            reason: result.reason.trim() || "ad",
          });
        }

        return createDecision({
          prepared,
          status: "clean",
          source: "llm",
          reason: result.reason.trim() || "clean",
        });
      } catch (error: unknown) {
        if (error instanceof Error && error.name === "AbortError") {
          throw error;
        }

        const reason = error instanceof Error ? error.message : String(error);
        return createDecision({
          prepared,
          status: "failed",
          source: "llm-error",
          reason: reason.slice(0, 500),
        });
      }
    };

    const commitDecisions = (nextDecisions: ManageAdReviewDecision[]) => {
      for (const decision of nextDecisions) {
        const key = decisionKey(decision.containerId, decision.imageId);
        if (decidedKeySet.has(key)) {
          continue;
        }

        decisions.push(decision);
        decidedKeySet.add(key);
        options.onEvent?.({
          type: "image-reviewed",
          containerId: decision.containerId,
          imageId: decision.imageId,
          status: decision.status,
          source: decision.source,
          hash: decision.hash,
          reason: decision.reason,
        });
      }
    };

    const scanRecords = async (
      records: PreparedImage[],
      concurrency: number,
    ): Promise<ManageAdReviewDecision[]> => {
      if (records.length === 0) {
        return [];
      }

      return mapWithConcurrency({
        items: records,
        concurrency,
        signal: options.signal,
        worker: reviewImageWithLlm,
      });
    };

    if (
      executionMode === "performance" &&
      typeof options.client.reviewBatch === "function"
    ) {
      const orderedImageIds = preparedImages.map((item) => item.image.imageId);
      const knownHashIdSet = new Set(
        decisions
          .filter((item) => item.source === "known-hash")
          .map((item) => item.imageId),
      );

      const headN = strategy.mode === "head-tail" ? strategy.headN : 3;
      const tailBaseN = strategy.mode === "head-tail" ? strategy.tailN : 8;
      const headRecords = preparedImages
        .slice(0, headN)
        .filter((item) => !knownHashIdSet.has(item.image.imageId));

      const headKeySet = new Set(
        headRecords.map((item) =>
          decisionKey(item.containerId, item.image.imageId),
        ),
      );
      const tailWindowAll: PreparedImage[] = [];
      for (let index = preparedImages.length - 1; index >= 0; index -= 1) {
        const record = preparedImages[index];
        const key = decisionKey(record.containerId, record.image.imageId);
        if (headKeySet.has(key)) {
          continue;
        }
        tailWindowAll.push(record);
        if (tailWindowAll.length >= tailBaseN) {
          break;
        }
      }

      const tailHashHitCount = tailWindowAll.filter((item) =>
        knownHashIdSet.has(item.image.imageId),
      ).length;
      const tailLlmQuota = Math.max(0, tailBaseN - tailHashHitCount);
      const tailRecords = tailWindowAll
        .filter((item) => !knownHashIdSet.has(item.image.imageId))
        .slice(0, tailLlmQuota);

      const headBatch = headRecords.length
        ? await options.client.reviewBatch({
            reviewType: "head",
            images: headRecords.map((item) => ({
              imageId: item.image.imageId,
              imageBytes: item.imageBytes,
            })),
            signal: options.signal,
          })
        : null;

      const tailBatch = tailRecords.length
        ? await options.client.reviewBatch({
            reviewType: "tail",
            images: tailRecords.map((item) => ({
              imageId: item.image.imageId,
              imageBytes: item.imageBytes,
            })),
            signal: options.signal,
          })
        : null;

      const headOverlayIdSet = new Set(
        headBatch?.duplicateGroups.flatMap((group) => group.adOverlayIds) ?? [],
      );
      const tailAdIdSet = new Set(tailBatch?.adImageIds ?? []);
      const nonBodySet = unionSets(
        new Set(headBatch?.nonBodyImageIds ?? []),
        new Set(tailBatch?.nonBodyImageIds ?? []),
      );

      const adDeleteSet = unionSets(
        headOverlayIdSet,
        tailAdIdSet,
        knownHashIdSet,
      );
      const nonBodyHideSet = new Set(
        Array.from(nonBodySet).filter((id) => !adDeleteSet.has(id)),
      );

      const reasonById = new Map<string, string>();
      if (headBatch) {
        for (const [imageId, reason] of toItemReasonById(headBatch)) {
          if (reason) {
            reasonById.set(imageId, reason);
          }
        }
      }
      if (tailBatch) {
        for (const [imageId, reason] of toItemReasonById(tailBatch)) {
          if (reason && !reasonById.has(imageId)) {
            reasonById.set(imageId, reason);
          }
        }
      }

      const touchedByLlmSet = new Set<string>([
        ...headRecords.map((item) => item.image.imageId),
        ...tailRecords.map((item) => item.image.imageId),
      ]);

      const performanceDecisions: ManageAdReviewDecision[] = remaining.map(
        (prepared) => {
          const imageId = prepared.image.imageId;
          if (adDeleteSet.has(imageId)) {
            return createDecision({
              prepared,
              status: "suspected",
              source: touchedByLlmSet.has(imageId) ? "llm" : "known-hash",
              reason: reasonById.get(imageId) || "performance_ad",
            });
          }

          if (nonBodyHideSet.has(imageId)) {
            return createDecision({
              prepared,
              status: "clean",
              source: touchedByLlmSet.has(imageId) ? "llm" : "strategy-skip",
              reason: reasonById.get(imageId) || "performance_non_body",
            });
          }

          if (touchedByLlmSet.has(imageId)) {
            return createDecision({
              prepared,
              status: "clean",
              source: "llm",
              reason: reasonById.get(imageId) || "clean",
            });
          }

          return createDecision({
            prepared,
            status: "skipped",
            source: "strategy-skip",
            reason: "performance_window_unreviewed",
          });
        },
      );

      commitDecisions(performanceDecisions);

      const containerPerformance: ManageAdReviewPerformanceResult = {
        adDeleteIds: buildOrderedIdArray(adDeleteSet, orderedImageIds),
        nonBodyHideIds: buildOrderedIdArray(nonBodyHideSet, orderedImageIds),
        headAdOverlayIds: buildOrderedIdArray(
          headOverlayIdSet,
          orderedImageIds,
        ),
        tailAdIds: buildOrderedIdArray(tailAdIdSet, orderedImageIds),
        hashHitAdIds: buildOrderedIdArray(knownHashIdSet, orderedImageIds),
        tailHashHitCount,
        tailLlmQuota,
        tailLlmImageIds: buildOrderedIdArray(
          new Set(tailRecords.map((item) => item.image.imageId)),
          orderedImageIds,
        ),
      };

      if (!aggregatedPerformance) {
        aggregatedPerformance = containerPerformance;
      } else {
        const mergedOrder = [
          ...aggregatedPerformance.adDeleteIds,
          ...orderedImageIds,
        ];
        aggregatedPerformance = {
          adDeleteIds: buildOrderedIdArray(
            new Set([
              ...aggregatedPerformance.adDeleteIds,
              ...containerPerformance.adDeleteIds,
            ]),
            mergedOrder,
          ),
          nonBodyHideIds: buildOrderedIdArray(
            new Set([
              ...aggregatedPerformance.nonBodyHideIds,
              ...containerPerformance.nonBodyHideIds,
            ]),
            mergedOrder,
          ),
          headAdOverlayIds: buildOrderedIdArray(
            new Set([
              ...aggregatedPerformance.headAdOverlayIds,
              ...containerPerformance.headAdOverlayIds,
            ]),
            mergedOrder,
          ),
          tailAdIds: buildOrderedIdArray(
            new Set([
              ...aggregatedPerformance.tailAdIds,
              ...containerPerformance.tailAdIds,
            ]),
            mergedOrder,
          ),
          hashHitAdIds: buildOrderedIdArray(
            new Set([
              ...aggregatedPerformance.hashHitAdIds,
              ...containerPerformance.hashHitAdIds,
            ]),
            mergedOrder,
          ),
          tailHashHitCount:
            aggregatedPerformance.tailHashHitCount +
            containerPerformance.tailHashHitCount,
          tailLlmQuota:
            aggregatedPerformance.tailLlmQuota +
            containerPerformance.tailLlmQuota,
          tailLlmImageIds: buildOrderedIdArray(
            new Set([
              ...aggregatedPerformance.tailLlmImageIds,
              ...containerPerformance.tailLlmImageIds,
            ]),
            mergedOrder,
          ),
        };
      }
    } else if (strategy.mode === "all") {
      const scanned = await scanRecords(remaining, normalizedConcurrency);
      commitDecisions(scanned);
    } else {
      const headRecords = remaining.slice(0, strategy.headN);
      const headKeySet = new Set(
        headRecords.map((item) =>
          decisionKey(item.containerId, item.image.imageId),
        ),
      );

      const tailRecords: PreparedImage[] = [];
      for (let index = remaining.length - 1; index >= 0; index -= 1) {
        const record = remaining[index];
        const key = decisionKey(record.containerId, record.image.imageId);
        if (headKeySet.has(key)) {
          continue;
        }
        tailRecords.push(record);
        if (tailRecords.length >= strategy.tailN) {
          break;
        }
      }

      const tailDecisions = await scanRecords(
        tailRecords,
        normalizedConcurrency,
      );
      commitDecisions(tailDecisions);

      const headDecisions = await scanRecords(
        headRecords,
        normalizedConcurrency,
      );
      commitDecisions(headDecisions);

      const tailHasAd = tailDecisions.some(
        (item) => item.status === "suspected",
      );
      if (!tailHasAd) {
        const skipped = remaining
          .filter(
            (item) =>
              !decidedKeySet.has(
                decisionKey(item.containerId, item.image.imageId),
              ),
          )
          .map((item) =>
            createDecision({
              prepared: item,
              status: "skipped",
              source: "strategy-skip",
              reason: "tail_window_clean",
            }),
          );
        commitDecisions(skipped);
      } else {
        // 尾部命中广告后继续向前扩展，直到连续 N 张 clean 才停止。
        let cleanStreak = 0;
        for (let index = remaining.length - 1; index >= 0; index -= 1) {
          const record = remaining[index];
          const key = decisionKey(record.containerId, record.image.imageId);
          if (decidedKeySet.has(key)) {
            continue;
          }

          const decision = await reviewImageWithLlm(record);
          commitDecisions([decision]);

          if (decision.status === "suspected") {
            cleanStreak = 0;
            continue;
          }

          if (decision.status === "clean") {
            cleanStreak += 1;
          } else {
            cleanStreak = 0;
          }

          if (cleanStreak >= strategy.tailStopCleanStreak) {
            break;
          }
        }

        const skipped = remaining
          .filter(
            (item) =>
              !decidedKeySet.has(
                decisionKey(item.containerId, item.image.imageId),
              ),
          )
          .map((item) =>
            createDecision({
              prepared: item,
              status: "skipped",
              source: "strategy-skip",
              reason: "tail_extension_stop",
            }),
          );
        commitDecisions(skipped);
      }
    }

    const containerSummary = createSummary(decisions);
    options.onEvent?.({
      type: "container-complete",
      containerId: container.containerId,
      summary: containerSummary,
    });

    allDecisions.push(...decisions);
  }

  allDecisions.sort((left, right) => {
    const leftContainerOrder =
      containerOrder.get(left.containerId) ?? Number.MAX_SAFE_INTEGER;
    const rightContainerOrder =
      containerOrder.get(right.containerId) ?? Number.MAX_SAFE_INTEGER;

    if (leftContainerOrder !== rightContainerOrder) {
      return leftContainerOrder - rightContainerOrder;
    }

    if (left.ordinal !== right.ordinal) {
      return left.ordinal - right.ordinal;
    }

    return left.imageId.localeCompare(right.imageId);
  });

  const summary = createSummary(allDecisions);
  options.onEvent?.({
    type: "run-complete",
    summary,
  });

  return {
    items: allDecisions,
    summary,
    performance: aggregatedPerformance ?? undefined,
  };
}
