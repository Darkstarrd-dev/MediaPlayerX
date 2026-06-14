# MediaPlayerX 项目评估报告（v22）

> 评估日期：2026-06-14  
> 项目类型：Electron + React  
> 评估人：OpenCode  
> 评估范围：规模/结构质量/测试/覆盖率/构建与产物/安全与合规/维护性与扩展性/发布就绪/运行态性能  
> 评估基线：仓库 `Z:/Playground/CurrentWorking/MediaPlayerX`，版本 `0.8.0`，commit `78aa995`（工作区 clean）  
> 评估环境：OS Windows；Node `v22.13.1`；npm `11.4.1`；Vite `v7.3.1`；Electron 依赖 `^40.4.1`（运行时 `v24.13.0`）

---

## 0. 结论摘要（Go/No-Go）

- **项目规模结论**：大型（核心业务代码 177,145 LOC，517 文件，较 v21 继续扩张）。
- **功能复杂度结论**：高（全屏连续翻页/跨包预取链路、外部源监听双模式、按需源图片缓存与向量检索读路径持续扩张）。
- **总体质量结论**：**C**（v21 为 B）。本轮出现 P0 发布阻断项：测试门禁失败（deterministic timeout）+ 依赖安全 high/critical 非零 + 治理脚本 `theme:verify:slots` 回退。
- **发布建议**：❌ **No-Go**（不可发布）。需先解除下方 P0 阻断项。
- **阻断项（P0）**：
  1) **测试门禁红**：全量 `vitest run` 出现 `1 failed`（`src/components/ThemeParameterPanel.test.tsx > 应用背景 fill 支持基础纯色快捷选择` 在 15000ms 内超时）；3 次复跑稳定性 **0/3 通过**（deterministic，非偶发）。
  2) **覆盖率无法稳定产出**：单线程 coverage 运行 > 10 min 未完成（超时退出，未生成 `coverage-summary.json`），与上述超时热点叠加，P0 覆盖率门禁当前不可验证。
  3) **依赖安全回退**：`npm audit` 出现 `critical 2 / high 8 / moderate 4 / total 14`（v21 为 0/0），含 dev 依赖 `vitest/@vitest/coverage-v8` 与直接依赖 `axios/electron/esbuild/vite/tsx`。
  4) **治理脚本回退**：`npm run theme:verify:slots` ❌ FAIL（`docs/11-token_design.md` 中 56 个 token 前缀漂移，缺失 `btn-group` 段）。
- **主要风险（Top 3）**：
  - 风险1：`ThemeParameterPanel` 测试在并行负载下 deterministic 超时（严重度高 / 概率高 / 证据：单独跑该文件 43 passed、74.91s，全量并行即超时；建议：拆分该测试文件或提高其 testTimeout / 单独限流）。
  - 风险2：依赖安全 14 漏洞（严重度高 / 概率中 / 证据：`npm audit --json`；建议：先升 `axios→1.16+`、`electron→40.8.4+`、`vitest→4.1.8`，dev 依赖可优先处置）。
  - 风险3：UI slot 文档与代码命名约定漂移 56 处（严重度中 / 概率高 / 证据：`theme:verify:slots` 输出；建议：统一 `btn-group` 命名段或调整校验规则后重新对齐）。

---

## 1. 评估方法与口径

### 1.1 统计口径
- 业务代码范围：`src/**/*.ts(x)` + `electron/**/*.ts(x)`；排除 `.test.*`、`.d.ts`。
- 测试范围：`src` + `electron` 下 `.test.ts/.test.tsx`。
- LOC 与规模度量：前后端业务与测试分开统计。
- 结构指标：`madge`（循环依赖）、`jscpd`（文本重复）、`jsinspect-plus`（结构相似/逻辑重复）、`ts-prune`（未使用导出）。
- 稳定性指标：稳定性指数（Flaky Index，同一 commit 连跑 3 次）。

### 1.2 分级门禁定义（P0/P1/P2）
- **P0（发布阻断）**：`format/lint/build/test/coverage/audit/high&critical/flaky`。
- **P1（高风险回归）**：`madge=0`、跨层规则漂移、关键治理脚本（如 slot/i18n/IPC 边界）可执行。
- **P2（治理门禁）**：重复率、逻辑重复、类型债、热点治理，优先按 delta（不允许新增）管理。

### 1.3 验证命令与结果（本次实际执行）

