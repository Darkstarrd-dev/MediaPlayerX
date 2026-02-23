# MediaPlayer 架构设计 V1

Last updated: 2026-02-22

## 设计原则

- 本地优先，数据归用户本机所有。
- 高内聚、低耦合，严格执行模块边界。
- IPC 合约统一使用 Zod 校验。
- 长耗时任务全部下沉到 Worker。
- 降低数据库对压缩包内部细节的存储压力。

## 运行时分层

### 当前实现阶段（实链路）

- 已完成从“虚拟 UI”到“真实后端链路”的迁移，当前以实链路稳定性与质量收敛为主。
- Electron Main / Preload 已接入真实只读 I/O 与媒体访问协议白名单。
- 媒体浏览链路已支持真实图片/视频渲染，Mock 数据仅保留测试用途。
- 扫描与重处理遵循性能门禁（双规并行 + Correctness 优先）。
- Main 已接入写链路（评分/封面保存）与 optimistic rollback 协议契约。
- 读链路（snapshot/sidebar/page/playlist）采用“快速返回最近一次 SQLite 快照 + 后台刷新/清理”策略，禁止被长耗时扫描阻塞。
- 压缩包扫描接入归一化策略：`rar/7z` 走“内存解包 -> 非 webp 图片转 `webp(90)` -> `zip(store)` 并原地替换”；zip 非 `store/deflate` 图片条目 -> `webp(90)` 后转存 zip(store)。
- SQLite 基座已启用（含 migration/init/version）；扫描产物以事务 upsert + stale 清理写入数据库，读取统一以 SQLite 为 SSOT。
- 播放列表写链路已下沉 Main：Renderer 通过 `Repository -> preload -> ipc` 调用 `readPlaylist/writePlaylist`，重启后可恢复。
- 音频元数据写链路已下沉 Main：Renderer 通过 `Repository -> preload -> ipc` 调用 `writeAudioMetadata`，写入 SQLite `audio_metadata` 并回写快照。
- 音乐模式可视化已接入 Shader 渲染链路：Renderer 通过独立 `music-visualizer` 模块提供 `WebGL2(GPU)` 与 `Canvas2D(CPU fallback)` 双后端运行时。
- 缩略图变体链路已落地：`resolveMediaResource` 支持 `original/thumbnail` 变体，thumbnail 由 Main 使用 Sharp 生成 WebP 并落盘缓存。
- 运行时依赖预检已落地：Main 暴露依赖可用性与降级策略矩阵（`sharp/ffmpeg/ffprobe/archive-wasm/powershell`），Renderer 在降级时显示告警。
- `rar/7z` 归一化调度采用“双优先级队列”：默认低优先级（交互空闲后按路径排序执行），用户显式打开目标包时提升为高优先级后台处理。
- Main 通过 `libraryChanged + archiveLoadStatus` 向 Renderer 推送/暴露归一化进度状态，UI 可在不阻塞交互的前提下显示 pending/running。
- 代码结构重构（按职责块）已完成：
  - Renderer 侧入口已收敛为薄编排：`src/App.tsx` -> `useAppController` -> `useAppDataPipeline`。
  - `useAppDataPipeline` 仅保留编排职责；运行时源、读链路、导航链路、显示/副作用、顶部层绑定、工作区绑定、视图组装已拆到独立 hooks。
  - Main 侧 `FileSystemMediaReadService` 拆分已完成：`electron/fileSystemReadService.ts` 收敛为 Facade 入口，`electron/fileSystemReadFacade.ts` 负责组装并委托领域服务。
  - `fileSystemReadService` 领域服务拆分已落地：Token、Runtime、EventBus、ImportPathRegistry、ArchiveNormalization、LibrarySnapshot、ImportTask、LibraryReadWrite、ManagementMutation、MediaResource。
  - 当前关键入口文件保持薄入口形态，不承载业务细节。
- 管理模式图片选择交互接线已完成：`ImageMainSection` 已统一改用 `useManageImageSelectionInteractions`，旧实现已移除。
- 音乐可视化资源注册已模块化：Shader 通过 `import.meta.glob('./shaders/*.ts')` 自动发现，替换/新增 Shader 不需要修改 App 壳层组装代码。
- 大文件拆分已完成：`src/App.css` 已拆分为 `src/styles/app/*` 聚合样式，`electron/mediaLibraryDatabase.ts` 已拆分为 Facade + stores（schema/snapshot/metadata/playlist/task/app state）。
- 管理模式广告图片审核 (LLM Ad Review) 已完成纵向接线：`Renderer -> Repository -> preload/ipc -> Main service -> manageAdReview core` 全链路可用。
- 管理模式 RS 图包转换已接入真实后端任务：`start/read/cancelImageConvertTask` 由 Main 异步执行目录/zip 转换，执行态通过轮询上报 `total/processed/success/failed`。
- RS 转换写入策略采用临时文件 + 备份回滚：目录文件遵循“新文件就位后删除源文件”，zip 重打包遵循“临时 zip 校验后原子替换”，失败时回滚并保留诊断错误。

