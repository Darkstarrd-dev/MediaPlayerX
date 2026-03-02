# Shader 插件模式改造实施清单（全局开关 + 设置面板 Shader 分页）v1

Last updated: 2026-03-02（已同步到当前执行进度）

## 0. 决策冻结（本轮）

- 保持当前可用链路为默认：现有音乐可视化渲染链路继续作为 `legacy` 模式运行。
- 新能力通过全局开关灰度：新增 `legacy | plugin` 全局模式开关，默认 `legacy`。
- 设置面板新增独立 Shader 分页：后续 Shader 的模式切换、输入配置、预览能力均集中在该分页。
- 改造策略为双轨并行：先接线、再并行运行、最后迁移入口，不做一次性替换。

## 1. 交付范围与非目标

### 1.1 本期交付范围

- 全局模式开关（可持久化、可回滚、默认 legacy）。
- 设置面板新增 Shader 分页，并支持：
  - 模式切换（legacy/plugin）。
  - 输入配置（基础映射能力，先覆盖最小可用集合）。
  - 预览渲染（独立预览画布，不影响主播放链路）。
- 运行时新增插件分支与自动回退：插件分支失败时自动回落 legacy。
- 音乐主区去重入口：移除或降级原有 Shader 浮层入口，避免双配置源。

### 1.2 本期非目标

- 不一次性替换现有 Shader 运行时。
- 不首期覆盖 Shadertoy 网站全部输入能力（键盘、摄像头等）。
- 不首期上线在线抓取 Shadertoy 内容。

## 2. 里程碑（建议执行顺序）

### M1：契约与设置面板接线（低风险）

- 完成设置 schema、默认值、持久化迁移、设置分页框架接线。
- 验收口径：切换开关可保存、重启后生效、默认不改变现有行为。

### M2：插件运行时最小闭环（中风险）

- 在不影响 legacy 的前提下，接入插件 runtime 分支与自动回退。
- 验收口径：plugin 可渲染基础 shader，异常自动回退 legacy。

### M3：Shader 分页输入与预览（中风险）

- Shader 分页内完成输入映射与预览能力，主界面仅保留最小入口。
- 验收口径：不进入音乐主区浮层也能完成模式切换、输入配置、预览。

### 2.1 当前执行进度（2026-03-02）

- [x] M1 已完成：全局 `musicVisualizerRuntimeMode` 已接线（schema/store/hydration/persistence）。
- [x] M1 已完成：设置面板新增 Shader 分页并接入中英文文案。
- [x] M2 已完成（桥接态）：`useMusicVisualizerRuntime` 已改为 facade，plugin 分支可自动桥接回 legacy 渲染链路。
- [x] M2 已完成（最小管线）：已落地 Plugin `Adapter + SignalBank + InputBinder`，并通过桥接方式注入到 legacy 渲染链路。
- [x] M2 已完成（增量）：核心映射已改为运行时 uniform/sampler 动态绑定（`audioLevel/audioBeat/time/audioTexture`）。
- [x] M2 已完成（增量）：设置页已接入 Program 反射面板，可列出 active uniforms/samplers。
- [x] M2 已完成（增量）：任意 uniform/sampler 绑定器已可配置并持久化（按 shaderId）。
- [x] M2 已完成（增量）：绑定器支持 transform 链路（scale/bias/clamp/smooth），并支持按 uniform 持久化。
- [x] M3 已完成（增量）：Transform 编辑器支持预设/重置（默认、节拍冲击、平滑包络）以降低调参成本。
- [x] M3 已完成（增量）：支持按当前 shader 导入/导出绑定 JSON（含基础输入映射 + custom bindings）。
- [x] M3 已完成（增量）：支持一键清空当前 shader 的 custom bindings（scalar/sampler/transform）。
- [x] M3 已完成（基础）：输入映射字段可按 shaderId 编辑并持久化。
- [x] M3 已完成（基础）：Shader 分页预览画布上线（开始/停止、后端/FPS 状态）。
- [x] M3 已完成（增量）：预览输入源支持 `demo/player` 切换，`player` 走 `readAudioEngineAnalysisFrame`。
- [x] M3 已完成（增量）：输入映射已进入 plugin 适配流程（通过宏别名映射到 `iAudioLevel/iAudioBeat/iTime/iChannel0`）。
- [x] T7 已完成：音乐主区 Shader 列表/参数浮层已收口，改为单一“打开设置面板”快捷入口。
- [x] T7 已完成（增量）：主区快捷入口已支持直达设置面板 Shader 分页（通过 `settingsPanelSection=shader`）。
- [x] T1 已完成（增量）：补齐 `musicVisualizerShaderLab` 配置契约并接入持久化（adapterMode/previewFpsCap/previewRenderLongEdgePx/previewInputSource）。
- [x] SSOT 已同步：`docs/04`、`docs/05`、`docs/12`、`docs/13` 已更新为“设置面板 Shader 分页为唯一编辑入口”。

