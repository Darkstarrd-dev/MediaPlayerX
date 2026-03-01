# MediaPlayerX 项目评估报告（v15）

> 评估日期：2026-02-25  
> 项目类型：Electron + React  
> 评估人：OpenCode  
> 评估范围：规模/结构质量/测试/覆盖率/构建与产物/安全与合规/维护性与扩展性/发布就绪  
> 评估基线：仓库 `Z:/Playground/CurrentWorking/MediaPlayerX`，版本 `0.8.0`，commit `5f9b7e4`（工作区 clean）  
> 评估环境：OS Windows；Node `v22.13.1`；npm `10.9.2`；Vite `v7.3.1`；Electron `v40.4.1`  
> 产物目录：`report/html/`（jscpd HTML）

---

## 0. 结论摘要（Go/No-Go）

- **项目规模结论**：大型（核心业务代码 120,375 LOC，411 文件）。
- **功能复杂度结论**：高（多模式主区 + Electron 文件系统服务 + 字幕/ASR + 管理审核链路）。
- **总体质量结论**：**B**（P0 门禁通过，安全风险可控；规模与重复代码债务上升）。
- **发布建议**：✅ **Conditional Go（有条件发布）**。
- **当前阻断项（P0）**：无（lint/test/coverage/build/audit 均通过）。
- **主要风险（Top 3）**：
  1) 核心代码规模继续膨胀（`109,625 -> 120,375`），大文件数量回升。  
  2) 重复代码率上升（`3.31% -> 3.64%`），维护成本与缺陷传播风险增加。  
  3) 依赖待升级项从 5 增至 7，且包含 eslint/electron 主版本漂移。

---

## 1. 评估方法与口径

### 1.1 统计口径
- 业务代码范围：`src/**/*.ts(x)` + `electron/**/*.ts(x)`；排除 `.test.*`、`.d.ts`。
- 测试范围：`src` + `electron` 下 `.test.ts/.test.tsx`。
- LOC 与规模度量：沿用本轮 v15 统计口径。
- 结构指标：`madge`（循环依赖）、`jscpd`（重复代码）、`ts-prune`（未使用导出）。

### 1.2 验证命令与结果（本次实际执行）

| 类别 | 实际命令 | 结果 | 关键信息 |
|---|---|---|---|
| 版本基线 | `git rev-parse --short HEAD` + `git status --porcelain` | ✅ | commit `5f9b7e4`；工作区 clean |
| 代码规范 | `npm run lint` | ✅ | 无错误输出 |
| 格式化 | `npm run format:check` | ✅ | `No scoped files changed for Prettier check.` |
| 测试 | `npx vitest run --reporter=dot` | ✅ | `100 passed / 1 skipped`；`602 passed / 1 skipped` |
| 覆盖率 | `npm run test:coverage` | ✅ | `100 passed / 1 skipped`；`602 passed / 1 skipped`；All files `53.06/47.65/53.73/53.28` |
| 构建(全量) | `npm run build` | ✅ | `tsc -b && vite build` 通过 |
| 构建(前端) | `npx vite build` | ✅ | 构建成功；最大业务 chunk `feature-app-runtime` 411.15 kB |
| 构建(Electron) | `npm run build:electron` | ✅ | main/preload/asrWorker/archiveNormalizeWorker/thumbnailRenderWorker 产出 |
| 安全(依赖) | `npm audit --audit-level=high` | ✅ | `found 0 vulnerabilities` |
| 依赖债务 | `npm outdated` | ⚠️ | 7 项待升级 |
| 循环依赖 | `npx madge --extensions ts,tsx --ts-config tsconfig.json --circular src electron` | ✅ | 0 循环依赖（558 files） |
| 重复代码 | `npx jscpd src electron` | ✅ | 总重复率 **3.64%**（100,155 行中 3,649 行重复，169 clones） |
| 死代码 | `npx ts-prune -p tsconfig.json` | ✅ | 无输出 |

---

## 2. 质量门禁验证结果

