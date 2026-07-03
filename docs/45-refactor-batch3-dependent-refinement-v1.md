# 第三批重构实施文档 — Dependent Refinement（依赖前置的精修）

Last updated: 2026-07-03

> 总编排文档：`docs/42-refactor-orchestration-v1.md`
> 本批次 5 个 PR 均有前置依赖，须在对应前置 PR 完成后启动。

## B3-PR1：MetadataStore 按领域拆分

### 目标

将 `mediaLibraryMetadataStore.ts`（1177 行）按元数据领域拆分为多个职责清晰的 Store，降低单文件复杂度和合并冲突概率。

### 前置依赖

**B1-PR4（BaseStore 基类抽象）必须先完成**——MetadataStore 需先继承 BaseStore 再拆分，否则拆分时重复的 `this.db.prepare(...)` 模式会被复制到多个文件。

### 涉及文件清单

| 文件 | 行数 | 操作 |
|------|------|------|
| `electron/mediaLibraryMetadataStore.ts` | 1177 | 拆分为多个文件 |
| `electron/mediaLibraryDatabase.ts` | 468 | 更新 Store 实例化 |
| `electron/mediaLibraryMetadataStore.test.ts` | — | 拆分对应测试 |

### 当前结构分析

`mediaLibraryMetadataStore.ts` 管理以下 6+ 种元数据类型：

| 领域 | 典型方法 | 表 |
|------|---------|-----|
| Package Grade | `readPackageGrade`, `writePackageGrade` | `package_grade` |
| Video Cover | `readVideoCover`, `saveVideoCover` | `video_cover` |
| Video Metadata | `readVideoMetadata`, `writeVideoMetadata` | `video_metadata` |
| Audio Metadata | `readAudioMetadata`, `writeAudioMetadata` | `audio_metadata` |
| External Metadata | `readPackageExternalMetadata`, `writePackageExternalMetadata`, `searchExternalMetadata` | `package_external_metadata` |
| Preference | `readPreference`, `writePreference` | `preference_events` / `preference_state` |

### 拆分方案

```
electron/
  mediaLibraryMetadataStore.ts           ← 删除或保留为聚合导出
  stores/
    metadataGradeStore.ts                ← Package Grade
    metadataVideoCoverStore.ts           ← Video Cover
    metadataVideoMetadataStore.ts        ← Video Metadata
    metadataAudioMetadataStore.ts        ← Audio Metadata
    metadataExternalMetadataStore.ts     ← External Metadata + 搜索
    metadataPreferenceStore.ts           ← Preference
```

每个 Store 继承 `BaseStore`（来自 B1-PR4），仅包含自己领域的 SQL 和方法。

### 实施步骤

#### Step 1：确认 B1-PR4 已完成

确认 `mediaLibraryMetadataStore.ts` 已继承 `BaseStore`，且所有 `this.db.prepare(...)` 调用已改为 `this.run/this.get/this.all`。

#### Step 2：创建 stores/ 目录

```
electron/stores/
```

#### Step 3：逐领域提取

从最小的领域开始提取（Preference → Grade → VideoCover → VideoMetadata → AudioMetadata → ExternalMetadata）。

每个领域：
1. 创建新文件，继承 `BaseStore`
2. 移入对应的 SQL 语句和方法
3. 移入对应的测试

#### Step 4：更新 MediaLibraryDatabase

`mediaLibraryDatabase.ts` 中将单个 `MediaLibraryMetadataStore` 实例化改为创建 6 个子 Store：

```typescript
// 改造前
this.metadataStore = new MediaLibraryMetadataStore(this.db);

// 改造后
this.metadataGradeStore = new MetadataGradeStore(this.db);
this.metadataVideoCoverStore = new MetadataVideoCoverStore(this.db);
// ...
```

#### Step 5：更新所有引用

搜索所有使用 `database.metadataStore.xxx()` 的位置，改为 `database.metadataGradeStore.xxx()` 等对应子 Store。

#### Step 6：保留聚合导出（可选）

