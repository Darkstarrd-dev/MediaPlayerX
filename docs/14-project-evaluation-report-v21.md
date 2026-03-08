# MediaPlayerX 项目评估报告（v21）

> 评估日期：2026-03-08  
> 项目类型：Electron + React  
> 评估人：OpenCode  
> 评估范围：规模/结构质量/测试/覆盖率/构建与产物/安全与合规/维护性与扩展性/发布就绪  
> 评估基线：仓库 `Z:/Playground/CurrentWorking/MediaPlayerX`，版本 `0.8.0`，commit `af79a07`（工作区 dirty）  
> 评估环境：OS Windows；Node `v22.13.1`；npm `10.9.2`；Vite `v7.3.1`；Electron `v40.4.1`

---

## 0. 结论摘要（Go/No-Go）

- **项目规模结论**：大型（核心业务代码 166,677 LOC，509 文件）。
- **功能复杂度结论**：高（Electron 文件系统编排、主题参数系统、媒体主区与元数据/转码链路并行扩张）。
- **总体质量结论**：**B**（P0 发布阻断已清零，剩余风险集中在结构相似扩张与维护性治理）。
- **发布建议**：✅ **Go**。
- **阻断项（P0）**：无。
- **主要风险（Top 3）**：
  1) 结构相似（AST）继续扩大至 `305 clusters / 893 matches`。  
  2) `ThemeParameterPanel` 在 coverage 模式下耗时仍偏高，后续应继续降本。  
  3) 工作区当前仍为 dirty，发布前需整理并固化最终快照。

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
| 版本基线 | `git rev-parse --short HEAD` + `git status --porcelain` | ✅ | commit `af79a07`；工作区 dirty |
| baseline-clean | `npm run baseline:verify-clean` | ❌ | `Working tree is not clean` |
| 代码规范 | `npm run lint` | ✅ | ESLint 通过（0 warning） |
| 测试（全量） | `npx vitest run --silent --reporter=dot` | ✅ | `892 passed / 1 skipped`（146 files） |
| 覆盖率 | `npx vitest run --coverage --silent --reporter=dot` | ✅ | `892 passed / 1 skipped`（146 files） |
| 稳定性复跑 | `npx vitest run --silent --reporter=dot` x3 | ✅ | `3/3` 通过 |
| 构建(全量) | `npm run build` | ✅ | `tsc -b && vite build` |
| 构建(Electron) | `npm run build:electron` | ✅ | `main.cjs/preload.cjs/worker` 产物成功 |
| 安全(依赖) | `npm audit --audit-level=high` | ✅ | `found 0 vulnerabilities` |
| 循环依赖 | `npx madge --extensions ts,tsx --ts-config tsconfig.json --circular src electron` | ✅ | 0 循环依赖（700 files） |
| 重复代码（文本） | `npx jscpd src electron` | ✅ | 重复率 **2.89%**，clones `187` |
| 结构相似（逻辑重复） | `npx jsinspect-plus -I -L -t 50 --reporter json --ignore "..." src electron` | ⚠️ | clusters `305`，matches `893` |
| 死代码 | `npx ts-prune -p tsconfig.json` | ✅ | 无输出 |
| i18n 约束 | `npm run i18n:check` | ✅ | `1679 keys, 2 locales` |
| UI 槽位治理 | `npm run theme:verify:slots` | ✅ | `UI slot governance check passed` |
| 依赖新鲜度 | `npm outdated` | ⚠️ | outdated `9`（major `2`） |

---

## 2. 质量门禁验证结果

