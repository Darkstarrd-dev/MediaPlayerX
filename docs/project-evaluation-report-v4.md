# MediaPlayerX 项目评估报告（第四版）

> 评估日期：2026-02-12  
> 评估范围：项目规模、功能点、结构质量、测试、文档、维护性/扩展性、安全与合规  
> 评估基线：仓库 `C:/opencode/MediaPlayer`，版本 `0.66`，commit `3b201ee`

---

## 0. 结论摘要

- **项目规模结论：中大型（偏大型）**。核心业务代码（`src` + `electron`，排除测试与声明）约 **44,181 行**。
- **功能复杂度结论：高**。覆盖本地文件系统、压缩包归一化、SQLite 持久化、受控媒体协议、外部元数据抓取/解析/落库、管理模式 AI 审核、复杂交互编排。
- **总体质量结论：A-（但 lint 基线当前不通过）**：测试/构建基线稳定，安全边界清晰；但 ESLint 当前存在 **23 个 error**，需要作为 P0 修复项。

---

## 1. 评估方法与口径

### 1.1 统计口径

- **业务代码**：仅统计 `src/**/*.ts(x)` + `electron/**/*.ts(x)`，排除 `.test.*` 和 `.d.ts`。
- **测试代码**：统计 `src` 与 `electron` 下所有 `.test.ts/.test.tsx`。
- **样式代码**：统计 `src/**/*.css`。
- **工程脚本**：统计 `scripts/**/*.(js|mjs|ts)`。
- **文档规模**：统计 `docs/**/*.md`。

### 1.2 验证命令（本次实际执行）

- `npm run test`
- `npm run lint`
- `npm run build`
- `npm run build:electron`
- `npm audit --json`
- `npm outdated --json`

---

## 2. 项目规模评估

### 2.1 实际业务行数

| 维度 | 文件数 | 行数 |
|---|---:|---:|
| 前端业务源码（`src`，不含测试） | 156 | 30,722 |
| 后端业务源码（`electron`，不含测试） | 64 | 13,459 |
| **核心业务代码合计** | **220** | **44,181** |
| 前后端测试代码 | 34 | 9,112 |
| 类型声明（`.d.ts`） | 1 | 159 |
| 样式（`src/**/*.css`） | 50 | 7,887 |
| 工程脚本（`scripts`） | 10 | 4,382 |
| 文档（`docs/**/*.md`） | 15 | 3,215 |

补充：测试代码/业务代码比约 **20.62%**（9,112 / 44,181）。

### 2.2 功能模块规模（`src/features`）

| 模块 | 文件数 | 行数 |
|---|---:|---:|
| `app` | 73 | 11,685 |
| `backend` | 25 | 7,689 |
| `import` | 5 | 615 |
| `management` | 4 | 538 |
| `layout` | 3 | 474 |
| `shortcuts` | 2 | 433 |
| `perf` | 3 | 423 |
| `media` | 3 | 355 |
| `sidebar` | 2 | 290 |
| `theme` | 3 | 209 |
| `search` | 2 | 186 |
| `metadata` | 1 | 185 |

关键观察：

- 主复杂度集中在 `app` 编排层、`backend` 仓储适配层，以及 `components/metadata/*` 的大组件。
- 历史 3D 空间漫游（Vector Universe）相关实现已移除，代码复杂度与依赖面明显收敛。

### 2.3 功能复杂度事实（可度量项）

- SQLite 表：**12 张**（`media_source`、`image_item`、`video_item`、`package_grade`、`media_source_external_metadata`、`media_source_cover`、`video_cover`、`video_metadata`、`playlist_entry`、`app_state`、`root_config`、`task_log`）。
- IPC 通道：**41 个**（backend 38 + bench 3）。
- 后端契约 Schema：`src/contracts/backend.ts` 导出 **97** 个 `*Schema`。
- 设置项：`appSettingsSchema` 共 **41** 个可配置字段（不含快捷键映射等单独持久化结构）。

### 2.4 功能点评估（轻量 IFPUG 估算）

> 说明：此处采用“代码结构 + 接口面 + 数据模型”的轻量估算，不是审计级 FP 认证。

已识别的高复杂事实：

- 数据实体（SQLite `CREATE TABLE`）共 **12 张表**。
- IPC 通道共 **41**（backend 38 + bench 3）。
- 后端契约 Schema（`src/contracts/backend.ts`）导出 **97** 个 `*Schema`。
- 设置项（`appSettingsSchema`）共 **41** 个可配置字段。

