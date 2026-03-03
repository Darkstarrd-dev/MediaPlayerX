#!/usr/bin/env node

import { performance } from "node:perf_hooks";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
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

function summarizeRows(rows) {
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
      payload_bytes: [],
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
    if (typeof row.payload_bytes === "number") {
      bucket.payload_bytes.push(row.payload_bytes);
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
      avg_prompt_tokens: toFixedNumber(mean(bucket.prompt_tokens), 2),
      avg_latency_ms: toFixedNumber(mean(bucket.latency_ms), 2),
      avg_payload_bytes: toFixedNumber(mean(bucket.payload_bytes), 0),
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

function summarizeByImage(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const bucket = grouped.get(row.image_name) ?? {
      image_name: row.image_name,
      prompt_tokens: [],
      latency_ms: [],
      payload_bytes: [],
      ok_runs: 0,
      requested_runs: 0,
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
    if (typeof row.payload_bytes === "number") {
      bucket.payload_bytes.push(row.payload_bytes);
    }
    grouped.set(row.image_name, bucket);
  }

  return Array.from(grouped.values())
    .map((bucket) => ({
      image_name: bucket.image_name,
      requested_runs: bucket.requested_runs,
      ok_runs: bucket.ok_runs,
      min_prompt_tokens:
        bucket.prompt_tokens.length > 0
          ? Math.min(...bucket.prompt_tokens)
          : null,
      max_prompt_tokens:
        bucket.prompt_tokens.length > 0
          ? Math.max(...bucket.prompt_tokens)
          : null,
      min_latency_ms:
        bucket.latency_ms.length > 0
          ? toFixedNumber(Math.min(...bucket.latency_ms), 2)
          : null,
      max_latency_ms:
        bucket.latency_ms.length > 0
          ? toFixedNumber(Math.max(...bucket.latency_ms), 2)
          : null,
      min_payload_bytes:
        bucket.payload_bytes.length > 0
          ? Math.min(...bucket.payload_bytes)
          : null,
      max_payload_bytes:
        bucket.payload_bytes.length > 0
          ? Math.max(...bucket.payload_bytes)
          : null,
    }))
    .sort((left, right) => left.image_name.localeCompare(right.image_name));
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
      `读取模型列表失败: HTTP ${response.status} - ${text.slice(0, 400)}`,
    );
  }

  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`模型列表不是合法 JSON: ${text.slice(0, 400)}`);
  }

  const modelId = resolveModelFromList(
    Array.isArray(body?.data) ? body.data : [],
  );
  if (!modelId) {
    throw new Error("模型列表为空，无法自动选择模型");
  }
  return modelId;
}

function normalizeEndpointBase(rawEndpoint) {
  const trimmed = String(rawEndpoint ?? "").trim();
  if (!trimmed) {
    return "http://127.0.0.1:1234/v1";
  }
  return trimmed.replace(/\/+$/, "");
}

async function loadImageEntries(imagesDir) {
  const entries = await readdir(imagesDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(webp|jpg|jpeg|png)$/i.test(name))
    .sort((left, right) =>
      left.localeCompare(right, undefined, { numeric: true }),
    );

  if (files.length === 0) {
    throw new Error(`目录中没有可测试图片: ${imagesDir}`);
  }

  return Promise.all(
    files.map(async (fileName) => {
      const absPath = path.join(imagesDir, fileName);
      const sourceBytes = await readFile(absPath);
      const metadata = await sharp(sourceBytes, { failOn: "none" }).metadata();
      return {
        file_name: fileName,
        file_path: absPath,
        source_bytes: sourceBytes.length,
        source_width: metadata.width ?? null,
        source_height: metadata.height ?? null,
        source_format: metadata.format ?? null,
        source_buffer: sourceBytes,
      };
    }),
  );
}