| 检查项 | 优先级 | 结果 | 关键数字 | 证据 |
|---|---|---|---:|---|
| format:check | P0 | ✅ | scoped 检查通过 | `npm run format:check` |
| lint | P0 | ✅ | 0 warning | `npm run lint` |
| typecheck/build | P0 | ✅ | 构建通过 | `npm run build` |
| test | P0 | ✅ | `892 pass / 1 skip` | `npx vitest run --silent --reporter=dot` |
| coverage | P0 | ✅ | `892 pass / 1 skip` | `npx vitest run --coverage --silent --reporter=dot` |
| flaky-index（3次） | P0 | ✅ | `3/3` | 3 次复跑脚本 |
| audit(high/critical) | P0 | ✅ | `0 / 0` | `npm audit --audit-level=high` |
| architecture-circular | P1 | ✅ | `0` | `madge --circular` |
| 关键治理脚本（i18n/slot） | P1 | ✅ | i18n ✅ / slot ✅ | `npm run i18n:check` + `npm run theme:verify:slots` |
| jscpd-delta | P2 | ✅ | `3.38% -> 2.89%` | v20 vs v21 |
| logic-duplication-delta | P2 | ⚠️ | `290 -> 305 clusters` | `jsinspect-plus` |
| type-debt-delta | P2 | ✅ | `any=0`，`@ts-ignore=0`，`eslint-disable=0` | 统计脚本 |

---

## 3. 项目规模评估

### 3.1 实际业务行数（LOC）
- 前端业务源码：365 文件 / 119,297 行
- Electron 后端：144 文件 / 47,380 行
- 核心业务合计：509 文件 / **166,677 行**
- 测试代码：146 文件 / 44,447 行；测试/业务比：**26.67%**

### 3.2 模块与文件规模观察
- >1500 行文件 11 个，>1200 行文件 23 个。
- Top 大文件（不含测试）：
  - `src/components/theme-parameter/themeParameterPanelCatalog.ts`：3743
  - `src/components/theme-parameter/themeParameterSnapshotCatalog.ts`：2009
  - `src/components/theme-parameter/themeParameterDefinitions.ts`：1888
  - `electron/services/file-system-read/manageAdReviewService.ts`：1846
  - `src/components/MusicMainSection.tsx`：1807

---

## 4. 结构与架构质量评估

### 4.1 分层结构与边界
- `contracts -> preload -> IPC -> repository -> UI` 主分层仍可识别。
- Electron 主链路未出现跨层回退，`theme-parameter` 局部循环依赖已通过类型边界拆分消除。
- 热点继续集中在主题参数目录、主区大组件、IPC 注册聚合与文件系统服务编排链路。

### 4.2 结构健康度指标（本轮）
- `madge`：✅ 0 循环依赖（700 files）。
- `jscpd`：✅ 重复率 **2.89%**（187 clones，较 v20 回落）。
- `ts-prune`：✅ 未检出未使用导出。
- 关键治理脚本：✅ `i18n:check` 与 `theme:verify:slots` 均通过。

---

## 5. 逻辑重复与规则漂移专项

### 5.1 结构相似（AST）扫描结论
- 本次 `jsinspect-plus`：clusters `305`，matches `893`。
- 相对上次：新增 clusters `+15`（`290 -> 305`），matches `+47`（`846 -> 893`）。
- Top 重复簇（按 instances 排序）：
  - `34a76e083395c0ceaef3280fc4b4ca4c30f8e22f`：74 instances（样本 `src/components/AppShell.tsx`）
  - `4dbb84ad49041eeca39ba7cf55c90ae87b6d041d`：32 instances（样本 `src/components/SettingsPanel.impl.tsx`）
  - `78f171126d17aae5d6ca00255d2babf34ce1adca`：23 instances（样本 `src/features/app/buildFullscreenLayerProps.ts`）

### 5.2 规则漂移与收敛状态
- 规则清单总数：N/A；已单一实现：N/A；双实现+对齐测试：N/A；未对齐：N/A（当前缺少机读规则清单产物）。
- 本轮新增漂移风险：0（主题参数相关 stable path 已补齐，slot 治理恢复通过）。
- 与治理清单联动：`docs/10-ui_definition.md` / `docs/11-token_design.md` 当前已重新对齐。

