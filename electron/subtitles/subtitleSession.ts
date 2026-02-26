import { existsSync } from "node:fs";
import { promises as fs } from "node:fs";
import { fork, type ChildProcess } from "node:child_process";
import path from "node:path";
import { Worker } from "node:worker_threads";

import type { WebContents } from "electron";

import {
  flushSubtitleSessionResponseSchema,
  pushSubtitleAudioResponseSchema,
  startSubtitlePersistenceResponseSchema,
  appendSubtitlePersistenceResponseSchema,
  readSubtitlePersistenceWindowResponseSchema,
  resetSubtitleSessionResponseSchema,
  startSubtitleSessionResponseSchema,
  stopSubtitleSessionResponseSchema,
  type FlushSubtitleSessionResponseDto,
  type PushSubtitleAudioRequestDto,
  type PushSubtitleAudioResponseDto,
  type StartSubtitlePersistenceRequestDto,
  type StartSubtitlePersistenceResponseDto,
  type AppendSubtitlePersistenceRequestDto,
  type AppendSubtitlePersistenceResponseDto,
  type ReadSubtitlePersistenceWindowRequestDto,
  type ReadSubtitlePersistenceWindowResponseDto,
  type ResetSubtitleSessionRequestDto,
  type ResetSubtitleSessionResponseDto,
  type StartSubtitleSessionRequestDto,
  type StartSubtitleSessionResponseDto,
  type StopSubtitleSessionRequestDto,
  type StopSubtitleSessionResponseDto,
  type SubtitleSessionProviderDto,
} from "../../src/contracts/backend";
import { probeSubtitleEngineStatus } from "./subtitleEngineProbe";
import {
  SUBTITLE_WORKER_HEARTBEAT_TIMEOUT_MS,
  type SubtitleWorkerCommand,
  type SubtitleWorkerRequestEnvelope,
  type SubtitleWorkerResponseEnvelope,
} from "./subtitleWorkerProtocol";
import {
  cuesToSrtText,
  parseSrtMetadata,
  parseSrtTimestamp,
} from "./subtitlePersistenceSrt";
import {
  ensureParentDirectory,
  normalizePersistenceLocaleTag,
  resolveAutoSubtitlePath,
  resolvePersistableVideoPath,
} from "./subtitlePersistencePath";
import {
  cueOverlapsRange,
  dedupeCuesByTimeAndText,
  isBatchInValidRanges,
  isCueAtTimeline,
  mergeCueRanges,
  toCueRecord,
  upsertValidRange,
} from "./subtitlePersistenceCueOps";

interface SubtitleSessionState {
  sessionId: string;
  provider: SubtitleSessionProviderDto;
  workerClient: SubtitleWorkerClient;
  persistence: SubtitlePersistenceState | null;
  initPayload: {
    request: StartSubtitleSessionRequestDto;
    engineModuleRoot: string;
    availableProviders: Array<"cpu" | "directml">;
  };
  heartbeatMonitorTimer: ReturnType<typeof setInterval> | null;
  restartPromise: Promise<void> | null;
}

interface SubtitleSessionManagerOptions {
  runWithGpuToken?: <T>(taskName: string, task: () => Promise<T>) => Promise<T>;
}

interface ValidRange {
  start_sec: number;
  end_sec: number;
}

interface SubtitlePersistenceState {
  subtitlePath: string;
  cues: SubtitleCueRecord[];
  validRanges: ValidRange[];
  validPlaybackRateThreshold: number;
  lastFileMtimeMs: number;
  lastAppliedEpoch: number;
  lastAppliedChunkSeq: number;
}

interface SubtitleCueRecord {
  id: string;
  start_sec: number;
  end_sec: number;
  text: string;
  lang: string | null;
  speaker?: number | null;
  line?: "A" | "B";
  speaker_changed?: boolean;
  speaker_similarity?: number;
}

function nowMs(): number {
  return Date.now();
}

function parseSrtText(rawText: string): SubtitleCueRecord[] {
  const normalized = rawText.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return [];
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  const cues: SubtitleCueRecord[] = [];
  let seed = 0;
  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);
    if (lines.length < 2) {
      continue;
    }

    const timingIndex = lines[0].includes("-->") ? 0 : 1;
    const timingLine = lines[timingIndex];
    if (!timingLine || !timingLine.includes("-->")) {
      continue;
    }
    const [startRaw, endRaw] = timingLine
      .split("-->")
      .map((value) => value.trim());
    const startSec = parseSrtTimestamp(startRaw);
    const endSec = parseSrtTimestamp(endRaw);
    if (!Number.isFinite(startSec) || !Number.isFinite(endSec)) {
      continue;
    }

    const textLines = lines.slice(timingIndex + 1);
    const text = textLines.join("\n").trim();
    if (!text) {
      continue;
    }

    seed += 1;
    cues.push({
      id: `persisted:${Math.round(startSec * 1000)}:${Math.round(endSec * 1000)}:${seed}`,
      start_sec: Math.max(0, startSec),
      end_sec: Math.max(startSec + 0.12, endSec),
      text,
      lang: null,
    });
  }

  return dedupeCuesByTimeAndText(cues);
}

