# MediaPlayerX 项目评估报告（v13）

> 评估日期：2026-02-21  
> 项目类型：Electron + React  
> 评估人：OpenCode  
> 评估范围：规模/结构质量/测试/覆盖率/构建与产物/安全与合规/维护性与扩展性/发布就绪  
> 评估基线：仓库 `Z:/Playground/CurrentWorking/MediaPlayerX`，版本 `0.75.0`，commit `0131c14`（工作区存在未跟踪项：`docs/ref/Xpanalysis.md`、`docs/ui/DesignRef/`、`testdata/`）  
> 评估环境：OS Windows；Node `v22.13.1`；npm `10.9.2`；Vite `v7.3.1`；Electron `v40.4.1`  
> 产物目录：`report/html/`（jscpd HTML）

---

## 0. 结论摘要（Go/No-Go）

- **项目规模结论**：大型（核心业务代码 103,280 LOC，353 文件）。
- **功能复杂度结论**：高（多模式媒体主区 + Electron 文件系统服务 + 字幕/ASR 长链路）。
- **总体质量结论**：**B+**（质量门禁通过，但安全项较 v12 明显回退）。
- **发布建议**：✅ **Conditional Go（有条件发布）**。
- **当前阻断项（P0）**：无（format/typecheck/test/coverage/build 全通过）。
- **主要风险（Top 3）**：
  1) `npm audit` 出现 **high 10 + moderate 1**（主要位于 `eslint/@typescript-eslint/minimatch` 工具链）。
  2) 核心代码规模持续扩张（`89,690 -> 103,280`），超大文件数量增加。
  3) 依赖待升级 8 项（含 `electron`、`eslint`、`@types/node` 等）。

---

## 1. 评估方法与口径

### 1.1 统计口径
- 业务代码范围：`src/**/*.ts(x)` + `electron/**/*.ts(x)`；排除 `.test.*`、`.d.ts`。
- 测试范围：`src` + `electron` 下 `.test.ts/.test.tsx`。
- LOC 与规模度量：Node 临时脚本（本次执行时实时统计）。
- 结构指标：`madge`（循环依赖）、`jscpd`（重复代码）、`ts-prune`（未使用导出）。

### 1.2 验证命令与结果（本次实际执行）

| 类别 | 实际命令 | 结果 | 关键信息 |
|---|---|---|---|
| 版本基线 | `git rev-parse --short HEAD` + `git status --porcelain` | ✅ | commit `0131c14`；存在 3 个未跟踪路径 |
| 代码规范 | `npm run lint` | ✅ | 无错误输出（0 errors / 0 warnings） |
| 格式化 | `npm run format:check` | ✅ | `No scoped files changed` |
| 测试 | `npx vitest run --reporter=dot` | ✅ | 88 files passed, 1 skipped；452 passed, 1 skipped |
| 覆盖率 | `npm run test:coverage` | ✅ | 88 files passed, 1 skipped；总覆盖 `Statements 52.19%` |
| 构建(全量) | `npm run build` | ✅ | 构建成功；无 circular chunk 警告 |
| 构建(前端) | `npx vite build` | ✅ | 构建成功；最大业务 chunk `feature-app-runtime` 357.70 kB |
| 构建(Electron) | `npm run build:electron` | ✅ | main/preload/asrWorker/archiveNormalizeWorker/thumbnailRenderWorker 产出 |
| 安全(依赖) | `npm audit --audit-level=high` | ⚠️ | **high 10 + moderate 1** |
| 依赖债务 | `npm outdated` | ⚠️ | 8 项待升级 |
| 循环依赖 | `npx madge --extensions ts,tsx --ts-config tsconfig.json --circular src electron` | ✅ | 0 循环依赖（488 files） |
| 重复代码 | `npx jscpd src electron` | ✅ | 总重复率 **3.33%**（128 clones） |
| 死代码 | `npx ts-prune -p tsconfig.json` | ✅ | 无输出（未检出未使用导出） |

---

## 2. 质量门禁验证结果

