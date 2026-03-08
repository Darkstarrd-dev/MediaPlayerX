# Theme System V2 规范手册 (SSOT)

本文档是 MediaPlayer 主题系统的唯一事实来源。主题开发者（包括 AI）应仅依靠本文档即可理解系统架构、当前应用布局，并生成完整的 Style 或 Palette 预设。

---

## 1. 核心原理

### 1.1 二维模型

主题由两个独立维度组成：

```
用户选择 = Style（视觉风格） × Palette（配色方案）
```

- **Style**：控制容器几何形态、间距、阴影、模糊、动效、控件交互效果。不包含任何具体颜色值。
- **Palette**：控制所有颜色 token（背景、文本、边框、强调色、状态色）。不包含任何布局/效果属性。

两者通过 HTML 属性独立激活：

```html
<html data-mpx-style="liquid-glass" data-mpx-palette="ocean-blue">
```

### 1.2 CSS 级联顺序

```
contract.css          → :root               → 全量 token 默认值
palettes/<name>.css   → :root[data-mpx-palette="x"]  → 颜色覆盖 + 原始色导出
styles/<name>.css     → :root[data-mpx-style="x"]    → 布局效果 + 效果感知色派生
```

**style 后于 palette 加载**，因此 style 可通过 `color-mix()` 读取 palette 导出的原始色，派生出半透明、渐变等效果感知色（如毛玻璃面板背景）。

### 1.3 纯 CSS 驱动

- 新增 style/palette 只需在对应目录下新增 CSS 文件，无需改 JS。
- 运行时自动发现（`import.meta.glob`）。
- 文件名即 ID，`_` 前缀文件会被排除（用于模板）。

### 1.4 Token 隔离

组件层样式只消费 `--mpx-*` token，禁止硬编码视觉值（颜色、尺寸、圆角、阴影等）。

### 1.5 Slot 治理（新增）

Theme 系统现在与稳定槽位治理绑定，必须同时遵循：

- `docs/10-ui_definition.md`：稳定路径 + 当前实现锚点 + 拟定唯一标识（`data-slot`）
- `docs/11-token_design.md`：稳定路径 -> `--mpx-slot-*` 前缀映射

强约束：新增/修改/删除 UI 槽位时，代码与两张表必须同步更新，不允许只改其中一处。

校验命令：

```bash
npm run theme:verify:slots
```

该命令会同时检查：

1. `ui_definition` 与 `token_design` 的稳定路径是否一一对应
2. token 前缀是否符合 `--mpx-slot-<stable-path-kebab>-*`
3. `ui_definition` 中拟定的 `data-slot` 是否已在 `src/` 与 `electron/` 出现
4. 源码中的 `data-slot` 是否存在未登记项

### 1.6 soft-skeuomorphic 拆分维护约束（新增）

`soft-skeuomorphic` 已按职责拆分，禁止把规则回灌到单一大文件。新增/修改样式时必须落到对应文件：

- `src/styles/themes/styles/soft-skeuomorphic.css`：基础 token 与少量全局骨架（不放具体组件大段 override）
- `src/styles/themes/styles/soft-skeuomorphic.components.css`：通用组件视觉（sidebar/main/metadata 等）
- `src/styles/themes/styles/soft-skeuomorphic.main-transport.css`：非全屏播放器中间组
- `src/styles/themes/styles/soft-skeuomorphic.fullscreen-transport.css`：全屏 transport（video/music/image）
- `src/styles/themes/styles/soft-skeuomorphic.fullscreen-shell.css`：全屏 left/right 组与 popover trigger 壳层态
- `src/styles/themes/styles/soft-skeuomorphic.runway.css`：runway/range（轨道、thumb、webkit/moz）
- `src/styles/themes/styles/soft-skeuomorphic.image-grid.css`：image-grid/manage 选中态与 halo

强约束：

1. 全屏 transport（尤其 `16/40/20` 与 image/video/music 对齐规则）只允许在 `soft-skeuomorphic.fullscreen-transport.css` 维护。
2. 非全屏 transport 只允许在 `soft-skeuomorphic.main-transport.css` 维护。
3. 调整 `fg-main-content-*` 三模式容器（image/video/music）时，优先修改 `soft-skeuomorphic.components.css` 的 slot 规则，避免各模式分叉。

---

## 2. 文件结构

```
src/styles/themes/
  contract.css                    # 全量 token 默认值（SSOT）
  index.css                       # 主题入口（导入 contract + palettes + styles）

  styles/                         # Style 预设
    _flush.css                    # 默认风格（flush，无间距无圆角）
    _style-template.css           # Style 开发模板
    liquid-glass.css              # 示例：毛玻璃
    neobrutalism.css              # 示例：新野蛮主义
    soft-skeuomorphic.css         # soft-skeuomorphic 基础 token/骨架
    soft-skeuomorphic.components.css         # soft-skeuomorphic 通用组件样式
    soft-skeuomorphic.main-transport.css     # 非全屏 transport
    soft-skeuomorphic.fullscreen-transport.css # 全屏 transport
    soft-skeuomorphic.fullscreen-shell.css   # 全屏壳层 left/right + trigger
    soft-skeuomorphic.runway.css             # runway/range 轨道与 thumb
    soft-skeuomorphic.image-grid.css         # image-grid/manage 专项

  palettes/                       # Palette 预设
    _palette-template.css         # Palette 开发模板
    parchment.css                 # 默认配色
    tokyo-night.css
    rose-pine.css
    catppuccin-mocha.css
    ... (其他迁移自 presets/ 的配色)

  presets/                        # 旧格式（向后兼容，不再新增）
    _template.css
    tokyo-night.css
    ...

src/features/theme/
  themeRegistry.ts                # 预设发现、ID 解析、列表导出
```

### 开发最小素材

仅依赖以下即可开发 Style 或 Palette（不需要读取其它代码文件）：

- 本文档 (`docs/08-theme-system-v2.md`)
- `src/styles/themes/styles/_style-template.css`（Style 模板）
- `src/styles/themes/palettes/_palette-template.css`（Palette 模板）
- `src/styles/themes/styles/liquid-glass.css`（Style 参考实现）
- `src/styles/themes/styles/neobrutalism.css`（Style 参考实现）
- `src/styles/themes/palettes/ocean-blue.css`（Palette 参考实现）
- `src/styles/themes/palettes/parchment.css`（默认 Palette 对照）
- `docs/ui/theme-playground.html`（可视化验证）

---

## 3. 当前应用布局结构

> 以下是 AI 生成主题时必须理解的应用视觉结构。

### 3.1 整体布局树

