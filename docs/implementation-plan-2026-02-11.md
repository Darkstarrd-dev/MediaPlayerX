# 实施计划（2026-02-11）

目标：在不破坏现有交互/架构门禁的前提下，补齐“AI 模型设置”可用性（命名、持久化、模型测试、路径选择），并修正快捷键展示/捕获与若干交互细节（退出一致性、管理面板布局、缺失源自动清理、Embedding 调用稳定性）。

约束：

- 仅提交与本计划相关的代码；`release/` 为构建产物（当前为未跟踪），不纳入提交。
- 后端接入遵循 `docs/backend-integration-guardrails.md`（contracts/preload/ipc/repository 全链路 + Zod 校验）。
- 每个阶段都要在本地跑 `npm run test`；在阶段收束时跑 `npm run lint && npm run build`。

## P0 命名修正：LLM模型设置 -> AI模型设置

要读/改的文件：

- `src/components/SettingsPanel.tsx`
- `src/App.test.tsx`

实现：

- 将设置侧栏标签从 `LLM模型设置` 改为 `AI模型设置`。
- 更新对应测试用例断言与点击目标。

测试：

- `npm run test`

提交点：

- `fix: rename LLM模型设置 to AI模型设置`

## P1 AI 模型设置不持久化：定位并修复

要读/改的文件（读为主，按定位结果最小改动）：

- `src/features/app/usePersistedAppSettings.ts`
- `src/features/app/useSettingsPersistence.ts`
- `src/features/app/useSettingsPersistence.test.tsx`
- `src/features/app/useAppSettingsStore.ts`
- `src/store/useUiStore.ts`
- `src/contracts/settings.ts`
- `src/features/backend/repository/realRepository.ts`
- `src/features/backend/repository/mockRepository.ts`

排查方向（按顺序）：

1) UI store 的字段是否都被纳入“持久化白名单/keys”（如 `lmStudioEndpoint/lmStudioModel/adReviewVisionEndpoint/adReviewVisionModel/...`）。
2) `useSettingsPersistence` 写入的结构是否与 `ui_settings_v1` 读取时的 schema 对齐（默认值合并策略是否覆盖了用户输入）。
3) `repository.writeAppState` / `repository.readAppState` 在 real/mock 下是否一致；real 模式是否存在超时/写入失败静默吞掉导致看似“保存了但重启丢失”。

实现：

- 修复导致“关闭设置面板后再次打开就回退默认值”的根因（预计是：字段未纳入持久化 keys，或读取合并策略覆盖）。
- 如有必要，为 `useSettingsPersistence` 增补覆盖测试（模拟写入后重新挂载读取）。

测试：

- `npm run test`

提交点：

- `fix: persist ai model settings across sessions`

## P2 Embedding 模型（LM Studio embeddings）新增“测试”按钮

要读/改的文件：

- `src/components/settings/renderSettingsMainSection.tsx`
- `src/components/SettingsPanel.tsx`
- `src/features/app/buildSettingsPanelProps.ts`
- `src/features/app/useAppTopLayerState.ts`
- `src/features/backend/repository/types.ts`
- `src/features/backend/repository/realRepository.ts`
- `src/features/backend/repository/mockRepository.ts`
- `src/contracts/backend.ts`
- `src/backend-api.d.ts`
- `electron/channels.ts`
- `electron/preload.ts`
- `electron/registerBackendIpcHandlers.ts`
- （如需复用）`electron/services/file-system-read/*` 或 `electron/fileSystemReadFacade.ts`

实现：

- 参照现有 `onTestAdReviewVisionModel` / `onTestWdSwinTaggerModel` 交互：
  - 在 LM Studio embedding endpoint/model 两个输入旁增加“测试”按钮与状态文案。
  - 后端新增 `testEmbeddingModel`（命名以现有 contracts 风格为准）：
    - 请求：`{ endpoint, model }`
    - 行为：优先用硬编码 base64 图片构造 data URL（`data:image/...;base64,...`），对 `/v1/embeddings` 尝试 `input: [{type:"image_url", ...}]` 与 `messages: [...]` 两种格式；仅校验返回结构/向量维度可解析即可。
    - 响应：`{ ok, message }`，message 用于在设置面板展示。
