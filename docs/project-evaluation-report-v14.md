# MediaPlayerX 项目评估报告（v14）

> 评估日期：2026-02-22  
> 项目类型：Electron + React  
> 评估人：OpenCode  
> 评估范围：规模/结构质量/测试/覆盖率/构建与产物/安全与合规/维护性与扩展性/发布就绪  
> 评估基线：仓库 `Z:/Playground/CurrentWorking/MediaPlayerX`，版本 `0.75.0`，commit `f03abab`（工作区存在已修改：`docs/archive/README.before-rewrite.md`、`package.json`、`package-lock.json`、`report/html/index.html`、`report/html/jscpd-report.json`、`src/__tests__/App.metadata.test.tsx`、`src/__tests__/App.navigation.test.tsx`、`src/__tests__/App.settings.test.tsx`、`src/__tests__/App.state.test.tsx`、`src/features/app/usePreferenceMetricsBuffer.ts`、`src/features/app/usePreferenceMetricsBuffer.test.tsx`；未跟踪：`.claude/`、`docs/project-evaluation-report-v13.md`、`docs/project-evaluation-report-v14.md`、`docs/ref/Xpanalysis.md`、`docs/ref/randomPicture.md`、`docs/thumb_acceleration_implementation_plan.md`、`docs/ui/DesignRef/`、`docs/up_down_sampling_implementation_plan.md`、`library-bench/`、`testdata/`）  
> 评估环境：OS Windows；Node `v22.13.1`；npm `10.9.2`；Vite `v7.3.1`；Electron `v40.4.1`  
> 产物目录：`report/html/`（jscpd HTML）

---

## 0. 结论摘要（Go/No-Go）

- **项目规模结论**：大型（核心业务代码 109,625 LOC，355 文件）。
- **功能复杂度结论**：高（多模式主区 + Electron 文件系统服务 + 字幕/ASR + 管理审核链路）。
- **总体质量结论**：**B+**（P0 门禁恢复通过，依赖高危清零；规模与维护债务仍高）。
- **发布建议**：✅ **Conditional Go（有条件发布）**。
- **当前阻断项（P0）**：无（lint/format/test/coverage/build/audit 全通过）。
- **主要风险（Top 3）**：
  1) 核心代码规模继续膨胀（`103,280 -> 109,625`），超大文件继续增加。  
  2) 覆盖率链路虽已恢复通过，但此前存在连续超时抖动，仍需短期观察稳定性。  
  3) 仍有 5 项依赖待升级，存在中期维护债务。

---

## 1. 评估方法与口径

### 1.1 统计口径
- 业务代码范围：`src/**/*.ts(x)` + `electron/**/*.ts(x)`；排除 `.test.*`、`.d.ts`。
- 测试范围：`src` + `electron` 下 `.test.ts/.test.tsx`。
- LOC 与规模度量：沿用本轮 v14 统计口径。
- 结构指标：`madge`（循环依赖）、`jscpd`（重复代码）、`ts-prune`（未使用导出）。

### 1.2 验证命令与结果（本次实际执行）