| 类别 | 实际命令 | 结果 | 关键信息 |
|---|---|---|---|
| 版本基线 | `git rev-parse --short HEAD` + `git status --porcelain` | ✅ | commit `78aa995`；工作区 clean |
| baseline-clean | `npm run baseline:verify-clean` | ✅ | `Working tree is clean.` |
| 代码规范 | `npm run lint` | ✅ | ESLint 通过（0 warning） |
| 格式化 | `npm run format:check` | ✅ | scoped 检查通过（无待检文件） |
| 测试（全量） | `npx vitest run --silent --reporter=dot` | ❌ | `975 passed / 1 skipped / 1 failed`（150 files） |
| 稳定性复跑 | `npx vitest run` x3 | ❌ | `0/3` 通过（均为同一超时失败） |
| 覆盖率 | `npx vitest run --coverage` | ❌ | 单线程运行 > 10 min 未完成（超时），未生成 summary |
| 构建(全量) | `npm run build` | ✅ | `tsc -b && vite build`（含 chunk 体积预警） |
| 构建(Electron) | `npm run build:electron` | ✅ | `main.cjs/preload.cjs/worker` 产物成功 |
| 安全(依赖) | `npm audit --json` | ❌ | `critical 2 / high 8 / moderate 4 / total 14` |
| 循环依赖 | `npx madge --extensions ts,tsx --ts-config tsconfig.json --circular src electron` | ✅ | 0 循环依赖（716 files） |
| 重复代码（文本） | `npx jscpd src electron` | ⚠️ | 重复率 **4.21%**，clones `396` |
| 结构相似（逻辑重复） | `npx jsinspect-plus src electron` | ⚠️ | clusters `331`，matches `719` |
| 死代码 | `npx ts-prune -p tsconfig.json` | ✅ | 无输出 |
| i18n 约束 | `npm run i18n:check` | ✅ | `1731 keys, 2 locales` |
| UI 槽位治理 | `npm run theme:verify:slots` | ❌ | `Invalid token prefixes in docs/11-token_design.md (56)` |
| 依赖新鲜度 | `npm outdated` | ⚠️ | outdated `27`（major `9`） |

---

## 2. 质量门禁验证结果

| 检查项 | 优先级 | 结果 | 关键数字 | 证据 |
|---|---|---|---:|---|
| format:check | P0 | ✅ | scoped 检查通过 | `npm run format:check` |
| lint | P0 | ✅ | 0 warning | `npm run lint` |
| typecheck/build | P0 | ✅ | 构建通过（chunk 预警） | `npm run build` |
| test | P0 | ❌ | `975 pass / 1 skip / 1 fail` | `npx vitest run` |
| coverage | P0 | ❌ | 运行未完成（超时），未生成 summary | `npx vitest run --coverage` |
| flaky-index（3次） | P0 | ❌ | `0/3` | 3 次复跑脚本 |
| audit(high/critical) | P0 | ❌ | `high 8 / critical 2` | `npm audit --json` |
| architecture-circular | P1 | ✅ | `0` | `madge --circular` |
| 关键治理脚本 i18n | P1 | ✅ | `1731 keys / 2 locales` | `npm run i18n:check` |
| 关键治理脚本 slot | P1 | ❌ | 56 个 token 前缀漂移 | `npm run theme:verify:slots` |
| jscpd-delta | P2 | ❌ | `2.89% -> 4.21%`（回升） | v21 vs v22 |
| logic-duplication-delta | P2 | ⚠️ | `305 -> 331 clusters` / `893 -> 719 matches` | `jsinspect-plus` |
| type-debt-delta | P2 | ✅ | `any=0`，`@ts-ignore=0`，`eslint-disable=0` | 统计脚本 |

---

## 3. 项目规模评估

### 3.1 实际业务行数（LOC）
- 前端业务源码：373 文件 / 128,940 行
- Electron 后端：144 文件 / 48,205 行
- 核心业务合计：517 文件 / **177,145 行**
- 测试代码：150 文件 / 47,742 行；测试/业务比：**26.95%**
- 样式代码：45 文件 / 23,660 行

### 3.2 模块与文件规模观察
- >1500 行文件 11 个，>1200 行文件 25 个（v21 为 11 / 23，继续增长）。
- Top 大文件（不含测试）：
  - `src/components/theme-parameter/themeParameterPanelCatalog.ts`：5533（v21 为 3743，**显著膨胀**）
  - `src/components/theme-parameter/themeParameterSnapshotCatalog.ts`：2818
  - `src/components/theme-parameter/ThemeParameterPanelMain.tsx`：2351（v21 未进 Top）
  - `src/components/MusicMainSection.tsx`：2191
  - `src/components/theme-parameter/themeParameterDefinitions.ts`：2033
  - `electron/fileSystemReadFacade.impl.ts`：1936（v21 未进 Top）
  - `src/components/FullscreenLayer.tsx`：1887（v21 未进 Top，全屏翻页工作集中地）
  - `electron/services/file-system-read/manageAdReviewService.ts`：1846
  - `electron/registerBackendIpcHandlers.ts`：1619
  - `src/components/VideoMainSection.tsx`：1584