- mockRepository 提供同步/异步测试实现（固定返回 ok 或基于 endpoint/model 是否为空）。

备注（未完成，待继续处理）：

- 视觉 embedding 与纯文本 embedding 可能不一致（LM Studio 是否支持图片 embedding 也依版本而定）。当前先覆盖“视觉 payload”测试链路，后续需要补齐“纯文本 embedding 测试/模式选择”，并与实际生成 embedding 的链路对齐。

测试：

- `npm run test`
- 若新增 main 侧逻辑：补齐 ipc/repository 的单测或集成测试（按现有模式选择最小覆盖）。

提交点：

- `feat: add embedding model connection test`

## P3 路径选择：用文件/目录选择器替代手动输入（或只读展示）

状态（2026-02-11）：已完成。

范围：

- wd tagger ONNX 模型路径：文件选择
- 视觉 tags CSV whitelist 路径：文件选择
- 数据库/缓存路径（SQL DB / vector store / thumbnail cache）：可用目录/文件选择 + 显示当前值

要读/改的文件：

- Settings UI：
  - `src/components/settings/renderSettingsMainSection.tsx`
  - `src/features/app/buildSettingsPanelProps.ts`
  - `src/components/SettingsPanel.tsx`
  - `src/features/app/useAppTopLayerState.ts`
- Backend dialog 通道（建议新增通用 picker）：
  - `src/contracts/backend.ts`
  - `src/backend-api.d.ts`
  - `electron/channels.ts`
  - `electron/preload.ts`
  - `electron/registerBackendIpcHandlers.ts`
  - `src/features/backend/repository/types.ts`
  - `src/features/backend/repository/realRepository.ts`
  - `src/features/backend/repository/mockRepository.ts`

实现：

- 新增通用 IPC：
  - `pickFilePath({ title, filters?, defaultPath? }) -> { canceled, path? }`
  - `pickDirectoryPath({ title, defaultPath? }) -> { canceled, path? }`
- Settings 侧：
  - 将原本的 `<input type="text">` 改为“只读显示 + 选择按钮”（或保留输入框但主要入口是 picker）。
  - 对于数据库路径：优先做“打开所在目录/选择目录”的体验；实际是否允许用户更改 DB 位置取决于现有后端实现（若当前仅展示运行时诊断路径，则先做“复制/打开目录/选择用于导入”的最小可用，不强行改存储位置）。

测试：

- `npm run test`

提交点：

- `feat: add file and directory pickers for settings paths`

## P4 快捷键设置：补齐展示与滚轮绑定

状态（2026-02-11）：已完成。

目标：

- 确保 `src/shortcuts.ts` 定义的快捷键在设置面板完整展示。
- 补齐鼠标滚轮 `WheelUp/WheelDown` 的定义、展示与捕获（用于绑定到快捷动作）。

要读/改的文件：

- `src/shortcuts.ts`
- `src/components/SettingsPanel.tsx`
- `src/features/shortcuts/useShortcutEngine.ts`
- （捕获弹窗/对话框相关组件，按实际 grep 结果补充）

实现：

- 若当前存在“定义了但不显示”的快捷键：修正 settings 渲染逻辑（例如过滤条件/分组遗漏）。
- 为 shortcut token 增加 `WheelUp/WheelDown`：
  - 捕获：监听 `wheel` 事件，根据 `deltaY` 正负归一为 up/down。
  - 展示：在 UI 文案中明确 `滚轮上/滚轮下`。
  - 存储：确保序列化/反序列化与现有快捷键格式兼容。

测试：

- `npm run test`
- 为 wheel 捕获补齐单测（若现有快捷键捕获已有测试框架）。

提交点：

- `feat: support wheel up/down shortcuts in settings`

## P5 退出一致性：Esc + 鼠标右键

目标：

- `Esc` 与 `MouseRight` 在以下层级一致地执行“退出/关闭当前层”：全屏、设置面板、检索面板、管理面板、元数据管理模式等。
- 避免与原生右键菜单冲突：在 overlay/panel 上禁用 `contextmenu` 并将右键映射为 close。

要读/改的文件（按定位补齐）：

