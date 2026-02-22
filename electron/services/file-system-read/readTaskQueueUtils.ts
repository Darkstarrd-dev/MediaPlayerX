export interface QueuedReadTask<T> {
  key: string;
  start: (signal: AbortSignal) => Promise<T>;
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

export interface ActiveReadTask<T> {
  key: string;
  controller: AbortController;
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
  superseded: boolean;
}

export function createQueuedReadTask<T>(
  key: string,
  start: (signal: AbortSignal) => Promise<T>,
): QueuedReadTask<T> {
  let resolvePromise: ((value: T | PromiseLike<T>) => void) | undefined;
  let rejectPromise: ((reason?: unknown) => void) | undefined;
  let settled = false;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };
    rejectPromise = (reason) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(reason);
    };
  });
  if (!resolvePromise || !rejectPromise) {
    throw new Error("createQueuedReadTask: promise callbacks not initialized");
  }
  return {
    key,
    start,
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}

export function createActiveReadTask<T>(key: string): ActiveReadTask<T> {
  let resolvePromise: ((value: T | PromiseLike<T>) => void) | undefined;
  let rejectPromise: ((reason?: unknown) => void) | undefined;
  let settled = false;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };
    rejectPromise = (reason) => {
      if (settled) {
        return;
      }
      settled = true;
      reject(reason);
    };
  });
  if (!resolvePromise || !rejectPromise) {
    throw new Error("createActiveReadTask: promise callbacks not initialized");
  }
  return {
    key,
    controller: new AbortController(),
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
    superseded: false,
  };
}

export function isAbortLikeError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (error.name === "AbortError") {
    return true;
  }
  return /abort/i.test(error.message);
}
