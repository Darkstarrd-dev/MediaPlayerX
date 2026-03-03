# Ad Review 恢复进度与重实施指引（2026-03-04）

## 1. 目的

- 记录“进度丢失后找回”的关键信息，避免再次丢上下文。
- 明确哪些结论已实测验证，哪些实施状态不可信。
- 为拉取最新远程后的重新实施提供可直接执行的基线。

## 2. 信息来源与可信度

来源包含三部分：

1. 当前仓库中的测试脚本与结果（高可信，已落文件）。
2. 本轮对话中已执行并落地的实验记录（高可信，可追溯到 `docs/ref/ad-review-data/results/*`）。
3. “找回对话”文本（中可信，仅作线索，不直接等同代码已实现）。

结论：

- 以 **结果文件与脚本** 为事实依据。
- 以“找回对话”补齐需求和决策背景。
- 不以旧实施勾选状态直接判定完成。

## 3. 需求恢复（以本次确认为准）

### 3.1 审核模式目标

- 现有 `ad` 与 `cover` 流程要合并到一次判定的能力演进路径。
- 先实验，再决定落地，不先改生产路径。

### 3.2 执行模式约束

- `normal`：100% 保持原有行为，不改现有流程。
- `performance`：仅在该模式开启新策略，不影响 `normal`。

### 3.3 头尾差异策略（关键）

- `head` 提示词：聚焦同图聚类 + 覆盖广告识别 + 覆盖文本提取。
- `tail` 提示词：聚焦广告/空白/非正文识别。
- 全流程统一使用 `image_id`，不要依赖位置序号。
- `tail` 数量规则：`tail_base_n - tail_hash_hit_count`，且不向前补位。

### 3.4 UI/交互需求（待重实施）

1. 设置面板增加“视频设置”分页，将离线字幕与字幕清洗迁移过去。
2. 当前视频设置分页更名为“AI辅助设置”，保留广告审核视觉模型配置，并新增执行模式下拉（`normal`/`performance`）。
3. `performance` 下：
   - 不显示 AD/C 切换；
   - H/A 不可切，默认 H；
   - 弹层移除 `tailStopClean`，只保留前三项控制。
4. 结果展示：除“图包之间换行”外，再增加“包内非正文组与疑似广告组之间换行”。

## 4. 已验证实验结论（可复核）

### 4.1 图像格式与 token

- LM Studio 当前链路对 `data:image/webp;base64` 不稳定，建议统一 JPEG。
- token 主要由分辨率决定，JPEG 质量对 token 基本无影响（对 payload/时延有次要影响）。

证据：

- `results/vision-token-matrix/run-2026-03-03T12-38-11-781Z/summary-by-case.csv`

### 4.2 OCR 分辨率门槛

- `01.webp` 最小可用约 512。
- `03.webp` 最小可用约 768。
- `02.jpg` 密集小字建议 1024。

证据：

- `results/vision-ocr-matrix/run-2026-03-03T12-51-14-850Z/raw.json`

### 4.3 批量发送收益

- `single request with many images` 明显优于逐张发送。

证据（关键批次）：

- `results/unified-review-batch-test/run-2026-03-03T13-25-33-985Z/summary.csv`

### 4.4 提示词聚焦的重要性

- 大而全 schema 提示词在“重复封面 + 覆盖广告”稳定性差。
- 简化为“同图编号 + 覆盖广告编号 + 覆盖文本”后，`01/02/03` 在 640 q40 达到 5/5 稳定命中。

证据：

- `results/unified-review-head-tail-test/run-2026-03-03T14-01-55-370Z/head3-direct-prompt-repeat5.json`
- `results/unified-review-head-tail-test/run-2026-03-03T14-01-55-370Z/head3-overlay-quality.json`

## 5. 方案纠偏（必须阅读）

### 5.1 旧实施文档问题

- `docs/31-ad-review-performance-mode-implementation-plan-v1.md` 的“已完成勾选”来自未同步远程最新进度的上下文，**不可直接采信**。
- 该文档可作为历史草案参考，但不能作为“已交付事实”。

### 5.2 缺失点