如需平滑过渡，可在 `mediaLibraryMetadataStore.ts` 中保留一个 facade 类，委托到各子 Store。

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run build:electron`
- [ ] `npx madge --circular src electron`

### 回归检查项

- [ ] 图片包评级读写正确
- [ ] 视频封面保存/读取正确
- [ ] 视频/音频元数据读写正确
- [ ] 外部元数据搜索/写入正确
- [ ] 偏好指标读写正确
- [ ] 数据库升级不回归

### 回滚策略

保留 facade 聚合导出一个版本窗口。出现异常时回切到单文件实现。

### 风险评估

**中。** 拆分涉及数据库 Store 的实例化方式和所有调用点。需确认每个领域的 SQL 语句没有跨表 JOIN（如有跨表查询需保留在统一 Store 中）。建议每提取一个领域就运行完整测试。

---

## B3-PR2：useAppWorkspaceProps 拆分

### 目标

将 `useAppWorkspaceProps.impl.ts`（1517 行）按 panel 类型拆分为独立构建文件，提升可测试性和可维护性。

### 前置依赖

**B2-PR2（zustand Store 拆分/selector 优化）必须先完成**——useAppWorkspaceProps 消费 store 的 160+ 字段，selector 优化后才能清晰划分各 panel 构建文件的输入边界。

### 涉及文件清单

| 文件 | 行数 | 操作 |
|------|------|------|
| `src/features/app/useAppWorkspaceProps.impl.ts` | 1517 | 拆分 |
| `src/features/app/build*PanelProps.ts` | 20 个文件 | 可能整合部分逻辑 |

### 当前结构分析

`useAppWorkspaceProps.impl.ts` 是一个单一函数，返回 ~200+ props 供 workspace 渲染。它内部：
- 消费几乎所有 hook 的输出
- 包含 rename/manage 业务逻辑
- 调用多个 `build*PanelProps` 子函数
- 返回一个巨大的 props 对象

已有的 `build*PanelProps.ts` 系列（20 个文件）已经按 panel 类型拆分了部分逻辑，但 `useAppWorkspaceProps.impl.ts` 仍包含大量内联的组装逻辑。

### 拆分方案

将 `useAppWorkspaceProps.impl.ts` 的内联逻辑按 workspace 区域拆分：

| 新文件 | 提取内容 | 估算行数 |
|--------|---------|---------|
| `useAppWorkspaceImageProps.ts` | 图片模式 workspace props 组装 | ~300 |
| `useAppWorkspaceVideoProps.ts` | 视频模式 workspace props 组装 | ~250 |
| `useAppWorkspaceMusicProps.ts` | 音乐模式 workspace props 组装 | ~250 |
| `useAppWorkspaceSidebarProps.ts` | 侧边栏 props 组装（已有 `buildSidebarPanelProps.ts`） | ~150 |
| `useAppWorkspaceHeaderProps.ts` | 顶部栏 props 组装（已有 `buildAppHeaderProps.ts`） | ~100 |
| `useAppWorkspaceFullscreenProps.ts` | 全屏 props 组装（已有 `buildFullscreenLayerProps.ts`） | ~150 |
| `useAppWorkspaceProps.impl.ts`（保留） | 编排器，调用上述 hook 并合并结果 | ~300 |

### 实施步骤

#### Step 1：确认 B2-PR2 已完成

确认 store selector 已优化，各 panel 构建函数的输入边界清晰。

#### Step 2：分析当前 props 组装结构

提取 `useAppWorkspaceProps.impl.ts` 中各 workspace 区域的 props 组装逻辑边界。

#### Step 3：按区域提取 hook

从最小的区域开始提取（Header → Sidebar → Fullscreen → Image → Video → Music）。

每个 hook：
1. 接受对应区域的输入参数
2. 调用已有的 `build*PanelProps` 子函数
3. 返回该区域的 props 对象

#### Step 4：精简主 hook

`useAppWorkspaceProps.impl.ts` 仅负责：
- 调用各区域 hook
- 合并结果为单一 props 对象
- 处理跨区域的共享逻辑（如 mode 切换）

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npx madge --circular src electron`

### 回归检查项

