import {
  type ActiveReadTask,
  type QueuedReadTask,
  createActiveReadTask,
  createQueuedReadTask,
  isAbortLikeError,
} from "./readTaskQueueUtils";

type TaskStarter<TResponse> = (signal: AbortSignal) => Promise<TResponse>;

export class ImageReadTaskQueueManager<TSidebarResponse, TPageResponse> {
  private readonly maxConcurrentSidebarReads: number;
  private readonly maxConcurrentPageReads: number;

  private activeSidebarTasks: ActiveReadTask<TSidebarResponse>[] = [];
  private queuedSidebarTask: QueuedReadTask<TSidebarResponse> | null = null;

  private activePageTasks: ActiveReadTask<TPageResponse>[] = [];
  private queuedPageTask: QueuedReadTask<TPageResponse> | null = null;

  constructor(options: {
    maxConcurrentSidebarReads: number;
    maxConcurrentPageReads: number;
  }) {
    this.maxConcurrentSidebarReads = options.maxConcurrentSidebarReads;
    this.maxConcurrentPageReads = options.maxConcurrentPageReads;
  }

  clearAll(reason: string): void {
    this.clearActive(reason);
    this.clearQueued(reason);
  }

  enqueueSidebarRead(
    requestKey: string,
    start: TaskStarter<TSidebarResponse>,
  ): Promise<TSidebarResponse> {
    const activeTask = this.activeSidebarTasks.find(
      (item) => item.key === requestKey,
    );
    if (activeTask) {
      return activeTask.promise;
    }
    if (this.queuedSidebarTask?.key === requestKey) {
      return this.queuedSidebarTask.promise;
    }

    if (this.activeSidebarTasks.length < this.maxConcurrentSidebarReads) {
      return this.startSidebarTask(requestKey, start);
    }

    const nextQueuedTask = createQueuedReadTask<TSidebarResponse>(
      requestKey,
      start,
    );
    if (this.queuedSidebarTask) {
      this.queuedSidebarTask.resolve(nextQueuedTask.promise);
    }
    this.queuedSidebarTask = nextQueuedTask;
    this.supersedeActiveSidebarTask(requestKey, nextQueuedTask.promise);
    this.startQueuedSidebarTaskIfPossible();
    return nextQueuedTask.promise;
  }

  enqueuePageRead(
    requestKey: string,
    start: TaskStarter<TPageResponse>,
  ): Promise<TPageResponse> {
    const activeTask = this.activePageTasks.find(
      (item) => item.key === requestKey,
    );
    if (activeTask) {
      return activeTask.promise;
    }
    if (this.queuedPageTask?.key === requestKey) {
      return this.queuedPageTask.promise;
    }

    if (this.activePageTasks.length < this.maxConcurrentPageReads) {
      return this.startPageTask(requestKey, start);
    }

    const nextQueuedTask = createQueuedReadTask<TPageResponse>(
      requestKey,
      start,
    );
    if (this.queuedPageTask) {
      this.queuedPageTask.resolve(nextQueuedTask.promise);
    }
    this.queuedPageTask = nextQueuedTask;
    this.supersedeActivePageTask(requestKey, nextQueuedTask.promise);
    this.startQueuedPageTaskIfPossible();
    return nextQueuedTask.promise;
  }

  private clearQueued(reason: string): void {
    if (this.queuedSidebarTask) {
      this.queuedSidebarTask.reject(new Error(reason));
      this.queuedSidebarTask = null;
    }
    if (this.queuedPageTask) {
      this.queuedPageTask.reject(new Error(reason));
      this.queuedPageTask = null;
    }
  }

  private clearActive(reason: string): void {
    for (const task of this.activeSidebarTasks) {
      task.reject(new Error(reason));
      task.controller.abort(reason);
    }
    this.activeSidebarTasks = [];

    for (const task of this.activePageTasks) {
      task.reject(new Error(reason));
      task.controller.abort(reason);
    }
    this.activePageTasks = [];
  }

