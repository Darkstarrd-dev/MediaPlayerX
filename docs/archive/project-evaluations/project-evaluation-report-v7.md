# MediaPlayerX 项目评估报告（第七版）

> 评估日期：2026-02-15  
> 评估范围：项目规模、功能点、结构质量、测试、文档、维护性/扩展性、安全与合规  
> 评估基线：仓库 `Z:/Playground/CurrentWorking/MediaPlayerX`，版本 `0.0.0`，commit `5587d3d`

---

## 0. 结论摘要

- **项目规模结论：大型**。核心业务代码（`src` + `electron`，排除测试与声明）约 **62,250 行**。
- **功能复杂度结论：高**。本地 I/O、归档、SQLite、受控媒体协议、元数据链路、AI 审核、音乐可视化继续扩张。
- **总体质量结论：B-**。`build/build:electron/audit` 通过，但 `lint` 与 `test/test:coverage` 失败（同源问题为 UI 行为变更与测试基线漂移）。

---

## 1. 评估方法与口径

### 1.1 统计口径

- **业务代码**：`src/**/*.ts(x)` + `electron/**/*.ts(x)`，排除 `.test.*` 和 `.d.ts`。
- **测试代码**：`src` 与 `electron` 下 `.test.ts/.test.tsx`。
- **样式代码**：`src/**/*.css`。
- **工程脚本**：`scripts/**/*.(js|mjs|ts)`。
- **文档规模**：`docs/**/*.md`。

