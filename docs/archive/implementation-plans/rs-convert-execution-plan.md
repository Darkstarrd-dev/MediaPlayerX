# MediaPlayerX 图包转换功能执行计划（RS）

Last updated: 2026-02-22

## 0. 执行约束

- 范围：仅实现“目录/压缩包节点级别”的分辨率/格式转换，不支持节点内单文件级转换。
- 分层：严格遵循 `contracts -> preload -> ipc -> repository -> service`。
- 文档：行为变化同步 SSOT（按本计划各 phase 列表执行）。
- 安全：必须满足“新文件就位后再移除源文件”的原子替换语义。
- 阶段边界：**禁止跨 phase 读取/加载文件**；每个 phase 仅可读取本 phase 声明的文件。
- 进度维护：每个 phase 完成后，必须回填本文件：
  - 将 phase 状态从 `TODO` 改为 `DONE`
  - 勾选该 phase 的 checklist
  - 在“变更记录”追加日期与结果

## 1. 总体进度看板

| Phase | 名称 | 状态 | 输出 |
|---|---|---|---|
| P1 | 协议与仓储接口扩展 | DONE | 新增转换任务 contract + repository API |
| P2 | 管理态入口与参数面板 | DONE | `RS` 按钮 + 5 行 panel + 选区约束 |
| P3 | 全屏转换预览模式 | DONE | dual 对比 + 参数 popover + 确定/取消回写 |
| P4 | 执行态进度与交互锁 | DONE | 进度 UI + 仅 Esc/取消可用 |
| P5 | Main 任务执行与安全替换 | DONE | 可取消任务 + 原子替换/回滚 |
| P6 | 测试与 SSOT 同步 | DONE | 测试通过 + 文档完成更新 |

## P1 协议与仓储接口扩展

### 允许读取/加载文件（仅本 phase）

- `src/contracts/backend.schemas.ts`
- `src/contracts/backend.types.ts`
- `src/backend-api.d.ts`
- `src/features/backend/repository/types.ts`
- `src/features/backend/repository/realRepository.ts`
- `src/features/backend/repository/mockRepository.ts`
- `src/features/backend/useWriteDataAccess.ts`
- `src/features/backend/useReadOnlyDataAccess.ts`
- `electron/channels.ts`
- `electron/preload.ts`
- `electron/registerBackendIpcHandlers.ts`
- `electron/fileSystemReadFacade.ts`
- `electron/facade/FileSystemManagementHandlers.ts`

### Checklist

- [x] 定义转换参数 DTO（分辨率系数/格式/质量/线程/节点列表）。
- [x] 定义转换任务生命周期 DTO（started/progress/completed/cancelled/failed）。
- [x] 新增 IPC channel（启动任务、查询进度、取消任务）。
- [x] `preload` 暴露对应 API，并更新 `src/backend-api.d.ts`。
- [x] `repository`（real/mock）实现接口与 mock 行为。
- [x] `useWriteDataAccess`/`useReadOnlyDataAccess` 暴露可调用入口。

### TODO

- [x] 保持 schema 双端一致，避免 renderer/main 类型漂移。
- [x] 为任务 ID 与错误码预留字段，便于 UI 区分失败原因。

### 完成标准（DoD）

- [x] renderer 可通过 repository 发起/取消转换任务，并拉取进度。
- [x] TypeScript 编译无新增类型错误。

## P2 管理态入口与参数面板

### 允许读取/加载文件（仅本 phase）

- `src/components/AppWorkspace.tsx`
- `src/components/ImageMainSection.tsx`
- `src/components/ImageMainSection.types.ts`
- `src/components/ImageMainSection.renderers.tsx`
- `src/features/app/useAppWorkspaceProps.ts`
- `src/features/app/useAppWorkspaceBindings.ts`
- `src/features/app/buildImageMainSectionProps.ts`
- `src/features/app/buildManagementPanelProps.ts`
- `docs/10-ui_definition.md`
- `docs/11-token_design.md`

### Checklist

