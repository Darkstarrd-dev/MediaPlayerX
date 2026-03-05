# MediaPlayerX 项目评估报告（v20）

> 评估日期：2026-03-05  
> 项目类型：Electron + React  
> 评估人：OpenCode  
> 评估范围：规模/结构质量/测试/覆盖率/构建与产物/安全与合规/维护性与扩展性/发布就绪  
> 评估基线：仓库 `Z:/Playground/CurrentWorking/MediaPlayerX`，版本 `0.8.0`，commit `bf68fcd`（工作区 clean）  
> 评估环境：OS Windows；Node `v22.13.1`；npm `10.9.2`；Vite `v7.3.1`；Electron `v40.4.1`

---

## 0. 结论摘要（Go/No-Go）

- **项目规模结论**：大型（核心业务代码 155,855 LOC，498 文件）。
- **功能复杂度结论**：高（Electron 文件系统服务链路 + 多主区 UI + 元数据/转码/字幕能力并行演进）。
- **总体质量结论**：**B**（P0/P1 阻断已清零，治理项进入持续收敛阶段）。
- **发布建议**：✅ **Go（可发布，建议携带治理观察）**。
- **阻断项（P0）**：无。
- **主要风险（Top 3）**：
  1) 结构相似（AST，Abstract Syntax Tree）基线扩大至 290 clusters / 846 matches。  
  2) 文本重复率（jscpd）较 v19 回升（3.04% -> 3.38%）。  
  3) 大文件规模上升（>1500 行文件 8 个）。

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
| 版本基线 | `git rev-parse --short HEAD` + `git status --porcelain` | ✅ | commit `bf68fcd`；工作区 clean |
| baseline-clean | `npm run baseline:verify-clean` | ✅ | `Working tree is clean.` |
| 代码规范 | `npm run lint` | ✅ | ESLint 通过（0 warning） |
| 测试（全量） | `npx vitest run --silent --reporter=dot` | ✅ | `848 passed / 1 skipped`（143 files） |
| 覆盖率 | `npx vitest run --coverage --silent --reporter=dot` | ✅ | `848 passed / 1 skipped`；coverage 已产出 |
| 稳定性复跑 | `npx vitest run --silent --reporter=dot` x3 | ✅ | `3/3` 通过 |
| 构建(全量) | `npm run build` | ✅ | `tsc -b && vite build` |
| 构建(Electron) | `npm run build:electron` | ✅ | `main.cjs/preload.cjs/worker` 产物成功 |
| 安全(依赖) | `npm audit --audit-level=high` | ✅ | `found 0 vulnerabilities` |
| 循环依赖 | `npx madge --extensions ts,tsx --ts-config tsconfig.json --circular src electron` | ✅ | 0 循环依赖（685 files） |
| 重复代码（文本） | `npx jscpd src electron` | ⚠️ | 重复率 **3.38%**，clones `192` |
| 结构相似（逻辑重复） | `npx jsinspect-plus -I -L -t 50 --reporter json --ignore "..." src electron` | ⚠️ | clusters `290`，matches `846` |
| 死代码 | `npx ts-prune -p tsconfig.json` | ✅ | 无输出 |
| i18n 约束 | `npm run i18n:check` | ✅ | `1573 keys, 2 locales` |
| UI 槽位治理 | `npm run theme:verify:slots` | ✅ | `UI slot governance check passed` |
| 依赖新鲜度 | `npm outdated` | ⚠️ | outdated `9`（major `3`） |

---

## 2. 质量门禁验证结果