```
html                                        data-mpx-style / data-mpx-palette
└─ body                                     background: var(--mpx-bg-body)
   └─ #root
      └─ div.app                            100vw × 100vh, flex column
         ├─ header.app-header               Header 横栏
         │    ├─ .header-left               Logo + 任务按钮 + 调色板切换 + 设置 + 模式切换 + 检索/管理开关
         │    └─ .header-right              Theme 参数按钮 + 帮助 + 窗口控制
         │
         ├─ section.backend-error-banner    后端错误横幅（按需出现）
         ├─ section.runtime-warning-banner  运行时能力警告横幅（按需出现）
         ├─ section.import-task-panel       导入任务横幅（按需出现）
         │
         └─ div.app-body                    flex row, padding: var(--mpx-layout-padding)
              ├─ aside.sidebar              flex column, 可折叠
              │    ├─ .sidebar-header         标题 + 操作按钮
              │    └─ .sidebar-tree         目录/文件节点列表
              │
              ├─ div.sidebar-splitter       宽度: var(--mpx-splitter-width), 可拖动
              │
              └─ section.workspace          flex column
                    └─ div.workspace-body    flex row
                         ├─ main.main-pane   flex column
                         │    ├─ .main-header             工具栏（普通/管理/元数据管理）
                         │    ├─ .image-grid               缩略图网格 (grid)
                         │    │   └─ .thumb-card ×N        缩略图卡片
                         │    ├─ .name-list                纯文件名列表视图
                         │    ├─ .video-preview            视频预览区
                         │    └─ footer.main-footer        focus 项详情 + 右侧分页控件
                         │
                         ├─ div.metadata-splitter          宽度: var(--mpx-splitter-width)
                         │
                         └─ aside.metadata-panel           flex column
                              ├─ .metadata-header            标题 + 图标按钮
                              ├─ .metadata-content         图包元数据编辑
                              ├─ .metadata-content-focus   图片预览 + caption
                              ├─ .metadata-video-content   视频信息/播放列表
                              ├─ .metadata-search-section  检索筛选区（search mode）
                              └─ .metadata-ad-review-section AI 审核区（manage mode）
```

### 3.2 叠层（Overlay）

以下叠层覆盖在主布局之上，有独立的 z-index：

| 叠层 | Class | 层级 | 布局 |
|------|-------|------|------|
| 全屏模式 | `.fullscreen-layer` | z-index: 20 | fixed inset:0, 独立背景色 |
| 设置面板 | `.settings-mask` + `.settings-panel` | z-index: 30 | fixed inset:0, 居中 80% |
| 特征 Tag 选择器 | `.feature-tag-modal-overlay` | z-index: 2400 | fixed inset:0, 模态层 |
| 浮层对话框 | `.settings-floating-mask` + `.settings-floating-panel` | z-index: 8 | 快捷键录入/危险确认 |
| 拖拽叠加 | `.drop-overlay` | z-index: 12 | fixed inset:0, 半透明 |
| 元数据抓取面板 | `.settings-mask` + `.metadata-fetch-panel` | z-index: 30 | 设置容器内的大尺寸模态 |

### 3.3 面板间空间关系

默认 flush 风格下，所有面板边缘紧贴（无间距），通过 `border` 分界：

```
┌──────────────────────────────────────────────────────┐
│  Header (border-bottom)                              │
├────────┬──┬──────────────────────┬──┬────────────────┤
│Sidebar │SP│  Main Pane           │SP│ Metadata Panel │
│        │  │  ┌────────────────┐  │  │                │
│        │  │  │ Image Grid     │  │  │                │
│        │  │  │ ┌──┐ ┌──┐ ┌──┐│  │  │                │
│        │  │  │ │  │ │  │ │  ││  │  │                │
│        │  │  │ └──┘ └──┘ └──┘│  │  │                │
│        │  │  └────────────────┘  │  │                │
│        │  │  Footer              │  │                │
└────────┴──┴──────────────────────┴──┴────────────────┘
  SP = Splitter (8px, 可拖动)
```

gapped/liquid 风格下，面板有间距和圆角：

```
┌────────────────────────────────────────────────────┐
│ body background visible                            │
│  ╭──────────────────────────────────────────────╮  │
│  │  Header (rounded, shadow, margin)            │  │
│  ╰──────────────────────────────────────────────╯  │
│                                                    │
│  ╭────────╮   ╭──────────────────╮   ╭──────────╮ │
│  │Sidebar │   │  Main Pane       │   │ Metadata │ │
│  │        │   │  ╭──────────────╮│   │  Panel   │ │
│  │        │   │  │ Image Grid   ││   │          │ │
│  │        │   │  ╰──────────────╯│   │          │ │
│  ╰────────╯   ╰──────────────────╯   ╰──────────╯ │
│     ↕ splitter-width (transparent, draggable)      │
└────────────────────────────────────────────────────┘
```

### 3.4 Header 按钮渲染模式

- Header 按钮统一渲染为双层结构：
  - `.header-btn-icon`
  - `.header-btn-label`
- Theme 通过 token 决定显示策略：
  - 文字优先：`--mpx-header-btn-icon-display: none` + `--mpx-header-btn-label-display: inline`
  - 图标优先：`--mpx-header-btn-icon-display: inline-flex` + `--mpx-header-btn-label-display: none`
- 按钮大小、圆角、内边距、阴影由 `--mpx-header-btn-*` token 驱动，不在组件里硬编码。
- 无论图标/文字模式，按钮可访问名称由 `aria-label` 保证，禁止因 icon-only 失去可访问语义。

---

## 4. Token 完整参考

### A. Foundations — 字体与基础圆角

| Token | 默认值 | 说明 |
|-------|--------|------|
| `--mpx-font-ui` | `'Segoe UI', 'PingFang SC', ...` | UI 字体栈 |
| `--mpx-font-mono` | `'Consolas', 'Monaco', ...` | 等宽字体栈 |
| `--mpx-radius-sm` | `4px` | 小圆角 |
| `--mpx-radius-md` | `8px` | 中圆角 |
| `--mpx-radius-lg` | `10px` | 大圆角 |
| `--mpx-radius-xl` | `14px` | 特大圆角 |
| `--mpx-radius-pill` | `9999px` | 胶囊圆角 |
| `--mpx-panel-head-height` | `54px` | 面板头部高度 |

### B. Non-Color Style — 控件尺寸与形态