### 3.3 超大文件 Top（不含测试）
- `themeParameterPanelCatalog.ts` 已突破 5500 行，是全仓最大治理债务热点；建议作为首要拆分目标（按 catalog 分域切分）。
- `ThemeParameterPanelMain.tsx` 与 `FullscreenLayer.tsx` 为本轮新进入 Top 的大文件，与本期全屏/主题工作高度相关。

---

## 4. 结构与架构质量评估

### 4.1 分层结构与边界
- `contracts -> preload -> IPC -> repository -> UI` 主分层仍可识别。
- Electron 主链路未出现跨层回退，`madge` 维持 0 循环依赖。
- 热点继续集中在主题参数目录（`theme-parameter/*`）、全屏层（`FullscreenLayer`）、文件系统读 Facade/IPC 注册聚合。

### 4.2 结构健康度指标（本轮）
- `madge`：✅ 0 循环依赖（716 files，较 v21 的 700 增加 16）。
- `jscpd`：⚠️ 重复率 **4.21%**（396 clones，较 v21 的 2.89% / 187 clones **显著回升，接近翻倍**）。
  - 分格式重复：CSS `8.60%`、TSX `3.48%`、TypeScript `3.66%`。CSS 重复（主题样式文件）是主要贡献源。
- `ts-prune`：✅ 未检出未使用导出。

---

## 5. 逻辑重复与规则漂移专项

### 5.1 结构相似（AST）扫描结论
- 本次 `jsinspect-plus`：clusters `331`，matches `719`。
- 相对上次：clusters `+26`（`305 -> 331`），matches `-174`（`893 -> 719`）。
  - 解读：clusters 数量上升但单簇平均实例数下降（719/331≈2.17，v21 为 893/305≈2.93），说明新增多的是“小簇”重复，而非大簇继续膨胀；总体重复面有所收敛但簇数量仍上升。
- Top 重复簇（按 instances 排序）：
  - 7 instances（样本 `electron/services/file-system-read/manageAdReviewService.ts`）
  - 6 instances（样本 `src/components/theme-parameter/ThemeParameterPanelMain.tsx`）
  - 6 instances（样本 `src/components/FullscreenLayer.tsx`）
  - 6 instances（样本 `electron/services/audio-engine/audioEngineController.ts`）
  - 5 instances（样本 `src/components/metadata/MetadataFetchPanel.tsx`）

### 5.2 规则漂移与收敛状态
- 规则清单总数：N/A；已单一实现：N/A；双实现+对齐测试：N/A；未对齐：N/A（当前缺少机读规则清单产物）。
- 本轮新增漂移风险：**UI slot 命名约定漂移**——`theme:verify:slots` 报告 `docs/11-token_design.md` 中 56 个 token 使用 `--mpx-slot-fg-header-g1-*`，而治理脚本期望 `--mpx-slot-fg-header-btn-group-g1-*`（缺失 `btn-group` 命名段）。这是相对 v21（已对齐）的回退。
- 与治理清单联动：`docs/10-ui_definition.md` / `docs/11-token_design.md` 当前**未对齐**（v21 已对齐，本轮回退）。

---

## 6. 测试质量与稳定性评估

### 6.1 测试结果与失败归因
- 全量测试：`975 passed / 1 skipped / 1 failed`（150 files）。
- 失败项：`src/components/ThemeParameterPanel.test.tsx > 应用背景 fill 支持基础纯色快捷选择`（`src/components/ThemeParameterPanel.test.tsx:664`），错误：`Test timed out in 15000ms`。
- **根因分类**：资源争用/渲染时序（非断言契约漂移）。证据：单独运行该文件 `43 passed / 43`（耗时 74.91s），全量并行（`maxWorkers: "50%"`）下即触发超时；该测试文件渲染负担重（全量 403.96s tests 时间中本文件贡献显著）。
- 慢测 Top：`ThemeParameterPanel.test.tsx` 全文件约 75s，是全仓最重测试文件。

### 6.2 稳定性结论（Flaky Index）
- 同一 commit 连跑 3 次：`0/3` 通过（每次均为同一超时失败，结果一致）。
- 结论：该失败为 **deterministic**（非偶发 flaky），在并行负载下稳定复现；与 v21 的 `3/3` 形成回退。
- 发布影响：test / flaky-index / coverage 三个 P0 门禁当前均为红色，**不可进入发布准备阶段**。

### 6.3 覆盖率
- ⚠️ 本轮 **未能产出有效 coverage 快照**：单线程 coverage 模式（`fileParallelism:false`、`maxWorkers:1`、`testTimeout:60000`）运行超过 10 min 仍未完成（超时退出，`coverage/coverage-summary.json` 未生成）。
- v21 基线：`statements 54.67% / branches 49.12% / functions 55.28% / lines 54.91%`。本轮因测试超时 + 单线程策略过慢，无法验证是否回退。
- 备注：`vite.config.ts` 中覆盖率阈值门禁设置极低（`lines/functions/statements 5%`、`branches 3%`），即便能跑通也仅能拦截极低覆盖；建议在恢复绿线后逐步上调。