### 2.2 已执行质量校验（持续回归）

- `npm run test -- src/features/app/buildSettingsPanelProps.test.ts src/features/app/useSettingsPersistence.test.tsx src/features/music-visualizer/useMusicVisualizerRuntime.test.tsx`
- `npm run build`
- `npm run lint`

## 3. 可直接开工任务清单（按模块/配置/测试/回滚拆解）

### T1. 配置契约扩展（全局开关）

- 目标：增加全局 Shader 运行模式，确保向后兼容。
- 代码模块：
  - `src/contracts/settings.ts`
  - `src/store/useUiStore.ts`
  - `src/features/app/useSettingsPersistence.ts`
  - `src/features/app/usePersistedAppSettings.ts`
- 配置项：
  - `musicVisualizerRuntimeMode: "legacy" | "plugin"`（默认 `legacy`）
  - `musicVisualizerShaderLab`（建议先最小字段）
    - `adapterMode: "auto" | "shadertoy" | "glsl"`
    - `previewFpsCap: 30 | 60 | 120`
    - `previewRenderLongEdgePx: 240..2048`
    - `previewInputSource: "demo" | "player"`
- 骨架代码：

```ts
export const musicVisualizerRuntimeModeSchema = z
  .enum(["legacy", "plugin"])
  .default("legacy");

export const appSettingsSchema = z.object({
  // ...existing fields
  musicVisualizerRuntimeMode: musicVisualizerRuntimeModeSchema,
});
```

- 测试点：
  - `useSettingsPersistence.test.tsx`：旧配置缺省时回填 `legacy`，非法值回退。
  - `useUiStore.test.ts`：默认值与更新行为。
- 回滚点：
  - 强制把默认值与 hydration 回填值设为 `legacy`。
  - 保留字段但不消费字段，保证旧链路完全可运行。

### T2. 设置面板新增 Shader 分页（全局入口）

- 目标：在设置面板新增独立 Shader 分页，作为后续唯一配置入口。
- 代码模块：
  - `src/components/settings/renderSettingsMainSection.types.ts`
  - `src/components/settings/settingsPanelHelpers.ts`
  - `src/components/settings/renderSettingsMainSectionContent.tsx`
  - `src/components/settings/renderSettingsShaderSection.tsx`（新增）
  - `src/i18n/locales/zh-CN.part1.ts`
  - `src/i18n/locales/en-US.part1.ts`
- 配置项：
  - 设置分组新增 `shader` section id。
  - i18n 新增 `ui.settings.sectionShader` 及 Shader 分页文案 key。
- 骨架代码：

```ts
export type SettingsSection =
  | "layout"
  | "performance"
  | "audio"
  | "model"
  | "debug"
  | "shortcuts"
  | "database"
  | "system"
  | "shader";

if (activeSection === "shader") {
  return renderSettingsShaderSection({ params, settingsTip });
}
```

- 测试点：
  - `resolveSettingsSection` 对 `shader` 的识别。
  - 设置侧栏显示新分页并可切换。
- 回滚点：
  - 仅隐藏 `shader` section，不删除底层字段。
  - 设置主逻辑保持其余 section 不变。

### T3. 顶层属性接线（SettingsPanelProps 全量传递）

- 目标：把 Shader 分页需要的配置和回调接入设置面板。
- 代码模块：
  - `src/components/SettingsPanel.types.ts`
  - `src/components/SettingsPanel.impl.tsx`
  - `src/features/app/buildSettingsPanelProps.ts`
  - `src/features/app/useAppTopLayerState.ts`
  - `src/features/app/buildSettingsPanelProps.test.ts`