async function buildVariant(entry, resizePx, quality) {
  const startedAt = performance.now();
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
  const encodeMs = performance.now() - startedAt;

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
        content: "You are a strict JSON API. Return JSON only.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: '仅返回 JSON: {"ok": true, "color": "..."}',
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
    max_tokens: 32,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const projectRoot = process.cwd();
  const imagesDir = path.resolve(
    String(args["images-dir"] ?? path.join("src", "assets", "test")),
  );
  const outRoot = path.resolve(
    String(args["out-dir"] ?? path.join("docs", "perf", "vision-token-matrix")),
  );

  const endpointBase = normalizeEndpointBase(args.endpoint);
  const chatEndpoint = `${endpointBase}/chat/completions`;
  const apiKey = String(args["api-key"] ?? "lm-studio");
  const resizeLevels = toIntList(args.resolutions, [256, 384, 512, 768, 1024]);
  const qualityLevels = toIntList(args.qualities, [40, 50, 60, 70, 80]);
  const repeats = Math.max(1, Number(args.repeats ?? 1));
  const timeoutMs = Math.max(
    1_000,
    Math.floor(Number(args["timeout-ms"] ?? 120_000)),
  );
  const sleepMs = Math.max(0, Math.floor(Number(args["sleep-ms"] ?? 0)));
  const model = await resolveModelId(endpointBase, args.model);

  await mkdir(outRoot, { recursive: true });
  const runTag = nowTag();
  const runDir = path.join(outRoot, `run-${runTag}`);
  await mkdir(runDir, { recursive: true });

  const imageEntries = await loadImageEntries(imagesDir);

  console.log(`project_root=${projectRoot}`);
  console.log(`images_dir=${imagesDir}`);
  console.log(`chat_endpoint=${chatEndpoint}`);
  console.log(`model=${model}`);
  console.log(
    `images=${imageEntries.length}, resolutions=${resizeLevels.join("/")}, qualities=${qualityLevels.join("/")}, repeats=${repeats}`,
  );

  const rows = [];
  const totalCases =
    imageEntries.length * resizeLevels.length * qualityLevels.length * repeats;
  let caseIndex = 0;

  for (const entry of imageEntries) {
    for (const resizePx of resizeLevels) {
      for (const quality of qualityLevels) {
        for (let runNo = 1; runNo <= repeats; runNo += 1) {
          caseIndex += 1;
          const variant = await buildVariant(entry, resizePx, quality);
          const dataUrl = `data:image/jpeg;base64,${variant.jpeg_buffer.toString("base64")}`;
          const payload = buildPayload(model, dataUrl);

          const abortController = new AbortController();
          const timeoutId = setTimeout(() => {
            abortController.abort(
              new Error(`request timeout after ${timeoutMs}ms`),
            );
          }, timeoutMs);

          const requestStartedAt = performance.now();
          let responseText = "";
          let status = null;
          let usage = null;
          let content = null;
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
                errorDetail = `响应非 JSON: ${responseText.slice(0, 300)}`;
              }

              if (body) {
                usage = body.usage ?? null;
                content = body.choices?.[0]?.message?.content ?? null;
                ok = true;
              }
            }
          } catch (error) {
            errorDetail =
              error instanceof Error ? error.message : String(error);
          } finally {
            clearTimeout(timeoutId);
          }

          const latencyMs = performance.now() - requestStartedAt;

          const row = {
            image_name: entry.file_name,
            image_path: entry.file_path,
            source_format: entry.source_format,
            source_width: entry.source_width,
            source_height: entry.source_height,
            source_bytes: entry.source_bytes,
            resize_px: resizePx,
            jpeg_quality: quality,
            run_no: runNo,
            ok,
            status,
            encode_ms: toFixedNumber(variant.encode_ms, 2),
            latency_ms: toFixedNumber(latencyMs, 2),
            payload_bytes: Buffer.byteLength(dataUrl),
            jpeg_width: variant.jpeg_width,
            jpeg_height: variant.jpeg_height,
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
            reply_content: content,
            error_detail: errorDetail,
          };
          rows.push(row);

          const progress = `[${String(caseIndex).padStart(3, " ")}/${totalCases}]`;
          const tokenText = row.prompt_tokens ?? "-";
          const latencyText = row.latency_ms ?? "-";
          const resultText = row.ok ? "ok" : "fail";
          console.log(
            `${progress} ${resultText} image=${entry.file_name} resize=${resizePx} q=${quality} run=${runNo} prompt_tokens=${tokenText} latency_ms=${latencyText}`,
          );

          if (sleepMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, sleepMs));
          }
        }
      }
    }
  }

  const summaryByCase = summarizeRows(rows);
  const summaryByImage = summarizeByImage(rows);
  const failedRows = rows.filter((row) => !row.ok);

  const result = {
    generated_at: new Date().toISOString(),
    config: {
      images_dir: imagesDir,
      endpoint_base: endpointBase,
      chat_endpoint: chatEndpoint,
      model,
      resolutions: resizeLevels,
      qualities: qualityLevels,
      repeats,
      timeout_ms: timeoutMs,
      sleep_ms: sleepMs,
    },
    totals: {
      total_cases: totalCases,
      success_cases: rows.length - failedRows.length,
      failed_cases: failedRows.length,
    },
    rows,
    summary_by_case: summaryByCase,
    summary_by_image: summaryByImage,
  };

  const rawJsonPath = path.join(runDir, "raw.json");
  const rowsCsvPath = path.join(runDir, "rows.csv");
  const summaryCaseCsvPath = path.join(runDir, "summary-by-case.csv");
  const summaryImageCsvPath = path.join(runDir, "summary-by-image.csv");

  await writeFile(rawJsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  await writeFile(
    rowsCsvPath,
    toCsv(rows, [
      "image_name",
      "source_format",
      "source_width",
      "source_height",
      "source_bytes",
      "resize_px",
      "jpeg_quality",
      "run_no",
      "ok",
      "status",
      "encode_ms",
      "latency_ms",
      "payload_bytes",
      "jpeg_width",
      "jpeg_height",
      "prompt_tokens",
      "completion_tokens",
      "total_tokens",
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
      "avg_prompt_tokens",
      "avg_latency_ms",
      "avg_payload_bytes",
    ]),
    "utf8",
  );
  await writeFile(
    summaryImageCsvPath,
    toCsv(summaryByImage, [
      "image_name",
      "requested_runs",
      "ok_runs",
      "min_prompt_tokens",
      "max_prompt_tokens",
      "min_latency_ms",
      "max_latency_ms",
      "min_payload_bytes",
      "max_payload_bytes",
    ]),
    "utf8",
  );

  console.log(`run_dir=${runDir}`);
  console.log(`raw_json=${rawJsonPath}`);
  console.log(`rows_csv=${rowsCsvPath}`);
  console.log(`summary_case_csv=${summaryCaseCsvPath}`);
  console.log(`summary_image_csv=${summaryImageCsvPath}`);

  if (failedRows.length > 0) {
    console.log(`failed_cases=${failedRows.length}`);
  }
}

await main();