| Token | 默认值 | 说明 |
|-------|--------|------|
| `--mpx-control-radius` | `8px` | 按钮/输入框圆角 |
| `--mpx-control-border-width` | `1px` | 按钮/输入框边框宽 |
| `--mpx-control-height` | `34px` | 按钮/输入框最小高度 |
| `--mpx-control-padding-x` | `9px` | 按钮/输入框水平内边距 |
| `--mpx-control-font-weight` | `600` | 按钮字重 |
| `--mpx-icon-button-size` | `34px` | 图标按钮尺寸 |
| `--mpx-icon-size` | `17px` | 图标字号 |
| `--mpx-header-btn-icon-display` | `none` | Header 按钮图标显示（`none`/`inline-flex`） |
| `--mpx-header-btn-label-display` | `inline` | Header 按钮文字显示（`none`/`inline`） |
| `--mpx-header-btn-gap` | `6px` | Header 按钮图标与文字间距 |
| `--mpx-header-btn-size` | `var(--mpx-control-height)` | Header 按钮尺寸（高/最小宽） |
| `--mpx-header-btn-radius` | `var(--mpx-control-radius)` | Header 按钮圆角 |
| `--mpx-header-btn-padding-x` | `calc(var(--mpx-control-padding-x) + 4px)` | Header 按钮水平内边距 |
| `--mpx-header-icon-size` | `var(--mpx-icon-size)` | Header 图标尺寸 |
| `--mpx-header-btn-shadow` | `none` | Header 按钮基础阴影 |
| `--mpx-header-btn-hover-shadow` | `none` | Header 按钮 hover 阴影 |
| `--mpx-header-btn-active-shadow` | `none` | Header 按钮 active 阴影 |
| `--mpx-header-btn-active-border` | `var(--mpx-accent)` | Header 按钮激活边框色 |
| `--mpx-tooltip-radius` | `var(--mpx-radius-md)` | Tooltip 圆角 |
| `--mpx-tooltip-padding-x` | `10px` | Tooltip 水平内边距 |
| `--mpx-tooltip-padding-y` | `6px` | Tooltip 垂直内边距 |
| `--mpx-tooltip-font-size` | `12px` | Tooltip 字号 |
| `--mpx-tooltip-max-width` | `320px` | Tooltip 最大宽度 |
| `--mpx-tooltip-offset` | `10px` | Tooltip 与目标间距 |
| `--mpx-tooltip-viewport-padding` | `8px` | Tooltip 视口安全边距 |
| `--mpx-tooltip-shadow` | `var(--mpx-shadow-popover)` | Tooltip 阴影 |
| `--mpx-help-overlay-mask-opacity` | `18%` | 按钮说明覆盖层遮罩透明度 |
| `--mpx-help-overlay-hint-top` | `12px` | 按钮说明提示条顶部偏移 |
| `--mpx-help-overlay-top-reserved` | `48px` | 按钮说明标签顶部保留区 |
| `--mpx-help-overlay-tag-max-width` | `240px` | 按钮说明标签最大宽度 |
| `--mpx-help-overlay-tag-gap` | `8px` | 按钮说明标签与目标/标签间距 |
| `--mpx-scrollbar-size` | `10px` | 滚动条粗细 |
| `--mpx-scrollbar-radius` | `999px` | 滚动条圆角 |
| `--mpx-range-track-height` | `6px` | 滑条轨道高度 |
| `--mpx-range-thumb-size` | `14px` | 滑条滑块尺寸 |
| `--mpx-checkbox-size` | `16px` | 复选框尺寸 |
| `--mpx-checkbox-radius` | `4px` | 复选框圆角 |

### C. Semantic Colors — 语义颜色

#### Surfaces（背景面）

| Token | 默认值 | 用途 |
|-------|--------|------|
| `--mpx-bg-app` | `#f2eee7` | 应用最底层背景 |
| `--mpx-bg-workspace` | `#f3f0ea` | 工作区背景 |
| `--mpx-bg-panel` | `#fbf8f3` | 面板默认背景 |
| `--mpx-bg-elevated` | `#ffffff` | 抬升面（弹出/卡片） |
| `--mpx-bg-hover` | `rgba(46,111,127,.06)` | 悬停背景 |
| `--mpx-bg-selected` | `#e6f1f4` | 选中背景 |
| `--mpx-bg-muted` | `#f9f6ef` | 低调背景 |
| `--mpx-bg-tooltip` | `rgba(0,0,0,.85)` | 工具提示背景 |

#### Text（文本）

| Token | 默认值 | 用途 |
|-------|--------|------|
| `--mpx-text-1` | `#2e2a22` | 主文本 |
| `--mpx-text-2` | `#6a6358` | 次要文本 |
| `--mpx-text-3` | `#9f937f` | 三级文本 |
| `--mpx-text-heading` | `#1a1814` | 标题文本 |
| `--mpx-text-inverse` | `#ffffff` | 反色文本 |

#### Borders（边框）

| Token | 默认值 | 用途 |
|-------|--------|------|
| `--mpx-border-1` | `#d6cfc1` | 主边框 |
| `--mpx-border-2` | `#b7ab95` | 加强边框 |
| `--mpx-border-focus` | `#2e6f7f` | 聚焦边框 |

#### Accent（强调色）

| Token | 默认值 | 用途 |
|-------|--------|------|
| `--mpx-accent` | `#2e6f7f` | 强调色 |
| `--mpx-accent-contrast` | `#ffffff` | 强调色上的前景 |
| `--mpx-accent-soft` | `#dcecf0` | 淡强调色背景 |

#### Input（输入控件）

| Token | 默认值 | 用途 |
|-------|--------|------|
| `--mpx-input-bg` | `#ffffff` | 输入框背景 |
| `--mpx-input-border` | `#d6cfc1` | 输入框边框 |
| `--mpx-input-text` | `#2e2a22` | 输入框文本 |
| `--mpx-input-focus-bg` | `#ffffff` | 聚焦态背景 |
| `--mpx-input-focus-border` | `#2e6f7f` | 聚焦态边框 |
| `--mpx-input-readonly-bg` | `#f8f5ef` | 只读背景 |
| `--mpx-input-readonly-text` | `#6b6356` | 只读文本 |
| `--mpx-input-readonly-border` | `#d6cfc1` | 只读边框 |

#### Button（按钮）

| Token | 默认值 | 用途 |
|-------|--------|------|
| `--mpx-btn-primary-bg` | `#2e6f7f` | 主按钮背景 |
| `--mpx-btn-primary-text` | `#ffffff` | 主按钮文本 |
| `--mpx-btn-secondary-bg` | `#ffffff` | 次按钮背景 |
| `--mpx-btn-secondary-border` | `#b7ab95` | 次按钮边框 |
| `--mpx-btn-secondary-text` | `#2e2a22` | 次按钮文本 |

#### Status（状态色，6 组 × 3 = 18 个）

每组包含 `bg` / `border` / `text`：
- `--mpx-status-danger-*`
- `--mpx-status-warning-*`
- `--mpx-status-info-*`
- `--mpx-status-success-*`
- `--mpx-status-busy-*`
- `--mpx-status-idle-*`

#### Shadow（阴影）

| Token | 默认值 | 用途 |
|-------|--------|------|
| `--mpx-shadow-panel` | `0 10px 26px rgba(60,48,30,.14)` | 面板投影 |
| `--mpx-shadow-popover` | `0 8px 20px rgba(0,0,0,.12)` | 弹出投影 |

#### Scrollbar / Range / Checkbox 颜色

| Token | 说明 |
|-------|------|
| `--mpx-scrollbar-track-bg` | 滚动条轨道背景 |
| `--mpx-scrollbar-thumb-bg` | 滚动条滑块背景 |
| `--mpx-scrollbar-thumb-hover-bg` | 滚动条滑块悬停 |
| `--mpx-range-track-bg` | 滑条轨道背景 |
| `--mpx-range-thumb-bg` | 滑条滑块背景 |
| `--mpx-range-thumb-border` | 滑条滑块边框 |
| `--mpx-checkbox-bg` | 复选框背景 |
| `--mpx-checkbox-border` | 复选框边框 |
| `--mpx-checkbox-check` | 对勾颜色 |
| `--mpx-checkbox-checked-bg` | 选中态背景 |
| `--mpx-checkbox-checked-border` | 选中态边框 |

### D. Component Aliases — 组件别名（颜色类）

