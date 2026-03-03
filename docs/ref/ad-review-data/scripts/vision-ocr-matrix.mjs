#!/usr/bin/env node

import { performance } from "node:perf_hooks";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

function toIntList(raw, fallback) {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return fallback;
  }
  const parsed = raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0)
    .map((value) => Math.floor(value));
  if (parsed.length === 0) {
    return fallback;
  }
  return Array.from(new Set(parsed)).sort((left, right) => left - right);
}

function toPathList(raw, fallback) {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return fallback;
  }
  const parsed = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (parsed.length === 0) {
    return fallback;
  }
  return parsed;
}

function nowTag() {
  return new Date().toISOString().replace(/[:.]/g, "-");
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

function mean(values) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toFixedNumber(value, fraction = 2) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Number(value.toFixed(fraction));
}

function normalizeEndpointBase(rawEndpoint) {
  const trimmed = String(rawEndpoint ?? "").trim();
  if (!trimmed) {
    return "http://127.0.0.1:1234/v1";
  }
  return trimmed.replace(/\/+$/, "");
}

function resolveModelFromList(models) {
  const ids = models
    .map((item) => (item && typeof item.id === "string" ? item.id.trim() : ""))
    .filter((item) => item.length > 0);
  if (ids.length === 0) {
    return null;
  }
  const visionPreferred = ids.find((id) => /vl|vision|llava/i.test(id));
  return visionPreferred ?? ids[0];
}

async function resolveModelId(endpointBase, explicitModel) {
  if (typeof explicitModel === "string" && explicitModel.trim().length > 0) {
    return explicitModel.trim();
  }

  const response = await fetch(`${endpointBase}/models`);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `read models failed: HTTP ${response.status} - ${text.slice(0, 300)}`,
    );
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`models response not json: ${text.slice(0, 300)}`);
  }

  const modelId = resolveModelFromList(
    Array.isArray(body?.data) ? body.data : [],
  );
  if (!modelId) {
    throw new Error("no available model id");
  }
  return modelId;
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function levenshteinDistance(left, right) {
  const m = left.length;
  const n = right.length;
  if (m === 0) {
    return n;
  }
  if (n === 0) {
    return m;
  }

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j += 1) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

function similarityRatio(left, right) {
  if (!left && !right) {
    return 1;
  }
  if (!left || !right) {
    return 0;
  }
  const distance = levenshteinDistance(left, right);
  return 1 - distance / Math.max(left.length, right.length);
}

function parseOcrContent(rawContent) {
  if (typeof rawContent !== "string") {
    return "";
  }

  const trimmed = rawContent.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.text === "string") {
        return parsed.text.trim();
      }
      if (Array.isArray(parsed.lines)) {
        return parsed.lines
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter((item) => item.length > 0)
          .join("\n");
      }
    }
  } catch {
    // keep fallback
  }

  return trimmed;
}

async function loadImageEntries(imagePaths) {
  return Promise.all(
    imagePaths.map(async (imagePathInput) => {
      const absPath = path.resolve(imagePathInput);
      const sourceBuffer = await readFile(absPath);
      const metadata = await sharp(sourceBuffer, { failOn: "none" }).metadata();
      return {
        image_name: path.basename(absPath),
        image_path: absPath,
        source_width: metadata.width ?? null,
        source_height: metadata.height ?? null,
        source_format: metadata.format ?? null,
        source_bytes: sourceBuffer.length,
        source_buffer: sourceBuffer,
      };
    }),
  );
}

async function buildVariant(entry, resizePx, quality) {
  const encodeStartedAt = performance.now();
  const jpegBuffer = await sharp(entry.source_buffer, { failOn: "none" })
    .rotate()
    .resize({
      width: resizePx,
      height: resizePx,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality })
    .toBuffer();
  const encodeMs = performance.now() - encodeStartedAt;
  const meta = await sharp(jpegBuffer, { failOn: "none" }).metadata();
  return {
    jpeg_buffer: jpegBuffer,
    jpeg_width: meta.width ?? null,
    jpeg_height: meta.height ?? null,
    encode_ms: encodeMs,
  };
}