- 配置项：
  - `musicVisualizerRuntimeMode`
  - Shader 分页的回调：
    - `onMusicVisualizerRuntimeModeChange`
    - `onShaderLabConfigChange`
- 测试点：
  - `buildSettingsPanelProps.test.ts` 新增断言：新字段传递与回调 patch 正确。
- 回滚点：
  - 保留字段透传但 UI 不渲染；不会影响其他设置项。

### T4. 运行时双分支与自动回退（核心安全阀）

- 目标：在当前 runtime 外包一层 mode 分发，plugin 失败自动回退 legacy。
- 代码模块：
  - `src/features/music-visualizer/useMusicVisualizerRuntime.ts`（改为 facade）
  - `src/features/music-visualizer/useMusicVisualizerLegacyRuntime.ts`（新增，迁移现有实现）
  - `src/features/music-visualizer/useMusicVisualizerPluginRuntime.ts`（新增，插件实现）
- 配置项：
  - `mode: "legacy" | "plugin"`
  - `fallbackOnError: true`
- 骨架代码：

```ts
export function useMusicVisualizerRuntime(params: RuntimeParams) {
  if (params.mode !== "plugin") {
    return useMusicVisualizerLegacyRuntime(params);
  }

  const pluginResult = useMusicVisualizerPluginRuntime(params);
  if (!pluginResult.fatal) {
    return pluginResult;
  }

  return {
    ...useMusicVisualizerLegacyRuntime(params),
    runtimeError: `plugin fallback -> legacy: ${pluginResult.runtimeError ?? "unknown"}`,
  };
}
```

- 测试点：
  - `useMusicVisualizerRuntime.test.tsx`：
    - mode=legacy 行为不变。
    - mode=plugin 初始化失败自动回退。
    - 回退后主渲染不中断。
- 回滚点：
  - 一键把 facade 默认模式锁定为 `legacy`。
  - 保留 plugin 代码但不激活。

### T5. 插件核心模块（Adapter / SignalBank / Binder）

- 目标：在 plugin runtime 中引入可扩展输入映射层。
- 代码模块（建议新增目录）：
  - `src/features/music-visualizer/plugin/adapters/`
    - `shaderAdapter.ts`
    - `shadertoyAdapter.ts`
    - `glslAdapter.ts`
  - `src/features/music-visualizer/plugin/signalBank.ts`
  - `src/features/music-visualizer/plugin/programIntrospection.ts`
  - `src/features/music-visualizer/plugin/inputBinder.ts`
  - `src/features/music-visualizer/webglRenderer.ts`（最小侵入扩展）
- 配置项：
  - `adapterMode` 决定源码适配策略。
  - `inputMappingsByShaderId` 存储映射配置。
- 骨架代码：

```ts
interface InputBinding {
  uniformName: string;
  signal: "audioLevel" | "audioBeat" | "timeSec" | "audio.soundTex";
  transform?: Array<{ kind: "scaleBias" | "clamp"; [k: string]: number }>;
}

interface SignalBank {
  scalars: Map<string, number>;
  vectors: Map<string, number[]>;
  textures: Map<string, WebGLTexture>;
}
```

- 测试点：
  - `shadertoyAdapter.test.ts`：mainImage 包装保持兼容。
  - 新增 `glslAdapter.test.ts`：main 模式编译路径。
  - 新增 `signalBank.test.ts`：512x2 音频纹理布局。
  - 新增 `inputBinder.test.ts`：uniform/sampler 绑定和 transform。
- 回滚点：
  - plugin runtime 内部可直接退化到固定 legacy uniform 推送。
  - 出现兼容性问题时禁用 `adapterMode=glsl`，保留 shadertoy-only。

### T6. Shader 分页输入与预览能力

- 目标：在设置分页内完成模式切换、输入映射、预览闭环。
- 代码模块：
  - `src/components/settings/renderSettingsShaderSection.tsx`
  - `src/components/settings/ShaderPreviewCanvas.tsx`（新增）
  - `src/features/music-visualizer/useMusicVisualizerPluginRuntime.ts`
  - `src/features/music-visualizer/audioAnalyser.ts`（可复用 demo 输入）