| Token | 默认值 | 用途 |
|-------|--------|------|
| `--mpx-header-bg` | `linear-gradient(...)` | Header 背景 |
| `--mpx-header-border` | `var(--mpx-border-1)` | Header 底部边框色 |
| `--mpx-sidebar-bullet-pending` | `#94a3ad` | Sidebar pending 圆点 |
| `--mpx-sidebar-bullet-running` | `#2fb36e` | Sidebar running 圆点 |
| `--mpx-splitter-track-bg` | `linear-gradient(...)` | 分割条轨道背景 |
| `--mpx-splitter-handle-bg` | `rgba(...)` | 分割条手柄色 |
| `--mpx-splitter-handle-hover-bg` | `rgba(...)` | 分割条手柄悬停色 |
| `--mpx-card-focus-ring` | `rgba(...)` | 卡片聚焦环 |
| `--mpx-fullscreen-bg` | `#060708` | 全屏背景 |
| `--mpx-fullscreen-footer-bg` | `rgba(...)` | 全屏 Footer 背景 |
| `--mpx-video-screen-bg` | `linear-gradient(...)` | 视频播放区背景 |
| `--mpx-video-empty-bg` | `var(--mpx-video-screen-bg)` | 视频空态背景 |
| `--mpx-video-empty-text` | `var(--mpx-text-inverse)` | 视频空态文本 |
| `--mpx-player-surface-bg` | `rgba(...)` | 播放器控制条背景（固定深色半透明） |
| `--mpx-player-surface-border` | `rgba(...)` | 播放器控制条边框 |
| `--mpx-player-surface-text` | `#...` | 播放器控制条主文本 |
| `--mpx-player-surface-text-muted` | `rgba(...)` | 播放器控制条弱文本 |
| `--mpx-player-hud-bg` | `rgba(...)` | 视频 HUD 背景 |
| `--mpx-player-hud-border` | `rgba(...)` | 视频 HUD 边框 |
| `--mpx-player-hud-text` | `#...` | 视频 HUD 文本 |
| `--mpx-player-btn-bg` | `rgba(...)` | 播放器按钮背景 |
| `--mpx-player-btn-border` | `rgba(...)` | 播放器按钮边框 |
| `--mpx-player-btn-text` | `#...` | 播放器按钮文本 |
| `--mpx-player-btn-hover-bg` | `rgba(...)` | 播放器按钮 hover 背景 |
| `--mpx-player-btn-active-bg` | `rgba(...)` | 播放器按钮 active 背景 |
| `--mpx-player-btn-active-border` | `rgba(...)` | 播放器按钮 active 边框 |
| `--mpx-player-btn-muted-text` | `rgba(...)` | 播放器按钮禁用文本 |

### E. Layout Structure — 布局结构（Style 控制）

#### 全局布局

| Token | 默认值 | 说明 |
|-------|--------|------|
| `--mpx-layout-gap-unit` | `1vw` | 统一边距基准单位（按窗口宽度 `1%`） |
| `--mpx-layout-gap-scale` | `1` | 容器边距系数（运行时可调，`0~3`） |
| `--mpx-pane-inner-gap-scale` | `1` | 容器内边距系数（运行时可调，`0~2`） |
| `--mpx-pane-stack-gap-scale` | `1` | 容器内上中下间距系数（运行时可调，`0~2`） |
| `--mpx-sidebar-inner-gap-scale` | `1` | Sidebar 内边距系数（运行时可调，`0~2`） |
| `--mpx-thumbnail-gap-scale` | `1` | 缩略图间距系数（运行时可调，`0~2`） |
| `--mpx-button-group-inset-scale` | `1` | 按钮组边距系数（运行时可调，`0~2`） |
| `--mpx-layout-gap-px` | `0px` | 运行时四舍五入后的统一边距像素值 |
| `--mpx-pane-inner-padding-px` | `10px` | 运行时四舍五入后的统一内边距像素值 |
| `--mpx-pane-stack-gap-px` | `8px` | 运行时四舍五入后的统一上中下间距像素值 |
| `--mpx-pane-section-gap-px` | `8px` | 运行时四舍五入后的容器分段间距像素值 |
| `--mpx-pane-recessed-padding-px` | `3px` | 运行时四舍五入后的凹槽内边距（`inner/3`） |
| `--mpx-sidebar-gap-px` | `8px` | 运行时四舍五入后的 Sidebar 内边距像素值 |
| `--mpx-thumbnail-gap-px` | `8px` | 运行时四舍五入后的缩略图间距像素值 |
| `--mpx-button-group-inset-px` | `2px` | 运行时四舍五入后的按钮组边距像素值 |
| `--mpx-layout-padding` | `0px` | app-body 外围 padding，非零时可见 body 背景 |
| `--mpx-splitter-width` | `8px` | 分割条宽度（即面板间距） |
| `--mpx-pane-frame-padding` | `var(--mpx-pane-inner-padding-px, var(--mpx-panel-padding))` | 三栏统一外框内边距（Sidebar/Main/Metadata） |
| `--mpx-pane-stack-gap` | `var(--mpx-pane-stack-gap-px, 8px)` | 三栏 `toolbar-main-footer` 的统一纵向节奏 |
| `--mpx-bg-body` | `radial-gradient(...)` | body 元素完整背景值 |

#### 面板共享基底

| Token | 默认值 | 说明 |
|-------|--------|------|
| `--mpx-panel-radius` | `0px` | 面板圆角 |
| `--mpx-panel-border-width` | `1px` | 面板边框宽 |
| `--mpx-panel-border-style` | `solid` | 面板边框样式 |
| `--mpx-panel-shadow` | `none` | 面板阴影 |
| `--mpx-panel-backdrop-filter` | `none` | 面板背景滤镜 |
| `--mpx-panel-transform` | `none` | 面板变换（含非平衡设计） |
| `--mpx-panel-transition` | `none` | 面板过渡动画 |
| `--mpx-panel-padding` | `10px` | 面板内部 padding |

#### 面板独立覆写

每个面板有 9 个 token，默认继承对应的 `--mpx-panel-*`。建议通过 `--mpx-pane-frame-padding` 统一三栏 padding：

**Sidebar**：`--mpx-sidebar-{radius, border-width, border-style, shadow, backdrop-filter, transform, transition, padding, bg}`

**Main**：`--mpx-main-{radius, border-width, border-style, shadow, backdrop-filter, transform, transition, padding, bg}`

**Metadata**：`--mpx-metadata-{radius, border-width, border-style, shadow, backdrop-filter, transform, transition, padding, bg}`

简单主题只需设 `--mpx-panel-*` 基底。需要差异化时覆写具体面板的 token。

#### Header 独立

| Token | 默认值 | 说明 |
|-------|--------|------|
| `--mpx-header-radius` | `0px` | Header 圆角 |
| `--mpx-header-shadow` | `none` | Header 阴影 |
| `--mpx-header-floating-gap` | `0px` | Header 浮动间距；属于布局层视觉间隙，不属于单容器 frame transform |
| `--mpx-header-border-width` | `1px` | Header 底部边框宽 |
| `--mpx-header-backdrop-filter` | `none` | Header 背景滤镜 |

#### 内卡统一

| Token | 默认值 | 说明 |
|-------|--------|------|
| `--mpx-card-radius` | `10px` | 内容卡片圆角（image-grid / thumb-card / metadata-edit-grid 等） |
| `--mpx-card-shadow` | `none` | 内容卡片阴影 |
| `--mpx-card-border-width` | `1px` | 内容卡片边框宽 |

#### 级联圆角（Cascading Radius）

为避免“外层圆角变大、内层仍是固定值”造成几何断裂，新增级联半径 token。默认采用方案：

- `inner = outer - (padding * factor)`
- `factor = 0.35`
- `cap = 8px`
- 统一用 `max(0px, calc(...))` 防止负值

