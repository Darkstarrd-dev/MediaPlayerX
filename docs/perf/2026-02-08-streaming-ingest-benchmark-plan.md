# MediaPlayerX 流式导入与首屏可用性能测试计划（独立文档）

> 目标：本文件作为唯一测试主档。每次测试结束后必须更新本文件；全部测试完成后在本文件内给出最佳方案结论。

## 1. 测试目标

在不接入当前项目 UI 的前提下，通过纯脚本多进程模拟（backend + renderer-sim）验证以下能力：

1. 第一张缩略图最快可见（TTFT）。
2. 第一页缩略图（20 张）最快可见（TTFP20）。
3. Sidebar 流式更新，入库不阻断页面更新（事件持续到达、低延迟）。
4. 载入过程中不影响已加载图包浏览，且当前浏览图包优先级更高（焦点包优先预读取/优先缩略图）。
5. 图片/视频双模式：视频需最早给出首条占位与首条元信息（时长、分辨率）。

## 2. 测试负载

五个目录内容相同，可做破坏性测试：

- `Z:\PureBenchFolder01`
- `Z:\PureBenchFolder02`
- `Z:\PureBenchFolder03`
- `Z:\PureBenchFolder04`
- `Z:\PureBenchFolder05`

单目录负载组成（用户提供）：

- RAR：123MB x 8
- 7Z：351MB x 2
- MP4：1GB x 9
- ZIP：172MB x 14
- 图片：145MB（400+）

## 3. 指标定义（强制）

### 3.1 首屏与流式指标

- `TTFS`（Time To First Sidebar）：首条 `sidebar_item_discovered` 时间。
- `TTFI`（Time To First Interactive Browse）：首条可浏览占位入库并可被查询时间。
- `TTFT`（Time To First Thumbnail）：首条 `thumbnail_ready` 时间。
- `TTFP20`（Time To First Page-20）：当前焦点图包前 20 张缩略图完成时间。
- `TTFV0`（Time To First Video Placeholder）：首条视频占位入库时间（名称/路径）。
- `TTFVM`（Time To First Video Metadata）：首条视频元信息（duration/width/height）可用时间。

### 3.2 稳定性与阻塞指标

- `eventLoopLag_p95/p99`：renderer-sim 事件循环延迟。
- `UI_max_gap_ms`：UI 事件到达最大间隔。
- `focusLatency_1`：焦点切换后该图包第 1 张缩略图完成时间。
- `focusLatency_20`：焦点切换后该图包前 20 张缩略图完成时间。
- `bg_throughput_drop_pct`：启用浏览优先后后台吞吐下降比例。

### 3.3 批处理/维护指标

- `scan_files_per_sec`：浅扫描吞吐（仅名称）。
- `zip_entries_per_sec`：ZIP 中央目录名称扫描吞吐。
- `rar7z_to_zip_ms`：RAR/7Z 转 ZIP 耗时。
- `zip_repack_delete_ms`：ZIP 删除内容并重打包耗时。
- `zip_bulk_rename_ms`：ZIP 内批量改名耗时。
- `db_delete_package_ms`：数据库删除图包耗时。

## 4. 测试架构（纯脚本）

多进程：

- `main-runner`：启动组合、收集指标、写报告。
- `backend`：扫描/入库/缩略图/视频探测/归一化队列。
- `renderer-sim`：模拟 UI 订阅流式事件、发焦点切换请求并测延迟。

通信：`child_process.fork()` 消息通道；统一用 `perf_hooks.performance.now()` 打点。

## 5. 技术栈候选（用于对比）

### 5.1 文件浅扫描

- `FS-A`：Node 原生 `fs.readdir(withFileTypes)` + BFS + 并发限制。
- `FS-B`：`fast-glob` 仅路径扫描。

### 5.2 ZIP 名称扫描（仅中央目录）

- `ZIP-A`：`node-stream-zip`
- `ZIP-B`：`yauzl` / `yauzl-promise`

### 5.3 RAR/7Z 转 ZIP（后置、独立进程）

