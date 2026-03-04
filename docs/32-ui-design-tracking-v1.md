# UI 设计追踪文档 v1

## 1.0 背景层

### 1.0.1 App 根层背景（app-bg）

用在什么地方
首页最外层应用容器 `.app` 的背景底色。
实际值 `#e0dfde`。

css 的触发点
`src/styles/app/layout/layout.part1.css:6`
`background: var(--mpx-slot-bg-app-root-bg, var(--mpx-bg-app));`

变量与变量对应的值（按组）
`--mpx-slot-bg-app-root-bg`（App 根层背景槽位变量，决定 `.app` 实际命中背景）
`--mpx-bg-app`（应用级语义底色变量，作为根层背景来源与回退值）

`--mpx-slot-bg-app-root-bg = var(--mpx-bg-app)`（`src/styles/themes/styles/soft-skeuomorphic.css:281`）
`--mpx-bg-app = #e0dfde`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css:31`）

说明
当前主题（`soft-skeuomorphic × skeuomorphic-luxury-white`）下，首页 `.app` 根层背景最终为 `#e0dfde`。

## 2.0 大容器层（2.1~2.5 通用）

用在什么地方
统一控制五大容器壳层：`Header / Sidebar / Main / Meta / Import Task`。

css 的触发点
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:504`（`.main-pane`）
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:520`（`.app-header`）
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:529`（`.fg-sysinfo .sysinfo-card-shell`）
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:548`（`.sidebar`）
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:556`（`.metadata-panel`）

变量与变量对应的值（按组）
`--mpx-surface-chrome-bg`（五大容器共享的壳层背景语义）
`--mpx-metal-light`（金属渐变高光浅色）
`--mpx-metal-base`（金属渐变基底色）

`--mpx-surface-chrome-bg = linear-gradient(180deg, var(--mpx-metal-light) 0%, var(--mpx-metal-base) 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css:167`）
`--mpx-metal-light = #f5f2ec`（`src/styles/themes/styles/soft-skeuomorphic.css:263`）
`--mpx-metal-base = #e6e2da`（`src/styles/themes/styles/soft-skeuomorphic.css:264`）

`--mpx-surface-chrome-shell-shadow`（五大容器共享壳层凹凸阴影）
`--mpx-metal-dark`（凹凸阴影深色边缘）

`--mpx-surface-chrome-shell-shadow = 2px 4px 10px rgba(116, 88, 50, 0.18), inset 1px 1px 2px rgba(255, 255, 255, 0.9), inset -2px -2px 4px rgba(116, 88, 50, 0.15), 0 0 0 1px color-mix(in srgb, var(--mpx-metal-dark) 60%, transparent), 0 0 0 2px color-mix(in srgb, var(--mpx-metal-light) 50%, transparent)`（`src/styles/themes/styles/soft-skeuomorphic.css:168`）
`--mpx-metal-dark = #cdc7bb`（`src/styles/themes/styles/soft-skeuomorphic.css:265`）

说明
`2.1~2.5` 都默认挂到这套通用壳层语义上；各容器仍可通过各自 `slot` 变量独立覆写。

## 2.1 Header 容器

用在什么地方
顶部主容器 `.app-header`。
结构命名：`data-slot="fg-header-root"`（`src/components/AppHeader.tsx:434`）。

css 的触发点
`src/styles/app/layout/layout.part1.css:10`
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:520`

变量与变量对应的值（按组）
`--mpx-slot-fg-header-root-bg`（Header 背景槽位变量）
`--mpx-header-bg`（Header 语义背景变量）
`--mpx-surface-chrome-bg`（通用壳层背景）

`--mpx-slot-fg-header-root-bg = var(--mpx-header-bg)`（`src/styles/themes/styles/soft-skeuomorphic.css:178`）
`--mpx-header-bg = var(--mpx-surface-chrome-bg)`（`src/styles/themes/styles/soft-skeuomorphic.css:177`）
`--mpx-surface-chrome-bg = linear-gradient(180deg, var(--mpx-metal-light) 0%, var(--mpx-metal-base) 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css:167`）

`--mpx-header-radius-effective`（Header 实际圆角）
`--mpx-header-radius`（Header 基础圆角）

`--mpx-header-radius-effective = max(0px, calc(var(--mpx-header-radius) * var(--mpx-radius-value-scale-coeff)))`（`src/styles/themes/contract.css:480`）
`--mpx-header-radius = 16px`（`src/styles/themes/styles/soft-skeuomorphic.css:155`）

`--mpx-slot-fg-header-root-margin`（Header 外边距槽位变量）
`--mpx-header-margin`（Header 语义外边距）

`--mpx-slot-fg-header-root-margin = 未定义（走 fallback）`
`--mpx-header-margin = var(--mpx-layout-gap-px, calc(var(--mpx-layout-gap-unit) * var(--mpx-layout-gap-scale, 1))) var(--mpx-layout-gap-px, calc(var(--mpx-layout-gap-unit) * var(--mpx-layout-gap-scale, 1))) 0`（`src/styles/themes/styles/soft-skeuomorphic.css:152`）

说明
Header 在当前主题下走通用壳层背景与阴影；`border` 在主题覆盖层为 `none`，外观线条主要由阴影体系实现。

## 2.2 Sidebar 容器

用在什么地方
左侧导航容器 `.sidebar`。
结构命名统一为 `header / main / footer`：
`fg-sidebar-header`（`src/components/SidebarPanel.tsx:1107`）
`fg-sidebar-main`（`src/components/SidebarPanel.tsx:1281`）
`fg-sidebar-footer`（`src/components/SidebarPanel.tsx:1362`）。

css 的触发点
`src/styles/app/sidebar.css:1`
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:548`

变量与变量对应的值（按组）
`--mpx-slot-fg-sidebar-root-bg`（Sidebar 背景槽位变量）
`--mpx-sidebar-bg`（Sidebar 语义背景变量）
`--mpx-surface-chrome-bg`（通用壳层背景）

`--mpx-slot-fg-sidebar-root-bg = 未定义（走 fallback）`
`--mpx-sidebar-bg = var(--mpx-surface-chrome-bg)`（`src/styles/themes/styles/soft-skeuomorphic.css:175`）
`--mpx-surface-chrome-bg = linear-gradient(180deg, var(--mpx-metal-light) 0%, var(--mpx-metal-base) 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css:167`）

`--mpx-slot-fg-sidebar-root-shadow`（Sidebar 阴影槽位变量）
`--mpx-sidebar-shadow`（Sidebar 语义阴影）
`--mpx-surface-chrome-shell-shadow`（通用壳层阴影）

`--mpx-slot-fg-sidebar-root-shadow = 未定义（走 fallback）`
`--mpx-sidebar-shadow = var(--mpx-panel-shadow)`（`src/styles/themes/styles/soft-skeuomorphic.css:193`）
主题层实际值：`box-shadow: var(--mpx-surface-chrome-shell-shadow)`（`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:552`）

说明
Sidebar 结构命名已去除 `toolbar`，统一为 `header/main/footer`；容器壳层默认与 `2.0` 通用样式一致。

## 2.3 Main 容器

用在什么地方
中间主内容容器 `.main-pane`。
结构命名统一为 `header / main / footer`：
`fg-main-header`（如 `src/components/VideoMainSection.tsx:709`）
`fg-main-root`（容器本体，`src/components/AppWorkspace.tsx:154`）
`fg-main-footer`（`src/components/AppWorkspace.tsx:160`）。

css 的触发点
`src/styles/app/main/main.part1.css:1`
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:504`

变量与变量对应的值（按组）
`--mpx-slot-fg-main-root-bg`（Main 背景槽位变量）
`--mpx-main-bg`（Main 语义背景变量）
`--mpx-surface-chrome-bg`（通用壳层背景）

`--mpx-slot-fg-main-root-bg = 未定义（走 fallback）`
`--mpx-main-bg = var(--mpx-surface-chrome-bg)`（`src/styles/themes/styles/soft-skeuomorphic.css:174`）
`--mpx-surface-chrome-bg = linear-gradient(180deg, var(--mpx-metal-light) 0%, var(--mpx-metal-base) 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css:167`）

`--mpx-slot-fg-main-root-shadow`（Main 阴影槽位变量）
`--mpx-main-shadow`（Main 语义阴影）
`--mpx-surface-chrome-shell-shadow`（通用壳层阴影）

`--mpx-slot-fg-main-root-shadow = 未定义（走 fallback）`
`--mpx-main-shadow = var(--mpx-panel-shadow)`（`src/styles/themes/styles/soft-skeuomorphic.css:194`）
主题层实际值：`box-shadow: var(--mpx-surface-chrome-shell-shadow)`（`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:510`）

说明
Main 容器顶部命名已统一为 `main-header` / `fg-main-header`，不再使用 `toolbar` 称呼。

## 2.4 Meta 容器

用在什么地方
右侧元数据容器 `.metadata-panel`。
结构命名统一为 `header / main / footer`：
`fg-meta-header`（`src/components/MetadataPanel.tsx:920`）
`fg-meta-main`（`src/components/MetadataPanel.tsx:1020`）
`fg-meta-footer`（`src/components/MetadataPanel.tsx:1160`）。

css 的触发点
`src/styles/app/metadata.css:50`
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:556`

变量与变量对应的值（按组）
`--mpx-slot-fg-meta-root-bg`（Meta 背景槽位变量）
`--mpx-metadata-bg`（Meta 语义背景变量）
`--mpx-surface-chrome-bg`（通用壳层背景）

`--mpx-slot-fg-meta-root-bg = 未定义（走 fallback）`
`--mpx-metadata-bg = var(--mpx-surface-chrome-bg)`（`src/styles/themes/styles/soft-skeuomorphic.css:176`）
`--mpx-surface-chrome-bg = linear-gradient(180deg, var(--mpx-metal-light) 0%, var(--mpx-metal-base) 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css:167`）

`--mpx-slot-fg-meta-root-shadow`（Meta 阴影槽位变量）
`--mpx-metadata-shadow`（Meta 语义阴影）
`--mpx-surface-chrome-shell-shadow`（通用壳层阴影）

`--mpx-slot-fg-meta-root-shadow = 未定义（走 fallback）`
`--mpx-metadata-shadow = var(--mpx-panel-shadow)`（`src/styles/themes/styles/soft-skeuomorphic.css:195`）
主题层实际值：`box-shadow: var(--mpx-surface-chrome-shell-shadow)`（`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:563`）

说明
Meta 容器顶部命名已统一为 `metadata-header` / `fg-meta-header`，不再使用 `toolbar` 称呼。

## 2.5 Import Task Panel 容器

用在什么地方
导入任务面板容器（独立于 Header，挂在系统信息区域）。
容器定义：`className="import-task-panel sysinfo-card-shell" data-slot="fg-import-task-root"`（`src/components/ImportTaskPanel.tsx:97`）。

css 的触发点
`src/styles/app/base.css:307`（`.sysinfo-card-shell` 壳层链路）
`src/styles/app/base.css:397`（`.import-task-panel` 自身差异样式）
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:529`（主题壳层覆盖）

变量与变量对应的值（按组）
`--mpx-slot-fg-sysinfo-card-root-bg`（SysInfo 卡片背景槽位变量）
`--mpx-sysinfo-card-bg`（SysInfo 卡片语义背景）
`--mpx-surface-chrome-bg`（通用壳层背景）

`--mpx-slot-fg-sysinfo-card-root-bg = 未定义（走 fallback）`
`--mpx-sysinfo-card-bg = var(--mpx-surface-chrome-bg)`（`src/styles/themes/styles/soft-skeuomorphic.css:179`）
`--mpx-surface-chrome-bg = linear-gradient(180deg, var(--mpx-metal-light) 0%, var(--mpx-metal-base) 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css:167`）

`--mpx-slot-fg-import-task-root-border`（Import Task 左侧状态线颜色）
`--mpx-slot-fg-import-task-root-text`（Import Task 主文本颜色）

`--mpx-slot-fg-import-task-root-border = 未定义（走 fallback）`
`--mpx-slot-fg-import-task-root-text = 未定义（走 fallback）`
实际回退：`border-left = 3px solid var(--mpx-status-info-border)`，`text = var(--mpx-status-info-text)`（`src/styles/app/base.css:398`）

`--mpx-slot-fg-import-task-error-text`（Import Task 错误行文本颜色）

`--mpx-slot-fg-import-task-error-text = 未定义（走 fallback）`
实际回退：`inherit`（`src/styles/app/base.css:424`）

说明
Import Task 已独立为 `2.5`，不再走 `fg-header-g1-task-*` 命名；同时保留与 `2.0` 通用壳层一致的外壳风格。

## 3.0 大面板层（基架）

用在什么地方
定义“设置面板风格”的通用大面板骨架，覆盖 `root / head / shell / side / main` 五个层级。
本阶段仅建立通用链路，不把 `3.1~3.6` 全量面板强制切到新结构。

css 的触发点
`src/styles/themes/contract.css`（新增 3.0 通用语义 token）
`src/styles/themes/styles/_style-template.css`（新增 style 模板同构 token）
`src/styles/app/settings/settings.part1.css`（新增 `.mpx-large-panel*` 基础类，并让 `.settings-*` 走 3.0 token）

变量与变量对应的值（按组）
`--mpx-large-panel-width`（大面板宽度）
`--mpx-large-panel-height`（大面板高度）
`--mpx-large-panel-border-width`（大面板边框宽度）
`--mpx-large-panel-border-color`（大面板边框颜色）
`--mpx-large-panel-radius`（大面板圆角）
`--mpx-large-panel-bg`（大面板背景）
`--mpx-large-panel-shadow`（大面板阴影）

`--mpx-large-panel-width = 80vw`（`src/styles/themes/contract.css`）
`--mpx-large-panel-height = 80vh`（`src/styles/themes/contract.css`）
`--mpx-large-panel-border-width = 1px`（`src/styles/themes/contract.css`）
`--mpx-large-panel-border-color = var(--mpx-overlay-surface-border, var(--mpx-border-2))`（`src/styles/themes/contract.css`）
`--mpx-large-panel-radius = var(--mpx-radius-overlay-pop, 14px)`（`src/styles/themes/contract.css`）
`--mpx-large-panel-bg = var(--mpx-overlay-surface-bg, var(--mpx-bg-app))`（`src/styles/themes/contract.css`）
`--mpx-large-panel-shadow = var(--mpx-overlay-surface-shadow, var(--mpx-shadow-panel))`（`src/styles/themes/contract.css`）

`--mpx-large-panel-head-border-width`（head 分割线宽度）
`--mpx-large-panel-head-border-color`（head 分割线颜色）
`--mpx-large-panel-head-padding-y`（head 纵向内边距）
`--mpx-large-panel-head-padding-x`（head 横向内边距）
`--mpx-large-panel-head-bg`（head 背景）
`--mpx-large-panel-head-text`（head 文本色）

`--mpx-large-panel-head-border-width = 1px`（`src/styles/themes/contract.css`）
`--mpx-large-panel-head-border-color = var(--mpx-border-1)`（`src/styles/themes/contract.css`）
`--mpx-large-panel-head-padding-y = 10px`（`src/styles/themes/contract.css`）
`--mpx-large-panel-head-padding-x = 14px`（`src/styles/themes/contract.css`）
`--mpx-large-panel-head-bg = transparent`（`src/styles/themes/contract.css`）
`--mpx-large-panel-head-text = inherit`（`src/styles/themes/contract.css`）

`--mpx-large-panel-shell-columns`（shell 双栏网格）
`--mpx-large-panel-shell-no-side-columns`（无 side 时单栏网格）
`--mpx-large-panel-shell-gap`（shell 栏间距）
`--mpx-large-panel-shell-padding`（shell 内边距）

`--mpx-large-panel-shell-columns = minmax(180px, 20%) 1fr`（`src/styles/themes/contract.css`）
`--mpx-large-panel-shell-no-side-columns = 1fr`（`src/styles/themes/contract.css`）
`--mpx-large-panel-shell-gap = 10px`（`src/styles/themes/contract.css`）
`--mpx-large-panel-shell-padding = 10px`（`src/styles/themes/contract.css`）

`--mpx-large-panel-side-border-width`（side 边框宽度）
`--mpx-large-panel-side-border-color`（side 边框颜色）
`--mpx-large-panel-side-radius`（side 圆角）
`--mpx-large-panel-side-bg`（side 背景）
`--mpx-large-panel-side-padding`（side 内边距）
`--mpx-large-panel-side-gap`（side 按钮间距）

`--mpx-large-panel-side-border-width = 1px`（`src/styles/themes/contract.css`）
`--mpx-large-panel-side-border-color = var(--mpx-border-1)`（`src/styles/themes/contract.css`）
`--mpx-large-panel-side-radius = 10px`（`src/styles/themes/contract.css`）
`--mpx-large-panel-side-bg = var(--mpx-bg-elevated)`（`src/styles/themes/contract.css`）
`--mpx-large-panel-side-padding = 10px`（`src/styles/themes/contract.css`）
`--mpx-large-panel-side-gap = 8px`（`src/styles/themes/contract.css`）

`--mpx-large-panel-main-border-width`（main 边框宽度）
`--mpx-large-panel-main-border-color`（main 边框颜色）
`--mpx-large-panel-main-radius`（main 圆角）
`--mpx-large-panel-main-bg`（main 背景）
`--mpx-large-panel-main-padding-y`（main 纵向内边距）
`--mpx-large-panel-main-padding-x`（main 横向内边距）
`--mpx-large-panel-main-align-items`（main 纵轴对齐）
`--mpx-large-panel-main-justify-content`（main 横轴对齐）

`--mpx-large-panel-main-border-width = 1px`（`src/styles/themes/contract.css`）
`--mpx-large-panel-main-border-color = var(--mpx-border-1)`（`src/styles/themes/contract.css`）
`--mpx-large-panel-main-radius = 10px`（`src/styles/themes/contract.css`）
`--mpx-large-panel-main-bg = var(--mpx-bg-elevated)`（`src/styles/themes/contract.css`）
`--mpx-large-panel-main-padding-y = 14px`（`src/styles/themes/contract.css`）
`--mpx-large-panel-main-padding-x = 16px`（`src/styles/themes/contract.css`）
`--mpx-large-panel-main-align-items = flex-start`（`src/styles/themes/contract.css`）
`--mpx-large-panel-main-justify-content = flex-start`（`src/styles/themes/contract.css`）

说明
当前阶段只完成 3.0 基架：
1) 统一参数入口已建立（可全局调节大面板整体与 `head/side/main`）。
2) `settings-*` 已接入同一套 3.0 token，现有视觉保持不变。
3) `3.1~3.6` 的具体结构迁移与差异收口，留在后续步骤逐项执行。

当前统一能力（3.1~3.6）
1) 六个大面板遮罩层统一受 `--mpx-settings-backdrop-opacity` 影响。
2) 六个大面板头部均支持拖拽移动（交互规则与设置面板一致，按钮/输入等控件不触发拖拽）。

## 3.1 设置面板

用在什么地方
`fg-header-g1-settings-root-panel`（`SettingsPanel`）已接入 3.0 大面板骨架，使用 `head + side + main`。

css 的触发点
`src/components/SettingsPanel.impl.tsx`
`src/styles/app/settings/settings.part1.css`

变量与变量对应的值（按组）
`--mpx-large-panel-width`（大面板宽度）
`--mpx-large-panel-height`（大面板高度）

`settings-panel` 走 `--mpx-large-panel-width/height`
默认值沿用 3.0：`80vw / 80vh`（`src/styles/themes/contract.css`）

`--mpx-large-panel-border-color`（面板边框）
`--mpx-large-panel-bg`（面板背景）
`--mpx-large-panel-shadow`（面板阴影）
`--mpx-large-panel-head-border-color`（head 分割线）
`--mpx-large-panel-side-bg`（side 背景）
`--mpx-large-panel-main-bg`（main 背景）

`[data-slot='fg-header-g1-settings-root-panel']` 已建立 slot -> 3.0 token 映射（`src/styles/app/settings/settings.part1.css`）。

说明
设置面板当前作为 3.0 基架基准实现，后续面板默认向该骨架收口。

## 3.2 主题参数面板

用在什么地方
`ThemeParameterPanel` 已接入 3.0 大面板基架，并拆分为 side 分页导航 + main 分页内容。

css 的触发点
`src/components/theme-parameter/ThemeParameterPanelContainer.tsx`（接入大面板骨架类）
`src/components/theme-parameter/ThemeParameterPanelMain.tsx`（side 分页按钮与 main 分页内容）
`src/styles/app/settings/settings.part1.css`（`theme-parameter` 的 side 按钮与面板尺寸统一）

变量与变量对应的值（按组）
`--mpx-large-panel-width`（大面板宽度）
`--mpx-large-panel-height`（大面板高度）

`theme-parameter-panel` 现在走 `--mpx-large-panel-width/height`（`src/styles/app/settings/settings.part1.css`）
默认值沿用 3.0：`80vw / 80vh`（`src/styles/themes/contract.css`）

`--mpx-large-panel-border-color`（面板边框颜色）
`--mpx-large-panel-bg`（面板背景）
`--mpx-large-panel-shadow`（面板阴影）
`--mpx-large-panel-head-border-color`（head 分割线颜色）
`--mpx-large-panel-side-bg`（side 背景）
`--mpx-large-panel-main-bg`（main 背景）

`[data-slot='fg-header-g3-theme-parameter-root-panel']` 已建立 slot -> 3.0 token 映射（`src/styles/app/settings/settings.part1.css`）

实际值（当前）
分页导航共 6 页：
1) 参数调节
2) 快照工具
3) 大容器层调试
4) 大面板层调试
5) 按钮状态样例
6) 操作

临时预览模式（全局）
1) 大容器层页：
   - 仅背景层预览（`bg-only`）
   - 背景层 + 大容器层预览（`bg-plus-container`）
2) 大面板层页：
   - 背景层 + 大面板层预览（`bg-plus-large-panel`）

关闭预览按钮或关闭主题参数面板时，预览模式都会恢复为 `none`。

说明
本次只做 `3.2` 的结构归并与分页拆分：
1) 主题参数面板大小、配色、布局与设置/帮助面板同源。
2) 原来单页内容已按功能分流到 side 分页。
3) 新增大容器层/大面板层调试分页，支持全局临时预览模式。
4) `bg-plus-large-panel` 预览改为真实 `head + side + main` 骨架，不再使用伪元素近似。
5) 调试参数按 F12 属性聚合展示（Box / Border / Shadow / Root / Head / Shell / Side / Main）。
6) 数值参数支持“滑条 + 数字输入 + 当前值显示”；颜色参数支持“颜色选择器 + HEX 输入”。
7) 参数应用、导入导出、重置功能保持等价。

补充
`快照工具` 导出的 JSON 现已包含 `debugColors`，会覆盖并恢复 `3.2` 两个调试分页中的颜色调节结果。
`快照工具` 导出的 JSON 现已包含 `debugTexts`，用于保存容器壳层阴影原始串（如 `--mpx-surface-chrome-shell-shadow`）。
`3.2` 两个调试分页里每个已改动字段都显示“复位”按钮，点击后恢复到主题默认值（移除对应 inline 覆写）。
`--mpx-metal-dark` 与 `--mpx-surface-chrome-shell-shadow` 已接入大容器层调试分页；颜色项支持透明度输入。

## 3.3 帮助面板

用在什么地方
`fg-header-g3-help-root-panel`（`HelpPanel`）已接入 3.0 大面板骨架，使用 `head + side + main`。

css 的触发点
`src/components/HelpPanel.tsx`
`src/styles/app/settings/settings.part1.css`

变量与变量对应的值（按组）
`--mpx-large-panel-width`（大面板宽度）
`--mpx-large-panel-height`（大面板高度）

`settings-panel` 走 `--mpx-large-panel-width/height`
默认值沿用 3.0：`80vw / 80vh`（`src/styles/themes/contract.css`）

`--mpx-large-panel-border-color`（面板边框）
`--mpx-large-panel-bg`（面板背景）
`--mpx-large-panel-shadow`（面板阴影）
`--mpx-large-panel-head-border-color`（head 分割线）
`--mpx-large-panel-side-bg`（side 背景）
`--mpx-large-panel-main-bg`（main 背景）

`[data-slot='fg-header-g3-help-root-panel']` 已建立 slot -> 3.0 token 映射（`src/styles/app/settings/settings.part1.css`）。

说明
帮助面板与设置面板已经完全同构，后续仅在帮助内容层做功能调整，不再拆分骨架实现。

## 3.4 Sidebar 更名面板

用在什么地方
`fg-sidebar-shortcut-rename-panel`（`SidebarRenameDialog`）已接入 3.0 大面板骨架，并使用 `head + main`（无 side）。

css 的触发点
`src/components/SidebarRenameDialog.tsx`
`src/styles/app/settings/settings.part1.css`
`src/styles/app/settings/settings.part2.css`
`src/styles/app/settings/settings.part3.css`

变量与变量对应的值（按组）
`--mpx-large-panel-width`（大面板宽度）
`--mpx-large-panel-height`（大面板高度）

`--mpx-large-panel-width = 80vw`（`sidebar-rename-dialog`）
`--mpx-large-panel-height = 80vh`（`sidebar-rename-dialog`）

`--mpx-large-panel-border-color`（面板边框）
`--mpx-large-panel-bg`（面板背景）
`--mpx-large-panel-shadow`（面板阴影）
`--mpx-large-panel-head-border-color`（head 分割线）
`--mpx-large-panel-main-bg`（main 背景）

`[data-slot='fg-sidebar-shortcut-rename-panel']` 已建立 slot -> 3.0 token 映射（`settings.part1.css`）。

说明
本阶段先统一尺寸与 `head/main` 骨架，重命名业务内部控件细节样式保持原行为。

## 3.5 元数据获取面板

用在什么地方
`fg-main-header-image-metadata-fetch-panel`（`MetadataFetchPanel`）已接入 3.0 大面板骨架，并使用 `head + main`（无 side）。

css 的触发点
`src/components/metadata/MetadataFetchPanel.tsx`
`src/styles/app/settings/settings.part1.css`
`src/styles/app/manage.css`

变量与变量对应的值（按组）
`--mpx-large-panel-width`（大面板宽度）
`--mpx-large-panel-height`（大面板高度）

`--mpx-large-panel-width = 80vw`（`metadata-fetch-panel`）
`--mpx-large-panel-height = 80vh`（`metadata-fetch-panel`）

`--mpx-large-panel-border-color`（面板边框）
`--mpx-large-panel-bg`（面板背景）
`--mpx-large-panel-shadow`（面板阴影）
`--mpx-large-panel-head-border-color`（head 分割线）
`--mpx-large-panel-main-bg`（main 背景）

`[data-slot='fg-main-header-image-metadata-fetch-panel']` 已建立 slot -> 3.0 token 映射（`settings.part1.css`）。

说明
本阶段仅统一外层尺寸与 `head/main`，内部双列检索结果区与预览区布局保持原逻辑。

## 3.6 标签检索面板

用在什么地方
`fg-meta-main-search-feature-tag-picker-panel`（`FeatureTagPickerModal`）已接入 3.0 大面板骨架，并使用 `head + main`（无 side）。

css 的触发点
`src/components/metadata/FeatureTagPickerModal.tsx`
`src/styles/app/settings/settings.part1.css`
`src/styles/app/metadata.css`

变量与变量对应的值（按组）
`--mpx-large-panel-width`（大面板宽度）
`--mpx-large-panel-height`（大面板高度）

`--mpx-large-panel-width = 80vw`（`feature-tag-modal-panel`）
`--mpx-large-panel-height = 80vh`（`feature-tag-modal-panel`）

`--mpx-large-panel-border-color`（面板边框）
`--mpx-large-panel-bg`（面板背景）
`--mpx-large-panel-shadow`（面板阴影）
`--mpx-large-panel-head-border-color`（head 分割线）
`--mpx-large-panel-main-bg`（main 背景）

`[data-slot='fg-meta-main-search-feature-tag-picker-panel']` 已建立 slot -> 3.0 token 映射（`settings.part1.css`）。

说明
本阶段先统一为“同尺寸 + 同 head/main 骨架”；标签组与操作区仅做结构承接，后续再做细节微调。