| Token | 默认值 | 说明 |
|-------|--------|------|
| `--mpx-radius-cascade-factor` | `0.35` | 内层扣减比例系数 |
| `--mpx-radius-cascade-cap` | `8px` | 内层扣减上限 |
| `--mpx-radius-inset-pane` | `clamp(...)` | 由 pane 内边距推导的扣减量 |
| `--mpx-radius-inset-stack` | `clamp(...)` | 由 pane 上中下间距推导的扣减量 |
| `--mpx-radius-inset-control` | `clamp(...)` | 由控件边框推导的扣减量 |
| `--mpx-radius-sidebar-inner` | `max(...)` | Sidebar 内层基准半径 |
| `--mpx-radius-main-inner` | `max(...)` | Main 内层基准半径 |
| `--mpx-radius-metadata-inner` | `max(...)` | Metadata 内层基准半径 |
| `--mpx-radius-header-inner` | `max(...)` | Header 内层基准半径 |
| `--mpx-radius-sidebar-header-btn` | `min(...)` | Sidebar Header 按钮半径 |
| `--mpx-radius-sidebar-label` | `max(...)` | Sidebar 列表标签半径 |
| `--mpx-radius-main-card` | `min(...)` | Main 内容卡片半径 |
| `--mpx-radius-thumb-media` | `max(...)` | 缩略图媒体内层半径 |
| `--mpx-radius-metadata-control` | `min(...)` | Metadata 控件半径 |
| `--mpx-radius-metadata-card` | `min(...)` | Metadata 卡片半径 |
| `--mpx-radius-header-group` | `max(...)` | Header 组容器半径 |
| `--mpx-radius-header-btn-inner` | `max(...)` | Header 内层按钮半径 |
| `--mpx-radius-overlay-pop` | `min(...)` | overlay/popover 统一半径 |

约束：`0`、`50%`、`999px` 这类语义圆角（无圆角、圆形、胶囊）不纳入级联扣减。

#### 控件视觉效果

| Token | 默认值 | 说明 |
|-------|--------|------|
| `--mpx-control-shadow` | `none` | 按钮/控件投影 |
| `--mpx-control-backdrop-filter` | `none` | 按钮/控件背景滤镜 |
| `--mpx-control-transition` | `0.15s ease` | 按钮/控件过渡 |
| `--mpx-control-hover-transform` | `none` | hover 态变换 |
| `--mpx-control-hover-shadow` | `none` | hover 态阴影 |
| `--mpx-control-hover-backdrop-filter` | `none` | hover 态滤镜 |
| `--mpx-control-active-transform` | `none` | active/pressed 态变换 |
| `--mpx-control-active-shadow` | `none` | active/pressed 态阴影 |

### F. Palette 原始色导出

Palette 文件必须导出以下原始色，供 Style 的 `color-mix()` 派生使用：

| Token | 说明 | 示例 (parchment) |
|-------|------|-----------------|
| `--mpx-palette-surface` | 面板/卡片基底色 | `#fbf8f3` |
| `--mpx-palette-base` | app 背景基底色 | `#f2eee7` |
| `--mpx-palette-accent-raw` | 强调色原始值 | `#2e6f7f` |
| `--mpx-palette-text-raw` | 主文本原始色 | `#2e2a22` |
| `--mpx-palette-shadow-color` | 阴影基色 | `rgba(60,48,30,.15)` |

---

## 5. 开发指南：创建 Palette

### 5.1 流程

1. 在 `src/styles/themes/palettes/` 创建 `<my-palette>.css`。
2. 选择器使用 `:root[data-mpx-palette="<my-palette>"]`。
3. 设置 `color-scheme: dark` 或 `light`。
4. 覆盖全部语义颜色 token（C 层 + D 层）。
5. 导出 5 个原始色（F 层）。
6. 在 theme playground 中选择各 style 验证。

### 5.2 最小必须覆盖 Token

```css
:root[data-mpx-palette="my-palette"] {
  color-scheme: dark; /* 或 light */

  /* F. 原始色导出（必须） */
  --mpx-palette-surface: #...;
  --mpx-palette-base: #...;
  --mpx-palette-accent-raw: #...;
  --mpx-palette-text-raw: #...;
  --mpx-palette-shadow-color: rgba(...);

  /* C. 语义色（必须） */
  --mpx-bg-app: #...;
  --mpx-bg-workspace: #...;
  --mpx-bg-panel: #...;
  --mpx-bg-elevated: #...;
  --mpx-bg-hover: ...;
  --mpx-bg-selected: ...;
  --mpx-bg-muted: #...;
  --mpx-text-1: #...;
  --mpx-text-2: #...;
  --mpx-text-3: #...;
  --mpx-text-heading: #...;
  --mpx-border-1: #...;
  --mpx-border-2: #...;
  --mpx-border-focus: #...;
  --mpx-accent: #...;
  --mpx-accent-soft: ...;
  --mpx-accent-contrast: #...;
  --mpx-input-bg: #...;
  --mpx-input-border: #...;
  --mpx-input-text: #...;
  --mpx-input-focus-bg: #...;
  --mpx-input-focus-border: #...;
  --mpx-btn-primary-bg: #...;
  --mpx-btn-primary-text: #...;
  --mpx-btn-secondary-bg: #...;
  --mpx-btn-secondary-border: #...;
  --mpx-btn-secondary-text: #...;

  /* 状态色 (6 组) */
  --mpx-status-danger-bg: #...;
  --mpx-status-danger-border: #...;
  --mpx-status-danger-text: #...;
  /* ... warning / info / success / busy / idle 同理 */

  /* B. 控件颜色 */
  --mpx-scrollbar-track-bg: #...;
  --mpx-scrollbar-thumb-bg: #...;
  --mpx-scrollbar-thumb-hover-bg: #...;
  --mpx-range-track-bg: #...;
  --mpx-range-thumb-bg: #...;
  --mpx-range-thumb-border: #...;
  --mpx-checkbox-bg: #...;
  --mpx-checkbox-border: #...;
  --mpx-checkbox-check: #...;
  --mpx-checkbox-checked-bg: #...;
  --mpx-checkbox-checked-border: #...;

  /* D. 组件别名（可选但建议） */
  --mpx-header-bg: #...;
  --mpx-shadow-panel: ...;
  --mpx-card-focus-ring: ...;
  --mpx-video-screen-bg: ...;
  --mpx-video-empty-bg: ...;
  --mpx-video-empty-text: ...;

  /* 播放器控件（建议维持固定深色半透明） */
  --mpx-player-surface-bg: ...;
  --mpx-player-surface-border: ...;
  --mpx-player-surface-text: ...;
  --mpx-player-surface-text-muted: ...;
  --mpx-player-hud-bg: ...;
  --mpx-player-hud-border: ...;
  --mpx-player-hud-text: ...;
  --mpx-player-btn-bg: ...;
  --mpx-player-btn-border: ...;
  --mpx-player-btn-text: ...;
  --mpx-player-btn-hover-bg: ...;
  --mpx-player-btn-active-bg: ...;
  --mpx-player-btn-active-border: ...;
  --mpx-player-btn-muted-text: ...;
}
```

### 5.3 禁止事项

