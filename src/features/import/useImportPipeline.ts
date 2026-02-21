import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEventHandler,
  type RefObject,
} from "react";

import type {
  EnqueueImportTaskRequestDto,
  EnqueueImportTaskResponseDto,
  ImportTaskDto,
  ImportTaskSourceDto,
  ReadImportTasksResponseDto,
  RetryImportTaskRequestDto,
  RetryImportTaskResponseDto,
} from "../../contracts/backend";
import { useI18n } from "../../i18n/useI18n";
import type { BrowserMode } from "../../types";
import type { MediaRepository } from "../backend/repository";
import { toErrorDetailWithCode } from "../shared/errorCode";
import { collectNativePaths } from "./importPathUtils";
import { useImportDragOverlay } from "./useImportDragOverlay";
import { useImportPaste } from "./useImportPaste";

const IMPORT_TASK_TIMEOUT_MS = 20_000;
const IMPORT_TASK_POLL_BUSY_MS = 500;
const IMPORT_TASK_POLL_IDLE_MS = 2_200;
const IMPORT_TASK_POLL_BUSY_MAX_MS = 2_400;
const IMPORT_TASK_POLL_IDLE_MAX_MS = 6_000;
const IMPORT_TASK_EVENT_REFRESH_MS = 500;

const IMPORT_TASK_RELATED_LIBRARY_CHANGE_REASONS = new Set([
  "import-task-finished",
]);

interface UseImportPipelineResult {
  fileImportInputRef: RefObject<HTMLInputElement | null>;
  folderImportInputRef: RefObject<HTMLInputElement | null>;
  dragOverlayActive: boolean;
  enqueuePending: boolean;
  taskError: string | null;
  importTasks: ImportTaskDto[];
  openImportFilesDialog: () => void;
  openImportFoldersDialog: () => void;
  retryImportTask: (taskId: string) => Promise<void>;
  clearTaskError: () => void;
  onImportFilesSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  onImportFoldersSelected: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragEnterImport: DragEventHandler<HTMLDivElement>;
  onDragOverImport: DragEventHandler<HTMLDivElement>;
  onDragLeaveImport: DragEventHandler<HTMLDivElement>;
  onDropImport: DragEventHandler<HTMLDivElement>;
}

interface UseImportPipelineParams {
  repository: MediaRepository;
  mode: BrowserMode;
}

interface SyncImportRepository extends MediaRepository {
  enqueueImportTaskSync(
    request: EnqueueImportTaskRequestDto,
  ): EnqueueImportTaskResponseDto;
  readImportTasksSync(): ReadImportTasksResponseDto;
  retryImportTaskSync(
    request: RetryImportTaskRequestDto,
  ): RetryImportTaskResponseDto;
}

function isSyncImportRepository(
  repository: MediaRepository,
): repository is SyncImportRepository {
  return (
    "enqueueImportTaskSync" in repository &&
    typeof repository.enqueueImportTaskSync === "function" &&
    "readImportTasksSync" in repository &&
    typeof repository.readImportTasksSync === "function" &&
    "retryImportTaskSync" in repository &&
    typeof repository.retryImportTaskSync === "function"
  );
}

type BaseImportTaskSource =
  | "dialog-files"
  | "dialog-folders"
  | "drag-drop"
  | "paste";

function resolveImportTaskSource(
  source: BaseImportTaskSource,
  mode: BrowserMode,
): ImportTaskSourceDto {
  if (mode !== "music") {
    return source;
  }

  switch (source) {
    case "dialog-files":
      return "dialog-files-music";
    case "dialog-folders":
      return "dialog-folders-music";
    case "drag-drop":
      return "drag-drop-music";
    case "paste":
      return "paste-music";
    default:
      return source;
  }
}

function isImportTaskActive(task: ImportTaskDto): boolean {
  return task.status === "pending" || task.status === "running";
}