- `7z.exe` + `execa` 调用。
- 策略：必须在 `TTFP20` 达成后才启动 maintenance 队列。

### 5.4 缩略图与调度

- 缩略图：`sharp`
- 调度：`p-queue`（priority）
  - `interactive`（焦点包）
  - `page`（焦点包前 20）
  - `background`（其余）
  - `maintenance`（RAR/7Z、重打包）

### 5.5 数据库

- `DB-A`：`better-sqlite3` + `worker_threads`
- `DB-B`：`node:sqlite` + `worker_threads`

## 6. 执行矩阵

> 每个组合至少跑 3 次（Cold/Warm 各 3 次），取中位数。

| 组合ID | FS | ZIP | DB | 队列策略 | 目录 | 说明 |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | FS-A | ZIP-A | DB-A | Q1 | Folder01 | 基线 |
| C2 | FS-A | ZIP-B | DB-A | Q1 | Folder02 | ZIP库对比 |
| C3 | FS-B | ZIP-A | DB-A | Q1 | Folder03 | 扫描策略对比 |
| C4 | FS-A | ZIP-A | DB-B | Q1 | Folder03 | DB驱动对比 |
| C5 | FS-A | ZIP-A | DB-A | Q2 | Folder01 | 调度策略对比 |
| C6 | FS-A | node-stream-zip | DB-A | Q1 | Folder02 | ZIP库对比（node-stream-zip） |
| C7 | FS-A | yauzl | DB-A | Q1 | Folder02 | ZIP库对比（yauzl） |
| C8 | FS-A | ZIP-A | better-sqlite3-worker | Q1 | Folder03 | DB对比（持久化 worker） |

队列策略建议：

- `Q1`：interactive/page/background/maintenance 固定并发槽。
- `Q2`：动态抢占（interactive 可临时借用 background 并发）。

## 7. 破坏性测试矩阵

| 测试ID | 项目 | 目录 | 指标 |
| --- | --- | --- | --- |
| D1 | RAR/7Z 转 ZIP 后置执行 | Folder04 | `rar7z_to_zip_ms` + 对 `TTFP20` 干扰 |
| D2 | ZIP 删除内容并重打包 | Folder04 | `zip_repack_delete_ms` |
| D3 | ZIP 批量改名 | Folder05 | `zip_bulk_rename_ms` |
| D4 | DB 图包删除 | Folder05 | `db_delete_package_ms` |

## 8. 每次测试更新规则（强制）

每次跑完必须在本文件追加一条记录，格式如下：

### 8.x 运行记录模板

- 时间：`YYYY-MM-DD HH:mm:ss`
- 运行人：
- 代码版本：`git commit hash`
- 组合ID：
- 目录：
- 模式：`Cold/Warm`
- 轮次：
- 关键参数：
  - 扫描并发：
  - ZIP扫描并发：
  - 缩略图并发：
  - 视频探测并发：
  - maintenance 并发：
- 结果：
  - TTFS：
  - TTFI：
  - TTFT：
  - TTFP20：
  - TTFV0：
  - TTFVM：
  - focusLatency_1：
  - focusLatency_20：
  - eventLoopLag_p95/p99：
  - UI_max_gap_ms：
  - scan_files_per_sec：
  - zip_entries_per_sec：
- 结论：
  - 通过/不通过：
  - 异常摘要：

## 9. 汇总表（持续更新）

