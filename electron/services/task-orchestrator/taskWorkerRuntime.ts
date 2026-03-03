import type { MessagePort } from "node:worker_threads";

import type {
  TaskWorkerProgressEnvelope,
  TaskWorkerRequestEnvelope,
  TaskWorkerResponseEnvelope,
} from "./taskWorkerProtocol";

export interface ParsedTaskWorkerRequest {
  requestId: string;
  payload: unknown;
  legacy: boolean;
}

function postMessageToHost(
  parentPort: MessagePort | null,
  payload: unknown,
): void {
  if (parentPort) {
    parentPort.postMessage(payload);
    return;
  }

  if (typeof process.send === "function") {
    process.send(payload);
  }
}

export function postWorkerPayload(
  parentPort: MessagePort | null,
  payload: unknown,
): void {
  postMessageToHost(parentPort, payload);
}

export function postResponse(
  parentPort: MessagePort | null,
  response: TaskWorkerResponseEnvelope,
): void {
  postMessageToHost(parentPort, response);
}

export function postProgress(
  parentPort: MessagePort | null,
  progress: TaskWorkerProgressEnvelope,
): void {
  postMessageToHost(parentPort, progress);
}

export function postHeartbeat(parentPort: MessagePort | null): void {
  postMessageToHost(parentPort, {
    kind: "heartbeat",
    worker_pid: process.pid,
    at_ms: Date.now(),
  });
}

export function parseRequest(raw: unknown): ParsedTaskWorkerRequest {
  if (raw && typeof raw === "object") {
    const request = raw as Partial<TaskWorkerRequestEnvelope>;
    if (request.kind === "request" && typeof request.request_id === "string") {
      return {
        requestId: request.request_id,
        payload: request.payload,
        legacy: false,
      };
    }
  }

  return {
    requestId: "legacy-request",
    payload: raw,
    legacy: true,
  };
}

export function maybeExit(parentPort: MessagePort | null, code: number): void {
  if (!parentPort && process.env.MEDIA_PLAYERX_TASK_WORKER_ONESHOT === "1") {
    process.exitCode = code;
  }
}

export interface TaskWorkerQueueController {
  cancelledRequestIds: Set<string>;
  enqueueMessage: (message: unknown) => void;
}

export function createTaskWorkerQueueController(
  runMessage: (
    message: unknown,
    cancelledRequestIds: Set<string>,
  ) => Promise<void>,
): TaskWorkerQueueController {
  const cancelledRequestIds = new Set<string>();
  const queuedMessages: unknown[] = [];
  let workerRunning = false;

  const drainQueue = async (): Promise<void> => {
    if (workerRunning) {
      return;
    }

    const next = queuedMessages.shift();
    if (typeof next === "undefined") {
      return;
    }

    workerRunning = true;
    try {
      await runMessage(next, cancelledRequestIds);
    } finally {
      workerRunning = false;
      if (queuedMessages.length > 0) {
        void drainQueue();
      }
    }
  };

  const enqueueMessage = (message: unknown): void => {
    if (message && typeof message === "object") {
      const cancelEnvelope = message as {
        kind?: unknown;
        request_id?: unknown;
      };
      if (
        cancelEnvelope.kind === "cancel" &&
        typeof cancelEnvelope.request_id === "string"
      ) {
        cancelledRequestIds.add(cancelEnvelope.request_id);
        return;
      }
    }

    queuedMessages.push(message);
    void drainQueue();
  };

  return {
    cancelledRequestIds,
    enqueueMessage,
  };
}

export function registerWorkerMessageHandlers(options: {
  parentPort: MessagePort | null;
  workerData: unknown;
  enqueueMessage: (message: unknown) => void;
}): void {
  const { parentPort, workerData, enqueueMessage } = options;
  if (parentPort) {
    if (typeof workerData !== "undefined") {
      enqueueMessage(workerData);
    }
    parentPort.on("message", (message) => {
      enqueueMessage(message);
    });
    return;
  }

  process.on("message", (message) => {
    enqueueMessage(message);
  });
}
