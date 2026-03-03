import { assertNotAborted, createAbortError } from "./concurrency";
import { extractAdReviewJson } from "./jsonExtract";
import {
  AD_REVIEW_BATCH_USER_PROMPT,
  AD_REVIEW_HEAD_BATCH_SYSTEM_PROMPT,
  AD_REVIEW_SYSTEM_PROMPT,
  AD_REVIEW_TAIL_BATCH_SYSTEM_PROMPT,
  AD_REVIEW_USER_PROMPT,
} from "./prompts";
import type {
  AdReviewBatchResult,
  AdReviewDetectionResult,
  AdVisionClient,
} from "./types";

type FetchLike = typeof fetch;

interface OpenAiVisionClientOptions {
  endpoint: string;
  model: string;
  apiKey?: string;
  timeoutMs?: number;
  resizePx?: number;
  maxTokens?: number;
  temperature?: number;
  fetchImpl?: FetchLike;
  imageToDataUrl?: (
    imageBytes: Uint8Array,
    resizePx: number,
  ) => Promise<string>;
  systemPrompt?: string;
  userPrompt?: string;
}

function detectImageMimeType(bytes: Uint8Array): string {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return "image/bmp";
  }

  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return "image/gif";
  }

  return "image/jpeg";
}

async function defaultImageToDataUrl(
  imageBytes: Uint8Array,
  resizePx: number,
): Promise<string> {
  const normalizedResizePx = Math.max(64, Math.min(2048, Math.floor(resizePx)));

  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;
    const jpegBuffer = await sharp(Buffer.from(imageBytes), { failOn: "none" })
      .rotate()
      .resize({
        width: normalizedResizePx,
        height: normalizedResizePx,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    return `data:image/jpeg;base64,${jpegBuffer.toString("base64")}`;
  } catch {
    const mime = detectImageMimeType(imageBytes);
    return `data:${mime};base64,${Buffer.from(imageBytes).toString("base64")}`;
  }
}

export function normalizeChatCompletionsUrl(endpoint: string): string {
  const trimmed = endpoint.trim();
  if (!trimmed) {
    throw new Error("LLM endpoint 不能为空");
  }

  const rewritePath = (pathnameInput: string): string => {
    const pathname = pathnameInput.replace(/\/+$/, "");
    if (pathname.endsWith("/chat/completions")) {
      return pathname;
    }
    if (pathname.endsWith("/embeddings")) {
      return pathname.replace(/\/embeddings$/, "/chat/completions");
    }
    if (pathname.endsWith("/v1")) {
      return `${pathname}/chat/completions`;
    }
    return `${pathname}/chat/completions`;
  };

  try {
    const parsed = new URL(trimmed);
    parsed.pathname = rewritePath(parsed.pathname);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch {
    return rewritePath(trimmed);
  }
}

function extractMessageTextFromChatResponse(
  responseBody: unknown,
): string | null {
  if (!responseBody || typeof responseBody !== "object") {
    return null;
  }

  const choices = (responseBody as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") {
    return null;
  }

  const message = (firstChoice as { message?: unknown }).message;
  if (!message || typeof message !== "object") {
    return null;
  }

  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  const textParts: string[] = [];
  for (const item of content) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const text = (item as { text?: unknown }).text;
    if (typeof text === "string" && text.trim()) {
      textParts.push(text);
    }
  }

  if (textParts.length === 0) {
    return null;
  }

  return textParts.join("\n");
}

function extractJsonCodeBlocks(raw: string): string[] {
  const blocks: string[] = [];
  const pattern = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match = pattern.exec(raw);
  while (match) {
    blocks.push(match[1].trim());
    match = pattern.exec(raw);
  }
  return blocks;
}

function extractBalancedObjects(raw: string): string[] {
  const candidates: string[] = [];
  let depth = 0;
  let start = -1;
  for (let index = 0; index < raw.length; index += 1) {
    const ch = raw[index];
    if (ch === "{") {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
      continue;
    }
    if (ch !== "}") {
      continue;
    }
    if (depth === 0) {
      continue;
    }
    depth -= 1;
    if (depth === 0 && start >= 0) {
      candidates.push(raw.slice(start, index + 1));
      start = -1;
    }
  }
  return candidates;
}

function parseJsonLoose(raw: string): unknown {
  const text = raw.trim();
  if (!text) {
    return null;
  }

  const candidates = [
    text,
    ...extractJsonCodeBlocks(text),
    ...extractBalancedObjects(text),
  ];
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // noop
    }
  }

  return null;
}

function normalizeIdArray(value: unknown, inputOrder: string[]): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const allowed = new Set(inputOrder);
  const seen = new Set<string>();
  const rawIds: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const id = item.trim();
    if (!id || !allowed.has(id) || seen.has(id)) {
      continue;
    }
    rawIds.push(id);
    seen.add(id);
  }
  return inputOrder.filter((id) => seen.has(id));
}

