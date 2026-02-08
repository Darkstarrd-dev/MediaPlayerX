# MediaPlayerX UI 性能测试计划（占位优先 + DOM不卡顿）

> 目标：在不设定跨机器硬门槛的前提下，通过可复现实测在“可用方案”中选出最优组合。

## 1. 方向性要求（不量化门槛）

- 首屏/翻页/切包：占位（Placeholder）尽快出现。
- 缩略图：允许慢慢补齐（不作为硬 KPI）。
- 操作感：DOM 更新过程中不应出现明显卡顿（以 rAF gap / longtask / React commit 统计为主）。

## 2. 测试架构（已落地）

通过 Electron renderer 真实渲染 React DOM，采集：

- `raf_gap_ms`：requestAnimationFrame 帧间隔统计（p50/p95/p99/max）。
- `longtask_ms`：Long Tasks API 统计（count/max/total，若运行时支持）。
- `react_profiler`：React Profiler commit 耗时统计（按组件 id 分组）。
- `ipc_timings`：renderer->main IPC 关键接口耗时分布（RealMediaRepository 内埋点）。

输出：每次运行写入 `docs/perf/ui-runs/ui-<mode>-<candidate>-<runTag>.json`。

### 2.1 DOM Bench（bench=dom）

目的：隔离后端 IO，专测“缩略图 URL 陆续到达时”的 DOM 更新策略。

- 使用假 repository，批量 resolve 240 个缩略图 URL（随机短延迟），渲染同款 `ImageMainSection` 缩略图网格。
- 对比候选：`useResolvedMediaUrls` 的状态应用策略。

### 2.2 E2E Bench（bench=e2e）

目的：真实后端下，浏览翻页是否仍然“占位快出现 + DOM不卡”；可选叠加 import 压力。

- 可选 enqueue import（通过 config 传入 `e2e.importPaths`）
- 自动执行 N 次翻页（记录：占位骨架出现延迟 / 新页面数据 commit 延迟）

## 3. 候选方案矩阵（当前实现）

围绕 renderer 侧的两个核心问题：

1) `useResolvedMediaUrls` 的“状态更新风暴”（每张图 setState）
2) 翻页加载时的“占位反馈”（loading skeleton）

### 3.1 resolvedMedia 候选（R0-R3）

| ID | applyMode | stateScope | maxConcurrent | 说明 |
| --- | --- | --- | --- | --- |
| R0 | immediate | accumulate | inf | 现状基线（每条结果立即 setState，状态持续增长） |
| R1 | immediate | active-only | inf | 仅保留当前 targets，降低 state 规模 |
| R2 | raf | active-only | inf | rAF 批量 flush 状态，降低 commit 频率 |
| R3 | raf | active-only | 4 | 加并发上限，减轻后端/IPC 压力 |

### 3.2 loading skeleton（S0/S1）

- S0：关闭
- S1：翻页/加载时用 skeleton 替换当前网格（即时占位反馈）

## 4. 选型原则（无硬门槛）

按顺序筛选：

1) 先看卡顿指标（`raf_gap_ms.p99`、`raf_gap_ms.max`、`longtask_ms.max`、关键组件 `react_profiler`）。
2) 在“不卡顿/更少卡顿”的候选中，再看占位体验：
   - `loading_commit_latency_ms`（骨架出现延迟，若启用 S1）
   - `data_commit_latency_ms.p95`（翻页后新数据 commit 延迟）
3) 若分布差异不明显：优先选择实现复杂度更低、行为更可控的方案。

## 5. 运行方式

### 5.1 单次运行

DOM：

```bash
npm run bench:ui -- --mode dom --candidate-id R2 --apply-mode raf --state-scope active-only --skip-build 1
```

E2E（建议先 seed 一次，后续复用同一个 libraryRoot）：

Seed（仅导入并等待完成，`browseSteps=0`）：

```bash
npm run bench:ui -- --mode e2e --candidate-id SEED --library-root "./library-bench-shared" --import-path "Z:/PureBenchFolder03" --browse-steps 0 --max-duration-ms 1200000 --skip-build 1
```

Browse（不触发 import，测试浏览 + DOM 更新）：

```bash
npm run bench:ui -- --mode e2e --candidate-id R2-S1 --library-root "./library-bench-shared" --apply-mode raf --state-scope active-only --skeleton replace --browse-steps 10 --skip-build 1
```

### 5.2 矩阵运行（会启动多次 Electron）

```bash
npm run bench:ui-matrix -- --bench all --import-path "Z:/PureBenchFolder03"
```

矩阵聚合结果：`docs/perf/ui-runs/matrix-ui-*.json`

## 6. 备注

- 不设跨机器阈值：报告会记录 Electron/Chrome/Node 版本与 CPU/内存信息，用于横向参考。
- 当前 PureBenchFolder03 实测 `.mp4` 数量为 6；本计划不再将“视频数量”作为 UI 指标。

## 7. 选型结论（已定型并落地）

结论：默认采用 `R1-S1`。

- resolvedMedia：`applyMode=immediate` + `stateScope=active-only`
- loading skeleton：`replace`（翻页/切包/筛选加载期间，网格立即替换为 skeleton 占位）

依据：在 browse+import 压测（E2E，`browseSteps=10`，`import-each-run=1`）下，`R1-S1` 同时满足“占位快速出现 + UI 不冻结”。

关键数据（浏览 + 后台导入同时进行）：

| candidate | loading skeleton p95(ms) | raf p99(ms) | raf max(ms) | longtask max(ms) |
| --- | ---:| ---:| ---:| ---:|
| R1-S1 | 3.48 | 9.03 | 258 | 51 |
| R0-S1 | 2.83 | 16.30 | 233 | 60 |
| R2-S1 | 6.20 | 16.50 | 858 | 775 |

排除原因：

- `R2-S1`：出现 ~0.8s 级别 Long Task / rAF gap（可感知冻结），不符合“DOM 不抖”优先级。
- `R0-*`：`stateScope=accumulate` 状态持续增长，不可控；且在压力场景下 rAF 分布更差。
- `R3-*`：DOM bench 下缩略图 URL 应用过慢（并发上限导致），压力场景下 rAF 也不占优。

原始结果文件：

- 矩阵聚合：`docs/perf/ui-runs/matrix-ui-2026-02-08T05-51-39-215Z.json`
- 对应 run：
  - `docs/perf/ui-runs/ui-e2e-R1-S1-2026-02-08T05-51-39-215Z-m04.json`
  - `docs/perf/ui-runs/ui-e2e-R0-S1-2026-02-08T05-51-39-215Z-m02.json`
  - `docs/perf/ui-runs/ui-e2e-R2-S1-2026-02-08T05-51-39-215Z-m06.json`

复现命令（browse+import 压测）：

```bash
npm run bench:ui-matrix -- --bench e2e --skip-seed 1 --import-each-run 1 --import-path "Z:/PureBenchFolder03" --shared-library-root "Z:/MediaPlayerXBenchLibrary" --browse-steps 10 --skip-build 1
```

落地位置：

- `src/App.tsx`：默认 resolvedMedia 采用 `R1`，并默认启用 `S1`（非 bench 模式）。