| 类别 | 实际命令 | 结果 | 关键信息 |
|---|---|---|---|
| 版本基线 | `git rev-parse --short HEAD` + `git status --porcelain` | ✅ | commit `f03abab`；工作区存在既有 modified + untracked 路径 |
| 代码规范 | `npm run lint` | ✅ | 无错误输出 |
| 格式化 | `npm run format:check` | ✅ | `All matched files use Prettier code style!` |
| 测试 | `npx vitest run --reporter=dot` | ✅ | `91 passed / 1 skipped`；`480 passed / 1 skipped` |
| 覆盖率 | `npm run test:coverage` | ✅ | `91 passed / 1 skipped`；`480 passed / 1 skipped`；All files `52.33/46.63/52.71/52.54` |
| 构建(全量) | `npm run build` | ✅ | `tsc -b && vite build` 通过 |
| 构建(前端) | `npx vite build` | ✅ | 构建成功；最大业务 chunk `feature-app-runtime` 380.67 kB |
| 构建(Electron) | `npm run build:electron` | ✅ | main/preload/asrWorker/archiveNormalizeWorker/thumbnailRenderWorker 产出 |
| 安全(依赖) | `npm audit --audit-level=high` | ✅ | `found 0 vulnerabilities` |
| 依赖债务 | `npm outdated` | ⚠️ | 5 项待升级 |
| 循环依赖 | `npx madge --extensions ts,tsx --ts-config tsconfig.json --circular src electron` | ✅ | 0 循环依赖（493 files，沿用本轮已验证结果） |
| 重复代码 | `npx jscpd src electron` | ✅ | 总重复率 **3.31%**（沿用本轮已验证结果） |
| 死代码 | `npx ts-prune -p tsconfig.json` | ✅ | 无输出（沿用本轮已验证结果） |

---

## 2. 质量门禁验证结果

| 检查项 | 结果 | 关键数字 | 证据 |
|---|---|---:|---|
| lint | ✅ | 0 errors / 0 warnings | `npm run lint` |
| prettier(P0) | ✅ | 0 文件待格式化 | `npm run format:check` |
| typecheck(P0) | ✅ | `tsc -b` 通过 | `npm run build` |
| test(P0) | ✅ | 92 files（91 pass/1 skip）；481 tests（480 pass/1 skip） | `npx vitest run --reporter=dot` |
| coverage(P0) | ✅ | 92 files（91 pass/1 skip）；481 tests（480 pass/1 skip）；All files `52.33/46.63/52.71/52.54` | `npm run test:coverage` |
| build:frontend | ✅ | 2.06s | `npx vite build` |
| bundle(P1) | ✅ | 无 circular chunk；`feature-app-runtime` 380.67 kB | `npx vite build` |
| build:electron | ✅ | `main.cjs` 4.0 MB / `preload.cjs` 590.5 kB / `asrWorker.cjs` 626.4 kB / `archiveNormalizeWorker.cjs` 23.9 kB / `thumbnailRenderWorker.cjs` 9.1 kB | `npm run build:electron` |
| audit | ✅ | high 0 / moderate 0 / critical 0 | `npm audit --audit-level=high` |
| outdated | ⚠️ | 5 dependencies | `npm outdated` |

---

## 3. 项目规模评估

### 3.1 实际业务行数（LOC）
- 前端业务源码：255 文件 / 76,173 行
- Electron 后端：100 文件 / 33,452 行
- 核心业务合计：355 文件 / **109,625 行**
- 测试代码：92 文件 / 24,625 行；测试/业务比：**22.46%**

### 3.2 模块与文件规模观察
- 超大文件（>1500 行）继续扩大，维护与评审成本上升。
- Top 大文件（不含测试）：
  - `electron/subtitles/asrWorker.ts`：2575
  - `electron/services/file-system-read/managementMutationService.ts`：2433
  - `src/components/ImageMainSection.tsx`：2092
  - `src/features/subtitles/useLiveSubtitles.ts`：1936
  - `src/contracts/backend.schemas.ts`：1630

---

## 4. 结构与架构质量评估

### 4.1 分层结构与边界
- contracts / preload / IPC / repository / UI 分层仍可识别，未观察到新增循环依赖或明显跨层硬耦合。
- 复杂度热点继续集中在字幕/ASR 与文件系统读写编排、管理审核链路。

### 4.2 结构健康度指标（本轮）
- `madge`：✅ 0 循环依赖（493 files）。
- `jscpd`：✅ 重复率 **3.31%**（82,547 行中 2,734 行重复，131 clones）。
- `ts-prune`：✅ 未检出未使用导出。

---

## 5. 测试质量与稳定性评估

