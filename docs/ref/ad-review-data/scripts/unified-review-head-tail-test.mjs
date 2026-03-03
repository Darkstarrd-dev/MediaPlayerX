#!/usr/bin/env node

import { performance } from "node:perf_hooks";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

function nowTag() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function normalizeEndpointBase(raw) {
  const value = String(raw ?? "").trim();
  if (!value) {
    return "http://127.0.0.1:1234/v1";
  }
  return value.replace(/\/+$/, "");
}

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.floor(n);
}

function mean(values) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toFixed(value, digits = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(digits));
}

function pickVisionModelId(modelList) {
  const ids = modelList
    .map((item) => (item && typeof item.id === "string" ? item.id.trim() : ""))
    .filter((item) => item.length > 0);
  if (ids.length === 0) {
    return null;
  }
  return ids.find((id) => /vl|vision|llava/i.test(id)) ?? ids[0];
}

async function resolveModelId(endpointBase, explicitModel) {
  if (typeof explicitModel === "string" && explicitModel.trim().length > 0) {
    return explicitModel.trim();
  }
  const response = await fetch(`${endpointBase}/models`);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `read models failed: HTTP ${response.status} ${text.slice(0, 200)}`,
    );
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`models response not json: ${text.slice(0, 200)}`);
  }
  const modelId = pickVisionModelId(Array.isArray(body?.data) ? body.data : []);
  if (!modelId) {
    throw new Error("no model found");
  }
  return modelId;
}

async function listImages(advancedDir) {
  const entries = await readdir(advancedDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(webp|jpg|jpeg|png)$/i.test(name))
    .sort((left, right) =>
      left.localeCompare(right, undefined, { numeric: true }),
    );
}

function imageIdFromName(name) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(0, dot) : name;
}

function chooseHeadAndTail(fileNames, headN, tailBaseN) {
  const plain = fileNames.filter((name) =>
    /^\d+\.(webp|jpg|jpeg|png)$/i.test(name),
  );
  const head = plain.slice(0, headN);

  const tailPreferred = [
    "29_zzz4.2.webp",
    "29.webp",
    "28.webp",
    "27_zzz2.1.1.webp",
    "27.webp",
    "26_zzz1.3.webp",
    "26.webp",
    "25_zzz1.1.webp",
    "25.webp",
    "24.webp",
  ].filter((name) => fileNames.includes(name));

  const tailWindow = tailPreferred.slice(0, tailBaseN);
  return {
    head,
    tailWindow,
  };
}

