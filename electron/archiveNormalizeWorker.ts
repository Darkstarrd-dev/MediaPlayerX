import { parentPort, workerData } from "node:worker_threads";

import { normalizeArchiveToStoreZipInPlace } from "./archiveWasmExtractor";
import {
  TASK_WORKER_HEARTBEAT_INTERVAL_MS,
  type TaskWorkerResponseEnvelope,
} from "./services/task-orchestrator/taskWorkerProtocol";
import {
  createTaskWorkerQueueController,
  maybeExit,
  parseRequest,
  postHeartbeat,
  postProgress,
  postResponse,
  postWorkerPayload,
  registerWorkerMessageHandlers,
} from "./services/task-orchestrator/taskWorkerRuntime";

interface WorkerData {
  sourceArchivePath?: unknown;
  webpQuality?: unknown;
}

interface WorkerResult {
  ok: boolean;
  outputZipPath?: string;
  error?: string;
}

function normalizePayload(raw: unknown): {
  sourceArchivePath: string;
  webpQuality: number | undefined;
} {
  const payload = (raw ?? {}) as WorkerData;
  const sourceArchivePath =
    typeof payload.sourceArchivePath === "string"
      ? payload.sourceArchivePath
      : "";
  const webpQuality =
    typeof payload.webpQuality === "number" &&
    Number.isFinite(payload.webpQuality)
      ? payload.webpQuality
      : undefined;
  return {
    sourceArchivePath,
    webpQuality,
  };
}

function postLegacyResult(result: WorkerResult): void {
  postWorkerPayload(parentPort, result);
}

function postErrorResponse(requestId: string, error: string): void {
  const response: TaskWorkerResponseEnvelope = {
    kind: "response",
    request_id: requestId,
    ok: false,
    error,
  };
  postResponse(parentPort, response);
}

async function runNormalize(
  rawPayload: unknown,
  cancelledRequestIds: Set<string>,
): Promise<void> {
  const parsedRequest = parseRequest(rawPayload);

  if (cancelledRequestIds.has(parsedRequest.requestId)) {
    cancelledRequestIds.delete(parsedRequest.requestId);
    return;
  }

  const payload = normalizePayload(parsedRequest.payload);
  const heartbeatTimer = setInterval(() => {
    postHeartbeat(parentPort);
  }, TASK_WORKER_HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref?.();

  if (!payload.sourceArchivePath) {
    const error = "archive normalization worker missing sourceArchivePath";
    if (parsedRequest.legacy) {
      postLegacyResult({ ok: false, error });
    } else {
      postErrorResponse(parsedRequest.requestId, error);
    }
    clearInterval(heartbeatTimer);
    maybeExit(parentPort, 1);
    return;
  }

  try {
    if (!parsedRequest.legacy) {
      postProgress(parentPort, {
        kind: "progress",
        request_id: parsedRequest.requestId,
        progress: 0.1,
        message: "archive-normalize-started",
      });
    }

    const result = await normalizeArchiveToStoreZipInPlace(
      payload.sourceArchivePath,
      {
        webpQuality: payload.webpQuality,
      },
    );

    if (cancelledRequestIds.has(parsedRequest.requestId)) {
      cancelledRequestIds.delete(parsedRequest.requestId);
      clearInterval(heartbeatTimer);
      return;
    }

    if (!parsedRequest.legacy) {
      postProgress(parentPort, {
        kind: "progress",
        request_id: parsedRequest.requestId,
        progress: 0.95,
        message: "archive-normalize-finalizing",
      });
    }

    if (parsedRequest.legacy) {
      postLegacyResult({ ok: true, outputZipPath: result.outputZipPath });
    } else {
      postProgress(parentPort, {
        kind: "progress",
        request_id: parsedRequest.requestId,
        progress: 1,
        message: "archive-normalize-complete",
      });
      postResponse(parentPort, {
        kind: "response",
        request_id: parsedRequest.requestId,
        ok: true,
        payload: {
          outputZipPath: result.outputZipPath,
        },
      });
    }
    clearInterval(heartbeatTimer);
    maybeExit(parentPort, 0);
  } catch (error: unknown) {
    const message =
      error instanceof Error && error.message ? error.message : String(error);
    if (parsedRequest.legacy) {
      postLegacyResult({ ok: false, error: message });
    } else {
      postErrorResponse(parsedRequest.requestId, message);
    }
    clearInterval(heartbeatTimer);
    maybeExit(parentPort, 1);
  }
}

const queueController = createTaskWorkerQueueController(runNormalize);

registerWorkerMessageHandlers({
  parentPort,
  workerData,
  enqueueMessage: queueController.enqueueMessage,
});