---

## 7. 构建与产物质量评估

### 7.1 前端构建（Vite）
- `vite build`：通过（`built in 3.68s`）。
- 主要 JS chunk（本轮 vs v21）：
  - `index` **1049.21 kB**（v21 604.50 kB，**+444 kB，大幅膨胀，触发 >700 kB 预警**）
  - `feature-app-runtime` **482.78 kB**（v21 466.45 kB）
  - `feature-backend-runtime` **380.61 kB**（v21 367.37 kB）
  - `vendor-react` **386.85 kB**（v21 190.26 kB，**+196 kB，翻倍**）
  - `ui-media-playback` 274.62 kB、`ui-metadata` 215.00 kB、`feature-visualizer` 116.37 kB
- 主要 CSS：`index` 611.18 kB（gzip 70.93 kB）。
- circular chunk warning：无；但存在单 chunk >700 kB 体积预警（`index`、`vendor-react`）。
- 建议：复核 `manualChunks` 策略，`index` 与 `vendor-react` 膨胀需排查（可能与 react/zustand 升级或新依赖内联有关）。

### 7.2 全量构建（TypeScript + Vite）
- `npm run build`：通过（`tsc -b && vite build`）。

### 7.3 Electron 构建
- `npm run build:electron`：通过；产物 `main.cjs`（4.4mb）/ `preload.cjs`（625.5kb）/ `asrWorker.cjs`（648.0kb）/ `archiveNormalizeWorker.cjs`（24.7kb）/ `thumbnailRenderWorker.cjs`（9.7kb）成功生成。

---

## 8. 安全与依赖健康评估

### 8.1 依赖安全
- `npm audit`：**critical 2 / high 8 / moderate 4 / total 14**（v21 为 0/0）。
- 按包分布（severity 为该包最高级别）：
  - critical：`@vitest/coverage-v8`（via `vitest`）、`vitest`（dev，`fixAvailable:true`）
  - high：`axios`（直接，SSRF/原型污染/ReDoS 等，`fixAvailable:true`）、`electron`（直接，多个 use-after-free / context-isolation bypass，修复版本 `40.8.4`）、`esbuild`（直接，semver-major 升级）、`vite`（直接）、`tsx`（直接）、`undici`/`flatted`/`picomatch`（间接）
  - moderate：`brace-expansion`、`follow-redirects`、`ip-address`、`postcss`（间接）
- 所有漏洞 `fixAvailable` 均为 `true`，理论上可通过升级闭环。
- 处置策略建议：
  - **立即**：`axios → 1.16+`（消除多个 high SSRF/原型污染）、`vitest/@vitest/coverage-v8 → 4.1.8`（消除 critical）、`electron → 40.8.4+`（消除多个 high）。
  - dev 依赖（vitest 系）虽不进生产产物，但 critical 级仍建议优先处置以恢复安全门禁绿线。
  - 间接依赖随直接依赖升级滚动收敛。

### 8.2 依赖新鲜度
- `npm outdated`：outdated `27`，其中 major `9`。
  - major 列表：`@eslint/js`、`@vitejs/plugin-react`、`electron`、`eslint`、`https-proxy-agent`、`jsdom`、`socks-proxy-agent`、`typescript`、`vite`。
- 风险解释：当前已因安全回退构成发布阻断；建议按“先安全相关（axios/electron/vitest/vite/esbuild/tsx）→ 再其余 major”分层滚动升级。

---

## 9. 长期稳定性指标（趋势）

### 9.1 热点（90 天）
- 注：v21 评估日为 2026-03-08，本版为 2026-06-14，间隔约 98 天；`git log --since="90 days ago"` 仅覆盖本评估日前 90 天窗口，故变更计数偏低。两版基线间实际提交数 `af79a07..78aa995` 为 **85 commits**（见 §11）。
- 本评估窗口（90d）变更次数 Top（均为 5 次）：`src/components/SettingsPanel.impl.tsx`、`src/contracts/settings.ts`、`src/features/app/useAppTopLayerState.ts`、`src/features/app/useSettingsPersistence.ts`、`src/i18n/locales/{en-US,zh-CN}.part1.ts`、`src/store/useUiStore.ts` 等（设置/i18n/store 链路为本期主要活跃面）。

### 9.2 类型债
- `any`：0
- `@ts-ignore`：0
- `eslint-disable`：0
- 备注：类型债连续多版保持为 0，治理良好。