| 检查项 | 优先级 | 结果 | 关键数字 | 证据 |
|---|---|---|---:|---|
| format:check | P0 | ✅ | scoped 检查通过 | `npm run format:check` |
| lint | P0 | ✅ | 0 warning | `npm run lint` |
| typecheck/build | P0 | ✅ | 构建通过 | `npm run build` |
| test | P0 | ✅ | `848 pass / 1 skip` | `npx vitest run --silent --reporter=dot` |
| coverage | P0 | ✅ | `848 pass / 1 skip` | `npx vitest run --coverage --silent --reporter=dot` |
| flaky-index（3次） | P0 | ✅ | `3/3` | 3 次复跑脚本 |
| audit(high/critical) | P0 | ✅ | `0 / 0` | `npm audit --audit-level=high` |
| architecture-circular | P1 | ✅ | `0` | `madge --circular` |
| 关键治理脚本（i18n/slot） | P1 | ✅ | i18n ✅ / slot ✅ | `npm run i18n:check` + `npm run theme:verify:slots` |
| jscpd-delta | P2 | ⚠️ | `3.04% -> 3.38%` | v19 vs v20 |
| logic-duplication-delta | P2 | ⚠️ | `272 -> 290 clusters` | `jsinspect-plus` |
| type-debt-delta | P2 | ✅ | `any=0`，`@ts-ignore=0`，`eslint-disable=0` | 统计脚本 |

---

## 3. 项目规模评估

### 3.1 实际业务行数（LOC）
- 前端业务源码：354 文件 / 108,497 行
- Electron 后端：144 文件 / 47,358 行
- 核心业务合计：498 文件 / **155,855 行**
- 测试代码：143 文件 / 41,915 行；测试/业务比：**26.89%**

### 3.2 模块与文件规模观察
- >1500 行文件 8 个，>1200 行文件 20 个。
- Top 大文件（不含测试）：
  - `electron/services/file-system-read/manageAdReviewService.ts`：1846
  - `src/components/MusicMainSection.tsx`：1807
  - `src/components/FullscreenLayer.tsx`：1747
  - `electron/registerBackendIpcHandlers.ts`：1583
  - `src/components/VideoMainSection.tsx`：1569

---

## 4. 结构与架构质量评估

### 4.1 分层结构与边界
- `contracts -> preload -> IPC -> repository -> UI` 分层仍可识别。
- 循环依赖（circular dependency）维持 0，未见分层回退迹象。
- 复杂度热点继续集中在主区大组件、IPC 注册聚合、文件系统服务编排链路。

### 4.2 结构健康度指标（本轮）
- `madge`：✅ 0 循环依赖（685 files）。
- `jscpd`：⚠️ 重复率 **3.38%**（192 clones，较 v19 回升）。
- `ts-prune`：✅ 未检出未使用导出。
- 关键治理脚本：✅ `i18n:check` 与 `theme:verify:slots` 均通过。

---

## 5. 逻辑重复与规则漂移专项

### 5.1 结构相似（AST）扫描结论
- 本次 `jsinspect-plus`：clusters `290`，matches `846`。
- 相对上次：新增 clusters `+18`（`272 -> 290`）。
- Top 重复簇（按 instances 排序）：
  - `fbbe0fc0a43cb07f136f621c5426548895293f49`：70 instances（样本 `src/components/AppShell.tsx`）
  - `bc32c001adedec248c5af8bab55abbf5b8052b42`：31 instances（样本 `src/components/SettingsPanel.impl.tsx`）
  - `78f171126d17aae5d6ca00255d2babf34ce1adca`：23 instances（样本 `src/features/app/buildFullscreenLayerProps.ts`）

### 5.2 规则漂移与收敛状态
- 规则清单总数：N/A；已单一实现：N/A；双实现+对齐测试：N/A；未对齐：N/A（当前缺少机读规则清单产物）。
- 本轮新增漂移风险：0（已完成 slot/token 对齐并通过治理脚本）。
- 与治理清单联动：`docs/30-全仓重复治理PR拆分清单-v1.md` 仍为首轮完成状态；建议追加 slot 规则对齐子任务。

---

## 6. 测试质量与稳定性评估

### 6.1 测试结果
- 全量测试：`848 passed / 1 skipped`（143 files）。
- 覆盖率测试：`848 passed / 1 skipped`。
- 覆盖率汇总：Statements `53.71%` / Branches `48.17%` / Functions `54.61%` / Lines `53.93%`。
- 失败用例分布：无。

### 6.2 稳定性结论（Flaky Index）
- 同一 commit 连跑 3 次：`3/3` 通过。
- 结论：当前测试链路在本次口径下稳定。
- 发布影响：测试链路与关键治理脚本均稳定，当前可进入发布窗口。

---

## 7. 构建与产物质量评估