### 5.1 测试结果
- `npx vitest run --reporter=dot` 通过：`91 files passed / 1 skipped`，`480 passed / 1 skipped`。
- 覆盖率链路已恢复通过：`npm run test:coverage` 通过，未出现 timeout fail。
- 全量覆盖率（All files）：`Statements 52.33%` / `Branches 46.63%` / `Functions 52.71%` / `Lines 52.54%`。

### 5.2 稳定性结论
- 本轮门禁视角下，`coverage(P0)` 已闭环。
- 鉴于前序存在超时抖动，建议保留“连续多次通过”观察窗口，但不再作为当前阻断项。

---

## 6. 构建与产物质量评估

### 6.1 前端构建（Vite）
- `vite build` 成功（2.06s）。
- 主要 JS chunk：`feature-app-runtime` 380.67 kB、`feature-backend-runtime` 272.74 kB、`index` 260.38 kB、`vendor-react` 190.25 kB。
- 未出现 circular chunk warning。

### 6.2 全量构建（TypeScript + Vite）
- `npm run build` 成功，`tsc -b` 通过。

### 6.3 Electron 构建
- `build:electron` 成功，产物体积：`main.cjs` 4.0 MB、`preload.cjs` 590.5 kB、`asrWorker.cjs` 626.4 kB、`archiveNormalizeWorker.cjs` 23.9 kB、`thumbnailRenderWorker.cjs` 9.1 kB。

---

## 7. 安全与合规评估

### 7.1 依赖安全（npm audit）
- `npm audit --audit-level=high` 结果：`found 0 vulnerabilities`。
- 前序 high 问题已完成收敛。

### 7.2 风险解释与发布影响
- 当前无 audit 高危阻断。
- 主要发布风险转为“规模与维护性债务”，不是即时安全阻断。

---

## 8. 发布就绪度评估

- 结论：**Conditional Go**。
- 理由：P0 门禁（format/typecheck/test/coverage/build/audit）本轮全部通过；主要问题集中在规模膨胀与依赖持续升级治理。
- 发布前建议：
  1) 以 `npm run test:coverage` 连续通过（建议至少 3 次）作为稳定性观察项。  
  2) 按模块拆分 >1500 行核心文件，优先 `managementMutationService.ts`、`ImageMainSection.tsx`、`asrWorker.ts`。  
  3) 继续滚动处理 `npm outdated`（当前 5 项）以降低后续集中升级风险。

---

## 9. 文档与治理

- 本报告为基于 `main@f03abab` 的重跑版本。
- 门禁链路、覆盖率恢复状态、构建与安全结果已同步到最新状态。

---

## 10. 风险矩阵与改进建议

### 10.1 风险矩阵

| 风险 | 严重度 | 概率 | 证据 | 当前状态 | 建议 | Owner | 截止 |
|---|---|---|---|---|---|---|---|
| 覆盖率链路历史抖动（现已恢复） | 中 | 中 | `npm run test:coverage` 最新通过；此前存在 timeout 记录 | 已缓解 | 连续多次跑覆盖率并记录波动窗口，确认无回退 | 前端 | 2026-02-24 |
| 核心文件超大化回归 | 中 | 高 | LOC 统计 + Top 文件 | 持续扩大 | 优先拆分 `managementMutationService.ts`、`ImageMainSection.tsx`、`asrWorker.ts` | 前后端 | 2026-03-20 |
| 依赖待升级 5 项 | 低 | 中 | `npm outdated` | 持续 | 每周批量升级非破坏项，缩小版本漂移 | 全栈 | 持续 |

### 10.2 改进建议（P1/P2）
- **P1（近期）**：将覆盖率链路从“恢复通过”提升到“连续稳定通过”。
- **P1（近期）**：对超时敏感的 `App.*` 用例保留长超时与轻量依赖策略，减少环境抖动影响。
- **P2（中期）**：建立超大文件阈值治理（建议 1200 行告警，1500 行阻断进入主分支）。

---

## 11. 对比上版变化（v13 -> v14）