- [x] 在 `fg.main.toolbar.state.manage` 增加 `RS` 入口按钮。
- [x] 仅在 `fg.sidebar.main.label` 选中节点为目录/压缩包时可用。
- [x] 新增 5 行 panel：分辨率、格式、质量、线程、操作按钮。
- [x] 参数默认值与步进符合需求（0.1~1.0、10~100、1~16）。
- [x] “预览/确定/取消”按钮接线完成（先占位回调亦可）。
- [x] 同步 `docs/10-ui_definition.md` 与 `docs/11-token_design.md`。

### TODO

- [x] 把“非法选区”提示统一为已有交互风格（不引入新样式系统）。
- [x] panel 状态与管理态生命周期绑定，避免残留脏状态。

### 完成标准（DoD）

- [x] 管理态可稳定打开/关闭转换 panel。
- [x] 非法节点选择下按钮禁用或拦截正确。

## P3 全屏转换预览模式

### 允许读取/加载文件（仅本 phase）

- `src/components/FullscreenLayer.tsx`
- `src/components/fullscreen/FullscreenFooter.tsx`
- `src/components/fullscreen/FullscreenPanes.tsx`
- `src/features/app/buildFullscreenLayerProps.ts`
- `src/features/app/useAppTopLayerState.ts`
- `src/features/app/useAppTopLayerBindings.ts`
- `src/styles/app/layout.css`
- `docs/05-interaction-v1.md`

### Checklist

- [x] 基于 `fs.image.controls.shell` 增加“转换预览模式”。
- [x] 移除自动播放与切双屏按钮（仅预览模式下）。
- [x] 新增质量/格式/分辨率按钮与 popover 控件。
- [x] 新增“确定/取消”：确定回写 panel，取消丢弃预览改动。
- [x] 保留上一张/下一张/上个包/下个包、上下左右对齐。
- [x] 实现左右同图 dual 对比与可拖拽分割条。
- [x] 更新 `docs/05-interaction-v1.md`（预览模式交互说明）。

### TODO

- [ ] 预览渲染失败时提供降级（仅显示原图+错误提示）。
- [x] 预览参数与 panel 参数保持单向提交（避免双向脏写）。

### 完成标准（DoD）

- [x] 预览模式可独立打开/退出，不破坏现有全屏流程。
- [x] 确定/取消行为与参数回写逻辑正确。

## P4 执行态进度与交互锁

### 允许读取/加载文件（仅本 phase）

- `src/features/app/useAppInteractionEffects.ts`
- `src/features/app/useAppShortcutBindings.ts`
- `src/features/shortcuts/useShortcutEngine.ts`
- `src/shortcuts.ts`
- `src/components/AppWorkspace.tsx`
- `src/components/ImageMainSection.tsx`
- `docs/05-interaction-v1.md`

### Checklist

- [x] 点击“确定”后进入转换执行态并显示进度。
- [x] 执行态下全局快捷键除 `Esc` 外全部失效。
- [x] 执行态下除 panel“取消”外其余按钮失效。
- [x] 点击“取消”可中止任务；未执行时“取消”退出转换模式。
- [x] 更新 `docs/05-interaction-v1.md`（执行锁与取消语义）。

### TODO

- [x] 明确 `Esc` 在执行态只做“退出全屏/层级关闭”还是“触发取消”。
- [x] 进度刷新频率节流，避免 UI 抖动。

### 完成标准（DoD）

- [x] 执行态交互锁行为与需求一致。
- [x] 取消链路端到端可用（UI -> repository -> IPC）。

## P5 Main 任务执行与安全替换

### 允许读取/加载文件（仅本 phase）

- `electron/services/file-system-read/managementMutationService.ts`
- `electron/fileSystemReadFacade.ts`
- `electron/facade/FileSystemManagementHandlers.ts`
- `electron/registerBackendIpcHandlers.ts`
- （如已在 P1 新建）本功能专用 service 文件
- `docs/04-architecture-v1.md`

### Checklist