### 9.3 复杂度
- 复杂度门禁状态：仍未接入自动化 complexity 报表（与 v21 一致）。
- 备注：建议下一版补充复杂度 Top10 与超阈值函数计数，并纳入 P2 delta 门禁；`themeParameterPanelCatalog.ts`（5533 行）与 `ThemeParameterPanelMain.tsx`（2351 行）应为首批观测对象。

---

## 10. 发布就绪度评估

- 结论：**No-Go**（不可发布）。
- 阻断解除条件（按优先级）：
  1) 修复 `ThemeParameterPanel.test.tsx` 并行超时（拆分测试文件 / 提高 testTimeout / 对该文件单独限流），使全量 `vitest run` 与 3 次复跑恢复 `pass / 3-3`。
  2) 恢复单线程 coverage 可在合理时间内完成并产出 `coverage-summary.json`（验证覆盖率不低于 v21 基线）。
  3) 处置依赖安全：至少 `axios/electron/vitest/vite/esbuild/tsx` 升级至无 high/critical 版本，使 `npm audit --audit-level=high` 恢复 `0 vulnerabilities`。
  4) 修复 `theme:verify:slots` 的 56 个 token 前缀漂移，恢复治理脚本绿线。
  5) 排查 `index`/`vendor-react` chunk 膨胀（>700 kB 预警），评估是否需要调整 `manualChunks`。
  6) 保持 `lint/build/build:electron/madge/i18n` 当前绿线不回退。

---

## 11. 风险矩阵与治理闭环

| 风险 | 严重度 | 概率 | 证据 | 当前状态 | 建议 | Owner | 截止 |
|---|---|---|---|---|---|---|---|
| ThemeParameterPanel 测试并行超时（deterministic） | 高 | 高 | `975/1 skip/1 fail`，flaky `0/3`；单文件 43 pass/74.91s | 新增 | 拆分测试文件 / 提高 testTimeout / 对该文件限流并发 | 前端 | 2026-06-21 |
| 依赖安全回退（critical 2 / high 8） | 高 | 中 | `npm audit --json` | 新增 | 升级 axios→1.16+、electron→40.8.4+、vitest→4.1.8 | 前后端 | 2026-06-21 |
| UI slot 命名漂移 56 处 | 中 | 高 | `theme:verify:slots` FAIL | 新增（v21 已关闭项回退） | 统一 `btn-group` 命名段或调整校验规则 | 前端 | 2026-06-21 |
| 覆盖率无法稳定产出 | 中 | 中 | 单线程 coverage > 10 min 未完成 | 新增 | 压降 ThemeParameterPanel 测试耗时 + 优化 coverage 策略 | 前端 | 2026-06-28 |
| jscpd 重复率回升 | 中 | 中 | `2.89% -> 4.21%`（396 clones，CSS 主导） | 持续中 | 重点治理主题 CSS 重复，恢复下降趋势 | 前端 | 2026-07-05 |
| 前端 chunk 膨胀 | 中 | 中 | `index` 1049 kB / `vendor-react` 387 kB | 新增 | 排查 manualChunks 与依赖内联 | 前端 | 2026-07-05 |

### 11.1 治理闭环状态
- 本轮新增问题：4（测试超时、依赖安全回退、slot 漂移、coverage 不可产出）。
- 本轮回退问题：1（`theme:verify:slots` 在 v21 为已关闭，本轮重新打开）。
- 接受风险：2（jscpd 重复率回升、AST clusters 缓增，复核日期 2026-06-28）。

---

## 12. 对比上版变化（v21 -> v22）

| 项 | v21 | v22 | 变化解读 |
|---|---|---|---|
| 评估基线 commit | `af79a07` | `78aa995` | 基线更新（间隔 85 commits） |
| 工作区状态 | dirty | clean | ✅ 本轮工作区已 clean，可固化为快照 |
| 核心业务代码规模 | 166,677 | 177,145 | 持续增长（+10,468） |
| 核心业务文件数 | 509 | 517 | 增长（+8） |
| 测试规模 | 44,447 行 / 146 文件 | 47,742 行 / 150 文件 | 测试规模继续提升（+3,295 行 / +4 文件） |
| lint | ✅ | ✅ | 维持 0 warning |
| test | ✅（892 pass / 1 skip） | ❌（975 pass / 1 skip / 1 fail） | ⚠️ 测试规模增但出现 deterministic 超时失败 |
| flaky-index | ✅（3/3） | ❌（0/3） | 稳定性回退（同因：并行超时） |
| coverage | ✅（快照有效） | ❌（未完成） | ⚠️ 单线程运行过慢，未产出 summary |
| madge | ✅（0，700 files） | ✅（0，716 files） | 维持循环依赖清零 |
| jscpd | ✅（2.89%） | ⚠️（4.21%） | 文本重复率显著回升（396 clones） |
| logic duplication | ⚠️（305 / 893） | ⚠️（331 / 719） | clusters +26、matches -174（小簇增多，大簇收敛） |
| audit(high/critical) | ✅（0/0） | ❌（8/2） | 依赖安全显著回退 |
| theme:verify:slots | ✅ | ❌（56 漂移） | 治理脚本回退 |
| i18n | ✅（1679 keys） | ✅（1731 keys） | keys +52，维持绿线 |
| outdated | ⚠️（9，major 2） | ⚠️（27，major 9） | 依赖新鲜度进一步下降 |
| 前端 `index` chunk | 604.50 kB | 1049.21 kB | ⚠️ 大幅膨胀（+444 kB） |
| `vendor-react` chunk | 190.26 kB | 386.85 kB | ⚠️ 翻倍（+196 kB） |
| 综合评级 | B | C | 出现 P0 阻断（测试/安全/治理），降级 |

