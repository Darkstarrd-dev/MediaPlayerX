import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { runTaskInProcess } from "./processTaskOrchestrator";

interface TempCaseDir {
  rootDir: string;
}

async function createTempCaseDir(prefix: string): Promise<TempCaseDir> {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), prefix));
  return { rootDir };
}

describe("runTaskInProcess", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("runs request/response envelope worker successfully", async () => {
    const tempCase = await createTempCaseDir("mpx-task-orchestrator-");
    tempDirs.push(tempCase.rootDir);
    const workerPath = path.join(tempCase.rootDir, "envelope-worker.cjs");

    await writeFile(
      workerPath,
      [
        "process.on('message', (message) => {",
        "  if (!message || typeof message !== 'object') return;",
        "  if (message.kind !== 'request' || typeof message.request_id !== 'string') return;",
        "  process.send?.({ kind: 'heartbeat', worker_pid: process.pid, at_ms: Date.now() });",
        "  const value = Number(message.payload?.value ?? 0);",
        "  process.send?.({",
        "    kind: 'response',",
        "    request_id: message.request_id,",
        "    ok: true,",
        "    payload: { doubled: value * 2 },",
        "  });",
        "  setTimeout(() => process.exit(0), 10);",
        "});",
      ].join("\n"),
      "utf8",
    );

    const result = await runTaskInProcess<{ value: number }, { doubled: number }>({
      workerPath,
      taskName: "envelope-worker",
      payload: { value: 21 },
      timeoutMs: 3_000,
      heartbeatTimeoutMs: 3_000,
    });

    expect(result).toEqual({ doubled: 42 });
  });

  it("retries failing worker up to maxRetries", async () => {
    const tempCase = await createTempCaseDir("mpx-task-orchestrator-");
    tempDirs.push(tempCase.rootDir);
    const markerPath = path.join(tempCase.rootDir, "attempt-count.txt");
    const workerPath = path.join(tempCase.rootDir, "retry-worker.cjs");

    await writeFile(
      workerPath,
      [
        "const fs = require('node:fs');",
        "process.on('message', (message) => {",
        "  if (!message || typeof message !== 'object') return;",
        "  if (message.kind !== 'request') return;",
        "  const markerPath = String(message.payload?.markerPath ?? '');",
        "  const current = Number(fs.existsSync(markerPath) ? fs.readFileSync(markerPath, 'utf8') : '0') || 0;",
        "  fs.writeFileSync(markerPath, String(current + 1), 'utf8');",
        "  process.exit(1);",
        "});",
      ].join("\n"),
      "utf8",
    );

    await expect(
      runTaskInProcess<{ markerPath: string }, { ok: boolean }>({
        workerPath,
        taskName: "retry-worker",
        payload: { markerPath },
        timeoutMs: 2_000,
        maxRetries: 2,
      }),
    ).rejects.toThrow(/exit/i);

    const attemptCount = Number((await readFile(markerPath, "utf8")).trim());
    expect(attemptCount).toBe(3);
  });
});
