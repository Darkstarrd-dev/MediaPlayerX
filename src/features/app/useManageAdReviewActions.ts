import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  manageAdReviewTaskSchema,
  manageCoverReviewTaskSchema,
  type ManageAdReviewTaskDto,
  type ManageAdReviewExecutionModeDto,
  type ManageReviewModeDto,
} from "../../contracts/backend";
import { useI18n } from "../../i18n/useI18n";
import type { BrowserMode } from "../../types";
import type { MediaRepository } from "../backend/repository";
import { getErrorCode, toErrorDetailWithCode } from "./errorCode";

const REVIEW_POLL_INTERVAL_MS = 1_000;
const REVIEW_START_TIMEOUT_MS = 60_000;
const REVIEW_READ_TIMEOUT_MS = 10_000;
const REVIEW_PAUSE_TIMEOUT_MS = 10_000;
const REVIEW_DELETE_TIMEOUT_MS = 20_000;
const REVIEW_QUEUE_WRITE_TIMEOUT_MS = 10_000;
const REVIEW_QUEUE_STATE_KEY_BY_MODE: Record<ManageReviewModeDto, string> = {
  ad: "manage_ad_review_queue_v1",
  cover: "manage_cover_review_queue_v1",
};
const REVIEW_SELECTION_STATE_KEY_BY_MODE: Record<ManageReviewModeDto, string> =
  {
    ad: "manage_ad_review_selection_v1",
    cover: "manage_cover_review_selection_v1",
  };

function resolveTaskSchemaByMode(reviewMode: ManageReviewModeDto) {
  return reviewMode === "cover"
    ? manageCoverReviewTaskSchema
    : manageAdReviewTaskSchema;
}

interface PersistedSelectionRaw {
  version: number;
  task_selection_by_id: Record<string, unknown>;
}

interface UseManageAdReviewActionsParams {
  repository: MediaRepository;
  mode: BrowserMode;
  manageMode: boolean;
  reviewMode?: ManageReviewModeDto;
  onReviewModeChange?: (nextMode: ManageReviewModeDto) => void;
  activeSelectionScope: "sidebar" | "image" | null;
  imageCheckedIds: string[];
  sidebarCheckedNodeIds: string[];
  llmEndpoint: string;
  llmModel: string;
  adReviewStrategyMode: "all" | "head-tail";
  adReviewHeadN: number;
  adReviewTailN: number;
  adReviewTailStopCleanStreak: number;
  adReviewMaxConcurrency: number;
  adReviewExecutionMode?: ManageAdReviewExecutionModeDto;
  clearAllSelections: () => void;
  replaceImageCheckedIds: (imageIds: string[], append?: boolean) => void;
  setManageOperationHint: (message: string | null) => void;
  setAdReviewResultSourceIds?: (sourceIds: string[]) => void;
  setAdReviewResultImageIds?: (imageIds: string[]) => void;
  adReviewPanelOpen?: boolean;
  adReviewFocusTaskId?: string | null;
  onDeleteRoundCompleted?: (payload: {
    firstHitImageId: string | null;
    firstHitPackageId: string | null;
  }) => void;
}

interface DeleteSelectedCandidatesResult {
  ok: boolean;
  firstHitImageId: string | null;
  firstHitPackageId: string | null;
}

interface PersistedQueueRaw {
  version: number;
  items: Array<{
    task?: unknown;
    [key: string]: unknown;
  }>;
}

interface UseManageAdReviewActionsResult {
  reviewMode: ManageReviewModeDto;
  applyActionMode: ManageReviewModeDto;
  supportsCoverReview: boolean;
  setReviewMode: (nextMode: ManageReviewModeDto) => void;
  task: ManageAdReviewTaskDto | null;
  queueTasks: ManageAdReviewTaskDto[];
  activeTaskId: string | null;
  runningTaskId: string | null;
  hasRunningTask: boolean;
  pending: boolean;
  deletePending: boolean;
  deleteProgress: {
    completed: number;
    total: number;
  };
  hideUncheckedNonChecked: boolean;
  hasCheckedCandidateSelection: boolean;
  selectedCandidateCount: number;
  scopeImageIds: string[];
  llmReviewedImageIds: string[];
  nonLlmReviewedImageIds: string[];
  startManageAdReview: (options?: {
    skipReviewedNodes?: boolean;
  }) => Promise<ManageAdReviewTaskDto | null>;
  pauseManageAdReview: () => Promise<void>;
  toggleHideUncheckedNonChecked: () => void;
  confirmDeleteSelectedCandidates: () => Promise<DeleteSelectedCandidatesResult>;
  dismissTask: () => void;
  selectTask: (taskId: string) => void;
  removeTask: (
    taskId: string,
    options?: { silentHint?: boolean },
  ) => Promise<boolean>;
}

function normalizeSelectionIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const candidateId = item.trim();
    if (!candidateId) {
      continue;
    }
    normalized.add(candidateId);
  }

  return Array.from(normalized);
}