| 组合ID | TTFT(ms) Cold/Warm | TTFP20(ms) Cold/Warm | TTFVM(ms) Cold/Warm | focus_1(ms) Cold/Warm | focus_20(ms) Cold/Warm | UI_max_gap(ms) Cold/Warm | Lag_p99(ms) Cold/Warm | Gate通过率(C/W) | 结论 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| C1 | 5708(280.5) / 6225(424.5) | 5943(276.5) / 6463(421.5) | 5726(273) / 6241(417) | 416(16.5) / 431(28) | 662(33.5) / 719(46.5) | 5336(223.955) / 5755(439.391) | 33.653(0.762) / 32.621(0.516) | 0/3, 0/3 | 不通过硬约束（UI gap 超阈值） |
| C2 | 5991(283.5) / 6128(230) | 6233(285.5) / 6365(218) | 6016(283.5) / 6139(230) | 454(23) / 436(25.5) | 692(40.5) / 665(35.5) | 5258(300.435) / 5395(143.819) | 34.079(0.581) / 32.735(0.442) | 0/3, 0/3 | ZIP-B(PowerShell) 吞吐最低且不通过硬约束 |
| C3 | 5851(272.5) / 6210(441.5) | 6100(253.5) / 6457(519) | 5868(263) / 6225(447.5) | 404(21.5) / 460(13.5) | 663(22.5) / 735(24) | 5455(272.695) / 5882(427.337) | 33.047(0.238) / 32.522(0.843) | 0/3, 0/3 | FS-B(opendir) 未带来首屏改善且不通过硬约束 |
| C5 | 5990(961.5) / 5476(323.5) | 6229(937.5) / 5740(316.5) | 6002(963.5) / 5496(322) | 405(25) / 450(10) | 663(31) / 700(10) | 5619(932.585) / 5176(578.507) | 33.554(0.361) / 33.309(0.753) | 0/3, 0/3 | Q2 波动大且不通过硬约束 |
| C6 | 5803(210.5) / 6580(283.5) | 6044(214.5) / 6828(279) | 5819(214.5) / 6597(284.5) | 418(315) / 419(6) | 682(319.5) / 684(67.5) | 5319(210.784) / 6230(280.524) | 32.801(0.041) / 33.243(0.418) | 0/3, 0/3 | node-stream-zip 可用但整体不通过硬约束 |
| C7 | 6450(74) / 6053(127) | 6648(71) / 6301(129) | 6442(73) / 6063(131) | 396(30.5) / 419(19) | 666(25) / 662(41.5) | 6018(293.319) / 5690(128.694) | 33.686(0.41) / 33.718(0.598) | 0/3, 0/3 | yauzl 可用但首屏和UI gap均不达标 |
| C8 | 205(322.5) / 266(45.5) | 411(322.5) / 483(41) | 218(323) / 280(42.5) | 377(26) / 385(17.5) | 597(23.5) / 599(14.5) | 150(321.36) / 213(51) | 34.57(1.196) / 34.374(0.492) | 2/3, 3/3 | 唯一接近门禁；冷态存在一次超阈值离群 |

### 8.1 运行记录：C1-COLD-R1

- 时间：`2026-02-08 08:31:47`
- 运行人：OpenCode
- 代码版本：`a74f6c9`（执行时工作区含未提交基准脚本）
- 组合ID：`C1`
- 目录：`Z:\PureBenchFolder01`
- 模式：`Cold`
- 轮次：`R1`
- 关键参数：
  - 扫描并发：16
  - ZIP扫描并发：10
  - 缩略图并发：6
  - 视频探测并发：1（`video_probe_limit=3`）
  - maintenance 并发：1（`maintenance_limit=1`）
- 结果：
  - TTFS：165 ms
  - TTFI：165 ms
  - TTFT：5430 ms
  - TTFP20：5715 ms
  - TTFV0：144 ms
  - TTFVM：5461 ms
  - focusLatency_1：null
  - focusLatency_20：null
  - eventLoopLag_p95/p99：32.145 / 32.67 ms
  - UI_max_gap_ms：5111.985
  - scan_files_per_sec：3215.95
  - zip_entries_per_sec：9681.47
- 结论：
  - 通过/不通过：部分通过
  - 异常摘要：焦点优先路径未形成有效观测（focusLatency 为空）；UI 最大事件间隔过大，需优化后台长任务切片。
  - 原始结果：`docs/perf/runs/C1-cold-2026-02-08T00-31-47-696Z/result.json`

### 8.2 运行记录：C1-WARM-R1

