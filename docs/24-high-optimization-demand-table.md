# 高优化需求项目表（系统级探索）

## 探索口径

- 范围：`src/`、`electron/`、`docs/`（含性能计划与执行复盘）。
- 高性能要求：直接影响首屏、翻页、模式切换、实时渲染、实时字幕等交互链路。
- 长时间处理要求：单任务持续秒到分钟，且涉及大规模 I/O、CPU/GPU、压缩/转码/模型推理。

| # | 模块 | 关键代码 / 文档 | 高性能或长时要求 | 已落地优化机制 | 当前主要优化缺口 | 优化需求等级 |
|---|---|---|---|---|---|---|
| 1 | 流式导入与首屏可用链路 | `docs/perf/2026-02-08-streaming-ingest-benchmark-plan.md`, `electron/services/file-system-read/librarySnapshotService.ts`, `src/features/backend/useResolvedMediaUrls.ts` | 需要同时满足 TTFS/TTFI/TTFT/TTFP20 与 `UI_max_gap < 500ms`，并发导入时仍可浏览 | 分级队列（interactive/page/background/maintenance）、多组合矩阵压测、焦点优先策略 | 现有结论仍为“暂无可直接采用方案”，冷态在 maintenance 压力下仍有超阈值退化 | S |
| 2 | 模式切换与首屏读取链路 | `docs/模式切换与首屏性能执行计划-P1-P4.md`, `src/components/SidebarPanel.tsx`, `src/features/app/useAppSidebarScopeState.ts` | 大库下模式切换与首屏需持续可交互，避免主线程卡顿 | Sidebar 虚拟列表（Virtualized Rows）、非当前模式重计算门控、Lite 快照链路、刷新节流 | P4 仍需持续稳口径复测与长任务峰值抑制 | S |
| 3 | 缩略图 URL 解析与 DOM 更新 | `docs/perf/2026-02-08-ui-perf-benchmark-plan.md`, `src/features/backend/useResolvedMediaUrls.ts` | 占位尽快出现且 DOM 不冻结，避免状态更新风暴 | 采用 `R1-S1` 默认策略、active-only 状态域、并发上限、失败退避重试；自适应分辨率降低后端响应延迟减轻排队压力；`thumbnailQueueSize` 经 `resolveMediaResource` 透传使前端并发与后端队列容量可协同调参 | 高并发翻页 + 导入并行场景下仍需实测验证参数组合稳定性 | A |
| 4 | 缩略图生成管线 | `electron/fileSystemThumbnailResolver.ts`, `electron/thumbnailRenderWorker.ts` | 大量图片批量生成时需控制 CPU/内存峰值并保持吞吐 | 全局并发限流、任务去重（pending map）、worker 心跳与超时、缓存键去重、CPU token；**自适应分辨率**（`thumbnailAdaptiveResolution`）按 `dpr × displayEdge` 缩放 maxEdge，密集布局吞吐提升 2-3x；**队列容量可调**（`thumbnailQueueSize` 16-256，运行时生效）；**CPU 并发可调**（`cpuTokenLimit` 1-16，`TokenSemaphore.resize()` 动态生效） | 自适应模式下缩放级别切换引起的缓存失效率需实测量化；极端 DPR（≥3）+ 大格布局下 maxEdge 可能反超旧固定值 | A |
| 5 | 全屏重采样与解码缓存 | `docs/23-fullscreen_resampling_ssot_draft.md`, `electron/fileSystemFullscreenResizer.ts`, `src/components/fullscreen/useFullscreenImageSource.ts` | 提升画质同时保证快速翻页不阻塞、不闪烁 | `fullscreen > original > thumbnail` 回退链路、重采样并发上限、LRU 解码缓存；`cpuTokenLimit` 运行时可调（`TaskResourceGovernor.resizeCpuSemaphore`），缩略图与重采样共享信号量的竞争可按硬件能力动态平衡 | 内存上限与高分辨率解码缓存淘汰策略仍需按实际数据集验证 | A |
| 6 | 压缩包归一化（RAR/7z/ZIP） | `docs/04-architecture-v1.md`, `electron/services/file-system-read/archiveNormalizationService.ts`, `electron/archiveNormalizeWorker.ts` | 归一化任务耗时长，必须后台运行且不能阻塞交互读链路 | 高低优先级队列、交互热区延迟、重试+熔断（Circuit Breaker）、写锁与恢复清理 | 长尾失败与队列积压场景仍需持续观察 | A |
| 7 | 导入任务与快照刷新 | `electron/fileSystemImportTasks.ts`, `electron/services/file-system-read/importTaskService.ts`, `electron/services/file-system-read/librarySnapshotService.ts` | 文件数和容器数高时需要长时间扫描、构建、持久化并持续可观测 | 串行任务队列、薄扫描预览快照、进度节流、交互热区并发降级 | 冷态大数据集仍是主要耗时源，导入期刷新风暴需持续压制 | A |
| 8 | 图包 RS 批量转换 | `electron/services/file-system-read/managementImageConvertService.ts`, `docs/rs-convert-execution-plan.md` | 目录/ZIP 批量转码是分钟级任务，且必须保证文件安全 | 并发 worker 转换、临时文件+备份回滚、ZIP 重打包校验、进度/取消链路 | 故障注入覆盖（损坏包、磁盘不足）仍有扩展空间 | A |
| 9 | 离线自动字幕实时识别（ASR + VAD + Speaker） | `electron/subtitles/asrWorker.ts`, `docs/offline-auto-subtitle-advanced-implementation-plan.md` | 目标端到端延迟低、长时间运行稳定，并处理多说话人分离 | 独立 worker、VAD 分段、speaker 相似度决策、epoch/seq 防乱序、心跳检测 | Advanced 模式仍处于持续收敛阶段（锁定与边界质量） | S |
| 10 | 自动字幕持久化与 seek 回放 | `electron/subtitles/subtitleSession.ts` | 长视频连续处理下需避免 seek 回放重复写入/覆盖污染 | ValidRanges、重叠替换规则、原子写盘（tmp->rename）、文件优先回放窗口 | 规则复杂度高，频繁 seek/回放边界仍需持续验证 | A |
| 11 | 字幕清洗链路（转写 + LLM） | `electron/services/file-system-read/librarySubtitleCleanupOps.ts` | ffmpeg 提取 + 全量转写 + LLM 清洗是长任务，需可超时、可取消、可回报进度 | 分阶段超时策略、流式 SSE 增量更新、worker 生命周期清理 | 外部端点波动对耗时和稳定性影响较大 | B |
| 12 | 管理模式广告审核批处理 | `electron/manageAdReview/adReviewEngine.ts` | 大批量图片 LLM 审核耗时高，需控制吞吐与成本 | 哈希短路（known-hash）、限并发映射、head-tail 策略、尾部 clean streak 提前停止 | 吞吐-准确率-成本三方平衡仍需按数据集持续调参 | B |
| 13 | 音乐可视化实时渲染 | `src/features/music-visualizer/useMusicVisualizerRuntime.ts`, `docs/13-music-visualizer-shader-migration-playbook.md` | 30/60/120 FPS 实时渲染，需在 GPU 不可用时平稳回退 | FPS cap、WebGL2->Canvas2D 回退、Tone Mapping 平滑、帧耗时/FPS 统计 | 高分辨率与复杂 Shader 组合下仍有性能上限压力 | A |

