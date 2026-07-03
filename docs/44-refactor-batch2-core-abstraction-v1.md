# 第二批重构实施文档 — Core Abstraction（核心抽象）

Last updated: 2026-07-03

> 总编排文档：`docs/42-refactor-orchestration-v1.md`
> 本批次 5 个 PR 相互可并行，但 B2-PR5 依赖 B1-PR5 完成，B2-PR4 与 B2-PR2 需协调。

## B2-PR1：转码三件套统一抽象

### 目标

将 Video/Audio/ImageConvert 三个转码 service + 三个 TaskManager 的重复模式抽象为共享模块，消除跨层 25-30% 的重复代码。

### 前置依赖

无（与第一批无交叉）。

### 涉及文件清单

| 文件 | 行数 | 操作 |
|------|------|------|
| `electron/services/file-system-read/managementVideoTranscodeService.ts` | 1017 | 改造，复用共享模块 |
| `electron/services/file-system-read/managementAudioTranscodeService.ts` | 872 | 改造，复用共享模块 |
| `electron/services/file-system-read/managementImageConvertService.ts` | 731 | 改造，复用共享模块 |
| `electron/facade/FileSystemManagementHandlers.ts` | 796 | 改造，TaskManager 泛型化 |
| 新建 `electron/services/file-system-read/transcodeShared.ts` | ~250 | 新建共享模块 |
| 新建 `electron/facade/transcodeTaskRunner.ts` | ~150 | 新建泛型 TaskRunner |

### 当前重复模式分析

#### Service 层重复（跨三服务）

| 重复模式 | Video | Audio | Image | 可抽象性 |
|----------|-------|-------|-------|---------|
| `*CancelledError` 类 | 13 行 | 13 行 | 13 行 | **高** — 完全一致 |
| `TaskOptions` 接口 | `isCancelled?`, `signal?`, `onProgress?` | 同左 | `isCancelled?`, `onProgress?`（无 signal） | **高** — Video/Audio 一致 |
| `TaskResult` 接口 | 5 计数 + output_files + first_error | 同左 | 4 计数 + first_error | **高** — Video/Audio 一致 |
| `throwIfCancelled` | 检查 isCancelled + AbortSignal | 同左 | 仅检查 isCancelled | **高** |
| ffmpeg encoder probe | 38 行 | 47 行 | N/A | **高** — 几乎一致 |
| ffmpeg muxer probe | 40 行 | 59 行 | N/A | **高** — 几乎一致 |
| Codec cache（TTL 30s + dedup） | 完整 | 完整 | N/A | **高** — 完全一致 |
| Worker 消费循环 | pickNext → processSingle → Promise.all | 同左 | queue.shift → workerPool | **高** — 结构相同 |
| 错误处理（catch → cancel passthrough → rm output → count） | 完整 | 完整 | 完整 | **高** |
| `resolveTaskConcurrency` | `max(1, min(2, default, total))` | `max(1, min(2, round(default)))` | 不同逻辑 | **中** |
| `ensureState/ensureSnapshot` 外部队列 | 完全一样 | 完全一样 | 完全一样 | **高** |

#### Facade 层重复（FileSystemManagementHandlers 内）

三套 TaskManager 各自维护：
- `Map<taskId, TaskDto>` — 任务状态存储
- `Map<taskId, RuntimeState>` — 运行时状态
- `update*Task(updater)` — 状态更新模式
- `is*CancelledError(error)` — 错误类型检测
- `start → execute → cancel → read` — 生命周期

### 实施步骤

#### Step 1：创建共享模块 `transcodeShared.ts`

