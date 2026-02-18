import path from "node:path";
import { Worker } from "node:worker_threads";

const LANGUAGE_TAG_PATTERN = /^[a-z]{2,3}(?:-[a-z0-9]{2,8}){0,2}$/i;

type SubtitleWorkerCommand =
  | "init"
  | "stop"
  | "reset"
  | "flush"
  | "push-audio"
  | "transcribe-all";

interface SubtitleWorkerRequest {
  kind: "request";
  request_id: string;
  command: SubtitleWorkerCommand;
  payload: unknown;
}

interface SubtitleWorkerResponse {
  kind: "response";
  request_id: string;
  ok: boolean;
  payload?: unknown;
  error?: string;
}

interface SubtitleWorkerCue {
  start_sec: number;
  end_sec: number;
  text: string;
}

function formatSrtTime(seconds: number): string {
  const clamped = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const wholeMs = Math.floor(clamped * 1000);
  const ms = wholeMs % 1000;
  const wholeSec = Math.floor(wholeMs / 1000);
  const sec = wholeSec % 60;
  const wholeMin = Math.floor(wholeSec / 60);
  const min = wholeMin % 60;
  const hour = Math.floor(wholeMin / 60);
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export function cuesToSrt(cues: SubtitleWorkerCue[]): string {
  const lines: string[] = [];
  let cueIndex = 1;
  for (let index = 0; index < cues.length; index += 1) {
    const cue = cues[index];
    const cueText = cue.text.trim();
    if (!cueText) {
      continue;
    }
    lines.push(String(cueIndex));
    lines.push(
      `${formatSrtTime(cue.start_sec)} --> ${formatSrtTime(Math.max(cue.start_sec + 0.2, cue.end_sec))}`,
    );
    lines.push(cueText);
    lines.push("");
    cueIndex += 1;
  }
  return lines.join("\n").trim();
}

function normalizeLanguageTag(tag: string): string {
  const parts = tag.trim().split("-").filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  return parts
    .map((part, index) => {
      if (index === 0) {
        return part.toLowerCase();
      }
      if (part.length <= 3 && /^[a-z]+$/i.test(part)) {
        return part.toUpperCase();
      }
      return part.toLowerCase();
    })
    .join("-");
}

export function detectSubtitleLanguageLabel(
  fileName: string,
  videoStem: string,
): string | null {
  const ext = path.extname(fileName);
  const fileStem = path.basename(fileName, ext);
  const normalizedVideoStem = videoStem.trim().toLowerCase();
  const normalizedFileStem = fileStem.trim().toLowerCase();
  let candidate = "";

  if (normalizedFileStem.startsWith(`${normalizedVideoStem}.`)) {
    candidate = fileStem.slice(videoStem.length + 1);
  } else {
    const segments = fileStem.split(".");
    if (segments.length >= 2) {
      candidate = segments[segments.length - 1] ?? "";
    }
  }

  const trimmed = candidate.trim();
  if (!trimmed || !LANGUAGE_TAG_PATTERN.test(trimmed)) {
    return null;
  }

  const normalized = normalizeLanguageTag(trimmed);
  return normalized || null;
}

export function tryParseSseDataLine(line: string): string | null {
  const raw = line.trim();
  if (!raw.startsWith("data:")) {
    return null;
  }
  const payload = raw.slice(5).trim();
  return payload || null;
}

export function extractStreamDeltaText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return "";
  }
  const first = choices[0];
  if (!first || typeof first !== "object") {
    return "";
  }
  const delta = (first as { delta?: unknown }).delta;
  if (!delta || typeof delta !== "object") {
    return "";
  }
  const content = (delta as { content?: unknown }).content;
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((item) =>
      item &&
      typeof item === "object" &&
      typeof (item as { text?: unknown }).text === "string"
        ? (item as { text: string }).text
        : "",
    )
    .join("");
}

export function extractChatMessageText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return "";
  }
  const first = choices[0];
  if (!first || typeof first !== "object") {
    return "";
  }
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== "object") {
    return "";
  }
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((item) =>
      item &&
      typeof item === "object" &&
      typeof (item as { text?: unknown }).text === "string"
        ? (item as { text: string }).text
        : "",
    )
    .join("");
}

export class SubtitleWorkerClient {
  private requestSeed = 0;
  private readonly pending = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();

  constructor(private readonly worker: Worker) {
    this.worker.on("message", (raw: unknown) => {
      const message = raw as Partial<SubtitleWorkerResponse>;
      if (
        message.kind !== "response" ||
        typeof message.request_id !== "string"
      ) {
        return;
      }
      const pending = this.pending.get(message.request_id);
      if (!pending) {
        return;
      }
      clearTimeout(pending.timeout);
      this.pending.delete(message.request_id);
      if (!message.ok) {
        pending.reject(new Error(message.error ?? "subtitle_worker_failed"));
        return;
      }
      pending.resolve(message.payload);
    });

    this.worker.on("error", (error) => {
      this.failAll(error);
    });
    this.worker.on("exit", (code) => {
      if (code !== 0) {
        this.failAll(new Error(`subtitle_worker_exit_${code}`));
      }
    });
  }

  async request(
    command: SubtitleWorkerCommand,
    payload: unknown,
    timeoutMs = 20_000,
  ): Promise<unknown> {
    const requestId = `subtitle-worker-${Date.now()}-${this.requestSeed++}`;
    const requestPayload: SubtitleWorkerRequest = {
      kind: "request",
      request_id: requestId,
      command,
      payload,
    };

    return await new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`subtitle_worker_timeout:${command}`));
      }, timeoutMs);

      this.pending.set(requestId, { resolve, reject, timeout });
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
    this.failAll(new Error("subtitle_worker_terminated"));
    await this.worker.terminate();
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }
}