function hasActiveImportTasks(tasks: ImportTaskDto[]): boolean {
  return tasks.some((task) => isImportTaskActive(task));
}

function areImportTasksEquivalent(
  left: ImportTaskDto[],
  right: ImportTaskDto[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    const leftTask = left[index];
    const rightTask = right[index];
    if (
      leftTask.task_id !== rightTask.task_id ||
      leftTask.status !== rightTask.status ||
      leftTask.progress !== rightTask.progress ||
      leftTask.processed_count !== rightTask.processed_count ||
      leftTask.total_count !== rightTask.total_count ||
      leftTask.message !== rightTask.message
    ) {
      return false;
    }
  }

  return true;
}

export function useImportPipeline({
  repository,
  mode,
}: UseImportPipelineParams): UseImportPipelineResult {
  const { t } = useI18n();
  const isSynchronousTestMode =
    import.meta.env.MODE === "test" && isSyncImportRepository(repository);

  const fileImportInputRef = useRef<HTMLInputElement>(null);
  const folderImportInputRef = useRef<HTMLInputElement>(null);
  const [enqueuePending, setEnqueuePending] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const handleImportError = useCallback(
    (error: unknown) => {
      setTaskError(
        t("ui.importTask.failed", { message: toErrorDetailWithCode(error, t) }),
      );
    },
    [t],
  );
  const initialImportTasks = useMemo<ImportTaskDto[]>(() => {
    if (!isSynchronousTestMode) {
      return [];
    }

    return repository.readImportTasksSync().tasks;
  }, [isSynchronousTestMode, repository]);
  const [importTasks, setImportTasks] =
    useState<ImportTaskDto[]>(initialImportTasks);

  const applyImportTasks = useCallback((nextTasks: ImportTaskDto[]) => {
    setImportTasks((previous) =>
      areImportTasksEquivalent(previous, nextTasks) ? previous : nextTasks,
    );
  }, []);

  const refreshTasks = useCallback(async () => {
    const response = isSynchronousTestMode
      ? repository.readImportTasksSync()
      : await repository.readImportTasks({ timeoutMs: IMPORT_TASK_TIMEOUT_MS });
    applyImportTasks(response.tasks);
    setTaskError(null);
    return response.tasks;
  }, [applyImportTasks, isSynchronousTestMode, repository]);

  const enqueueImportPaths = useCallback(
    async (source: BaseImportTaskSource, paths: string[]) => {
      const normalizedPaths = Array.from(
        new Set(paths.map((value) => value.trim()).filter(Boolean)),
      );
      if (normalizedPaths.length === 0) {
        setTaskError(t("ui.importTask.pathResolveFailed"));
        return;
      }

      setEnqueuePending(true);
      setTaskError(null);

      try {
        const request: EnqueueImportTaskRequestDto = {
          source: resolveImportTaskSource(source, mode),
          paths: normalizedPaths,
        };
        const response = isSynchronousTestMode
          ? repository.enqueueImportTaskSync(request)
          : await repository.enqueueImportTask(request, {
              timeoutMs: IMPORT_TASK_TIMEOUT_MS,
            });
        setImportTasks((previous) => {
          const deduped = previous.filter(
            (task) => task.task_id !== response.task.task_id,
          );
          return [response.task, ...deduped];
        });
        await refreshTasks();
      } catch (error: unknown) {
        handleImportError(error);
      } finally {
        setEnqueuePending(false);
      }
    },
    [
      handleImportError,
      isSynchronousTestMode,
      mode,
      refreshTasks,
      repository,
      t,
    ],
  );

  const retryImportTask = useCallback(
    async (taskId: string) => {
      try {
        setTaskError(null);
        const request: RetryImportTaskRequestDto = {
          task_id: taskId,
        };
        const response = isSynchronousTestMode
          ? repository.retryImportTaskSync(request)
          : await repository.retryImportTask(request, {
              timeoutMs: IMPORT_TASK_TIMEOUT_MS,
            });
        setImportTasks((previous) =>
          previous.map((task) =>
            task.task_id === taskId ? response.task : task,
          ),
        );
        await refreshTasks();
      } catch (error: unknown) {
        handleImportError(error);
      }
    },
    [handleImportError, isSynchronousTestMode, refreshTasks, repository],
  );

  const openImportFilesDialog = useCallback(() => {
    const picker = repository.pickImportPaths;
    if (!picker) {
      const input = fileImportInputRef.current;
      if (!input) {
        return;
      }

      input.value = "";
      input.click();
      return;
    }

    void picker(
      {
        mode: "files",
        target_mode: mode,
      },
      { timeoutMs: IMPORT_TASK_TIMEOUT_MS },
    )
      .then((response) => {
        if (response.paths.length > 0) {
          void enqueueImportPaths("dialog-files", response.paths);
        }
      })
      .catch((error: unknown) => {
        handleImportError(error);
      });
  }, [enqueueImportPaths, handleImportError, mode, repository]);

  const openImportFoldersDialog = useCallback(() => {
    const picker = repository.pickImportPaths;
    if (!picker) {
      const input = folderImportInputRef.current;
      if (!input) {
        return;
      }

      input.value = "";
      input.click();
      return;
    }

    void picker(
      {
        mode: "folders",
        target_mode: mode,
      },
      { timeoutMs: IMPORT_TASK_TIMEOUT_MS },
    )
      .then((response) => {
        if (response.paths.length > 0) {
          void enqueueImportPaths("dialog-folders", response.paths);
        }
      })
      .catch((error: unknown) => {
        handleImportError(error);
      });
  }, [enqueueImportPaths, handleImportError, mode, repository]);

  const onImportFilesSelected = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) {
        return;
      }

      void enqueueImportPaths("dialog-files", collectNativePaths(files));
    },
    [enqueueImportPaths],
  );

  const onImportFoldersSelected = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (files.length === 0) {
        return;
      }

      void enqueueImportPaths("dialog-folders", collectNativePaths(files));
    },
    [enqueueImportPaths],
  );

  useEffect(() => {
    const folderInput = folderImportInputRef.current;
    if (!folderInput) {
      return;
    }

    folderInput.setAttribute("webkitdirectory", "");
    folderInput.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (isSynchronousTestMode) {
      return;
    }

    let disposed = false;
    let timerId: number | null = null;
    let nextPollAtMs = 0;
    let runningPoll = false;
    let queuedPoll = false;
    let busyBackoffLevel = 0;
    let lastPolledTasks: ImportTaskDto[] | null = null;

    const clearTimer = () => {
      if (timerId === null) {
        return;
      }
      window.clearTimeout(timerId);
      timerId = null;
      nextPollAtMs = 0;
    };

    const schedulePoll = (delayMs: number) => {
      if (disposed) {
        return;
      }
      clearTimer();
      const normalizedDelay = Math.max(80, Math.round(delayMs));
      nextPollAtMs = Date.now() + normalizedDelay;
      timerId = window.setTimeout(() => {
        timerId = null;
        nextPollAtMs = 0;
        void runPoll();
      }, normalizedDelay);
    };

    const scheduleSoonerPoll = (delayMs: number) => {
      if (disposed) {
        return;
      }
      const remainingMs = nextPollAtMs > 0 ? nextPollAtMs - Date.now() : Number.POSITIVE_INFINITY;
      if (remainingMs <= delayMs) {
        return;
      }
      schedulePoll(delayMs);
    };

    const computeNextDelayMs = (tasks: ImportTaskDto[] | null, hadError: boolean) => {
      if (hadError || tasks === null) {
        busyBackoffLevel = Math.min(4, busyBackoffLevel + 1);
        return Math.min(IMPORT_TASK_POLL_BUSY_MS * 2 ** busyBackoffLevel, IMPORT_TASK_POLL_BUSY_MAX_MS);
      }

      const hasActiveTasks = hasActiveImportTasks(tasks);
      const sameAsLast = lastPolledTasks !== null && areImportTasksEquivalent(lastPolledTasks, tasks);
      lastPolledTasks = tasks;

      if (hasActiveTasks) {
        busyBackoffLevel = sameAsLast ? Math.min(3, busyBackoffLevel + 1) : 0;
        return Math.min(IMPORT_TASK_POLL_BUSY_MS * 2 ** busyBackoffLevel, IMPORT_TASK_POLL_BUSY_MAX_MS);
      }

      busyBackoffLevel = 0;
      return sameAsLast
        ? Math.min(IMPORT_TASK_POLL_IDLE_MS + 1_000, IMPORT_TASK_POLL_IDLE_MAX_MS)
        : IMPORT_TASK_POLL_IDLE_MS;
    };

    const requestEventDrivenPoll = () => {
      if (disposed) {
        return;
      }
      if (runningPoll) {
        queuedPoll = true;
        return;
      }
      scheduleSoonerPoll(IMPORT_TASK_EVENT_REFRESH_MS);
    };

    const runPoll = async () => {
      if (disposed) {
        return;
      }
      if (runningPoll) {
        queuedPoll = true;
        return;
      }

      runningPoll = true;
      try {
        const tasks = await refreshTasks();
        schedulePoll(computeNextDelayMs(tasks, false));
      } catch (error: unknown) {
        handleImportError(error);
        schedulePoll(computeNextDelayMs(null, true));
      } finally {
        runningPoll = false;
        if (queuedPoll) {
          queuedPoll = false;
          requestEventDrivenPoll();
        }
      }
    };

    void runPoll();
    const unsubscribe = repository.onLibraryChanged?.((payload) => {
      if (!IMPORT_TASK_RELATED_LIBRARY_CHANGE_REASONS.has(payload.reason)) {
        return;
      }
      requestEventDrivenPoll();
    });

    return () => {
      disposed = true;
      clearTimer();
      unsubscribe?.();
    };
  }, [handleImportError, isSynchronousTestMode, refreshTasks, repository]);

  const enqueuePastePaths = useCallback(
    (paths: string[]) => {
      void enqueueImportPaths("paste", paths);
    },
    [enqueueImportPaths],
  );
  const enqueueDragDropPaths = useCallback(
    (paths: string[]) => {
      void enqueueImportPaths("drag-drop", paths);
    },
    [enqueueImportPaths],
  );
  const handleDragPathResolveFailed = useCallback(() => {
    setTaskError(t("ui.importTask.dragPathResolveFailed"));
  }, [t]);

  useImportPaste({
    repository,
    timeoutMs: IMPORT_TASK_TIMEOUT_MS,
    enqueuePastePaths,
    onError: handleImportError,
  });

  const {
    dragOverlayActive,
    onDragEnterImport,
    onDragOverImport,
    onDragLeaveImport,
    onDropImport,
  } = useImportDragOverlay({
    enqueueDragDropPaths,
    onPathResolveFailed: handleDragPathResolveFailed,
  });

  const stableTasks = useMemo(
    () =>
      [...importTasks].sort(
        (left, right) => right.created_at_ms - left.created_at_ms,
      ),
    [importTasks],
  );

  return {
    fileImportInputRef,
    folderImportInputRef,
    dragOverlayActive,
    enqueuePending,
    taskError,
    importTasks: stableTasks,
    openImportFilesDialog,
    openImportFoldersDialog,
    retryImportTask,
    clearTaskError: () => setTaskError(null),
    onImportFilesSelected,
    onImportFoldersSelected,
    onDragEnterImport,
    onDragOverImport,
    onDragLeaveImport,
    onDropImport,
  };
}

export type ImportPipelineResult = ReturnType<typeof useImportPipeline>;