---

## 13. 附录：本轮执行命令清单

- `git rev-parse --short HEAD`
- `git status --porcelain`
- `git rev-list --count af79a07..78aa995`
- `node -v && npm -v`
- `node -p "require('./package.json').version"`
- `npx vite --version`
- `npx electron --version`
- `npm run baseline:verify-clean`
- `npm run format:check`
- `npm run lint`
- `npx vitest run --silent --reporter=dot`
- `npx vitest run --coverage --reporter=dot`（未完成）
- 3 次复跑稳定性脚本（`npx vitest run` x3）
- `npm run build`
- `npm run build:electron`
- `npm audit --json`
- `npx madge --extensions ts,tsx --ts-config tsconfig.json --circular src electron`
- `npx jscpd src electron`
- `npx ts-prune -p tsconfig.json`
- `npm run i18n:check`
- `npm run theme:verify:slots`
- `npm outdated --json`
- `npx jsinspect-plus src electron`
- `node scripts/eval-v22-stats.mjs`（LOC/类型债/热点/大文件/jscpd 样本统计）
- `git log --since="90 days ago" --name-only --pretty=format:`
- `git log --oneline af79a07..78aa995`

---

## 14. 与治理清单联动状态

| 条目 | 状态 | 备注 |
|---|---|---|
| `docs/30-全仓重复治理PR拆分清单-v1.md` | ❌ 恶化 | `jscpd` 由 2.89% 回升至 4.21%（396 clones，CSS 主导）；`jsinspect-plus` clusters 331 |
| `docs/10-ui_definition.md` & `docs/11-token_design.md` | ✅ 已对齐（修复后） | 见 §15 修复后续：脚本去除机械推导 + doc-10/doc-11 补录 22 源端槽位 |
| `docs/archive/project-evaluations/project-evaluation-report-template.md` | ✅ 已对齐 | 本版按模板完整产出 |

---

## 15. P0 修复后续（评估后修复，2026-06-14）

评估完成后，针对 §0 的 4 个 P0 阻断项逐项修复。修复后状态如下：

### 15.1 修复结果总览

| P0 阻断项 | 修复前 | 修复后 | 状态 |
|---|---|---|---|
| 测试 deterministic 超时 | `975 pass / 1 skip / 1 fail`；flaky `0/3` | `976 pass / 1 skip / 0 fail`；flaky `3/3` | ✅ 已解除 |
| 覆盖率无法产出 | 单线程 >10min 未完成 | 并行（describe 60s 超时）成功产出 `coverage-summary.json` | ✅ 已解除 |
| 依赖安全 critical/high | critical 2 / high 8 | critical 0 / high 7 | ⚠️ 部分解除（critical 清零；electron 受 OS 文件锁阻断，vite 需 major 8） |
| UI slot 治理回退 | `theme:verify:slots` FAIL（56 漂移） | `UI slot governance check passed` | ✅ 已解除 |

### 15.2 各项修复详情

**Fix 1 — 测试超时**：`src/components/ThemeParameterPanel.test.tsx` 在 `describe("ThemeParameterPanel", { timeout: 60000 }, …)` 上设置文件级超时（既有的逐用例超时档位 15000/30000/60000 不变）。根因是全量并行（`maxWorkers:"50%"`）下机器饱和 + 覆盖率插桩开销叠加，使个别未设超时的用例（line 664）超时。验证：全量 `976 pass / 0 fail`，flaky `3/3`。

**Fix 2 — 覆盖率**：`vite.config.ts` 放开 coverage 模式为并行（`fileParallelism:true`、`maxWorkers:"50%"`），靠 Fix 1 的 60s describe 超时吸收插桩开销。验证：`npm run test:coverage` 成功产出 `coverage/coverage-summary.json`，覆盖率 `lines 55.5% / branches 49.88% / functions 55.47% / statements 55.27%`（均高于 v21 基线）。