async function encodeImage(absPath, resizePx, quality) {
  const source = await readFile(absPath);
  const jpeg = await sharp(source, { failOn: "none" })
    .rotate()
    .resize({
      width: resizePx,
      height: resizePx,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
}

function headSystemPrompt() {
  return [
    "You are manga HEAD pages reviewer.",
    "Focus on duplicate cover detection and ad-overlay on same base image.",
    "Allow mild crop/compression differences and ignore overlaid text when matching base artwork.",
    "Also classify ad, blank, body, non-body for each image.",
    "Return JSON only.",
  ].join(" ");
}

function tailSystemPrompt() {
  return [
    "You are manga TAIL pages reviewer.",
    "Focus on ad pages, blank pages, non-body pages (back cover, credits, afterword).",
    "Also classify body/non-body for each image.",
    "Duplicate group fields can be empty when uncertain.",
    "Return JSON only.",
  ].join(" ");
}

function userPrompt() {
  return [
    "Output JSON only with schema:",
    "{",
    '  "protocol": "head_tail_review_v1",',
    '  "input_image_ids": [],',
    '  "duplicate_groups": [{"ids": [], "ad_overlay_ids": [], "ad_overlay_texts": [{"image_id": "", "texts": []}]}],',
    '  "ad_image_ids": [],',
    '  "blank_image_ids": [],',
    '  "body_image_ids": [],',
    '  "non_body_image_ids": [],',
    '  "items": [{',
    '    "image_id": "",',
    '    "is_ad": false,',
    '    "is_blank": false,',
    '    "is_body": false,',
    '    "is_non_body": true,',
    '    "is_cover_like": false,',
    '    "is_ad_overlay_cover": false,',
    '    "reason": "",',
    '    "confidence": 0.0',
    "  }]",
    "}",
    "Rules: items must cover all input_image_ids exactly once; arrays keep input order; is_blank=true => is_body=false and is_non_body=true; is_body=true => is_non_body=false.",
  ].join("\n");
}

function extractJsonCodeBlocks(raw) {
  const blocks = [];
  const pattern = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match = pattern.exec(raw);
  while (match) {
    blocks.push(match[1].trim());
    match = pattern.exec(raw);
  }
  return blocks;
}

function extractBalancedObjects(raw) {
  const candidates = [];
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

function parseJsonLoose(raw) {
  const text = String(raw ?? "").trim();
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

function extractMessageContent(body) {
  if (!body || typeof body !== "object") {
    return null;
  }
  const choices = body.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }
  const first = choices[0];
  if (!first || typeof first !== "object") {
    return null;
  }
  const message = first.message;
  if (!message || typeof message !== "object") {
    return null;
  }
  const content = message.content;
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return null;
  }
  const textParts = [];
  for (const item of content) {
    if (!item || typeof item !== "object") {
      continue;
    }
    if (typeof item.text === "string" && item.text.trim()) {
      textParts.push(item.text);
    }
  }
  return textParts.length > 0 ? textParts.join("\n") : null;
}

function toBool(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (lowered === "true" || lowered === "1") return true;
    if (lowered === "false" || lowered === "0") return false;
  }
  return false;
}

function dedupeByInputOrder(ids, inputOrder) {
  const set = new Set(ids);
  return inputOrder.filter((id) => set.has(id));
}

function normalizeResult(parsed, inputImageIds) {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const inputSet = new Set(inputImageIds);
  const toIdArray = (value) =>
    Array.isArray(value)
      ? value
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0 && inputSet.has(item))
      : [];

  const itemArray = Array.isArray(parsed.items) ? parsed.items : [];
  const itemMap = new Map();
  for (const rawItem of itemArray) {
    if (!rawItem || typeof rawItem !== "object") {
      continue;
    }
    const imageId =
      typeof rawItem.image_id === "string" ? rawItem.image_id.trim() : "";
    if (!imageId || !inputSet.has(imageId) || itemMap.has(imageId)) {
      continue;
    }
    itemMap.set(imageId, {
      image_id: imageId,
      is_ad: toBool(rawItem.is_ad),
      is_blank: toBool(rawItem.is_blank),
      is_body: toBool(rawItem.is_body),
      is_non_body: toBool(rawItem.is_non_body),
      is_cover_like: toBool(rawItem.is_cover_like),
      is_ad_overlay_cover: toBool(rawItem.is_ad_overlay_cover),
      reason: typeof rawItem.reason === "string" ? rawItem.reason.trim() : "",
      confidence: Number.isFinite(Number(rawItem.confidence))
        ? Number(rawItem.confidence)
        : null,
    });
  }

  const normalizedItems = inputImageIds.map((id) => itemMap.get(id) ?? null);

  const duplicateRaw = Array.isArray(parsed.duplicate_groups)
    ? parsed.duplicate_groups
    : Array.isArray(parsed.duplicate_cover_groups)
      ? parsed.duplicate_cover_groups
      : [];

  const duplicateGroups = duplicateRaw
    .map((group) => {
      if (!group || typeof group !== "object") {
        return null;
      }
      const ids = toIdArray(group.ids ?? group.image_ids);
      const adOverlayIds = toIdArray(
        group.ad_overlay_ids ?? group.ad_overlay_image_ids,
      );
      const textsRaw = Array.isArray(group.ad_overlay_texts)
        ? group.ad_overlay_texts
        : [];
      const texts = textsRaw
        .map((entry) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }
          const imageId =
            typeof entry.image_id === "string" ? entry.image_id.trim() : "";
          if (!imageId || !inputSet.has(imageId)) {
            return null;
          }
          const list = Array.isArray(entry.texts)
            ? entry.texts
                .map((item) => (typeof item === "string" ? item.trim() : ""))
                .filter((item) => item.length > 0)
            : [];
          return {
            image_id: imageId,
            texts: list,
          };
        })
        .filter((entry) => Boolean(entry));
      if (ids.length < 2) {
        return null;
      }
      return {
        ids: dedupeByInputOrder(ids, inputImageIds),
        ad_overlay_ids: dedupeByInputOrder(adOverlayIds, inputImageIds),
        ad_overlay_texts: texts,
      };
    })
    .filter((group) => Boolean(group));

  const adIds = toIdArray(parsed.ad_image_ids);
  const blankIds = toIdArray(parsed.blank_image_ids);
  const bodyIds = toIdArray(parsed.body_image_ids);
  const nonBodyIds = toIdArray(parsed.non_body_image_ids);

  const mergedAd = [];
  const mergedBlank = [];
  const mergedBody = [];
  const mergedNonBody = [];
  const mergedOverlay = [];

  for (const item of normalizedItems) {
    if (!item) {
      continue;
    }
    if (item.is_blank) {
      item.is_body = false;
      item.is_non_body = true;
    }
    if (item.is_body) {
      item.is_non_body = false;
    }
    if (item.is_ad) {
      item.is_non_body = true;
    }

    if (item.is_ad) mergedAd.push(item.image_id);
    if (item.is_blank) mergedBlank.push(item.image_id);
    if (item.is_body) mergedBody.push(item.image_id);
    if (item.is_non_body) mergedNonBody.push(item.image_id);
    if (item.is_ad_overlay_cover) mergedOverlay.push(item.image_id);
  }

  const groupOverlay = duplicateGroups.flatMap((group) => group.ad_overlay_ids);

  return {
    protocol:
      typeof parsed.protocol === "string" ? parsed.protocol.trim() : null,
    input_image_ids: dedupeByInputOrder(
      toIdArray(parsed.input_image_ids),
      inputImageIds,
    ),
    duplicate_groups: duplicateGroups,
    ad_image_ids: dedupeByInputOrder([...adIds, ...mergedAd], inputImageIds),
    blank_image_ids: dedupeByInputOrder(
      [...blankIds, ...mergedBlank],
      inputImageIds,
    ),
    body_image_ids: dedupeByInputOrder(
      [...bodyIds, ...mergedBody],
      inputImageIds,
    ),
    non_body_image_ids: dedupeByInputOrder(
      [...nonBodyIds, ...mergedNonBody],
      inputImageIds,
    ),
    ad_overlay_cover_image_ids: dedupeByInputOrder(
      [...groupOverlay, ...mergedOverlay],
      inputImageIds,
    ),
    items: normalizedItems,
    missing_image_ids: inputImageIds.filter((id) => !itemMap.has(id)),
  };
}