function buildPayload(model, dataUrl) {
  return {
    model,
    messages: [
      {
        role: "system",
        content: "You are an OCR engine. Return JSON only.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: 'Extract all visible text in reading order. Return JSON only: {"text":"..."}. Keep line breaks with \\n when needed. If no text is visible, return {"text":""}.',
          },
          {
            type: "image_url",
            image_url: {
              url: dataUrl,
            },
          },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 400,
  };
}

function buildImageBaselineText(rows, baselineResolution, baselineQuality) {
  const baselineByImage = new Map();
  for (const row of rows) {
    if (
      row.resize_px !== baselineResolution ||
      row.jpeg_quality !== baselineQuality
    ) {
      continue;
    }
    baselineByImage.set(row.image_name, row.ocr_text);
  }
  return baselineByImage;
}

function summarizeByCase(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.image_name}::${row.resize_px}::${row.jpeg_quality}`;
    const bucket = grouped.get(key) ?? {
      image_name: row.image_name,
      resize_px: row.resize_px,
      jpeg_quality: row.jpeg_quality,
      requested_runs: 0,
      ok_runs: 0,
      prompt_tokens: [],
      latency_ms: [],
      similarity: [],
      non_empty_ocr_runs: 0,
    };
    bucket.requested_runs += 1;
    if (row.ok) {
      bucket.ok_runs += 1;
    }
    if (typeof row.prompt_tokens === "number") {
      bucket.prompt_tokens.push(row.prompt_tokens);
    }
    if (typeof row.latency_ms === "number") {
      bucket.latency_ms.push(row.latency_ms);
    }
    if (typeof row.similarity_to_baseline === "number") {
      bucket.similarity.push(row.similarity_to_baseline);
    }
    if (row.ocr_text_normalized.length > 0) {
      bucket.non_empty_ocr_runs += 1;
    }
    grouped.set(key, bucket);
  }

  return Array.from(grouped.values())
    .map((bucket) => ({
      image_name: bucket.image_name,
      resize_px: bucket.resize_px,
      jpeg_quality: bucket.jpeg_quality,
      requested_runs: bucket.requested_runs,
      ok_runs: bucket.ok_runs,
      non_empty_ocr_runs: bucket.non_empty_ocr_runs,
      avg_prompt_tokens: toFixedNumber(mean(bucket.prompt_tokens), 2),
      avg_latency_ms: toFixedNumber(mean(bucket.latency_ms), 2),
      avg_similarity_to_baseline: toFixedNumber(mean(bucket.similarity), 4),
    }))
    .sort((left, right) => {
      if (left.image_name !== right.image_name) {
        return left.image_name.localeCompare(right.image_name);
      }
      if (left.resize_px !== right.resize_px) {
        return left.resize_px - right.resize_px;
      }
      return left.jpeg_quality - right.jpeg_quality;
    });
}

function summarizeResolutionPass(rows, qualityLevels, similarityThreshold) {
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.image_name}::${row.resize_px}`;
    const bucket = grouped.get(key) ?? {
      image_name: row.image_name,
      resize_px: row.resize_px,
      by_quality: new Map(),
    };

    const qualityBucket = bucket.by_quality.get(row.jpeg_quality) ?? {
      count: 0,
      pass_count: 0,
      similarity_values: [],
      non_empty_count: 0,
    };
    qualityBucket.count += 1;
    if (row.ocr_text_normalized.length > 0) {
      qualityBucket.non_empty_count += 1;
    }
    if (typeof row.similarity_to_baseline === "number") {
      qualityBucket.similarity_values.push(row.similarity_to_baseline);
      if (
        row.similarity_to_baseline >= similarityThreshold &&
        row.ocr_text_normalized.length > 0
      ) {
        qualityBucket.pass_count += 1;
      }
    }
    bucket.by_quality.set(row.jpeg_quality, qualityBucket);
    grouped.set(key, bucket);
  }

  const rowsOut = [];
  for (const bucket of grouped.values()) {
    let allQualityPass = true;
    let anyQualityPass = false;
    const qualityPassMap = {};

    for (const quality of qualityLevels) {
      const q = bucket.by_quality.get(quality);
      const pass = Boolean(q && q.count > 0 && q.pass_count === q.count);
      qualityPassMap[`q${quality}`] = pass;
      if (!pass) {
        allQualityPass = false;
      }
      if (pass) {
        anyQualityPass = true;
      }
    }

    rowsOut.push({
      image_name: bucket.image_name,
      resize_px: bucket.resize_px,
      all_quality_pass: allQualityPass,
      any_quality_pass: anyQualityPass,
      quality_pass_map: qualityPassMap,
    });
  }

  return rowsOut.sort((left, right) => {
    if (left.image_name !== right.image_name) {
      return left.image_name.localeCompare(right.image_name);
    }
    return left.resize_px - right.resize_px;
  });
}

