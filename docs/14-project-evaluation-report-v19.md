# MediaPlayerX 项目评估报告（v19）

> 评估日期：2026-03-03  
> 项目类型：Electron + React  
> 评估人：OpenCode  
> 评估范围：规模/结构质量/测试/覆盖率/构建与产物/安全与合规/维护性与扩展性/发布就绪  
> 评估基线：仓库 `C:/opencode/MediaPlayer`，版本 `0.8.0`，commit `463de2a`（工作区 dirty）  
> 评估环境：OS Windows；Node `v22.15.0`；npm `11.4.1`；Vite `v7.3.1`；Electron `v40.4.1`

---

## 0. 结论摘要（Go/No-Go）

- **项目规模结论**：大型（核心业务代码 149,191 LOC，496 文件）。
- **功能复杂度结论**：高（Electron 文件系统服务 + 多模式主区 + 字幕/ASR + 管理链路并行演进）。
- **总体质量结论**：**B-**（结构与基础门禁明显恢复，但测试稳定性仍存在发布风险）。
- **发布建议**：❌ **No-Go（暂不建议发布）**。
- **阻断项（P0）**：
  1) `flaky-index` 未达标（同一 commit 连跑 3 次仅 2 次通过）。  
  2) 覆盖率链路存在不稳定失败（独立 `--coverage` 复现 2 例失败）。
- **主要风险（Top 3）**：
  1) `electron/fileSystemReadService.impl.import-management-runtime.test.ts` 存在非确定性失败。  
  2) 结构相似（逻辑重复）基线规模较高（272 clusters / 804 matches），需进入 delta 治理。  
  3) `theme:verify:slots` 脚本路径失配（`docs/ui_definition.md` 不存在），治理脚本不可执行。

---

## 1. 评估方法与口径

### 1.1 统计口径
- 业务代码范围：`src/**/*.ts(x)` + `electron/**/*.ts(x)`；排除 `.test.*`、`.d.ts`。
- 测试范围：`src` + `electron` 下 `.test.ts/.test.tsx`。
- LOC 与规模度量：前后端业务与测试分开统计。
- 结构指标：`madge`（循环依赖）、`jscpd`（文本重复）、`jsinspect-plus`（结构相似/逻辑重复）、`ts-prune`（未使用导出）。
- 稳定性指标：`flaky index`（同一 commit 连跑 3 次）。

### 1.2 分级门禁定义（P0/P1/P2）
- **P0（发布阻断）**：`format/lint/build/test/coverage/audit/high&critical/flaky`。
- **P1（高风险回归）**：`madge=0`、关键治理脚本可执行（i18n/slot）、跨层规则漂移可追踪。
- **P2（治理门禁）**：重复率、逻辑重复、类型债、热点治理，优先以 delta（不允许新增）推进。

### 1.3 验证命令与结果（本次实际执行）

| 类别 | 实际命令 | 结果 | 关键信息 |
|---|---|---|---|
| 版本基线 | `git rev-parse --short HEAD` + `git status --porcelain` | ⚠️ | commit `463de2a`；工作区 dirty（`docs/ref/new-analysis-method.md` 未跟踪） |
| baseline-clean | `npm run baseline:verify-clean` | ❌ | 输出 `Working tree is not clean` |
| 代码规范 | `npm run lint` | ✅ | ESLint 通过 |
| 测试（全量） | `npx vitest run --silent --reporter=dot` | ✅ | `815 passed / 1 skipped`（141 files） |
| 覆盖率 | `npx vitest run --coverage --silent --reporter=dot` | ❌ | `2 failed / 813 passed / 1 skipped` |
| 稳定性复跑 | `npx vitest run --silent --reporter=dot` x3 | ❌ | `2/3` 通过；首轮失败命中 import-management-runtime 用例 |
| CI 等价门禁 | `npm run quality:ci` | ⚠️ | 本次单轮通过（含 coverage/jscpd），与复跑结果不一致，提示非确定性 |
| 构建(全量) | `npm run build` | ✅ | `tsc -b && vite build` 通过 |
| 构建(Electron) | `npm run build:electron` | ✅ | `main.cjs/preload.cjs/worker` 产物成功 |
| 安全(依赖) | `npm audit --audit-level=high` | ✅ | `found 0 vulnerabilities` |
| 循环依赖 | `npx madge --extensions ts,tsx --ts-config tsconfig.json --circular src electron` | ✅ | 0 循环依赖（681 files） |
| 重复代码（文本） | `npx jscpd src electron` | ✅ | 总重复率 **3.04%**（193 clones） |
| 结构相似（逻辑重复） | `npx jsinspect-plus -I -L -t 50 --reporter json --ignore "..." src electron` | ⚠️ | clusters `272`，matches `804` |
| 死代码 | `npx ts-prune -p tsconfig.json` | ✅ | 无输出 |
| i18n 约束 | `npm run i18n:check` | ✅ | `1509 keys, 2 locales` |
| UI 槽位治理 | `npm run theme:verify:slots` | ❌ | `ENOENT: docs/ui_definition.md` |
| 依赖新鲜度 | `npm outdated` | ⚠️ | outdated `9`（潜在 major `3`） |