async function refreshPersistenceStateFromFile(
  persistence: SubtitlePersistenceState,
): Promise<void> {
  const stat = await fs
    .stat(persistence.subtitlePath)
    .catch((error: unknown) => {
      if ((error as { code?: string })?.code === "ENOENT") {
        return null;
      }
      throw error;
    });
  if (!stat) {
    return;
  }

  const fileMtimeMs = Number(stat.mtimeMs);
  if (
    Number.isFinite(fileMtimeMs) &&
    fileMtimeMs <= persistence.lastFileMtimeMs + 0.5
  ) {
    return;
  }

  const rawText = await fs
    .readFile(persistence.subtitlePath, "utf8")
    .catch((error: unknown) => {
      if ((error as { code?: string })?.code === "ENOENT") {
        return "";
      }
      throw error;
    });
  if (!rawText.trim()) {
    persistence.cues = [];
    persistence.validRanges = [];
    persistence.lastFileMtimeMs = Number.isFinite(fileMtimeMs)
      ? fileMtimeMs
      : nowMs();
    return;
  }

  const metadata = parseSrtMetadata(rawText);
  persistence.validRanges = metadata.validRanges;
  persistence.validPlaybackRateThreshold = metadata.validPlaybackRateThreshold;
  persistence.cues = parseSrtText(rawText);
  persistence.lastFileMtimeMs = Number.isFinite(fileMtimeMs)
    ? fileMtimeMs
    : nowMs();
}

interface SubtitleWorkerTransport {
  on(event: "message", listener: (message: unknown) => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  on(event: "exit", listener: (code: number | null) => void): this;
  postMessage(payload: unknown): void;
  terminate(): Promise<void>;
}

class WorkerThreadSubtitleTransport implements SubtitleWorkerTransport {
  constructor(private readonly worker: Worker) {}

