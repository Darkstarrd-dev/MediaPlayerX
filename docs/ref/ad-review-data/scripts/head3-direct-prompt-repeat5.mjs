#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
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

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.floor(n);
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

function imageIdFromName(name) {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(0, dot) : name;
}

async function encodeToJpegDataUrl(absPath, resizePx, quality) {
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
    return "";
  }
  const choices = body.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return "";
  }
  const content = choices[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (part && typeof part.text === "string" ? part.text : ""))
      .join("\n");
  }
  return "";
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
    throw new Error(`read models failed: HTTP ${response.status} ${text.slice(0, 300)}`);
  }
  const body = JSON.parse(text);
  const model = pickVisionModelId(Array.isArray(body?.data) ? body.data : []);
  if (!model) {
    throw new Error("no model found");
  }
  return model;
}

function normalizeGroups(payload) {
  const groups = Array.isArray(payload?.duplicate_groups)
    ? payload.duplicate_groups
    : [];
  return groups.map((group) => {
    const ids = Array.isArray(group?.ids)
      ? group.ids.map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];
    const adOverlayIds = Array.isArray(group?.ad_overlay_ids)
      ? group.ad_overlay_ids.map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];
    const adOverlayTexts = Array.isArray(group?.ad_overlay_texts)
      ? group.ad_overlay_texts
          .map((item) => ({
            image_id: String(item?.image_id ?? "").trim(),
            texts: Array.isArray(item?.texts)
              ? item.texts.map((x) => String(x ?? "").trim()).filter(Boolean)
              : [],
          }))
          .filter((item) => item.image_id)
      : [];
    return {
      ids,
      ad_overlay_ids: adOverlayIds,
      ad_overlay_texts: adOverlayTexts,
    };
  });
}

function normalizeIdToken(token) {
  const text = String(token ?? "").trim();
  if (!text) {
    return null;
  }
  const num = Number(text);
  if (!Number.isFinite(num)) {
    return null;
  }
  return String(Math.floor(num)).padStart(2, "0");
}

function pickLineValue(raw, pattern) {
  const match = raw.match(pattern);
  return match?.[1] ? String(match[1]).trim() : "";
}

function extractIdsFromLine(text) {
  const ids = [];
  const matches = String(text).match(/\d+/g) ?? [];
  for (const item of matches) {
    const normalized = normalizeIdToken(item);
    if (normalized && !ids.includes(normalized)) {
      ids.push(normalized);
    }
  }
  return ids;
}

function parseDirectChineseAnswer(raw) {
  const duplicateLine = pickLineValue(
    raw,
    /属于同一张图的编号是[：:]\s*([^\n。]+)/,
  );
  const overlayLine = pickLineValue(
    raw,
    /加上了广告信息的图的编号是[：:]\s*([^\n。]+)/,
  );
  const overlayTextLine = pickLineValue(raw, /添加的广告信息是[：:]\s*([\s\S]*)/);

  return {
    duplicate_ids: extractIdsFromLine(duplicateLine),
    overlay_ids: extractIdsFromLine(overlayLine),
    overlay_text: overlayTextLine.trim(),
  };
}

function hasExpectedPair(groups, left, right) {
  return groups.some((group) => {
    const idSet = new Set(group.ids);
    return idSet.has(left) && idSet.has(right);
  });
}

function hasExpectedOverlay(groups, expectedId) {
  return groups.some((group) => group.ad_overlay_ids.includes(expectedId));
}

