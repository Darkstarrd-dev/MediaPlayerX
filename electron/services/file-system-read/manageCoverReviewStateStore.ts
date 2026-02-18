import {
  manageCoverReviewTaskSchema,
  type ManageCoverReviewTaskDto,
  type StartManageCoverReviewRequestDto,
} from "../../../src/contracts/backend";
import type { MediaLibraryDatabase } from "../../mediaLibraryDatabase";
import { normalizeHashes } from "./manageAdReviewService.utils";
import type {
  PersistedQueueItem,
  PersistedQueueState,
  ReviewedNodeHashState,
} from "./manageCoverReviewService.types";

const KNOWN_HASHES_STATE_KEY = "manage_cover_review_known_hashes_v1";
const QUEUE_STATE_KEY = "manage_cover_review_queue_v1";
const REVIEWED_NODE_HASH_STATE_KEY = "manage_cover_review_reviewed_nodes_v1";
const QUEUE_STATE_VERSION = 1;
const REVIEWED_NODE_HASH_STATE_VERSION = 1;

function normalizeStoredRequest(
  rawRequest: unknown,
  task: ManageCoverReviewTaskDto,
): StartManageCoverReviewRequestDto | null {
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
    strategy: task.execution?.strategy,
    max_concurrency: task.execution?.max_concurrency,
  };
}

export function readQueueStateInternal(
  database: MediaLibraryDatabase,
): PersistedQueueState {
  const fallback: PersistedQueueState = {
    version: QUEUE_STATE_VERSION,
    items: [],
  };

  const raw = database.readAppState<unknown>(QUEUE_STATE_KEY, fallback);
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const source = raw as { version?: unknown; items?: unknown };
  const rawItems = Array.isArray(source.items) ? source.items : [];
  const items: PersistedQueueItem[] = [];

  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== "object") {
      continue;
    }

    const taskResult = manageCoverReviewTaskSchema.safeParse(
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

    const effectiveNodeIds = Array.isArray(
      (rawItem as { effective_node_ids?: unknown }).effective_node_ids,
    )
      ? ((
          rawItem as { effective_node_ids: unknown[] }
        ).effective_node_ids.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        ) as string[])
      : [];
    const skippedNodeIds = Array.isArray(
      (rawItem as { skipped_node_ids?: unknown }).skipped_node_ids,
    )
      ? ((rawItem as { skipped_node_ids: unknown[] }).skipped_node_ids.filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        ) as string[])
      : [];

    const rawNodeHashById = (rawItem as { node_hash_by_id?: unknown })
      .node_hash_by_id;
    const nodeHashById: Record<string, string> = {};
    if (rawNodeHashById && typeof rawNodeHashById === "object") {
      for (const [nodeId, nodeHash] of Object.entries(
        rawNodeHashById as Record<string, unknown>,
      )) {
        if (typeof nodeHash === "string" && nodeHash.trim().length > 0) {
          nodeHashById[nodeId] = nodeHash.trim().toLowerCase();
        }
      }
    }

    items.push({
      task,
      request,
      effective_node_ids: effectiveNodeIds,
      skipped_node_ids: skippedNodeIds,
      node_hash_by_id: nodeHashById,
    });
  }

  return {
    version: QUEUE_STATE_VERSION,
    items,
  };
}

export function writeQueueState(
  database: MediaLibraryDatabase,
  state: PersistedQueueState,
): void {
  database.writeAppState(QUEUE_STATE_KEY, {
    version: QUEUE_STATE_VERSION,
    items: state.items,
  });
}

export function readReviewedNodeHashState(
  database: MediaLibraryDatabase,
): ReviewedNodeHashState {
  const fallback: ReviewedNodeHashState = {
    version: REVIEWED_NODE_HASH_STATE_VERSION,
    node_hash_by_id: {},
  };

  const raw = database.readAppState<unknown>(
    REVIEWED_NODE_HASH_STATE_KEY,
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
    const updatedAtMs = (payload as { updated_at_ms?: unknown }).updated_at_ms;
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
    version: REVIEWED_NODE_HASH_STATE_VERSION,
    node_hash_by_id: nodeHashById,
  };
}

export function writeReviewedNodeHashState(
  database: MediaLibraryDatabase,
  state: ReviewedNodeHashState,
): void {
  database.writeAppState(REVIEWED_NODE_HASH_STATE_KEY, {
    version: REVIEWED_NODE_HASH_STATE_VERSION,
    node_hash_by_id: state.node_hash_by_id,
  });
}

export function readKnownHashes(database: MediaLibraryDatabase): Set<string> {
  const raw = database.readAppState<unknown>(KNOWN_HASHES_STATE_KEY, []);
  return normalizeHashes(raw);
}

export function persistKnownHashes(
  database: MediaLibraryDatabase,
  imageIds: string[],
  candidateHashByImageId: Map<string, string>,
): void {
  const hashes = readKnownHashes(database);
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

  database.writeAppState(KNOWN_HASHES_STATE_KEY, Array.from(hashes));
}