  on(
    event: "message" | "error" | "exit",
    listener: (payload: unknown) => void,
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

class ChildProcessSubtitleTransport implements SubtitleWorkerTransport {
  private exited = false;

  constructor(private readonly child: ChildProcess) {
    this.child.once("exit", () => {
      this.exited = true;
    });
  }

  on(
    event: "message" | "error" | "exit",
    listener: (payload: unknown) => void,
  ): this {
    this.child.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  postMessage(payload: unknown): void {
    if (!this.child.connected) {
      throw new Error("subtitle_asr_process_ipc_disconnected");
    }
    this.child.send(payload);
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

class SubtitleWorkerClient {
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

export class SubtitleSessionManager {
  private readonly sessions = new Map<number, SubtitleSessionState>();

  private readonly webContentsBound = new Set<number>();

  constructor(private readonly options: SubtitleSessionManagerOptions = {}) {}

  private async requestWithGpuQuota(
    workerClient: SubtitleWorkerClient,
    command: SubtitleWorkerCommand,
    payload: unknown,
    timeoutMs?: number,
  ): Promise<unknown> {
    const requestTask = async () => {
      if (typeof timeoutMs === "number") {
        return await workerClient.request(command, payload, timeoutMs);
      }
      return await workerClient.request(command, payload);
    };

    const heavyCommand =
      command === "init" ||
      command === "push-audio" ||
      command === "flush" ||
      command === "reset";
    if (!heavyCommand || !this.options.runWithGpuToken) {
      return await requestTask();
    }

    return await this.options.runWithGpuToken(
      `subtitle-${command}`,
      requestTask,
    );
  }

  private isRecoverableWorkerError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.startsWith("subtitle_asr_worker_timeout:") ||
      message.startsWith("subtitle_asr_worker_exit_") ||
      message === "subtitle_asr_process_ipc_disconnected" ||
      message === "subtitle_asr_worker_terminated"
    );
  }

  private isSessionNotRunningError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message === "subtitle_session_not_running";
  }

  private hasActiveSession(
    webContentsId: number,
    session: SubtitleSessionState,
  ): boolean {
    return this.sessions.get(webContentsId) === session;
  }

  private ensureActiveSession(
    webContentsId: number,
    session: SubtitleSessionState,
  ): void {
    if (!this.hasActiveSession(webContentsId, session)) {
      throw new Error("subtitle_session_not_running");
    }
  }

  private clearHeartbeatMonitor(session: SubtitleSessionState): void {
    if (!session.heartbeatMonitorTimer) {
      return;
    }
    clearInterval(session.heartbeatMonitorTimer);
    session.heartbeatMonitorTimer = null;
  }

  private startHeartbeatMonitor(
    webContentsId: number,
    session: SubtitleSessionState,
  ): void {
    this.clearHeartbeatMonitor(session);
    const timer = setInterval(
      () => {
        const current = this.sessions.get(webContentsId);
        if (!current || current !== session) {
          this.clearHeartbeatMonitor(session);
          return;
        }

        if (current.restartPromise) {
          return;
        }

        const heartbeatAgeMs = current.workerClient.readHeartbeatAgeMs();
        if (heartbeatAgeMs <= SUBTITLE_WORKER_HEARTBEAT_TIMEOUT_MS) {
          return;
        }

        current.restartPromise = this.restartSessionWorker(
          webContentsId,
          current,
          "heartbeat-timeout",
        ).finally(() => {
          current.restartPromise = null;
        });
      },
      Math.max(1_000, Math.floor(SUBTITLE_WORKER_HEARTBEAT_TIMEOUT_MS / 2)),
    );
    timer.unref?.();
    session.heartbeatMonitorTimer = timer;
  }

  private async restartSessionWorker(
    webContentsId: number,
    session: SubtitleSessionState,
    reason: "heartbeat-timeout" | "request-failed",
  ): Promise<void> {
    const activeSession = this.sessions.get(webContentsId);
    if (!activeSession || activeSession !== session) {
      return;
    }

    const workerPath = this.resolveWorkerScriptPath();
    const nextWorkerClient = new SubtitleWorkerClient(
      this.createWorkerTransport(workerPath),
    );

    try {
      const payload = await this.requestWithGpuQuota(
        nextWorkerClient,
        "init",
        {
          ...session.initPayload.request,
          engine_module_root: session.initPayload.engineModuleRoot,
          available_providers: session.initPayload.availableProviders,
        },
        20_000,
      );
      const response = startSubtitleSessionResponseSchema.parse(payload);

      const previousWorkerClient = session.workerClient;
      session.workerClient = nextWorkerClient;
      session.sessionId = response.session_id;
      session.provider = response.provider;
      await previousWorkerClient.terminate().catch(() => undefined);
      this.startHeartbeatMonitor(webContentsId, session);
      console.warn("[subtitle] worker restarted", {
        webContentsId,
        reason,
      });
    } catch (error) {
      await nextWorkerClient.terminate().catch(() => undefined);
      throw error;
    }
  }

  private async requestSessionWorker(
    webContentsId: number,
    session: SubtitleSessionState,
    command: SubtitleWorkerCommand,
    payload: unknown,
    timeoutMs?: number,
  ): Promise<unknown> {
    if (session.restartPromise) {
      await session.restartPromise;
    }

    this.ensureActiveSession(webContentsId, session);

    try {
      return await this.requestWithGpuQuota(
        session.workerClient,
        command,
        payload,
        timeoutMs,
      );
    } catch (error) {
      if (!this.isRecoverableWorkerError(error)) {
        throw error;
      }

      if (!session.restartPromise) {
        session.restartPromise = this.restartSessionWorker(
          webContentsId,
          session,
          "request-failed",
        ).finally(() => {
          session.restartPromise = null;
        });
      }

      await session.restartPromise;
      this.ensureActiveSession(webContentsId, session);
      return await this.requestWithGpuQuota(
        session.workerClient,
        command,
        payload,
        timeoutMs,
      );
    }
  }

  bindWebContents(webContents: WebContents): void {
    if (this.webContentsBound.has(webContents.id)) {
      return;
    }

    this.webContentsBound.add(webContents.id);
    webContents.once("destroyed", () => {
      void this.stopSession(webContents.id, {
        reason: "web-contents-destroyed",
      }).catch(() => undefined);
      this.webContentsBound.delete(webContents.id);
    });
  }

  async startSession(
    webContentsId: number,
    request: StartSubtitleSessionRequestDto,
  ): Promise<StartSubtitleSessionResponseDto> {
    const existingSession = this.sessions.get(webContentsId);
    if (existingSession) {
      await this.stopSession(webContentsId, { reason: "restart" });
    }

    const engineStatus = probeSubtitleEngineStatus();
    if (
      !engineStatus.installed ||
      !engineStatus.loadable ||
      !engineStatus.moduleRoot
    ) {
      throw new Error(
        `subtitle_engine_unavailable:${engineStatus.message ?? "unknown"}`,
      );
    }

    const workerPath = this.resolveWorkerScriptPath();
    const workerClient = new SubtitleWorkerClient(
      this.createWorkerTransport(workerPath),
    );
    const initPayload = {
      ...request,
      engine_module_root: engineStatus.moduleRoot,
      available_providers: engineStatus.availableProviders,
    };

    try {
      const payload = await this.requestWithGpuQuota(
        workerClient,
        "init",
        initPayload,
        20_000,
      );

      const response = startSubtitleSessionResponseSchema.parse(payload);
      const session: SubtitleSessionState = {
        sessionId: response.session_id,
        provider: response.provider,
        workerClient,
        persistence: null,
        initPayload: {
          request,
          engineModuleRoot: engineStatus.moduleRoot,
          availableProviders: engineStatus.availableProviders,
        },
        heartbeatMonitorTimer: null,
        restartPromise: null,
      };
      this.sessions.set(webContentsId, session);
      this.startHeartbeatMonitor(webContentsId, session);

      return response;
    } catch (error) {
      await workerClient.terminate().catch(() => undefined);
      throw error;
    }
  }

  async stopSession(
    webContentsId: number,
    request: StopSubtitleSessionRequestDto,
  ): Promise<StopSubtitleSessionResponseDto> {
    const session = this.sessions.get(webContentsId);
    if (!session) {
      return stopSubtitleSessionResponseSchema.parse({
        session_id: null,
        stopped: false,
        updated_at_ms: nowMs(),
      });
    }

    let responsePayload: unknown = null;
    try {
      if (session.restartPromise) {
        await session.restartPromise.catch(() => undefined);
      }
      responsePayload = await this.requestSessionWorker(
        webContentsId,
        session,
        "stop",
        request,
        8_000,
      );
    } catch {
      responsePayload = {
        session_id: session.sessionId,
        stopped: true,
        updated_at_ms: nowMs(),
      };
    } finally {
      this.clearHeartbeatMonitor(session);
      await session.workerClient.terminate().catch(() => undefined);
      this.sessions.delete(webContentsId);
    }

    return stopSubtitleSessionResponseSchema.parse(responsePayload);
  }

  async startPersistence(
    webContentsId: number,
    request: StartSubtitlePersistenceRequestDto,
  ): Promise<StartSubtitlePersistenceResponseDto> {
    const session = this.sessions.get(webContentsId);
    if (!session) {
      return startSubtitlePersistenceResponseSchema.parse({
        enabled: false,
        subtitle_path: null,
        cue_count: 0,
        updated_at_ms: nowMs(),
      });
    }

    const resolvedVideoPath = resolvePersistableVideoPath(request.video_path);
    if (!resolvedVideoPath) {
      return startSubtitlePersistenceResponseSchema.parse({
        enabled: false,
        subtitle_path: null,
        cue_count: 0,
        updated_at_ms: nowMs(),
      });
    }

    const localeTag = normalizePersistenceLocaleTag(request.language);
    const subtitlePath = resolveAutoSubtitlePath(resolvedVideoPath, localeTag);
    try {
      await ensureParentDirectory(subtitlePath);

      let initialCues: SubtitleCueRecord[] = [];
      let initialValidRanges: ValidRange[] = [];
      let initialValidPlaybackRateThreshold =
        request.valid_playback_rate_threshold ?? 1.0;

      if (request.reset_existing) {
        const emptyContent = cuesToSrtText(
          [],
          [],
          initialValidPlaybackRateThreshold,
        );
        await fs.writeFile(subtitlePath, emptyContent, "utf8");
      } else {
        const existingText = await fs
          .readFile(subtitlePath, "utf8")
          .catch((error: unknown) => {
            if ((error as { code?: string })?.code === "ENOENT") {
              return "";
            }
            throw error;
          });
        const legacyPath = path.join(
          path.dirname(resolvedVideoPath),
          `${path.basename(resolvedVideoPath, path.extname(resolvedVideoPath))}.auto-live.srt`,
        );
        const legacyText = !existingText
          ? await fs.readFile(legacyPath, "utf8").catch((error: unknown) => {
              if ((error as { code?: string })?.code === "ENOENT") {
                return "";
              }
              throw error;
            })
          : "";
        const restoredText = existingText || legacyText;
        if (restoredText && restoredText.trim()) {
          const metadata = parseSrtMetadata(restoredText);
          initialValidRanges = metadata.validRanges;
          initialValidPlaybackRateThreshold =
            metadata.validPlaybackRateThreshold;
          initialCues = parseSrtText(restoredText);
          if (!existingText && legacyText) {
            const migratedContent = cuesToSrtText(
              initialCues,
              initialValidRanges,
              initialValidPlaybackRateThreshold,
            );
            await fs.writeFile(subtitlePath, migratedContent, "utf8");
          }
        }
      }

      const initialFileStat = await fs
        .stat(subtitlePath)
        .catch((error: unknown) => {
          if ((error as { code?: string })?.code === "ENOENT") {
            return null;
          }
          throw error;
        });
      const initialFileMtimeMs = initialFileStat
        ? Number(initialFileStat.mtimeMs)
        : nowMs();

      session.persistence = {
        subtitlePath,
        cues: initialCues,
        validRanges: initialValidRanges,
        validPlaybackRateThreshold: initialValidPlaybackRateThreshold,
        lastFileMtimeMs: Number.isFinite(initialFileMtimeMs)
          ? initialFileMtimeMs
          : nowMs(),
        lastAppliedEpoch: -1,
        lastAppliedChunkSeq: -1,
      };

      return startSubtitlePersistenceResponseSchema.parse({
        enabled: true,
        subtitle_path: subtitlePath,
        cue_count: initialCues.length,
        updated_at_ms: nowMs(),
      });
    } catch (error) {
      console.warn("[subtitle] start persistence disabled", {
        video_path: request.video_path,
        subtitle_path: subtitlePath,
        reason: error instanceof Error ? error.message : String(error),
      });
      return startSubtitlePersistenceResponseSchema.parse({
        enabled: false,
        subtitle_path: null,
        cue_count: 0,
        updated_at_ms: nowMs(),
      });
    }
  }

  async appendPersistence(
    webContentsId: number,
    request: AppendSubtitlePersistenceRequestDto,
  ): Promise<AppendSubtitlePersistenceResponseDto> {
    const session = this.sessions.get(webContentsId);
    const persistence = session?.persistence;
    if (!session || !persistence) {
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: false,
        subtitle_path: null,
        cue_count: 0,
        accepted_cue_count: 0,
        skipped_inner_cue_count: 0,
        replaced_cue_count: 0,
        updated_at_ms: nowMs(),
      });
    }

    if (request.session_epoch < persistence.lastAppliedEpoch) {
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: false,
        subtitle_path: persistence.subtitlePath,
        cue_count: persistence.cues.length,
        accepted_cue_count: 0,
        skipped_inner_cue_count: 0,
        replaced_cue_count: 0,
        updated_at_ms: nowMs(),
      });
    }