- 旧方案对“头尾差异提示词”强调不足，导致核心策略在实施层容易退化成统一大提示词。
- 这会直接影响“重复封面 + 覆盖广告”稳定识别。

### 5.3 正确基线（重实施必须保留）

- `normal` 不动；`performance` 单独分支。
- head/tail 分流提示词必须显式存在，不可被统一模板覆盖。
- 合并规则固定：
  - `ad_delete_ids = head.ad_overlay_ids ∪ tail.ad_ids ∪ hash_hit_ad_ids`
  - `nonbody_hide_ids = (head.non_body_ids ∪ tail.non_body_ids) - ad_delete_ids`

## 6. 重实施建议 Phase（拉最新后执行）

### Phase A：远程对齐与基线校准

- 拉取并对齐远程分支后，先确认以下文件的真实状态：
  - `src/contracts/settings.ts`
  - `src/components/settings/*`
  - `electron/services/file-system-read/manageAdReviewService.ts`
  - `src/features/app/useManageAdReviewActions.ts`

### Phase B：先恢复实验能力

- 保证以下脚本在最新分支可运行：
  - `scripts/unified-review-head-tail-test.mjs`
  - `scripts/unified-review-batch-test.mjs`
  - `scripts/vision-ocr-matrix.mjs`
  - `scripts/vision-token-matrix.mjs`

### Phase C：再做产品改造

- 按“normal 不变、performance 新分支”落地设置、控件、执行逻辑和结果分组。
- 每完成一段都做最小回归，避免一次性大改。

### Phase D：结果归档与文档回填

- 新一轮实测结果继续沉淀到 `docs/ref/ad-review-data/results/`。
- 在本文件追加“重实施批次记录”，不要覆盖历史数据。

## 7. 快速复现实验命令

```bash
node scripts/vision-token-matrix.mjs --images-dir src/assets/test --resolutions 256,384,512,768,1024 --qualities 40,50,60,70,80 --repeats 1 --out-dir docs/perf/vision-token-matrix
node scripts/vision-ocr-matrix.mjs --images src/assets/test/01.webp,src/assets/test/02.jpg,src/assets/test/03.webp --resolutions 256,384,512,768,1024 --qualities 40,50,60,70,80 --repeats 1 --similarity-threshold 0.9 --out-dir docs/perf/vision-ocr-matrix
node scripts/unified-review-batch-test.mjs --repeats 3 --out-dir docs/perf/unified-review-batch-test
node scripts/unified-review-head-tail-test.mjs --repeats 3 --out-dir docs/perf/unified-review-head-tail-test
```

## 8. 本文件维护约定

- 若后续再次发生“本地已做但未同步远程”的情况，必须先在本文件追加“状态纠偏记录”，再继续编码。
- 新结论必须附至少一个可追溯文件路径（脚本或结果）。

## 9. 重实施批次记录（2026-03-04）

### 9.1 Phase D（前端门控与分组）

- `performance` 门控已落地：
  - 隐藏 AD/C 切换；
  - 锁定 H（head-tail）；
  - 移除 `tailStopClean` 控件。
- 结果分组已接入 `performance_result.nonbody_hide_ids`，并在同包内执行“非正文组 ↔ 疑似广告组”换行。
- 可追溯代码路径：
  - `src/components/metadata/MetadataAdReviewSection.tsx`
  - `src/components/ImageMainAdReviewControls.tsx`
  - `src/components/ImageMainSection.renderers.tsx`
  - `src/features/app/workspaceAdReviewPageDerivations.ts`

### 9.2 Phase E（收口验证）

- 质量门禁执行结果：
  - `npm run format:check`：通过。
  - `npm run lint`：通过。
  - `npm run test`：通过（`141 passed | 1 skipped`，`829 passed | 1 skipped`）。
  - `npm run build`：通过。
- 回归补充：
  - 设置页入口文案回归：`src/__tests__/App.settings.test.tsx`。
  - `performance` 策略强制回归：`src/features/app/useManageAdReviewActions.test.ts` 新增断言，验证 `execution_mode=performance` 时策略固定为 `head-tail`。