function normalizeBatchResult(
  parsed: unknown,
  inputImageIds: string[],
  rawText: string,
): AdReviewBatchResult | null {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const value = parsed as Record<string, unknown>;
  const duplicateGroupsRaw = Array.isArray(value.duplicate_groups)
    ? value.duplicate_groups
    : [];
  const duplicateGroups = duplicateGroupsRaw
    .map((group) => {
      if (!group || typeof group !== "object") {
        return null;
      }
      const rawGroup = group as Record<string, unknown>;
      const ids = normalizeIdArray(rawGroup.ids, inputImageIds);
      const adOverlayIds = normalizeIdArray(
        rawGroup.ad_overlay_ids,
        inputImageIds,
      );
      const adOverlayTextsRaw = Array.isArray(rawGroup.ad_overlay_texts)
        ? rawGroup.ad_overlay_texts
        : [];
      const adOverlayTexts = adOverlayTextsRaw
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }
          const rawEntry = entry as Record<string, unknown>;
          const imageId =
            typeof rawEntry.image_id === "string"
              ? rawEntry.image_id.trim()
              : "";
          if (!imageId || !inputImageIds.includes(imageId)) {
            return null;
          }
          const texts = Array.isArray(rawEntry.texts)
            ? rawEntry.texts
                .map((text) => (typeof text === "string" ? text.trim() : ""))
                .filter((text) => text.length > 0)
            : [];
          return {
            imageId,
            texts,
          };
        })
        .filter((item): item is { imageId: string; texts: string[] } =>
          Boolean(item),
        );

      return {
        ids,
        adOverlayIds,
        adOverlayTexts,
      };
    })
    .filter((group): group is NonNullable<typeof group> => Boolean(group));

  const itemArray = Array.isArray(value.items) ? value.items : [];
  const itemById = new Map<string, AdReviewBatchResult["items"][number]>();
  for (const item of itemArray) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const rawItem = item as Record<string, unknown>;
    const imageId =
      typeof rawItem.image_id === "string" ? rawItem.image_id.trim() : "";
    if (!imageId || !inputImageIds.includes(imageId) || itemById.has(imageId)) {
      continue;
    }
    const isBlank = Boolean(rawItem.is_blank);
    const isBody = Boolean(rawItem.is_body) && !isBlank;
    const isAd = Boolean(rawItem.is_ad);
    const isNonBody =
      isAd || isBlank || (!isBody && Boolean(rawItem.is_non_body));
    itemById.set(imageId, {
      imageId,
      isAd,
      isBlank,
      isBody,
      isNonBody,
      isAdOverlayCover: Boolean(rawItem.is_ad_overlay_cover),
      reason: typeof rawItem.reason === "string" ? rawItem.reason.trim() : "",
    });
  }

  const items = inputImageIds.map((imageId) => {
    const found = itemById.get(imageId);
    if (found) {
      return found;
    }
    return {
      imageId,
      isAd: false,
      isBlank: false,
      isBody: false,
      isNonBody: false,
      isAdOverlayCover: false,
      reason: "",
    };
  });

  const mergedAdIds = normalizeIdArray(value.ad_image_ids, inputImageIds);
  const mergedNonBodyIds = normalizeIdArray(
    value.non_body_image_ids,
    inputImageIds,
  );
  const adFromItems = items
    .filter((item) => item.isAd)
    .map((item) => item.imageId);
  const nonBodyFromItems = items
    .filter((item) => item.isNonBody)
    .map((item) => item.imageId);

  return {
    inputImageIds,
    duplicateGroups,
    adImageIds: normalizeIdArray(
      [...mergedAdIds, ...adFromItems],
      inputImageIds,
    ),
    nonBodyImageIds: normalizeIdArray(
      [...mergedNonBodyIds, ...nonBodyFromItems],
      inputImageIds,
    ),
    items,
    rawText,
  };
}

function createRequestSignal(
  timeoutMs: number,
  parentSignal?: AbortSignal,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort(createAbortError(`LLM 请求超时: ${timeoutMs}ms`));
  }, timeoutMs);

  const onParentAbort = () => {
    controller.abort(createAbortError("操作已取消"));
  };

  if (parentSignal?.aborted) {
    onParentAbort();
  } else {
    parentSignal?.addEventListener("abort", onParentAbort, { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      parentSignal?.removeEventListener("abort", onParentAbort);
    },
  };
}

export class OpenAiVisionClient implements AdVisionClient {
  private readonly endpoint: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly resizePx: number;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly fetchImpl: FetchLike;
  private readonly imageToDataUrl: (
    imageBytes: Uint8Array,
    resizePx: number,
  ) => Promise<string>;
  private readonly systemPrompt: string;
  private readonly userPrompt: string;

