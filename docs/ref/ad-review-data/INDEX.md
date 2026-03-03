# Ad Review Data 索引与阶段结论

## 1. 目录说明

本目录用于沉淀本轮 ad/cover 审核相关的脚本、实验输出和结论，供后续新对话直接续接。

```
docs/ref/ad-review-data/
  INDEX.md
  START_HERE.md
  REMOTE_SYNC_SAFE_PROCEDURE.md
  RECOVERED_PROGRESS_AND_REIMPLEMENTATION_GUIDE.md
  SNAPSHOT-docs-01-README.md
  SNAPSHOT-docs-02-DOCS_INDEX.md
  scripts/
    vision-token-matrix.mjs
    vision-ocr-matrix.mjs
    unified-review-batch-test.mjs
    unified-review-head-tail-test.mjs
  results/
    vision-token-matrix/
    vision-ocr-matrix/
    unified-review-batch-test/
    unified-review-batch-test-inspect/
    unified-review-head-tail-test/
```

## 2. 脚本索引

- `scripts/vision-token-matrix.mjs`
  - 目的：测试单图在不同分辨率/画质下的 `prompt_tokens` 与时延变化。
  - 核心维度：图片 x 分辨率 x JPEG质量。
  - 产出：`raw.json`、`rows.csv`、`summary-by-case.csv`、`summary-by-image.csv`。

- `scripts/vision-ocr-matrix.mjs`
  - 目的：测试 OCR 任务在不同分辨率/画质下的可读性门槛。
  - 核心方法：以 `1024 + q80` 作为 baseline，计算文本相似度并估算最小可用分辨率。
  - 产出：`raw.json`、`rows.csv`、`summary-by-case.csv`、`resolution-pass.csv`。

- `scripts/unified-review-batch-test.mjs`
  - 目的：测试“统一多任务提示词”下，`单次多张` vs `单张逐次` 的效率与稳定性。
  - 数据集：`head6`、`tail10`。
  - 产出：`raw.json`、`summary.csv`、`compare.csv`、`detail.csv`。

- `scripts/unified-review-head-tail-test.mjs`
  - 目的：测试“头尾分策略提示词”与“尾部 hash 剔除后缩减发送量”策略。
  - 数据流：head 与 tail 走不同 prompt，最终合并为 `ad_delete_ids` 与 `nonbody_hide_ids`。
  - 产出：`raw.json`、`summary.csv`、`detail.csv`。

## 3. 结果文件索引（关键批次）

### 3.1 Token/时延矩阵

- `results/vision-token-matrix/run-2026-03-03T12-38-11-781Z/raw.json`
- `results/vision-token-matrix/run-2026-03-03T12-38-11-781Z/summary-by-case.csv`
- `results/vision-token-matrix/run-2026-03-03T12-38-11-781Z/summary-by-image.csv`

### 3.2 OCR矩阵

- `results/vision-ocr-matrix/run-2026-03-03T12-51-14-850Z/raw.json`
- `results/vision-ocr-matrix/run-2026-03-03T12-51-14-850Z/summary-by-case.csv`
- `results/vision-ocr-matrix/run-2026-03-03T12-51-14-850Z/resolution-pass.csv`

### 3.3 统一多任务（batch vs single）

- `results/unified-review-batch-test/run-2026-03-03T13-25-33-985Z/raw.json`
- `results/unified-review-batch-test/run-2026-03-03T13-25-33-985Z/summary.csv`
- `results/unified-review-batch-test/run-2026-03-03T13-25-33-985Z/compare.csv`
- `results/unified-review-batch-test-inspect/run-2026-03-03T13-24-19-137Z/raw.json`

### 3.4 头尾分策略 + 直接提示词验证

- `results/unified-review-head-tail-test/run-2026-03-03T14-01-55-370Z/raw.json`
- `results/unified-review-head-tail-test/run-2026-03-03T14-01-55-370Z/summary.csv`
- `results/unified-review-head-tail-test/run-2026-03-03T14-01-55-370Z/detail.csv`
- `results/unified-review-head-tail-test/run-2026-03-03T14-01-55-370Z/head3-direct-prompt-repeat5.json`
- `results/unified-review-head-tail-test/run-2026-03-03T14-01-55-370Z/head3-overlay-quality.json`

### 3.5 恢复上下文与纠偏文档

- `RECOVERED_PROGRESS_AND_REIMPLEMENTATION_GUIDE.md`
  - 用途：汇总“丢失后找回”的对话信息、需求补充、方案纠偏与重新实施路径。
  - 注意：其中明确说明 `docs/31-ad-review-performance-mode-implementation-plan-v1.md` 的完成勾选状态不可信，仅可作为历史草案参考。

### 3.6 docs 入口快照（用于离仓备份）

- `SNAPSHOT-docs-01-README.md`
  - 来源：`docs/01-README.md` 的快照副本。
- `SNAPSHOT-docs-02-DOCS_INDEX.md`
  - 来源：`docs/02-DOCS_INDEX.md` 的快照副本。
- `START_HERE.md`
  - 用途：恢复后最短启动路径与复现实验命令。
- `REMOTE_SYNC_SAFE_PROCEDURE.md`
  - 用途：在离仓备份后安全对齐远程工作区的命令流程。

