# Tips（疑难点处理记录）

用于沉淀开发过程中“看起来写了但不生效”的环境差异问题与处理方案。

## 模板（新增条目请复制）

### N. 标题（环境/平台 + 现象）

#### 现象

- 用一句话描述最终可见问题。

#### 触发条件

- 说明运行环境、浏览器内核、关键前置条件。

#### 根因分析

- 根因 1：
- 根因 2：
- 根因 3（可选）：

#### 处理方案

- 方案 1：
- 方案 2：
- 方案 3（可选）：

#### 本项目落地（文件与要点）

- `路径:行号`：改动要点。
- `路径:行号`：改动要点。

#### 验证方式

- 验证步骤 1
- 验证步骤 2

#### 注意事项 / 回归风险

- 说明可能影响范围与回归点。

---

## 1. Chromium/Electron 下自定义滚动条样式不生效（仅显示纯色）

#### 现象

- `::-webkit-scrollbar-track/thumb` 已写渐变与阴影，但运行时只显示纯色块，`hover` 只变色。

#### 触发条件

- 运行于 Chromium/Electron 内核。
- 同一滚动容器同时配置了 `scrollbar-color` 或 `scrollbar-width`（非 `auto`）。
- 项目存在全局 `::-webkit-scrollbar-button` 隐藏规则。

#### 根因分析

- 根因 1：`scrollbar-color`/`scrollbar-width`（非 `auto`）会在 Chromium/Electron 下压过 `::-webkit-scrollbar*` 的高级绘制。
- 根因 2：`::-webkit-scrollbar-track` 上的 `margin-block` 在该环境下基本不生效，百分比缩短轨道高度无效。
- 根因 3：全局 `*::-webkit-scrollbar-button { display: none !important; }` 会让 button 占位缩短轨道方案失效。

#### 处理方案

- 将 `scrollbar-color`/`scrollbar-width` 仅作为非 WebKit 降级，放入 `@supports not selector(::-webkit-scrollbar)`。
- WebKit 分支显式使用 `auto`，确保 `::-webkit-scrollbar*` 接管绘制。
- 需要缩短滚道高度时，改用 `::-webkit-scrollbar-button` 上下占位，不使用 `track margin`。
- 在目标容器（如 `.sidebar-tree`）用更高选择器并配合 `!important` 覆盖全局 button 隐藏规则。

#### 本项目落地（文件与要点）

- `src/styles/themes/contract.css:48`：新增 sidebar-tree 滚动条基础设施 token（size/radius/track/thumb/end-gap 等）。
- `src/styles/app/sidebar.css:204`：sidebar-tree 的非 WebKit 降级与 WebKit 主渲染分流。
- `src/styles/app/sidebar.css:263`：通过 `::-webkit-scrollbar-button` vertical 占位实现端部留白。
- `src/styles/themes/styles/soft-skeuomorphic.css:235`：`skeuomorphic-luxury-white` 注入“极细铂金线”参数。

#### 验证方式

- 切换到 `soft-skeuomorphic + skeuomorphic-luxury-white`，确认 sidebar-tree 滚动条显示渐变、阴影、active 内陷。
- 调整 `--mpx-sidebar-tree-scrollbar-end-gap`，确认顶部/底部留白可见变化。
- 在非 WebKit 环境确认降级样式可用（`scrollbar-color`/`scrollbar-width` 生效）。

#### 注意事项 / 回归风险

- 若后续恢复全局强制 `scrollbar-color`（非 `auto`），可能再次压制 WebKit 自定义滚动条效果。
- 若改动全局 `*::-webkit-scrollbar-button` 规则，需要同步验证 `.sidebar-tree` 的覆盖优先级。

---

## 2. 全屏 dual 模式视频偶发重复/回跳片首（隐藏主播放器串写进度）

#### 现象

- 全屏 `dual` 模式下，视频结束后偶发不切下一个而是重复当前视频（通常只出现一次）。
- 播放过程中偶发提前跳回片首附近，从头播放。

#### 触发条件

- 进入全屏后，`FullscreenLayer` 与 `AppWorkspace` 同时挂载。
- 主区 `VideoMainSection` 在全屏时未卸载，仅 `active=false`。
- 当前视频尚未生成封面图时，会触发自动封面抓帧副作用。

#### 根因分析

- 根因 1：主区 `VideoMainSection` 的自动封面抓帧逻辑会执行 `onVideoTimeUpdate(0.1)`，把全局 `videoTime` 改写到片首附近。
- 根因 2：即使主区已非激活，隐藏 `<video>` 的 `timeupdate/seeked` 仍会持续回写全局 `videoTime`。
- 根因 3：全屏层监听到 `videoTime` 跳变后会执行同步 seek，表现为当前视频被拉回片首，形成“重复一次/中途回跳”。

#### 处理方案

- 方案 1：自动封面抓帧仅允许在 `active=true`（主区激活）时运行，避免全屏期间隐藏主播放器介入。
- 方案 2：移除自动封面抓帧中的 `onVideoTimeUpdate(0.1)`，封面保存与播放进度解耦。
- 方案 3：`onTimeUpdate/onSeeked` 增加 `active` 守卫，非激活状态不再回写全局进度。

#### 本项目落地（文件与要点）

- `src/components/VideoMainSection.tsx:647`：自动封面抓帧 effect 增加 `!active` 早退。
- `src/components/VideoMainSection.tsx:670`：删除 `onVideoTimeUpdate(captureAtSec)`，避免抓帧串写播放进度。
- `src/components/VideoMainSection.tsx:980`：`onTimeUpdate/onSeeked` 仅在 `active` 时回写 `onVideoTimeUpdate`。
- `src/components/VideoMainSection.test.tsx:457`：新增回归用例，验证非激活状态不会回写进度、不会触发自动封面抓帧。

#### 验证方式

- 执行：`npx vitest run src/components/VideoMainSection.test.tsx src/features/app/buildFullscreenLayerProps.test.ts`。
- 人工验证：视频模式进入全屏 `dual`，连续播放多条视频，确认不再出现“中途回片首”与“结束后重复当前一次”。

#### 注意事项 / 回归风险

- 该修复刻意禁止“非激活主区”回写视频进度；若未来引入画中画/后台预览，需要单独设计进度同步通道，不能复用当前回写路径。
- 自动封面抓帧不再驱动 `videoTime`，如后续依赖该副作用做其他逻辑（例如 UI 时间戳提示），需改为显式事件而非复用播放进度状态。
