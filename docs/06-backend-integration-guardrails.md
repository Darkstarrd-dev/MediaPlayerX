# 后端接入规避方案（强制执行）

Last updated: 2026-06-01

## 适用范围

- 适用于当前实链路阶段的全部后端相关开发（本地扫描 / Electron IPC / API / 数据库）。
- 本文为长期强制约束，优先级高于临时口头约定。

## 强制原则

1. 单一事实源 (Single Source of Truth, SSOT)
   - 同一业务状态只能有一个来源。
   - 禁止在组件内复制一份可变镜像状态（例如再维护一个不同步的列表副本）。

2. 数据访问层 (Data Access Layer, Repository)
   - UI/Hook 禁止直接请求后端。
   - 必须通过 `Repository` 接口访问数据（Mock 与真实后端实现同一接口）。

3. 传输对象映射 (Data Transfer Object, DTO -> ViewModel)
   - 组件禁止直接使用后端原始 DTO。
   - 必须在适配层完成 DTO 到 ViewModel 的显式映射。

4. 异步一致性控制
   - 列表查询、筛选、分页切换必须具备取消旧请求能力（`AbortController` 或等价方案）。
   - 状态更新必须带请求代号（request id）或版本比较，防止旧响应覆盖新状态。

5. 错误与降级
   - 后端异常必须有 UI 可见反馈（非静默失败）。
   - 必须提供可恢复路径（重试 / 回退到上次成功快照）。

6. 模块边界不可回退
   - 已拆分模块（`features/*`）禁止反向合并回 `App.tsx`。
   - 新增复杂逻辑优先放入对应 feature hook/service，不直接堆入页面组件。

7. 媒体访问协议与定位模型
   - 媒体来源统一通过 `MediaLocator`（文件系统 / 压缩包 entry）表达。
   - Renderer 仅可消费 Main 颁发的受控 `resource_url`，禁止拼接本地路径直读。
   - Main 必须执行根目录白名单与路径穿越校验，压缩包 entry 必须做合法性校验。

8. 压缩包归一化策略（强制）
   - `rar/7z` 不参与直接渲染读取，统一策略为“内存解包 -> 非 webp 图片转 webp(quality=90) -> 转存 zip(store) -> 再进入扫描/渲染”。
   - zip 若包含图片 entry 且压缩方式不是 `store/deflate`，统一策略为“解压 -> 图片转 webp(quality=90) -> 转存 zip(store)”。
   - 不支持加密 zip 直接渲染，必须走归一化或拒绝读取并记录审计。

9. 写链路一致性
   - 图包评分、封面保存等写操作必须下沉到 Main，通过 IPC 契约完成。
   - 播放列表读写同样必须下沉到 Main，通过 IPC 契约完成，不允许 Renderer 本地持久化分叉。
   - Renderer 允许乐观更新 (optimistic update)，但失败必须回滚 (rollback)，并保留可见错误信息。
   - 管理删除写链路必须返回结构化 `failed[]` 明细（禁止仅返回布尔值）；Renderer 必须展示“删除成功数 + 失败数”，并将“部分失败”与“整体异常”区分处理。

10. SQLite 基座约束
    - 读链路（snapshot/sidebar/page/metadata）必须以 SQLite 为单一事实源，内存仅作为临时缓存。
    - 扫描结果必须使用事务 upsert，并同步删除/失效条目，禁止仅依赖进程内状态恢复。

11. 反 God Class / God Hook 约束
    - 新增功能禁止把“数据读取 + 状态编排 + UI 组装 + 副作用”堆在单个文件。
    - `App` 入口链路（`src/App.tsx`、`useAppController`、`useAppDataPipeline`）仅保留编排，不承载业务细节。
    - 同一文件若同时出现跨层职责并持续膨胀，必须先拆分再继续叠加需求。

12. 图片读链路结构性分页（强制）
    - `readImageSidebarTree` 响应禁止携带全库 `images[]`：侧边栏源仅含 `image_count` 与封面 `cover_media_locator`（对应 `imageSourceSidebarDtoSchema`）。
    - 渲染进程通过 `readSourceImages(source_id)` 按“访问到的源”懒加载图片并在会话内缓存（`useSourceImageCache`），禁止恢复“整库 images 常驻渲染进程”的旧模型。
    - 任何同时展示多源缩略图的视图（向量检索结果、AdReview 聚合结果等）必须把涉及的源 id 纳入按需加载集合（`useAppSidebarScopeState` 的 `neededSourceIds`），并把其有效 image id 纳入 `validImageIdSet`，否则会出现缩略图空白与管理选择被误剪（默认全选被清空）。
    - 计数/枚举（页数、导航边界、ref 枚举）必须使用 `resolveSourceImageCount`（= `imageCount ?? images.length`），不得依赖已加载的 `images.length`。

