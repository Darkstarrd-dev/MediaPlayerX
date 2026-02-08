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

## 模块边界

- `contracts`：Zod schema 与强类型 IPC 请求/响应。
- `domain`：纯业务规则与用例编排。
- `infra`：文件系统、SQLite、LanceDB、LM Studio 适配器、文件监控适配器。
- `ui`：React 页面/组件与纯 UI 状态。

模块之间不得直接读取彼此内部实现，必须通过接口合约交互。

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