| 检查项 | 结果 | 关键数字 | 证据 |
|---|---|---:|---|
| lint | ✅ | 0 errors / 0 warnings | `npm run lint` |
| prettier(P0) | ✅ | scoped check 通过 | `npm run format:check` |
| typecheck(P0) | ✅ | `tsc -b` 通过 | `npm run build` |
| test(P0) | ✅ | 101 files（100 pass/1 skip）；603 tests（602 pass/1 skip） | `npx vitest run --reporter=dot` |
| coverage(P0) | ✅ | 101 files（100 pass/1 skip）；603 tests（602 pass/1 skip）；All files `53.06/47.65/53.73/53.28` | `npm run test:coverage` |
| build:frontend | ✅ | 2.26s | `npx vite build` |
| bundle(P1) | ✅ | 无 circular chunk；`feature-app-runtime` 411.15 kB | `npx vite build` |
| build:electron | ✅ | `main.cjs` 4.1 MB / `preload.cjs` 591.8 kB / `asrWorker.cjs` 621.8 kB / `archiveNormalizeWorker.cjs` 23.9 kB / `thumbnailRenderWorker.cjs` 9.1 kB | `npm run build:electron` |
| audit | ✅ | high 0 / moderate 0 / critical 0 | `npm audit --audit-level=high` |
| outdated | ⚠️ | 7 dependencies | `npm outdated` |

---

## 3. 项目规模评估

### 3.1 实际业务行数（LOC）
- 前端业务源码：292 文件 / 83,027 行
- Electron 后端：119 文件 / 37,348 行
- 核心业务合计：411 文件 / **120,375 行**
- 测试代码：101 文件 / 29,288 行；测试/业务比：**24.33%**

### 3.2 模块与文件规模观察
- >1500 行文件已回升到 3 个，评审和重构成本上升。
- Top 大文件（不含测试）：
  - `src/components/FullscreenLayer.tsx`：2000
  - `src/components/SidebarPanel.tsx`：1815
  - `electron/fileSystemReadFacade.impl.ts`：1567
  - `src/components/SettingsPanel.impl.tsx`：1442
  - `electron/services/file-system-read/managementRenameService.ts`：1436

---

## 4. 结构与架构质量评估

### 4.1 分层结构与边界
- contracts / preload / IPC / repository / UI 分层仍可识别。
- 未观察到新增循环依赖或明显跨层硬耦合。
- 复杂度热点集中在文件系统读写编排、全屏/侧栏 UI 复合逻辑与字幕链路。

### 4.2 结构健康度指标（本轮）
- `madge`：✅ 0 循环依赖（558 files）。
- `jscpd`：✅ 重复率 **3.64%**（100,155 行中 3,649 行重复，169 clones）。
- `ts-prune`：✅ 未检出未使用导出。

---

## 5. 测试质量与稳定性评估

### 5.1 测试结果
- `npx vitest run --reporter=dot` 通过：`100 files passed / 1 skipped`，`602 passed / 1 skipped`。
- `npm run test:coverage` 通过，覆盖率统计如下：
  - `Statements 53.06%`
  - `Branches 47.65%`
  - `Functions 53.73%`
  - `Lines 53.28%`

### 5.2 稳定性结论
- 本轮 test + coverage 均一次通过，P0 视角稳定。
- 仍可保留短期连续跑观察窗口（建议 3 次）以监测波动回归。

---

## 6. 构建与产物质量评估

### 6.1 前端构建（Vite）
- `vite build` 成功（2.26s）。
- 主要 JS chunk：`feature-app-runtime` 411.15 kB、`index` 302.53 kB、`feature-backend-runtime` 293.97 kB、`vendor-react` 190.25 kB。
- 未出现 circular chunk warning。

### 6.2 全量构建（TypeScript + Vite）
- `npm run build` 成功，`tsc -b` 通过。

### 6.3 Electron 构建
- `build:electron` 成功，产物体积：`main.cjs` 4.1 MB、`preload.cjs` 591.8 kB、`asrWorker.cjs` 621.8 kB、`archiveNormalizeWorker.cjs` 23.9 kB、`thumbnailRenderWorker.cjs` 9.1 kB。

---

## 7. 安全与合规评估

### 7.1 依赖安全（npm audit）
- `npm audit --audit-level=high` 结果：`found 0 vulnerabilities`。

### 7.2 风险解释与发布影响
- 当前无 audit 高危阻断。
- 主要发布风险为“规模与维护性债务”，非即时安全阻断。

---

## 8. 发布就绪度评估

- 结论：**Conditional Go**。
- 理由：P0 门禁（lint/test/coverage/build/audit）本轮全部通过；主要问题集中在规模增长、重复率回升、依赖版本漂移。
- 发布前建议：
  1) 将 `npm run format:check` 从 scoped 校验恢复为全量校验，避免格式债务累积。  
  2) 优先拆分 `FullscreenLayer.tsx`、`SidebarPanel.tsx`、`fileSystemReadFacade.impl.ts`。  
  3) 处理 `npm outdated` 中核心工具链（`eslint`、`electron`、`@types/node`）。