### Electron Main 进程

- 窗口生命周期与应用壳管理。
- 原生对话框与粘贴路径接入。
- 文件系统监控编排。
- 任务队列调度与执行监管。
- IPC 路由与权限边界控制。

### Preload 桥接层

- 仅暴露白名单 API。
- 请求与响应均校验共享合约。
- 阻断 Renderer 对 Node API 的直接访问。

### Renderer（React）

- 负责 Header、Sidebar 树、Main 网格/预览、元数据面板、设置遮罩层、全屏 Footer。
- 负责图片模式/视频模式切换。
- 负责音乐模式可视化运行时编排（音频采样、渲染后端选择、FPS 指标采集、分辨率缩放策略）。
- 负责向量模式容器与结果参数控制。
- 状态管理采用 Zustand 多 slice。

### Worker 服务层

- 扫描 Worker：递归发现、压缩包识别、变更检测。
- 缩略图 Worker：Sharp 管线与参数化生成。
- 向量 Worker：批处理调度与 LM Studio Embedding 调用。
- 压缩包维护 Worker：转换、重打包、重命名、重排序任务。
- 视频 Worker：元数据提取与手动封面持久化。
- 管理审核能力：已接入管理模式审核任务链路（任务启动/轮询/人工复核/确认删除），并复用现有删除写链路。

## 音乐可视化模块边界（新增）

- `src/features/music-visualizer/shaders/*`：纯 Shader 资源定义（Shadertoy 源码或等价 GLSL）。
- `src/features/music-visualizer/shaderRegistry.ts`：Shader 自动发现与默认项解析。
- `src/features/music-visualizer/shadertoyAdapter.ts`：`mainImage(out vec4, in vec2)` 到 WebGL2 fragment entry 适配。
- `src/features/music-visualizer/audioAnalyser.ts`：`AudioContext + AnalyserNode` 音频采样与频谱/波形缓冲。
- `src/features/music-visualizer/webglRenderer.ts`：GPU 后端（WebGL2）渲染器，接收 `iChannel0` 音频纹理输入。
- `src/features/music-visualizer/cpuRenderer.ts`：CPU 保底后端（Canvas2D），用于无硬件加速环境。
- `src/features/music-visualizer/useMusicVisualizerRuntime.ts`：统一运行时调度层（后端切换、渲染循环、FPS/帧耗时统计、内部渲染分辨率控制）。

约束：播放器主组件只传递输入与配置，不直接耦合 Shader 细节；新增 Shader 时不允许改动 App 顶层编排。

## 媒体协议跨域头（新增）

- 自定义媒体协议 `mediaplayerx-media://` 在 Main `protocol.handle` 响应中补充 CORS 头：
  - `Access-Control-Allow-Origin`
  - `Access-Control-Expose-Headers`
  - `Vary: Origin`（按请求 Origin 回显时）
- 目的：保证 `<audio crossOrigin="anonymous">` 能稳定接入 Web Audio 分析链路，避免 `createMediaElementSource` 在部分环境下被安全策略拒绝。

## 管理模式 LLM 广告审核（已接线完成）

- 输入：管理模式当前勾选对象（Sidebar 节点或图片条目）映射出的图片集合。
- 审核链路：Main/Worker 调用 LLM 接口执行广告检测，返回“疑似广告候选”而非直接删除。
- 执行参数：Renderer 通过 `startManageAdReview` 透传策略与并发配置（`all/head-tail`、`max_concurrency`），Main 统一归一化后下发引擎。
- 人工确认：Renderer 展示候选清单，用户确认后复用既有删除接口执行物理删除。
- 缓存策略：新增“已确认删除图片哈希”记录，用于后续同图快速命中、跳过 LLM。
- 已完成（core）：`adReviewEngine`、`openAiVisionClient`、`jsonExtract`、`hashStore`、`concurrency` 与对应单测。
- 已完成（integration）：contracts/preload/ipc/repository 接线，管理面板审核列表、任务轮询、危险确认删除与结果回写闭环。
- 已完成（persistence）：确认删除项的哈希写入 `app_state`，后续同图命中可走 known-hash 短路。
- 已完成（observability）：审核任务 DTO 新增 `execution/audit` 字段，包含来源分布（known-hash/llm/skip）与命中率（LLM/overall），并在管理面板可视化。
- 详细实现以当前 `electron/manageAdReview/*` 与前端管理面板接线代码为准。

## 模块边界

- `contracts`：Zod schema 与强类型 IPC 请求/响应。
- `domain`：纯业务规则与用例编排。
- `infra`：文件系统、SQLite、向量检索适配器、LLM 适配器、文件监控适配器。
- `ui`：React 页面/组件与纯 UI 状态。

模块之间不得直接读取彼此内部实现，必须通过接口合约交互。

## Renderer 模块化约束（新增功能强制）