- Palette 中**禁止**设置任何 E 层 token（radius / shadow / transform / backdrop-filter / padding / layout 等）。
- Palette 中**禁止**设置 B 层非颜色属性（`--mpx-control-height`、`--mpx-control-radius` 等）。

---

## 6. 开发指南：创建 Style

### 6.1 流程

1. 在 `src/styles/themes/styles/` 创建 `<my-style>.css`。
2. 选择器使用 `:root[data-mpx-style="<my-style>"]`。
3. 覆盖 E 层 layout token。
4. 若风格需要半透明效果，使用 `color-mix()` 从 `--mpx-palette-*` 原始色派生。
5. 在 theme playground 中搭配多种 palette 验证。

### 6.2 Style 文件结构

```css
/* 示例：Liquid Glass Style */
:root[data-mpx-style="liquid-glass"] {

  /* === 全局布局 === */
  --mpx-layout-padding: 12px;
  --mpx-splitter-width: 16px;
  --mpx-bg-body: linear-gradient(
    135deg,
    color-mix(in srgb, var(--mpx-palette-accent-raw) 15%, var(--mpx-palette-base)),
    var(--mpx-palette-base)
  );

  /* === 面板基底 === */
  --mpx-panel-radius: 24px;
  --mpx-panel-border-width: 1px;
  --mpx-panel-border-style: solid;
  --mpx-panel-shadow: 0 8px 32px var(--mpx-palette-shadow-color);
  --mpx-panel-backdrop-filter: blur(20px) saturate(180%);
  --mpx-panel-padding: 14px;

  /* === Header === */
  --mpx-header-radius: 24px;
  --mpx-header-floating-gap: 12px 12px 0;
  --mpx-header-shadow: 0 4px 16px var(--mpx-palette-shadow-color);
  --mpx-header-backdrop-filter: blur(20px) saturate(180%);

  /* === 内卡 === */
  --mpx-card-radius: 16px;
  --mpx-card-shadow: 0 4px 12px var(--mpx-palette-shadow-color);

  /* === 控件效果 === */
  --mpx-control-radius: 100px;
  --mpx-control-shadow: 0 4px 6px var(--mpx-palette-shadow-color);
  --mpx-control-backdrop-filter: blur(10px);
  --mpx-control-transition: all 0.3s ease;
  --mpx-control-hover-transform: scale(1.05);
  --mpx-control-hover-shadow: 0 8px 15px var(--mpx-palette-shadow-color);
  --mpx-control-active-transform: scale(0.97);
  --mpx-control-active-shadow: 0 2px 4px var(--mpx-palette-shadow-color);

  /* === Splitter === */
  --mpx-splitter-track-bg: transparent;
  --mpx-splitter-handle-bg: transparent;
  --mpx-splitter-handle-hover-bg: color-mix(in srgb, var(--mpx-palette-accent-raw) 30%, transparent);

  /* === 效果感知色派生 === */
  --mpx-bg-panel: color-mix(in srgb, var(--mpx-palette-surface) 45%, transparent);
  --mpx-bg-elevated: color-mix(in srgb, var(--mpx-palette-surface) 65%, transparent);
  --mpx-border-1: color-mix(in srgb, var(--mpx-palette-surface) 40%, transparent);
  --mpx-btn-secondary-bg: color-mix(in srgb, var(--mpx-palette-surface) 40%, transparent);
  --mpx-header-bg: color-mix(in srgb, var(--mpx-palette-surface) 45%, transparent);
}
```

### 6.3 Style 中的 `color-mix()` 用法

`color-mix()` 允许 style 从 palette 的原始色派生出效果感知色，无需知道具体颜色值：

```css
/* 将 palette 的 surface 色变为 45% 不透明度 */
--mpx-bg-panel: color-mix(in srgb, var(--mpx-palette-surface) 45%, transparent);
```

这样 **同一个 liquid-glass style** 搭配不同 palette 时，面板背景会自动适配该 palette 的 surface 色。

Chromium 111+ / Electron 当前版本完全支持 `color-mix()`。

### 6.4 Scoped Selector 逃生舱

对 token 无法覆盖的极端定制（如 `image-rendering: pixelated`、特定面板内的按钮差异化），style 文件可使用 scoped CSS 规则。

**约束**：
1. 必须以 `:root[data-mpx-style="<id>"]` 为前缀
2. 禁止覆盖布局核心属性（`display` / `position` / `flex-direction`）
3. 仅使用下方"可安全使用的选择器清单"中列出的 class

**示例**：

```css
/* Retro 风格：缩略图像素化 */
:root[data-mpx-style="retro"] .thumb-media-image {
  image-rendering: pixelated;
}

/* Neobrutalism：sidebar-row active 态特殊效果 */
:root[data-mpx-style="neobrutalism"] .sidebar-row.is-active {
  outline: 2px solid var(--mpx-text-1);
  outline-offset: -2px;
}
```

### 6.5 禁止事项

- Style 中的颜色覆盖**必须**使用 `color-mix()` / `rgba()` 从 `--mpx-palette-*` 原始色派生，**禁止**硬编码颜色字面量（否则搭配其他 palette 会配色冲突）。
- 唯一例外：`transparent`、`none`、`inherit` 等非颜色值可直接使用。

---

## 7. 可安全使用的 CSS 选择器清单

以下 class 名视为半稳定 API，可在 Style 的 scoped selector 中使用。大版本升级时可能变更。

### 容器级

| 选择器 | 描述 |
|--------|------|
| `.app` | 根容器 |
| `.app-header` | Header 横栏 |
| `.backend-error-banner` | 后端错误横幅 |
| `.runtime-warning-banner` | 运行时警告横幅 |
| `.import-task-panel` | 导入任务横幅 |
| `.app-body` | Header 以下的 body 区域 |
| `.sidebar` | Sidebar 面板 |
| `.sidebar-splitter` | Sidebar 分割条 |
| `.workspace` | 工作区（Main + Metadata） |
| `.workspace-body` | Main + Metadata 的水平容器 |
| `.main-pane` | 主内容区 |
| `.metadata-splitter` | Metadata 分割条 |
| `.metadata-panel` | 元数据面板 |
| `.settings-mask` | 全局设置模态遮罩 |
| `.settings-panel` | 设置主面板 |
| `.settings-floating-mask` | 浮层对话框遮罩 |
| `.settings-floating-panel` | 浮层对话框 |
| `.mpx-overlay-merged-stack` | 弹出面板上下拼接容器 |
| `.metadata-fetch-panel` | 元数据抓取面板 |
| `.drop-overlay` | 拖拽导入遮罩 |
| `.fullscreen-layer` | 全屏层 |

### 控件级

