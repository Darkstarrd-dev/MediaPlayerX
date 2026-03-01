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