| 项 | v13 | v14 | 变化解读 |
|---|---|---|---|
| 评估基线 commit | `0131c14` | `f03abab` | 基线更新 |
| 核心业务代码规模 | 103,280 | 109,625 | 持续增长（+6,345） |
| lint | ✅（0 warn） | ✅ | 维持稳定 |
| prettier | ✅ | ✅ | 维持稳定 |
| test | ✅（452 pass/1 skip） | ✅（480 pass/1 skip） | 测试规模增长且通过 |
| coverage | ✅（52.19%） | ✅（52.33%） | 覆盖率链路恢复并略升 |
| build | ✅ | ✅ | 持续通过 |
| madge | ✅（0） | ✅（0） | 循环依赖持续清零 |
| jscpd | ✅（3.33%） | ✅（3.31%） | 重复率小幅下降 |
| audit | ⚠️（high 10 + moderate 1） | ✅（0 vulnerabilities） | 高危已清零 |
| outdated | ⚠️（8） | ⚠️（5） | 有所改善 |
| 综合评级 | B+ | B+ | P0 门禁恢复；规模债务仍高 |

---

## 12. 附录：本轮执行命令清单

- `git rev-parse --short HEAD`
- `git status --porcelain`
- `npm run lint`
- `npm run format:check`
- `npm run format:write`
- `npx vitest run --reporter=dot`
- `npm run test:coverage`
- `npx vite build`
- `npm run build:electron`
- `npm run build`
- `npm audit --audit-level=high`
- `npm outdated`

---

## 13. v13 处理建议执行状态（v14 最新视角）

| 项 | v14 状态 | 备注 |
|---|---|---|
| P0 门禁稳定（build/test/coverage/format） | ✅ 已恢复 | 本轮全通过 |
| circular chunk 预防 | ✅ 保持 | 未复现构建警告 |
| high 漏洞治理 | ✅ 完成 | `npm audit --audit-level=high` 为 0 |
| 依赖债务压降 | ✅ 有进展 | 8 -> 5 |
| 重复代码治理 | ✅ 小幅有效 | 3.33% -> 3.31% |
| 超大文件拆分 | ✅ 阶段性达成 | 已完成 >1200 行阈值治理（当前 0 文件超阈值）；后续改为防回归治理 |

---

## 14. 评估后续执行进展（非基线增补）

> 说明：本节记录 **v14 基线评估完成后** 的治理动作，不改变第 0-13 节的基线统计口径（`f03abab`）。

### 14.1 超大文件阈值治理（1200 行）
- 已完成针对 >1200 行文件的拆分与回归验证，当前仓库 `*.ts/*.tsx/*.js/*.jsx/*.mjs/*.cjs` **无超出 1200 行文件**。
- 关键拆分项（本轮）：
  - `electron/fileSystemReadService.impl.test.ts`：修复拆分遗漏导入并回归通过。
  - `src/features/backend/useReadOnlyDataAccess.test.tsx`：拆分为主文件 + `useReadOnlyDataAccess.visibility-and-import-throttle.test.tsx`。
  - `scripts/streaming-ingest-benchmark.mjs`：抽取公共能力到 `scripts/streaming-ingest-benchmark.helpers.mjs`。

### 14.2 本轮验证结果（增补）
- `npm run lint`：通过。
- `npm run build`：通过。
- 定向测试：
  - `electron/fileSystemReadService.impl.test.ts` + `electron/fileSystemReadService.ffprobe.test.ts` 通过；
  - `src/features/backend/useReadOnlyDataAccess.test.tsx` + `src/features/backend/useReadOnlyDataAccess.visibility-and-import-throttle.test.tsx` 通过。

### 14.3 风险状态更新
- “超大文件持续膨胀”风险从“进行中”下调为“**已治理，需防回归**”。
- 后续建议：在 CI 增加行数阈值守卫（建议 `>1200` 告警、`>1500` 阻断），避免再次回弹。
