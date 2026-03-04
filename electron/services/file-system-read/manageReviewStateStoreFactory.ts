import type { MediaLibraryDatabase } from "../../mediaLibraryDatabase";

import { normalizeHashes } from "./manageAdReviewService.utils";

interface ManageReviewStateStoreKeys {
  knownHashesStateKey: string;
  queueStateKey: string;
  reviewedNodeHashStateKey: string;
}

interface ManageReviewTaskParser<TTask> {
  safeParse: (value: unknown) =>
    | {
        success: true;
        data: TTask;
      }
    | {
        success: false;
      };
}

interface QueueItemLike<TTask, TRequest> {
  task: TTask;
  request: TRequest;
  effective_node_ids: string[];
  skipped_node_ids: string[];
  node_hash_by_id: Record<string, string>;
}

interface QueueStateLike<TTask, TRequest> {
  version: number;
  items: Array<QueueItemLike<TTask, TRequest>>;
}

interface ReviewedNodeHashStateLike {
  version: number;
  node_hash_by_id: Record<string, { node_hash: string; updated_at_ms: number }>;
}

interface ManageReviewStateStoreFactoryOptions<TTask, TRequest> {
  database: MediaLibraryDatabase;
  keys: ManageReviewStateStoreKeys;
  queueStateVersion: number;
  reviewedNodeHashStateVersion: number;
  taskParser: ManageReviewTaskParser<TTask>;
  normalizeStoredRequest: (rawRequest: unknown, task: TTask) => TRequest | null;
}

function readNodeIdList(rawValue: unknown): string[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }
  return rawValue.filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
}

function readNodeHashById(rawMap: unknown): Record<string, string> {
  const nodeHashById: Record<string, string> = {};
  if (!rawMap || typeof rawMap !== "object") {
    return nodeHashById;
  }
  for (const [nodeId, nodeHash] of Object.entries(
    rawMap as Record<string, unknown>,
  )) {
    if (typeof nodeHash === "string" && nodeHash.trim().length > 0) {
      nodeHashById[nodeId] = nodeHash.trim().toLowerCase();
    }
  }
  return nodeHashById;
}

export function normalizeManageReviewStoredRequest<
  TExecutionMode extends "normal" | "performance" | undefined,
  TStrategy,
  TConcurrency extends number | undefined,
>(
  rawRequest: unknown,
  execution: {
    execution_mode?: TExecutionMode;
    strategy?: TStrategy;
    max_concurrency?: TConcurrency;
  },
): {
  selection_scope: "image" | "sidebar";
  image_ids: string[] | undefined;
  node_ids: string[] | undefined;
  llm_endpoint: string;
  llm_model: string;
  execution_mode: TExecutionMode | undefined;
  strategy: TStrategy | undefined;
  max_concurrency: TConcurrency | undefined;
} | null {
  if (!rawRequest || typeof rawRequest !== "object") {
    return null;
  }

  const source = rawRequest as Record<string, unknown>;
  const selectionScope = source.selection_scope;
  if (selectionScope !== "image" && selectionScope !== "sidebar") {
    return null;
  }

  const llmEndpoint =
    typeof source.llm_endpoint === "string" ? source.llm_endpoint.trim() : "";
  const llmModel =
    typeof source.llm_model === "string" ? source.llm_model.trim() : "";
  if (!llmEndpoint || !llmModel) {
    return null;
  }

  const imageIds = Array.isArray(source.image_ids)
    ? source.image_ids.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
    : undefined;
  const nodeIds = Array.isArray(source.node_ids)
    ? source.node_ids.filter(
        (value): value is string =>
          typeof value === "string" && value.trim().length > 0,
      )
    : undefined;

  return {
    selection_scope: selectionScope,
    image_ids: imageIds,
    node_ids: nodeIds,
    llm_endpoint: llmEndpoint,
    llm_model: llmModel,
    execution_mode: execution.execution_mode,
    strategy: execution.strategy,
    max_concurrency: execution.max_concurrency,
  };
}