function sleep(ms) {
  if (ms <= 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendUnifiedRequest(params) {
  const { endpoint, apiKey, model, reviewType, payloadImages, timeoutMs } =
    params;

  const content = [{ type: "text", text: userPrompt() }];
  for (const image of payloadImages) {
    content.push({ type: "text", text: `image_id: ${image.image_id}` });
    content.push({ type: "image_url", image_url: { url: image.data_url } });
  }

  const payload = {
    model,
    messages: [
      {
        role: "system",
        content:
          reviewType === "head" ? headSystemPrompt() : tailSystemPrompt(),
      },
      {
        role: "user",
        content,
      },
    ],
    temperature: 0,
    max_tokens: 1800,
  };

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error(`timeout ${timeoutMs}ms`)),
    timeoutMs,
  );
  const startedAt = performance.now();

  let httpStatus = null;
  let usage = null;
  let rawContent = null;
  let parsed = null;
  let normalized = null;
  let error = null;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    httpStatus = response.status;
    const text = await response.text();
    if (!response.ok) {
      error = `HTTP ${response.status}: ${text.slice(0, 300)}`;
    } else {
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        error = `response not json: ${text.slice(0, 300)}`;
      }
      if (body) {
        usage = body.usage ?? null;
        rawContent = extractMessageContent(body);
        parsed = parseJsonLoose(rawContent);
        if (!parsed) {
          error = `cannot parse model json content: ${String(rawContent ?? "").slice(0, 300)}`;
        } else {
          normalized = normalizeResult(
            parsed,
            payloadImages.map((item) => item.image_id),
          );
          if (!normalized) {
            error = "normalized result is null";
          }
        }
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  } finally {
    clearTimeout(timer);
  }

  return {
    review_type: reviewType,
    image_ids: payloadImages.map((item) => item.image_id),
    http_status: httpStatus,
    latency_ms: toFixed(performance.now() - startedAt, 2),
    usage,
    raw_content: rawContent,
    normalized,
    error,
  };
}