- [ ] 图片模式主界面渲染正常
- [ ] 视频模式主界面渲染正常
- [ ] 音乐模式主界面渲染正常
- [ ] 模式切换无异常
- [ ] 侧边栏/顶部栏/全屏交互正常
- [ ] rename/manage 操作正常

### 回滚策略

纯 hook 提取，`git revert` 即可恢复。

### 风险评估

**中。** 1517 行的拆分需仔细确认 props 依赖链，避免循环引用。关键风险：某些 props 可能被多个区域共享，提取时需确保共享 props 通过参数传递而非重复计算。

---

## B3-PR3：fileSystemReadFacade.impl 拆分

### 目标

将 `fileSystemReadFacade.impl.ts`（2029 行）按职责域拆分，降低后端总协调器的单文件复杂度。

### 前置依赖

**B1-PR3（重导出链清理）必须先完成**——Facade 拆分前需先清理重导出链，避免拆分时引用路径混乱。

### 涉及文件清单

| 文件 | 行数 | 操作 |
|------|------|------|
| `electron/fileSystemReadFacade.impl.ts` | 2029 | 拆分 |
| `electron/fileSystemReadService.ts` | 2 | 更新导出（如需要） |
| 引用 facade 的文件 | ~5 文件 | 更新导入 |

### 当前结构分析

`fileSystemReadFacade.impl.ts` 是后端总协调器：
- 构造函数有 280+ 行的服务依赖注入代码
- 创建并持有 15+ 个 service 实例
- 暴露 `libraryHandlers` / `managementHandlers` / `systemHandlers` 三组 handler
- 包含部分内联业务逻辑（跨 service 协调）

### 拆分方案

```
electron/
  fileSystemReadFacade.impl.ts          ← 保留为入口，仅负责创建和组装
  facade/
    fileSystemReadFacade.library.ts     ← Library 域协调逻辑
    fileSystemReadFacade.management.ts  ← Management 域协调逻辑
    fileSystemReadFacade.system.ts      ← System 域协调逻辑
    fileSystemReadFacade.factory.ts     ← Service 依赖注入工厂
```

| 新文件 | 提取内容 | 估算行数 |
|--------|---------|---------|
| `facade/fileSystemReadFacade.factory.ts` | 15+ service 的实例化逻辑 | ~350 |
| `facade/fileSystemReadFacade.library.ts` | Library 域的跨 service 协调 | ~300 |
| `facade/fileSystemReadFacade.management.ts` | Management 域的跨 service 协调 | ~400 |
| `facade/fileSystemReadFacade.system.ts` | System 域的跨 service 协调 | ~250 |
| `fileSystemReadFacade.impl.ts`（保留） | 类定义 + handler 组装 | ~700 |

### 实施步骤

#### Step 1：确认 B1-PR3 已完成

确认重导出链已清理，`fileSystemReadService.ts` 直接指向 `fileSystemReadFacade.impl.ts`。

#### Step 2：提取 Service 工厂

将构造函数中 280+ 行的 service 实例化逻辑提取到 `facade/fileSystemReadFacade.factory.ts`：

```typescript
export function createFileSystemReadServices(deps: ServiceDeps): FileSystemReadServices {
  const libraryReadWriteService = new LibraryReadWriteServiceImpl(deps);
  const importTaskService = new ImportTaskService(deps);
  // ... 15+ service
  return { libraryReadWriteService, importTaskService, ... };
}
```

#### Step 3：提取 Library 域协调逻辑

将 Library 域中跨 service 的协调逻辑（如快照读取 + 元数据合并）提取到 `facade/fileSystemReadFacade.library.ts`。

#### Step 4：提取 Management 域协调逻辑

将 Management 域中跨 service 的协调逻辑（如删除文件 + 更新快照 + 刷新索引）提取到 `facade/fileSystemReadFacade.management.ts`。

#### Step 5：提取 System 域协调逻辑

将 System 域中跨 service 的协调逻辑提取到 `facade/fileSystemReadFacade.system.ts`。

#### Step 6：精简主文件