| 选择器 | 描述 |
|--------|------|
| `.logo-btn` | Logo 按钮 |
| `.task-status-btn` | 任务状态按钮 |
| `.search-trigger-btn` | 检索/管理开关按钮 |
| `.mode-switch` | 图片/视频模式切换容器 |
| `.mode-switch button` | 模式切换按钮 |
| `.sidebar-header` | Sidebar 头部 |
| `.sidebar-header-icon-btn` | Sidebar 图标按钮 |
| `.sidebar-row` | Sidebar 目录行 |
| `.sidebar-row.is-active` | 当前选中行 |
| `.sidebar-label` | Sidebar 标签文本 |
| `.main-header` | Main 工具栏 |
| `.toolbar-icon-btn` | Main 工具栏图标按钮 |
| `.image-grid` | 缩略图网格 |
| `.thumb-card` | 缩略图卡片 |
| `.thumb-card.is-focused` | 聚焦态卡片 |
| `.thumb-placeholder` | 缩略图占位 |
| `.thumb-media` | 缩略图媒体容器 |
| `.thumb-media-image` | 缩略图 img 元素 |
| `.main-footer-pagination` | Footer 右侧分页控件 |
| `.name-list` | 纯文件名列表 |
| `.name-list-header` | 列表头 |
| `.name-list-row` | 列表行 |
| `.name-list-row.is-focused` | 聚焦态行 |
| `.video-preview` | 视频预览容器 |
| `.video-screen` | 视频播放区 |
| `.video-controls` | 视频控制栏 |
| `.metadata-header` | 元数据头部 |
| `.metadata-header-icon-btn` | 元数据图标按钮 |
| `.metadata-content` | 元数据内容区 |
| `.metadata-search-section` | 元数据内检索筛选区 |
| `.metadata-ad-review-section` | 元数据内 AI 审核区 |
| `.metadata-rating-group` | 评分组件 |
| `.metadata-edit-grid` | 编辑网格 |
| `.meta-tabs` | 元数据页签 |
| `.meta-tabs button` | 页签按钮 |
| `.mpx-overlay-seamless-row` | 一体化输入行容器 |
| `.mpx-overlay-seamless-cell` | 一体化输入行单元 |
| `.mpx-overlay-seamless-btn` | 一体化输入行按钮态 |
| `.mpx-overlay-result-list` | 弹出面板通用结果列表 |
| `.mpx-overlay-field-row` | 弹窗参数行（标签+控件） |
| `.mpx-overlay-list-surface` | 弹窗列表表面容器 |
| `.mpx-overlay-scroll-list` | 弹窗可滚动列表容器 |
| `.mpx-overlay-content-surface` | 弹窗通用内容表面容器 |
| `.mpx-overlay-input` | 弹窗通用输入框样式 |
| `.mpx-overlay-chip-list` | 弹窗标签列表容器 |
| `.mpx-overlay-chip` | 弹窗标签项样式 |
| `.mpx-overlay-chip-btn` | 弹窗胶囊按钮样式 |
| `.mpx-overlay-description` | 弹窗主说明文本 |
| `.mpx-overlay-caption` | 弹窗辅助说明文本 |
| `.mpx-overlay-list-item-truncate` | 弹窗列表单行截断项 |
| `.mpx-overlay-section` | 弹窗分组容器（纵向） |
| `.mpx-overlay-actions` | 弹窗动作区容器 |
| `.mpx-overlay-actions-start` | 弹窗动作区左对齐修饰符 |
| `.mpx-overlay-actions-inline-end` | 弹窗内联动作区右对齐修饰符 |
| `.mpx-overlay-inline-icon-actions` | 弹窗头部紧凑图标动作区 |
| `.mpx-overlay-footer-actions` | 弹窗页脚动作区容器 |
| `.mpx-overlay-footer-btn` | 弹窗页脚按钮样式 |
| `.mpx-overlay-check-row` | 弹窗勾选确认行 |
| `.playlist-item` | 播放列表项 |
| `.manage-confirm-dialog` | 危险操作确认对话框 |
| `.main-footer` | Main 底部信息栏 |

### 状态修饰符

| 修饰符 | 说明 |
|--------|------|
| `.is-active` | 选中/激活态 |
| `.is-focused` | 焦点态 |
| `.is-busy` | 忙碌态 |
| `.is-idle` | 空闲态 |
| `.is-open` | 展开态 |
| `.is-locked` | 锁定态 |
| `.is-running` | 运行中态 |
| `.is-paused` | 暂停态 |
| `.is-review` | 待复核态 |
| `.is-failed` | 失败态 |
| `.is-skeleton` | 骨架屏态 |

---

## 8. 组件 → Token 映射表

> 说明：旧的独立 `search/manage/vector-panel` 模块已下沉，当前主路径为 Metadata 面板中的
> `.metadata-search-section` 与 `.metadata-ad-review-section`。

### 哪些 token 影响哪些组件

| 组件 | 受影响的 token |
|------|---------------|
| Header 横栏 | `--mpx-header-{bg,border,radius,shadow,margin,border-width,backdrop-filter}` |
| 顶部横幅（backend/runtime/import） | `--mpx-status-{danger,warning,info}-{bg,border,text}` + `--mpx-text-*` |
| Sidebar 面板 | `--mpx-sidebar-{bg,radius,border-width,border-style,shadow,backdrop-filter,transform,transition,padding}` |
| Main 面板 | `--mpx-main-{bg,radius,border-width,border-style,shadow,backdrop-filter,transform,transition,padding}` |
| Metadata 面板 | `--mpx-metadata-{bg,radius,border-width,border-style,shadow,backdrop-filter,transform,transition,padding}` |
| Metadata 检索区 | `--mpx-input-*` + `--mpx-btn-secondary-*` + `--mpx-accent*` + `--mpx-text-*` |
| Metadata AI 审核区 | `--mpx-status-{busy,warning,danger}-*` + `--mpx-accent*` + `--mpx-border-*` |
| 元数据抓取面板 | `--mpx-overlay-surface-*` + `--mpx-overlay-soft-*` + `--mpx-input-*` + `--mpx-btn-secondary-*` |
| 侧栏重命名弹窗 | `--mpx-overlay-surface-*` + `--mpx-overlay-soft-*` + `--mpx-text-*` + `--mpx-accent*` |
| 危险确认对话框 | `--mpx-bg-elevated` + `--mpx-status-danger-*` + `--mpx-border-*` + `--mpx-shadow-panel` |
| 分割条 | `--mpx-splitter-{width,track-bg,handle-bg,handle-hover-bg}` |
| 缩略图卡片 | `--mpx-card-{radius,shadow,border-width}` + `--mpx-control-hover-{transform,shadow}` |
| 通用按钮 | `--mpx-control-{radius,border-width,height,padding-x,font-weight,shadow,backdrop-filter,transition}` + hover/active token |
| 输入控件 | `--mpx-input-{bg,border,text,focus-bg,focus-border}` + `--mpx-control-{height,transition}` |
| range 滑条 | `--mpx-range-{track-height,track-bg,thumb-size,thumb-bg,thumb-border}` |
| checkbox | `--mpx-checkbox-{size,radius,bg,border,check,checked-bg,checked-border}` |
| 滚动条 | `--mpx-scrollbar-{size,radius,track-bg,thumb-bg,thumb-hover-bg}` |
| 评分星级 | `--mpx-text-3` (未选) + `--mpx-accent` (选中) |
| 状态 banner | `--mpx-status-{danger,warning,info,success}-{bg,border,text}` |
| 视频/全屏播放器控件 | `--mpx-player-{surface,hud,btn}-*`（固定深色半透明语义） |
| body 背景 | `--mpx-bg-body` |
| 全屏模式 | `--mpx-fullscreen-{bg,footer-bg}` — 不受 style layout token 影响 |
| 拖拽导入遮罩 | `--mpx-bg-tooltip` + `--mpx-accent*` + `--mpx-text-inverse` |