function asSet(items) {
  return new Set(items);
}

function prf(predictedIds, expectedIds) {
  const predicted = asSet(predictedIds);
  const expected = asSet(expectedIds);
  const tp = Array.from(predicted).filter((id) => expected.has(id)).length;
  const fp = Array.from(predicted).filter((id) => !expected.has(id)).length;
  const fn = Array.from(expected).filter((id) => !predicted.has(id)).length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;
  return {
    tp,
    fp,
    fn,
    precision: toFixed(precision, 4),
    recall: toFixed(recall, 4),
    f1: toFixed(f1, 4),
  };
}

function flattenDuplicatePairs(groups) {
  const pairs = new Set();
  for (const group of groups) {
    const ids = group.ids ?? [];
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const left = ids[i];
        const right = ids[j];
        pairs.add(left < right ? `${left}::${right}` : `${right}::${left}`);
      }
    }
  }
  return Array.from(pairs);
}

function summarizeMode(rows) {
  const latencies = rows
    .map((row) => row.latency_ms)
    .filter((v) => typeof v === "number");
  const prompts = rows
    .map((row) =>
      typeof row.usage?.prompt_tokens === "number"
        ? row.usage.prompt_tokens
        : null,
    )
    .filter((v) => typeof v === "number");
  const totals = rows
    .map((row) =>
      typeof row.usage?.total_tokens === "number"
        ? row.usage.total_tokens
        : null,
    )
    .filter((v) => typeof v === "number");
  const parseOk = rows.filter(
    (row) => row.http_status === 200 && row.normalized === true,
  ).length;
  return {
    run_count: rows.length,
    parse_success_rate: toFixed(parseOk / Math.max(1, rows.length), 4),
    avg_latency_ms: toFixed(mean(latencies), 2),
    avg_prompt_tokens: toFixed(mean(prompts), 2),
    avg_total_tokens: toFixed(mean(totals), 2),
  };
}