---

## 2. 质量门禁验证结果

| 检查项 | 优先级 | 结果 | 关键数字 | 证据 |
|---|---|---|---:|---|
| format:check | P0 | ✅ | scoped 无变更 | `npm run quality:ci` |
| lint | P0 | ✅ | 无告警输出 | `npm run lint` |
| typecheck/build | P0 | ✅ | 构建通过 | `npm run build` |
| test | P0 | ✅ | `815 pass / 1 skip` | `npx vitest run --silent --reporter=dot` |
| coverage | P0 | ❌ | `2 failed / 813 pass / 1 skip` | `npx vitest run --coverage --silent --reporter=dot` |
| flaky-index（3次） | P0 | ❌ | `2/3` 通过 | 3 次复跑脚本 |
| audit(high/critical) | P0 | ✅ | `0 / 0` | `npm audit --audit-level=high` |
| architecture-circular | P1 | ✅ | `0` | `madge --circular` |
| 关键治理脚本（i18n/slot） | P1 | ❌ | i18n ✅ / slot ❌ | `npm run i18n:check` + `npm run theme:verify:slots` |
| jscpd-delta | P2 | ✅ | `3.51% -> 3.04%` | v18 vs v19 |
| logic-duplication-delta | P2 | ⚠️ | 首次纳入：`272 clusters` | `jsinspect-plus` |
| type-debt-delta | P2 | ⚠️ | `any=14`，`@ts-ignore=0`，`eslint-disable=0` | 统计脚本 |

---

## 3. 项目规模评估

### 3.1 实际业务行数（LOC）
- 前端业务源码：352 文件 / 103,382 行
- Electron 后端：144 文件 / 45,809 行
- 核心业务合计：496 文件 / **149,191 行**
- 测试代码：141 文件 / 40,611 行；测试/业务比：**27.22%**

### 3.2 模块与文件规模观察
- >1500 行文件 5 个，>1200 行文件 16 个。
- Top 大文件（不含测试）：
  - `src/components/MusicMainSection.tsx`：1807
  - `src/components/VideoMainSection.tsx`：1565
  - `electron/registerBackendIpcHandlers.ts`：1558
  - `electron/fileSystemReadFacade.impl.ts`：1537
  - `electron/services/file-system-read/librarySnapshotService.ts`：1516

---

## 4. 结构与架构质量评估

### 4.1 分层结构与边界
- contracts / preload / IPC / repository / UI 分层仍可识别，未出现 v18 的新增环回退。
- `madge` 已恢复为 0，`music-visualizer` 环依赖问题已消除。
- 复杂度热点仍集中在主区组件、IPC 注册、文件系统服务链路。

### 4.2 结构健康度指标（本轮）
- `madge`：✅ 0 循环依赖（681 files）。
- `jscpd`：✅ 重复率 **3.04%**（193 clones）。
- `ts-prune`：✅ 未检出未使用导出。
- 治理脚本：⚠️ `i18n:check` 通过；`theme:verify:slots` 因文档路径失配失败。

---

## 5. 逻辑重复与规则漂移专项

### 5.1 结构相似（AST）扫描结论
- 本次 `jsinspect-plus`：clusters `272`，matches `804`。
- 相对上次：**首次纳入基线**（v18 未采集，暂无法给出新增/关闭 delta）。
- Top 重复簇（按 instances 排序）：
  - `ad2e87...`：71 instances（集中在 `src/components/*` 的 props 解构/壳层拼装模式）。
  - `9ce7dd...`：31 instances（集中在 `src/components/*Controller` 与 `settings` 链路配置拼装）。
  - `78f171...`：23 instances（集中在 `src/features/app/build*Props.ts` 与状态构建链路）。

### 5.2 规则漂移与收敛状态
- 本轮参考 `docs/30-全仓重复治理PR拆分清单-v1.md`，PR-01 ~ PR-07 已完成，说明“重复治理首轮”已交付。
- 规则级风险从“是否完成 PR”升级到“是否有持续对齐机制”，当前仍缺少可机读 `rule list + parity tests` 指标化产物。
- 建议下一版固定输出：规则清单总数、单一实现数、双实现+对齐测试数、未对齐数。

---

## 6. 测试质量与稳定性评估