---

## 9. 文档与治理

- 本报告为基于 `main@5f9b7e4` 的重跑版本。
- 门禁链路、覆盖率、构建与安全结果已同步到最新状态。

---

## 10. 风险矩阵与改进建议

### 10.1 风险矩阵

| 风险 | 严重度 | 概率 | 证据 | 当前状态 | 建议 | Owner | 截止 |
|---|---|---|---|---|---|---|---|
| 核心规模持续膨胀与大文件回升 | 高 | 高 | LOC `120,375`；>1500 行文件 3 个 | 持续 | 按模块拆分并设置阈值守卫（1200 告警 / 1500 阻断） | 前后端 | 2026-03-15 |
| 重复代码率上升 | 中 | 中 | `jscpd 3.64%`（v14 为 3.31%） | 持续 | 对跨层重复（UI 控件、读写服务）做抽象收敛 | 全栈 | 2026-03-20 |
| 依赖升级积压（7 项） | 中 | 中 | `npm outdated` | 持续 | 每周滚动升级，优先工具链与运行时依赖 | 全栈 | 持续 |

### 10.2 改进建议（P1/P2）
- **P1（近期）**：恢复 Prettier 全量门禁，避免 scoped check 造成格式盲区。
- **P1（近期）**：为超大文件与重复率设置 CI 阈值告警。
- **P2（中期）**：将文件系统服务与全屏 UI 的高复杂模块进一步解耦（状态层/动作层/渲染层）。

---

## 11. 对比上版变化（v14 -> v15）

| 项 | v14 | v15 | 变化解读 |
|---|---|---|---|
| 评估基线 commit | `f03abab` | `5f9b7e4` | 基线更新 |
| 项目版本 | `0.75.0` | `0.8.0` | 版本前进 |
| 核心业务代码规模 | 109,625 | 120,375 | 持续增长（+10,750） |
| lint | ✅ | ✅ | 维持稳定 |
| prettier | ✅（全量） | ✅（scoped） | 通过但门禁粒度变窄 |
| test | ✅（480 pass/1 skip） | ✅（602 pass/1 skip） | 测试规模增长且通过 |
| coverage | ✅（52.33/46.63/52.71/52.54） | ✅（53.06/47.65/53.73/53.28） | 分支/函数提升，语句/行提升 |
| build | ✅ | ✅ | 持续通过 |
| madge | ✅（0） | ✅（0） | 循环依赖持续清零 |
| jscpd | ✅（3.31%） | ✅（3.64%） | 重复率回升 |
| audit | ✅（0 vulnerabilities） | ✅（0 vulnerabilities） | 维持安全清零 |
| outdated | ⚠️（5） | ⚠️（7） | 依赖债务回升 |
| 综合评级 | B+ | B | 可发布但维护债务上升 |

---

## 12. 附录：本轮执行命令清单

- `git rev-parse --short HEAD`
- `git status --porcelain`
- `node -v`
- `npm -v`
- `npx vite --version`
- `npx electron --version`
- `npm run lint`
- `npm run format:check`
- `npx vitest run --reporter=dot`
- `npm run test:coverage`
- `npx vite build`
- `npm run build:electron`
- `npm run build`
- `npm audit --audit-level=high`
- `npm outdated`
- `npx madge --extensions ts,tsx --ts-config tsconfig.json --circular src electron`
- `npx jscpd src electron`
- `npx ts-prune -p tsconfig.json`

---

## 13. v14 处理建议执行状态（v15 最新视角）

| 项 | v15 状态 | 备注 |
|---|---|---|
| P0 门禁稳定（build/test/coverage） | ✅ 保持 | 本轮全通过 |
| circular chunk 预防 | ✅ 保持 | 未复现构建警告 |
| high 漏洞治理 | ✅ 保持 | `npm audit --audit-level=high` 为 0 |
| 依赖债务压降 | ❌ 回升 | 5 -> 7 |
| 重复代码治理 | ❌ 回升 | 3.31% -> 3.64% |
| 超大文件拆分防回归 | ❌ 回弹 | >1500 行文件回升到 3 个 |

---

## 14. 评估后续执行进展（非基线增补）

