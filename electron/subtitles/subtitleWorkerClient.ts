import type { ChildProcess } from "node:child_process";
import { Worker } from "node:worker_threads";

import type {
  SubtitleWorkerCommand,
  SubtitleWorkerRequestEnvelope,
  SubtitleWorkerResponseEnvelope,
} from "./subtitleWorkerProtocol";

export interface SubtitleWorkerTransport {
  on(event: "message", listener: (message: unknown) => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  on(event: "exit", listener: (code: number | null) => void): this;
  postMessage(payload: unknown): void;
  terminate(): Promise<void>;
}

export class WorkerThreadSubtitleTransport
  implements SubtitleWorkerTransport
{
  constructor(private readonly worker: Worker) {}

  on(event: "message", listener: (message: unknown) => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  on(event: "exit", listener: (code: number | null) => void): this;
  on(
    event: "message" | "error" | "exit",
    listener:
      | ((message: unknown) => void)
      | ((error: Error) => void)
      | ((code: number | null) => void),
  ): this {
    this.worker.on(event, listener);
    return this;
  }

  postMessage(payload: unknown): void {
    this.worker.postMessage(payload);
  }

  async terminate(): Promise<void> {
    await this.worker.terminate();
  }
}

export class ChildProcessSubtitleTransport
  implements SubtitleWorkerTransport
{
  private exited = false;

  constructor(private readonly child: ChildProcess) {
    this.child.once("exit", () => {
      this.exited = true;
    });
  }

  on(event: "message", listener: (message: unknown) => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  on(event: "exit", listener: (code: number | null) => void): this;
  on(
    event: "message" | "error" | "exit",
    listener:
      | ((message: unknown) => void)
      | ((error: Error) => void)
      | ((code: number | null) => void),
  ): this {
    this.child.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  postMessage(payload: unknown): void {
    if (!this.child.connected) {
      throw new Error("subtitle_asr_process_ipc_disconnected");
    }
    this.child.send(payload as Parameters<ChildProcess["send"]>[0]);
  }

  async terminate(): Promise<void> {
    if (this.exited) {
      return;
    }

    await new Promise<void>((resolve) => {
      let settled = false;

      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeout);
        resolve();
      };

      const timeout = setTimeout(() => {
        finish();
      }, 2_000);
      timeout.unref?.();

      this.child.once("exit", () => {
        finish();
      });

      if (this.child.killed) {
        finish();
        return;
      }

      this.child.kill("SIGKILL");
    });
  }
}

export class SubtitleWorkerClient {
  private requestSeed = 0;

  private lastHeartbeatAtMs = Date.now();

  private readonly pending = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(private readonly worker: SubtitleWorkerTransport) {
    this.worker.on("message", (message: unknown) => {
      this.handleMessage(message);
    });

    this.worker.on("error", (error) => {
      this.failAll(error);
    });

    this.worker.on("exit", (code) => {
      if (code !== 0) {
        this.failAll(new Error(`subtitle_asr_worker_exit_${code}`));
      }
    });
  }

  readHeartbeatAgeMs(now = Date.now()): number {
    return Math.max(0, now - this.lastHeartbeatAtMs);
  }

  async request(
    command: SubtitleWorkerCommand,
    payload: unknown,
    timeoutMs = 15_000,
  ): Promise<unknown> {
    const requestId = `subtitle-worker-${Date.now()}-${this.requestSeed++}`;
    const requestPayload: SubtitleWorkerRequestEnvelope = {
      kind: "request",
      request_id: requestId,
      command,
      payload,
    };

    return await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.sendCancelRequest(requestId);
        this.pending.delete(requestId);
        reject(new Error(`subtitle_asr_worker_timeout:${command}`));
      }, timeoutMs);

      this.pending.set(requestId, {
        resolve,
        reject,
        timeout,
      });

      try {
        this.worker.postMessage(requestPayload);
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(requestId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  async terminate(): Promise<void> {
    this.failAll(new Error("subtitle_asr_worker_terminated"));
    await this.worker.terminate();
  }

  private handleMessage(rawMessage: unknown): void {
    if (!rawMessage || typeof rawMessage !== "object") {
      return;
    }

    const heartbeatMessage = rawMessage as { kind?: string; at_ms?: unknown };
    if (heartbeatMessage.kind === "heartbeat") {
      const atMs =
        typeof heartbeatMessage.at_ms === "number" &&
        Number.isFinite(heartbeatMessage.at_ms)
          ? heartbeatMessage.at_ms
          : Date.now();
      this.lastHeartbeatAtMs = atMs;
      return;
    }

    const message = rawMessage as Partial<SubtitleWorkerResponseEnvelope>;
    if (message.kind !== "response" || typeof message.request_id !== "string") {
      return;
    }

    const pending = this.pending.get(message.request_id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(message.request_id);

    if (!message.ok) {
      pending.reject(new Error(message.error ?? "subtitle_asr_worker_failed"));
      return;
    }

    pending.resolve(message.payload);
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }

  private sendCancelRequest(requestId: string): void {
    try {
      this.worker.postMessage({
        kind: "cancel",
        request_id: requestId,
      });
    } catch {
      // ignore cancel delivery failures on timeout teardown
    }
  }
}