### 6.1 测试结果
- 全量测试：`815 passed / 1 skipped`（141 files）。
- 覆盖率测试（独立执行）：`2 failed / 813 passed / 1 skipped`。
- 覆盖率汇总（取 `quality:ci` 单轮结果）：Statements `53.74%` / Branches `48.13%` / Functions `54.62%` / Lines `53.96%`。
- 覆盖率独立执行失败用例：
  - `electron/fileSystemReadService.impl.import-management-runtime.test.ts`：音乐文件夹含音频与图片时，图片目录归并断言失败
  - `src/__tests__/App.state.test.tsx`：Sidebar 包节点 fallback 文案用例超时（5000ms）

### 6.2 稳定性结论（Flaky Index）
- 同一 commit 连跑 3 次：`2/3` 通过（首轮失败命中 import-management-runtime 用例）。
- 结论：当前测试链路仍存在非确定性波动。
- 发布影响：即使 `quality:ci` 单轮可通过，仍可能在 CI/发布窗口随机阻断。

---

## 7. 构建与产物质量评估

### 7.1 前端构建（Vite）
- `vite build` 成功。
- 主要 JS chunk：`feature-app-runtime` 454.64 kB、`index` 381.88 kB、`feature-backend-runtime` 340.59 kB、`vendor-react` 190.26 kB。
- 未出现 circular chunk warning。

### 7.2 全量构建（TypeScript + Vite）
- `npm run build` 通过（`tsc -b && vite build`）。

### 7.3 Electron 构建
- `npm run build:electron` 通过；`main.cjs`（4.3mb）、`preload.cjs`（620.6kb）及 Worker 产物生成成功。

---

## 8. 安全与依赖健康评估

### 8.1 依赖安全
- `npm audit --audit-level=high`：`found 0 vulnerabilities`。

### 8.2 依赖新鲜度
- `npm outdated`：9 个依赖存在更新窗口。
- 潜在 major 变更：`@eslint/js`、`eslint`、`eslint-plugin-react-refresh`。
- 其余多为 patch/minor，可按风险分组滚动升级。

---

## 9. 长期稳定性指标（趋势）

### 9.1 热点（90 天）
- 变更次数 Top 10（摘录）：
  - `src/features/app/useAppTopLayerState.ts`：86
  - `src/App.test.tsx`：84
  - `src/features/app/useAppWorkspaceProps.ts`：76
  - `src/components/MusicMainSection.tsx`：73
  - `src/components/ImageMainSection.tsx`：71
  - `electron/registerBackendIpcHandlers.ts`：69
  - `src/contracts/settings.ts`：67
  - `src/store/useUiStore.ts`：65
  - `src/components/VideoMainSection.tsx`：63
  - `electron/preload.ts`：62

### 9.2 类型债
- `any`：14
- `@ts-ignore`：0
- `eslint-disable`：0

### 9.3 复杂度
- 复杂度门禁状态：未接入自动化（尚未纳入 ESLint complexity/cognitive-complexity 报表）。
- 建议：下一版补充复杂度 Top10 与超阈值函数计数，并纳入 P2 delta 门禁。

---

## 10. 发布就绪度评估

- 结论：**No-Go（当前不可发布）**。
- 解除阻断条件：
  1) 修复/隔离 `import-management-runtime` 非确定性失败，达成 test 3/3 稳定通过。  
  2) 修复覆盖率链路不稳定（当前独立 `--coverage` 复现 2 例失败），达成 coverage 3/3 稳定通过。  
  3) 修复 `theme:verify:slots` 路径失配，恢复治理脚本可执行。  
  4) 在 clean workspace 重新执行 `quality:ci + madge + jsinspect-plus + ts-prune + i18n:check` 全绿并留档。

---

## 11. 风险矩阵与治理闭环

| 风险 | 严重度 | 概率 | 证据 | 当前状态 | 建议 | Owner | 截止 |
|---|---|---|---|---|---|---|---|
| 测试链路非确定性导致发布阻断 | 高 | 高 | 覆盖率独立执行失败 + flaky 仅 2/3 | 阻断中 | 先修复 import-management-runtime 用例并做 3 次连续复跑 | 前端/后端/测试 | 2026-03-04 |
| 逻辑重复基线规模较高 | 中 | 高 | `jsinspect-plus` 272 clusters / 804 matches | 持续中 | 建立 cluster 基线与 delta 门禁，Top cluster 流入治理清单 | 前后端 | 2026-03-07 |
| UI 槽位治理脚本失效 | 中 | 中 | `theme:verify:slots` ENOENT (`docs/ui_definition.md`) | 待修复 | 同步脚本路径到 `docs/10-ui_definition.md` 与 `docs/11-token_design.md` | 前端/文档 | 2026-03-04 |
| 核心规模持续增长 | 中 | 高 | LOC `149,191`；>1500 行文件仍为 5 | 持续中 | 继续拆分热点文件并叠加复杂度阈值 | 前后端 | 2026-03-21 |