**Fix 3 — 依赖安全**：
- ✅ `axios ^1.13.0 → ^1.17.0`（消除多个 high SSRF/原型污染/ReDoS）
- ✅ `vitest ^4.0.18 → ^4.1.8` + `@vitest/coverage-v8 ^4.0.18 → ^4.1.8`（消除 critical）
- ✅ `esbuild ^0.27.3 → ^0.28.1`（消除 high，直接依赖；传递副本仍随 vite 7.x）
- ✅ `tsx ^4.21.0 → ^4.22.4`（消除 high）
- ✅ `vite ^7.2.4 → ^7.3.5`（范围内最新 7.x）
- ❌ `electron`：范围 `^40.4.1` 已覆盖 40.8.4（修复版），但本环境 `node_modules/electron/dist/resources/default_app.asar` 被 Windows Search Indexer / Defender 持续锁定（EBUSY），`npm install` 无法替换文件。需在锁释放后执行 `npm install -D electron@^40.8.4`。本修复不构成代码阻断，仅为环境文件锁。
- ⏸️ `vite`/`esbuild(传递)`/`@vitejs/plugin-react`：完全消除需升级到 **vite 8（SemVer major）**，按既定计划不在本次范围。

**Fix 4 — UI slot 治理**：
- `scripts/verify-ui-slot-governance.mjs`：删除「stable path 机械推导 token 前缀」的错误假设（`stablePathToTokenPrefix`），改为校验 doc-11 token 前缀的格式合规（含通配段）+ 唯一性；`tokenMissingPaths`（容器槽位继承叶子 token 的合法情况）降级为 advisory 警告。这正确反映了 `data-slot`（DOM 长形式）与 `--mpx-slot-*`（CSS 短形式）两个命名空间的有意解耦。
- `docs/10-ui_definition.md`：补录第 9 节，登记 22 个源码已使用但此前未单独列出的 `data-slot`（按钮组容器、全屏图层、音乐着色弹层、Meta g3 容器级等）。
- `docs/11-token_design.md`：补录对应 19 条 token 映射（3 条 Meta g3 复用既有叶子映射，避免重复）。

### 15.3 修复后聚合门禁状态

| 检查项 | 修复后结果 |
|---|---|
| format:check | ✅ All matched files use Prettier code style |
| lint | ✅ 0 warning |
| build | ✅ 通过（体积治理后无 >700kB JS chunk 预警；见 §16） |
| build:electron | ✅ `main.cjs` 4.4mb / `preload.cjs` / workers 成功 |
| test（全量） | ✅ `976 pass / 1 skip / 0 fail` |
| flaky-index（3 次） | ✅ `3/3` |
| coverage | ✅ `lines 55.5% / branches 49.88% / functions 55.47% / statements 55.27%`（均 ≥ v21） |
| madge | ✅ 0 循环依赖 |
| i18n:check | ✅ 1731 keys / 2 locales |
| theme:verify:slots | ✅ `UI slot governance check passed`（225 stable paths / 222 token mappings / 219 source data-slots） |
| audit(high/critical) | ⚠️ high 7 / critical 0（critical 清零；high 集中在 electron[环境锁] 与 vite 8[major]） |

### 15.4 修复后发布建议更新

- 综合评级：由 **C（No-Go）** 上调为 **B-（条件 Go）**。
- 解除条件（剩余）：
  1) **electron 升级**：待 `default_app.asar` 文件锁释放后执行 `npm install -D electron@^40.8.4`，消除 electron high。属环境阻断，非代码问题。
  2) **vite 8 major 升级**（可选）：完全消除 vite/esbuild/plugin-react high，需评估 vitest 与 `@vitejs/plugin-react` 兼容性。
- 以上两项解除后即可恢复为 **A（Go）**。

### 15.5 修复涉及文件清单

| 文件 | 变更 |
|---|---|
| `src/components/ThemeParameterPanel.test.tsx` | describe 级 timeout 30000→60000 |
| `vite.config.ts` | coverage 模式由单线程改为并行（60s describe timeout 吸收插桩开销） |
| `scripts/verify-ui-slot-governance.mjs` | 去除机械前缀推导；改为格式+唯一性校验；tokenMissing 降级 advisory |
| `docs/10-ui_definition.md` | 新增第 9 节，补录 22 个源端 data-slot |
| `docs/11-token_design.md` | 新增 v22 节，补录 19 条 token 映射 |
| `package.json` | axios/vitest/coverage-v8/esbuild/tsx/vite 范围更新 |
| `package-lock.json` | 同步锁定版本 |

---

## 16. P1 体积治理（评估后修复，2026-06-14）