`fileSystemReadFacade.impl.ts` 仅保留：
- 类定义
- 调用工厂创建 services
- 将 handler 委派到各域模块
- 暴露 `libraryHandlers` / `managementHandlers` / `systemHandlers`

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run build:electron`
- [ ] `npx madge --circular src electron`

### 回归检查项

- [ ] Electron 主进程启动正常
- [ ] Library 域所有 IPC 通道正常
- [ ] Management 域所有 IPC 通道正常
- [ ] System 域所有 IPC 通道正常
- [ ] Service 依赖注入顺序正确（无初始化循环）

### 回滚策略

纯文件拆分 + 函数提取，`git revert` 即可恢复。

### 风险评估

**中-高。** 后端总协调器的拆分涉及 15+ service 的依赖关系。关键风险：
1. Service 之间的依赖顺序（如 `importTaskService` 依赖 `librarySnapshotService`）需在工厂中正确处理
2. 跨域协调逻辑可能涉及共享状态（如 `ensureService()` 惰性初始化），需确保拆分后行为一致
3. `FileSystemMediaReadService` 类的公共接口不可变

建议分步提交：先提取工厂，验证启动正常；再逐域提取协调逻辑。

---

## B3-PR4：低优先级治理（P2 批量）

### 目标

批量处理 P2 级别的技术债，每项改动小但累积收益可观。

### 前置依赖

无（可提前到任何批次并行执行）。

### 治理项清单

#### P2-1：registerIpcQuery 支持 request payload

| 项 | 说明 |
|----|------|
| 问题 | 当前 `registerIpcQuery` 不支持 request payload，导致 14 个只读操作被误标为 `registerIpcCommand` |
| 方案 | 新增 `registerIpcQueryWithRequest<TRequest, TResponse>(channel, requestSchema, responseSchema, action)` |
| 涉及文件 | `electron/registerBackendIpcHandlers.ts` |
| 影响 | 14 个 channel 从 Command 改为 QueryWithRequest |
| 风险 | 低 |

涉及改标记的 channel：
`readAppState`, `readImageSidebarTree`, `readImagePage`, `readSourceImages`, `readImageMetadata`, `readManageAdReviewTask`, `readManageCoverReviewTask`, `readManageSubtitleCleanupTask`, `listVideoSubtitles`, `prepareSubtitleTrack`, `listSubtitleLocalModels`, `readAudioTranscodeTask`, `readVideoTranscodeTask`, `readImageConvertTask`

#### P2-2：imageSourceLiteDtoSchema 用 .omit() 派生

| 项 | 说明 |
|----|------|
| 问题 | `imageSourceLiteDtoSchema` 与 `imagePackageDtoSchema` 字段重复 10+ 个 |
| 方案 | `imageSourceLiteDtoSchema = imagePackageDtoSchema.omit({ images: true })` |
| 涉及文件 | `src/contracts/backend.schemas.ts` |
| 影响 | 减少 15 行重复定义 |
| 风险 | 低 |

#### P2-3：processTaskOrchestrator 接入 TaskResourceGovernor

| 项 | 说明 |
|----|------|
| 问题 | `ProcessTaskWorkerRunner` 的 Worker 不经过 `TaskResourceGovernor` 的 CPU/GPU token 控制 |
| 方案 | 在 `processTaskOrchestrator.ts` 的任务执行前获取 CPU token，执行后释放 |
| 涉及文件 | `electron/services/task-orchestrator/processTaskOrchestrator.ts` |
| 影响 | 增强资源治理覆盖范围 |
| 风险 | 中（需确认不引入死锁） |

#### P2-4：build*PanelProps 提取公共工具

| 项 | 说明 |
|----|------|
| 问题 | 20 个 `build*PanelProps` 文件中存在重复的闭包回调和条件推导模式 |
| 方案 | 提取 `wrapCallback(name, fn)`、`booleanDerive(condition, ...)` 等工具函数 |
| 涉及文件 | 新建 `src/features/app/panelPropsUtils.ts`，改 20 个 build 文件 |
| 影响 | 每个 build 文件减少 10-20 行 |
| 风险 | 低 |

#### P2-5：mappers.ts 冗余检查

| 项 | 说明 |
|----|------|
| 问题 | `src/features/backend/mappers.ts`（391 行）与 `src/features/backend/repository/mock/mappers.ts`（158 行）可能存在重复 mapping 逻辑 |
| 方案 | 检查重复逻辑，提取到共享模块 |
| 涉及文件 | 两个 mappers.ts |
| 影响 | 视重复程度而定 |
| 风险 | 低 |

#### P2-6：searchExternalMetadataRequestSchema refine 验证

| 项 | 说明 |
|----|------|
| 问题 | `searchExternalMetadataRequestSchema` 中 `input_text` 和 `input_id` 均为 optional，无 refine 确保至少提供一个 |
| 方案 | 添加 `.refine(val => val.input_text || val.input_id, { message: "必须提供 input_text 或 input_id" })` |
| 涉及文件 | `src/contracts/backend.schemas.ts` |
| 影响 | 提前捕获无效请求 |
| 风险 | 低 |

#### P2-7：errorCode.ts 双份清理

| 项 | 说明 |
|----|------|
| 问题 | `src/features/app/errorCode.ts`（1 行）与 `src/features/shared/errorCode.ts`（46 行）可能存在冗余 |
| 方案 | 统一为单一实现 |
| 涉及文件 | 两个 errorCode.ts |
| 影响 | 消除歧义 |
| 风险 | 低 |

### 验证清单（每项独立）

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npx madge --circular src electron`

