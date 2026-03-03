import {
  manageAdReviewTaskSchema,
  type ManageAdReviewTaskDto,
  type StartManageAdReviewRequestDto,
} from "../../../src/contracts/backend";
import type { MediaLibraryDatabase } from "../../mediaLibraryDatabase";

import {
  createManageReviewStateStore,
  normalizeManageReviewStoredRequest,
} from "./manageReviewStateStoreFactory";
import type {
  PersistedQueueState,
  ReviewedNodeHashState,
} from "./manageAdReviewService.types";

const KNOWN_HASHES_STATE_KEY = "manage_ad_review_known_hashes_v1";
const QUEUE_STATE_KEY = "manage_ad_review_queue_v1";
const REVIEWED_NODE_HASH_STATE_KEY = "manage_ad_review_reviewed_nodes_v1";
const QUEUE_STATE_VERSION = 1;
const REVIEWED_NODE_HASH_STATE_VERSION = 1;

function createStateStore(database: MediaLibraryDatabase) {
  return createManageReviewStateStore<
    ManageAdReviewTaskDto,
    StartManageAdReviewRequestDto
  >({
    database,
    keys: {
      knownHashesStateKey: KNOWN_HASHES_STATE_KEY,
      queueStateKey: QUEUE_STATE_KEY,
      reviewedNodeHashStateKey: REVIEWED_NODE_HASH_STATE_KEY,
    },
    queueStateVersion: QUEUE_STATE_VERSION,
    reviewedNodeHashStateVersion: REVIEWED_NODE_HASH_STATE_VERSION,
    taskParser: manageAdReviewTaskSchema,
    normalizeStoredRequest: (rawRequest, task) =>
      normalizeManageReviewStoredRequest(rawRequest, {
        strategy: task.execution?.strategy,
        max_concurrency: task.execution?.max_concurrency,
      }),
  });
}

export function readQueueStateInternal(
  database: MediaLibraryDatabase,
): PersistedQueueState {
  return createStateStore(database).readQueueStateInternal();
}

export function writeQueueState(
  database: MediaLibraryDatabase,
  state: PersistedQueueState,
): void {
  createStateStore(database).writeQueueState(state);
}

export function readReviewedNodeHashState(
  database: MediaLibraryDatabase,
): ReviewedNodeHashState {
  return createStateStore(database).readReviewedNodeHashState();
}

export function writeReviewedNodeHashState(
  database: MediaLibraryDatabase,
  state: ReviewedNodeHashState,
): void {
  createStateStore(database).writeReviewedNodeHashState(state);
}

export function readKnownHashes(database: MediaLibraryDatabase): Set<string> {
  return createStateStore(database).readKnownHashes();
}

export function persistKnownHashes(
  database: MediaLibraryDatabase,
  imageIds: string[],
  candidateHashByImageId: Map<string, string>,
): void {
  createStateStore(database).persistKnownHashes(
    imageIds,
    candidateHashByImageId,
  );
}