- [x] 实现目录/压缩包转换任务主流程（可取消）。
- [x] 转换输出先写临时目标并完成完整性校验。
- [x] 仅在新文件成功就位后执行源文件替换/删除。
- [x] 失败时执行回滚并保留可诊断错误信息。
- [x] 进度事件上报（总量、已完成、当前项、阶段）。
- [x] 更新 `docs/04-architecture-v1.md`（任务流与边界）。

### TODO

- [x] 复用既有 temp/backup 模式，避免重复实现不一致策略。
- [x] 对 zip 重打包和目录写回分别定义一致的原子替换协议。

### 完成标准（DoD）

- [x] 人为制造失败场景时源文件不丢失。
- [x] 取消后任务及时退出并清理临时文件。

## P6 测试与 SSOT 同步

### 允许读取/加载文件（仅本 phase）

- `src/**/*.test.ts`
- `src/**/*.test.tsx`
- `electron/**/*.test.ts`
- `docs/03-requirements-v1.md`
- `docs/05-interaction-v1.md`
- `docs/04-architecture-v1.md`
- `docs/10-ui_definition.md`
- `docs/11-token_design.md`

### Checklist

- [x] 新增/更新单元测试：按钮可用性、参数校验、回写逻辑。
- [x] 新增/更新交互测试：预览模式、执行锁、取消语义。
- [x] 新增/更新后端测试：任务取消、原子替换、失败回滚。
- [x] 按需更新 SSOT 文档（requirements/interaction/architecture/ui/token）。
- [x] 运行最小质量门禁并记录结果。

### TODO

- [ ] 覆盖“多节点批量 + 部分失败”场景。
- [ ] 覆盖“压缩包损坏/权限不足/磁盘空间不足”场景。

### 完成标准（DoD）

- [x] 关键测试通过，且无新增 lint/type error。
- [x] 文档与代码行为一致。

## 2. 变更记录（逐 phase 回填）

- [x] P1 完成记录：`2026-02-22` / 完成 contracts-preload-ipc-repository 打通，提供任务启动/读取/取消骨架；`npm run build` 通过 / 当前 main 侧任务执行为占位实现，真实转换与原子替换在 P5 完成
- [x] P2 完成记录：`2026-02-22` / 管理态新增 `RS` 按钮与 5 行参数 panel，接入 confirm 占位任务调用，按侧栏节点类型做可用性约束，并完成 UI slot/token 文档同步；`npm run build` 通过 / 预览逻辑与执行锁仍待 P3/P4 完成
- [x] P3 完成记录：`2026-02-22` / 完成全屏预览态接线：RS 面板参数与 session 预览草稿分离，预览时支持 S/F/Q popover、左右对比拖拽分割、确定回写/取消丢弃，并在退出全屏时自动清理预览态；`npm run build` 通过 / 当前预览图仍为前端占位渲染，真实转换输出在 P5 接入
- [x] P4 完成记录：`2026-02-22` / 增加 RS 执行态进度显示、执行锁（快捷键/滚轮禁用，保留 Esc）、按钮禁用策略与取消链路，执行中取消会调用 cancel IPC；`npm run build` 通过 / Esc 语义定为层级关闭，不触发取消
- [x] P5 完成记录：`2026-02-22` / Main 侧完成目录与 zip 的真实转换任务，支持 cancel、进度上报、临时文件写入 + 原子替换 + 回滚；并补充后端失败回滚/取消测试（`managementMutationService.test.ts`、`FileSystemManagementHandlers.test.ts`） / 风险：当前 P6 前端交互测试尚未补齐
- [x] P6 完成记录：`2026-02-22` / 补充前端 `ImageMainSection` 的 RS 执行锁与取消语义测试，补充后端任务取消/回滚测试；执行 `npm run lint && npm run test && npm run build` 全通过（`90 passed / 1 skipped`） / 风险：P6 TODO 场景中的“压缩包损坏/磁盘空间不足”仍建议后续追加专项故障注入测试