### 回滚策略

每项独立提交，可单独回滚。

---

## B3-PR5：测试补齐（subtitles/media/music-visualizer）

### 目标

为测试覆盖薄弱的 feature 补充核心逻辑单元测试，提升测试覆盖率。

### 前置依赖

无（建议在第三批重构稳定后执行，避免重构期间测试频繁更新）。

### 涉及文件清单

| Feature | 源文件 | 测试文件比 | 目标 |
|---------|--------|-----------|------|
| `subtitles` | 13 | 0.08（1/13） | 提升至 0.25+ |
| `media` | 5 | 0.20（1/5） | 提升至 0.40+ |
| `music-visualizer` | 13 | 0.23（3/13） | 提升至 0.35+ |

### 实施步骤

#### Step 1：subtitles 测试补齐

优先测试纯逻辑文件（无 React/Electron 依赖）：
- `liveSubtitlesCueOps.ts` — Cue 去重/合并逻辑（如未有测试）
- 字幕格式解析/序列化逻辑
- 字幕会话状态管理纯函数

如已有 `liveSubtitlesCueOps.test.ts`（B1-PR1 的 PR-02 已完成），检查覆盖度并补充边界用例。

#### Step 2：media 测试补齐

- `videoFitMode.ts` — 视频适配模式逻辑
- 媒体路径解析工具
- 媒体类型判断逻辑

#### Step 3：music-visualizer 测试补齐

- Shader 配置/参数解析逻辑
- FPS 统计/帧耗时计算
- WebGL2 → Canvas2D 回退决策逻辑
- Tone Mapping 参数计算

### 验证清单

- [ ] `npm run test`
- [ ] 新增测试覆盖率达标
- [ ] 新增测试在 CI 环境下稳定通过（无 flaky）

### 回滚策略

删除新增测试文件即可。

### 风险评估

**极低。** 仅新增测试文件，不修改业务代码。

---

## 第三批通用回滚策略

| PR | 回滚方式 | 影响范围 |
|----|---------|---------|
| B3-PR1 | 恢复 facade 聚合导出 | 数据库元数据操作 |
| B3-PR2 | `git revert` hook 提取 | 前端 workspace 渲染 |
| B3-PR3 | `git revert` 文件拆分 | 后端服务初始化 |
| B3-PR4 | 按项独立回滚 | 视具体项而定 |
| B3-PR5 | 删除新增测试 | 无功能影响 |

## 变更记录

### 2026-07-03：初始创建

- 基于 4 维探索分析创建第三批 5 个 PR 的详细实施文档
- 5 个 PR 均有前置依赖，须在对应前置 PR 完成后启动
- B3-PR4 可提前到任何批次并行执行