```typescript
// electron/services/file-system-read/transcodeShared.ts

// 1. 统一 CancelledError
export class TranscodeCancelledError extends Error {
  constructor(message = "转码任务已取消") {
    super(message);
    this.name = "TranscodeCancelledError";
  }
}

// 2. 统一 TaskOptions / TaskResult
export interface TranscodeTaskOptions {
  isCancelled?: () => boolean;
  signal?: AbortSignal;
  onProgress?: (payload: TranscodeProgressPayload) => void;
}

export interface TranscodeTaskResult {
  processedCount: number;
  successCount: number;
  skippedCount: number;
  failedCount: number;
  outputFiles?: string[];
  firstError?: string;
}

export interface TranscodeProgressPayload {
  taskId: string;
  processedCount: number;
  totalCount: number;
  progress?: number; // 0-1 子任务进度（仅 Video 有）
}

// 3. 统一 throwIfCancelled
export function throwIfCancelled(options: TranscodeTaskOptions): void {
  if (options.isCancelled?.()) throw new TranscodeCancelledError();
  if (options.signal?.aborted) throw new TranscodeCancelledError();
}

// 4. ffmpeg probe + cache（Video/Audio 共用）
export interface FfmpegCodecCapability { ... }

export class FfmpegCodecProbeCache {
  private cache = new Map<string, { value: FfmpegCodecCapability; expiresAt: number }>();
  private loadingPromises = new Map<string, Promise<FfmpegCodecCapability>>();
  private readonly ttlMs = 30_000;

  async probeEncoder(encoder: string): Promise<FfmpegCodecCapability> { ... }
  async probeMuxer(muxer: string): Promise<FfmpegCodecCapability> { ... }
  // ... 从 Video/Audio service 中提取的完整实现
}

export function buildFfmpegFailureMessage(...): string { ... }
export function classifyFfmpegFailure(...): "codec" | "muxer" | "io" | "unknown" { ... }

// 5. 统一 resolveTaskConcurrency
export function resolveTaskConcurrency(
  totalCount: number,
  defaultConcurrency: number,
  maxConcurrency = 2,
): number {
  return Math.max(1, Math.min(maxConcurrency, defaultConcurrency, totalCount));
}
```

#### Step 2：创建泛型 TaskRunner `transcodeTaskRunner.ts`

```typescript
// electron/facade/transcodeTaskRunner.ts
export interface TranscodeTaskRunnerConfig<TTask, TRequest> {
  taskType: "video" | "audio" | "image";
  taskParser: ZodSchema<TTask>;
  createTask: (request: TRequest) => TTask;
  executeTask: (task: TTask, options: TranscodeTaskOptions) => Promise<TranscodeTaskResult>;
  isCancelledError: (error: unknown) => boolean;
}

export class TranscodeTaskRunner<TTask, TRequest> {
  private tasks = new Map<string, TTask>();
  private runtime = new Map<string, { isCancelled: boolean; abortController: AbortController }>();

  start(request: TRequest): TTask { ... }
  cancel(taskId: string): void { ... }
  read(taskId: string): TTask | undefined { ... }
  // ... 统一生命周期管理
}
```

#### Step 3：改造 VideoTranscodeService

1. 移除 `VideoTranscodeCancelledError`，改用 `TranscodeCancelledError`
2. 移除本地 ffmpeg probe/cache，改用 `FfmpegCodecProbeCache`
3. 移除本地 `throwIfCancelled`，改用共享版本
4. 移除本地 `resolveTaskConcurrency`，改用共享版本
5. 保留 Video 特有逻辑：`out_time_ms` 进度解析、`scheduleVideoTranscodeProgress` 节流

#### Step 4：改造 AudioTranscodeService

同 Step 3，但保留 Audio 特有逻辑：import sources 更新、无子进度。

#### Step 5：改造 ImageConvertService

1. 移除 `ImageConvertCancelledError`，改用 `TranscodeCancelledError`
2. 保留 sharp + zip 逻辑（与 ffmpeg 无关）
3. 保留 in-place 替换 + archive index 刷新逻辑

#### Step 6：改造 FileSystemManagementHandlers

将三套独立的 `Map<taskId, TaskDto>` + `update*Task` + `is*CancelledError` 替换为三个 `TranscodeTaskRunner` 实例。

#### Step 7：更新测试