function parsePersistedSelectionByTaskId(
  stateJson: string,
): Record<string, string[]> {
  try {
    const parsed = JSON.parse(stateJson) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const source = parsed as Partial<PersistedSelectionRaw>;
    const rawByTaskId = source.task_selection_by_id;
    if (
      !rawByTaskId ||
      typeof rawByTaskId !== "object" ||
      Array.isArray(rawByTaskId)
    ) {
      return {};
    }

    const selectionByTaskId: Record<string, string[]> = {};
    for (const [taskId, rawSelection] of Object.entries(
      rawByTaskId as Record<string, unknown>,
    )) {
      const normalizedTaskId = taskId.trim();
      if (!normalizedTaskId) {
        continue;
      }

      const normalizedIds = normalizeSelectionIds(rawSelection);
      selectionByTaskId[normalizedTaskId] = normalizedIds;
    }

    return selectionByTaskId;
  } catch {
    return {};
  }
}

function toPersistedSelectionStateJson(
  selectionByTaskId: Record<string, string[]>,
): string {
  return JSON.stringify({
    version: 1,
    task_selection_by_id: selectionByTaskId,
  });
}

function areStringArraysEqual(
  left: string[] | undefined,
  right: string[],
): boolean {
  if (!left) {
    return false;
  }
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function parseQueueRaw(stateJson: string): PersistedQueueRaw {
  try {
    const parsed = JSON.parse(stateJson) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return { version: 1, items: [] };
    }
    const version =
      typeof (parsed as { version?: unknown }).version === "number"
        ? (parsed as { version: number }).version
        : 1;
    const items = Array.isArray((parsed as { items?: unknown }).items)
      ? ((
          parsed as { items: Array<{ task?: unknown; [key: string]: unknown }> }
        ).items ?? [])
      : [];
    return {
      version,
      items,
    };
  } catch {
    return { version: 1, items: [] };
  }
}

function parseQueueTasks(
  stateJson: string,
  reviewMode: ManageReviewModeDto,
): ManageAdReviewTaskDto[] {
  const raw = parseQueueRaw(stateJson);
  const tasks: ManageAdReviewTaskDto[] = [];
  const taskSchema = resolveTaskSchemaByMode(reviewMode);

  for (const item of raw.items) {
    const parsedTask = taskSchema.safeParse(item.task);
    if (!parsedTask.success) {
      continue;
    }
    tasks.push(parsedTask.data);
  }

  return tasks;
}

function upsertTask(
  tasks: ManageAdReviewTaskDto[],
  nextTask: ManageAdReviewTaskDto,
): ManageAdReviewTaskDto[] {
  const index = tasks.findIndex((task) => task.task_id === nextTask.task_id);
  if (index < 0) {
    return [...tasks, nextTask];
  }

  const next = [...tasks];
  next[index] = nextTask;
  return next;
}