功能点估算（区间）：

| 类型 | 估算值 |
|---|---:|
| ILF（内部逻辑文件） | 95-120 |
| EIF（外部接口文件） | 60-85 |
| EI（外部输入） | 70-95 |
| EO（外部输出） | 90-115 |
| EQ（外部查询） | 50-70 |
| **UFP 合计（估算）** | **365-485** |

**功能规模等级：中型上沿到大型下沿**（取中位约 420 UFP）。

### 2.5 综合规模结论

- 以业务 LOC 视角：**中大型工程**。
- 以功能点/复杂度视角：**大型复杂度特征明显**（本地 I/O + 归档 + DB + AI + 桌面安全边界）。

---

## 3. 项目质量评估

### 3.1 结构与架构质量（A）

正向项：

- Renderer 入口保持薄：`src/App.tsx` -> `useAppController` -> `AppShell`。
- 后端仍维持 Facade + 领域服务拆分，并通过 contracts + preload + ipc + repository 固化边界。
- 3D 空间漫游特性移除后，顶层编排管线简化，减少跨层耦合点。

关注项：

- 超大组件/文件仍集中在元数据与编排层，重构成本偏高（见附录“超大文件 Top 列表”）。

### 3.2 测试质量与稳定性（A-）

正向项：

- 当前测试基线通过：**34 个测试文件 / 177 个用例全部通过**。
- 后端关键链路覆盖仍较完整：DB store、Schema 迁移、媒体访问守卫、Token 服务、读服务端到端行为。

关注项：

- `src/App.test.tsx` 仍存在非阻断的 `act(...)` 警告输出，建议后续分域拆分并对异步 state 更新点补齐 `act`/`waitFor` 规范写法。

### 3.3 文档质量（B）

正向项：

- 文档已完成“减重”：删除过期实施计划与历史评估，保留需求/架构/交互/门禁/perf 的 SSOT 文档。

关注项：

- `docs/perf/2026-02-08-ui-perf-benchmark-plan.md` 的“落地位置”描述与当前代码存在不一致（建议将该文档标注为历史结论或更新为当前实现口径）。

### 3.4 维护性（B）

正向项：

- `TODO/FIXME/HACK` 仍保持 0。
- `npm audit` 漏洞为 0。

关注项（本轮新增且为 P0）：

- `npm run lint` 当前**不通过**（23 errors / 1 warning）。主要集中在：
  - `@typescript-eslint/no-explicit-any`：electron facade + read facade + mock repository 等边界层存在 `any`。
  - `@typescript-eslint/no-unused-vars`：存在未使用导入（如 `electron/fileSystemReadFacade.ts`）。
  - `no-control-regex`：`electron/services/metadata/metadataScraperService.ts` 存在控制字符正则。
- 产物层面出现 “empty chunk: vendor-three”（`vite.config.ts` 手工分包仍保留 `vendor-three`，但主应用 bundle 当前未引用 `three`）。

### 3.5 扩展性（B）

正向项：

- 主题系统（Style × Palette）依旧可扩展，文档与调试页齐全。
- contracts/schema-first 方式使得接口演进更可控。

关注项：

- 新增 IPC 端点仍需跨 `contracts/preload/main/repository` 多点改动，缺少自动注册层与更强的端到端契约生成工具。

### 3.6 安全与合规（工程安全 A- / 治理合规 B-）

工程安全正向项：