确认三个转码服务的测试全部通过，重点验证取消逻辑。

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run build:electron`
- [ ] `npx madge --circular src electron`

### 回归检查项

- [ ] 视频转码任务可正常启动/取消/读取状态
- [ ] 音频转码任务可正常启动/取消/读取状态
- [ ] 图片转换任务可正常启动/取消/读取状态
- [ ] ffmpeg 不可用时降级逻辑正常
- [ ] 并发任务数限制正常
- [ ] 任务失败后输出文件清理正常

### 回滚策略

- 共享模块独立文件，不影响现有 service
- 保留旧 `*CancelledError` 类名导出一个版本窗口（`export { TranscodeCancelledError as VideoTranscodeCancelledError }`）
- 出现异常时可回切各 service 的独立实现

### 风险评估

**中。** 涉及三个核心转码服务的重构，回归面大。关键风险点：
1. 取消机制差异（Video/Audio 有 AbortSignal，Image 无）需正确参数化
2. ffmpeg probe 的 cache 行为需保持一致
3. Facade 层 TaskRunner 泛型化后，进度节流逻辑（Video 专有）需通过 hook/回调注入

建议分步提交：先提取共享模块（不改 service），再逐个 service 迁移。

---

## B2-PR2：zustand Store 拆分

### 目标

将单 `useUiStore`（160+ 字段）拆分为多个职责清晰的 store，减少无关字段变更导致的 re-render。

### 前置依赖

无。但与 B2-PR4（FullscreenLayer 拆分）需协调——FullscreenLayer 消费 store。

### 涉及文件清单

| 文件 | 行数 | 操作 |
|------|------|------|
| `src/store/useUiStore.ts` | 470 | 拆分 |
| `src/features/app/useAppSettingsStore.ts` | 165 | 更新 selector |
| `src/contracts/settings.ts` | 443 | 检查 schema 划分 |
| 消费 `useUiStore` 的组件/hooks | ~20+ 文件 | 更新导入 |

### 当前结构分析

```typescript
// useUiStore.ts 当前结构
interface UiStore extends AppSettings {  // AppSettings 含 160+ 字段
  shortcuts: ShortcutMap;
  updateSettings: (patch: Partial<AppSettings>) => void;
  setShortcut: (action: ShortcutAction, binding: string) => void;
  resetShortcuts: () => void;
}
```

`SETTINGS_KEYS` 数组列举了 ~100+ 个需要持久化的 key，涵盖：
- **布局**：mode, sidebarRatio, thumbnailScale, thumbnailGap, headerHeight, metadataRatio, layoutGapScaleCoeff 等
- **音频引擎**：audioEngineMode, audioOutputDeviceId, audioExclusiveEnabled, audioGaplessMode, audioReplayGainMode 等
- **字幕**：subtitleLanguage, subtitleModelDir, subtitleFontSize, subtitleTextColor 等 ~20 个
- **Ad Review**：adReviewVisionEndpoint, adReviewExecutionMode, adReviewStrategyMode 等
- **性能**：mediaPreloadMemoryBudgetMb, thumbnailAdaptiveResolution, cpuTokenLimit 等
- **快捷键**：shortcuts（独立 Map）

### 拆分方案

**决策：采用 "持久化设置 + UI 临时状态" 双 store 方案，而非三 store。**

理由：`AppSettings` 的所有字段都需要持久化（通过 `appSettingsSchema` 验证），强行拆为多个 schema 会增加持久化逻辑复杂度。真正的 re-render 问题来自 UI 临时状态与持久化设置混在一起。

```
拆分前：                           拆分后：
┌─────────────────────┐           ┌──────────────────────┐
│ useUiStore          │           │ useSettingsStore     │
│  ├ AppSettings(160+)│           │  ├ AppSettings(160+) │
│  ├ shortcuts        │           │  ├ shortcuts         │
│  ├ updateSettings   │           │  ├ updateSettings    │
│  ├ setShortcut      │           │  └ setShortcut       │
│  └ resetShortcuts   │           └──────────────────────┘
└─────────────────────┘           ┌──────────────────────┐
                                  │ useUiStateStore      │
                                  │  ├ settingsOpen      │
                                  │  ├ helpOpen          │
                                  │  ├ metadataCollapsed │
                                  │  └ popoverDebugPinned│
                                  └──────────────────────┘
```

**说明**：经过分析，`useUiStore` 中绝大多数字段都是 `AppSettings` 的一部分（需持久化），只有少量纯 UI 临时状态（如 `settingsOpen`, `helpOpen`）虽也在 AppSettings 中但变更频率极高。

**替代优化方案（推荐）：不拆 store，改为优化 selector 粒度。**

当前 `useAppSettingsStore.ts` 使用 `useShallow` 一次选取 160+ 字段。优化方向：

1. 创建多个细粒度 selector hook：
   - `useLayoutSettings()` — 仅选取布局相关字段
   - `useAudioSettings()` — 仅选取音频相关字段
   - `useSubtitleSettings()` — 仅选取字幕相关字段
   - `useAdReviewSettings()` — 仅选取 Ad Review 相关字段

2. 每个组件只订阅自己需要的 selector，而非全量。

### 实施步骤

#### Step 1：分析字段分组

将 `SETTINGS_KEYS` 按领域分组：

| 组 | 字段数 | 典型字段 |
|----|--------|---------|
| layout | ~20 | mode, sidebarRatio, thumbnailScale, headerHeight, metadataRatio, *ScaleCoeff |
| audio | ~10 | audioEngineMode, audioOutputDeviceId, audioExclusive*, audioGapless*, audioReplay* |
| subtitle | ~20 | subtitleLanguage, subtitleModelDir, subtitleFontSize, subtitleText*, subtitleStroke* |
| adReview | ~10 | adReviewVision*, adReviewExecution*, adReviewStrategy*, adReviewHash* |
| performance | ~5 | mediaPreloadMemoryBudgetMb, thumbnailAdaptiveResolution, cpuTokenLimit |
| general | ~15 | searchField, searchText, vectorThreshold, autoPlay*, showNamesOnly |

#### Step 2：创建领域 selector hooks

```typescript
// src/features/app/useAppSettingsSelectors.ts
export function useLayoutSettings() {
  return useUiStore(
    useShallow((state) => ({
      mode: state.mode,
      sidebarRatio: state.sidebarRatio,
      thumbnailScale: state.thumbnailScale,
      // ... 仅布局字段
    }))
  );
}

