import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ManageAdReviewTaskDto } from "../../contracts/backend";
import type { MediaRepository } from "../backend/repository";
import { useManageAdReviewActions } from "./useManageAdReviewActions";

function createTask(
  taskId: string,
  status: ManageAdReviewTaskDto["status"],
  overrides?: Partial<ManageAdReviewTaskDto>,
): ManageAdReviewTaskDto {
  const now = Date.now();
  return {
    task_id: taskId,
    status,
    progress: 0,
    total_count: 10,
    reviewed_count: 0,
    suspected_count: 0,
    failed_count: 0,
    known_hash_hits: 0,
    llm_calls: 0,
    scope_image_ids: ["img-1", "img-2"],
    image_source_by_id: {},
    execution: {
      execution_mode: "normal",
      strategy: { mode: "all" },
      max_concurrency: 4,
    },
    audit: {
      source_distribution: {
        known_hash: 0,
        llm_suspected: 0,
        llm_clean: 0,
        llm_failed: 0,
        strategy_skipped: 0,
      },
      llm_hit_rate: 0,
      overall_hit_rate: 0,
    },
    message: null,
    error_detail: null,
    candidates: [],
    created_at_ms: now,
    updated_at_ms: now,
    ...overrides,
  };
}

function createQueueStateJson(tasks: ManageAdReviewTaskDto[]): string {
  return JSON.stringify({
    version: 1,
    items: tasks.map((task) => ({ task })),
  });
}

function createSelectionStateJson(
  taskSelectionById: Record<string, string[]>,
): string {
  return JSON.stringify({
    version: 1,
    task_selection_by_id: taskSelectionById,
  });
}