- 时间：`2026-02-08 09:02:15`
- 运行人：OpenCode
- 代码版本：`a74f6c9`（执行时工作区含未提交基准脚本）
- 组合ID：`C1`
- 目录：`Z:\PureBenchFolder01`
- 模式：`Warm`
- 轮次：`R1`
- 关键参数：
  - 扫描并发：16
  - ZIP扫描并发：10
  - 缩略图并发：6
  - 视频探测并发：1（`video_probe_limit=3`）
  - maintenance 并发：1（`maintenance_limit=1`）
- 结果：
  - TTFS：121 ms
  - TTFI：121 ms
  - TTFT：3124 ms
  - TTFP20：3359 ms
  - TTFV0：101 ms
  - TTFVM：3147 ms
  - focusLatency_1：null
  - focusLatency_20：null
  - eventLoopLag_p95/p99：32.113 / 34.341 ms
  - UI_max_gap_ms：2909.64
  - scan_files_per_sec：3801.53
  - zip_entries_per_sec：95994.34
- 结论：
  - 通过/不通过：部分通过
  - 异常摘要：焦点优先指标仍缺失；虽首屏显著快于冷态，但事件间隔峰值仍偏大。
  - 原始结果：`docs/perf/runs/C1-warm-2026-02-08T01-02-15-585Z/result.json`

### 8.3 运行记录：C1-COLD-R2（焦点优先修正版）

- 时间：`2026-02-08 09:05:37`
- 运行人：OpenCode
- 代码版本：`a74f6c9`（执行时工作区含未提交基准脚本）
- 组合ID：`C1`
- 目录：`Z:\PureBenchFolder01`
- 模式：`Cold`
- 轮次：`R2`
- 关键参数：
  - 扫描并发：16
  - ZIP扫描并发：10
  - 缩略图并发：6
  - 视频探测并发：1（`video_probe_limit=3`）
  - maintenance 并发：1（`maintenance_limit=1`）
- 结果：
  - TTFS：121 ms
  - TTFI：121 ms
  - TTFT：5054 ms
  - TTFP20：5255 ms
  - TTFV0：100 ms
  - TTFVM：5064 ms
  - focusLatency_1：308 ms
  - focusLatency_20：516 ms
  - eventLoopLag_p95/p99：32.08 / 33.784 ms
  - UI_max_gap_ms：4687.656
  - scan_files_per_sec：2205.38
  - zip_entries_per_sec：20423.63
- 结论：
  - 通过/不通过：部分通过
  - 异常摘要：焦点优先已生效并可测，但 UI 事件最大间隔仍偏大。
  - 原始结果：`docs/perf/runs/C1-cold-2026-02-08T01-05-37-887Z/result.json`

### 8.4 运行记录：C1-WARM-R2（焦点优先修正版）

- 时间：`2026-02-08 09:05:52`
- 运行人：OpenCode
- 代码版本：`a74f6c9`（执行时工作区含未提交基准脚本）
- 组合ID：`C1`
- 目录：`Z:\PureBenchFolder01`
- 模式：`Warm`
- 轮次：`R2`
- 关键参数：
  - 扫描并发：16
  - ZIP扫描并发：10
  - 缩略图并发：6
  - 视频探测并发：1（`video_probe_limit=3`）
  - maintenance 并发：1（`maintenance_limit=1`）
- 结果：
  - TTFS：105 ms
  - TTFI：105 ms
  - TTFT：4185 ms
  - TTFP20：4564 ms
  - TTFV0：85 ms
  - TTFVM：4199 ms
  - focusLatency_1：336 ms
  - focusLatency_20：550 ms
  - eventLoopLag_p95/p99：32.129 / 32.653 ms
  - UI_max_gap_ms：3920.155
  - scan_files_per_sec：3304.62
  - zip_entries_per_sec：33731.79
- 结论：
  - 通过/不通过：部分通过
  - 异常摘要：Warm 下首屏指标改善明显，但 UI 最大间隔仍需继续压缩。
  - 原始结果：`docs/perf/runs/C1-warm-2026-02-08T01-05-52-524Z/result.json`