  private startSidebarTask(
    key: string,
    start: TaskStarter<TSidebarResponse>,
  ): Promise<TSidebarResponse> {
    const activeTask = createActiveReadTask<TSidebarResponse>(key);
    this.activeSidebarTasks.push(activeTask);
    void start(activeTask.controller.signal)
      .then((response) => {
        activeTask.resolve(response);
      })
      .catch((error: unknown) => {
        if (activeTask.superseded && isAbortLikeError(error)) {
          return;
        }
        activeTask.reject(error);
      })
      .finally(() => {
        this.onSidebarTaskSettled(activeTask);
        this.startQueuedSidebarTaskIfPossible();
      });
    return activeTask.promise;
  }

  private startQueuedSidebarTaskIfPossible(): void {
    if (this.activeSidebarTasks.length >= this.maxConcurrentSidebarReads) {
      return;
    }
    if (!this.queuedSidebarTask) {
      return;
    }
    const queuedTask = this.queuedSidebarTask;
    this.queuedSidebarTask = null;
    const nextTask = this.startSidebarTask(queuedTask.key, queuedTask.start);
    queuedTask.resolve(nextTask);
  }

  private supersedeActiveSidebarTask(
    requestKey: string,
    replacement: Promise<TSidebarResponse>,
  ): void {
    const staleTaskIndex = this.activeSidebarTasks.findIndex(
      (item) => item.key !== requestKey,
    );
    if (staleTaskIndex < 0) {
      return;
    }
    const [staleTask] = this.activeSidebarTasks.splice(staleTaskIndex, 1);
    staleTask.superseded = true;
    staleTask.resolve(replacement);
    staleTask.controller.abort("read request superseded");
  }

  private onSidebarTaskSettled(task: ActiveReadTask<TSidebarResponse>): void {
    const taskIndex = this.activeSidebarTasks.indexOf(task);
    if (taskIndex < 0) {
      return;
    }
    this.activeSidebarTasks.splice(taskIndex, 1);
  }

  private startPageTask(
    key: string,
    start: TaskStarter<TPageResponse>,
  ): Promise<TPageResponse> {
    const activeTask = createActiveReadTask<TPageResponse>(key);
    this.activePageTasks.push(activeTask);
    void start(activeTask.controller.signal)
      .then((response) => {
        activeTask.resolve(response);
      })
      .catch((error: unknown) => {
        if (activeTask.superseded && isAbortLikeError(error)) {
          return;
        }
        activeTask.reject(error);
      })
      .finally(() => {
        this.onPageTaskSettled(activeTask);
        this.startQueuedPageTaskIfPossible();
      });
    return activeTask.promise;
  }

  private startQueuedPageTaskIfPossible(): void {
    if (this.activePageTasks.length >= this.maxConcurrentPageReads) {
      return;
    }
    if (!this.queuedPageTask) {
      return;
    }
    const queuedTask = this.queuedPageTask;
    this.queuedPageTask = null;
    const nextTask = this.startPageTask(queuedTask.key, queuedTask.start);
    queuedTask.resolve(nextTask);
  }

  private supersedeActivePageTask(
    requestKey: string,
    replacement: Promise<TPageResponse>,
  ): void {
    const staleTaskIndex = this.activePageTasks.findIndex(
      (item) => item.key !== requestKey,
    );
    if (staleTaskIndex < 0) {
      return;
    }
    const [staleTask] = this.activePageTasks.splice(staleTaskIndex, 1);
    staleTask.superseded = true;
    staleTask.resolve(replacement);
    staleTask.controller.abort("read request superseded");
  }

  private onPageTaskSettled(task: ActiveReadTask<TPageResponse>): void {
    const taskIndex = this.activePageTasks.indexOf(task);
    if (taskIndex < 0) {
      return;
    }
    this.activePageTasks.splice(taskIndex, 1);
  }
}