function csvEscape(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function toCsv(rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const advancedDir = path.resolve(
    String(
      args["advanced-dir"] ?? path.join("src", "assets", "test", "advanced"),
    ),
  );
  const endpointBase = normalizeEndpointBase(args.endpoint);
  const endpoint = `${endpointBase}/chat/completions`;
  const apiKey = String(args["api-key"] ?? "lm-studio");
  const model = await resolveModelId(endpointBase, args.model);

  const repeats = Math.max(1, toInt(args.repeats, 3));
  const resizePx = Math.max(64, toInt(args.resize, 640));
  const quality = Math.max(1, Math.min(100, toInt(args.quality, 40)));
  const headN = Math.max(1, toInt(args["head-n"], 6));
  const tailBaseN = Math.max(1, Math.min(20, toInt(args["tail-base-n"], 10)));
  const timeoutMs = Math.max(1000, toInt(args["timeout-ms"], 120000));
  const sleepMs = Math.max(0, toInt(args["sleep-ms"], 120));

  const allFileNames = await listImages(advancedDir);
  const { head, tailWindow } = chooseHeadAndTail(
    allFileNames,
    headN,
    tailBaseN,
  );

  if (head.length === 0 || tailWindow.length === 0) {
    throw new Error("head or tail dataset is empty");
  }

  const tailKnownHashHits = tailWindow.filter((name) => /_zzz/i.test(name));
  const tailKnownHitIds = tailKnownHashHits.map(imageIdFromName);
  const tailLlmQuota = Math.max(0, tailBaseN - tailKnownHashHits.length);
  const tailLlmFiles = tailWindow
    .filter((name) => !/_zzz/i.test(name))
    .slice(0, tailLlmQuota);

  const usedFileNames = Array.from(new Set([...head, ...tailWindow]));
  const encodedByFile = new Map();
  for (const fileName of usedFileNames) {
    const absPath = path.join(advancedDir, fileName);
    encodedByFile.set(fileName, {
      file_name: fileName,
      image_id: imageIdFromName(fileName),
      abs_path: absPath,
      data_url: await encodeImage(absPath, resizePx, quality),
    });
  }

  const headPayload = head.map((name) => encodedByFile.get(name));
  const tailPayload = tailLlmFiles.map((name) => encodedByFile.get(name));

  const outRoot = path.resolve(
    String(
      args["out-dir"] ??
        path.join("docs", "perf", "unified-review-head-tail-test"),
    ),
  );
  await mkdir(outRoot, { recursive: true });
  const runDir = path.join(outRoot, `run-${nowTag()}`);
  await mkdir(runDir, { recursive: true });

  console.log(`endpoint=${endpoint}`);
  console.log(`model=${model}`);
  console.log(`repeats=${repeats}, resize=${resizePx}, quality=${quality}`);
  console.log(`head_ids=${headPayload.map((item) => item.image_id).join(",")}`);
  console.log(
    `tail_window_ids=${tailWindow.map((name) => imageIdFromName(name)).join(",")}`,
  );
  console.log(`tail_known_hash_hit_ids=${tailKnownHitIds.join(",")}`);
  console.log(
    `tail_llm_ids=${tailPayload.map((item) => item.image_id).join(",")}`,
  );

  const detailRows = [];
  const runOutputs = [];

  for (let runNo = 1; runNo <= repeats; runNo += 1) {
    const headMulti = await sendUnifiedRequest({
      endpoint,
      apiKey,
      model,
      reviewType: "head",
      payloadImages: headPayload,
      timeoutMs,
    });
    await sleep(sleepMs);

    const tailMulti = await sendUnifiedRequest({
      endpoint,
      apiKey,
      model,
      reviewType: "tail",
      payloadImages: tailPayload,
      timeoutMs,
    });
    await sleep(sleepMs);

    let headSingleTotalLatency = 0;
    let headSinglePrompt = 0;
    let headSingleTotal = 0;
    let headSingleOk = true;
    const headSingleMerged = [];
    const headSingleDup = [];

    for (const image of headPayload) {
      const row = await sendUnifiedRequest({
        endpoint,
        apiKey,
        model,
        reviewType: "head",
        payloadImages: [image],
        timeoutMs,
      });
      await sleep(sleepMs);
      headSingleTotalLatency += row.latency_ms ?? 0;
      headSinglePrompt +=
        typeof row.usage?.prompt_tokens === "number"
          ? row.usage.prompt_tokens
          : 0;
      headSingleTotal +=
        typeof row.usage?.total_tokens === "number"
          ? row.usage.total_tokens
          : 0;
      if (!(row.http_status === 200 && row.normalized)) {
        headSingleOk = false;
      } else {
        headSingleMerged.push(
          ...row.normalized.items.filter((item) => Boolean(item)),
        );
        headSingleDup.push(...row.normalized.duplicate_groups);
      }
    }

    const headSingle = {
      review_type: "head",
      image_ids: headPayload.map((item) => item.image_id),
      http_status: headSingleOk ? 200 : 500,
      latency_ms: toFixed(headSingleTotalLatency, 2),
      usage: {
        prompt_tokens: headSinglePrompt,
        total_tokens: headSingleTotal,
      },
      normalized: headSingleOk
        ? {
            protocol: "head_tail_review_v1",
            input_image_ids: headPayload.map((item) => item.image_id),
            duplicate_groups: headSingleDup,
            ad_image_ids: dedupeByInputOrder(
              headSingleMerged
                .filter((item) => item.is_ad)
                .map((item) => item.image_id),
              headPayload.map((item) => item.image_id),
            ),
            blank_image_ids: dedupeByInputOrder(
              headSingleMerged
                .filter((item) => item.is_blank)
                .map((item) => item.image_id),
              headPayload.map((item) => item.image_id),
            ),
            body_image_ids: dedupeByInputOrder(
              headSingleMerged
                .filter((item) => item.is_body)
                .map((item) => item.image_id),
              headPayload.map((item) => item.image_id),
            ),
            non_body_image_ids: dedupeByInputOrder(
              headSingleMerged
                .filter((item) => item.is_non_body)
                .map((item) => item.image_id),
              headPayload.map((item) => item.image_id),
            ),
            ad_overlay_cover_image_ids: dedupeByInputOrder(
              headSingleMerged
                .filter((item) => item.is_ad_overlay_cover)
                .map((item) => item.image_id),
              headPayload.map((item) => item.image_id),
            ),
            items: headPayload.map(
              (item) =>
                headSingleMerged.find((x) => x.image_id === item.image_id) ??
                null,
            ),
            missing_image_ids: headPayload
              .map((item) => item.image_id)
              .filter((id) => !headSingleMerged.some((x) => x.image_id === id)),
          }
        : null,
      error: headSingleOk ? null : "single head contains failed request",
    };

    let tailSingleTotalLatency = 0;
    let tailSinglePrompt = 0;
    let tailSingleTotal = 0;
    let tailSingleOk = true;
    const tailSingleMerged = [];

    for (const image of tailPayload) {
      const row = await sendUnifiedRequest({
        endpoint,
        apiKey,
        model,
        reviewType: "tail",
        payloadImages: [image],
        timeoutMs,
      });
      await sleep(sleepMs);
      tailSingleTotalLatency += row.latency_ms ?? 0;
      tailSinglePrompt +=
        typeof row.usage?.prompt_tokens === "number"
          ? row.usage.prompt_tokens
          : 0;
      tailSingleTotal +=
        typeof row.usage?.total_tokens === "number"
          ? row.usage.total_tokens
          : 0;
      if (!(row.http_status === 200 && row.normalized)) {
        tailSingleOk = false;
      } else {
        tailSingleMerged.push(
          ...row.normalized.items.filter((item) => Boolean(item)),
        );
      }
    }

    const tailSingle = {
      review_type: "tail",
      image_ids: tailPayload.map((item) => item.image_id),
      http_status: tailSingleOk ? 200 : 500,
      latency_ms: toFixed(tailSingleTotalLatency, 2),
      usage: {
        prompt_tokens: tailSinglePrompt,
        total_tokens: tailSingleTotal,
      },
      normalized: tailSingleOk
        ? {
            protocol: "head_tail_review_v1",
            input_image_ids: tailPayload.map((item) => item.image_id),
            duplicate_groups: [],
            ad_image_ids: dedupeByInputOrder(
              tailSingleMerged
                .filter((item) => item.is_ad)
                .map((item) => item.image_id),
              tailPayload.map((item) => item.image_id),
            ),
            blank_image_ids: dedupeByInputOrder(
              tailSingleMerged
                .filter((item) => item.is_blank)
                .map((item) => item.image_id),
              tailPayload.map((item) => item.image_id),
            ),
            body_image_ids: dedupeByInputOrder(
              tailSingleMerged
                .filter((item) => item.is_body)
                .map((item) => item.image_id),
              tailPayload.map((item) => item.image_id),
            ),
            non_body_image_ids: dedupeByInputOrder(
              tailSingleMerged
                .filter((item) => item.is_non_body)
                .map((item) => item.image_id),
              tailPayload.map((item) => item.image_id),
            ),
            ad_overlay_cover_image_ids: [],
            items: tailPayload.map(
              (item) =>
                tailSingleMerged.find((x) => x.image_id === item.image_id) ??
                null,
            ),
            missing_image_ids: tailPayload
              .map((item) => item.image_id)
              .filter((id) => !tailSingleMerged.some((x) => x.image_id === id)),
          }
        : null,
      error: tailSingleOk ? null : "single tail contains failed request",
    };

    const modeRows = [
      { mode: "multi", head: headMulti, tail: tailMulti },
      { mode: "single", head: headSingle, tail: tailSingle },
    ];

    for (const modeRow of modeRows) {
      const headOk =
        modeRow.head.http_status === 200 && Boolean(modeRow.head.normalized);
      const tailOk =
        modeRow.tail.http_status === 200 && Boolean(modeRow.tail.normalized);
      const mergedOk = headOk && tailOk;

      const expectedHeadDupPair = ["01", "02"];
      const expectedHeadOverlay = ["01"];

      const headDuplicatePairs = headOk
        ? flattenDuplicatePairs(modeRow.head.normalized.duplicate_groups)
        : [];
      const headHasExpectedDup = headDuplicatePairs.includes("01::02");
      const headOverlayMetrics = prf(
        headOk ? modeRow.head.normalized.ad_overlay_cover_image_ids : [],
        expectedHeadOverlay,
      );

      const mergedAdDeleteIds = mergedOk
        ? dedupeByInputOrder(
            [
              ...modeRow.head.normalized.ad_overlay_cover_image_ids,
              ...modeRow.tail.normalized.ad_image_ids,
              ...tailKnownHitIds,
            ],
            [
              ...headPayload.map((item) => item.image_id),
              ...tailWindow.map((name) => imageIdFromName(name)),
            ],
          )
        : [];

      const mergedNonBodyHideIds = mergedOk
        ? dedupeByInputOrder(
            [
              ...modeRow.head.normalized.non_body_image_ids,
              ...modeRow.tail.normalized.non_body_image_ids,
            ].filter((id) => !new Set(mergedAdDeleteIds).has(id)),
            [
              ...headPayload.map((item) => item.image_id),
              ...tailWindow.map((name) => imageIdFromName(name)),
            ],
          )
        : [];

      const row = {
        run_no: runNo,
        mode: modeRow.mode,
        head_ok: headOk,
        tail_ok: tailOk,
        merged_ok: mergedOk,
        head_latency_ms: modeRow.head.latency_ms,
        tail_latency_ms: modeRow.tail.latency_ms,
        total_latency_ms: toFixed(
          (modeRow.head.latency_ms ?? 0) + (modeRow.tail.latency_ms ?? 0),
          2,
        ),
        head_prompt_tokens: modeRow.head.usage?.prompt_tokens ?? null,
        tail_prompt_tokens: modeRow.tail.usage?.prompt_tokens ?? null,
        total_prompt_tokens:
          (modeRow.head.usage?.prompt_tokens ?? 0) +
          (modeRow.tail.usage?.prompt_tokens ?? 0),
        head_total_tokens: modeRow.head.usage?.total_tokens ?? null,
        tail_total_tokens: modeRow.tail.usage?.total_tokens ?? null,
        total_tokens:
          (modeRow.head.usage?.total_tokens ?? 0) +
          (modeRow.tail.usage?.total_tokens ?? 0),
        head_duplicate_has_01_02: headHasExpectedDup,
        head_overlay_precision: headOverlayMetrics.precision,
        head_overlay_recall: headOverlayMetrics.recall,
        head_overlay_f1: headOverlayMetrics.f1,
        ad_delete_ids: JSON.stringify(mergedAdDeleteIds),
        nonbody_hide_ids: JSON.stringify(mergedNonBodyHideIds),
        head_error: modeRow.head.error,
        tail_error: modeRow.tail.error,
      };

      detailRows.push(row);
      runOutputs.push({
        run_no: runNo,
        mode: modeRow.mode,
        head: modeRow.head,
        tail: modeRow.tail,
        merged: {
          ad_delete_ids: mergedAdDeleteIds,
          nonbody_hide_ids: mergedNonBodyHideIds,
          expected_head_duplicate_pair: expectedHeadDupPair,
          expected_head_overlay_ids: expectedHeadOverlay,
          tail_known_hash_hit_ids: tailKnownHitIds,
        },
      });

      console.log(
        `[run ${runNo}/${repeats}] mode=${modeRow.mode} merged_ok=${mergedOk ? "yes" : "no"} total_latency_ms=${row.total_latency_ms} total_tokens=${row.total_tokens} head_dup_01_02=${headHasExpectedDup ? "yes" : "no"} head_overlay_f1=${row.head_overlay_f1}`,
      );
    }
  }

  const multiRows = detailRows.filter((row) => row.mode === "multi");
  const singleRows = detailRows.filter((row) => row.mode === "single");

  const multiSummary = summarizeMode(
    multiRows.map((row) => ({
      http_status: row.merged_ok ? 200 : 500,
      normalized: row.merged_ok === true,
      latency_ms: row.total_latency_ms,
      usage: {
        prompt_tokens: row.total_prompt_tokens,
        total_tokens: row.total_tokens,
      },
    })),
  );
  const singleSummary = summarizeMode(
    singleRows.map((row) => ({
      http_status: row.merged_ok ? 200 : 500,
      normalized: row.merged_ok === true,
      latency_ms: row.total_latency_ms,
      usage: {
        prompt_tokens: row.total_prompt_tokens,
        total_tokens: row.total_tokens,
      },
    })),
  );

  const speedup =
    typeof multiSummary.avg_latency_ms === "number" &&
    typeof singleSummary.avg_latency_ms === "number"
      ? singleSummary.avg_latency_ms /
        Math.max(1e-6, multiSummary.avg_latency_ms)
      : null;
  const tokenReduction =
    typeof multiSummary.avg_total_tokens === "number" &&
    typeof singleSummary.avg_total_tokens === "number"
      ? 1 -
        multiSummary.avg_total_tokens /
          Math.max(1e-6, singleSummary.avg_total_tokens)
      : null;

  const summary = {
    generated_at: new Date().toISOString(),
    config: {
      advanced_dir: advancedDir,
      endpoint,
      model,
      repeats,
      resize_px: resizePx,
      jpeg_quality: quality,
      head_n: headN,
      tail_base_n: tailBaseN,
      tail_window_files: tailWindow,
      tail_window_ids: tailWindow.map((name) => imageIdFromName(name)),
      tail_known_hash_hit_ids: tailKnownHitIds,
      tail_llm_ids: tailPayload.map((item) => item.image_id),
      tail_llm_quota: tailLlmQuota,
      sleep_ms: sleepMs,
    },
    compare: {
      multi_avg_latency_ms: multiSummary.avg_latency_ms,
      single_avg_latency_ms: singleSummary.avg_latency_ms,
      speedup_single_div_multi: toFixed(speedup, 3),
      multi_avg_total_tokens: multiSummary.avg_total_tokens,
      single_avg_total_tokens: singleSummary.avg_total_tokens,
      total_token_reduction_ratio: toFixed(tokenReduction, 4),
    },
    multi_summary: multiSummary,
    single_summary: singleSummary,
    detail_rows: detailRows,
    run_outputs: runOutputs,
  };

  const rawPath = path.join(runDir, "raw.json");
  const detailCsvPath = path.join(runDir, "detail.csv");
  const summaryCsvPath = path.join(runDir, "summary.csv");

  await writeFile(rawPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(
    detailCsvPath,
    toCsv(detailRows, [
      "run_no",
      "mode",
      "head_ok",
      "tail_ok",
      "merged_ok",
      "head_latency_ms",
      "tail_latency_ms",
      "total_latency_ms",
      "head_prompt_tokens",
      "tail_prompt_tokens",
      "total_prompt_tokens",
      "head_total_tokens",
      "tail_total_tokens",
      "total_tokens",
      "head_duplicate_has_01_02",
      "head_overlay_precision",
      "head_overlay_recall",
      "head_overlay_f1",
      "ad_delete_ids",
      "nonbody_hide_ids",
      "head_error",
      "tail_error",
    ]),
    "utf8",
  );
  await writeFile(
    summaryCsvPath,
    toCsv(
      [
        {
          mode: "multi",
          parse_success_rate: multiSummary.parse_success_rate,
          avg_latency_ms: multiSummary.avg_latency_ms,
          avg_prompt_tokens: multiSummary.avg_prompt_tokens,
          avg_total_tokens: multiSummary.avg_total_tokens,
        },
        {
          mode: "single",
          parse_success_rate: singleSummary.parse_success_rate,
          avg_latency_ms: singleSummary.avg_latency_ms,
          avg_prompt_tokens: singleSummary.avg_prompt_tokens,
          avg_total_tokens: singleSummary.avg_total_tokens,
        },
        {
          mode: "compare",
          parse_success_rate: null,
          avg_latency_ms: summary.compare.speedup_single_div_multi,
          avg_prompt_tokens: null,
          avg_total_tokens: summary.compare.total_token_reduction_ratio,
        },
      ],
      [
        "mode",
        "parse_success_rate",
        "avg_latency_ms",
        "avg_prompt_tokens",
        "avg_total_tokens",
      ],
    ),
    "utf8",
  );

  console.log(`run_dir=${runDir}`);
  console.log(`raw_json=${rawPath}`);
  console.log(`detail_csv=${detailCsvPath}`);
  console.log(`summary_csv=${summaryCsvPath}`);
}

await main();
