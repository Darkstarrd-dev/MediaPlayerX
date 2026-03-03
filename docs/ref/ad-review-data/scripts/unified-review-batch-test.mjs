#!/usr/bin/env node

import { performance } from "node:perf_hooks";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
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
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.floor(parsed);
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
      `读取模型列表失败: HTTP ${response.status} ${text.slice(0, 300)}`,
    );
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`模型列表响应不是 JSON: ${text.slice(0, 300)}`);
  }
  const model = pickVisionModelId(
    Array.isArray(parsed?.data) ? parsed.data : [],
  );
  if (!model) {
    throw new Error("未找到可用模型");
  }
  return model;
}

async function listAdvancedImages(advancedDir) {
  const entries = await readdir(advancedDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(webp|jpg|jpeg|png)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function buildDatasets(fileNames) {
  const plain = fileNames.filter((name) =>
    /^\d+\.(webp|jpg|jpeg|png)$/i.test(name),
  );
  const head6 = plain.slice(0, 6);

  const tail10 = [
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

  return {
    head6,
    tail10,
  };
}

function makeImageId(fileName) {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex >= 0 ? fileName.slice(0, dotIndex) : fileName;
}

async function encodeImageToJpegDataUrl(absPath, resizePx, quality) {
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

function unifiedSystemPrompt() {
  return [
    "You are a unified manga page reviewer.",
    "You receive multiple images, each has a unique image_id.",
    "Return STRICT JSON only, no markdown, no extra text.",
    "Classify each image with: is_ad, is_blank, is_body, is_non_body, is_cover_like, is_ad_overlay_cover, duplicate_cover_group_id.",
    "Global outputs: duplicate cover groups (size>=2), ad overlay cover ids, ad ids, blank ids, body ids, non body ids.",
    "Rules:",
    "- is_blank=true => is_body=false and is_non_body=true",
    "- is_ad=true => is_non_body=true",
    "- items must cover all input image_ids exactly once",
    "- all id arrays keep input order",
    "- duplicate_cover_groups contain only cover-like pages",
  ].join(" ");
}

function unifiedUserPrompt() {
  return [
    "Process images by provided image_id.",
    "Output JSON with this schema only:",
    "{",
    '  "protocol": "unified_page_review_v1",',
    '  "input_image_ids": [],',
    '  "duplicate_cover_groups": [{"group_id":"g1","image_ids":[],"ad_overlay_image_ids":[]}],',
    '  "ad_overlay_cover_image_ids": [],',
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
    '    "duplicate_cover_group_id": null,',
    '    "is_ad_overlay_cover": false,',
    '    "reason_code": "cover_art|ad_text|ad_qr|blank_solid|body_panel|credits|toc|back_cover|unknown",',
    '    "confidence": 0.0',
    "  }]",
    "}",
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

function extractBalancedJsonObjects(raw) {
  const candidates = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === "{") {
      if (depth === 0) {
        start = i;
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
      candidates.push(raw.slice(start, i + 1));
      start = -1;
    }
  }
  return candidates;
}

function parseJsonLoose(rawContent) {
  const text = String(rawContent ?? "").trim();
  if (!text) {
    return null;
  }
  const candidates = [
    text,
    ...extractJsonCodeBlocks(text),
    ...extractBalancedJsonObjects(text),
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
  const msg = first.message;
  if (!msg || typeof msg !== "object") {
    return null;
  }
  const content = msg.content;
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

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1" || v === "yes") return true;
    if (v === "false" || v === "0" || v === "no") return false;
  }
  return null;
}

function normalizeUnifiedResult(parsed, expectedImageIds) {
  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const itemList = Array.isArray(parsed.items) ? parsed.items : [];
  const normalizedItems = [];
  const seen = new Set();

  for (const item of itemList) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const imageId =
      typeof item.image_id === "string" ? item.image_id.trim() : "";
    if (!imageId || seen.has(imageId)) {
      continue;
    }
    seen.add(imageId);

    normalizedItems.push({
      image_id: imageId,
      is_ad: normalizeBoolean(item.is_ad) ?? false,
      is_blank: normalizeBoolean(item.is_blank) ?? false,
      is_body: normalizeBoolean(item.is_body) ?? false,
      is_non_body: normalizeBoolean(item.is_non_body) ?? false,
      is_cover_like: normalizeBoolean(item.is_cover_like) ?? false,
      is_ad_overlay_cover: normalizeBoolean(item.is_ad_overlay_cover) ?? false,
      duplicate_cover_group_id:
        typeof item.duplicate_cover_group_id === "string" &&
        item.duplicate_cover_group_id.trim().length > 0
          ? item.duplicate_cover_group_id.trim()
          : null,
      reason_code:
        typeof item.reason_code === "string" ? item.reason_code.trim() : "",
      confidence: Number.isFinite(Number(item.confidence))
        ? Number(item.confidence)
        : null,
    });
  }

  const expectedSet = new Set(expectedImageIds);
  const filteredItems = normalizedItems.filter((item) =>
    expectedSet.has(item.image_id),
  );
  const itemMap = new Map(filteredItems.map((item) => [item.image_id, item]));

  const orderedItems = expectedImageIds.map(
    (imageId) => itemMap.get(imageId) ?? null,
  );
  const missingImageIds = expectedImageIds.filter((id) => !itemMap.has(id));

  const toIdArray = (value) =>
    Array.isArray(value)
      ? value
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0 && expectedSet.has(item))
      : [];

  const duplicateGroups = Array.isArray(parsed.duplicate_cover_groups)
    ? parsed.duplicate_cover_groups
        .map((group) => {
          if (!group || typeof group !== "object") {
            return null;
          }
          const imageIds = toIdArray(group.image_ids);
          const adOverlayIds = toIdArray(group.ad_overlay_image_ids);
          if (imageIds.length < 2) {
            return null;
          }
          return {
            group_id:
              typeof group.group_id === "string" && group.group_id.trim()
                ? group.group_id.trim()
                : null,
            image_ids: imageIds,
            ad_overlay_image_ids: adOverlayIds,
          };
        })
        .filter((group) => Boolean(group))
    : [];

  return {
    protocol: typeof parsed.protocol === "string" ? parsed.protocol : null,
    input_image_ids: toIdArray(parsed.input_image_ids),
    ad_overlay_cover_image_ids: toIdArray(parsed.ad_overlay_cover_image_ids),
    ad_image_ids: toIdArray(parsed.ad_image_ids),
    blank_image_ids: toIdArray(parsed.blank_image_ids),
    body_image_ids: toIdArray(parsed.body_image_ids),
    non_body_image_ids: toIdArray(parsed.non_body_image_ids),
    duplicate_cover_groups: duplicateGroups,
    items: orderedItems,
    missing_image_ids: missingImageIds,
  };
}

function dedupeIdsByInputOrder(ids, inputOrder) {
  const set = new Set(ids);
  const result = [];
  for (const id of inputOrder) {
    if (set.has(id)) {
      result.push(id);
    }
  }
  return result;
}

function enforceLogicalConsistency(result, inputOrder) {
  const byId = new Map();
  for (const item of result.items) {
    if (!item) continue;
    const normalized = { ...item };
    if (normalized.is_blank) {
      normalized.is_body = false;
      normalized.is_non_body = true;
    }
    if (normalized.is_ad) {
      normalized.is_non_body = true;
    }
    if (normalized.is_body) {
      normalized.is_non_body = false;
    }
    byId.set(normalized.image_id, normalized);
  }

  const adIds = [];
  const blankIds = [];
  const bodyIds = [];
  const nonBodyIds = [];
  const overlayIds = [];

  for (const id of inputOrder) {
    const item = byId.get(id);
    if (!item) continue;
    if (item.is_ad) adIds.push(id);
    if (item.is_blank) blankIds.push(id);
    if (item.is_body) bodyIds.push(id);
    if (item.is_non_body) nonBodyIds.push(id);
    if (item.is_ad_overlay_cover) overlayIds.push(id);
  }

  const next = {
    ...result,
    items: inputOrder.map((id) => byId.get(id) ?? null),
    ad_image_ids: dedupeIdsByInputOrder(
      [...result.ad_image_ids, ...adIds],
      inputOrder,
    ),
    blank_image_ids: dedupeIdsByInputOrder(
      [...result.blank_image_ids, ...blankIds],
      inputOrder,
    ),
    body_image_ids: dedupeIdsByInputOrder(
      [...result.body_image_ids, ...bodyIds],
      inputOrder,
    ),
    non_body_image_ids: dedupeIdsByInputOrder(
      [...result.non_body_image_ids, ...nonBodyIds],
      inputOrder,
    ),
    ad_overlay_cover_image_ids: dedupeIdsByInputOrder(
      [...result.ad_overlay_cover_image_ids, ...overlayIds],
      inputOrder,
    ),
  };

  return next;
}

function expectedOverlayIds(datasetImageIds) {
  return datasetImageIds.filter((id) => /_zzz/i.test(id));
}

function expectedDuplicateGroups(datasetImageIds) {
  const byBase = new Map();
  for (const id of datasetImageIds) {
    const m = id.match(/^(\d+)(?:_zzz.*)?$/i);
    if (!m) {
      continue;
    }
    const key = m[1];
    const list = byBase.get(key) ?? [];
    list.push(id);
    byBase.set(key, list);
  }

  return Array.from(byBase.values())
    .map((group) => datasetImageIds.filter((id) => group.includes(id)))
    .filter((group) => group.length >= 2);
}

function pairsFromGroups(groups) {
  const pairs = new Set();
  for (const group of groups) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const left = group[i];
        const right = group[j];
        pairs.add(left < right ? `${left}::${right}` : `${right}::${left}`);
      }
    }
  }
  return pairs;
}