describe("useManageAdReviewActions", () => {
  it("merges running task progress from runtime read", async () => {
    const queueRunningTask = createTask("task-running", "running", {
      progress: 0,
      reviewed_count: 0,
      total_count: 20,
    });
    const queueReviewTask = createTask("task-review", "review", {
      progress: 1,
      reviewed_count: 8,
      total_count: 8,
    });
    const runtimeRunningTask = createTask("task-running", "running", {
      progress: 0.35,
      reviewed_count: 7,
      total_count: 20,
      audit: {
        source_distribution: {
          known_hash: 1,
          llm_suspected: 2,
          llm_clean: 4,
          llm_failed: 0,
          strategy_skipped: 0,
        },
        llm_hit_rate: 2 / 6,
        overall_hit_rate: 2 / 20,
      },
    });

    const readAppState = vi.fn().mockResolvedValue({
      state_json: createQueueStateJson([queueRunningTask, queueReviewTask]),
    });
    const readManageAdReviewTask = vi.fn().mockResolvedValue({
      task: runtimeRunningTask,
    });

    const repository = {
      readAppState,
      readManageAdReviewTask,
    } as unknown as MediaRepository;

    const { result } = renderHook(() =>
      useManageAdReviewActions({
        repository,
        mode: "image",
        manageMode: true,
        activeSelectionScope: null,
        imageCheckedIds: [],
        sidebarCheckedNodeIds: [],
        llmEndpoint: "",
        llmModel: "",
        adReviewStrategyMode: "all",
        adReviewHeadN: 0,
        adReviewTailN: 0,
        adReviewTailStopCleanStreak: 1,
        adReviewMaxConcurrency: 4,
        adReviewExecutionMode: "normal",
        clearAllSelections: vi.fn(),
        replaceImageCheckedIds: vi.fn(),
        setManageOperationHint: vi.fn(),
      }),
    );

    await waitFor(() => {
      expect(result.current.queueTasks).toHaveLength(2);
      expect(result.current.task?.task_id).toBe("task-running");
      expect(result.current.task?.reviewed_count).toBe(7);
      expect(result.current.task?.progress).toBe(0.35);
    });

    expect(readManageAdReviewTask).toHaveBeenCalled();
    expect(readManageAdReviewTask.mock.calls[0]).toEqual([
      { task_id: "task-running" },
      { timeoutMs: 10_000 },
    ]);
  });

  it("does not read runtime task when queue has no running item", async () => {
    const readAppState = vi.fn().mockResolvedValue({
      state_json: createQueueStateJson([
        createTask("task-review", "review", {
          progress: 1,
          reviewed_count: 2,
          total_count: 2,
        }),
      ]),
    });
    const readManageAdReviewTask = vi.fn();

    const repository = {
      readAppState,
      readManageAdReviewTask,
    } as unknown as MediaRepository;

    const { result } = renderHook(() =>
      useManageAdReviewActions({
        repository,
        mode: "image",
        manageMode: true,
        activeSelectionScope: null,
        imageCheckedIds: [],
        sidebarCheckedNodeIds: [],
        llmEndpoint: "",
        llmModel: "",
        adReviewStrategyMode: "all",
        adReviewHeadN: 0,
        adReviewTailN: 0,
        adReviewTailStopCleanStreak: 1,
        adReviewMaxConcurrency: 4,
        clearAllSelections: vi.fn(),
        replaceImageCheckedIds: vi.fn(),
        setManageOperationHint: vi.fn(),
      }),
    );

    await waitFor(() => {
      expect(result.current.queueTasks).toHaveLength(1);
      expect(result.current.task?.task_id).toBe("task-review");
    });

    expect(readManageAdReviewTask).not.toHaveBeenCalled();
  });

  it("reset action restores full candidate selection for reviewed task", async () => {
    const reviewTask = createTask("task-review", "review", {
      progress: 1,
      reviewed_count: 2,
      total_count: 2,
      candidates: [
        {
          image_id: "img-1",
          package_id: "pkg-1",
          package_name: "pkg-1.zip",
          display_name: "pkg-1",
          ordinal: 1,
          file_name: "001.jpg",
          reason: "suspected",
          source: "llm",
          hash: "hash-1",
        },
        {
          image_id: "img-2",
          package_id: "pkg-1",
          package_name: "pkg-1.zip",
          display_name: "pkg-1",
          ordinal: 2,
          file_name: "002.jpg",
          reason: "suspected",
          source: "llm",
          hash: "hash-2",
        },
      ],
    });

    const readAppState = vi.fn().mockResolvedValue({
      state_json: createQueueStateJson([reviewTask]),
    });
    const replaceImageCheckedIds = vi.fn();
    const setManageOperationHint = vi.fn();

    const repository = {
      readAppState,
    } as unknown as MediaRepository;

    const { result } = renderHook(() =>
      useManageAdReviewActions({
        repository,
        mode: "image",
        manageMode: true,
        activeSelectionScope: "image",
        imageCheckedIds: ["img-1"],
        sidebarCheckedNodeIds: [],
        llmEndpoint: "",
        llmModel: "",
        adReviewStrategyMode: "all",
        adReviewHeadN: 0,
        adReviewTailN: 0,
        adReviewTailStopCleanStreak: 1,
        adReviewMaxConcurrency: 4,
        clearAllSelections: vi.fn(),
        replaceImageCheckedIds,
        setManageOperationHint,
      }),
    );

    await waitFor(() => {
      expect(result.current.task?.task_id).toBe("task-review");
    });

    act(() => {
      result.current.dismissTask();
    });

    expect(replaceImageCheckedIds).toHaveBeenCalledWith(
      ["img-1", "img-2"],
      false,
    );
    expect(setManageOperationHint).toHaveBeenCalledWith(
      "已重置剔除，恢复全选候选",
    );
  });

  it("passes skip_reviewed_nodes option when starting review", async () => {
    const reviewTask = createTask("task-review", "review", {
      progress: 1,
      reviewed_count: 1,
      total_count: 1,
      scope_image_ids: ["img-1"],
    });
    const startManageAdReview = vi.fn().mockResolvedValue({ task: reviewTask });
    const readAppState = vi.fn().mockResolvedValue({
      state_json: createQueueStateJson([reviewTask]),
    });

    const repository = {
      startManageAdReview,
      readAppState,
    } as unknown as MediaRepository;

    const { result } = renderHook(() =>
      useManageAdReviewActions({
        repository,
        mode: "image",
        manageMode: true,
        activeSelectionScope: "image",
        imageCheckedIds: ["img-1"],
        sidebarCheckedNodeIds: [],
        llmEndpoint: "http://127.0.0.1:1234/v1",
        llmModel: "mock-model",
        adReviewStrategyMode: "all",
        adReviewHeadN: 0,
        adReviewTailN: 0,
        adReviewTailStopCleanStreak: 1,
        adReviewMaxConcurrency: 4,
        clearAllSelections: vi.fn(),
        replaceImageCheckedIds: vi.fn(),
        setManageOperationHint: vi.fn(),
      }),
    );

    act(() => {
      void result.current.startManageAdReview({ skipReviewedNodes: false });
    });

    await waitFor(() => {
      expect(startManageAdReview).toHaveBeenCalled();
    });

    const firstPayload = startManageAdReview.mock.calls[0]?.[0];
    expect(firstPayload?.skip_reviewed_nodes).toBe(false);
  });

  it("forces head-tail strategy when execution mode is performance", async () => {
    const reviewTask = createTask("task-review", "review", {
      progress: 1,
      reviewed_count: 1,
      total_count: 1,
      scope_image_ids: ["img-1"],
    });
    const startManageAdReview = vi.fn().mockResolvedValue({ task: reviewTask });
    const readAppState = vi.fn().mockResolvedValue({
      state_json: createQueueStateJson([reviewTask]),
    });

    const repository = {
      startManageAdReview,
      readAppState,
    } as unknown as MediaRepository;

    const { result } = renderHook(() =>
      useManageAdReviewActions({
        repository,
        mode: "image",
        manageMode: true,
        activeSelectionScope: "image",
        imageCheckedIds: ["img-1"],
        sidebarCheckedNodeIds: [],
        llmEndpoint: "http://127.0.0.1:1234/v1",
        llmModel: "mock-model",
        adReviewStrategyMode: "all",
        adReviewExecutionMode: "performance",
        adReviewHeadN: 3,
        adReviewTailN: 8,
        adReviewTailStopCleanStreak: 1,
        adReviewMaxConcurrency: 4,
        clearAllSelections: vi.fn(),
        replaceImageCheckedIds: vi.fn(),
        setManageOperationHint: vi.fn(),
      }),
    );

    act(() => {
      void result.current.startManageAdReview({ skipReviewedNodes: false });
    });

    await waitFor(() => {
      expect(startManageAdReview).toHaveBeenCalled();
    });

    const firstPayload = startManageAdReview.mock.calls[0]?.[0];
    expect(firstPayload?.execution_mode).toBe("performance");
    expect(firstPayload?.strategy?.mode).toBe("head-tail");
    expect(firstPayload?.strategy?.head_n).toBe(3);
    expect(firstPayload?.strategy?.tail_n).toBe(8);
  });

  it("restores deselected review candidates from persisted selection state after reload", async () => {
    const reviewTask = createTask("task-review", "review", {
      progress: 1,
      reviewed_count: 3,
      total_count: 3,
      candidates: [
        {
          image_id: "img-1",
          package_id: "pkg-1",
          package_name: "pkg-1.zip",
          display_name: "pkg-1",
          ordinal: 1,
          file_name: "001.jpg",
          reason: "suspected",
          source: "llm",
          hash: "hash-1",
        },
        {
          image_id: "img-2",
          package_id: "pkg-1",
          package_name: "pkg-1.zip",
          display_name: "pkg-1",
          ordinal: 2,
          file_name: "002.jpg",
          reason: "suspected",
          source: "llm",
          hash: "hash-2",
        },
        {
          image_id: "img-3",
          package_id: "pkg-1",
          package_name: "pkg-1.zip",
          display_name: "pkg-1",
          ordinal: 3,
          file_name: "003.jpg",
          reason: "suspected",
          source: "llm",
          hash: "hash-3",
        },
      ],
    });

    const readAppState = vi
      .fn()
      .mockImplementation(async (request: { state_key: string }) => {
        if (request.state_key === "manage_ad_review_selection_v1") {
          return {
            state_json: createSelectionStateJson({
              "task-review": ["img-2"],
            }),
          };
        }

        return {
          state_json: createQueueStateJson([reviewTask]),
        };
      });
    const replaceImageCheckedIds = vi.fn();

    const repository = {
      readAppState,
    } as unknown as MediaRepository;

    renderHook(() =>
      useManageAdReviewActions({
        repository,
        mode: "image",
        manageMode: true,
        activeSelectionScope: null,
        imageCheckedIds: [],
        sidebarCheckedNodeIds: [],
        llmEndpoint: "",
        llmModel: "",
        adReviewStrategyMode: "all",
        adReviewHeadN: 0,
        adReviewTailN: 0,
        adReviewTailStopCleanStreak: 1,
        adReviewMaxConcurrency: 4,
        clearAllSelections: vi.fn(),
        replaceImageCheckedIds,
        setManageOperationHint: vi.fn(),
      }),
    );

    await waitFor(() => {
      expect(replaceImageCheckedIds).toHaveBeenCalledWith(
        ["img-1", "img-3"],
        false,
      );
    });
  });

  it("persists deselected review candidates when selection changes", async () => {
    const reviewTask = createTask("task-review", "review", {
      progress: 1,
      reviewed_count: 2,
      total_count: 2,
      candidates: [
        {
          image_id: "img-1",
          package_id: "pkg-1",
          package_name: "pkg-1.zip",
          display_name: "pkg-1",
          ordinal: 1,
          file_name: "001.jpg",
          reason: "suspected",
          source: "llm",
          hash: "hash-1",
        },
        {
          image_id: "img-2",
          package_id: "pkg-1",
          package_name: "pkg-1.zip",
          display_name: "pkg-1",
          ordinal: 2,
          file_name: "002.jpg",
          reason: "suspected",
          source: "llm",
          hash: "hash-2",
        },
      ],
    });

    const readAppState = vi
      .fn()
      .mockImplementation(async (request: { state_key: string }) => {
        if (request.state_key === "manage_ad_review_selection_v1") {
          return {
            state_json: createSelectionStateJson({}),
          };
        }
        return {
          state_json: createQueueStateJson([reviewTask]),
        };
      });
    const writeAppState = vi
      .fn()
      .mockResolvedValue({ updated_at_ms: Date.now() });

    const repository = {
      readAppState,
      writeAppState,
    } as unknown as MediaRepository;
    const clearAllSelections = vi.fn();
    const replaceImageCheckedIds = vi.fn();
    const setManageOperationHint = vi.fn();

    const { rerender } = renderHook(
      (props: { imageCheckedIds: string[] }) =>
        useManageAdReviewActions({
          repository,
          mode: "image",
          manageMode: true,
          activeSelectionScope: "image",
          imageCheckedIds: props.imageCheckedIds,
          sidebarCheckedNodeIds: [],
          llmEndpoint: "",
          llmModel: "",
          adReviewStrategyMode: "all",
          adReviewHeadN: 0,
          adReviewTailN: 0,
          adReviewTailStopCleanStreak: 1,
          adReviewMaxConcurrency: 4,
          clearAllSelections,
          replaceImageCheckedIds,
          setManageOperationHint,
        }),
      {
        initialProps: {
          imageCheckedIds: ["img-1", "img-2"],
        },
      },
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    rerender({
      imageCheckedIds: ["img-1"],
    });

    await waitFor(() => {
      expect(writeAppState).toHaveBeenCalled();
    });

    const latestRequest = writeAppState.mock.calls.at(-1)?.[0] as {
      state_json: string;
    };
    const parsed = JSON.parse(latestRequest.state_json) as {
      task_selection_by_id: Record<string, string[]>;
    };
    expect(parsed.task_selection_by_id["task-review"]).toEqual(["img-2"]);
  });

  it("does not persist all-candidate deselection when exiting review panel", async () => {
    const reviewTask = createTask("task-review", "review", {
      progress: 1,
      reviewed_count: 2,
      total_count: 2,
      candidates: [
        {
          image_id: "img-1",
          package_id: "pkg-1",
          package_name: "pkg-1.zip",
          display_name: "pkg-1",
          ordinal: 1,
          file_name: "001.jpg",
          reason: "suspected",
          source: "llm",
          hash: "hash-1",
        },
        {
          image_id: "img-2",
          package_id: "pkg-1",
          package_name: "pkg-1.zip",
          display_name: "pkg-1",
          ordinal: 2,
          file_name: "002.jpg",
          reason: "suspected",
          source: "llm",
          hash: "hash-2",
        },
      ],
    });

    const readAppState = vi
      .fn()
      .mockImplementation(async (request: { state_key: string }) => {
        if (request.state_key === "manage_ad_review_selection_v1") {
          return {
            state_json: createSelectionStateJson({
              "task-review": [],
            }),
          };
        }

        return {
          state_json: createQueueStateJson([reviewTask]),
        };
      });
    const writeAppState = vi
      .fn()
      .mockResolvedValue({ updated_at_ms: Date.now() });

    const repository = {
      readAppState,
      writeAppState,
    } as unknown as MediaRepository;
    const clearAllSelections = vi.fn();
    const replaceImageCheckedIds = vi.fn();
    const setManageOperationHint = vi.fn();

    const { rerender } = renderHook(
      (props: {
        imageCheckedIds: string[];
        manageMode: boolean;
        adReviewPanelOpen: boolean;
      }) =>
        useManageAdReviewActions({
          repository,
          mode: "image",
          manageMode: props.manageMode,
          activeSelectionScope: "image",
          imageCheckedIds: props.imageCheckedIds,
          sidebarCheckedNodeIds: [],
          llmEndpoint: "",
          llmModel: "",
          adReviewStrategyMode: "all",
          adReviewHeadN: 0,
          adReviewTailN: 0,
          adReviewTailStopCleanStreak: 1,
          adReviewMaxConcurrency: 4,
          clearAllSelections,
          replaceImageCheckedIds,
          setManageOperationHint,
          adReviewPanelOpen: props.adReviewPanelOpen,
          adReviewFocusTaskId: "task-review",
        }),
      {
        initialProps: {
          imageCheckedIds: ["img-1", "img-2"],
          manageMode: true,
          adReviewPanelOpen: true,
        },
      },
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    writeAppState.mockClear();

    rerender({
      imageCheckedIds: [],
      manageMode: false,
      adReviewPanelOpen: false,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(writeAppState).not.toHaveBeenCalled();
  });

  it("restores task-isolated deselection after leaving and re-entering review panel", async () => {
    const reviewTask = createTask("task-review", "review", {
      progress: 1,
      reviewed_count: 3,
      total_count: 3,
      candidates: [
        {
          image_id: "img-1",
          package_id: "pkg-1",
          package_name: "pkg-1.zip",
          display_name: "pkg-1",
          ordinal: 1,
          file_name: "001.jpg",
          reason: "suspected",
          source: "llm",
          hash: "hash-1",
        },
        {
          image_id: "img-2",
          package_id: "pkg-1",
          package_name: "pkg-1.zip",
          display_name: "pkg-1",
          ordinal: 2,
          file_name: "002.jpg",
          reason: "suspected",
          source: "llm",
          hash: "hash-2",
        },
        {
          image_id: "img-3",
          package_id: "pkg-1",
          package_name: "pkg-1.zip",
          display_name: "pkg-1",
          ordinal: 3,
          file_name: "003.jpg",
          reason: "suspected",
          source: "llm",
          hash: "hash-3",
        },
      ],
    });

    const readAppState = vi
      .fn()
      .mockImplementation(async (request: { state_key: string }) => {
        if (request.state_key === "manage_ad_review_selection_v1") {
          return {
            state_json: createSelectionStateJson({
              "task-review": ["img-2"],
            }),
          };
        }

        return {
          state_json: createQueueStateJson([reviewTask]),
        };
      });

    const repository = {
      readAppState,
    } as unknown as MediaRepository;
    const replaceImageCheckedIds = vi.fn();

    const { rerender } = renderHook(
      (props: {
        manageMode: boolean;
        adReviewPanelOpen: boolean;
        imageCheckedIds: string[];
      }) =>
        useManageAdReviewActions({
          repository,
          mode: "image",
          manageMode: props.manageMode,
          activeSelectionScope: null,
          imageCheckedIds: props.imageCheckedIds,
          sidebarCheckedNodeIds: [],
          llmEndpoint: "",
          llmModel: "",
          adReviewStrategyMode: "all",
          adReviewHeadN: 0,
          adReviewTailN: 0,
          adReviewTailStopCleanStreak: 1,
          adReviewMaxConcurrency: 4,
          clearAllSelections: vi.fn(),
          replaceImageCheckedIds,
          setManageOperationHint: vi.fn(),
          adReviewPanelOpen: props.adReviewPanelOpen,
          adReviewFocusTaskId: "task-review",
        }),
      {
        initialProps: {
          manageMode: true,
          adReviewPanelOpen: true,
          imageCheckedIds: ["img-1", "img-3"],
        },
      },
    );

    await waitFor(() => {
      expect(replaceImageCheckedIds).toHaveBeenCalledWith(
        ["img-1", "img-3"],
        false,
      );
    });

    replaceImageCheckedIds.mockClear();

    rerender({
      manageMode: false,
      adReviewPanelOpen: false,
      imageCheckedIds: [],
    });

    rerender({
      manageMode: true,
      adReviewPanelOpen: true,
      imageCheckedIds: ["img-1", "img-3"],
    });

    await waitFor(() => {
      expect(replaceImageCheckedIds).toHaveBeenCalledWith(
        ["img-1", "img-3"],
        false,
      );
    });
  });
});