  constructor(options: OpenAiVisionClientOptions) {
    this.endpoint = normalizeChatCompletionsUrl(options.endpoint);
    this.model = options.model.trim();
    this.apiKey = options.apiKey?.trim() || "lm-studio";
    this.timeoutMs = Math.max(1_000, Math.floor(options.timeoutMs ?? 45_000));
    this.resizePx = Math.max(64, Math.floor(options.resizePx ?? 512));
    this.maxTokens = Math.max(32, Math.floor(options.maxTokens ?? 120));
    this.temperature = Number.isFinite(options.temperature)
      ? Number(options.temperature)
      : 0;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.imageToDataUrl = options.imageToDataUrl ?? defaultImageToDataUrl;
    this.systemPrompt = options.systemPrompt ?? AD_REVIEW_SYSTEM_PROMPT;
    this.userPrompt = options.userPrompt ?? AD_REVIEW_USER_PROMPT;

    if (!this.model) {
      throw new Error("LLM model 不能为空");
    }
  }

  private async requestChatMessage(params: {
    messages: Array<{ role: "system" | "user"; content: unknown }>;
    maxTokens: number;
    temperature: number;
    signal?: AbortSignal;
  }): Promise<string> {
    const payload = {
      model: this.model,
      messages: params.messages,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
    };

    const { signal, cleanup } = createRequestSignal(
      this.timeoutMs,
      params.signal,
    );

    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`LLM 请求失败: ${message}`);
    } finally {
      cleanup();
    }

    const bodyText = await response.text();
    if (!response.ok) {
      throw new Error(
        `LLM 请求失败: HTTP ${response.status} ${response.statusText} - ${bodyText.slice(0, 300)}`,
      );
    }

    let responseBody: unknown;
    try {
      responseBody = JSON.parse(bodyText);
    } catch {
      throw new Error(`LLM 响应不是合法 JSON: ${bodyText.slice(0, 300)}`);
    }

    const rawContent = extractMessageTextFromChatResponse(responseBody);
    if (!rawContent) {
      throw new Error("LLM 响应缺少 message.content");
    }

    return rawContent;
  }

  async detectAd(params: {
    imageBytes: Uint8Array;
    signal?: AbortSignal;
  }): Promise<AdReviewDetectionResult> {
    assertNotAborted(params.signal);

    const imageUrl = await this.imageToDataUrl(
      params.imageBytes,
      this.resizePx,
    );
    assertNotAborted(params.signal);

    const rawContent = await this.requestChatMessage({
      messages: [
        {
          role: "system",
          content: this.systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: this.userPrompt,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      maxTokens: this.maxTokens,
      temperature: this.temperature,
      signal: params.signal,
    });

    const parsed = extractAdReviewJson(rawContent);
    if (!parsed) {
      throw new Error(
        `LLM 响应无法解析广告判定 JSON: ${rawContent.slice(0, 300)}`,
      );
    }

    return {
      isAd: parsed.isAd,
      reason: parsed.reason,
      rawText: rawContent,
    };
  }

  async reviewBatch(params: {
    reviewType: "head" | "tail";
    images: Array<{ imageId: string; imageBytes: Uint8Array }>;
    signal?: AbortSignal;
  }): Promise<AdReviewBatchResult> {
    assertNotAborted(params.signal);

    const imagePayloads: Array<{ imageId: string; imageUrl: string }> = [];
    for (const image of params.images) {
      const imageUrl = await this.imageToDataUrl(
        image.imageBytes,
        this.resizePx,
      );
      imagePayloads.push({ imageId: image.imageId, imageUrl });
    }
    assertNotAborted(params.signal);

    const content: Array<{
      type: string;
      text?: string;
      image_url?: { url: string };
    }> = [{ type: "text", text: AD_REVIEW_BATCH_USER_PROMPT }];

    for (const image of imagePayloads) {
      content.push({ type: "text", text: `image_id: ${image.imageId}` });
      content.push({ type: "image_url", image_url: { url: image.imageUrl } });
    }

    const rawContent = await this.requestChatMessage({
      messages: [
        {
          role: "system",
          content:
            params.reviewType === "head"
              ? AD_REVIEW_HEAD_BATCH_SYSTEM_PROMPT
              : AD_REVIEW_TAIL_BATCH_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content,
        },
      ],
      maxTokens: Math.max(this.maxTokens, 1_200),
      temperature: 0,
      signal: params.signal,
    });

    const parsed = parseJsonLoose(rawContent);
    const inputImageIds = params.images.map((image) => image.imageId);
    const normalized = normalizeBatchResult(parsed, inputImageIds, rawContent);
    if (!normalized) {
      throw new Error(
        `LLM 批量审核 JSON 解析失败: ${rawContent.slice(0, 300)}`,
      );
    }
    return normalized;
  }
}

export type { OpenAiVisionClientOptions };