export function useAudioSettings() { ... }
export function useSubtitleSettings() { ... }
```

#### Step 3：逐步迁移消费组件

将组件从 `useAppSettingsStore`（全量选取）迁移到对应的领域 selector。

优先迁移高频渲染组件：`ImageMainSection`, `MusicMainSection`, `FullscreenLayer`, `SidebarPanel`。

#### Step 4：保留 useAppSettingsStore 向后兼容

`useAppSettingsStore` 暂时保留，标记为 `@deprecated`，待所有组件迁移后移除。

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npx madge --circular src electron`

### 回归检查项

- [ ] 设置面板打开/切换/保存后重启值一致
- [ ] 布局调整（侧边栏比例、缩略图大小）响应正常
- [ ] 音频引擎切换正常
- [ ] 字幕设置变更正常
- [ ] 性能无明显退化（首屏与常用操作体感不下降）

### 回滚策略

selector hooks 为新增文件，不影响现有 `useAppSettingsStore`。出现问题直接回退组件导入。

### 风险评估

**中。** selector 迁移过程中需确保不遗漏字段。`useShallow` 的行为需充分测试——当多个 selector 共存时，需确认 zustand 的订阅通知不会产生额外开销。

---

## B2-PR3：themeParameterPanelCatalog 拆分

### 目标

将全仓最大文件 `themeParameterPanelCatalog.ts`（5532 行）按主题区域拆分为 5-7 个独立文件，治理 jscpd 主贡献源。

### 前置依赖

无。

### 涉及文件清单

| 文件 | 行数 | 操作 |
|------|------|------|
| `src/components/theme-parameter/themeParameterPanelCatalog.ts` | 5532 | 拆分为多个文件 |
| `src/components/theme-parameter/themeParameterPanelTypes.ts` | 145 | 保留，类型定义 |
| 引用 catalog 的文件 | ~5 文件 | 更新导入 |

### 当前结构分析

文件内容全部是静态数据定义（`readonly` 数组），按主题区域组织为 `export const` 导出。从文件头部可识别的区域分组：

| 区域 | 典型导出 | 估算行数 |
|------|---------|---------|
| Container 背景/边框 | `CONTAINER_BACKGROUND_TEXT_FIELDS`, `CONTAINER_SHARED_COLOR_FIELDS`, `CONTAINER_SHARED_TEXT_FIELDS` | ~400 |
| Sidebar | `SIDEBAR_*_FIELDS` | ~600 |
| Image Main | `IMAGE_MAIN_*_FIELDS` | ~800 |
| Music Main | `MUSIC_MAIN_*_FIELDS` | ~600 |
| Video Main | `VIDEO_MAIN_*_FIELDS` | ~500 |
| Metadata Panel | `METADATA_*_FIELDS` | ~500 |
| Settings Panel | `SETTINGS_*_FIELDS` | ~500 |
| Fullscreen | `FULLSCREEN_*_FIELDS` | ~400 |
| 调试/杂项 | `DEBUG_*_FIELDS` | ~800 |
| 聚合导出 | `PANEL_CATALOG`, `SECTION_GROUPS` 等 | ~400 |

### 实施步骤

#### Step 1：分析文件完整导出清单

用 grep 提取所有 `export const` 和 `export function`，确定分组边界。

#### Step 2：创建子目录 `theme-parameter/catalog/`

```
src/components/theme-parameter/catalog/
  ├── containerFields.ts
  ├── sidebarFields.ts
  ├── imageMainFields.ts
  ├── musicMainFields.ts
  ├── videoMainFields.ts
  ├── metadataFields.ts
  ├── settingsFields.ts
  ├── fullscreenFields.ts
  ├── debugFields.ts
  └── index.ts    ← 聚合所有导出
```