- 新功能必须沿现有“薄入口 + 分层编排”模式扩展，不得将复杂逻辑回填到 `src/App.tsx`、`useAppController`、`useAppDataPipeline`。
- 推荐分层顺序：
  - `useAppRuntimeSources`：基础来源（settings/repository/session/media/import）。
  - `useAppReadState`：查询条件、筛选状态、只读请求触发。
  - `useAppNavigationState`：Sidebar/分页/focus/布局导航。
  - `useAppDisplayAndEffects`：显示态聚合、写链路、全屏与交互副作用。
  - `useAppTopLayerBindings` / `useAppWorkspaceBindings` / `useAppViewComposition`：UI 绑定与壳层 props 组装。
- 新能力需要“读 + 写 + UI”时，必须按垂直切片落到对应层，不允许单文件同时承载数据请求、导航状态、UI 组装三类职责。
- 代码评审门禁：出现新 God Class/God Hook（单文件混合多层职责、难以单测）时，不允许合并；需先按层拆分再提交。

## 数据模型策略

### SQLite 职责

- 入库根目录与监控设置。
- 图包/压缩包级元数据。
- item 级稳定标识与展示状态。
- 用户整理字段（`grade`、封面、播放列表、显示名、手动元数据）。
- 音频元数据覆盖（`album`、`author`、`track_title`、`series_id`）与更新时戳。
- 任务状态与操作日志。
- 偏好行为指标专表：
  - 聚合缓存层：
    - `image_preference_metrics`（按图包聚合，记录事件次数、已读页数、完成度、最近行为时间）
    - `video_preference_metrics`（按视频聚合，记录事件次数、观看时长、完成度、最近行为时间）
  - 会话事实层：
    - `image_preference_sessions`（按图片会话记录，包含开始/结束时间、页数、完成度、结束原因）
    - `video_preference_sessions`（按视频会话记录，包含开始/结束时间、时长、完成度、是否噪音 `is_noise`）
  - 运行时检查点层：
    - `image_preference_runtime`（进行中图片会话的 checkpoint，用于崩溃恢复）
    - `video_preference_runtime`（进行中视频会话的 checkpoint，用于崩溃恢复）

### 偏好行为指标写入策略（Preference Metrics）

- 采集与展示解耦：运行时先写内存缓冲；通过心跳 checkpoint（默认 2s）异步上送，展示通过快照 DTO 读取专表结果。
- 图片事件仅在“图片全屏会话”中采集；会话结束触发一次落库（退出全屏/模式切换/退出 App）。
- 视频事件支持全屏与非全屏采集；非全屏会话 `<10s` 会保留事实层并标记 `is_noise=1`，但不计入聚合缓存。
- 统一入口：Renderer 通过 `writeAppState(xp_preference_metrics_v1)` 上送缓冲快照（聚合缓存 + 会话事件 + runtime checkpoint），Main 在 `writeAppState` 分支解析并写入专表，保持 IPC 面稳定。
- 崩溃恢复：主进程启动时扫描 `*_preference_runtime`，将遗留会话补写到 `*_preference_sessions`（`end_reason=recovered-after-crash`），并回填聚合缓存后清理 runtime 行。
- 指标口径与字段定义以 `docs/preference-metrics-spec-v1.md` 为唯一事实源。

### 向量字段职责（当前实现）

- 图片级向量当前存储在 SQLite（`feature_vector_json`）字段。
- 相似检索由仓库层读取向量字段并执行计算，不引入独立向量数据库。

### 压缩包内部命名策略

- 核心浏览链路不依赖 `zip` 内部文件名。
- 以稳定 item 标识和序号导航为主。
- `zip` 图片路径展示使用“压缩包绝对路径 + 序号”。

## 任务编排

- 所有重负载操作以异步任务执行，统一状态：
  - pending
  - running
  - paused
  - completed
  - failed
  - cancelled
- 任务支持暂停恢复与失败重试。
- 并发度与批量参数可配置。
- 导入任务完成语义：以“薄扫描 + SQLite 入库完成”为准；归一化/重处理任务在后台继续推进，并通过任务消息持续回报阶段与已处理数量。

## 安全约束

- 路径标准化与路径穿越防护。
- `zip` 异常输入防护与容错处理。
- 所有物理文件变更需显式用户确认。
- 禁止静默破坏性操作。

## 测试策略对齐

- 单元测试：领域规则、路径处理、调度逻辑、schema 校验。
- 组件测试：核心面板行为与模式切换。
- 集成测试：SQLite + 文件系统联动链路。
- E2E：保持用户手动执行的脚本化检查清单。

## 可维护性与稳定性改进专项（已完成）

- 专项实施文档：已归档到 `docs/archive/implementation-plans/`，不再作为当前执行入口。
- 执行优先级：
  - P0：SQLite 存储层与媒体访问安全守卫测试。
  - P1：核心编排链路集成测试与 `build*Props` 纯函数测试。
  - P2（可选）：跨模块边界类型接口收口，降低签名级联风险。
- 阶段门禁：每阶段结束均需通过 `npm run lint`、`npm run test`、`npm run build`。