---

## 6. 测试质量与稳定性评估

### 6.1 测试结果
- 全量测试：`892 passed / 1 skipped`（146 files）。
- 覆盖率测试：`892 passed / 1 skipped`（146 files）。
- 覆盖率汇总：已恢复有效 coverage 快照；全仓覆盖率为 `statements 54.67% / branches 49.12% / functions 55.28% / lines 54.91%`。
- 备注：`src/components/ThemeParameterPanel.test.tsx` 在 coverage 模式下仍是高耗时热点，但已不再超时失败。

### 6.2 稳定性结论（Flaky Index）
- 同一 commit 连跑 3 次：`3/3` 通过。
- 结论：测试链路当前稳定性已恢复。
- 发布影响：`lint / test / coverage / build / build:electron / audit / madge / i18n / slot` 当前均为绿色快照，可进入发布准备阶段。

---

## 7. 构建与产物质量评估

### 7.1 前端构建（Vite）
- `vite build`：通过。
- 主要 JS chunk：`index` 604.50 kB、`feature-app-runtime` 466.45 kB、`feature-backend-runtime` 367.37 kB、`vendor-react` 190.26 kB。
- circular chunk warning：无。

### 7.2 全量构建（TypeScript + Vite）
- `npm run build`：通过。

### 7.3 Electron 构建
- `npm run build:electron`：通过；产物 `main.cjs`（4.3mb）/ `preload.cjs`（623.6kb）/ `asrWorker.cjs`（646.7kb）及其他 worker 成功生成。

---

## 8. 安全与依赖健康评估

### 8.1 依赖安全
- `npm audit --audit-level=high`：high `0` / critical `0`。

### 8.2 依赖新鲜度
- `npm outdated`：outdated `9`，其中 major `2`。
- 风险解释：当前不构成发布阻断；建议在修复 P0/P1 后分层滚动升级。

---

## 9. 长期稳定性指标（趋势）

### 9.1 热点（90 天）
- 变更次数 Top 10（摘录）：
  - `src/features/app/useAppTopLayerState.ts`：91
  - `src/App.test.tsx`：84
  - `src/features/app/useAppWorkspaceProps.ts`：76
  - `src/components/ImageMainSection.tsx`：73
  - `src/components/MusicMainSection.tsx`：73
  - `electron/registerBackendIpcHandlers.ts`：70
  - `src/contracts/settings.ts`：70
  - `src/store/useUiStore.ts`：68
  - `src/components/VideoMainSection.tsx`：65
  - `src/features/app/buildSettingsPanelProps.ts`：64

### 9.2 类型债
- `any`：0
- `@ts-ignore`：0
- `eslint-disable`：0

### 9.3 复杂度
- 复杂度门禁状态：未接入自动化 complexity 报表。
- 备注：建议下一版补充复杂度 Top10 与超阈值函数计数，并纳入 P2 delta 门禁。

---

## 10. 发布就绪度评估

- 结论：**Go**。
- 解除阻断条件：
  1) 提交并固化当前绿色快照，清理工作区。  
  2) 保持当前 `lint/test/coverage/build/build:electron/audit` 绿线不回退。  
  3) 保持当前 `madge/i18n/theme:verify:slots` 治理结果不回退。  
  4) 继续跟踪高耗时测试与 AST 重复簇，避免下一轮回归。

---

## 11. 风险矩阵与治理闭环

| 风险 | 严重度 | 概率 | 证据 | 当前状态 | 建议 | Owner | 截止 |
|---|---|---|---|---|---|---|---|
| coverage 链路曾超时失败 | 中 | 中 | 当前已恢复为 `892 passed / 1 skipped` | 已关闭 | 保留 coverage 单线程策略，并持续压降高耗时测试 | 前后端 | 2026-03-09 |
| flaky-index 曾不稳定 | 中 | 中 | 当前 `3/3` 通过 | 已关闭 | 保持当前 Vitest 并发与超时配置，继续观察回归 | 前后端 | 2026-03-09 |
| 结构相似基线继续扩大 | 中 | 高 | `jsinspect-plus` 305 clusters / 893 matches | 持续中 | 建立 cluster 白名单 + 增量拦截，避免主题参数目录继续膨胀 | 前后端 | 2026-03-16 |