#### Step 3：按区域拆分

将每个区域的 `export const` 移入对应文件。类型导入从 `themeParameterPanelTypes.ts` 统一引用。

#### Step 4：创建聚合 index.ts

```typescript
// catalog/index.ts
export * from "./containerFields";
export * from "./sidebarFields";
export * from "./imageMainFields";
// ...
```

#### Step 5：更新引用

将所有从 `themeParameterPanelCatalog` 导入的位置改为从 `catalog/` 导入（或通过 `catalog/index.ts` 聚合导出保持兼容）。

#### Step 6：删除原文件

确认所有引用已迁移后删除 `themeParameterPanelCatalog.ts`。

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npx madge --circular src electron`
- [ ] `npx jscpd src electron --config .jscpd.json --silent`（重复率下降）

### 回归检查项

- [ ] 主题参数面板所有区域渲染正常
- [ ] 主题参数导出/导入功能正常
- [ ] 主题参数快照功能正常

### 回滚策略

纯文件拆分，`git revert` 即可恢复。

### 风险评估

**中。** 5532 行文件的拆分需仔细确认导出边界，避免遗漏或循环引用。建议拆分后用 `madge` 验证无循环依赖。

---

## B2-PR4：FullscreenLayer 拆分

### 目标

将 `FullscreenLayer.tsx`（1920 行）按子功能拆分，降低单文件复杂度。

### 前置依赖

与 B2-PR2（Store 拆分）需协调——FullscreenLayer 消费 store，如 selector 同时迁移需注意。

### 涉及文件清单

| 文件 | 行数 | 操作 |
|------|------|------|
| `src/components/FullscreenLayer.tsx` | 1920 | 拆分 |
| `src/components/fullscreen/` | 已有子目录 | 保留，扩展 |

### 当前结构分析

FullscreenLayer 已有部分拆分——`src/components/fullscreen/` 子目录包含：
- `FullscreenFooter`, `FullscreenPanes`, `FullscreenVideoControls`
- `useFullscreenImageSource`, `useFullscreenWheelPager`
- `useFullscreenImageAdjustPanelController`, `useFullscreenViewportSize`
- `paneMath.ts`, `controlsWidth.ts`

1920 行的主体组件包含：
- ~21 个 `useEffect` 调用
- 全屏图片/视频切换逻辑
- 双窗格分屏（split）逻辑
- 全屏自动播放控制
- 全屏删除/管理操作
- 全屏键盘/滚轮导航
- 全屏组选择器

### 拆分方案

将 `FullscreenLayer.tsx` 拆为以下模块：

| 新文件 | 提取内容 | 估算行数 |
|--------|---------|---------|
| `fullscreen/useFullscreenSplitState.ts` | 双窗格分屏状态与逻辑 | ~200 |
| `fullscreen/useFullscreenNavigation.ts` | 键盘/滚轮导航逻辑 | ~150 |
| `fullscreen/useFullscreenAutoplay.ts` | 自动播放控制 | ~100 |
| `fullscreen/useFullscreenActions.ts` | 删除/管理操作 | ~150 |
| `FullscreenLayer.tsx`（保留） | 组件渲染 + 状态组装 | ~800-1000 |

### 实施步骤

#### Step 1：提取 useFullscreenSplitState

将双窗格分屏相关状态（split ratio, sticky split, dual adaptive）和 effect 提取为独立 hook。

#### Step 2：提取 useFullscreenNavigation

将键盘导航（左右/上下翻页）和滚轮分页逻辑提取为独立 hook。

#### Step 3：提取 useFullscreenAutoplay

将自动播放间隔、启停逻辑提取为独立 hook。

#### Step 4：提取 useFullscreenActions

将全屏删除、管理操作回调提取为独立 hook。

#### Step 5：精简主组件

主组件仅负责状态组装和渲染，通过 hook 获取所有逻辑。

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npx madge --circular src electron`

### 回归检查项

- [ ] 全屏进入/退出正常
- [ ] 全屏翻页（键盘/滚轮）正常
- [ ] 双窗格分屏调整正常
- [ ] 全屏自动播放正常
- [ ] 全屏删除/管理操作正常
- [ ] 全屏图片调整面板正常

### 回滚策略

纯文件拆分 + hook 提取，`git revert` 即可恢复。

### 风险评估

**中。** 21 个 `useEffect` 的依赖关系复杂，提取为独立 hook 时需确保依赖数组完整传递。建议每提取一个 hook 就运行测试验证。

