# MediaPlayerX 项目评估报告（第六版）

> 评估日期：2026-02-14  
> 评估范围：项目规模、功能点、结构质量、测试、文档、维护性/扩展性、安全与合规  
> 评估基线：仓库 `Z:/Playground/CurrentWorking/MediaPlayerX`，版本 `0.66`，commit `8942641`

---

## 0. 结论摘要

- **项目规模结论：大型**。核心业务代码（`src` + `electron`，排除测试与声明）约 **55,881 行**。
- **功能复杂度结论：高**。本地 I/O、归档、SQLite、受控媒体协议、元数据链路、AI 审核、音乐可视化均在位。
- **总体质量结论：A-**。`lint/test/build/build:electron/test:coverage/audit` 全通过；v5 的构建阻断已消除；P2 签名链路已落地可执行方案。

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
| 前端业务源码（`src`，不含测试） | 195 | 40,126 |
| 后端业务源码（`electron`，不含测试） | 77 | 15,755 |
| **核心业务代码合计** | **272** | **55,881** |
| 前后端测试代码 | 51 | 12,780 |
| 类型声明（`.d.ts`） | 1 | 179 |
| 样式（`src/**/*.css`） | 50 | 8,431 |
| 工程脚本（`scripts`） | 13 | 4,477 |
| 文档（`docs/**/*.md`） | 21 | 4,626 |

补充：测试代码/业务代码比约 **22.87%**（12,780 / 55,881）。

### 2.2 功能模块规模（`src/features`）

| 模块 | 文件数 | 行数 |
|---|---:|---:|
| `app` | 73 | 12,965 |
| `backend` | 24 | 5,233 |
| `music-visualizer` | 14 | 2,626 |
| `import` | 5 | 640 |
| `layout` | 3 | 517 |
| `shortcuts` | 2 | 433 |
| `perf` | 3 | 423 |
| `management` | 3 | 404 |
| `media` | 4 | 396 |
| `sidebar` | 2 | 358 |
| `search` | 2 | 203 |
| `metadata` | 1 | 185 |
| `theme` | 2 | 139 |

关键观察：

- `app` 仍是复杂度中心，但 v5 提到的超大编排文件已被持续拆分。
- `useAppWorkspaceProps.ts` 从 v5 的 1661 行降到 962 行，结构负担明显下降。

### 2.3 功能复杂度事实（可度量项）

- IPC 通道：**49 个**（后端 39 + 窗口控制 6 + bench 3 + resolve handler 1）。
- 后端契约 Schema：`src/contracts/backend.ts` 导出 **105** 个 `*Schema`。
- 设置项：`appSettingsSchema` 共 **53** 个可配置字段。
- 数据库复杂度：`mediaLibrarySchema.ts` 中 `CREATE TABLE` 语句统计 **18**（含辅助/扩展表定义）。

### 2.4 综合规模结论

- 以业务 LOC 视角：**大型工程**。
- 以功能复杂度视角：**大型且持续演进**（业务功能扩展 + 工程治理并行）。

---

## 3. 项目质量评估

### 3.1 结构与架构质量（A-）

正向项：

- 前后端分层仍清晰：contracts + preload + IPC + repository。
- 本轮完成多轮拆分：`main`、`registerBackendIpcHandlers`、`realRepository`、`useAppTopLayerState`、`useAppWorkspaceProps` 均下降到更可维护体量。

关注项：

- `src/mockData.ts`（1093 行）、`src/contracts/backend.ts`（895 行）仍为高体量文件，后续需评估是否做“逻辑拆分”而非机械拆分。

### 3.2 测试质量与稳定性（A）

正向项：

- `npm run test`：**51 文件 / 252 用例通过**。
- `npm run test:coverage`：总体 **Statements 57.49% / Branches 51.52% / Functions 58.45% / Lines 57.70%**。

关注项：

- 仍有可预期噪音：SQLite ExperimentalWarning、媒体访问拒绝日志（测试场景内）。

### 3.3 文档质量（A-）

正向项：

- 评估与治理文档持续更新，新增签名运行手册：`docs/windows-release-signing-runbook.md`。
- `README.md` 与 `docs/README.md` 已补签名发布入口。

关注项：

- v5/v6 并存时需明确“最新有效版本”为 v6，避免误引用旧结论。

### 3.4 维护性（A-）

正向项：

- v5 的 **P0 构建阻断已修复**，`npm run build` 恢复绿灯。
- 超大文件已分批治理，拆分策略稳定（单模块改动 + 独立验证 + 独立提交）。

关注项：

- 仍有 9 项 outdated，依赖升级窗口需按计划执行。

### 3.5 扩展性（A-）

正向项：

- 新增模块化辅助文件（workspace/top-layer/electron runtime helpers）降低功能叠加时的耦合增长。
- P2 发布链路引入“signed/unsigned 双通道”，扩展到正式发布流程时改动成本低。