| 检查项 | 结果 | 关键数字 | 证据 |
|---|---|---:|---|
| lint | ✅ | errors 0 / warnings 0 | `npm run lint` |
| prettier(P0) | ✅ | 0 文件待格式化 | `npm run format:check` |
| typecheck(P0) | ✅ | `tsc -b` 通过 | `npm run build` |
| test | ✅ | 89 files / 453 tests（含 skip） | `npx vitest run --reporter=dot` |
| coverage(P0) | ✅ | 89 files / 453 tests（含 skip） | `npm run test:coverage` |
| build:frontend | ✅ | 1.84s | `npx vite build` |
| bundle(P1) | ✅ | 无 circular chunk；`feature-app-runtime` 357.70 kB | `npx vite build` |
| build:electron | ✅ | `main.cjs` 4.0 MB / `preload.cjs` 585.1 kB / `asrWorker.cjs` 622.3 kB / `archiveNormalizeWorker.cjs` 23.9 kB / `thumbnailRenderWorker.cjs` 9.1 kB | `npm run build:electron` |
| audit | ⚠️ | high 10 / moderate 1 / critical 0 | `npm audit --audit-level=high` |
| outdated | ⚠️ | 8 dependencies | `npm outdated` |

---

## 3. 项目规模评估

### 3.1 实际业务行数（LOC）
- 前端业务源码：254 文件 / 72,220 行
- Electron 后端：99 文件 / 31,060 行
- 核心业务合计：353 文件 / **103,280 行**
- 测试代码：89 文件 / 22,904 行；测试/业务比：**22.18%**

### 3.2 模块与文件规模观察
- 超大文件已从“少量接近阈值”演进到“多点超阈值（>1500）”，维护与评审成本上升。
- Top 大文件（不含测试）：
  - `electron/subtitles/asrWorker.ts`：2575
  - `electron/services/file-system-read/managementMutationService.ts`：1956
  - `src/features/subtitles/useLiveSubtitles.ts`：1936
  - `src/components/ImageMainSection.tsx`：1752
  - `electron/subtitles/subtitleSession.ts`：1540

---

## 4. 结构与架构质量评估

### 4.1 分层结构与边界
- contracts / preload / IPC / repository / UI 分层仍可识别，未观察到新的明显跨层硬耦合异常。
- 主流程复杂度主要集中在字幕链路（subtitle + ASR）与文件系统读写编排。

### 4.2 结构健康度指标（本轮）
- `madge`：✅ 0 循环依赖（488 files）。
- `jscpd`：✅ 重复率 **3.33%**（81,861 行中 2,727 行重复，128 clones）。
- `ts-prune`：✅ 未检出未使用导出。

---

## 5. 测试质量与稳定性评估

### 5.1 测试结果
- 常规测试链路通过：`452 passed / 1 skipped`。
- 覆盖率链路通过：`452 passed / 1 skipped`，未出现超时或挂起。

### 5.2 覆盖率概览（v8 provider）
- 全量覆盖：`Statements 52.19%` / `Branches 46.17%` / `Functions 52.91%` / `Lines 52.40%`。

### 5.3 结论
- 稳定性保持良好（测试数量继续增长且通过），但覆盖率相较 v12 略降。

---

## 6. 构建与产物质量评估

### 6.1 前端构建（Vite）
- `vite build` 成功（1.84s）。
- 主要 JS chunk：`feature-app-runtime` 357.70 kB、`feature-backend-runtime` 259.07 kB、`index` 242.87 kB、`vendor-react` 190.25 kB。
- 未出现 circular chunk warning，分包策略仍有效。

### 6.2 全量构建（TypeScript + Vite）
- `npm run build` 成功，`tsc -b` 通过。

### 6.3 Electron 构建
- `build:electron` 成功，产物体积：`main.cjs` 4.0 MB、`preload.cjs` 585.1 kB、`asrWorker.cjs` 622.3 kB、`archiveNormalizeWorker.cjs` 23.9 kB、`thumbnailRenderWorker.cjs` 9.1 kB。

---

## 7. 安全与合规评估

### 7.1 依赖安全（npm audit）
- `critical=0`，但出现 **high=10**（v12 为 0）。
- 高危链路主要来自 `minimatch`，由 `eslint/@typescript-eslint` 生态传递依赖触发。

### 7.2 风险解释与发布影响
- 当前高危多位于开发工具链（devDependencies）路径，短期对运行时攻击面影响相对可控。
- 但“high 级别存在”本身意味着治理优先级上调，不应继续按 v12 的 moderate 口径处理。

---

## 8. 发布就绪度评估

- 结论：**Conditional Go**。
- 理由：P0 门禁（format/typecheck/test/coverage/build）全部通过；主要问题集中在依赖安全与代码规模可维护性。
- 发布前建议：
  1) 对 `npm audit` 高危项形成明确处置策略（升级或风险接受单），并在下个迭代窗口关闭。
  2) 以字幕与文件系统服务为优先，拆分 >1500 行核心文件，降低回归与冲突概率。