export function useManageAdReviewActions({
  repository,
  mode,
  manageMode,
  reviewMode = "ad",
  onReviewModeChange = () => undefined,
  activeSelectionScope,
  imageCheckedIds,
  sidebarCheckedNodeIds,
  llmEndpoint,
  llmModel,
  adReviewStrategyMode,
  adReviewHeadN,
  adReviewTailN,
  adReviewTailStopCleanStreak,
  adReviewMaxConcurrency,
  adReviewExecutionMode = "normal",
  clearAllSelections,
  replaceImageCheckedIds,
  setManageOperationHint,
  setAdReviewResultSourceIds,
  setAdReviewResultImageIds,
  adReviewPanelOpen = true,
  adReviewFocusTaskId = null,
  onDeleteRoundCompleted,
}: UseManageAdReviewActionsParams): UseManageAdReviewActionsResult {
  const { t } = useI18n();

  const [queueTasks, setQueueTasks] = useState<ManageAdReviewTaskDto[]>([]);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [selectionLoaded, setSelectionLoaded] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({
    completed: 0,
    total: 0,
  });
  const [hideUncheckedNonChecked, setHideUncheckedNonChecked] = useState(false);
  const pollingTimerRef = useRef<ReturnType<typeof window.setInterval> | null>(
    null,
  );
  const selectionPersistTimerRef = useRef<ReturnType<
    typeof window.setTimeout
  > | null>(null);
  const selectionByTaskIdRef = useRef<Record<string, string[]>>({});
  const selectionSyncSignatureByTaskIdRef = useRef<Record<string, string>>({});
  const queueStateKey = REVIEW_QUEUE_STATE_KEY_BY_MODE[reviewMode];
  const selectionStateKey = REVIEW_SELECTION_STATE_KEY_BY_MODE[reviewMode];
  const taskSchema = useMemo(
    () => resolveTaskSchemaByMode(reviewMode),
    [reviewMode],
  );
  const supportsCoverReview = Boolean(
    repository.startManageCoverReview &&
    repository.readManageCoverReviewTask &&
    repository.pauseManageCoverReviewTask &&
    repository.confirmManageCoverReviewHide,
  );

  const activeScope = useMemo(() => {
    if (
      activeSelectionScope === "sidebar" &&
      sidebarCheckedNodeIds.length > 0
    ) {
      return "sidebar" as const;
    }
    if (imageCheckedIds.length > 0) {
      return "image" as const;
    }
    return null;
  }, [
    activeSelectionScope,
    imageCheckedIds.length,
    sidebarCheckedNodeIds.length,
  ]);

  const disposePolling = useCallback(() => {
    if (pollingTimerRef.current !== null) {
      window.clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  }, []);

  const disposeSelectionPersistTimer = useCallback(() => {
    if (selectionPersistTimerRef.current !== null) {
      window.clearTimeout(selectionPersistTimerRef.current);
      selectionPersistTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      disposePolling();
      disposeSelectionPersistTimer();
    },
    [disposePolling, disposeSelectionPersistTimer],
  );

  const persistSelectionState = useCallback(async () => {
    const writeAppState = repository.writeAppState;
    if (!writeAppState) {
      return;
    }

    try {
      await writeAppState(
        {
          state_key: selectionStateKey,
          state_json: toPersistedSelectionStateJson(
            selectionByTaskIdRef.current,
          ),
        },
        { timeoutMs: REVIEW_QUEUE_WRITE_TIMEOUT_MS },
      );
    } catch {
      // Ignore persistence failures silently to avoid interrupting review workflow.
    }
  }, [repository.writeAppState, selectionStateKey]);

  const schedulePersistSelectionState = useCallback(() => {
    if (!repository.writeAppState) {
      return;
    }

    disposeSelectionPersistTimer();
    selectionPersistTimerRef.current = window.setTimeout(() => {
      selectionPersistTimerRef.current = null;
      void persistSelectionState();
    }, 120);
  }, [
    disposeSelectionPersistTimer,
    persistSelectionState,
    repository.writeAppState,
  ]);

  useEffect(
    () => () => {
      if (selectionPersistTimerRef.current !== null) {
        void persistSelectionState();
      }
    },
    [persistSelectionState],
  );

  const loadQueueTasks = useCallback(
    async (options?: { silent?: boolean }) => {
      const readAppState = repository.readAppState;
      if (!readAppState) {
        return null;
      }

      try {
        const response = await readAppState(
          {
            state_key: queueStateKey,
            fallback_json: JSON.stringify({ version: 1, items: [] }),
          },
          { timeoutMs: REVIEW_READ_TIMEOUT_MS },
        );
        let tasks = parseQueueTasks(response.state_json, reviewMode);
        const runningTaskId =
          tasks.find((item) => item.status === "running")?.task_id ?? null;
        const readTask =
          reviewMode === "cover"
            ? repository.readManageCoverReviewTask
            : repository.readManageAdReviewTask;
        if (runningTaskId && readTask) {
          try {
            const runtimeResponse = await readTask(
              { task_id: runningTaskId },
              { timeoutMs: REVIEW_READ_TIMEOUT_MS },
            );
            const runtimeTask = runtimeResponse.task;
            if (runtimeTask && runtimeTask.task_id === runningTaskId) {
              tasks = tasks.map((item) =>
                item.task_id === runningTaskId ? runtimeTask : item,
              );
            }
          } catch {
            // Keep queue snapshot as fallback when runtime task read fails.
          }
        }
        setQueueTasks(tasks);
        setQueueLoaded(true);
        setActiveTaskId((previous) => {
          if (previous && tasks.some((task) => task.task_id === previous)) {
            return previous;
          }

          const runningTask = tasks.find((task) => task.status === "running");
          if (runningTask) {
            return runningTask.task_id;
          }

          return tasks.length > 0
            ? (tasks[tasks.length - 1]?.task_id ?? null)
            : null;
        });
        return tasks;
      } catch (error) {
        setQueueLoaded(true);
        if (!options?.silent) {
          const message = toErrorDetailWithCode(error, t);
          setManageOperationHint(
            t("ui.manage.hint.queueReadFailed", { message }),
          );
        }
        return null;
      }
    },
    [queueStateKey, repository, reviewMode, setManageOperationHint, t],
  );

  useEffect(() => {
    const readAppState = repository.readAppState;
    if (!readAppState) {
      setSelectionLoaded(true);
      return;
    }

    let disposed = false;
    const load = async () => {
      try {
        const response = await readAppState(
          {
            state_key: selectionStateKey,
            fallback_json: JSON.stringify({
              version: 1,
              task_selection_by_id: {},
            }),
          },
          { timeoutMs: REVIEW_READ_TIMEOUT_MS },
        );
        if (disposed) {
          return;
        }
        selectionByTaskIdRef.current = parsePersistedSelectionByTaskId(
          response.state_json,
        );
      } catch {
        if (disposed) {
          return;
        }
        selectionByTaskIdRef.current = {};
      } finally {
        if (!disposed) {
          setSelectionLoaded(true);
        }
      }
    };

    void load();

    return () => {
      disposed = true;
    };
  }, [repository.readAppState, selectionStateKey]);

  useEffect(() => {
    setQueueLoaded(false);
    setSelectionLoaded(false);
    setActiveTaskId(null);
    setHideUncheckedNonChecked(false);
    selectionByTaskIdRef.current = {};
    selectionSyncSignatureByTaskIdRef.current = {};
  }, [reviewMode]);

  useEffect(() => {
    void loadQueueTasks({ silent: true });
  }, [loadQueueTasks]);

  useEffect(() => {
    if (!repository.readAppState || !repository.onLibraryChanged) {
      return;
    }

    return repository.onLibraryChanged((payload) => {
      if (payload.reason !== "import-hash-review-updated") {
        return;
      }
      void loadQueueTasks({ silent: true });
    });
  }, [loadQueueTasks, repository]);

  const task = useMemo(() => {
    if (queueTasks.length === 0) {
      return null;
    }

    if (activeTaskId) {
      const active = queueTasks.find((item) => item.task_id === activeTaskId);
      if (active) {
        return active;
      }
    }

    const runningTask = queueTasks.find((item) => item.status === "running");
    if (runningTask) {
      return runningTask;
    }

    return queueTasks[queueTasks.length - 1] ?? null;
  }, [activeTaskId, queueTasks]);

  const hasRunningTask = useMemo(
    () => queueTasks.some((item) => item.status === "running"),
    [queueTasks],
  );
  const runningTaskId = useMemo(
    () => queueTasks.find((item) => item.status === "running")?.task_id ?? null,
    [queueTasks],
  );

  useEffect(() => {
    const activeTaskId = task?.task_id ?? null;
    if (!activeTaskId) {
      return;
    }

    const focusMismatched = Boolean(
      adReviewFocusTaskId && adReviewFocusTaskId !== activeTaskId,
    );
    if (!manageMode || !adReviewPanelOpen || focusMismatched) {
      delete selectionSyncSignatureByTaskIdRef.current[activeTaskId];
    }
  }, [adReviewFocusTaskId, adReviewPanelOpen, manageMode, task?.task_id]);

  useEffect(() => {
    if (!manageMode || !adReviewPanelOpen) {
      return;
    }

    if (!selectionLoaded || !task) {
      return;
    }

    if (adReviewFocusTaskId && adReviewFocusTaskId !== task.task_id) {
      return;
    }

    if (
      task.status !== "running" &&
      task.status !== "paused" &&
      task.status !== "review"
    ) {
      return;
    }

    const candidateImageIds = task.candidates.map(
      (candidate) => candidate.image_id,
    );
    if (candidateImageIds.length === 0) {
      return;
    }

    const candidateSignature = candidateImageIds.join("|");
    if (
      selectionSyncSignatureByTaskIdRef.current[task.task_id] ===
      candidateSignature
    ) {
      return;
    }

    const deselectedImageIds = selectionByTaskIdRef.current[task.task_id] ?? [];
    const deselectedImageIdSet = new Set(deselectedImageIds);
    const selectedImageIds = candidateImageIds.filter(
      (imageId) => !deselectedImageIdSet.has(imageId),
    );
    replaceImageCheckedIds(selectedImageIds, false);

    selectionSyncSignatureByTaskIdRef.current[task.task_id] =
      candidateSignature;
  }, [
    adReviewFocusTaskId,
    adReviewPanelOpen,
    manageMode,
    replaceImageCheckedIds,
    selectionLoaded,
    task,
  ]);

  // 同步 ad-review 候选包 id 给会话状态，供按需缓存预加载这些源的图片
  // （结构性分页后侧边栏不再携带 images，跨源结果需逐源加载才能显示与计数）
  const syncedSourceSignatureRef = useRef<string>("");
  useEffect(() => {
    const status = task?.status;
    const active =
      Boolean(task) &&
      (status === "running" || status === "paused" || status === "review");
    const imageIds =
      active && task
        ? task.candidates.map((candidate) => candidate.image_id)
        : [];
    const sourceIds =
      active && task
        ? Array.from(
            new Set(task.candidates.map((candidate) => candidate.package_id)),
          )
        : [];
    const signature = imageIds.join("|");
    if (signature === syncedSourceSignatureRef.current) {
      return;
    }
    syncedSourceSignatureRef.current = signature;
    setAdReviewResultSourceIds?.(sourceIds);
    setAdReviewResultImageIds?.(imageIds);
  }, [task, setAdReviewResultSourceIds, setAdReviewResultImageIds]);

  useEffect(() => {
    if (!selectionLoaded || !task) {
      return;
    }

    if (
      task.status !== "running" &&
      task.status !== "paused" &&
      task.status !== "review"
    ) {
      return;
    }

    const candidateImageIds = task.candidates.map(
      (candidate) => candidate.image_id,
    );
    if (candidateImageIds.length === 0) {
      return;
    }

    const candidateSignature = candidateImageIds.join("|");
    if (
      selectionSyncSignatureByTaskIdRef.current[task.task_id] !==
      candidateSignature
    ) {
      return;
    }

    const candidateImageIdSet = new Set(candidateImageIds);
    const selectedCandidateIds = imageCheckedIds.filter((imageId) =>
      candidateImageIdSet.has(imageId),
    );
    const selectedCandidateIdSet = new Set(selectedCandidateIds);
    const deselectedImageIds = candidateImageIds.filter(
      (imageId) => !selectedCandidateIdSet.has(imageId),
    );
    const previousDeselectedImageIds =
      selectionByTaskIdRef.current[task.task_id];

    if (areStringArraysEqual(previousDeselectedImageIds, deselectedImageIds)) {
      return;
    }

    selectionByTaskIdRef.current = {
      ...selectionByTaskIdRef.current,
      [task.task_id]: deselectedImageIds,
    };
    schedulePersistSelectionState();
  }, [
    adReviewFocusTaskId,
    adReviewPanelOpen,
    imageCheckedIds,
    manageMode,
    schedulePersistSelectionState,
    selectionLoaded,
    task,
  ]);

  useEffect(() => {
    if (!selectionLoaded || !queueLoaded) {
      return;
    }

    const validTaskIdSet = new Set(queueTasks.map((item) => item.task_id));
    let changed = false;
    const nextSelectionByTaskId: Record<string, string[]> = {};
    for (const [taskId, deselectedImageIds] of Object.entries(
      selectionByTaskIdRef.current,
    )) {
      if (!validTaskIdSet.has(taskId)) {
        changed = true;
        continue;
      }
      nextSelectionByTaskId[taskId] = deselectedImageIds;
    }

    if (!changed) {
      return;
    }

    selectionByTaskIdRef.current = nextSelectionByTaskId;
    schedulePersistSelectionState();
  }, [queueLoaded, queueTasks, schedulePersistSelectionState, selectionLoaded]);

  useEffect(() => {
    if (!hasRunningTask || !repository.readAppState) {
      disposePolling();
      return;
    }

    disposePolling();
    pollingTimerRef.current = window.setInterval(() => {
      void loadQueueTasks({ silent: true });
    }, REVIEW_POLL_INTERVAL_MS);

    return () => {
      disposePolling();
    };
  }, [disposePolling, hasRunningTask, loadQueueTasks, repository]);

  const updateTaskInQueue = useCallback((nextTask: ManageAdReviewTaskDto) => {
    setQueueTasks((previous) => upsertTask(previous, nextTask));
    setActiveTaskId(nextTask.task_id);
  }, []);

  const startManageAdReview = useCallback(
    async (options?: { skipReviewedNodes?: boolean }) => {
      if (deletePending) {
        setManageOperationHint(t("ui.manage.hint.deleteInProgressWait"));
        return null;
      }
      const startReview =
        reviewMode === "cover"
          ? repository.startManageCoverReview
          : repository.startManageAdReview;
      if (!startReview) {
        setManageOperationHint(
          reviewMode === "cover"
            ? t("ui.manage.hint.unsupportedStartCover")
            : t("ui.manage.hint.unsupportedStart"),
        );
        return null;
      }
      if (mode !== "image") {
        setManageOperationHint(t("ui.manage.hint.imageModeOnly"));
        return null;
      }
      if (!manageMode) {
        setManageOperationHint(t("ui.manage.hint.enterManageModeFirst"));
        return null;
      }
      if (!activeScope) {
        setManageOperationHint(t("ui.manage.hint.selectScopeFirst"));
        return null;
      }

      const normalizedEndpoint = llmEndpoint.trim();
      const normalizedModel = llmModel.trim();
      if (!normalizedEndpoint || !normalizedModel) {
        setManageOperationHint(t("ui.manage.hint.configureVisionModelFirst"));
        return null;
      }

      const imageIds = activeScope === "image" ? imageCheckedIds : [];
      const nodeIds = activeScope === "sidebar" ? sidebarCheckedNodeIds : [];

      setHideUncheckedNonChecked(false);
      setPending(true);
      setManageOperationHint(t("ui.manage.hint.started"));
      try {
        const normalizedStrategyMode =
          adReviewExecutionMode === "performance"
            ? "head-tail"
            : adReviewStrategyMode === "head-tail"
              ? "head-tail"
              : "all";
        const strategy =
          normalizedStrategyMode === "head-tail"
            ? {
                mode: "head-tail" as const,
                head_n: Math.max(1, Math.min(20, Math.floor(adReviewHeadN))),
                tail_n: Math.max(1, Math.min(20, Math.floor(adReviewTailN))),
                tail_stop_clean_streak: Math.max(
                  1,
                  Math.min(20, Math.floor(adReviewTailStopCleanStreak)),
                ),
              }
            : {
                mode: "all" as const,
              };

        const maxConcurrency = Number.isFinite(adReviewMaxConcurrency)
          ? Math.max(1, Math.min(20, Math.floor(adReviewMaxConcurrency)))
          : undefined;

        const response = await startReview(
          {
            selection_scope: activeScope,
            image_ids: imageIds,
            node_ids: nodeIds,
            skip_reviewed_nodes: options?.skipReviewedNodes ?? true,
            llm_endpoint: normalizedEndpoint,
            llm_model: normalizedModel,
            execution_mode: adReviewExecutionMode,
            strategy,
            max_concurrency: maxConcurrency,
          },
          { timeoutMs: REVIEW_START_TIMEOUT_MS },
        );

        updateTaskInQueue(response.task);
        await loadQueueTasks({ silent: true });
        setManageOperationHint(
          response.task.message ?? t("ui.manage.hint.started"),
        );
        return response.task;
      } catch (error) {
        const errorCode = getErrorCode(error);
        if (errorCode === "backend_method_unavailable") {
          setManageOperationHint(
            reviewMode === "cover"
              ? t("ui.manage.hint.unsupportedStartCover")
              : t("ui.manage.hint.unsupportedStart"),
          );
          return null;
        }
        const message = toErrorDetailWithCode(error, t);
        setManageOperationHint(
          reviewMode === "cover"
            ? t("ui.manage.hint.startFailedCover", { message })
            : t("ui.manage.hint.startFailed", { message }),
        );
        return null;
      } finally {
        setPending(false);
      }
    },
    [
      activeScope,
      imageCheckedIds,
      adReviewHeadN,
      adReviewMaxConcurrency,
      adReviewExecutionMode,
      adReviewStrategyMode,
      adReviewTailN,
      adReviewTailStopCleanStreak,
      llmEndpoint,
      llmModel,
      loadQueueTasks,
      manageMode,
      mode,
      reviewMode,
      repository,
      setManageOperationHint,
      sidebarCheckedNodeIds,
      t,
      deletePending,
      updateTaskInQueue,
    ],
  );

  const pauseManageAdReview = useCallback(async () => {
    if (deletePending) {
      setManageOperationHint(t("ui.manage.hint.deleteInProgressWait"));
      return;
    }
    const pauseReview =
      reviewMode === "cover"
        ? repository.pauseManageCoverReviewTask
        : repository.pauseManageAdReviewTask;
    if (!pauseReview) {
      setManageOperationHint(t("ui.manage.hint.unsupportedPause"));
      return;
    }

    const runnableTask =
      task?.status === "running" || task?.status === "paused"
        ? task
        : (queueTasks.find(
            (item) => item.status === "running" || item.status === "paused",
          ) ?? null);
    if (!runnableTask) {
      setManageOperationHint(t("ui.manage.hint.noRunningTask"));
      return;
    }

    setPending(true);
    try {
      const response = await pauseReview(
        { task_id: runnableTask.task_id },
        { timeoutMs: REVIEW_PAUSE_TIMEOUT_MS },
      );
      updateTaskInQueue(response.task);
      await loadQueueTasks({ silent: true });
      setManageOperationHint(
        response.task.message ?? t("ui.manage.hint.paused"),
      );
    } catch (error) {
      const message = toErrorDetailWithCode(error, t);
      setManageOperationHint(t("ui.manage.hint.pauseFailed", { message }));
    } finally {
      setPending(false);
    }
  }, [
    deletePending,
    loadQueueTasks,
    queueTasks,
    repository.pauseManageAdReviewTask,
    repository.pauseManageCoverReviewTask,
    reviewMode,
    setManageOperationHint,
    t,
    task,
    updateTaskInQueue,
  ]);

  const toggleHideUncheckedNonChecked = useCallback(() => {
    if (deletePending) {
      return;
    }
    setHideUncheckedNonChecked((previous) => !previous);
  }, [deletePending]);

  const selectedCandidateIds = useMemo(() => {
    if (!task || task.status !== "review") {
      return [];
    }

    const candidateIdSet = new Set(
      task.candidates.map((candidate) => candidate.image_id),
    );
    return imageCheckedIds.filter((imageId) => candidateIdSet.has(imageId));
  }, [imageCheckedIds, task]);

  const hasCheckedCandidateSelection = selectedCandidateIds.length > 0;
  const selectedCandidateCount = selectedCandidateIds.length;

  const scopeImageIds = task?.scope_image_ids ?? [];
  const llmReviewedImageIds = useMemo(() => {
    if (!task) {
      return [];
    }

    return Object.entries(task.image_source_by_id)
      .filter(([, source]) => source === "llm" || source === "llm-error")
      .map(([imageId]) => imageId);
  }, [task]);

  const nonLlmReviewedImageIds = useMemo(() => {
    if (!task) {
      return [];
    }

    return Object.entries(task.image_source_by_id)
      .filter(
        ([, source]) => source === "known-hash" || source === "strategy-skip",
      )
      .map(([imageId]) => imageId);
  }, [task]);

  const removeTaskInternal = useCallback(
    async (
      taskId: string,
      options?: { silentHint?: boolean; skipRunningCheck?: boolean },
    ): Promise<boolean> => {
      const readAppState = repository.readAppState;
      const writeAppState = repository.writeAppState;
      if (!readAppState || !writeAppState) {
        if (!options?.silentHint) {
          setManageOperationHint(
            t("ui.manage.hint.unsupportedQueueManagement"),
          );
        }
        return false;
      }

      const target = queueTasks.find((item) => item.task_id === taskId);
      if (!target) {
        if (!options?.silentHint) {
          setManageOperationHint(t("ui.manage.hint.taskNotFound"));
        }
        return false;
      }

      if (!options?.skipRunningCheck && target.status === "running") {
        if (!options?.silentHint) {
          setManageOperationHint(t("ui.manage.hint.cannotRemoveRunningTask"));
        }
        return false;
      }

      try {
        const response = await readAppState(
          {
            state_key: queueStateKey,
            fallback_json: JSON.stringify({ version: 1, items: [] }),
          },
          { timeoutMs: REVIEW_READ_TIMEOUT_MS },
        );
        const rawQueue = parseQueueRaw(response.state_json);
        const nextQueue: PersistedQueueRaw = {
          version: rawQueue.version,
          items: rawQueue.items.filter((item) => {
            const parsedTask = taskSchema.safeParse(item.task);
            return parsedTask.success
              ? parsedTask.data.task_id !== taskId
              : true;
          }),
        };

        await writeAppState(
          {
            state_key: queueStateKey,
            state_json: JSON.stringify(nextQueue),
          },
          { timeoutMs: REVIEW_QUEUE_WRITE_TIMEOUT_MS },
        );

        setQueueTasks((previous) =>
          previous.filter((item) => item.task_id !== taskId),
        );
        setActiveTaskId((previous) => (previous === taskId ? null : previous));

        if (selectionByTaskIdRef.current[taskId]) {
          const nextSelectionByTaskId = { ...selectionByTaskIdRef.current };
          delete nextSelectionByTaskId[taskId];
          selectionByTaskIdRef.current = nextSelectionByTaskId;
          schedulePersistSelectionState();
        }
        delete selectionSyncSignatureByTaskIdRef.current[taskId];

        if (!options?.silentHint) {
          setManageOperationHint(t("ui.manage.hint.queueItemRemoved"));
        }
        return true;
      } catch (error) {
        if (!options?.silentHint) {
          const message = toErrorDetailWithCode(error, t);
          setManageOperationHint(
            t("ui.manage.hint.queueRemoveFailed", { message }),
          );
        }
        return false;
      }
    },
    [
      queueStateKey,
      queueTasks,
      repository.readAppState,
      repository.writeAppState,
      schedulePersistSelectionState,
      setManageOperationHint,
      t,
      taskSchema,
    ],
  );

  const confirmDeleteSelectedCandidates = useCallback(async () => {
    const firstHitImageId = task?.candidates?.[0]?.image_id ?? null;
    const firstHitPackageId = task?.candidates?.[0]?.package_id ?? null;

    if (deletePending) {
      setManageOperationHint(t("ui.manage.hint.deleteInProgressWait"));
      return { ok: false, firstHitImageId, firstHitPackageId };
    }
    if (reviewMode === "cover" && !repository.confirmManageCoverReviewHide) {
      setManageOperationHint(t("ui.manage.hint.unsupportedApplyCover"));
      return { ok: false, firstHitImageId, firstHitPackageId };
    }
    if (reviewMode === "ad" && !repository.confirmManageAdReviewDelete) {
      setManageOperationHint(t("ui.manage.hint.unsupportedDelete"));
      return { ok: false, firstHitImageId, firstHitPackageId };
    }
    if (!task) {
      setManageOperationHint(
        reviewMode === "cover"
          ? t("ui.manage.hint.noApplicableResultsCover")
          : t("ui.manage.hint.noDeletableResults"),
      );
      return { ok: false, firstHitImageId, firstHitPackageId };
    }
    if (task.status !== "review") {
      setManageOperationHint(
        reviewMode === "cover"
          ? t("ui.manage.hint.reviewNotCompletedCover")
          : t("ui.manage.hint.reviewNotCompleted"),
      );
      return { ok: false, firstHitImageId, firstHitPackageId };
    }
    if (selectedCandidateIds.length === 0) {
      setManageOperationHint(
        reviewMode === "cover"
          ? t("ui.manage.hint.selectCandidatesFirstCover")
          : t("ui.manage.hint.selectCandidatesFirst"),
      );
      return { ok: false, firstHitImageId, firstHitPackageId };
    }

    setPending(true);
    setDeletePending(true);
    setDeleteProgress({ completed: 0, total: selectedCandidateIds.length });
    try {
      if (reviewMode === "cover") {
        const response = await repository.confirmManageCoverReviewHide!(
          {
            task_id: task.task_id,
            image_ids: selectedCandidateIds,
          },
          { timeoutMs: REVIEW_DELETE_TIMEOUT_MS },
        );

        updateTaskInQueue(response.task);
        await loadQueueTasks({ silent: true });
        setDeleteProgress({
          completed: selectedCandidateIds.length,
          total: selectedCandidateIds.length,
        });

        if (response.updated_count > 0) {
          clearAllSelections();
        }

        replaceImageCheckedIds(
          response.task.candidates.map((candidate) => candidate.image_id),
          false,
        );
        setManageOperationHint(
          t("ui.manage.hint.coverApplySuccess", {
            count: response.updated_count,
          }),
        );
      } else {
        const response = await repository.confirmManageAdReviewDelete!(
          {
            task_id: task.task_id,
            image_ids: selectedCandidateIds,
          },
          { timeoutMs: REVIEW_DELETE_TIMEOUT_MS },
        );

        updateTaskInQueue(response.task);
        await loadQueueTasks({ silent: true });
        setDeleteProgress({
          completed: selectedCandidateIds.length,
          total: selectedCandidateIds.length,
        });

        if (response.deleted_count > 0) {
          clearAllSelections();
        }

        replaceImageCheckedIds(
          response.task.candidates.map((candidate) => candidate.image_id),
          false,
        );

        if (response.failed.length > 0) {
          setManageOperationHint(
            t("ui.manage.hint.deleteWithFailures", {
              deleted: response.deleted_count,
              failed: response.failed.length,
            }),
          );
        } else {
          setManageOperationHint(
            t("ui.manage.hint.deleteSuccess", {
              count: response.deleted_count,
            }),
          );
        }
      }

      const removed = await removeTaskInternal(task.task_id, {
        silentHint: true,
        skipRunningCheck: true,
      });
      if (removed) {
        clearAllSelections();
        onDeleteRoundCompleted?.({
          firstHitImageId,
          firstHitPackageId,
        });
      }
      return {
        ok: true,
        firstHitImageId,
        firstHitPackageId,
      };
    } catch (error) {
      const message = toErrorDetailWithCode(error, t);
      setManageOperationHint(
        reviewMode === "cover"
          ? t("ui.manage.hint.applyFailedCover", { message })
          : t("ui.manage.hint.deleteFailed", { message }),
      );
      return {
        ok: false,
        firstHitImageId,
        firstHitPackageId,
      };
    } finally {
      setPending(false);
      setDeletePending(false);
      setDeleteProgress({ completed: 0, total: 0 });
    }
  }, [
    clearAllSelections,
    loadQueueTasks,
    onDeleteRoundCompleted,
    removeTaskInternal,
    replaceImageCheckedIds,
    repository.confirmManageAdReviewDelete,
    repository.confirmManageCoverReviewHide,
    reviewMode,
    selectedCandidateIds,
    setManageOperationHint,
    t,
    task,
    updateTaskInQueue,
    deletePending,
  ]);

  const dismissTask = useCallback(() => {
    if (deletePending) {
      setManageOperationHint(t("ui.manage.hint.deleteInProgressCannotReset"));
      return;
    }
    if (task?.status === "review") {
      replaceImageCheckedIds(
        task.candidates.map((candidate) => candidate.image_id),
        false,
      );
      setManageOperationHint(t("ui.manage.hint.resetDismissDone"));
    }
    setHideUncheckedNonChecked(false);
  }, [deletePending, replaceImageCheckedIds, setManageOperationHint, t, task]);

  const selectTask = useCallback(
    (taskId: string) => {
      if (deletePending) {
        return;
      }
      setActiveTaskId(taskId);
    },
    [deletePending],
  );

  const removeTask = useCallback(
    async (taskId: string, options?: { silentHint?: boolean }) => {
      if (deletePending) {
        if (!options?.silentHint) {
          setManageOperationHint(
            t("ui.manage.hint.deleteInProgressCannotRemove"),
          );
        }
        return false;
      }
      setPending(true);
      try {
        return await removeTaskInternal(taskId, {
          silentHint: options?.silentHint,
        });
      } finally {
        setPending(false);
      }
    },
    [deletePending, removeTaskInternal, setManageOperationHint, t],
  );

  const setReviewMode = useCallback(
    (nextMode: ManageReviewModeDto) => {
      if (nextMode === reviewMode) {
        return;
      }
      if (nextMode === "cover" && !supportsCoverReview) {
        setManageOperationHint(t("ui.manage.hint.unsupportedStartCover"));
        return;
      }
      onReviewModeChange(nextMode);
    },
    [
      onReviewModeChange,
      reviewMode,
      setManageOperationHint,
      supportsCoverReview,
      t,
    ],
  );

  return {
    reviewMode,
    applyActionMode: reviewMode,
    supportsCoverReview,
    setReviewMode,
    task,
    queueTasks,
    activeTaskId,
    runningTaskId,
    hasRunningTask,
    pending,
    deletePending,
    deleteProgress,
    hideUncheckedNonChecked,
    hasCheckedCandidateSelection,
    selectedCandidateCount,
    scopeImageIds,
    llmReviewedImageIds,
    nonLlmReviewedImageIds,
    startManageAdReview,
    pauseManageAdReview,
    toggleHideUncheckedNonChecked,
    confirmDeleteSelectedCandidates,
    dismissTask,
    selectTask,
    removeTask,
  };
}

export type ManageAdReviewActionsResult = ReturnType<
  typeof useManageAdReviewActions
>;