## 分级说明

- `S`：系统关键实时链路或核心长任务，直接影响可用性。
- `A`：高频交互/高吞吐核心模块，需持续优化与回归压测。
- `B`：长任务为主，主要依赖限流、超时、容错与用户可观测性。

## 变更记录

### 2026-02-25：缩略图自适应分辨率 + 高级性能参数开放

**涉及条目**：#3、#4、#5

| 变更 | 机制 | 影响范围 |
|------|------|----------|
| `thumbnailAdaptiveResolution`（默认开启） | 缩略图 maxEdge 按 `dpr × max(actualCellWidth, actualMediaHeight)` 计算，移除固定 `thumbnailWidth` 下限 | #4 生成量：密集布局（7×7 ~160px）吞吐从 ~44 img/s 提升至 ~100+ img/s；#3 resolve 延迟间接降低 |
| `thumbnailQueueSize`（设置面板可调，16-256） | 后端 `fileSystemThumbnailResolver` 队列容量从硬编码 64 改为运行时可变，经 `resolveMediaResource.thumbnail.queue_size` 透传 | #4 队列溢出/丢弃行为可按场景调优；#3 前后端参数协同 |
| `cpuTokenLimit`（设置面板可调，1-16） | 新增 IPC channel `updatePerformanceConfig`，`TaskResourceGovernor.resizeCpuSemaphore()` 动态调整信号量容量 | #4 缩略图生成并发；#5 全屏重采样并发；共享信号量的竞争可运行时平衡 |

**新增残留缺口**：
- 自适应模式下缩放级别切换导致的缓存 key 变化（maxEdge 不同 → 缓存未命中），需实测缓存失效率
- 极端 DPR（≥3）+ 大格布局下 maxEdge 可能超过旧固定值，需评估是否需要上限 clamp