- 顶层交互/绑定：`src/features/app/useAppTopLayerBindings.ts`、`src/features/app/useAppTopLayerState.ts`
- 面板组件：`src/components/SettingsPanel.tsx`、`src/components/SearchPanel.tsx`、`src/components/ManagementPanel.tsx`、全屏相关组件
- 快捷键引擎：`src/features/shortcuts/useShortcutEngine.ts`

实现：

- 统一“关闭优先级”（例如：先关闭模态/对话框，再关闭设置/检索/管理面板，最后退出全屏）。
- 右键关闭：只在特定 overlay root 上接管，避免影响主内容区的右键操作。

测试：

- `npm run test`

提交点：

- `fix: make esc and right-click exit consistent`

状态（2026-02-11）：已完成。

## P6 管理面板：AI广告审核区域高度自适应

目标：

- 当 `ManagementPanel` 展开 AI 广告审核配置区时，面板高度应自动扩展以容纳控件，减少内部滚动/分页的必要。

要读/改的文件：

- `src/components/ManagementPanel.tsx`
- 与面板高度/布局相关的样式文件（按实际引用定位）

实现：

- 基于 `adReviewPanelOpen` 状态计算所需最小高度（或用 CSS 方案：让内容区自然撑开并由外层布局接管滚动）。

测试：

- `npm run test`（若 UI 测试覆盖不到高度，至少确保无回归与无 TS/运行时报错）

提交点：

- `fix: auto-expand management panel for ad review controls`

状态（2026-02-11）：已完成。

## P7 Embedding 调用仍不正常：加可复现最小测试与修正

目标：

- 以最小脚本/测试复现 LM Studio embeddings 调用行为（请求体、并发、批量 input 形态），定位“加载太多模型/行为异常”的根因。

要读/改的文件：

- `electron/fileSystemReadFacade.ts`
- `electron/fileSystemReadService.test.ts`
- （新增）`scripts/test-lmstudio-embeddings.mjs` 或同类脚本

实现：

- 新增脚本：对指定 endpoint/model 发 N 次请求，覆盖：
  - 单条 input
  - 批量 input（`input: string[]`）
  - 并发限制（串行/并发 2/并发 4）
  - 输出关键统计：耗时、错误码、响应 data 长度/维度
- 结合脚本结论调整应用侧调用：
  - 进一步限制并发（按 bucket）
  - 或调整请求 path/headers/参数（如 `encoding_format`、`dimensions` 等，若 LM Studio 需要）

测试：

- `npm run test`
- 手动执行脚本（本地有 LM Studio 时）：`node scripts/test-lmstudio-embeddings.mjs`

提交点：

- `fix: stabilize lm studio embedding requests`

## P8 缺失源自动清理：磁盘删除后 DB 自动移除

目标：

- 若 DB 中记录的 source/video 在磁盘已不存在，刷新/载入快照时自动清理 DB 条目并驱动 UI 更新。

要读/改的文件：

- `electron/mediaLibrarySnapshotStore.ts`
- `electron/mediaLibrarySnapshotStore.test.ts`
- `electron/fileSystemReadFacade.ts`（触发清理的时机）

实现：

- 在“载入快照/刷新索引”的稳定时机执行一轮缺失检查：
  - 对 source 的根路径、视频的绝对路径做存在性判断。
  - 对缺失项调用既有删除能力（例如 `deleteSnapshotEntriesByPaths` 或新增更精确的 delete API）。
  - 清理后确保触发 `libraryChanged`（或等效事件）使前端刷新。

测试：

- `npm run test`
- 增补 `electron/fileSystemReadService.test.ts` 集成用例：写入一条 source/video 后模拟文件不存在 -> 读取快照触发清理 -> 断言删除与 `libraryChanged`。

提交点：

- `feat: auto-prune missing sources from database`

状态（2026-02-11）：已完成。

## 阶段收束（完成 P0-P8 后）

自检：

- `npm run lint`
- `npm run test`
- `npm run build`

清理：

- 本计划文档为临时实施记录：功能全部落地并验证后，删除 `docs/implementation-plan-2026-02-11.md`，并移除 README / docs 索引中的引用。
