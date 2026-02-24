import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const INPUT_DIR = 'Z:/PureBenchFolder/zip/test';
const OUTPUT_ROOT = path.resolve('bench-user-data/sharp-thumb-bench');
const BASE_WIDTH = 512;
const BASE_QUALITY = 50;
const WIDTH_STEP_RATIO = 0.1;
const QUALITY_STEP = 5;
const LEVELS = 5;
const ROUNDS = 3;

sharp.cache(false);

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function toMs(startNs, endNs) {
  return Number(endNs - startNs) / 1e6;
}

function makeSeries(base, step, levels, isRatio = false) {
  const arr = [];
  for (let i = -levels; i <= levels; i += 1) {
    if (isRatio) {
      arr.push(Math.round(base * (1 + i * step)));
    } else {
      arr.push(base + i * step);
    }
  }
  return arr;
}

async function listInputFiles(inputDir) {
  const names = await fs.readdir(inputDir);
  return names
    .filter((name) => name.toLowerCase().endsWith('.webp'))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => path.join(inputDir, name));
}

async function runOneBatch({ files, width, quality, outputDir }) {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });

  const start = process.hrtime.bigint();
  await Promise.all(
    files.map(async (filePath) => {
      const outPath = path.join(outputDir, path.basename(filePath));
      await sharp(filePath)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality })
        .toFile(outPath);
    })
  );
  const end = process.hrtime.bigint();

  return toMs(start, end);
}

async function benchmarkSeries({ files, type, seriesValues }) {
  const rows = [];

  for (const value of seriesValues) {
    const width = type === 'width' ? value : BASE_WIDTH;
    const quality = type === 'quality' ? value : BASE_QUALITY;
    const runTimes = [];

    const warmupDir = path.join(OUTPUT_ROOT, `${type}-warmup-w${width}-q${quality}`);
    await runOneBatch({ files, width, quality, outputDir: warmupDir });

    for (let round = 1; round <= ROUNDS; round += 1) {
      const outDir = path.join(OUTPUT_ROOT, `${type}-w${width}-q${quality}-r${round}`);
      const elapsedMs = await runOneBatch({ files, width, quality, outputDir: outDir });
      runTimes.push(elapsedMs);
    }

    const elapsedMsMedian = median(runTimes);
    const imgPerSec = files.length / (elapsedMsMedian / 1000);

    rows.push({
      type,
      width,
      quality,
      total_images: files.length,
      elapsed_ms_median: Number(elapsedMsMedian.toFixed(2)),
      img_per_sec: Number(imgPerSec.toFixed(2)),
      runs_ms: runTimes.map((v) => Number(v.toFixed(2))),
    });

    console.log(
      `[done] ${type}=${value} => width=${width}, quality=${quality}, median=${elapsedMsMedian.toFixed(2)}ms`
    );
  }

  return rows;
}

function toMarkdownTable(rows) {
  const header =
    '| type | width | quality | total_images | elapsed_ms_median | img_per_sec | runs_ms |\n' +
    '|---|---:|---:|---:|---:|---:|---|';
  const body = rows
    .map(
      (r) =>
        `| ${r.type} | ${r.width} | ${r.quality} | ${r.total_images} | ${r.elapsed_ms_median} | ${r.img_per_sec} | [${r.runs_ms.join(', ')}] |`
    )
    .join('\n');
  return `${header}\n${body}`;
}

async function main() {
  const files = await listInputFiles(INPUT_DIR);
  if (files.length === 0) {
    throw new Error(`No .webp files found in ${INPUT_DIR}`);
  }

  await fs.mkdir(OUTPUT_ROOT, { recursive: true });

  const widthValues = makeSeries(BASE_WIDTH, WIDTH_STEP_RATIO, LEVELS, true);
  const qualityValues = makeSeries(BASE_QUALITY, QUALITY_STEP, LEVELS, false);

  const widthRows = await benchmarkSeries({
    files,
    type: 'width',
    seriesValues: widthValues,
  });

  const qualityRows = await benchmarkSeries({
    files,
    type: 'quality',
    seriesValues: qualityValues,
  });

  const result = {
    meta: {
      input_dir: INPUT_DIR,
      output_root: OUTPUT_ROOT,
      image_count: files.length,
      base_width: BASE_WIDTH,
      base_quality: BASE_QUALITY,
      width_values: widthValues,
      quality_values: qualityValues,
      width_step: '10%',
      quality_step: 5,
      rounds: ROUNDS,
      measure: 'median of elapsed ms across rounds',
    },
    width_table: widthRows,
    quality_table: qualityRows,
  };

  const jsonPath = path.join(OUTPUT_ROOT, 'results.json');
  const mdPath = path.join(OUTPUT_ROOT, 'results.md');
  await fs.writeFile(jsonPath, JSON.stringify(result, null, 2), 'utf8');

  const md = [
    '# Sharp Thumbnail Benchmark',
    '',
    `- input_dir: ${INPUT_DIR}`,
    `- image_count: ${files.length}`,
    `- width_series(10% step, levels ±5): [${widthValues.join(', ')}]`,
    `- quality_series(step 5, levels ±5): [${qualityValues.join(', ')}]`,
    `- rounds_per_setting: ${ROUNDS} (median)`,
    '',
    '## Width Comparison (quality=50)',
    '',
    toMarkdownTable(widthRows),
    '',
    '## Quality Comparison (width=512)',
    '',
    toMarkdownTable(qualityRows),
    '',
  ].join('\n');

  await fs.writeFile(mdPath, md, 'utf8');

  console.log('\nBenchmark completed.');
  console.log(`JSON: ${jsonPath}`);
  console.log(`Markdown: ${mdPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