function precisionRecallF1(predictedIds, expectedIds) {
  const predicted = new Set(predictedIds);
  const expected = new Set(expectedIds);
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
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
  };
}

function average(values) {
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

function buildSchemaMetrics(runResult, imageIds) {
  const imageIdSet = new Set(imageIds);
  const parseOk = Boolean(runResult.parsed);
  const normalized = runResult.normalized;
  if (!parseOk || !normalized) {
    return {
      parse_ok: false,
      item_coverage_ratio: 0,
      duplicate_item_count: 0,
      logic_conflict_count: null,
      missing_image_ids: imageIds,
    };
  }

  const presentIds = normalized.items
    .filter((item) => Boolean(item))
    .map((item) => item.image_id);
  const uniquePresent = new Set(presentIds);
  const missing = imageIds.filter((id) => !uniquePresent.has(id));
  let conflictCount = 0;

  for (const item of normalized.items) {
    if (!item) {
      continue;
    }
    if (item.is_blank && item.is_body) {
      conflictCount += 1;
    }
    if (item.is_body && item.is_non_body) {
      conflictCount += 1;
    }
    if (!imageIdSet.has(item.image_id)) {
      conflictCount += 1;
    }
  }

  return {
    parse_ok: true,
    item_coverage_ratio:
      imageIds.length > 0 ? uniquePresent.size / imageIds.length : 0,
    duplicate_item_count: presentIds.length - uniquePresent.size,
    logic_conflict_count: conflictCount,
    missing_image_ids: missing,
  };
}

function buildStabilityMetrics(successRuns, imageIds) {
  if (successRuns.length <= 1) {
    return {
      runs: successRuns.length,
      label_consistency_ratio: null,
      duplicate_pair_consistency_ratio: null,
    };
  }

  const fields = [
    "is_ad",
    "is_blank",
    "is_body",
    "is_non_body",
    "is_cover_like",
    "is_ad_overlay_cover",
  ];

  let totalChecks = 0;
  let agreedChecks = 0;

  for (const imageId of imageIds) {
    for (const field of fields) {
      const values = successRuns
        .map((run) =>
          run.normalized.items.find(
            (item) => item && item.image_id === imageId,
          ),
        )
        .filter((item) => Boolean(item))
        .map((item) => Boolean(item[field]));
      if (values.length === 0) {
        continue;
      }
      const trueCount = values.filter(Boolean).length;
      const falseCount = values.length - trueCount;
      agreedChecks += Math.max(trueCount, falseCount);
      totalChecks += values.length;
    }
  }

  const pairKeys = [];
  for (let i = 0; i < imageIds.length; i += 1) {
    for (let j = i + 1; j < imageIds.length; j += 1) {
      const left = imageIds[i];
      const right = imageIds[j];
      pairKeys.push(left < right ? `${left}::${right}` : `${right}::${left}`);
    }
  }

  let pairTotal = 0;
  let pairAgreed = 0;
  const pairSets = successRuns.map((run) =>
    pairsFromGroups(
      run.normalized.duplicate_cover_groups.map((group) => group.image_ids),
    ),
  );

  for (const pairKey of pairKeys) {
    const values = pairSets.map((set) => set.has(pairKey));
    const trueCount = values.filter(Boolean).length;
    const falseCount = values.length - trueCount;
    pairAgreed += Math.max(trueCount, falseCount);
    pairTotal += values.length;
  }

  return {
    runs: successRuns.length,
    label_consistency_ratio:
      totalChecks > 0 ? toFixed(agreedChecks / totalChecks, 4) : null,
    duplicate_pair_consistency_ratio:
      pairTotal > 0 ? toFixed(pairAgreed / pairTotal, 4) : null,
  };
}

function summarizeDatasetMode(runs, imageIds, datasetName, modeName) {
  const schemaMetrics = runs.map((run) => buildSchemaMetrics(run, imageIds));
  const successfulRuns = runs.filter(
    (run) => Boolean(run.normalized) && run.http_status === 200,
  );
  const parseSuccessCount = schemaMetrics.filter((m) => m.parse_ok).length;

  const latencyValues = runs
    .map((run) => run.latency_ms)
    .filter((value) => typeof value === "number");
  const promptTokenValues = runs
    .map((run) =>
      typeof run.usage?.prompt_tokens === "number"
        ? run.usage.prompt_tokens
        : null,
    )
    .filter((value) => typeof value === "number");
  const totalTokenValues = runs
    .map((run) =>
      typeof run.usage?.total_tokens === "number"
        ? run.usage.total_tokens
        : null,
    )
    .filter((value) => typeof value === "number");

  const stability = buildStabilityMetrics(successfulRuns, imageIds);

  let overlayMetrics = null;
  let duplicateMetrics = null;
  if (datasetName === "tail10" || datasetName === "mixed16") {
    const expectedOverlay = expectedOverlayIds(imageIds);
    const expectedPairs = pairsFromGroups(expectedDuplicateGroups(imageIds));

    const predictedOverlayMajority = imageIds.filter((imageId) => {
      let trueCount = 0;
      let totalCount = 0;
      for (const run of successfulRuns) {
        if (run.normalized.ad_overlay_cover_image_ids.includes(imageId)) {
          trueCount += 1;
        }
        totalCount += 1;
      }
      return totalCount > 0 && trueCount >= Math.ceil(totalCount / 2);
    });

    overlayMetrics = precisionRecallF1(
      predictedOverlayMajority,
      expectedOverlay,
    );

    const predictedPairMajority = new Set();
    const candidatePairs = [];
    for (let i = 0; i < imageIds.length; i += 1) {
      for (let j = i + 1; j < imageIds.length; j += 1) {
        const left = imageIds[i];
        const right = imageIds[j];
        candidatePairs.push(
          left < right ? `${left}::${right}` : `${right}::${left}`,
        );
      }
    }

    const predictedPairSets = successfulRuns.map((run) =>
      pairsFromGroups(
        run.normalized.duplicate_cover_groups.map((group) => group.image_ids),
      ),
    );

    for (const pairKey of candidatePairs) {
      const hit = predictedPairSets.filter((set) => set.has(pairKey)).length;
      if (hit >= Math.ceil(predictedPairSets.length / 2)) {
        predictedPairMajority.add(pairKey);
      }
    }

    duplicateMetrics = precisionRecallF1(
      Array.from(predictedPairMajority),
      Array.from(expectedPairs),
    );
  }

  return {
    dataset: datasetName,
    mode: modeName,
    run_count: runs.length,
    parse_success_rate: toFixed(
      parseSuccessCount / Math.max(1, runs.length),
      4,
    ),
    avg_item_coverage_ratio: toFixed(
      average(schemaMetrics.map((m) => m.item_coverage_ratio)),
      4,
    ),
    avg_logic_conflict_count: toFixed(
      average(
        schemaMetrics.map((m) =>
          typeof m.logic_conflict_count === "number"
            ? m.logic_conflict_count
            : 0,
        ),
      ),
      4,
    ),
    avg_latency_ms: toFixed(average(latencyValues), 2),
    avg_prompt_tokens: toFixed(average(promptTokenValues), 2),
    avg_total_tokens: toFixed(average(totalTokenValues), 2),
    img_per_sec: toFixed(
      imageIds.length / ((average(latencyValues) ?? 1) / 1000),
      3,
    ),
    stability,
    overlay_metrics: overlayMetrics,
    duplicate_metrics: duplicateMetrics,
  };
}

function compareModes(multiSummary, singleSummary) {
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

  return {
    dataset: multiSummary.dataset,
    multi_avg_latency_ms: multiSummary.avg_latency_ms,
    single_avg_latency_ms: singleSummary.avg_latency_ms,
    speedup_single_div_multi: toFixed(speedup, 3),
    multi_avg_total_tokens: multiSummary.avg_total_tokens,
    single_avg_total_tokens: singleSummary.avg_total_tokens,
    total_token_reduction_ratio: toFixed(tokenReduction, 4),
  };
}

function compressNormalized(normalized) {
  if (!normalized) {
    return null;
  }
  return {
    input_image_ids: normalized.input_image_ids,
    ad_overlay_cover_image_ids: normalized.ad_overlay_cover_image_ids,
    ad_image_ids: normalized.ad_image_ids,
    blank_image_ids: normalized.blank_image_ids,
    body_image_ids: normalized.body_image_ids,
    non_body_image_ids: normalized.non_body_image_ids,
    duplicate_cover_groups: normalized.duplicate_cover_groups,
    missing_image_ids: normalized.missing_image_ids,
    items: normalized.items
      .filter((item) => Boolean(item))
      .map((item) => ({
        image_id: item.image_id,
        is_ad: item.is_ad,
        is_blank: item.is_blank,
        is_body: item.is_body,
        is_non_body: item.is_non_body,
        is_cover_like: item.is_cover_like,
        is_ad_overlay_cover: item.is_ad_overlay_cover,
        duplicate_cover_group_id: item.duplicate_cover_group_id,
        reason_code: item.reason_code,
        confidence: item.confidence,
      })),
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

async function requestUnifiedReview(params) {
  const { endpoint, apiKey, model, imagePayloads, timeoutMs } = params;

  const inputImageIds = imagePayloads.map((item) => item.image_id);
  const userContent = [{ type: "text", text: unifiedUserPrompt() }];
  for (const item of imagePayloads) {
    userContent.push({ type: "text", text: `image_id: ${item.image_id}` });
    userContent.push({ type: "image_url", image_url: { url: item.data_url } });
  }

  const payload = {
    model,
    messages: [
      { role: "system", content: unifiedSystemPrompt() },
      { role: "user", content: userContent },
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

  let status = null;
  let responseText = "";
  let usage = null;
  let messageContent = null;
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
    status = response.status;
    responseText = await response.text();

    if (!response.ok) {
      error = `HTTP ${response.status}: ${responseText.slice(0, 300)}`;
    } else {
      let body;
      try {
        body = JSON.parse(responseText);
      } catch {
        error = `响应不是 JSON: ${responseText.slice(0, 300)}`;
      }
      if (body) {
        usage = body.usage ?? null;
        messageContent = extractMessageContent(body);
        parsed = parseJsonLoose(messageContent);
        if (!parsed) {
          error = `模型内容无法解析 JSON: ${String(messageContent ?? "").slice(0, 300)}`;
        } else {
          normalized = normalizeUnifiedResult(parsed, inputImageIds);
          if (!normalized) {
            error = "模型 JSON 结构不符合预期";
          } else {
            normalized = enforceLogicalConsistency(normalized, inputImageIds);
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
    http_status: status,
    latency_ms: toFixed(performance.now() - startedAt, 2),
    usage,
    message_content: messageContent,
    parsed,
    normalized,
    error,
    payload_image_count: imagePayloads.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = process.cwd();

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
  const timeoutMs = Math.max(1000, toInt(args["timeout-ms"], 120000));

  const outRoot = path.resolve(
    String(
      args["out-dir"] ?? path.join("docs", "perf", "unified-review-batch-test"),
    ),
  );
  await mkdir(outRoot, { recursive: true });
  const runDir = path.join(outRoot, `run-${nowTag()}`);
  await mkdir(runDir, { recursive: true });

  const allFiles = await listAdvancedImages(advancedDir);
  const datasets = buildDatasets(allFiles);
  const datasetEntries = Object.entries(datasets).filter(
    ([, files]) => files.length > 0,
  );

  if (datasetEntries.length === 0) {
    throw new Error(`数据集为空: ${advancedDir}`);
  }

  console.log(`endpoint=${endpoint}`);
  console.log(`model=${model}`);
  console.log(`resize=${resizePx}, quality=${quality}, repeats=${repeats}`);
  console.log(
    `datasets=${datasetEntries.map(([name, files]) => `${name}:${files.length}`).join(", ")}`,
  );

  const encodedByFile = new Map();
  for (const [, files] of datasetEntries) {
    for (const fileName of files) {
      if (encodedByFile.has(fileName)) {
        continue;
      }
      const absPath = path.join(advancedDir, fileName);
      const dataUrl = await encodeImageToJpegDataUrl(
        absPath,
        resizePx,
        quality,
      );
      encodedByFile.set(fileName, {
        file_name: fileName,
        image_id: makeImageId(fileName),
        abs_path: absPath,
        data_url: dataUrl,
      });
    }
  }

  const detailRows = [];
  const summaries = [];
  const comparisonRows = [];
  const runOutputs = [];

  for (const [datasetName, files] of datasetEntries) {
    const imagePayloads = files.map((file) => encodedByFile.get(file));
    const imageIds = imagePayloads.map((item) => item.image_id);

    console.log(`\n[dataset:${datasetName}] images=${imageIds.join(",")}`);

    const multiRuns = [];
    for (let runNo = 1; runNo <= repeats; runNo += 1) {
      const result = await requestUnifiedReview({
        endpoint,
        apiKey,
        model,
        imagePayloads,
        timeoutMs,
      });
      multiRuns.push({ run_no: runNo, ...result });
      console.log(
        `[multi][${datasetName}] run=${runNo}/${repeats} status=${result.http_status ?? "ERR"} latency_ms=${result.latency_ms ?? "-"} prompt_tokens=${result.usage?.prompt_tokens ?? "-"} parse=${result.normalized ? "ok" : "fail"}`,
      );
    }

    const singleRuns = [];
    for (let runNo = 1; runNo <= repeats; runNo += 1) {
      let runLatency = 0;
      let runPromptTokens = 0;
      let runCompletionTokens = 0;
      let runTotalTokens = 0;
      let runHttpAllOk = true;
      let allErrors = [];
      const mergedItems = [];
      const mergedGroups = [];
      const mergedAdOverlay = [];
      const mergedAd = [];
      const mergedBlank = [];
      const mergedBody = [];
      const mergedNonBody = [];

      for (const imagePayload of imagePayloads) {
        const result = await requestUnifiedReview({
          endpoint,
          apiKey,
          model,
          imagePayloads: [imagePayload],
          timeoutMs,
        });

        runLatency += result.latency_ms ?? 0;
        runPromptTokens +=
          typeof result.usage?.prompt_tokens === "number"
            ? result.usage.prompt_tokens
            : 0;
        runCompletionTokens +=
          typeof result.usage?.completion_tokens === "number"
            ? result.usage.completion_tokens
            : 0;
        runTotalTokens +=
          typeof result.usage?.total_tokens === "number"
            ? result.usage.total_tokens
            : 0;

        if (!(result.http_status === 200 && result.normalized)) {
          runHttpAllOk = false;
          allErrors.push({
            image_id: imagePayload.image_id,
            error: result.error,
          });
          continue;
        }

        for (const item of result.normalized.items) {
          if (item) {
            mergedItems.push(item);
          }
        }
        for (const group of result.normalized.duplicate_cover_groups) {
          mergedGroups.push(group);
        }
        mergedAdOverlay.push(...result.normalized.ad_overlay_cover_image_ids);
        mergedAd.push(...result.normalized.ad_image_ids);
        mergedBlank.push(...result.normalized.blank_image_ids);
        mergedBody.push(...result.normalized.body_image_ids);
        mergedNonBody.push(...result.normalized.non_body_image_ids);
      }

      const normalized = runHttpAllOk
        ? enforceLogicalConsistency(
            {
              protocol: "unified_page_review_v1",
              input_image_ids: imageIds,
              duplicate_cover_groups: mergedGroups,
              ad_overlay_cover_image_ids: dedupeIdsByInputOrder(
                mergedAdOverlay,
                imageIds,
              ),
              ad_image_ids: dedupeIdsByInputOrder(mergedAd, imageIds),
              blank_image_ids: dedupeIdsByInputOrder(mergedBlank, imageIds),
              body_image_ids: dedupeIdsByInputOrder(mergedBody, imageIds),
              non_body_image_ids: dedupeIdsByInputOrder(
                mergedNonBody,
                imageIds,
              ),
              items: imageIds.map(
                (id) =>
                  mergedItems.find((item) => item.image_id === id) ?? null,
              ),
              missing_image_ids: imageIds.filter(
                (id) => !mergedItems.some((item) => item.image_id === id),
              ),
            },
            imageIds,
          )
        : null;

      const singleResult = {
        run_no: runNo,
        http_status: runHttpAllOk ? 200 : 500,
        latency_ms: toFixed(runLatency, 2),
        usage: {
          prompt_tokens: runPromptTokens,
          completion_tokens: runCompletionTokens,
          total_tokens: runTotalTokens,
        },
        message_content: null,
        parsed: runHttpAllOk ? {} : null,
        normalized,
        error: runHttpAllOk ? null : JSON.stringify(allErrors),
        payload_image_count: imagePayloads.length,
      };

      singleRuns.push(singleResult);
      console.log(
        `[single][${datasetName}] run=${runNo}/${repeats} status=${singleResult.http_status} latency_ms=${singleResult.latency_ms} prompt_tokens=${singleResult.usage.prompt_tokens} parse=${singleResult.normalized ? "ok" : "fail"}`,
      );
    }

    for (const run of multiRuns) {
      runOutputs.push({
        dataset: datasetName,
        mode: "multi",
        run_no: run.run_no,
        http_status: run.http_status,
        latency_ms: run.latency_ms,
        prompt_tokens: run.usage?.prompt_tokens ?? null,
        total_tokens: run.usage?.total_tokens ?? null,
        error: run.error,
        normalized: compressNormalized(run.normalized),
      });
      detailRows.push({
        dataset: datasetName,
        mode: "multi",
        run_no: run.run_no,
        image_count: imageIds.length,
        http_status: run.http_status,
        latency_ms: run.latency_ms,
        prompt_tokens: run.usage?.prompt_tokens ?? null,
        completion_tokens: run.usage?.completion_tokens ?? null,
        total_tokens: run.usage?.total_tokens ?? null,
        parse_ok: Boolean(run.normalized),
        error: run.error,
      });
    }

    for (const run of singleRuns) {
      runOutputs.push({
        dataset: datasetName,
        mode: "single",
        run_no: run.run_no,
        http_status: run.http_status,
        latency_ms: run.latency_ms,
        prompt_tokens: run.usage?.prompt_tokens ?? null,
        total_tokens: run.usage?.total_tokens ?? null,
        error: run.error,
        normalized: compressNormalized(run.normalized),
      });
      detailRows.push({
        dataset: datasetName,
        mode: "single",
        run_no: run.run_no,
        image_count: imageIds.length,
        http_status: run.http_status,
        latency_ms: run.latency_ms,
        prompt_tokens: run.usage?.prompt_tokens ?? null,
        completion_tokens: run.usage?.completion_tokens ?? null,
        total_tokens: run.usage?.total_tokens ?? null,
        parse_ok: Boolean(run.normalized),
        error: run.error,
      });
    }

    const multiSummary = summarizeDatasetMode(
      multiRuns,
      imageIds,
      datasetName,
      "multi",
    );
    const singleSummary = summarizeDatasetMode(
      singleRuns,
      imageIds,
      datasetName,
      "single",
    );
    summaries.push(multiSummary, singleSummary);
    comparisonRows.push(compareModes(multiSummary, singleSummary));
  }

  const result = {
    generated_at: new Date().toISOString(),
    config: {
      advanced_dir: advancedDir,
      endpoint,
      model,
      resize_px: resizePx,
      jpeg_quality: quality,
      repeats,
      timeout_ms: timeoutMs,
      datasets,
    },
    summaries,
    comparisons: comparisonRows,
    detail_rows: detailRows,
    run_outputs: runOutputs,
  };

  const rawPath = path.join(runDir, "raw.json");
  const summaryCsvPath = path.join(runDir, "summary.csv");
  const compareCsvPath = path.join(runDir, "compare.csv");
  const detailCsvPath = path.join(runDir, "detail.csv");

  await writeFile(rawPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await writeFile(
    summaryCsvPath,
    toCsv(
      summaries.map((row) => ({
        dataset: row.dataset,
        mode: row.mode,
        run_count: row.run_count,
        parse_success_rate: row.parse_success_rate,
        avg_item_coverage_ratio: row.avg_item_coverage_ratio,
        avg_logic_conflict_count: row.avg_logic_conflict_count,
        avg_latency_ms: row.avg_latency_ms,
        avg_prompt_tokens: row.avg_prompt_tokens,
        avg_total_tokens: row.avg_total_tokens,
        img_per_sec: row.img_per_sec,
        label_consistency_ratio: row.stability?.label_consistency_ratio ?? null,
        duplicate_pair_consistency_ratio:
          row.stability?.duplicate_pair_consistency_ratio ?? null,
        overlay_precision: row.overlay_metrics?.precision ?? null,
        overlay_recall: row.overlay_metrics?.recall ?? null,
        overlay_f1: row.overlay_metrics?.f1 ?? null,
        dup_precision: row.duplicate_metrics?.precision ?? null,
        dup_recall: row.duplicate_metrics?.recall ?? null,
        dup_f1: row.duplicate_metrics?.f1 ?? null,
      })),
      [
        "dataset",
        "mode",
        "run_count",
        "parse_success_rate",
        "avg_item_coverage_ratio",
        "avg_logic_conflict_count",
        "avg_latency_ms",
        "avg_prompt_tokens",
        "avg_total_tokens",
        "img_per_sec",
        "label_consistency_ratio",
        "duplicate_pair_consistency_ratio",
        "overlay_precision",
        "overlay_recall",
        "overlay_f1",
        "dup_precision",
        "dup_recall",
        "dup_f1",
      ],
    ),
    "utf8",
  );
  await writeFile(
    compareCsvPath,
    toCsv(comparisonRows, [
      "dataset",
      "multi_avg_latency_ms",
      "single_avg_latency_ms",
      "speedup_single_div_multi",
      "multi_avg_total_tokens",
      "single_avg_total_tokens",
      "total_token_reduction_ratio",
    ]),
    "utf8",
  );
  await writeFile(
    detailCsvPath,
    toCsv(detailRows, [
      "dataset",
      "mode",
      "run_no",
      "image_count",
      "http_status",
      "latency_ms",
      "prompt_tokens",
      "completion_tokens",
      "total_tokens",
      "parse_ok",
      "error",
    ]),
    "utf8",
  );

  console.log(`run_dir=${runDir}`);
  console.log(`raw_json=${rawPath}`);
  console.log(`summary_csv=${summaryCsvPath}`);
  console.log(`compare_csv=${compareCsvPath}`);
  console.log(`detail_csv=${detailCsvPath}`);
}

await main();