### 11.1 治理闭环状态
- 新增问题：0。
- 已关闭问题：6（lint 回退、madge 循环、slot 文档漂移、`jscpd` 回升、coverage 超时失败、flaky-index 失稳）。
- 接受风险：2（依赖新鲜度 9 项、AST 基线偏高，复核日期 2026-03-22）。

---

## 12. 对比上版变化（v20 -> v21）

| 项 | v20 | v21 | 变化解读 |
|---|---|---|---|
| 评估基线 commit | `bf68fcd` | `af79a07` | 基线更新 |
| 工作区状态 | clean | dirty | v21 为修复后复核工作区 |
| 核心业务代码规模 | 155,855 | 166,677 | 持续增长（+10,822） |
| 核心业务文件数 | 498 | 509 | 增长（+11） |
| 测试规模 | 41,915 行 / 143 文件 | 44,447 行 / 146 文件 | 测试规模继续提升 |
| lint | ✅ | ✅ | 已恢复 0 warning |
| test | ✅（848 pass / 1 skip） | ✅（892 pass / 1 skip） | 通过且规模增加 |
| coverage | ✅（848 pass / 1 skip） | ✅（892 pass / 1 skip） | 覆盖率快照恢复并随测试规模同步增长 |
| madge | ✅（0） | ✅（0） | 复核后循环依赖已清零 |
| jscpd | ⚠️（3.38%） | ✅（2.89%） | 文本重复率显著回落 |
| logic duplication | ⚠️（290 clusters / 846 matches） | ⚠️（305 clusters / 893 matches） | 结构相似继续扩大 |
| flaky-index | ✅（3/3） | ✅（3/3） | 稳定性恢复 |
| 综合评级 | B | B | P0 阻断已清零，剩余为治理型风险 |

---

## 13. 附录：本轮执行命令清单

- `git rev-parse --short HEAD`
- `git status --porcelain`
- `node -v && npm -v`
- `node -p "require('./package.json').version"`
- `npx vite --version`
- `npx electron --version`
- `npm run baseline:verify-clean`
- `npm run format:check`
- `npm run lint`
- `npx vitest run --silent --reporter=dot`
- `npx vitest run --coverage --silent --reporter=dot`
- `node -e '<3 次复跑稳定性脚本>'`
- `npm run build`
- `npm run build:electron`
- `npm audit --audit-level=high`
- `npx madge --extensions ts,tsx --ts-config tsconfig.json --circular src electron`
- `npx jscpd src electron`
- `npx ts-prune -p tsconfig.json`
- `npm run i18n:check`
- `npm run theme:verify:slots`
- `npm outdated`
- `npm outdated --json`
- `npx jsinspect-plus -I -L -t 50 --reporter json --ignore "node_modules|dist|dist-electron|release|coverage|__tests__|__mocks__|\.test\.|\.spec\." src electron`
- `node -e '<LOC/类型债统计脚本>'`
- `git log --since="90 days ago" --name-only --pretty=format:`

---

## 14. 与治理清单联动状态

| 条目 | 状态 | 备注 |
|---|---|---|
| `docs/30-全仓重复治理PR拆分清单-v1.md` | ⚠️ 待扩展 | `jscpd` 改善，但 `jsinspect-plus` clusters 继续增长 |
| `docs/10-ui_definition.md` & `docs/11-token_design.md` | ✅ 已对齐 | `theme:verify:slots` 已恢复通过 |
| `docs/14-project-evalutation-template.md` | ✅ 已对齐 | 本版按模板完整产出 |