export function createManageReviewStateStore<TTask, TRequest>(
  options: ManageReviewStateStoreFactoryOptions<TTask, TRequest>,
): {
  readQueueStateInternal: () => QueueStateLike<TTask, TRequest>;
  writeQueueState: (state: QueueStateLike<TTask, TRequest>) => void;
  readReviewedNodeHashState: () => ReviewedNodeHashStateLike;
  writeReviewedNodeHashState: (state: ReviewedNodeHashStateLike) => void;
  readKnownHashes: () => Set<string>;
  writeKnownHashes: (hashes: Iterable<string>) => void;
  persistKnownHashes: (
    imageIds: string[],
    candidateHashByImageId: Map<string, string>,
  ) => void;
} {
  const {
    database,
    keys,
    queueStateVersion,
    reviewedNodeHashStateVersion,
    taskParser,
    normalizeStoredRequest,
  } = options;

  function readQueueStateInternal(): QueueStateLike<TTask, TRequest> {
    const fallback: QueueStateLike<TTask, TRequest> = {
      version: queueStateVersion,
      items: [],
    };

    const raw = database.readAppState<unknown>(keys.queueStateKey, fallback);
    if (!raw || typeof raw !== "object") {
      return fallback;
    }

    const source = raw as { items?: unknown };
    const rawItems = Array.isArray(source.items) ? source.items : [];
    const items: Array<QueueItemLike<TTask, TRequest>> = [];

    for (const rawItem of rawItems) {
      if (!rawItem || typeof rawItem !== "object") {
        continue;
      }

      const taskResult = taskParser.safeParse(
        (rawItem as { task?: unknown }).task,
      );
      if (!taskResult.success) {
        continue;
      }

      const task = taskResult.data;
      const request = normalizeStoredRequest(
        (rawItem as { request?: unknown }).request,
        task,
      );
      if (!request) {
        continue;
      }

      items.push({
        task,
        request,
        effective_node_ids: readNodeIdList(
          (rawItem as { effective_node_ids?: unknown }).effective_node_ids,
        ),
        skipped_node_ids: readNodeIdList(
          (rawItem as { skipped_node_ids?: unknown }).skipped_node_ids,
        ),
        node_hash_by_id: readNodeHashById(
          (rawItem as { node_hash_by_id?: unknown }).node_hash_by_id,
        ),
      });
    }

    return {
      version: queueStateVersion,
      items,
    };
  }

  function writeQueueState(state: QueueStateLike<TTask, TRequest>): void {
    database.writeAppState(keys.queueStateKey, {
      version: queueStateVersion,
      items: state.items,
    });
  }

  function readReviewedNodeHashState(): ReviewedNodeHashStateLike {
    const fallback: ReviewedNodeHashStateLike = {
      version: reviewedNodeHashStateVersion,
      node_hash_by_id: {},
    };

    const raw = database.readAppState<unknown>(
      keys.reviewedNodeHashStateKey,
      fallback,
    );
    if (!raw || typeof raw !== "object") {
      return fallback;
    }

    const rawMap = (raw as { node_hash_by_id?: unknown }).node_hash_by_id;
    if (!rawMap || typeof rawMap !== "object") {
      return fallback;
    }

    const nodeHashById: Record<
      string,
      { node_hash: string; updated_at_ms: number }
    > = {};
    for (const [nodeId, payload] of Object.entries(
      rawMap as Record<string, unknown>,
    )) {
      if (!payload || typeof payload !== "object") {
        continue;
      }

      const nodeHash = (payload as { node_hash?: unknown }).node_hash;
      const updatedAtMs = (payload as { updated_at_ms?: unknown })
        .updated_at_ms;
      if (typeof nodeHash !== "string" || !nodeHash.trim()) {
        continue;
      }
      if (
        typeof updatedAtMs !== "number" ||
        !Number.isFinite(updatedAtMs) ||
        updatedAtMs <= 0
      ) {
        continue;
      }

      nodeHashById[nodeId] = {
        node_hash: nodeHash.trim().toLowerCase(),
        updated_at_ms: Math.floor(updatedAtMs),
      };
    }

    return {
      version: reviewedNodeHashStateVersion,
      node_hash_by_id: nodeHashById,
    };
  }

  function writeReviewedNodeHashState(state: ReviewedNodeHashStateLike): void {
    database.writeAppState(keys.reviewedNodeHashStateKey, {
      version: reviewedNodeHashStateVersion,
      node_hash_by_id: state.node_hash_by_id,
    });
  }

  function readKnownHashes(): Set<string> {
    const raw = database.readAppState<unknown>(keys.knownHashesStateKey, []);
    return normalizeHashes(raw);
  }

  function persistKnownHashes(
    imageIds: string[],
    candidateHashByImageId: Map<string, string>,
  ): void {
    const hashes = readKnownHashes();
    let changed = false;

    for (const imageId of imageIds) {
      const hash = candidateHashByImageId.get(imageId);
      if (!hash) {
        continue;
      }
      const normalized = hash.trim().toLowerCase();
      if (!normalized || hashes.has(normalized)) {
        continue;
      }
      hashes.add(normalized);
      changed = true;
    }

    if (!changed) {
      return;
    }

    database.writeAppState(keys.knownHashesStateKey, Array.from(hashes));
  }

  function writeKnownHashes(hashes: Iterable<string>): void {
    const normalized = new Set<string>();
    for (const hash of hashes) {
      const value = hash.trim().toLowerCase();
      if (value) {
        normalized.add(value);
      }
    }
    database.writeAppState(keys.knownHashesStateKey, Array.from(normalized));
  }

  return {
    readQueueStateInternal,
    writeQueueState,
    readReviewedNodeHashState,
    writeReviewedNodeHashState,
    readKnownHashes,
    writeKnownHashes,
    persistKnownHashes,
  };
}