补充约定：大面板布局类 token（如 `--mpx-large-panel-width/height/radius` 与 `head/shell/side/main padding`）统一先由全局语义 token 提供，再由单面板 `*-current` 覆盖链消费；禁止在个例面板类上直接硬写 `--mpx-large-panel-*` 破坏统一调节入口。

---

## 9. 视觉 QA 清单

开发完 style 或 palette 后，逐项检查：

### 配色验证（Palette）

- [ ] 所有 banner（error/warning/task）文字与背景达到 WCAG AA
- [ ] 主/次文本在 panel、elevated、muted 背景上可读
- [ ] 头部与检索区按钮在默认/hover/active/disabled 都有清晰状态
- [ ] 特征查询输入框 focus 态可感知且不刺眼
- [ ] select / option 前景/背景对比稳定
- [ ] 滚动条（track/thumb/hover）与主题一致且不遮挡内容
- [ ] range 滑块轨道与圆点在深浅背景都可定位
- [ ] checkbox 未选中/选中/聚焦态与主题一致
- [ ] 视频无源占位背景与文本可读
- [ ] 评分星级在选中/未选中态有足够对比

### 布局效果验证（Style）

- [ ] 面板间距、圆角、阴影在所有面板上一致或按设计差异化
- [ ] Splitter 仍可拖动（即使 track/handle 透明）
- [ ] Header margin 不导致内容溢出或布局跳动
- [ ] 内卡圆角与面板圆角视觉协调
- [ ] 控件 hover/active 效果在缩略图卡片、按钮、列表行上均生效
- [ ] backdrop-filter 在深色和浅色 palette 下都有效果（不全白或全黑）
- [ ] transform 不导致内容裁切（overflow: hidden 区域注意）
- [ ] 布局锁定功能在所有 style 下正常
- [ ] 全屏模式不受 style layout token 影响

### 组合验证（Style × Palette）

- [ ] 至少搭配 1 个浅色 palette + 1 个深色 palette 验证
- [ ] `color-mix()` 派生色在深色/浅色 palette 下都产生合理的半透明效果
- [ ] `--mpx-palette-shadow-color` 在深色/浅色下阴影可见度合理

---

## 10. 主题开发最小示例

### 10.1 纯配色主题（最常见）

优先参考已落地文件，不再在文档中重复内联大段代码：

- 参考实现：`src/styles/themes/palettes/ocean-blue.css`
- 最小骨架：`src/styles/themes/palettes/_palette-template.css`
- 默认对照：`src/styles/themes/palettes/parchment.css`

### 10.2 纯风格主题（搭配任意配色）

同样建议直接参考已落地文件：

- 参考实现（硬朗风格）：`src/styles/themes/styles/neobrutalism.css`
- 参考实现（玻璃风格）：`src/styles/themes/styles/liquid-glass.css`
- 最小骨架：`src/styles/themes/styles/_style-template.css`

### 10.3 推荐验证组合

至少验证以下三组：

1. `flush × parchment`
2. `liquid-glass × ocean-blue`
3. `flush × tokyo-night`

---

## 11. 注意事项

### transform 与 stacking context

当 `--mpx-panel-transform` 或 `--mpx-sidebar-transform` 设为非 `none` 值时，该面板会创建新的 stacking context。如果面板内部有依赖全局 z-index 的弹出层（如 popover），可能受影响。当前应用的 overlay 层（设置面板、全屏、拖拽）z-index 足够高（10+），不会被面板 stacking context 遮挡。

### backdrop-filter 性能

`backdrop-filter: blur()` 在大面积容器上有 GPU 开销。在低端设备上可能引起卡顿。style 开发者应在说明中注明性能要求。

### 全屏模式

全屏模式 (`.fullscreen-layer`) 有独立的样式体系，不受 style 的 layout token 影响。全屏颜色仍由 palette 控制（`--mpx-fullscreen-bg` / `--mpx-fullscreen-footer-bg`）。

### 播放器控件风格

视频与全屏的播放控制区使用 `--mpx-player-*` token，默认采用固定的深色半透明视觉语义（与全屏体验一致），不建议随 palette 做大幅亮暗切换。Palette 若需要覆盖，建议只做细微对比度校正。

### 设置面板

设置面板 (`.settings-mask` + `.settings-panel`) 作为 overlay 呈现，有自己的 backdrop-filter 和 shadow。Style 的面板 token 不直接影响设置面板布局，但控件 token（button/input/range/checkbox）仍会在设置面板内生效。

### 运行时布局间距系数

设置面板“界面设置 -> 布局参数”支持实时写入多项间距系数：

- `--mpx-layout-gap-scale`（容器边距系数，默认 `1.00`，范围 `0.00~3.00`，步进 `0.1`）
- `--mpx-pane-inner-gap-scale`（容器内边距系数，默认 `1.00`，范围 `0.00~2.00`，步进 `0.1`）
- `--mpx-pane-stack-gap-scale`（容器内上中下间距系数，默认 `1.00`，范围 `0.00~2.00`，步进 `0.1`）
- `--mpx-sidebar-inner-gap-scale`（Sidebar 内边距系数，默认 `1.00`，范围 `0.00~2.00`，步进 `0.1`）
- `--mpx-thumbnail-gap-scale`（缩略图间距系数，默认 `1.00`，范围 `0.00~2.00`，步进 `0.1`）
- `--mpx-button-group-inset-scale`（按钮组边距系数，默认 `1.00`，范围 `0.00~2.00`，步进 `0.1`）

计算与取整策略：

- `--mpx-layout-gap-px = round(windowWidth * 1% * --mpx-layout-gap-scale)`
- `--mpx-pane-inner-padding-px = round(windowWidth * 1% * --mpx-pane-inner-gap-scale)`
- `--mpx-pane-stack-gap-px = round(--mpx-pane-inner-padding-px * 0.75 * --mpx-pane-stack-gap-scale)`
- `--mpx-pane-section-gap-px = --mpx-pane-stack-gap-px`
- `--mpx-pane-recessed-padding-px = round(--mpx-pane-inner-padding-px / 3)`
- `--mpx-sidebar-gap-px = round(--mpx-pane-inner-padding-px * 0.8 * --mpx-sidebar-inner-gap-scale)`
- `--mpx-thumbnail-gap-px = round(--mpx-pane-inner-padding-px * 0.8 * --mpx-thumbnail-gap-scale)`
- `--mpx-button-group-inset-px = round(--mpx-pane-inner-padding-px * 0.8 * 0.5 * --mpx-button-group-inset-scale)`

按钮与 head 区自适应策略：

- 运行时会派生 `--mpx-icon-button-size-px`、`--mpx-header-btn-size-px`、`--mpx-panel-head-height-px` 与按钮横向 padding（整数 px）。
- 面板 toolbar 应使用 `min-height` 而非固定 `height`，确保按钮增大时容器可自动增高，不裁切。 
- Header 不再使用独立“高度滑条”直接设高，避免与容器参数体系冲突。

推荐做法：Style 内优先消费 `--mpx-layout-gap-px`、`--mpx-pane-inner-padding-px`、`--mpx-pane-section-gap-px`、`--mpx-sidebar-gap-px`、`--mpx-thumbnail-gap-px` 与 `--mpx-button-group-inset-px`，避免半像素导致边缘模糊。