- Electron 安全基线延续：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`。
- 媒体访问仍采用白名单 + token 化：`fileSystemMediaAccessGuard` + `MediaTokenService`。

治理合规关注项（仍未解决）：

- 缺少 `SECURITY.md`、`CONTRIBUTING.md`、根级 `LICENSE`。
- 未发现 CI 工作流（`.github/workflows`）。
- Windows 打包未启用签名流程（`electron-builder`：`signAndEditExecutable: false`）。

---

## 4. 质量门禁验证结果（本次实际执行）

| 检查项 | 结果 | 备注 |
|---|---|---|
| `npm run test` | ✅ 通过 | 34 files / 177 tests 全通过 |
| `npm run lint` | ❌ 未通过 | 23 errors / 1 warning |
| `npm run build` | ✅ 通过（有 warning） | Vite 提示 `vendor-three` empty chunk |
| `npm run build:electron` | ✅ 通过 | `main/preload/worker` 产物生成成功 |
| `npm audit --json` | ✅ 通过 | prod/dev 漏洞均 0 |
| `npm outdated --json` | ⚠️ 有待升级项 | 9 个依赖存在更新（见附录） |

---

## 5. 风险矩阵（当前版本）

| 风险 | 严重度 | 概率 | 当前状态 |
|---|---|---|---|
| ESLint 基线失败导致无法建立 CI 门禁 | 高 | 高 | 已明确错误清单，需 P0 修复 |
| 元数据相关组件过大导致回归成本高 | 中 | 中 | 需要按职责拆分 |
| perf 文档与当前实现口径不一致 | 中 | 中 | 需更新或标注历史 |
| 覆盖率缺少自动门槛 | 中 | 中 | 建议引入 coverage gate |
| 无 CI 工作流导致回归依赖人工 | 高 | 中 | 需补齐流水线 |
| 合规文档缺失（SECURITY/LICENSE 等） | 中 | 高 | 需补齐治理材料 |
| 未使用依赖与分包配置残留（three / vendor-three） | 低 | 中 | 可清理以降低噪音 |

---

## 6. 改进建议（按优先级）

### P0（本周）

1. **修复 `npm run lint` 的 23 个 error**：为 electron facade / read facade 边界层补齐显式 DTO 类型，消除 `any`；清理未使用导入；修复 `no-control-regex`。
2. **清理无效分包与依赖噪音**：移除 `vite.config.ts` 中 `vendor-three` 或同步移除未使用的 `three/@types/three` 与遗留组件目录。

### P1（近期）

1. 拆分超大 UI 文件（优先：`src/components/metadata/MetadataImageEditor.tsx`、`src/components/MetadataPanel.tsx`），降低认知与回归成本。
2. 引入最小 CI：`lint + test + build + audit`，将当前手动门禁自动化。

### P2（中期）

1. 补齐仓库治理文档：`SECURITY.md`、`CONTRIBUTING.md`、`LICENSE`。
2. 引入覆盖率报告与阈值（先低阈值起步，逐步提高）。

---

## 7. 最终评定（本轮）

- **规模**：中大型（偏大型）
- **工程质量**：A-（测试/构建稳定；需先补齐 lint 门禁）
- **可维护性**：B（存在 eslint error 与超大文件）
- **可扩展性**：B
- **安全工程**：A-
- **合规治理**：B-

综合建议：项目已具备持续迭代能力，但应优先恢复 “lint 可作为硬门禁” 的工程基线；随后再推进 CI 与覆盖率门槛，以确保团队规模扩大后仍可持续演进。

---

## 8. 附录

### 8.1 超大文件 Top（不含测试）

| 行数 | 文件 |
|---:|---|
| 1195 | `src/components/metadata/MetadataImageEditor.tsx` |
| 1056 | `src/components/MetadataPanel.tsx` |
| 989 | `src/mockData.ts` |
| 855 | `src/features/app/useAppWorkspaceProps.ts` |
| 816 | `electron/services/file-system-read/manageAdReviewService.ts` |
| 805 | `src/contracts/backend.ts` |
| 779 | `electron/services/metadata/metadataScraperService.ts` |
| 710 | `electron/archiveWasmExtractor.ts` |
| 704 | `src/components/metadata/MetadataFetchPanel.tsx` |
| 701 | `src/components/FullscreenLayer.tsx` |
| 671 | `src/features/backend/repository/realRepository.ts` |
| 658 | `electron/registerBackendIpcHandlers.ts` |
| 640 | `electron/main.ts` |
| 615 | `src/features/app/useAppTopLayerState.ts` |
| 603 | `electron/fileSystemReadFacade.ts` |

### 8.2 `npm outdated --json` 摘要（共 9 项）

- `@eslint/js`：latest `10.0.1`
- `@types/node`：latest `25.2.3`
- `@types/react`：latest `19.2.14`
- `@vitejs/plugin-react`：latest `5.1.4`
- `electron`：latest `40.4.0`
- `eslint`：latest `10.0.0`
- `eslint-plugin-react-refresh`：latest `0.5.0`
- `globals`：latest `17.3.0`
- `typescript-eslint`：latest `8.55.0`