- 配置项：
  - 预览参数（fps/分辨率/输入源）。
  - 当前草稿 shader 文本与映射配置（按 shaderId 维度持久化）。
- 最小交互要求：
  - 模式开关：legacy/plugin。
  - 输入映射：至少支持 `audioLevel/audioBeat/timeSec/audio.soundTex`。
  - 预览：支持开始/停止、错误提示、FPS/后端显示。
- 测试点：
  - 分页内切换模式后配置即时生效。
  - 输入映射改动不触发 shader 重编译（仅更新绑定）。
  - 预览异常不影响主音乐播放链路。
- 回滚点：
  - 关闭预览渲染，仅保留配置编辑。
  - 预览失败时显示错误并允许回切 legacy。

### T7. 音乐主区入口收口（避免双配置源）

- 目标：把 Shader 调参与模式切换入口收敛到设置面板 Shader 分页。
- 代码模块：
  - `src/components/MusicMainSectionControlsShell.tsx`
  - `src/components/MusicMainSection.tsx`
  - `src/components/MusicMainSection.test.tsx`
- 实施建议：
  - 删除或降级原 Shader 列表/参数浮层。
  - 可保留一个“打开设置 > Shader”快捷按钮（只做导航，不做参数编辑）。
- 测试点：
  - 主区不再出现旧 Shader 参数浮层。
  - 从设置分页修改后，主区渲染即时响应。
- 回滚点：
  - 通过 UI 开关恢复旧浮层入口（临时双入口应急）。

### T8. 本地用户 Shader 工作区（可选增量，建议放 M3 后）

- 目标：支持用户本地 shader 资产组织，不引入在线抓取。
- 代码模块（建议新增）：
  - `src/features/music-visualizer/plugin/workspace/*`
  - （如需后端）`electron/facade/*` + `electron/registerBackendIpcHandlers.ts`
- 配置项：
  - 本地工作区路径、扫描策略、索引缓存版本号。
- 测试点：
  - 冷启动扫描与增量刷新。
  - 非法 shader 文件隔离与错误提示。
- 回滚点：
  - 关闭目录扫描，退回仅内存草稿模式。

### T9. 质量门禁与发布回滚策略

- 自动化测试最小集：
  - `npm run test -- src/features/music-visualizer/useMusicVisualizerRuntime.test.tsx src/features/music-visualizer/shadertoyAdapter.test.ts src/features/music-visualizer/shaderRegistry.test.ts src/features/app/buildSettingsPanelProps.test.ts src/features/app/useSettingsPersistence.test.tsx src/components/MusicMainSection.test.tsx`
- 手工验收矩阵：
  - 播放模式：chromium / mpv
  - 视图模式：窗口 / 全屏
  - 渲染后端：gpu / cpu
  - 运行模式：legacy / plugin
- 发布回滚：
  - L1：配置回滚（默认 legacy，保留 plugin 代码）。
  - L2：UI 回滚（隐藏 Shader 分页，仅保留 legacy）。
  - L3：代码回滚（runtime facade 直接固定 legacy 分支）。

## 4. 关键风险与防线

- 风险：plugin 分支编译/绑定错误导致黑屏。
  - 防线：每帧异常捕获 + 自动回退 legacy + 错误可视化。
- 风险：新旧配置并存导致歧义。
  - 防线：单一真相源：`musicVisualizerRuntimeMode` 决定主渲染分支。
- 风险：双入口导致状态冲突。
  - 防线：设置面板 Shader 分页成为唯一可编辑入口。

## 5. SSOT 同步要求（本方案落地后必须执行）

- 交互变更：同步 `docs/05-interaction-v1.md`（设置面板新增 Shader 分页、主区入口收口）。
- 架构边界变更：同步 `docs/04-architecture-v1.md`（legacy/plugin 双运行时与输入映射层）。
- Shader 规则变更：同步 `docs/12-music-visualizer-shader-entry.md` 与 `docs/13-music-visualizer-shader-migration-playbook.md`。

## 6. 开工顺序建议（可直接按此建任务）

- 第 1 批（低风险）：T1 + T2 + T3。
- 第 2 批（核心能力）：T4 + T5。
- 第 3 批（用户可见）：T6 + T7。
- 第 4 批（扩展能力）：T8。
- 第 5 批（合规与发布）：T9 + SSOT 同步。
