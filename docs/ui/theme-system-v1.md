# Theme System V1 规范手册 (SSOT)

> **DEPRECATED**
> Theme System V1 已废弃；请使用 `docs/theme-system-v2.md`。

本文档是 MediaPlayer 主题系统的唯一事实来源。主题开发者应仅依靠本文档和 `src/styles/themes/contract.css` 进行开发。

## 1. 核心原理
- **属性切换**：通过在 `html` 设置 `data-mpx-theme="<themeId>"` 激活主题。
- **纯 CSS 驱动**：新增主题只需在 `src/styles/themes/presets/` 下新增 CSS 文件。
- **预设自动发现**：运行时自动加载 `presets/*.css`；删除某个预设文件不会导致应用启动失败。
- **Token 隔离**：组件层样式只消费 `--mpx-*` token，禁止硬编码视觉值（颜色/尺寸/圆角等）。
- **颜色 + 形态统一**：主题不只控制颜色，也控制按钮体积、图标尺寸、滚动条、滑块等交互原件。

## 2. 文件结构
- `src/styles/themes/contract.css`：token 契约与默认值
- `src/styles/themes/index.css`：主题入口（导入契约）
- `src/features/theme/themeRegistry.ts`：预设自动发现与主题兜底解析
- `src/styles/themes/presets/*.css`：主题预设
- `src/styles/themes/presets/_template.css`：新主题模板

## 3. 开发流程
1. 在 `src/styles/themes/presets/` 创建 `my-theme.css`。
2. 定义作用域并填充 token：

```css
:root[data-mpx-theme="my-theme"] {
  color-scheme: dark; /* 或 light */
  /* 按契约覆盖 token */
}
```

3. 在设置面板选择该主题，检查颜色与控件形态是否一致。

注：若历史持久化中的 `themeId` 对应预设已被删除，系统会自动回退到当前可用列表中的第一个主题（或默认主题），不报错。

### 3.1 Theme Playground
- 页面文件：`docs/ui/theme-playground.html`
- 作用：集中展示当前主题系统涉及的控件与状态（按钮/输入/checkbox/range/滚动条/视频占位/全屏等）。
- 用法：打开 HTML，输入 theme id 并应用，然后编辑 `src/styles/themes/presets/*.css`，刷新页面观察效果。

### 3.2 Theme 开发最小素材
仅依赖以下三者即可生成主题（不需要读取其它文件）：
- `docs/ui/theme-system-v1.md`
- `src/styles/themes/presets/_template.css`
- `docs/ui/theme-playground.html`

## 4. Token 分层

### A. Foundations（基础）
- 字体：`--mpx-font-ui`、`--mpx-font-mono`
- 圆角：`--mpx-radius-sm` / `md` / `lg` / `xl` / `pill`
- 阴影：`--mpx-shadow-panel`、`--mpx-shadow-popover`
- 面板维度：`--mpx-panel-head-height`

### B. Non-Color Style（非颜色样式）
- 控件尺寸：`--mpx-control-height`、`--mpx-control-padding-x`
- 控件形态：`--mpx-control-radius`、`--mpx-control-border-width`
- 控件字重：`--mpx-control-font-weight`
- 图标规格：`--mpx-icon-button-size`、`--mpx-icon-size`
- 滚动条：`--mpx-scrollbar-size`、`--mpx-scrollbar-radius`、`--mpx-scrollbar-track-bg`、`--mpx-scrollbar-thumb-bg`、`--mpx-scrollbar-thumb-hover-bg`
- 滑块：`--mpx-range-track-height`、`--mpx-range-track-bg`、`--mpx-range-thumb-size`、`--mpx-range-thumb-bg`、`--mpx-range-thumb-border`
- 复选框：`--mpx-checkbox-size`、`--mpx-checkbox-radius`、`--mpx-checkbox-bg`、`--mpx-checkbox-border`、`--mpx-checkbox-check`、`--mpx-checkbox-checked-bg`、`--mpx-checkbox-checked-border`

### C. Semantic Colors（语义颜色）
- Surfaces：`--mpx-bg-app`、`--mpx-bg-workspace`、`--mpx-bg-panel`、`--mpx-bg-elevated`、`--mpx-bg-hover`、`--mpx-bg-selected`、`--mpx-bg-muted`、`--mpx-bg-tooltip`
- Text：`--mpx-text-1`、`--mpx-text-2`、`--mpx-text-3`、`--mpx-text-heading`、`--mpx-text-inverse`
- Borders：`--mpx-border-1`、`--mpx-border-2`、`--mpx-border-focus`
- Accent：`--mpx-accent`、`--mpx-accent-contrast`、`--mpx-accent-soft`
- Status：`danger|warning|info|success|busy|idle` 的 `bg/border/text`
- Form：`--mpx-input-*`、`--mpx-btn-primary-*`、`--mpx-btn-secondary-*`