> 说明：本节记录 **v15 基线评估完成后** 的治理动作，不改变第 0-13 节的基线统计口径（`5f9b7e4`）。

### 14.1 本轮增补
- 已执行“两轮”治理，覆盖建议 1~3 且继续推进剩余大文件：
  1) **SidebarPanel 二轮拆分**：树工具层抽离（`sidebarPanelTreeUtils.ts`）后，再将行渲染块拆到 `SidebarPanelRow.tsx`。  
  2) **FullscreenLayer 二轮拆分**：图像调整面板拆为 `FullscreenImageAdjustPanel.tsx` + `FullscreenImageAdjustEditors.tsx`，并复用 `fullscreenImageAdjustUtils.ts`。  
  3) **FileSystem Facade 深化拆分**：
     - 工厂化：新增 `electron/facade/fileSystemFacadeFactory.ts`，统一 root path/context/handlers，新增 `createArchiveNormalizationServiceOptions`、`createMediaResourceServiceOptions`。  
     - 队列与 watcher 下沉：新增 `imageReadTaskQueueManager.ts`、`externalSourceWatcherManager.ts`，将 image page/tree 队列与外部源监听逻辑移出主服务。

### 14.2 大文件治理结果（增补）
- 最新 Top 大文件（非测试，`src/electron`）：
  - `src/components/FullscreenLayer.tsx`：**1482**（原 1684）
  - `src/components/SidebarPanel.tsx`：**1363**（原 1553）
  - `electron/fileSystemReadFacade.impl.ts`：**1302**（原 1596）
- 结论：此前 >1500 的 3 个文件已全部降至 1500 以下。

### 14.3 变更范围（增补）
- 关键新增文件：
  - `electron/facade/fileSystemFacadeFactory.ts`
  - `electron/services/file-system-read/externalSourceWatcherManager.ts`
  - `electron/services/file-system-read/imageReadTaskQueueManager.ts`
  - `src/components/SidebarPanelRow.tsx`
  - `src/components/fullscreen/FullscreenImageAdjustEditors.tsx`
  - `src/components/fullscreen/FullscreenImageAdjustPanel.tsx`
  - `src/components/sidebarPanelTreeUtils.ts`
  - `src/components/useVideoSeekDraft.ts`
  - `src/components/useOverflowMarquee.ts`
  - `src/components/fullscreen/fullscreenImageAdjustUtils.ts`
- 关键修改文件：
  - `src/components/SidebarPanel.tsx`
  - `electron/fileSystemReadFacade.impl.ts`
  - `src/components/VideoMainSection.tsx`
  - `src/components/fullscreen/FullscreenVideoControls.tsx`
  - `src/components/FullscreenLayer.tsx`
  - `src/components/ToolbarTitleMarquee.tsx`
  - `src/components/fullscreen/FullscreenMetaMarquee.tsx`
- 当前重构 diff 统计（工作区视角）：`7 files changed, 261 insertions(+), 1597 deletions(-)`（不含新增文件统计行）。

### 14.4 本轮验证结果（增补）
- `npm run lint`：通过。  
- `npx vitest run src/components/SidebarPanel.test.tsx`：通过（29 tests）。  
- `npx vitest run src/__tests__/App.navigation.test.tsx src/__tests__/App.state.test.tsx`：通过（30 tests）。
- `npm run build`：通过（`tsc -b && vite build`）。  
- `npx vitest run --reporter=dot`：通过（`100 files passed / 1 skipped`，`602 passed / 1 skipped`）。
- `npm run quality:ci`：全链路通过（`format:check -> lint -> build -> vitest -> test:coverage -> audit -> jscpd`）。
- `npm audit --audit-level=high`：`found 0 vulnerabilities`。
- `npx jscpd src electron --config .jscpd.json --silent`：重复率 **3.39%**（`157` clones，`3440` duplicated lines，`482` files）。

### 14.5 风险状态更新
- “超大文件持续膨胀”风险：从“回弹”下调为“**阶段性缓解**”（历史 3 个 >1500 文件已全部压降）。
- “重复代码率回升”风险：从“持续”下调为“**已治理并完成量化复核**”（本轮 `jscpd` 已回落至 **3.39%**，较 v15 基线 **3.64%** 改善）。
- 说明：本节为基线后增补；本轮已完成 `quality:ci` 全链路复测，最终趋势仍建议在 v16 基线继续跟踪。