    if (
      request.session_epoch === persistence.lastAppliedEpoch &&
      request.chunk_seq <= persistence.lastAppliedChunkSeq
    ) {
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: false,
        subtitle_path: persistence.subtitlePath,
        cue_count: persistence.cues.length,
        accepted_cue_count: 0,
        skipped_inner_cue_count: 0,
        replaced_cue_count: 0,
        updated_at_ms: nowMs(),
      });
    }

    const incomingCues = request.cues
      .map((cue) => toCueRecord(cue))
      .filter((cue) => cue.text.trim().length > 0)
      .map((cue) => ({
        ...cue,
        start_sec: Math.max(0, cue.start_sec),
        end_sec: Math.max(cue.start_sec + 0.12, cue.end_sec),
      }))
      .sort((left, right) => left.start_sec - right.start_sec);

    const playbackRate = request.playback_rate ?? 1.0;
    let validRangeChanged = false;
    if (
      request.current_valid_range &&
      playbackRate <= persistence.validPlaybackRateThreshold
    ) {
      const updated = upsertValidRange(
        persistence.validRanges,
        request.current_valid_range,
      );
      persistence.validRanges = updated.ranges;
      validRangeChanged = updated.changed;
    }

    if (incomingCues.length === 0) {
      persistence.lastAppliedEpoch = request.session_epoch;
      persistence.lastAppliedChunkSeq = request.chunk_seq;
      if (validRangeChanged) {
        const nextSrt = cuesToSrtText(
          persistence.cues,
          persistence.validRanges,
          persistence.validPlaybackRateThreshold,
        );
        const tempPath = `${persistence.subtitlePath}.tmp`;
        await fs.writeFile(tempPath, nextSrt, "utf8");
        await fs.unlink(persistence.subtitlePath).catch(() => undefined);
        await fs.rename(tempPath, persistence.subtitlePath);
        const fileStat = await fs
          .stat(persistence.subtitlePath)
          .catch(() => null);
        persistence.lastFileMtimeMs = fileStat
          ? Number(fileStat.mtimeMs)
          : nowMs();
      }
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: true,
        subtitle_path: persistence.subtitlePath,
        cue_count: persistence.cues.length,
        accepted_cue_count: 0,
        skipped_inner_cue_count: 0,
        replaced_cue_count: 0,
        updated_at_ms: nowMs(),
      });
    }

    const batchStartSec = request.batch_start_sec ?? incomingCues[0].start_sec;
    const batchEndSec =
      request.batch_end_sec ?? incomingCues[incomingCues.length - 1].end_sec;
    const rangeStartSec = Math.max(0, Math.min(batchStartSec, batchEndSec));
    const rangeEndSec = Math.max(
      rangeStartSec,
      Math.max(batchStartSec, batchEndSec),
    );
    const seekAnchorSec = request.seek_anchor_sec;
    const hasSeekAnchor =
      typeof seekAnchorSec === "number" && Number.isFinite(seekAnchorSec);
    const seekAnchorToleranceSec = 2.0;
    const allowFirstOverlapReplaceForBatch =
      request.allow_first_overlap_replace_once === true &&
      hasSeekAnchor &&
      rangeEndSec + 0.001 >= Number(seekAnchorSec) - seekAnchorToleranceSec &&
      rangeStartSec <= Number(seekAnchorSec) + seekAnchorToleranceSec;

    // 合规区间判定仅用于 seek/replay 防重场景；正常连续播放不应阻断写盘
    const shouldEnforceValidRangeGuard =
      request.enforce_valid_range_guard === true;
    const isInValidRange = shouldEnforceValidRangeGuard
      ? isBatchInValidRanges(
          rangeStartSec,
          rangeEndSec,
          persistence.validRanges,
        )
      : false;

    // 时间戳验证：拒绝明显异常的时间戳
    const timestampTolerance = 2.0;
    const validatedCues = incomingCues.filter((cue) => {
      if (cue.start_sec < rangeStartSec - timestampTolerance) {
        return false;
      }
      if (cue.end_sec > rangeEndSec + timestampTolerance) {
        return false;
      }
      return true;
    });

    if (validatedCues.length === 0) {
      persistence.lastAppliedEpoch = request.session_epoch;
      persistence.lastAppliedChunkSeq = request.chunk_seq;
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: true,
        subtitle_path: persistence.subtitlePath,
        cue_count: persistence.cues.length,
        accepted_cue_count: 0,
        skipped_inner_cue_count: incomingCues.length,
        replaced_cue_count: 0,
        updated_at_ms: nowMs(),
      });
    }

    const batchInValidRange = isBatchInValidRanges(
      rangeStartSec,
      rangeEndSec,
      persistence.validRanges,
    );
    const overlapsPersistedCueInBatch = validatedCues.some((incomingCue) => {
      return persistence.cues.some((existingCue) =>
        cueOverlapsRange(
          existingCue,
          incomingCue.start_sec,
          incomingCue.end_sec,
        ),
      );
    });
    const allowFirstOverlapReplaceForOverlaps =
      allowFirstOverlapReplaceForBatch && overlapsPersistedCueInBatch;

    if (isInValidRange && !allowFirstOverlapReplaceForOverlaps) {
      persistence.lastAppliedEpoch = request.session_epoch;
      persistence.lastAppliedChunkSeq = request.chunk_seq;
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: false,
        subtitle_path: persistence.subtitlePath,
        cue_count: persistence.cues.length,
        accepted_cue_count: 0,
        skipped_inner_cue_count: validatedCues.length,
        replaced_cue_count: 0,
        updated_at_ms: nowMs(),
      });
    }

    // 允许在 ValidRanges 内补洞，但不允许覆盖已存在的持久化 cue。
    if (
      batchInValidRange &&
      overlapsPersistedCueInBatch &&
      !allowFirstOverlapReplaceForOverlaps
    ) {
      persistence.lastAppliedEpoch = request.session_epoch;
      persistence.lastAppliedChunkSeq = request.chunk_seq;
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: false,
        subtitle_path: persistence.subtitlePath,
        cue_count: persistence.cues.length,
        accepted_cue_count: 0,
        skipped_inner_cue_count: validatedCues.length,
        replaced_cue_count: 0,
        updated_at_ms: nowMs(),
      });
    }

    const boundaryEpsSec = 0.25;

    const existingRanges = mergeCueRanges(persistence.cues);
    const containingRange = existingRanges.find((range) => {
      return (
        rangeStartSec >= range.startSec + boundaryEpsSec &&
        rangeEndSec <= range.endSec - boundaryEpsSec
      );
    });

    if (containingRange && !allowFirstOverlapReplaceForOverlaps) {
      persistence.lastAppliedEpoch = request.session_epoch;
      persistence.lastAppliedChunkSeq = request.chunk_seq;
      return appendSubtitlePersistenceResponseSchema.parse({
        accepted: true,
        subtitle_path: persistence.subtitlePath,
        cue_count: persistence.cues.length,
        accepted_cue_count: 0,
        skipped_inner_cue_count: validatedCues.length,
        replaced_cue_count: 0,
        updated_at_ms: nowMs(),
      });
    }

    const removedExistingIndexes = new Set<number>();
    for (const incomingCue of validatedCues) {
      for (let index = 0; index < persistence.cues.length; index += 1) {
        if (removedExistingIndexes.has(index)) {
          continue;
        }
        const existingCue = persistence.cues[index];
        if (
          !cueOverlapsRange(
            existingCue,
            incomingCue.start_sec,
            incomingCue.end_sec,
          )
        ) {
          continue;
        }
        removedExistingIndexes.add(index);
        break;
      }
    }

    const replacedCueCount = removedExistingIndexes.size;
    const remainingCues = persistence.cues.filter(
      (_, index) => !removedExistingIndexes.has(index),
    );
    const mergedCues = dedupeCuesByTimeAndText([
      ...remainingCues,
      ...validatedCues,
    ]);

    persistence.cues = mergedCues;
    persistence.lastAppliedEpoch = request.session_epoch;
    persistence.lastAppliedChunkSeq = request.chunk_seq;

    const nextSrt = cuesToSrtText(
      persistence.cues,
      persistence.validRanges,
      persistence.validPlaybackRateThreshold,
    );
    const tempPath = `${persistence.subtitlePath}.tmp`;
    await fs.writeFile(tempPath, nextSrt, "utf8");
    await fs.unlink(persistence.subtitlePath).catch(() => undefined);
    await fs.rename(tempPath, persistence.subtitlePath);
    const fileStat = await fs.stat(persistence.subtitlePath).catch(() => null);
    persistence.lastFileMtimeMs = fileStat ? Number(fileStat.mtimeMs) : nowMs();

    return appendSubtitlePersistenceResponseSchema.parse({
      accepted: true,
      subtitle_path: persistence.subtitlePath,
      cue_count: persistence.cues.length,
      accepted_cue_count: incomingCues.length,
      skipped_inner_cue_count: 0,
      replaced_cue_count: replacedCueCount,
      updated_at_ms: nowMs(),
    });
  }

  async readPersistenceWindow(
    webContentsId: number,
    request: ReadSubtitlePersistenceWindowRequestDto,
  ): Promise<ReadSubtitlePersistenceWindowResponseDto> {
    const session = this.sessions.get(webContentsId);
    const persistence = session?.persistence;
    if (!session || !persistence) {
      return readSubtitlePersistenceWindowResponseSchema.parse({
        subtitle_path: persistence?.subtitlePath ?? null,
        cues: [],
        generated_ranges: [],
        timeline_in_generated_range: false,
        timeline_has_cue: false,
        generated_start_sec: null,
        generated_end_sec: null,
        updated_at_ms: nowMs(),
      });
    }

    if (request.prefer_persisted_file) {
      await refreshPersistenceStateFromFile(persistence).catch(() => undefined);
    }

    if (persistence.cues.length === 0) {
      return readSubtitlePersistenceWindowResponseSchema.parse({
        subtitle_path: persistence.subtitlePath,
        cues: [],
        generated_ranges: persistence.validRanges,
        timeline_in_generated_range: isBatchInValidRanges(
          request.timeline_sec,
          request.timeline_sec,
          persistence.validRanges,
        ),
        timeline_has_cue: false,
        generated_start_sec: null,
        generated_end_sec: null,
        updated_at_ms: nowMs(),
      });
    }

    const rangeStart = Math.max(
      0,
      request.timeline_sec - request.backtrack_sec,
    );
    const rangeEnd = request.timeline_sec + request.lookahead_sec;
    // 防重判定优先使用 ValidRanges（覆盖“无 cue 起点”场景，如 seek 到 0s）
    // 兜底：若历史文件尚无 ValidRanges，则退回到 cue 合并区间。
    const generatedRanges =
      persistence.validRanges.length > 0
        ? persistence.validRanges.map((range) => ({
            startSec: range.start_sec,
            endSec: range.end_sec,
          }))
        : mergeCueRanges(persistence.cues);
    const timelineInGeneratedRange = generatedRanges.some((range) => {
      return (
        range.startSec - 0.01 <= request.timeline_sec &&
        range.endSec + 0.01 >= request.timeline_sec
      );
    });
    const timelineHasCue = persistence.cues.some((cue) =>
      isCueAtTimeline(cue, request.timeline_sec),
    );
    const matched = persistence.cues
      .filter(
        (cue) =>
          cue.end_sec + 0.001 >= rangeStart &&
          cue.start_sec <= rangeEnd + 0.001,
      )
      .slice(-request.limit);

    return readSubtitlePersistenceWindowResponseSchema.parse({
      subtitle_path: persistence.subtitlePath,
      cues: matched,
      generated_ranges: generatedRanges.map((range) => ({
        start_sec: range.startSec,
        end_sec: range.endSec,
      })),
      timeline_in_generated_range: timelineInGeneratedRange,
      timeline_has_cue: timelineHasCue,
      generated_start_sec: persistence.cues[0]?.start_sec ?? null,
      generated_end_sec:
        persistence.cues[persistence.cues.length - 1]?.end_sec ?? null,
      updated_at_ms: nowMs(),
    });
  }

  async resetSession(
    webContentsId: number,
    request: ResetSubtitleSessionRequestDto,
  ): Promise<ResetSubtitleSessionResponseDto> {
    const session = this.sessions.get(webContentsId);
    if (!session) {
      return resetSubtitleSessionResponseSchema.parse({
        session_id: null,
        ok: false,
        events: [
          {
            code: "session_not_running",
            level: "warning",
            message: "subtitle session is not running",
            at_ms: nowMs(),
          },
        ],
        updated_at_ms: nowMs(),
      });
    }

    const payload = await this.requestSessionWorker(
      webContentsId,
      session,
      "reset",
      request,
    );
    return resetSubtitleSessionResponseSchema.parse(payload);
  }

  async flushSession(
    webContentsId: number,
  ): Promise<FlushSubtitleSessionResponseDto> {
    const session = this.sessions.get(webContentsId);
    if (!session) {
      return flushSubtitleSessionResponseSchema.parse({
        session_id: null,
        cues: [],
        preview: null,
        events: [],
        updated_at_ms: nowMs(),
      });
    }

    const payload = await this.requestSessionWorker(
      webContentsId,
      session,
      "flush",
      {},
    );
    return flushSubtitleSessionResponseSchema.parse(payload);
  }

  async pushAudio(
    webContentsId: number,
    request: PushSubtitleAudioRequestDto,
  ): Promise<PushSubtitleAudioResponseDto> {
    const session = this.sessions.get(webContentsId);
    if (!session) {
      return pushSubtitleAudioResponseSchema.parse({
        session_id: null,
        accepted: false,
        provider: null,
        cues: [],
        preview: null,
        events: [
          {
            code: "session_not_running",
            level: "warning",
            message: "subtitle session is not running",
            at_ms: nowMs(),
          },
        ],
        updated_at_ms: nowMs(),
      });
    }

    try {
      const payload = await this.requestSessionWorker(
        webContentsId,
        session,
        "push-audio",
        request,
      );
      return pushSubtitleAudioResponseSchema.parse(payload);
    } catch (error) {
      if (
        !this.isRecoverableWorkerError(error) &&
        !this.isSessionNotRunningError(error)
      ) {
        throw error;
      }

      const requestEpoch = Number.isFinite(request.session_epoch)
        ? Math.max(0, Math.floor(request.session_epoch))
        : 0;
      const requestChunkSeq = Number.isFinite(request.chunk_seq)
        ? Math.max(0, Math.floor(request.chunk_seq))
        : 0;
      const sessionStillActive = this.hasActiveSession(webContentsId, session);

      return pushSubtitleAudioResponseSchema.parse({
        session_id: sessionStillActive ? session.sessionId : null,
        accepted: false,
        provider: sessionStillActive ? session.provider : null,
        cues: [],
        events: [
          {
            code: sessionStillActive
              ? "worker_unavailable"
              : "session_not_running",
            level: "warning",
            message: sessionStillActive
              ? error instanceof Error
                ? error.message
                : String(error)
              : "subtitle session is not running",
            at_ms: nowMs(),
          },
        ],
        session_epoch: requestEpoch,
        chunk_seq: requestChunkSeq,
        queue_len: 0,
        updated_at_ms: nowMs(),
      });
    }
  }

  private resolveWorkerScriptPath(): string {
    const mainEntry = process.argv[1] ? path.resolve(process.argv[1]) : "";
    const candidates: string[] = [];

    if (mainEntry) {
      candidates.push(path.join(path.dirname(mainEntry), "asrWorker.cjs"));
    }
    candidates.push(path.join(process.cwd(), "dist-electron", "asrWorker.cjs"));

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    throw new Error("subtitle_asr_worker_not_found");
  }

  private createWorkerTransport(workerPath: string): SubtitleWorkerTransport {
    const preferProcessTransport =
      process.env.MEDIA_PLAYERX_SUBTITLE_WORKER_TRANSPORT?.trim().toLowerCase() !==
      "thread";

    if (preferProcessTransport) {
      const child = fork(workerPath, [], {
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      });
      return new ChildProcessSubtitleTransport(child);
    }

    return new WorkerThreadSubtitleTransport(new Worker(workerPath));
  }
}