### D. Component Aliases（组件别名）
- `--mpx-header-bg`
- `--mpx-sidebar-bullet-pending` / `--mpx-sidebar-bullet-running`
- `--mpx-splitter-track-bg` / `--mpx-splitter-handle-bg` / `--mpx-splitter-handle-hover-bg`
- `--mpx-card-focus-ring`
- `--mpx-fullscreen-bg` / `--mpx-fullscreen-footer-bg`
- `--mpx-video-screen-bg` / `--mpx-video-empty-bg` / `--mpx-video-empty-text`

## 5. 组件映射表（重点）
- 头部按钮（检索/设置/缩放按钮）-> `--mpx-control-*` + `--mpx-btn-secondary-*`
- 向量检索与特征检索操作按钮 -> `--mpx-control-*` + `--mpx-btn-secondary-*`
- 特征查询输入框 -> `--mpx-control-*` + `--mpx-input-*`
- 侧栏/工具栏图标按钮 -> `--mpx-icon-button-size`、`--mpx-icon-size`
- 通用滚动容器 -> `--mpx-scrollbar-*`
- range 控件（阈值/播放进度/音量）-> `--mpx-range-*`
- select/option -> `--mpx-input-bg`、`--mpx-input-text`
- checkbox（布局锁定/播放列表勾选）-> `--mpx-checkbox-*`
- 视频无源占位（无可用视频源）-> `--mpx-video-empty-bg`、`--mpx-video-empty-text`

## 6. 新主题最小 token 集（建议首版必须覆盖）
- `--mpx-bg-app`、`--mpx-bg-panel`、`--mpx-bg-elevated`
- `--mpx-text-1`、`--mpx-text-2`、`--mpx-text-heading`
- `--mpx-border-1`、`--mpx-border-2`、`--mpx-border-focus`
- `--mpx-accent`、`--mpx-accent-soft`、`--mpx-accent-contrast`
- `--mpx-input-bg`、`--mpx-input-border`、`--mpx-input-text`、`--mpx-input-focus-border`
- `--mpx-btn-primary-bg`、`--mpx-btn-primary-text`、`--mpx-btn-secondary-bg`、`--mpx-btn-secondary-border`、`--mpx-btn-secondary-text`
- `--mpx-control-radius`、`--mpx-control-height`、`--mpx-control-font-weight`
- `--mpx-icon-button-size`、`--mpx-icon-size`
- `--mpx-scrollbar-track-bg`、`--mpx-scrollbar-thumb-bg`、`--mpx-scrollbar-thumb-hover-bg`
- `--mpx-range-track-bg`、`--mpx-range-thumb-bg`
- `--mpx-checkbox-bg`、`--mpx-checkbox-border`、`--mpx-checkbox-check`、`--mpx-checkbox-checked-bg`
- `--mpx-video-empty-bg`、`--mpx-video-empty-text`

## 7. 视觉 QA 清单
- [ ] 所有 banner（error/warning/task）文字与背景达到 WCAG AA。
- [ ] 主/次文本在 panel、elevated、muted 背景上可读。
- [ ] 头部与检索区按钮在默认/hover/active/disabled 都有清晰状态。
- [ ] 特征查询输入框 focus 态可感知，且不刺眼。
- [ ] select 与 option 的前景/背景对比稳定（浅色与深色主题均成立）。
- [ ] 滚动条（track/thumb/hover）与主题风格一致，不遮挡内容。
- [ ] range 滑块轨道与圆点在深浅背景都可定位。
- [ ] checkbox 未选中/选中/聚焦态与主题一致。
- [ ] 视频无源占位（无可用视频源）背景与文本可读。
- [ ] 缩略图与检索容器无明显滚动条闪烁，滚轮/触控板仍可滚动。
- [ ] 图标按钮尺寸、字重、密度与整体风格一致。

## 8. 当前预设主题
- 预设主题以 `src/styles/themes/presets/*.css`（排除 `_template.css`）为准。
- 当前目录示例：`aurora-sand`、`catppuccin-mocha`、`dracula-dark`、`geist-light`、`github-dimmed`、`gruvbox-dark`、`linear-dark`、`nord-dark`、`rose-pine`、`solarized-dark`、`tokyo-night`。