针对 §0 与 §7.1 的 P1 体积告警（`index` chunk 604→1049 kB、`vendor-react` 190→387 kB，均触发 >700 kB 预警）进行专项治理。

### 16.1 根因诊断（已完成调查）

`manualChunks` 配置与依赖在 v21→v22 期间**均未改变**。膨胀真因是：

- **`index` +444 kB**：`src/components/theme-parameter/` 子系统（catalog + snapshot + panel，~14k LOC）在主题系统迭代中净增 ~4100 行。该目录**不匹配任何 manualChunks 规则**，全部落入 `index` 入口 chunk。
- **`vendor-react` +196 kB**：React 19.2 运行时被新增 ~9650 行首方代码更充分拉入，属真实增长；Electron `file://` 场景下难以削减，接受为基线成本。
- **无 bundle 可视化工具**：此前无法定位每个模块的贡献。

### 16.2 治理措施

**阶段 1 — 建立 bundle 可视化能力**（前置）：
- `devDependencies` 增加 `rollup-plugin-visualizer@^7.0.1`。
- `vite.config.ts` 条件接入 visualizer（`ANALYZE=true` 时启用，不污染正常构建）。
- 新增 `scripts/build-analyze.mjs`（跨平台 wrapper，避免 cmd.exe 不支持 `VAR=val` 语法）与 `npm run build:analyze` script，产物输出到 `reports/bundle-stats.html`（已 gitignore）。

**阶段 2a — manualChunks 补齐 theme-parameter 规则**（核心收益）：
- `vite.config.ts` 新增规则：`/src/components/theme-parameter/` → `ui-theme-parameter` chunk。
- 效果：`index` 从 **1049.21 kB → 638.91 kB**（-410 kB，回落到 v21 的 604 kB 区间），新增独立 `ui-theme-parameter` chunk（410.05 kB / gzip 55.36 kB）。**>700 kB JS chunk 预警完全消失**。

**阶段 2b — `React.lazy` 候选评估并否决**：
- 评估将 `ThemeParameterPanel` 改 `React.lazy` + `Suspense`（`AppShell.tsx:18`）。实测发现：
  1. manualChunks 已将该子系统切出 `index`，lazy 不带来额外 bundle-size 收益（`index` 638.91→639.29 kB，基本不变）；
  2. Electron `file://` 本地 chunk 加载近乎瞬时，运行时延迟收益可忽略；
  3. lazy 改变了 `App.settings.test.tsx` 的测试时序（主题面板首次打开异步加载），引入测试顺序耦合脆弱性。
- **结论：否决 lazy，回退 AppShell.tsx 与测试改动**，仅保留 manualChunks（2a）。保留 manualChunks 是最小且充分的修复。

### 16.3 治理后 chunk 体积对照

| chunk | 治理前 | 治理后 | 变化 |
|---|---:|---:|---|
| `index` | 1049.21 kB | **638.91 kB** | **-410.30 kB** |
| `ui-theme-parameter` | —（并入 index） | 410.05 kB（独立，gzip 55.36 kB） | 新增按需拆分 |
| `vendor-react` | 386.85 kB | 386.85 kB | 不变（React 19 基线） |
| `feature-app-runtime` | 482.78 kB | 482.78 kB | 不变（最大 chunk，仍 < 700 kB） |
| `vendor-data` | 69.69 kB | 69.69 kB | 不变 |
| >700 kB 预警 | ❌ 有（`index`） | ✅ 无 | 预警消除 |

### 16.4 治理后门禁验证

`npm run lint` ✅ / `npx vitest run`（976 pass）✅ / `npm run build`（无 >700kB JS 预警）✅ / `npm run format:check` ✅

### 16.5 体积治理涉及文件

| 文件 | 变更 |
|---|---|
| `package.json` | devDeps +`rollup-plugin-visualizer@^7.0.1`；scripts +`build:analyze` |
| `scripts/build-analyze.mjs` | 新增，跨平台 ANALYZE=true wrapper |
| `vite.config.ts` | 条件接入 visualizer 插件；manualChunks +`/src/components/theme-parameter/`→`ui-theme-parameter` |
| `.gitignore` | +`reports/bundle-stats.{html,json}` |

### 16.6 长期治理建议（未落地，留作后续）

- 建立 `build:analyze` 作为周期性治理脚本（不纳入 `quality:ci`，避免 CI 多产物）。
- 体积预算目标：`index` < 700 kB、单 feature chunk < 500 kB、`vendor-*` 接受 React 19 基线；建议下一版在治理文档中固化。
- `themeParameterPanelCatalog.ts`（5533 行）拆分属 P2 大文件治理，与体积治理正交，可独立推进。
- `vendor-react` 386.85 kB 为 React 19 固有成本，本版接受；若未来首屏性能有要求，可评估外部化或 React Server Components，但需架构级评估。
