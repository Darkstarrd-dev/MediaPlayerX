import { promises as fs } from "node:fs";
import { parentPort, workerData } from "node:worker_threads";

import { getSharpModule } from "./fileSystemRuntimeHelpers";
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

interface ThumbnailRenderPayload {
  sourceBuffer?: unknown;
  maxEdge?: unknown;
  quality?: unknown;
  tempPath?: unknown;
  cachePath?: unknown;
}

interface JsonSerializedBuffer {
  type?: unknown;
  data?: unknown;
}

interface ThumbnailRenderResult {
  ok: boolean;
  error?: string;
}

function postLegacyResult(payload: ThumbnailRenderResult): void {
  postWorkerPayload(parentPort, payload);
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

function normalizePayload(raw: unknown): {
  sourceBuffer: Buffer | null;
  maxEdge: number;
  quality: number;
  tempPath: string;
  cachePath: string;
} {
  const payload = (raw ?? {}) as ThumbnailRenderPayload;
  const rawSourceBuffer = payload.sourceBuffer;
  const sourceBuffer = Buffer.isBuffer(rawSourceBuffer)
    ? rawSourceBuffer
    : typeof rawSourceBuffer === "string"
      ? Buffer.from(rawSourceBuffer, "base64")
      : (() => {
          const serialized = (rawSourceBuffer ?? {}) as JsonSerializedBuffer;
          if (serialized.type !== "Buffer" || !Array.isArray(serialized.data)) {
            return null;
          }
          return Buffer.from(serialized.data as number[]);
        })();

  const maxEdge =
    typeof payload.maxEdge === "number" && Number.isFinite(payload.maxEdge)
      ? Math.max(1, Math.round(payload.maxEdge))
      : 320;
  const quality =
    typeof payload.quality === "number" && Number.isFinite(payload.quality)
      ? Math.max(1, Math.min(100, Math.round(payload.quality)))
      : 82;
  const tempPath = typeof payload.tempPath === "string" ? payload.tempPath : "";
  const cachePath =
    typeof payload.cachePath === "string" ? payload.cachePath : "";

  return {
    sourceBuffer,
    maxEdge,
    quality,
    tempPath,
    cachePath,
  };
}

async function runThumbnailRender(
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

  if (!payload.sourceBuffer || payload.sourceBuffer.length <= 0) {
    const error = "thumbnail worker missing sourceBuffer";
    if (parsedRequest.legacy) {
      postLegacyResult({ ok: false, error });
    } else {
      postErrorResponse(parsedRequest.requestId, error);
    }
    clearInterval(heartbeatTimer);
    maybeExit(parentPort, 1);
    return;
  }
  if (!payload.tempPath || !payload.cachePath) {
    const error = "thumbnail worker missing target path";
    if (parsedRequest.legacy) {
      postLegacyResult({ ok: false, error });
    } else {
      postErrorResponse(parsedRequest.requestId, error);
    }
    clearInterval(heartbeatTimer);
    maybeExit(parentPort, 1);
    return;
  }

  const sharpModule = await getSharpModule();
  const sharp =
    (sharpModule as { default?: typeof import("sharp") } | null)?.default ??
    sharpModule;
  if (!sharp) {
    const error = "thumbnail worker sharp unavailable";
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
        progress: 0.3,
        message: "thumbnail-render-encoding",
      });
    }
    await sharp(payload.sourceBuffer, { failOn: "none" })
      .rotate()
      .resize({
        width: payload.maxEdge,
        height: payload.maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: payload.quality })
      .toFile(payload.tempPath);

    if (cancelledRequestIds.has(parsedRequest.requestId)) {
      cancelledRequestIds.delete(parsedRequest.requestId);
      await fs.rm(payload.tempPath, { force: true }).catch(() => undefined);
      clearInterval(heartbeatTimer);
      return;
    }

    if (!parsedRequest.legacy) {
      postProgress(parentPort, {
        kind: "progress",
        request_id: parsedRequest.requestId,
        progress: 0.85,
        message: "thumbnail-render-moving-cache",
      });
    }

    await fs.rename(payload.tempPath, payload.cachePath).catch(async () => {
      await fs.rm(payload.tempPath, { force: true });
    });
    if (parsedRequest.legacy) {
      postLegacyResult({ ok: true });
    } else {
      postProgress(parentPort, {
        kind: "progress",
        request_id: parsedRequest.requestId,
        progress: 1,
        message: "thumbnail-render-complete",
      });
      postResponse(parentPort, {
        kind: "response",
        request_id: parsedRequest.requestId,
        ok: true,
        payload: {
          cachePath: payload.cachePath,
        },
      });
    }
    clearInterval(heartbeatTimer);
    maybeExit(parentPort, 0);
  } catch (error) {
    const reason =
      error instanceof Error && error.message ? error.message : String(error);
    await fs.rm(payload.tempPath, { force: true }).catch(() => undefined);
    if (parsedRequest.legacy) {
      postLegacyResult({ ok: false, error: reason });
    } else {
      postErrorResponse(parsedRequest.requestId, reason);
    }
    clearInterval(heartbeatTimer);
    maybeExit(parentPort, 1);
  }
}

const queueController = createTaskWorkerQueueController(runThumbnailRender);

registerWorkerMessageHandlers({
  parentPort,
  workerData,
  enqueueMessage: queueController.enqueueMessage,
});