### 1.2 验证命令（本次实际执行）

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run build:electron`
- `npm run test:coverage`
- `npm audit --audit-level=high`
- `npm outdated --json`

---

## 2. 项目规模评估

### 2.1 实际业务行数

| 维度 | 文件数 | 行数 |
|---|---:|---:|
| 前端业务源码（`src`，不含测试） | 206 | 45,249 |
| 后端业务源码（`electron`，不含测试） | 78 | 17,001 |
| **核心业务代码合计** | **284** | **62,250** |
| 前后端测试代码 | 55 | 14,815 |
| 类型声明（`.d.ts`） | 1 | 180 |
| 样式（`src/**/*.css`） | 56 | 9,705 |
| 工程脚本（`scripts`） | 14 | 4,639 |
| 文档（`docs/**/*.md`） | 24 | 5,514 |

补充：测试代码/业务代码比约 **23.80%**（14,815 / 62,250）。

### 2.2 功能模块规模（`src/features`）

| 模块 | 文件数 | 行数 |
|---|---:|---:|
| `app` | 74 | 13,689 |
| `backend` | 24 | 5,233 |
| `music-visualizer` | 21 | 4,753 |
| `import` | 5 | 640 |
| `layout` | 3 | 517 |
| `media` | 5 | 464 |
| `management` | 3 | 426 |
| `shortcuts` | 2 | 433 |
| `perf` | 3 | 423 |
| `sidebar` | 2 | 358 |
| `theme` | 2 | 252 |
| `search` | 2 | 203 |
| `metadata` | 1 | 185 |

关键观察：

- `app` 仍是复杂度中心，且 `useAppWorkspaceProps.ts` 回升至 **1080 行**（较 v6 的 962 行上升）。
- `music-visualizer` 增长明显（**2,626 -> 4,753 行**），新增渲染/着色器体量已进入核心复杂度区。

### 2.3 功能复杂度事实（可度量项）

- IPC 通道定义：**52 个**（后端 41 + 窗口控制 8 + bench 3）。
- IPC 处理器（`ipcMain.handle`）实装：**50 个**（后端 39 + 窗口控制 7 + bench 3 + resolve handler 1）。
- 后端契约 Schema：`src/contracts/backend.ts` 导出 **105** 个 `*Schema`。
- 设置项：`appSettingsSchema` 共 **57** 个可配置字段。
- 数据库复杂度：`electron/mediaLibrarySchema.ts` 中 `CREATE TABLE` 语句统计 **18**。

### 2.4 综合规模结论

- 以业务 LOC 视角：**大型工程**。
- 以功能复杂度视角：**大型且扩张中**（尤其是 UI 编排层与音乐可视化子系统）。

---

## 3. 项目质量评估

### 3.1 结构与架构质量（B+）

正向项：

- 前后端分层结构保持稳定：contracts + preload + IPC + repository。
- Electron 安全基线配置持续保持（`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`）。

关注项：

- 超大文件风险回升：`src/components/MusicMainSection.tsx`（1199）、`src/features/app/useAppWorkspaceProps.ts`（1080）、`src/mockData.ts`（1093）。

### 3.2 测试质量与稳定性（C）

正向项：

- 总体执行规模达到 **285** 个测试，覆盖前后端关键链路。

关注项：

- `npm run test` 失败：**20 个失败用例**，集中于 `src/App.test.tsx`。
- 失败根因表现为 UI 文案/可访问名称变化（例如预期 `元数据管理`，实际为 `切换到元数据模式`）。
- `npm run test:coverage` 同步失败，当前无法作为门禁指标使用。

### 3.3 文档质量（A-）

正向项：

- 文档规模持续增长（24 文件 / 5,514 行），治理与发布相关文档延续更新。

关注项：

- v6/v7 并存阶段，需要在入口文档显式声明“最新有效版本”为 v7，避免误引用。

### 3.4 维护性（B）

正向项：

- 构建链路保持可用：`build` 与 `build:electron` 均通过。

关注项：

- `lint` 失败（`manageAdReviewService.test.ts` 存在未使用变量 `_options`）。
- 测试基线与 UI 演进脱节，导致主干验证信号下降。

### 3.5 扩展性（A-）

正向项：

- 音乐可视化能力显著增强（渲染器、shader、runtime 扩展），说明功能扩展路径可行。

关注项：

- 构建产物出现 chunk 体积预警（`index-*.js` 约 891 kB），后续功能继续叠加时会放大加载成本。

### 3.6 安全与合规（工程安全 A- / 治理合规 B+）

工程安全正向项：

- `npm audit --audit-level=high`：0 vulnerabilities。
- Electron 关键安全选项保持开启（见 `electron/main.ts`）。

治理合规关注项：

- 当前质量门禁未全绿（lint/test 未通过），不适合直接进入正式发布节奏。

---

## 4. 质量门禁验证结果（本次实际执行）

| 检查项 | 结果 | 备注 |
|---|---|---|
| `npm run lint` | ❌ 失败 | 1 个错误：`_options` 未使用（`manageAdReviewService.test.ts`） |
| `npm run test` | ❌ 失败 | 116 suites / 285 tests，失败 20（集中于 `src/App.test.tsx`） |
| `npm run build` | ✅ 通过 | 前端构建成功；存在 chunk > 700k 预警 |
| `npm run build:electron` | ✅ 通过 | `main/preload/worker` 产物生成成功 |
| `npm run test:coverage` | ❌ 失败 | 与 `test` 同源失败；覆盖率总览未形成可用门禁结论 |
| `npm audit --audit-level=high` | ✅ 通过 | 0 vulnerabilities |
| `npm outdated --json` | ⚠️ 有待升级项 | 9 个依赖存在更新 |

---

## 5. 风险矩阵（当前版本）

| 风险 | 严重度 | 概率 | 当前状态 |
|---|---|---|---|
| 测试基线漂移导致 CI 失真 | 高 | 高 | `App.test.tsx` 20 例失败，需优先修复 |
| Lint 门禁阻断合并 | 中 | 高 | 目前已出现稳定复现错误 |
| UI 主包体积继续膨胀 | 中 | 中 | 已出现 Vite chunk 大小告警 |
| 超大文件继续增长导致维护成本回升 | 中 | 中 | `app/music` 关键文件体量上升 |
| 依赖升级窗口持续后延 | 中 | 中 | 仍有 9 项 outdated |

---

## 6. 改进建议（按优先级）

### P0（立即）

1. 修复 `src/App.test.tsx` 的 20 个失败用例：统一更新 UI 角色名/文案断言，避免历史文案硬编码。
2. 修复 lint 错误：处理 `manageAdReviewService.test.ts` 的未使用变量（删除或按规范显式消费）。
3. 以 `test + lint` 为合并前置门禁，恢复“红灯即阻断”纪律。

### P1（近期）

1. 对 `useAppWorkspaceProps.ts`、`MusicMainSection.tsx` 做职责拆分，降低单文件认知负担。
2. 为 UI 可访问名称（aria-label）建立稳定契约测试，避免文案调整反复击穿主测试集。
3. 针对 `index` 大包实施分包（`dynamic import` + `manualChunks`）并设定体积预算门槛。

### P2（中期）

1. 依赖升级窗口化执行（优先 patch/minor：`electron`、`typescript-eslint`、`@vitejs/plugin-react`）。
2. 将覆盖率门禁恢复为硬约束前，先完成 flaky/失效断言治理与报告稳定化。

---

## 7. 对照 v6 的变化结论

| 项 | v6 | v7 |
|---|---|---|
| 核心业务代码规模 | 55,881 | 62,250 |
| 质量门禁状态 | lint/test/build 全通过 | lint/test/test:coverage 失败 |
| 测试结果 | 51 files / 252 tests 全通过 | 116 suites / 285 tests，失败 20 |
| `useAppWorkspaceProps.ts` | 962 行 | 1080 行 |
| `music-visualizer` 模块 | 14 files / 2,626 lines | 21 files / 4,753 lines |
| 综合评级 | A- | B- |

---

## 8. 最终评定（本轮）

- **规模**：大型
- **工程质量**：B-
- **可维护性**：B
- **可扩展性**：A-
- **安全工程**：A-
- **合规治理**：B+

综合建议：当前阶段不应以“发布能力”作为核心目标，而应先恢复“门禁可信度”（lint/test 全绿 + 断言契约稳定）。门禁恢复后再推进体积优化与依赖升级。

---

## 9. 附录

### 9.1 超大文件 Top（不含测试）

| 行数 | 文件 |
|---:|---|
| 1199 | `src/components/MusicMainSection.tsx` |
| 1191 | `electron/services/file-system-read/manageAdReviewService.ts` |
| 1093 | `src/mockData.ts` |
| 1080 | `src/features/app/useAppWorkspaceProps.ts` |
| 999 | `src/features/music-visualizer/webglRenderer.ts` |
| 943 | `src/components/MetadataPanel.tsx` |
| 895 | `src/contracts/backend.ts` |
| 785 | `electron/services/metadata/metadataScraperService.ts` |
| 771 | `src/components/FullscreenLayer.tsx` |
| 744 | `electron/mediaLibrarySnapshotStore.ts` |
| 729 | `src/components/ImageMainSection.tsx` |
| 728 | `src/components/metadata/MetadataFetchPanel.tsx` |
| 728 | `src/components/SettingsPanel.tsx` |
| 712 | `electron/services/file-system-read/librarySnapshotService.ts` |
| 710 | `electron/archiveWasmExtractor.ts` |

### 9.2 `npm outdated --json` 摘要（共 9 项）

- `@eslint/js`：latest `10.0.1`
- `@types/node`：latest `25.2.3`
- `@types/react`：latest `19.2.14`
- `@vitejs/plugin-react`：latest `5.1.4`
- `electron`：latest `40.4.1`
- `eslint`：latest `10.0.0`
- `eslint-plugin-react-refresh`：latest `0.5.0`
- `globals`：latest `17.3.0`
- `typescript-eslint`：latest `8.55.0`
