import { describe, expect, it } from "vitest";

import type {
  ManageAdReviewTaskDto,
  ManageCoverReviewTaskDto,
  StartManageAdReviewRequestDto,
  StartManageCoverReviewRequestDto,
} from "../../../src/contracts/backend";
import type { MediaLibraryDatabase } from "../../mediaLibraryDatabase";
import {
  persistKnownHashes as persistAdKnownHashes,
  readQueueStateInternal as readAdQueueStateInternal,
  readReviewedNodeHashState as readAdReviewedNodeHashState,
} from "./manageAdReviewStateStore";
import {
  persistKnownHashes as persistCoverKnownHashes,
  readQueueStateInternal as readCoverQueueStateInternal,
  writeQueueState as writeCoverQueueState,
} from "./manageCoverReviewStateStore";

const AD_QUEUE_STATE_KEY = "manage_ad_review_queue_v1";
const AD_REVIEWED_NODE_HASH_STATE_KEY = "manage_ad_review_reviewed_nodes_v1";
const AD_KNOWN_HASHES_STATE_KEY = "manage_ad_review_known_hashes_v1";
const COVER_KNOWN_HASHES_STATE_KEY = "manage_cover_review_known_hashes_v1";

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createDatabaseFixture() {
  const appState = new Map<string, unknown>();
  const database = {
    readAppState<T>(stateKey: string, fallback: T): T {
      if (!appState.has(stateKey)) {
        return fallback;
      }
      return cloneValue(appState.get(stateKey) as T);
    },
    writeAppState(stateKey: string, value: unknown): void {
      appState.set(stateKey, cloneValue(value));
    },
  } as unknown as MediaLibraryDatabase;

  return {
    database,
    appState,
  };
}

function createTask(taskId: string): ManageAdReviewTaskDto {
  return {
    task_id: taskId,
    status: "pending",
    progress: 0,
    total_count: 1,
    reviewed_count: 0,
    suspected_count: 0,
    failed_count: 0,
    known_hash_hits: 0,
    llm_calls: 0,
    scope_image_ids: ["img-1"],
    image_source_by_id: {},
    execution: {
      execution_mode: "normal",
      strategy: { mode: "all" },
      max_concurrency: 2,
    },
    audit: undefined,
    message: null,
    error_detail: null,
    candidates: [],
    created_at_ms: 1,
    updated_at_ms: 1,
  };
}

describe("manage review state store factory wrappers", () => {
  it("Ad store 可读取队列并过滤非法条目", () => {
    const { database, appState } = createDatabaseFixture();
    const task = createTask("task-ad-1");
    const request: StartManageAdReviewRequestDto = {
      selection_scope: "image",
      image_ids: ["img-1"],
      llm_endpoint: "http://127.0.0.1:1234/v1",
      llm_model: "demo-model",
    };

    appState.set(AD_QUEUE_STATE_KEY, {
      version: 1,
      items: [
        {
          task,
          request,
          effective_node_ids: ["node-1", "", 123],
          skipped_node_ids: ["node-2"],
          node_hash_by_id: {
            "node-1": "  HASH-A  ",
          },
        },
        {
          task: {
            ...task,
            status: "unknown-status",
          },
          request,
        },
      ],
    });

    const state = readAdQueueStateInternal(database);

    expect(state.items).toHaveLength(1);
    expect(state.items[0].task.task_id).toBe("task-ad-1");
    expect(state.items[0].request.strategy).toEqual({ mode: "all" });
    expect(state.items[0].request.max_concurrency).toBe(2);
    expect(state.items[0].effective_node_ids).toEqual(["node-1"]);
    expect(state.items[0].node_hash_by_id).toEqual({
      "node-1": "hash-a",
    });
  });

  it("Cover store 队列写入后可兼容读取", () => {
    const { database } = createDatabaseFixture();
    const task = createTask("task-cover-1") as ManageCoverReviewTaskDto;
    const request: StartManageCoverReviewRequestDto = {
      selection_scope: "sidebar",
      node_ids: ["node-1"],
      llm_endpoint: "http://127.0.0.1:1234/v1",
      llm_model: "demo-model",
    };

    writeCoverQueueState(database, {
      version: 1,
      items: [
        {
          task,
          request,
          effective_node_ids: ["node-1"],
          skipped_node_ids: [],
          node_hash_by_id: {
            "node-1": "Hash-B",
          },
        },
      ],
    });

    const state = readCoverQueueStateInternal(database);

    expect(state.items).toHaveLength(1);
    expect(state.items[0].task.task_id).toBe("task-cover-1");
    expect(state.items[0].request.selection_scope).toBe("sidebar");
    expect(state.items[0].node_hash_by_id).toEqual({
      "node-1": "hash-b",
    });
  });

  it("已知哈希与已审核节点读取保持去重与健壮性", () => {
    const { database, appState } = createDatabaseFixture();
    appState.set(AD_KNOWN_HASHES_STATE_KEY, [" Hash-A ", "hash-a"]);
    appState.set(COVER_KNOWN_HASHES_STATE_KEY, [" HASH-C "]);
    appState.set(AD_REVIEWED_NODE_HASH_STATE_KEY, {
      version: 1,
      node_hash_by_id: {
        "node-ok": { node_hash: "  HASH-Z ", updated_at_ms: 12.9 },
        "node-bad": { node_hash: "", updated_at_ms: -1 },
      },
    });

    persistAdKnownHashes(database, ["img-1"], new Map([["img-1", "hash-b"]]));
    persistCoverKnownHashes(
      database,
      ["img-2"],
      new Map([["img-2", "hash-c"]]),
    );

    const reviewed = readAdReviewedNodeHashState(database);
    const adKnown = appState.get(AD_KNOWN_HASHES_STATE_KEY);
    const coverKnown = appState.get(COVER_KNOWN_HASHES_STATE_KEY);

    expect(reviewed.node_hash_by_id).toEqual({
      "node-ok": {
        node_hash: "hash-z",
        updated_at_ms: 12,
      },
    });
    expect(adKnown).toEqual(["hash-a", "hash-b"]);
    expect(coverKnown).toEqual([" HASH-C "]);
  });
});