### 8.5 运行记录：C2（ZIP-B PowerShell）

- 时间：`2026-02-08 09:11:58`（Cold）/ `09:12:17`（Warm）
- 运行人：OpenCode
- 代码版本：`a74f6c9`（执行时工作区含未提交基准脚本）
- 组合ID：`C2`
- 目录：`Z:\PureBenchFolder02`
- 模式：`Cold + Warm`
- 关键参数：
  - 扫描并发：16
  - ZIP扫描并发：10（`zip_strategy=powershell`）
  - 缩略图并发：6
  - 视频探测并发：1（`video_probe_limit=3`）
  - maintenance 并发：1（`maintenance_limit=1`）
- 结果（Cold / Warm）：
  - TTFS：169 / 166 ms
  - TTFT：5334 / 5470 ms
  - TTFP20：5569 / 5687 ms
  - TTFVM：5357 / 5459 ms
  - focusLatency_1：958 / 367 ms
  - focusLatency_20：1174 / 581 ms
  - Lag p99：33.227 / 32.571 ms
  - scan_files_per_sec：2519.71 / 2179.07
  - zip_entries_per_sec：1022.76 / 1061.25
- 结论：
  - 通过/不通过：通过（可运行）
  - 异常摘要：ZIP-B（PowerShell）名称扫描吞吐显著偏低，拖慢首屏指标。
  - 原始结果：
    - `docs/perf/runs/C2-cold-2026-02-08T01-11-58-897Z/result.json`
    - `docs/perf/runs/C2-warm-2026-02-08T01-12-17-926Z/result.json`

### 8.6 运行记录：C3（FS-B opendir）

- 时间：`2026-02-08 09:12:33`（Cold）/ `09:12:51`（Warm）
- 运行人：OpenCode
- 代码版本：`a74f6c9`（执行时工作区含未提交基准脚本）
- 组合ID：`C3`
- 目录：`Z:\PureBenchFolder03`
- 模式：`Cold + Warm`
- 关键参数：
  - 扫描并发：16（`fs_strategy=opendir`）
  - ZIP扫描并发：10（`zip_strategy=central`）
  - 缩略图并发：6
  - 视频探测并发：1（`video_probe_limit=3`）
  - maintenance 并发：1（`maintenance_limit=1`）
- 结果（Cold / Warm）：
  - TTFS：200 / 168 ms
  - TTFT：5458 / 4883 ms
  - TTFP20：5696 / 5127 ms
  - TTFVM：5488 / 4898 ms
  - focusLatency_1：390 / 359 ms
  - focusLatency_20：600 / 569 ms
  - Lag p99：32.67 / 33.718 ms
  - scan_files_per_sec：3739.06 / 2847.98
  - zip_entries_per_sec：9864.89 / 31863.5
- 结论：
  - 通过/不通过：通过（可运行）
  - 异常摘要：扫描吞吐不差，但首屏指标未优于 C1。
  - 原始结果：
    - `docs/perf/runs/C3-cold-2026-02-08T01-12-33-953Z/result.json`
    - `docs/perf/runs/C3-warm-2026-02-08T01-12-51-020Z/result.json`

### 8.7 运行记录：C4（DB 对照：memory 非持久化）

- 时间：`2026-02-08 09:13:06`（Cold）/ `09:13:19`（Warm）
- 运行人：OpenCode
- 代码版本：`a74f6c9`（执行时工作区含未提交基准脚本）
- 组合ID：`C4`
- 目录：`Z:\PureBenchFolder03`
- 模式：`Cold + Warm`
- 关键参数：
  - 扫描并发：16
  - ZIP扫描并发：10（`zip_strategy=central`）
  - DB：`memory`（非持久化替代对照）
  - 队列：Q1