### 3.6 安全与合规（工程安全 A- / 治理合规 A）

工程安全正向项：

- Electron 安全基线延续：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`。

治理合规正向项：

- P2 已落地签名实施骨架：
  - `electron-builder.config.cjs`（签名开关）
  - `scripts/verify-signing-env.mjs`（证书环境校验）
  - `scripts/electron-pack.mjs`（signed/unsigned 统一打包入口）
  - `.github/workflows/windows-release.yml`（手动触发打包流程）

关注项：

- 默认仍允许 unsigned 打包；正式发布流程需要制度化“签名必选”门禁。

---

## 4. 质量门禁验证结果（本次实际执行）

| 检查项 | 结果 | 备注 |
|---|---|---|
| `npm run lint` | ✅ 通过 | 无 error 输出 |
| `npm run test` | ✅ 通过 | 51 files / 252 tests |
| `npm run build` | ✅ 通过 | 构建恢复正常 |
| `npm run build:electron` | ✅ 通过 | `main/preload/worker` 产物生成成功 |
| `npm run test:coverage` | ✅ 通过 | 57.49 / 51.52 / 58.45 / 57.70 |
| `npm audit --audit-level=high` | ✅ 通过 | 0 vulnerabilities |
| `npm outdated --json` | ⚠️ 有待升级项 | 9 个依赖存在更新 |

---

## 5. 风险矩阵（当前版本）

| 风险 | 严重度 | 概率 | 当前状态 |
|---|---|---|---|
| 构建阻断复发（类型契约漂移） | 中 | 中 | 当前已修复，需依赖 fixture 策略持续防回归 |
| 超大文件继续膨胀导致维护成本回升 | 中 | 中 | 已有明显改善，但仍需持续拆分治理 |
| 依赖长期滞后带来升级债务 | 中 | 中 | 仍有 9 项 outdated |
| 测试噪音影响 CI 可读性 | 低 | 中 | 仍存在可预期 warning 输出 |
| 正式发布误用 unsigned 包 | 中 | 中 | 签名流程已具备，需发布门禁固化 |

---

## 6. 改进建议（按优先级）

### P1（近期）

1. 继续拆分 `useAppWorkspaceProps.ts`（优先“metadata panel props 组装段”和“music section props 组装段”）。
2. 为关键 props 契约继续强化 fixture builder，减少类型漂移回归。
3. CI 降噪：对 SQLite warning 与预期拒绝日志做分级输出。

### P2（中期）

1. 依赖升级窗口化执行：先 patch/minor（`electron 40.4.1`、`typescript-eslint 8.55.0`、`@vitejs/plugin-react 5.1.4`）。
2. 将“正式发布必须 signed”写入发布 SOP，并在 CI 增加 signed 流程校验门禁。
3. 产物发布统一附带 SHA256 与 signed/unsigned 标签。

---

## 7. 对照 v5 的变化结论

| 项 | v5 | v6 |
|---|---|---|
| 构建状态 | ❌ `npm run build` 阻断 | ✅ build/build:electron 均通过 |
| 质量总评 | B+（含 P0 阻断） | A-（无阻断） |
| 大文件治理 | `useAppWorkspaceProps.ts` 1661 行 | `useAppWorkspaceProps.ts` 962 行 |
| P2 签名链路 | 未落地 | 已落地脚本 + config + workflow + runbook |

---

## 8. 最终评定（本轮）

- **规模**：大型
- **工程质量**：A-
- **可维护性**：A-
- **可扩展性**：A-
- **安全工程**：A-
- **合规治理**：A

综合建议：项目已进入“可持续迭代 + 可控发布”阶段。下一阶段重点应从“是否能发布”转为“发布是否标准化”（signed 发布门禁 + 依赖升级节奏 + CI 降噪）。

---

## 9. 附录

### 9.1 超大文件 Top（不含测试）

| 行数 | 文件 |
|---:|---|
| 1093 | `src/mockData.ts` |
| 962 | `src/features/app/useAppWorkspaceProps.ts` |
| 895 | `src/contracts/backend.ts` |
| 879 | `src/components/MetadataPanel.tsx` |
| 785 | `electron/services/metadata/metadataScraperService.ts` |
| 771 | `src/components/FullscreenLayer.tsx` |
| 744 | `electron/mediaLibrarySnapshotStore.ts` |
| 712 | `electron/services/file-system-read/librarySnapshotService.ts` |
| 710 | `electron/archiveWasmExtractor.ts` |
| 704 | `src/components/metadata/MetadataFetchPanel.tsx` |
| 676 | `src/components/metadata/MetadataImageEditor.tsx` |
| 673 | `electron/fileSystemReadFacade.ts` |
| 659 | `src/components/ImageMainSection.tsx` |
| 651 | `src/components/MusicMainSection.tsx` |
| 626 | `src/features/app/useAppNavigationState.ts` |

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
