# START HERE（备份/恢复后从这里开始）

## 1) 先读这两个文件

1. `docs/ref/ad-review-data/INDEX.md`
2. `docs/ref/ad-review-data/RECOVERED_PROGRESS_AND_REIMPLEMENTATION_GUIDE.md`

## 2) 当前已知关键结论（超短版）

- `normal` 模式必须完全保持旧行为。
- `performance` 模式必须保留头尾差异提示词：
  - head: 同图聚类 + 覆盖广告 + 覆盖文本
  - tail: 广告/空白/非正文
- 尾部发送量规则：`tail_llm_n = tail_base_n - tail_hash_hit_count`，不向前补位。
- 合并动作：
  - `ad_delete_ids = head.ad_overlay_ids ∪ tail.ad_ids ∪ hash_hit_ad_ids`
  - `nonbody_hide_ids = (head.non_body_ids ∪ tail.non_body_ids) - ad_delete_ids`

## 3) 结果优先阅读顺序

1. `results/unified-review-head-tail-test/run-2026-03-03T14-01-55-370Z/raw.json`
2. `results/unified-review-head-tail-test/run-2026-03-03T14-01-55-370Z/head3-direct-prompt-repeat5.json`
3. `results/unified-review-batch-test/run-2026-03-03T13-25-33-985Z/summary.csv`
4. `results/vision-ocr-matrix/run-2026-03-03T12-51-14-850Z/raw.json`

## 4) 快速复现实验命令

```bash
node scripts/vision-token-matrix.mjs --images-dir src/assets/test --resolutions 256,384,512,768,1024 --qualities 40,50,60,70,80 --repeats 1 --out-dir docs/perf/vision-token-matrix
node scripts/vision-ocr-matrix.mjs --images src/assets/test/01.webp,src/assets/test/02.jpg,src/assets/test/03.webp --resolutions 256,384,512,768,1024 --qualities 40,50,60,70,80 --repeats 1 --similarity-threshold 0.9 --out-dir docs/perf/vision-ocr-matrix
node scripts/unified-review-batch-test.mjs --repeats 3 --out-dir docs/perf/unified-review-batch-test
node scripts/unified-review-head-tail-test.mjs --repeats 3 --out-dir docs/perf/unified-review-head-tail-test
```

## 5) 备份到项目目录外（建议）

- 直接复制整个 `docs/ref/ad-review-data/` 到外部安全路径。
- 外部备份至少保留：`INDEX.md`、`RECOVERED_PROGRESS_AND_REIMPLEMENTATION_GUIDE.md`、`scripts/`、`results/`。