## 4. 已知且已验证结论

### 4.1 图像格式与token

- LM Studio 当前链路对 `data:image/webp;base64,...` 不稳定/不可用（早期测试出现 HTTP 400），生产建议统一转 JPEG。
- 在视觉模型侧，token 主要受分辨率影响；JPEG质量（40~80）对 `prompt_tokens` 基本不变。

### 4.2 分辨率对成本与时延

基于 `vision-token-matrix`：

- 分辨率上升会显著增加 token 与时延。
- 画质提高主要增加 payload 字节，不显著改变视觉 token 档位。

### 4.3 OCR最小可用分辨率（3图样本）

基于 `vision-ocr-matrix`（阈值 similarity >= 0.9）：

- `01.webp`：512 可用。
- `02.jpg`：密集小字，严格口径下需 1024（且有一次服务波动）。
- `03.webp`：768 可用。
- 统一保守建议：OCR任务若追求稳定，不低于 768，复杂文本建议 1024。

### 4.4 单次多张 vs 单张逐次

基于 `unified-review-batch-test`：

- `head6`：multi 相比 single 约 `1.893x` 更快，token 约降低 `39.93%`。
- `tail10`：multi 相比 single 约 `1.397x` 更快，token 约降低 `45.82%`。
- 结论：批量发送在性能上显著优于逐张发送。

### 4.5 提示词策略影响显著

- 统一“大而全”提示词在“重复封面+覆盖广告”任务上不稳定。
- 精简到“只问同图/覆盖广告/覆盖文本”的提示词后，`01/02/03` 在 640 q40 下 5/5 稳定命中：
  - duplicate: `01,02`
  - ad_overlay: `01`
  - overlay_text: `KOKOKORO个人汉化`
- 结论：应拆分任务焦点，避免一个提示词同时背过多目标。

### 4.6 头尾分策略与hash联动

基于 `unified-review-head-tail-test`：

- 尾部可先按 hash 剔除已知广告样本，再将 `tail_base_n` 按“剔除数”减少 LLM 发送量。
- 在当前样本中：`tail_base_n=10`，hash命中4张 `_zzz`，LLM实际发送6张（29/28/27/26/25/24）。
- 性能上仍保持 multi 优势：约 `1.329x` 更快，token 约降低 `35.39%`。

### 4.7 实施状态纠偏（重要）

- 之前在未同步远程最新进度的情况下，产生过“本地看似已完成”的实施记录。
- `docs/31-ad-review-performance-mode-implementation-plan-v1.md` 中的完成勾选不可直接视为事实完成。
- 重新实施时应以本目录实验结论 + `RECOVERED_PROGRESS_AND_REIMPLEMENTATION_GUIDE.md` 的纠偏口径为准，先拉取最新远程后再执行。

## 5. 当前推荐落地方向

- 继续采用“单次多张”作为主流程。
- 提示词分流：
  - head prompt：主做同图聚类 + 覆盖广告识别 + 覆盖文本提取。
  - tail prompt：主做广告/空白/非正文识别。
- 输出统一用 `image_id`，便于前后端合并。
- 合并规则：
  - `ad_delete_ids = head.ad_overlay_ids ∪ tail.ad_ids ∪ hash_hit_ad_ids`
  - `nonbody_hide_ids = (head.non_body_ids ∪ tail.non_body_ids) - ad_delete_ids`

## 6. 新对话快速接续指引

在新对话中可直接说明：

1. 先阅读 `docs/ref/ad-review-data/INDEX.md`。
2. 再阅读 `docs/ref/ad-review-data/RECOVERED_PROGRESS_AND_REIMPLEMENTATION_GUIDE.md`（包含需求补充与纠偏）。
3. 先看最终批次结果：
   - `results/unified-review-head-tail-test/run-2026-03-03T14-01-55-370Z/raw.json`
   - `results/unified-review-head-tail-test/run-2026-03-03T14-01-55-370Z/head3-direct-prompt-repeat5.json`
4. 若继续实验，优先复用这4个脚本：
   - `scripts/unified-review-head-tail-test.mjs`
   - `scripts/unified-review-batch-test.mjs`
   - `scripts/vision-ocr-matrix.mjs`
   - `scripts/vision-token-matrix.mjs`

## 7. 最新实施状态（2026-03-04）

- 重实施计划 `docs/31-ad-review-performance-mode-reimplementation-phased-plan-v1.md` 已完成 Phase A-E。
- 当前实现口径：
  - `normal` 保持旧行为；
  - `performance` 使用 head/tail 差异提示词、`image_id` 对齐、尾部配额规则与合并公式。
- 关键回归与门禁结果：
  - `npm run format:check`、`npm run lint`、`npm run test`、`npm run build` 全部通过。
  - 全量测试摘要：`141 passed | 1 skipped` 文件、`829 passed | 1 skipped` 用例。
- 关键验证测试文件：
  - `src/features/app/useManageAdReviewActions.test.ts`
  - `src/components/metadata/MetadataAdReviewSection.test.tsx`
  - `src/features/app/workspaceAdReviewPageDerivations.test.ts`
  - `src/__tests__/App.settings.test.tsx`