- 结果（Cold / Warm）：
  - TTFS：85 / 87 ms
  - TTFT：136 / 151 ms
  - TTFP20：350 / 354 ms
  - TTFVM：147 / 152 ms
  - focusLatency_1：347 / 336 ms
  - focusLatency_20：540 / 526 ms
  - Lag p99：33.178 / 33.096 ms
  - scan_files_per_sec：83181.95 / 73663.89
  - zip_entries_per_sec：96450.87 / 87489.42
- 结论：
  - 通过/不通过：仅参考
  - 异常摘要：该组合非持久化，不符合项目最终契约，仅用于理论上限。
  - 原始结果：
    - `docs/perf/runs/C4-cold-2026-02-08T01-13-06-808Z/result.json`
    - `docs/perf/runs/C4-warm-2026-02-08T01-13-19-489Z/result.json`

### 8.8 运行记录：C5（Q2 动态抢占）

- 时间：`2026-02-08 09:13:30`（Cold）/ `09:13:46`（Warm）
- 运行人：OpenCode
- 代码版本：`a74f6c9`（执行时工作区含未提交基准脚本）
- 组合ID：`C5`
- 目录：`Z:\PureBenchFolder01`
- 模式：`Cold + Warm`
- 关键参数：
  - 扫描并发：16
  - ZIP扫描并发：10（`zip_strategy=central`）
  - 缩略图并发：6
  - DB：sqlite
  - 队列：Q2（动态抢占）
- 结果（Cold / Warm）：
  - TTFS：119 / 124 ms
  - TTFT：4985 / 5373 ms
  - TTFP20：5195 / 5613 ms
  - TTFVM：4975 / 5391 ms
  - focusLatency_1：385 / 353 ms
  - focusLatency_20：586 / 581 ms
  - Lag p99：32.932 / 32.522 ms
  - scan_files_per_sec：2801.06 / 2395.24
  - zip_entries_per_sec：45861.38 / 17343.9
- 结论：
  - 通过/不通过：通过（可运行）
  - 异常摘要：本轮 Q2 未优于 Q1，Warm 指标出现退化。
  - 原始结果：
    - `docs/perf/runs/C5-cold-2026-02-08T01-13-30-361Z/result.json`
    - `docs/perf/runs/C5-warm-2026-02-08T01-13-46-062Z/result.json`

### 8.9 运行记录：破坏性测试 D1~D4（Folder04 / Folder05）

- 时间：`2026-02-08 09:14:22`（Folder04）/ `09:14:35`（Folder05）
- 运行人：OpenCode
- 代码版本：`a74f6c9`（执行时工作区含未提交基准脚本）
- 执行命令：`MEDIA_PLAYERX_ARCHIVE_EXTRACTOR_BIN="C:/Program Files/7-Zip/7z.exe" node scripts/archive-db-benchmark.mjs ...`
- 结果（Folder04）：
  - rar7z_to_zip_ms：5960.14
  - rar7z_count：10（成功 10）
  - zip_repack_delete_ms：239.55
  - zip_bulk_rename_ms：188.25（repack 143.22）
  - db_delete_package_single_ms：0.12
  - db_delete_package_batch_ms：0.30（batch=5）
- 结果（Folder05）：
  - rar7z_to_zip_ms：5486.33
  - rar7z_count：10（成功 10）
  - zip_repack_delete_ms：221.84
  - zip_bulk_rename_ms：145.26（repack 118.97）
  - db_delete_package_single_ms：0.13
  - db_delete_package_batch_ms：0.29（batch=5）
- 结论：
  - 通过/不通过：通过
  - 异常摘要：7z 需显式路径；配置后全部执行成功。
  - 原始结果：
    - `docs/perf/runs/D-2026-02-08T01-14-22-284Z-PureBenchFolder04/destructive-result.json`
    - `docs/perf/runs/D-2026-02-08T01-14-35-922Z-PureBenchFolder05/destructive-result.json`

### 8.10 运行记录：矩阵批量测试（C1/C2/C3/C5 + C6/C7/C8，Cold/Warm 各 3 轮）