function overlayTextsFor(groups, expectedId) {
  const texts = [];
  for (const group of groups) {
    for (const item of group.ad_overlay_texts) {
      if (item.image_id === expectedId) {
        texts.push(...item.texts);
      }
    }
  }
  return texts;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const endpointBase = normalizeEndpointBase(args.endpoint);
  const endpoint = `${endpointBase}/chat/completions`;
  const apiKey = String(args["api-key"] ?? "lm-studio");
  const model = await resolveModelId(endpointBase, args.model);

  const repeats = Math.max(1, toInt(args.repeats, 5));
  const resizePx = Math.max(64, toInt(args.resize, 640));
  const quality = Math.max(1, Math.min(100, toInt(args.quality, 40)));
  const timeoutMs = Math.max(1000, toInt(args["timeout-ms"], 120000));

  const advancedDir = path.resolve(
    String(args["advanced-dir"] ?? path.join("src", "assets", "test", "advanced")),
  );
  const fileNames = ["01.webp", "02.webp", "03.webp"];
  const images = [];
  for (const fileName of fileNames) {
    const absPath = path.join(advancedDir, fileName);
    images.push({
      file_name: fileName,
      image_id: imageIdFromName(fileName),
      data_url: await encodeToJpegDataUrl(absPath, resizePx, quality),
    });
  }

  const systemPrompt = "你是漫画封面审核助手，请直接回答问题，不要输出无关说明。";

  const userPrompt =
    "以上图片，属于同一张图的编号是？ 属于同一张图的图片中，加上了广告信息的图的编号是？ 添加的广告信息是什么？";

  const results = [];
  for (let runNo = 1; runNo <= repeats; runNo += 1) {
    const content = [{ type: "text", text: userPrompt }];
    for (const image of images) {
      content.push({ type: "text", text: `image_id: ${image.image_id}` });
      content.push({
        type: "image_url",
        image_url: { url: image.data_url },
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let row;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 1200,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content },
          ],
        }),
        signal: controller.signal,
      });
      const text = await response.text();
      let raw = "";
      let parsed = null;
      let groups = [];
      let error = null;
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
          raw = extractMessageContent(body);
          parsed = parseJsonLoose(raw);
          if (!parsed) {
            error = `parse json failed: ${String(raw).slice(0, 300)}`;
          } else {
            groups = normalizeGroups(parsed);
          }
        }
      }

      const direct = parseDirectChineseAnswer(raw);
      const hasDupByDirect =
        direct.duplicate_ids.includes("01") && direct.duplicate_ids.includes("02");
      const hasOverlayByDirect = direct.overlay_ids.includes("01");
      const hasTextByDirect = /KOKOKORO\s*个人汉化/i.test(direct.overlay_text);

      const hasDupByJson = hasExpectedPair(groups, "01", "02");
      const hasOverlayByJson = hasExpectedOverlay(groups, "01");
      const textsByJson = overlayTextsFor(groups, "01");
      const hasTextByJson = textsByJson.some((item) => /KOKOKORO\s*个人汉化/i.test(item));

      const hasDup = hasDupByDirect || hasDupByJson;
      const hasOverlay = hasOverlayByDirect || hasOverlayByJson;
      const hasExpectedText = hasTextByDirect || hasTextByJson;
      if (!parsed && (hasDupByDirect || hasOverlayByDirect || hasTextByDirect)) {
        error = null;
      }
      row = {
        run_no: runNo,
        ok: response.ok,
        http_status: response.status,
        has_expected_duplicate_01_02: hasDup,
        has_expected_overlay_01: hasOverlay,
        has_expected_overlay_text: hasExpectedText,
        overlay_texts_01: [direct.overlay_text, ...textsByJson].filter(Boolean),
        direct_parse: direct,
        error,
        raw,
        parsed,
      };
      console.log(
        `[run ${runNo}/${repeats}] status=${response.status} dup=${hasDup ? "yes" : "no"} overlay=${hasOverlay ? "yes" : "no"} text=${hasExpectedText ? "yes" : "no"}`,
      );
    } finally {
      clearTimeout(timer);
    }
    results.push(row);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    config: {
      endpoint,
      model,
      repeats,
      resize_px: resizePx,
      jpeg_quality: quality,
      image_ids: images.map((item) => item.image_id),
    },
    metrics: {
      duplicate_01_02_hit_rate:
        results.filter((row) => row.has_expected_duplicate_01_02).length /
        results.length,
      overlay_01_hit_rate:
        results.filter((row) => row.has_expected_overlay_01).length /
        results.length,
      overlay_text_hit_rate:
        results.filter((row) => row.has_expected_overlay_text).length /
        results.length,
    },
    rows: results,
  };

  const outRoot = path.resolve(
    String(
      args["out-dir"] ??
        path.join("docs", "ref", "ad-review-data", "results", "unified-review-head-tail-test"),
    ),
  );
  await mkdir(outRoot, { recursive: true });
  const runDir = path.join(outRoot, `run-${nowTag()}`);
  await mkdir(runDir, { recursive: true });
  const outPath = path.join(runDir, "head3-direct-prompt-repeat5.json");
  await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`run_dir=${runDir}`);
  console.log(`head3_direct=${outPath}`);
}

await main();