---

## B2-PR5：bare ipcMain.handle 收归

### 目标

将 31 个直接使用 `ipcMain.handle` 的 handler 收归到 `registerIpcCommand` / `registerIpcQuery` 抽象中，统一 schema 验证和错误处理。

### 前置依赖

**B1-PR5（Schema 三重解析消除）必须先完成**——两个 PR 同改 `preload.ts`，须先完成 preload 侧 parse 移除。

### 涉及文件清单

| 文件 | 行数 | 操作 |
|------|------|------|
| `electron/registerBackendIpcHandlers.ts` | 1619 | 改造 bare handler |
| `electron/preload.ts` | 1118 | 可能需协调 |

### 当前问题分析

| bare handler 类别 | 数量 | 原因 | 可收归性 |
|-------------------|------|------|---------|
| Audio Engine 控制 | ~16 | 手动管理 schema parse + response 构造 | **高** — 可改用 `registerIpcCommand` |
| Native Dialog | ~3 | 使用 Electron 原生对话框 | **低** — 逻辑特殊，保留 bare |
| Subtitle Session | ~9 | 需访问 `event.sender` 获取 webContents id | **中** — 需扩展抽象支持 sender |
| 其他 | ~3 | 特殊逻辑 | **低** |

### 实施步骤

#### Step 1：收归 Audio Engine handler（~16 个）

将 `setAudioEngineMode`, `audioEngineLoadTrack`, `audioEngineSetPaused`, `audioEngineSeekTo`, `audioEngineSetVolume`, `audioEngineStopPlayback` 等改为 `registerIpcCommand`。

每个 handler 的改造模式：
```typescript
// 改造前
ipcMain.handle(BACKEND_CHANNELS.setAudioEngineMode, (event, request) => {
  const parsed = setAudioEngineModeRequestSchema.parse(request);
  // ... 业务逻辑
  const response = setAudioEngineModeResponseSchema.parse(result);
  return response;
});

// 改造后
registerIpcCommand(
  BACKEND_CHANNELS.setAudioEngineMode,
  setAudioEngineModeRequestSchema,
  setAudioEngineModeResponseSchema,
  (request) => ensureService().setAudioEngineMode(request),
);
```

#### Step 2：评估 Subtitle Session handler（~9 个）

Subtitle Session handler 需访问 `event.sender` 获取 `webContents id`，当前 `registerIpcCommand` 的 action 签名不接受 `event`。

**方案 A（推荐）：** 扩展 `registerIpcCommand` 的 action 签名，可选传入 `event`：
```typescript
type IpcCommandAction<TRequest, TResponse> = 
  (request: TRequest, event?: IpcMainInvokeEvent) => TResponse | Promise<TResponse>;
```

**方案 B：** 保留 bare handler，仅统一 schema parse 模式。

#### Step 3：保留 Native Dialog handler

`pickImportPaths`, `pickFilePath`, `pickDirectoryPath` 保留 bare handler，因其使用 Electron 原生对话框且逻辑特殊。

### 验证清单

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run build:electron`
- [ ] `npx madge --circular src electron`

### 回归检查项

- [ ] 音频引擎模式切换正常
- [ ] 音频引擎播放/暂停/跳转/音量/停止正常
- [ ] 字幕会话启动/停止/重置/推送正常
- [ ] 原生对话框（文件选择/目录选择）正常

### 回滚策略

每个 handler 的收归独立提交，可按类别回滚（如仅回滚 Audio Engine 类）。

### 风险评估

**低-中。** Audio Engine handler 收归风险低（模式一致）。Subtitle Session handler 如需扩展 `registerIpcCommand` 签名，需确认不影响现有 57 个 `registerIpcCommand` 调用。

---

## 第二批通用回滚策略

| PR | 回滚方式 | 影响范围 |
|----|---------|---------|
| B2-PR1 | 恢复各 service 独立实现 | 转码三服务 |
| B2-PR2 | 回退组件 selector 导入 | 前端 re-render |
| B2-PR3 | `git revert` 文件拆分 | 主题参数面板 |
| B2-PR4 | `git revert` hook 提取 | 全屏功能 |
| B2-PR5 | 按类别回滚 handler 收归 | IPC handler |

## 变更记录

### 2026-07-03：初始创建

- 基于 4 维探索分析创建第二批 5 个 PR 的详细实施文档
- B2-PR5 依赖 B1-PR5 完成；B2-PR2 与 B2-PR4 需协调