### 11.1 治理闭环状态
- 新增问题：3（flaky、逻辑重复基线、slot 脚本失效），均已可映射到治理动作。
- 已关闭问题：2（v18 的循环依赖回退已清零；test 全量失败由 6 例降为 0）。
- 接受风险：1（工作区 dirty 导致基线可复现性下降，短期接受但发布前必须 clean）。

---

## 12. 对比上版变化（v18 -> v19）

| 项 | v18 | v19 | 变化解读 |
|---|---|---|---|
| 评估基线 commit | `8578d82` | `463de2a` | 基线更新 |
| 工作区状态 | clean | dirty | 可复现性回退（需发布前恢复） |
| 核心业务代码规模 | 148,740 | 149,191 | 持续增长（+451） |
| 核心业务文件数 | 483 | 496 | 增长（+13） |
| 测试规模 | 39,806 行 / 131 文件 | 40,611 行 / 141 文件 | 测试规模提升 |
| lint | ✅ | ✅ | 持续通过 |
| test | ❌（777 pass / 6 fail / 1 skip） | ✅（815 pass / 1 skip） | 明显修复 |
| coverage | ❌（777 pass / 6 fail / 1 skip） | ❌（813 pass / 2 fail / 1 skip，独立执行） | 失败收敛但未清零 |
| madge | ❌（1） | ✅（0） | 结构门禁恢复 |
| jscpd | ✅（3.51%） | ✅（3.04%） | 重复率下降 |
| 逻辑重复(AST) | N/A | ⚠️（272 clusters） | 新增监控维度，形成首版基线 |
| flaky-index | N/A | ❌（2/3） | 新增稳定性指标并发现随机失败 |
| 综合评级 | C+ | B- | 质量回升，但稳定性不足仍阻断发布 |

---

## 13. 附录：本轮执行命令清单

- `git rev-parse --short HEAD`
- `git status --porcelain`
- `node -v && npm -v`
- `node -p "require('./package.json').version"`
- `npx vite --version`
- `npx electron --version`
- `npm run baseline:verify-clean`
- `npm run lint`
- `npx vitest run --silent --reporter=dot`
- `npx vitest run --coverage --silent --reporter=dot`
- `npm run quality:ci`
- `npm run build`
- `npm run build:electron`
- `npm audit --audit-level=high`
- `npx madge --extensions ts,tsx --ts-config tsconfig.json --circular src electron`
- `npx jscpd src electron`
- `npx ts-prune -p tsconfig.json`
- `npm run i18n:check`
- `npm run theme:verify:slots`
- `npm outdated`
- `npx jsinspect-plus -I -L -t 50 --reporter json --ignore "node_modules|dist|dist-electron|release|coverage|__tests__|__mocks__|\\.test\\.|\\.spec\\." src electron`
- `node -e '<LOC 统计脚本>'`
- `node -e '<any/@ts-ignore/eslint-disable 统计脚本>'`
- `node -e '<90 天热点统计脚本>'`
- `node -e '<3 次复跑稳定性脚本>'`

---

## 14. 与治理清单联动状态

| 条目 | 状态 | 备注 |
|---|---|---|
| `docs/30-全仓重复治理PR拆分清单-v1.md` | ✅ 首轮完成 | PR-01 ~ PR-07 已全部勾选完成 |
| `docs/ref/new-analysis-method.md` | ✅ 已吸收 | v19 已新增 AST 结构相似与 flaky 指标 |
| 评估模板化 | ✅ 已落地 | 新增 `docs/14-project-evalutation-template.md` |

---

## 15. 修复补充（v19 后续执行）

> 补充日期：2026-03-03（同日）

### 15.1 已完成修复
- `src/__tests__/App.rendering.test.tsx`：为「默认渲染检索按钮与主区域」用例补充 `uiLongTestTimeoutMs=25_000`，避免在全量覆盖率场景下 5s 超时。

### 15.2 复测结果（修复后）
- 覆盖率全量：`npx vitest run --coverage --silent --reporter=dot` ✅（`815 passed / 1 skipped`）。
- 非覆盖率稳定性：`npx vitest run --silent --reporter=dot` 连续 3 次 ✅（均 `815 passed / 1 skipped`）。
- 覆盖率稳定性：`npx vitest run --coverage --silent --reporter=dot` 连续 3 次 ✅（均 `815 passed / 1 skipped`）。
- 槽位治理脚本：`npm run theme:verify:slots` ✅（passed）。
- lint：`npm run lint` ✅。

### 15.3 状态更新
- 原 P0 阻断（flaky-index、coverage 不稳定）已解除。
- 原 P1 阻断（`theme:verify:slots` 不可执行）已解除。
- 当前剩余发布前条件：工作区 clean（`baseline:verify-clean`）并按发布流程留档一次最终门禁快照。
