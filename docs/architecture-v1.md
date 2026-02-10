# MediaPlayer 架构设计 V1

## 设计原则

- 本地优先，数据归用户本机所有。
- 高内聚、低耦合，严格执行模块边界。
- IPC 合约统一使用 Zod 校验。
- 长耗时任务全部下沉到 Worker。
- 降低数据库对压缩包内部细节的存储压力。

## 运行时分层

### 当前实现阶段（虚拟 UI）

- 已完成 Renderer 交互骨架与本地模拟状态；并进入后端接入 Phase-2。
- Electron Main / Preload 已接入真实只读 I/O 与媒体访问协议白名单。
- 媒体浏览链路已支持真实图片/视频渲染，虚拟数据仅作为回退与测试输入。
- 扫描与重处理遵循性能门禁（双规并行 + Correctness 优先）。
- Main 已接入写链路（评分/封面保存）与 optimistic rollback 协议契约。
- 压缩包扫描接入归一化策略：`rar/7z` 走“内存解包 -> 非 webp 图片转 `webp(90)` -> `zip(store)` 并原地替换”；zip 非 `store/deflate` 图片条目 -> `webp(90)` 后转存 zip(store)。
- SQLite 基座已启用（含 migration/init/version）；扫描产物以事务 upsert + stale 清理写入数据库，读取统一以 SQLite 为 SSOT。
- 播放列表写链路已下沉 Main：Renderer 通过 `Repository -> preload -> ipc` 调用 `readPlaylist/writePlaylist`，重启后可恢复。
- 缩略图变体链路已落地：`resolveMediaResource` 支持 `original/thumbnail` 变体，thumbnail 由 Main 使用 Sharp 生成 WebP 并落盘缓存。
- 运行时依赖预检已落地：Main 暴露依赖可用性与降级策略矩阵（`sharp/ffmpeg/ffprobe/archive-wasm/powershell`），Renderer 在降级时显示告警。
- `rar/7z` 归一化调度采用“双优先级队列”：默认低优先级（交互空闲后按路径排序执行），用户显式打开目标包时提升为高优先级后台处理。
- Main 通过 `libraryChanged + archiveLoadStatus` 向 Renderer 推送/暴露归一化进度状态，UI 可在不阻塞交互的前提下显示 pending/running。
- 代码结构重构（按职责块）已完成：
  - Renderer 侧入口已收敛为薄编排：`src/App.tsx` -> `useAppController` -> `useAppDataPipeline`。
  - `useAppDataPipeline` 仅保留编排职责；运行时源、读链路、导航链路、显示/副作用、顶部层绑定、工作区绑定、视图组装已拆到独立 hooks。
  - Main 侧 `FileSystemMediaReadService` 拆分已完成：`electron/fileSystemReadService.ts` 收敛为 Facade 入口（`2` 行），`electron/fileSystemReadFacade.ts` 负责组装并委托领域服务（约 `548` 行）。
  - `fileSystemReadService` 领域服务拆分已落地：Token、Runtime、EventBus、ImportPathRegistry、ArchiveNormalization、LibrarySnapshot、ImportTask、LibraryReadWrite、ManagementMutation、MediaResource。
  - 当前关键入口文件规模：`src/App.tsx` `10` 行，`src/features/app/useAppController.ts` `5` 行，`src/features/app/useAppDataPipeline.ts` `34` 行。
- 管理模式图片选择交互接线已完成：`ImageMainSection` 已统一改用 `useManageImageSelectionInteractions`，旧实现已移除。
- 大文件拆分已完成：`src/App.css` 已拆分为 `src/styles/app/*` 聚合样式，`electron/mediaLibraryDatabase.ts` 已拆分为 Facade + stores（schema/snapshot/metadata/playlist/task/app state）。
- 管理模式广告图片审核 (LLM Ad Review) 已完成 core 模块（`electron/manageAdReview/*`），当前待按 `Renderer -> Repository -> Main/Worker` 完成纵向接线。

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
- 负责向量模式容器与结果参数控制。
- 状态管理采用 Zustand 多 slice。

### Worker 服务层

- 扫描 Worker：递归发现、压缩包识别、变更检测。
- 缩略图 Worker：Sharp 管线与参数化生成。
- 向量 Worker：批处理调度与 LM Studio Embedding 调用。
- 压缩包维护 Worker：转换、重打包、重命名、重排序任务。
- 视频 Worker：元数据提取与手动封面持久化。
- 管理审核 Worker（开发中）：core 能力已落地（策略引擎/LLM 客户端/哈希短路/并发控制），待完成 IPC 与 UI 接入。

## 开发中模块：管理模式 LLM 广告审核（Core 已完成）

- 输入：管理模式当前勾选对象（Sidebar 节点或图片条目）映射出的图片集合。
- 审核链路：Main/Worker 调用 LLM 接口执行广告检测，返回“疑似广告候选”而非直接删除。
- 人工确认：Renderer 展示候选清单，用户确认后复用既有删除接口执行物理删除。
- 缓存策略：新增“已确认删除图片哈希”记录，用于后续同图快速命中、跳过 LLM。
- 已完成（core）：`adReviewEngine`、`openAiVisionClient`、`jsonExtract`、`hashStore`、`concurrency` 与对应单测。
- 待完成（integration）：contracts/preload/ipc/repository 接线，管理面板审核列表与确认删除闭环。
- 详细计划与阶段拆解见 `docs/management-llm-ad-review-plan-v1.md`。

## 模块边界

- `contracts`：Zod schema 与强类型 IPC 请求/响应。
- `domain`：纯业务规则与用例编排。
- `infra`：文件系统、SQLite、LanceDB、LM Studio 适配器、文件监控适配器。
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
- 任务状态与操作日志。

### LanceDB 职责

- 图片级向量存储。
- 相似检索与候选召回。

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

## 安全约束

- 路径标准化与路径穿越防护。
- `zip` 异常输入防护与容错处理。
- 所有物理文件变更需显式用户确认。
- 禁止静默破坏性操作。

## 测试策略对齐

- 单元测试：领域规则、路径处理、调度逻辑、schema 校验。
- 组件测试：核心面板行为与模式切换。
- 集成测试：SQLite + LanceDB + 文件系统联动链路。
- E2E：保持用户手动执行的脚本化检查清单。