13. 外部源监听开关（自动 + 手动并存）
    - `setExternalSourceWatcherEnabled(enabled)` 与 `requestExternalSourceFolderRefresh(path_key)` 必须走 Zod schema IPC 契约，前端 useSettingsPersistence 在 `externalSourceWatcherEnabled` 变化时主动 push；`requestExternalSourceFolderRefresh` 的 `path_key` 为用户选中的侧栏文件夹路径（`normalizeAllowlistKey(node.pathKey)`），**不要求**必须是已登记的 import 目录根——单文件导入的压缩包/视频/音频所在文件夹、或目录根的子文件夹，均可通过刷新按钮按存在性局部 prune 其下的快照条目。`matched_directory_root` 返回匹配到的目录根(若有)或 null，前端不读该字段。
    - 开关由后端持久化（appState key `external_source_watcher_enabled`），`ensureStateLoaded` 启动时恢复，不依赖渲染端水合后异步推送；渲染端 push 仅作为变更通道。
    - 手动模式（开关关闭）语义为**完全静默**：不挂载 watcher，且整库存在性自动清理（auto-prune，含 `ensureSnapshotLoaded`/`refreshSnapshotFromFilesystem` 后的同步/异步 sweep）一并跳过；外部新增/删除均不自动同步，只能通过侧栏手动刷新触发局部 prune。自动模式下异步整库 sweep 受最小间隔节流（60s）。
    - 管理操作（删除/移动/重命名等 `withManagementMutationGuard` 包裹的命令）期间 watcher 事件被抑制并附带尾窗（2s），应用自身的文件变更不得触发全量重扫。
    - 后端 prune 范围受 `pathFilter = (absolutePath) => isPathInsideRoot(selectedPathKey, absolutePath) || exact匹配` 约束，禁止对全表 stat；手动刷新仅在选中的是已登记目录根时才注销磁盘上已不存在的导入源登记（目录根仍存在时必须保留注册），事件 `reason` 写 `auto-prune-missing-sources`（确保前端识别为数据变更并主动重读 snapshot）；手动刷新完成后必须调用 `librarySnapshotService.invalidateCache()` 使缓存失效。
    - `pruneMissingSnapshotEntries` 必须接受可选 `pathFilter` 回调以支持局部 prune，老调用点（无 `pathFilter` 时）行为保持不变。
    - 删除/移动/重命名/图片转换等管理操作不得清空整个缩略图缓存目录：缓存键含源文件 path+mtime+size，内容变更后旧键自然失效，全清会迫使全库缩略图重建。

## 新增能力实施顺序（建议按序）

1. 固化接口
   - 定义 `Repository` 接口与 DTO/ViewModel 类型。

2. 双实现并存
   - 保留 `MockRepository`，新增 `RealRepository`。
   - 通过配置或环境变量切换，不改 UI 调用层。

3. 先接入读链路
   - 先完成只读路径（目录/媒体项加载、分页、筛选），再接写操作（评分、封面保存等）。

4. 再接入写链路
   - 写操作必须实现乐观更新回滚或服务端确认后更新。

5. 收敛回归
   - 每次替换一个能力点后执行完整回归：`npm run lint && npm run test && npm run build`。

## 禁止项

- 禁止在组件中直接 `fetch` 或直接访问 IPC 全局对象。
- 禁止把 DTO 字段直接透传到 UI。
- 禁止绕过测试直接替换核心状态流。
- 禁止在未更新文档时提交后端接入改动。
- 禁止在 Renderer 直接构造 `file://` 或自定义协议路径绕过 Repository。
- 禁止将新增需求直接堆到 `src/App.tsx`、`useAppController`、`useAppDataPipeline`。
- 禁止在单文件内混合“Read State + Navigation State + Display/Effects + View Composition”四层职责。

## 提交门禁 (Definition of Done, DoD)

- 代码：通过 `lint` / `test` / `build`。
- 文档：同步更新本文件 + 对应需求/交互文档。
- 回归：关键路径手测通过（模式切换、分页、快捷键、播放控制、拖拽/导入）。

## 管理模式 LLM 广告审核接入门禁（已落地，持续执行）

1. LLM 调用边界
   - Renderer 禁止直连 LLM endpoint。
   - 必须通过 `Repository -> preload -> ipc -> Main/Worker` 调用，保持权限边界一致。

2. 输入边界
   - 审核输入只能来自管理模式当前勾选范围解析后的图片集合。
   - 禁止在审核流程中引入“未选中对象”的隐式扩展删除语义。

3. 删除边界
   - 审核结果只允许产出“疑似广告候选”，不得自动物理删除。
   - 用户确认后必须复用既有 `deleteImageItems` 写链路，不得新建绕行删除入口。

4. 缓存与可追踪性
   - “已确认删除图片哈希”需持久化（SQLite 或 `app_state`），并记录来源与更新时间。
   - 审核失败、超时、降级需在 UI 可见，不允许静默吞错。
   - 审核任务需回传可观测字段：来源分布（known-hash/llm/skip）与命中率（LLM/overall），用于回归与压测对比。