function pickMinimalResolution(summaryRows, imageName, mode) {
  const rows = summaryRows.filter((row) => row.image_name === imageName);
  const matched = rows.find((row) =>
    mode === "strict" ? row.all_quality_pass : row.any_quality_pass,
  );
  return matched ? matched.resize_px : null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const endpointBase = normalizeEndpointBase(args.endpoint);
  const chatEndpoint = `${endpointBase}/chat/completions`;
  const apiKey = String(args["api-key"] ?? "lm-studio");
  const resizeLevels = toIntList(args.resolutions, [256, 384, 512, 768, 1024]);
  const qualityLevels = toIntList(args.qualities, [40, 50, 60, 70, 80]);
  const repeats = Math.max(1, Math.floor(Number(args.repeats ?? 1)));
  const timeoutMs = Math.max(
    1_000,
    Math.floor(Number(args["timeout-ms"] ?? 120_000)),
  );
  const similarityThreshold = Number.isFinite(
    Number(args["similarity-threshold"]),
  )
    ? Number(args["similarity-threshold"])
    : 0.9;
  const imagePaths = toPathList(args.images, [
    "src/assets/test/01.webp",
    "src/assets/test/02.jpg",
    "src/assets/test/03.webp",
  ]);

  const outRoot = path.resolve(
    String(args["out-dir"] ?? path.join("docs", "perf", "vision-ocr-matrix")),
  );
  await mkdir(outRoot, { recursive: true });
  const runTag = nowTag();
  const runDir = path.join(outRoot, `run-${runTag}`);
  await mkdir(runDir, { recursive: true });

  const model = await resolveModelId(endpointBase, args.model);
  const entries = await loadImageEntries(imagePaths);
  const totalCases =
    entries.length * resizeLevels.length * qualityLevels.length * repeats;

  console.log(`chat_endpoint=${chatEndpoint}`);
  console.log(`model=${model}`);
  console.log(
    `images=${entries.length}, resolutions=${resizeLevels.join("/")}, qualities=${qualityLevels.join("/")}, repeats=${repeats}`,
  );

  const rows = [];
  let caseIndex = 0;

  for (const entry of entries) {
    for (const resizePx of resizeLevels) {
      for (const quality of qualityLevels) {
        for (let runNo = 1; runNo <= repeats; runNo += 1) {
          caseIndex += 1;
          const variant = await buildVariant(entry, resizePx, quality);
          const dataUrl = `data:image/jpeg;base64,${variant.jpeg_buffer.toString("base64")}`;
          const payload = buildPayload(model, dataUrl);

          const abortController = new AbortController();
          const timeoutId = setTimeout(() => {
            abortController.abort(new Error(`timeout ${timeoutMs}ms`));
          }, timeoutMs);

          const startedAt = performance.now();
          let responseText = "";
          let status = null;
          let usage = null;
          let rawContent = null;
          let ocrText = "";
          let ok = false;
          let errorDetail = null;

          try {
            const response = await fetch(chatEndpoint, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
              signal: abortController.signal,
            });
            status = response.status;
            responseText = await response.text();

            if (!response.ok) {
              errorDetail = `HTTP ${response.status}: ${responseText.slice(0, 300)}`;
            } else {
              let body = null;
              try {
                body = JSON.parse(responseText);
              } catch {
                errorDetail = `response not json: ${responseText.slice(0, 300)}`;
              }

              if (body) {
                usage = body.usage ?? null;
                rawContent = body.choices?.[0]?.message?.content ?? null;
                ocrText = parseOcrContent(rawContent);
                ok = true;
              }
            }
          } catch (error) {
            errorDetail =
              error instanceof Error ? error.message : String(error);
          } finally {
            clearTimeout(timeoutId);
          }

          const latencyMs = performance.now() - startedAt;
          const row = {
            image_name: entry.image_name,
            image_path: entry.image_path,
            source_width: entry.source_width,
            source_height: entry.source_height,
            source_format: entry.source_format,
            source_bytes: entry.source_bytes,
            resize_px: resizePx,
            jpeg_quality: quality,
            run_no: runNo,
            ok,
            status,
            latency_ms: toFixedNumber(latencyMs, 2),
            encode_ms: toFixedNumber(variant.encode_ms, 2),
            jpeg_width: variant.jpeg_width,
            jpeg_height: variant.jpeg_height,
            payload_bytes: Buffer.byteLength(dataUrl),
            prompt_tokens:
              usage && typeof usage.prompt_tokens === "number"
                ? usage.prompt_tokens
                : null,
            completion_tokens:
              usage && typeof usage.completion_tokens === "number"
                ? usage.completion_tokens
                : null,
            total_tokens:
              usage && typeof usage.total_tokens === "number"
                ? usage.total_tokens
                : null,
            raw_content: rawContent,
            ocr_text: ocrText,
            ocr_text_normalized: normalizeText(ocrText),
            similarity_to_baseline: null,
            error_detail: errorDetail,
          };

          rows.push(row);

          const tokenText = row.prompt_tokens ?? "-";
          const latencyText = row.latency_ms ?? "-";
          const ocrLength = row.ocr_text_normalized.length;
          console.log(
            `[${String(caseIndex).padStart(3, " ")}/${totalCases}] ${ok ? "ok" : "fail"} image=${entry.image_name} resize=${resizePx} q=${quality} run=${runNo} tokens=${tokenText} latency_ms=${latencyText} ocr_len=${ocrLength}`,
          );
        }
      }
    }
  }

  const baselineResolution = resizeLevels[resizeLevels.length - 1];
  const baselineQuality = qualityLevels[qualityLevels.length - 1];
  const baselineByImage = buildImageBaselineText(
    rows,
    baselineResolution,
    baselineQuality,
  );

  for (const row of rows) {
    const baseline = baselineByImage.get(row.image_name);
    if (typeof baseline !== "string") {
      row.similarity_to_baseline = null;
      continue;
    }
    const left = normalizeText(row.ocr_text);
    const right = normalizeText(baseline);
    row.similarity_to_baseline = toFixedNumber(similarityRatio(left, right), 4);
  }

  const summaryByCase = summarizeByCase(rows);
  const resolutionPassSummary = summarizeResolutionPass(
    rows,
    qualityLevels,
    similarityThreshold,
  );
  const minimalResolutionByImage = entries.map((entry) => ({
    image_name: entry.image_name,
    strict_min_resolution_all_qualities: pickMinimalResolution(
      resolutionPassSummary,
      entry.image_name,
      "strict",
    ),
    lenient_min_resolution_any_quality: pickMinimalResolution(
      resolutionPassSummary,
      entry.image_name,
      "lenient",
    ),
  }));

  const result = {
    generated_at: new Date().toISOString(),
    config: {
      endpoint_base: endpointBase,
      chat_endpoint: chatEndpoint,
      model,
      images: imagePaths,
      resolutions: resizeLevels,
      qualities: qualityLevels,
      repeats,
      timeout_ms: timeoutMs,
      similarity_threshold: similarityThreshold,
      baseline_resolution: baselineResolution,
      baseline_quality: baselineQuality,
    },
    baseline_by_image: Object.fromEntries(baselineByImage.entries()),
    minimal_resolution_by_image: minimalResolutionByImage,
    rows,
    summary_by_case: summaryByCase,
    resolution_pass_summary: resolutionPassSummary,
  };

  const rawJsonPath = path.join(runDir, "raw.json");
  const rowsCsvPath = path.join(runDir, "rows.csv");
  const summaryCaseCsvPath = path.join(runDir, "summary-by-case.csv");
  const resolutionPassCsvPath = path.join(runDir, "resolution-pass.csv");

  await writeFile(rawJsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await writeFile(
    rowsCsvPath,
    toCsv(rows, [
      "image_name",
      "resize_px",
      "jpeg_quality",
      "run_no",
      "ok",
      "status",
      "prompt_tokens",
      "latency_ms",
      "payload_bytes",
      "ocr_text",
      "similarity_to_baseline",
      "error_detail",
    ]),
    "utf8",
  );
  await writeFile(
    summaryCaseCsvPath,
    toCsv(summaryByCase, [
      "image_name",
      "resize_px",
      "jpeg_quality",
      "requested_runs",
      "ok_runs",
      "non_empty_ocr_runs",
      "avg_prompt_tokens",
      "avg_latency_ms",
      "avg_similarity_to_baseline",
    ]),
    "utf8",
  );
  await writeFile(
    resolutionPassCsvPath,
    toCsv(
      resolutionPassSummary.map((row) => ({
        image_name: row.image_name,
        resize_px: row.resize_px,
        all_quality_pass: row.all_quality_pass,
        any_quality_pass: row.any_quality_pass,
        q40: row.quality_pass_map.q40 ?? null,
        q50: row.quality_pass_map.q50 ?? null,
        q60: row.quality_pass_map.q60 ?? null,
        q70: row.quality_pass_map.q70 ?? null,
        q80: row.quality_pass_map.q80 ?? null,
      })),
      [
        "image_name",
        "resize_px",
        "all_quality_pass",
        "any_quality_pass",
        "q40",
        "q50",
        "q60",
        "q70",
        "q80",
      ],
    ),
    "utf8",
  );

  console.log(`run_dir=${runDir}`);
  console.log(`raw_json=${rawJsonPath}`);
  console.log(`rows_csv=${rowsCsvPath}`);
  console.log(`summary_case_csv=${summaryCaseCsvPath}`);
  console.log(`resolution_pass_csv=${resolutionPassCsvPath}`);
  console.log(
    "minimal_resolution_by_image=",
    JSON.stringify(minimalResolutionByImage),
  );
}

await main();