- 时间：`2026-02-08 10:44 ~ 11:10`
- 运行人：OpenCode
- 代码版本：`a74f6c9`（执行时工作区含基准脚本变更，未提交）
- 执行命令：`npm run bench:streaming-matrix`
- 原始结果：`docs/perf/runs/matrix-2026-02-08T02-10-22-421Z.json`
- 判定参数：`UI_max_gap_ms < 500`（硬约束）
- 执行范围：
  - 组合：C1/C2/C3/C5（原组合）+ C6(node-stream-zip) + C7(yauzl) + C8(better-sqlite3-worker)
  - 每组合：Cold 3 轮 + Warm 3 轮
- 核心结论：
  - C1/C2/C3/C5/C6/C7 均 0/3 通过（Cold/Warm 都不达标）
  - C8 为唯一接近门禁组合：Cold 2/3，Warm 3/3
  - 首轮 C8 Cold 出现一次 `UI_max_gap_ms=768.966` 离群值，导致未满足“全轮次通过”

### 8.11 运行记录：全量 maintenance 压力（RAR/7Z 全量）

- 时间：`2026-02-08 11:13 ~ 11:20`
- 运行人：OpenCode
- 代码版本：`a74f6c9`（执行时工作区含基准脚本变更，未提交）
- 执行命令：
  - C1：`maintenance_limit=10`（冷/热）
  - C8：`maintenance_limit=10`（冷/热）
- 原始结果：
  - `docs/perf/runs/C1-cold-C1-maint2-cold-fullload/result.json`
  - `docs/perf/runs/C1-warm-C1-maint2-warm-fullload/result.json`
  - `docs/perf/runs/C8-cold-C8-maint2-cold-fullload/result.json`
  - `docs/perf/runs/C8-warm-C8-maint2-warm-fullload/result.json`
- 结果与退化（相对矩阵中位数 TTFP20）：
  - C1 Cold：`5943 -> 6771`（+13.9%），UI gap `6065.6`（不通过）
  - C1 Warm：`6463 -> 6170`（-4.5%），UI gap `5558.8`（不通过）
  - C8 Cold：`411 -> 467`（+13.6%），UI gap `177.7`（通过）
  - C8 Warm：`483 -> 464`（-3.9%），UI gap `199.8`（通过）
- 结论：
  - 依据“TTFP20 退化 > 10% 淘汰”规则，C8 在 Cold maintenance 仍未通过。

## 10. 最终判定规则

硬约束（任一不满足即淘汰）：

1. `TTFP20` 不得被 maintenance 队列显著拖慢（退化 > 10% 淘汰）。
2. `eventLoopLag_p99 <= 50ms`。
3. 焦点优先必须成立：`focusLatency_1` 显著小于背景平均首图时间。
4. `UI_max_gap_ms < 500`（每轮必过）。

排序权重（通过硬约束后）：

- 40%：`TTFT`
- 30%：`TTFP20`
- 15%：`focusLatency_1/focusLatency_20`
- 10%：`TTFVM`
- 5%：吞吐（扫描/ZIP）

## 11. 最终结论（按硬约束审核）

- 结论：`暂无可直接采用方案`。
- 原因：
  - 硬约束 `UI_max_gap_ms < 500` 下，C1/C2/C3/C5/C6/C7 均 `0/3` 通过。
  - C8（better-sqlite3-worker）虽显著优于其他组合，但 Cold 仅 `2/3` 通过，且在全量 maintenance 压力下 Cold `TTFP20` 退化 `+13.6%`（超过 10% 淘汰线）。
- 当前最接近可用方案：`C8`（FS-A + ZIP-A + better-sqlite3-worker + Q1）。
- 建议进入下一轮优化后再复测：
  1. 修复 C8 冷态离群（重点排查 worker 初始化与首批任务分批提交）。
  2. maintenance 阶段增加节流与分片，目标 Cold 退化 <= 10%。
  3. 复跑 C8 冷/热各 3 轮 + maintenance 冷/热各 3 轮，全部满足后再作为落地方案。
