import { describe, expect, it } from "vitest";

import type { ManageAdReviewTaskDto } from "../../contracts/backend";
import type { ImagePackage } from "../../types";
import { resolveAdReviewSidebarContext } from "./workspaceAdReviewSidebarContext";

function createPackage(id: string, treePath: string[]): ImagePackage {
  return {
    id,
    packageName: `${id}.zip`,
    displayName: id,
    absolutePath: treePath.join("/"),
    treePath,
    workTitle: id,
    seriesId: "",
    circle: "",
    author: "",
    tags: [],
    images: [
      {
        id: `${id}-img-1`,
        ordinal: 1,
        width: 100,
        height: 100,
        sizeKb: 10,
        cluster: 0,
        color: "#000000",
        mediaLocator: {
          kind: "filesystem",
          absolutePath: `${treePath.join("/")}/1.jpg`,
          extension: ".jpg",
          mediaType: "image",
          mimeType: "image/jpeg",
        },
      },
    ],
  };
}

function createTask(
  status: ManageAdReviewTaskDto["status"],
  candidates: ManageAdReviewTaskDto["candidates"],
): ManageAdReviewTaskDto {
  const now = Date.now();
  return {
    task_id: "task-1",
    status,
    progress: status === "running" ? 0.2 : 1,
    total_count: 1,
    reviewed_count: status === "running" ? 0 : 1,
    suspected_count: candidates.length,
    failed_count: 0,
    known_hash_hits: 0,
    llm_calls: 1,
    scope_image_ids: ["pkg-1-img-1"],
    image_source_by_id: { "pkg-1-img-1": "llm" },
    execution: {
      execution_mode: "normal",
      strategy: { mode: "all" },
      max_concurrency: 4,
    },
    audit: {
      source_distribution: {
        known_hash: 0,
        llm_suspected: candidates.length,
        llm_clean: 0,
        llm_failed: 0,
        strategy_skipped: 0,
      },
      llm_hit_rate: 1,
      overall_hit_rate: 1,
    },
    message: "ok",
    error_detail: null,
    candidates,
    created_at_ms: now,
    updated_at_ms: now,
  };
}

describe("resolveAdReviewSidebarContext", () => {
  it("starts ad-review sidebar mode even before candidates appear", () => {
    const task = createTask("running", []);
    const pkg = createPackage("pkg-1", ["X盘", "收藏", "pkg-1.zip"]);

    const result = resolveAdReviewSidebarContext({
      mode: "image",
      adReviewFocusTaskId: task.task_id,
      queueTasks: [task],
      packageByIdEffective: new Map([[pkg.id, pkg]]),
      sidebarNodeById: new Map(),
      selectedSidebarNodeId: null,
      imageTreeForSidebar: [],
    });

    expect(result.adReviewResultsMode).toBe(true);
    expect(result.adReviewFocusTask?.task_id).toBe(task.task_id);
    expect(result.sidebarImageTreeNodes).toEqual([]);
  });

  it("updates sidebar tree when candidates are added incrementally", () => {
    const runningTask = createTask("running", []);
    const reviewTask = createTask("review", [
      {
        image_id: "pkg-1-img-1",
        package_id: "pkg-1",
        package_name: "pkg-1.zip",
        display_name: "pkg-1",
        ordinal: 1,
        file_name: "1.jpg",
        reason: "suspected",
        source: "llm",
        hash: "hash-1",
      },
    ]);
    const pkg = createPackage("pkg-1", ["X盘", "收藏", "pkg-1.zip"]);

    const before = resolveAdReviewSidebarContext({
      mode: "image",
      adReviewFocusTaskId: runningTask.task_id,
      queueTasks: [runningTask],
      packageByIdEffective: new Map([[pkg.id, pkg]]),
      sidebarNodeById: new Map(),
      selectedSidebarNodeId: null,
      imageTreeForSidebar: [],
    });
    const after = resolveAdReviewSidebarContext({
      mode: "image",
      adReviewFocusTaskId: reviewTask.task_id,
      queueTasks: [reviewTask],
      packageByIdEffective: new Map([[pkg.id, pkg]]),
      sidebarNodeById: new Map(),
      selectedSidebarNodeId: null,
      imageTreeForSidebar: [],
    });

    expect(before.sidebarImageTreeNodes.length).toBe(0);
    expect(after.sidebarImageTreeNodes.length).toBeGreaterThan(0);
  });
});
