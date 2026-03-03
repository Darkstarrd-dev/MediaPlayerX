import { describe, expect, it, vi } from "vitest";

import {
  createTaskWorkerQueueController,
  maybeExit,
  parseRequest,
  registerWorkerMessageHandlers,
} from "./taskWorkerRuntime";

describe("taskWorkerRuntime", () => {
  it("parseRequest 可识别 request envelope 与 legacy payload", () => {
    const envelope = parseRequest({
      kind: "request",
      request_id: "req-1",
      payload: { foo: 1 },
    });
    const legacy = parseRequest({ foo: 2 });

    expect(envelope).toEqual({
      requestId: "req-1",
      payload: { foo: 1 },
      legacy: false,
    });
    expect(legacy.requestId).toBe("legacy-request");
    expect(legacy.legacy).toBe(true);
  });

  it("queue controller 应串行执行消息并处理 cancel", async () => {
    const received: unknown[] = [];
    const queueController = createTaskWorkerQueueController(async (message) => {
      received.push(message);
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    });

    queueController.enqueueMessage({
      kind: "cancel",
      request_id: "req-cancel",
    });
    queueController.enqueueMessage("first");
    queueController.enqueueMessage("second");

    await vi.waitFor(() => {
      expect(received).toEqual(["first", "second"]);
    });
    expect(queueController.cancelledRequestIds.has("req-cancel")).toBe(true);
  });

  it("registerWorkerMessageHandlers 在 parentPort 模式下注入 workerData 并监听消息", () => {
    const received: unknown[] = [];
    const messageHandlers: Array<(message: unknown) => void> = [];
    const parentPort = {
      postMessage: vi.fn(),
      on: vi.fn((event: string, handler: (message: unknown) => void) => {
        if (event === "message") {
          messageHandlers.push(handler);
        }
      }),
    };

    registerWorkerMessageHandlers({
      parentPort: parentPort as unknown as Parameters<
        typeof registerWorkerMessageHandlers
      >[0]["parentPort"],
      workerData: { boot: true },
      enqueueMessage: (message) => {
        received.push(message);
      },
    });

    messageHandlers[0]?.({ from: "event" });

    expect(received).toEqual([{ boot: true }, { from: "event" }]);
  });

  it("maybeExit 在 oneshot 子进程模式下设置 exitCode", () => {
    const previous = process.env.MEDIA_PLAYERX_TASK_WORKER_ONESHOT;
    const previousExitCode = process.exitCode;
    process.env.MEDIA_PLAYERX_TASK_WORKER_ONESHOT = "1";
    process.exitCode = 0;

    maybeExit(null, 3);
    expect(process.exitCode).toBe(3);

    process.env.MEDIA_PLAYERX_TASK_WORKER_ONESHOT = previous;
    process.exitCode = previousExitCode;
  });
});