---

## 9. 文档与治理

- 本报告为基于 `main@0131c14` 的重跑版本。
- 门禁链路、结构指标、依赖安全与规模统计均已复跑。

---

## 10. 风险矩阵与改进建议

### 10.1 风险矩阵

| 风险 | 严重度 | 概率 | 证据 | 当前状态 | 建议 | Owner | 截止 |
|---|---|---|---|---|---|---|---|
| audit high 10（工具链） | 高 | 中 | `npm audit --audit-level=high` | 新增 | 优先升级 `eslint/@typescript-eslint` 链路，必要时评估 `eslint@10` 迁移成本 | 全栈 | 2026-03-05 |
| 核心文件超大化回归 | 中 | 高 | LOC 统计 + Top 文件 | 持续扩大 | 拆分 `asrWorker.ts`、`managementMutationService.ts`、`useLiveSubtitles.ts` | 前后端 | 2026-03-20 |
| 覆盖率缓降 | 中 | 中 | `52.19%`（v12: `53.81%`） | 需跟踪 | 为新增字幕/管理链路补充高价值回归测试 | 前端 | 2026-03-15 |
| 依赖待升级 8 项 | 低 | 高 | `npm outdated` | 持续跟踪 | 每周批量升级非破坏项，缩小版本漂移 | 全栈 | 持续 |

### 10.2 改进建议（P1/P2）
- **P1（近期）**：关闭 high 级漏洞窗口（至少完成可无破坏升级项）。
- **P2（中期）**：建立超大文件阈值治理（建议 1200 行告警，1500 行阻断进入主分支）。
- **P2（中期）**：覆盖率回补聚焦字幕/元数据/管理写链路的分支分岔点。

---

## 11. 对比上版变化（v12 -> v13）

| 项 | v12 | v13 | 变化解读 |
|---|---|---|---|
| 评估基线 commit | `313e906` | `0131c14` | 基线更新 |
| 核心业务代码规模 | 89,690 | 103,280 | 明显增长（+13,590） |
| lint | ✅（0 warn） | ✅（0 warn） | 维持稳定 |
| prettier | ✅ | ✅ | 维持稳定 |
| test | ✅（416 pass） | ✅（452 pass） | 用例继续增长且通过 |
| coverage | ✅（53.81%） | ✅（52.19%） | 通过但覆盖率下滑 |
| build | ✅ | ✅ | 持续通过 |
| madge | ✅（0） | ✅（0） | 循环依赖持续清零 |
| jscpd | ✅（3.63%） | ✅（3.33%） | 重复率继续下降 |
| audit | ⚠️（moderate 10） | ⚠️（high 10 + moderate 1） | 安全风险等级回退 |
| outdated | ⚠️（7） | ⚠️（8） | 依赖债务小幅回升 |
| 综合评级 | A- | B+ | 主要受安全项回退与规模膨胀影响 |

---

## 12. 附录：本轮执行命令清单

- `git rev-parse --short HEAD`
- `git status --porcelain`
- `node -v && npm -v`
- `npm run lint`
- `npm run format:check`
- `npx vitest run --reporter=dot`
- `npm run test:coverage`
- `npm run build`
- `npx vite build`
- `npm run build:electron`
- `npm audit --audit-level=high`
- `npm outdated`
- `npx --yes madge --extensions ts,tsx --ts-config tsconfig.json --circular src electron`
- `npx --yes jscpd src electron`
- `npx --yes ts-prune -p tsconfig.json`
- `node -e "..."`（LOC 统计脚本）

---

## 13. v12 处理建议执行状态（v13 视角）

| 项 | v13 状态 | 备注 |
|---|---|---|
| P0 门禁稳定（build/test/coverage/format） | ✅ 保持 | 全部持续通过 |
| circular chunk 预防 | ✅ 保持 | 未复现构建警告 |
| moderate 漏洞跟踪 | ❌ 回退 | 已升级为 high 10 + moderate 1 |
| 依赖债务压降 | ⚠️ 未达成 | 7 -> 8（回升） |
| 重复代码治理 | ✅ 有效 | 3.63% -> 3.33% |
| 超大文件拆分 | ⚠️ 回退 | 新增多个 1500+ 文件 |