5. 合约一致性
   - 新增审核相关 IPC 请求/响应必须走 Zod schema 校验。
   - `startManageAdReview` 的策略/并发参数必须显式透传并在 Main 统一归一化（禁止 Renderer 与 Main 口径分叉）。
   - `startManageAdReview` 必须透传 `execution_mode`（`normal | performance`），不得在 IPC 边界丢失。
   - 当 `execution_mode=performance` 时，前端发送策略必须强制为 `head-tail`，避免 UI 锁定与后端执行口径分叉。
   - DTO -> ViewModel 映射必须在适配层显式完成，禁止 UI 直接消费后端原始结构。

## 真实文件性能门禁（扫描/重处理强制）

### 触发条件（任一命中即触发）

- 大量文件扫描（全量扫描 / 增量扫描）。
- 大量压缩包扫描或重处理（zip/rar/7z 转换、重建、重索引）。

### 强制执行规则

1. 先正确性（Correctness），后性能（Performance）
   - 禁止只比较最快方案。
   - 正确性不达标直接淘汰，不进入性能对比。

2. 双规并行数据集（必须两套都跑）
   - 实际负载目录（回放）：固定 `Z:\bench`。
   - 脚本生成目录（全覆盖）：`perf-data/<日期>-scan-dataset/input`。
   - 实际负载目录用于真实性能回放，不替代覆盖门禁。
   - 脚本生成目录必须覆盖：大量小文件、大压缩包与深层目录、中文/日文/特殊符号目录、中文/日文/特殊符号压缩包命名、长路径、损坏压缩包样本。

3. 必须同时执行冷缓存（Cold Cache）与热缓存（Warm Cache）
   - 每组至少 3 次。
   - 使用中位数（median）作为对比指标。

4. 必须记录并对比以下指标
   - 正确性：漏扫 / 误扫 / 重复 / 元数据一致性。
   - 吞吐：files/s、archives/s、总耗时。
   - 资源：CPU、峰值内存、磁盘 I/O。
   - 稳定性：异常率、长跑稳定性、重试成功率。

5. 决策准则
   - 正确性未达标：直接淘汰。
   - 性能优势 <5%：优先选择实现更简单、可维护性更高的方案。

6. 结果落盘（强制）
   - 报告路径：`docs/perf/<日期>-scan-benchmark.md`。
   - 报告必须同时包含“实际负载回放”与“全覆盖门禁”两节结果。
- 未产生报告或报告未通过，不得将相关模块标记为“完成”。

## 运行时依赖预检与最小可用矩阵（MVP Matrix）

### 预检要求

- Main 必须提供运行时依赖预检接口，至少覆盖：`sharp`、`ffmpeg`、`ffprobe`、`archive-wasm`、`powershell`。
- Renderer 必须可见展示降级状态（非静默降级）。
- 依赖缺失时，必须走确定性回退路径，不允许随机失败。

### 最小可用矩阵

| 能力 | 依赖满足 | 缺失时状态 | 强制回退策略 |
| --- | --- | --- | --- |
| 文件系统图片/视频浏览 | 无 | available | 无需回退 |
| 缩略图缓存（Sharp WebP） | `sharp` | degraded | 回退 `original` 变体 |
| 视频元数据探测 | `ffprobe` | degraded | 使用默认时长/分辨率 |
| 视频封面抓取 | `ffmpeg` | degraded | 仅保存颜色，不落盘封面图 |
| `rar/7z` 归一化 | `sharp + node-unrar-js + 7z-wasm` | unavailable | 跳过该类压缩包并记录告警 |
| zip 非 `store/deflate` 重处理 | `ffmpeg + powershell` | degraded | 回退 safe-entry，仅加载可直接读取条目 |

## 当前模块化基线（接入前提）

- `rar/7z` 归一化成功后，输出 `zip(store)` 必须写回源压缩包同目录并完成原地替换；仅在输出文件校验通过后删除原始 `rar/7z`。
- `rar/7z` 归一化任务默认低优先级后台执行（等待空闲窗口，按 Sidebar 路径排序）；用户显式打开对应包时可提升为高优先级并立即后台处理。

- Renderer 入口链路：
  - `src/App.tsx`（壳层入口）
  - `src/features/app/useAppController.ts`（薄控制器）
  - `src/features/app/useAppDataPipeline.ts`（薄编排）

- Renderer 分层编排基线（新增功能必须复用）：
  - `src/features/app/useAppRuntimeSources.ts`
  - `src/features/app/useAppReadState.ts`
  - `src/features/app/useAppNavigationState.ts`
  - `src/features/app/useAppReadAndNavigation.ts`
  - `src/features/app/useAppDisplayAndEffects.ts`
  - `src/features/app/useAppInteractionEffects.ts`
  - `src/features/app/useAppTopLayerBindings.ts`
  - `src/features/app/useAppWorkspaceBindings.ts`
  - `src/features/app/useAppViewComposition.ts`

- 现有基础能力模块（保持职责不回退）：
  - `src/features/layout/thumbnailLayout.ts`
  - `src/features/import/useImportPipeline.ts`
  - `src/features/media/useMediaState.ts`
  - `src/features/shortcuts/useShortcutEngine.ts`

后续接入真实后端时，必须在以上边界内扩展，不得破坏模块职责。