### 7.1 前端构建（Vite）
- `vite build`：通过。
- 主要 JS chunk：`feature-app-runtime` 465.14 kB、`index` 425.11 kB、`feature-backend-runtime` 351.08 kB、`vendor-react` 190.26 kB。
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
- `npm outdated`：outdated `9`，其中 major `3`。
- 风险解释：当前无发布阻断；依赖升级可按风险分层滚动推进。

---

## 9. 长期稳定性指标（趋势）

### 9.1 热点（90 天）
- 变更次数 Top 10（摘录）：
  - `src/features/app/useAppTopLayerState.ts`：90
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
- 发布前建议：
  1) 保持 `format/lint/test/coverage/build/audit` 全绿快照入库。  
  2) 对 `jscpd + jsinspect-plus` 启用 delta 守门，避免继续放大。  
  3) 优先拆分 >1500 行热点文件，降低后续回归成本。  
  4) 将 slot/token 校验纳入 PR 必跑清单，防止文档与实现再次漂移。

---

## 11. 风险矩阵与治理闭环

| 风险 | 严重度 | 概率 | 证据 | 当前状态 | 建议 | Owner | 截止 |
|---|---|---|---|---|---|---|---|
| 逻辑重复基线继续扩大 | 中 | 高 | `jsinspect-plus` 290 clusters / 846 matches | 持续中 | 建立 cluster 白名单 + PR 增量拦截 | 前后端 | 2026-03-12 |
| 文本重复率回升 | 中 | 中 | `jscpd` 3.38%（较 v19 上升） | 持续中 | 以模块为单位推进重复代码收敛并设 delta 阈值 | 前后端 | 2026-03-12 |
| 大文件热点持续增厚 | 中 | 中 | >1500 行文件 8 个 | 持续中 | 先拆分 `manageAdReviewService` 与主区大组件 | 前后端 | 2026-03-21 |

### 11.1 治理闭环状态
- 新增问题：1（重复率回升）。
- 已关闭问题：4（coverage 稳定性、flaky-index、lint warning、slot 规则漂移）。
- 接受风险：1（结构相似基线较高，按 delta 门禁持续治理）。

---

## 12. 对比上版变化（v19 -> v20）

| 项 | v19 | v20 | 变化解读 |
|---|---|---|---|
| 评估基线 commit | `463de2a` | `bf68fcd` | 基线更新 |
| 工作区状态 | dirty | clean | 可复现性提升 |
| 核心业务代码规模 | 149,191 | 155,855 | 持续增长（+6,664） |
| 核心业务文件数 | 496 | 498 | 小幅增长（+2） |
| 测试规模 | 40,611 行 / 141 文件 | 41,915 行 / 143 文件 | 测试规模继续提升 |
| lint | ✅ | ✅ | 持续通过（0 warning） |
| test | ✅（815 pass / 1 skip） | ✅（848 pass / 1 skip） | 通过且规模增加 |
| coverage | ❌（主文）/✅（补充修复） | ✅（848 pass / 1 skip） | 覆盖率链路稳定 |
| madge | ✅（0） | ✅（0） | 结构门禁维持 |
| jscpd | ✅（3.04%） | ⚠️（3.38%） | 重复率回升 |
| logic duplication | ⚠️（272 clusters） | ⚠️（290 clusters） | 结构相似规模扩大 |
| flaky-index | ❌（2/3） | ✅（3/3） | 稳定性恢复 |
| 综合评级 | B- | B | P0/P1 阻断清零，进入可发布状态 |

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
- `npx jsinspect-plus -I -L -t 50 --reporter json --ignore "node_modules|dist|dist-electron|release|coverage|__tests__|__mocks__|\.test\.|\.spec\." src electron`
- `node -e '<LOC/类型债/90天热点统计脚本>'`

---

## 14. 与治理清单联动状态

| 条目 | 状态 | 备注 |
|---|---|---|
| `docs/30-全仓重复治理PR拆分清单-v1.md` | ✅ 首轮完成 | PR-01 ~ PR-07 仍保持完成 |
| `docs/10-ui_definition.md` & `docs/11-token_design.md` | ✅ 已对齐 | `theme:verify:slots` 已通过 |
| `docs/14-project-evalutation-template.md` | ✅ 已对齐 | 本版按模板完整产出 |
