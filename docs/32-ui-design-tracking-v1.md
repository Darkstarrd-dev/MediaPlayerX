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

## 2.0 大容器层（2.1~2.4 通用）

用在什么地方
统一控制四大容器壳层：`Header / Sidebar / Main / Meta`。

css 的触发点
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:504`（`.main-pane`）
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:520`（`.app-header`）
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:548`（`.sidebar`）
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:556`（`.metadata-panel`）

变量与变量对应的值（按组）
`--mpx-surface-chrome-bg`（四大容器共享的壳层背景语义）
`--mpx-metal-light`（金属渐变高光浅色）
`--mpx-metal-base`（金属渐变基底色）

`--mpx-surface-chrome-bg = linear-gradient(180deg, var(--mpx-metal-light) 0%, var(--mpx-metal-base) 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css:167`）
`--mpx-metal-light = #f5f2ec`（`src/styles/themes/styles/soft-skeuomorphic.css:263`）
`--mpx-metal-base = #e6e2da`（`src/styles/themes/styles/soft-skeuomorphic.css:264`）

`--mpx-surface-chrome-shell-shadow`（四大容器共享壳层凹凸阴影）
`--mpx-metal-dark`（凹凸阴影深色边缘）

`--mpx-surface-chrome-shell-shadow = 2px 4px 10px rgba(116, 88, 50, 0.18), inset 1px 1px 2px rgba(255, 255, 255, 0.9), inset -2px -2px 4px rgba(116, 88, 50, 0.15), 0 0 0 1px color-mix(in srgb, var(--mpx-metal-dark) 60%, transparent), 0 0 0 2px color-mix(in srgb, var(--mpx-metal-light) 50%, transparent)`（`src/styles/themes/styles/soft-skeuomorphic.css:168`）
`--mpx-metal-dark = #cdc7bb`（`src/styles/themes/styles/soft-skeuomorphic.css:265`）

说明
`2.1~2.4` 都默认挂到这套通用壳层语义上；各容器仍可通过各自 `slot` 变量独立覆写。

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

### 2.2.2.1 fg-sidebar-main

用在什么地方
侧栏主列表壳层 `.sidebar-main-shell`，结构槽位为 `data-slot="fg-sidebar-main"`（`src/components/SidebarPanel.tsx:1281`）。

css 的触发点
`src/styles/app/sidebar.css:309`
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:39`
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:730`
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:773`
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:807`
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part2.css:203`

变量与变量对应的值（按组）
已统一为 `语义 token -> slot token -> 选择器消费` 三段链路：

1. 语义层：`--mpx-sidebar-main-*`（定义在 `src/styles/themes/contract.css`）
2. slot 层：`--mpx-slot-fg-sidebar-main-*`
3. 消费层：`sidebar.css / manage.css / soft-skeuomorphic.components.part1.css / part2.css`

slot 与语义映射规则（同名后缀）：
`--mpx-slot-fg-sidebar-main-<suffix> = 未设置时 -> --mpx-sidebar-main-<suffix> -> 最终 fallback`

特异性约束（soft-skeuomorphic 主题）

在 `soft-skeuomorphic × skeuomorphic-luxury-white` 下，`part1.css` 中 `.sidebar-label` 基础规则选择器特异性约为 `(0,5,1)`，高于 `sidebar.css / manage.css` 中多数状态规则 `(0,3,0)`。

因此以下变量以 `part1.css` 中同级或更高特异性规则作为主消费点：
`--mpx-sidebar-main-bg`
`--mpx-sidebar-main-label-active-bg`
`--mpx-sidebar-main-active-ring`
`--mpx-sidebar-main-active-underlay`
`--mpx-sidebar-main-label-manage-selected-bg`

`sidebar.css / manage.css` 对应规则保留为非 soft-skeuomorphic 主题的 fallback。

`A. 主列表壳层`

`--mpx-sidebar-main-bg`（主列表背景）

`B. label（默认态 / active / manage selected / collapsible）`

`--mpx-sidebar-main-label-text`
`--mpx-sidebar-main-label-border`
`--mpx-sidebar-main-label-bg`
`--mpx-sidebar-main-label-shadow`
`--mpx-sidebar-main-label-hover-filter`
`--mpx-sidebar-main-label-active-bg`
`--mpx-sidebar-main-label-active-shadow`
`--mpx-sidebar-main-label-active-hover-shadow`
`--mpx-sidebar-main-label-manage-selected-bg`
`--mpx-sidebar-main-label-manage-selected-shadow`
`--mpx-sidebar-main-active-ring`
`--mpx-sidebar-main-active-underlay`
`--mpx-sidebar-main-label-toggle-text`
`--mpx-sidebar-main-label-collapsed-bg`
`--mpx-sidebar-main-label-expanded-bg`
`--mpx-sidebar-main-label-plain-bg`
`--mpx-sidebar-main-label-plain-border`

`C. marker / bullet`

marker 实现方式：
`sidebar-label` 左侧色带通过 `::before` 伪元素实现（不是 `border-left`）。
默认 `opacity: 0`，在 `is-active / is-manage.is-selected / focus-visible` 时 `opacity: 1`。

伪元素分工约束：
`::before` 用于 marker（左侧色带）。
`::after` 保留给 `.mpx-random-sheen-host` 的 sweeping 高光动画。
两者不能共用同一伪元素，否则 sweeping 动画会被覆盖。

对 `is-collapsible` 节点，`::before` 会被折叠箭头 `content` 覆盖，因此不显示 marker（与基线行为一致）。

`--mpx-sidebar-main-label-marker-focus-bg`
`--mpx-sidebar-main-label-marker-selected-bg`
`--mpx-sidebar-main-bullet-pending-bg`
`--mpx-sidebar-main-bullet-running-bg`
`--mpx-sidebar-main-bullet-running-ring`
`--mpx-sidebar-main-bullet-active-bg`

`D. count 徽标（默认 / packages / images）`

`--mpx-sidebar-main-count-text`（默认 count 文本色，也是 packages/images 的 fallback 父变量）
`--mpx-sidebar-main-count-border/bg/shadow`
`--mpx-sidebar-main-count-packages-text/border/bg/shadow`（含 `packages-shadow`，消费点在 `part2.css`）
`--mpx-sidebar-main-count-images-text/border/bg`

说明
`fg-sidebar-main` 调试入口已切到语义 token（`--mpx-sidebar-main-*`）；slot 变量继续保留用于局部覆写，快照字段 `id` 保持兼容。

注意：在 `soft-skeuomorphic` 主题下，`active / manage-selected / bg` 相关变量的主消费点在 `part1.css`，不是 `sidebar.css`，原因是 `part1.css` 基础 label 规则特异性更高。

`marker` 使用 `::before`，`sweeping` 使用 `::after`。若更改伪元素分配，`is-sweeping` 高光动画会失效。

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

### 2.3.2.2 fg-main-content-image-name-list

用在什么地方
图片模式文件名列表容器 `.name-list`，结构槽位为 `data-slot="fg-main-content-image-name-list"`（`src/components/ImageMainSection.renderers.tsx:177`，出现条件：`mode=image && showNamesOnly`）。

css 的触发点
`src/styles/app/main/main.part1.css:504`
`src/styles/app/main/main.part2.css:25`

变量与变量对应的值（按组）
已统一为 `语义 token -> slot token -> 选择器消费` 三段链路：

1. 语义层：`--mpx-main-image-name-list-*`（定义在 `src/styles/themes/contract.css`）
2. slot 层：`--mpx-slot-fg-main-content-image-name-list-*`
3. 消费层：`main.part1.css / main.part2.css / manage.css`

slot 与语义映射规则（同名后缀）：
`--mpx-slot-fg-main-content-image-name-list-<suffix> = 未设置时 -> --mpx-main-image-name-list-<suffix> -> 最终 fallback`

`A. 列表壳层（name-list）`

`--mpx-main-image-name-list-border`
`--mpx-main-image-name-list-bg`
`--mpx-main-image-name-list-text`

`B. 表头与表体（header/body）`

`--mpx-main-image-name-list-head-border`
`--mpx-main-image-name-list-head-bg`
`--mpx-main-image-name-list-head-text`
`--mpx-main-image-name-list-body-bg`

`C. 列表行（name-list-row）`

`--mpx-main-image-name-list-row-border`
`--mpx-main-image-name-list-row-bg`
`--mpx-main-image-name-list-row-text`
`--mpx-main-image-name-list-row-hover-bg`
`--mpx-main-image-name-list-row-focused-border-left`
`--mpx-main-image-name-list-row-selected-border-left`
`--mpx-main-image-name-list-row-selected-focused-border-left`
`--mpx-main-image-name-list-row-manage-selected-bg`

`D. 行内主按钮（name-list-row-main / overlay-cell）`

`--mpx-main-image-name-list-row-main-text`（新增 idle 文本语义入口）
`--mpx-main-image-name-list-row-main-hover-bg`
`--mpx-main-image-name-list-row-main-active-bg`
`--mpx-main-image-name-list-row-main-pressed-bg`
`--mpx-main-image-name-list-row-main-hover-text`
`--mpx-main-image-name-list-row-main-active-text`
`--mpx-main-image-name-list-row-main-pressed-text`
`--mpx-main-image-name-list-row-main-focus-outline-color`
`--mpx-main-image-name-list-row-main-focus-outline-width`
`--mpx-main-image-name-list-row-main-pressed-font-weight`

`E. 文件名列文本（label）`

`--mpx-main-image-name-list-label-text`

说明
`fg-main-content-image-name-list` 调试入口已切到语义 token（`--mpx-main-image-name-list-*`）；slot 变量继续保留用于局部覆写，快照字段 `id` 保持兼容。

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

## 2.5 Import Task Panel 容器（已迁移）

说明
Import Task 已从 `2.5` 迁移到 `3.10` 大面板层；`2.5` 不再作为独立样式层维护。

## 3.0 大面板层（基架）

用在什么地方
定义“设置面板风格”的通用大面板骨架，覆盖 `root / head / shell / side / main` 五个层级。
本阶段建立通用链路，并按分层逐步把 `3.1~3.10` 归并到同一骨架。

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

1. 统一参数入口已建立（可全局调节大面板整体与 `head/side/main`）。
2. `settings-*` 已接入同一套 3.0 token，现有视觉保持不变。
3. `3.1~3.10` 的具体结构迁移与差异收口，按面板逐项执行。

当前统一能力（3.1~3.10）

1. 大面板遮罩层统一受 `--mpx-settings-backdrop-opacity` 影响。
2. 大面板可统一复用 `mpx-large-panel` 基架并通过 slot 局部覆写差异。

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
分页导航共 7 页：

1. 参数调节
2. 快照工具
3. 大容器层调试
4. 大面板层调试
5. 小面板层调试
6. 常用控件调试
7. 按钮状态样例

临时预览模式（全局）

1. 大容器层页：
   - 仅背景层预览（`bg-only`）
   - 背景层 + 大容器层预览（`bg-plus-container`）
2. 大面板层页：
   - 背景层 + 大面板层预览（`bg-plus-large-panel`）
3. 小面板层页：
   - 背景层 + 小面板层预览（`bg-plus-small-panel`）

关闭预览按钮或关闭主题参数面板时，预览模式都会恢复为 `none`。

说明
本次只做 `3.2` 的结构归并与分页拆分：

1. 主题参数面板大小、配色、布局与设置/帮助面板同源。
2. 原来单页内容已按功能分流到 side 分页。
3. 新增大容器层/大面板层/小面板层/常用控件调试分页，支持分层调参。
4. `bg-plus-large-panel` 预览改为真实 `head + side + main` 骨架，不再使用伪元素近似。
5. 调试参数按 F12 属性聚合展示（Box / Border / Shadow / Root / Head / Shell / Side / Main）。
6. 数值参数支持“滑条 + 数字输入 + 当前值显示”；颜色参数支持“颜色选择器 + HEX 输入”。
7. 参数应用、导入导出、重置功能保持等价。

补充
`快照工具` 导出的 JSON 现已包含 `debugColors`，会覆盖并恢复 `3.2` 四个调试分页中的颜色调节结果。
`快照工具` 导出的 JSON 现已包含 `debugTexts`，用于保存容器壳层阴影原始串（如 `--mpx-surface-chrome-shell-shadow`）。
`3.2` 四个调试分页里每个已改动字段都显示“复位”按钮，点击后恢复到主题默认值（移除对应 inline 覆写）。
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
`fg-sidebar-shortcut-rename-panel`（`SidebarRenameDialog`）在**批量更名模式**下接入 3.0 大面板骨架，使用 `head + main`（无 side）。

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
批量更名保持 3.0 链路；单文件更名已拆分到 `5.0 小面板（基架）`，不再占用 3.0 大面板。

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

## 3.7 字幕清理面板

用在什么地方
`fg-main-header-manage-subtitle-cleanup-panel`（`SubtitleCleanupPanel`）已归并到 3.0 大面板骨架，使用 `head + main`（无 side）。

css 的触发点
`src/components/subtitles/SubtitleCleanupPanel.tsx`
`src/styles/app/settings/settings.part1.css`
`src/styles/app/manage.css`

变量与变量对应的值（按组）
`--mpx-large-panel-width`（大面板宽度）
`--mpx-large-panel-height`（大面板高度）

默认值沿用 3.0：`80vw / 80vh`（`src/styles/themes/contract.css`）

`--mpx-large-panel-border-color`（面板边框）
`--mpx-large-panel-bg`（面板背景）
`--mpx-large-panel-shadow`（面板阴影）
`--mpx-large-panel-head-border-color`（head 分割线）
`--mpx-large-panel-main-bg`（main 背景）

`[data-slot='fg-main-header-manage-subtitle-cleanup-panel']` 已建立 slot -> 3.0 token 映射（`settings.part1.css`）。

说明
字幕清理保留原有参数与预览交互，仅将外层容器统一到 3.0 骨架。

## 3.8 音频转码面板

用在什么地方
`fg-main-header-manage-music-transcode-panel`（`MusicAudioTranscodePanel`）已归并到 3.0 大面板骨架，使用 `head + main`（无 side）。

css 的触发点
`src/components/MusicAudioTranscodePanel.tsx`
`src/styles/app/settings/settings.part1.css`
`src/styles/app/settings/settings.part2.css`
`src/styles/app/settings/settings.part3.css`

变量与变量对应的值（按组）
`--mpx-large-panel-width = min(960px, 94vw)`（`music-audio-transcode-dialog`）
`--mpx-large-panel-height = min(760px, 86vh)`（`music-audio-transcode-dialog`）
`--mpx-large-panel-radius = 26px`（`music-audio-transcode-dialog`）

`--mpx-large-panel-border-color`（面板边框）
`--mpx-large-panel-bg`（面板背景）
`--mpx-large-panel-shadow`（面板阴影）
`--mpx-large-panel-head-border-color`（head 分割线）
`--mpx-large-panel-main-bg`（main 背景）

`[data-slot='fg-main-header-manage-music-transcode-panel']` 已建立 slot -> 3.0 token 映射（`settings.part1.css`）。

说明
音频转码继续复用原业务内部表单与历史任务区，仅统一到 3.0 外层骨架链路。

## 3.9 视频转码面板

用在什么地方
`fg-main-header-manage-video-transcode-panel`（`VideoTranscodePanel`）已归并到 3.0 大面板骨架，使用 `head + main`（无 side）。

css 的触发点
`src/components/VideoTranscodePanel.tsx`
`src/styles/app/settings/settings.part1.css`
`src/styles/app/settings/settings.part2.css`
`src/styles/app/settings/settings.part3.css`

变量与变量对应的值（按组）
`--mpx-large-panel-width = min(960px, 94vw)`（`video-transcode-panel`）
`--mpx-large-panel-height = min(760px, 86vh)`（`video-transcode-panel`）
`--mpx-large-panel-radius = 26px`（`video-transcode-panel`）

`--mpx-large-panel-border-color`（面板边框）
`--mpx-large-panel-bg`（面板背景）
`--mpx-large-panel-shadow`（面板阴影）
`--mpx-large-panel-head-border-color`（head 分割线）
`--mpx-large-panel-main-bg`（main 背景）

`[data-slot='fg-main-header-manage-video-transcode-panel']` 已建立 slot -> 3.0 token 映射（`settings.part1.css`）。

说明
视频转码参数区、估算区与任务状态逻辑保持原行为，外层切到 3.0 基架。

## 3.10 Import Task 面板

用在什么地方
`fg-import-task-root`（`ImportTaskPanel`）已从 `2.5` 迁移到 `3.0` 大面板骨架，使用 `ovl + root + head + main`（无 side）。
该面板改为全局 overlay 弹出层，不再占据 Header 与 Main 之间的常驻布局位；导入任务、错误、提示、待审核提醒、哈希日志等事件显示链路保持不变。

css 的触发点
`src/components/AppShell.tsx`（ImportTaskPanel 提升为与 Settings/Help 同级的顶层渲染）
`src/components/ImportTaskPanel.tsx`（新增 `settings-mask` + `data-slot='fg-import-task-ovl'`，根类为 `import-task-panel mpx-large-panel settings-panel`）
`src/styles/app/base.css`（Import Task 面板本体、状态线、错误行样式）
`src/styles/app/settings/settings.part1.css`（`[data-slot='fg-import-task-root']` 的 slot -> 3.0 token 映射）
`src/styles/app/settings/settings.part2.css`（`[data-slot='fg-import-task-ovl']` 的遮罩层 slot）
`src/features/app/useAppInteractionLayer.ts`（Esc / 右键 `data-overlay-close='import-task-panel'` 关闭）

变量与变量对应的值（按组）
`--mpx-slot-fg-import-task-ovl-bg`（Import Task 遮罩层背景）
`--mpx-slot-fg-import-task-ovl-text`（Import Task 遮罩层文本色）

`--mpx-slot-fg-import-task-ovl-bg = 未定义（走 fallback）`
`--mpx-slot-fg-import-task-ovl-text = 未定义（走 fallback）`
实际回退：`ovl-bg -> var(--mpx-slot-fg-import-task-root-bg) / color-mix(...)`，`ovl-text -> var(--mpx-slot-fg-import-task-root-text, inherit)`（`src/styles/app/settings/settings.part2.css`）

`--mpx-slot-fg-import-task-root-border`（Import Task 面板外框颜色，3.10 起语义改为“面板边框”）
`--mpx-slot-fg-import-task-root-bg`（Import Task 面板背景）
`--mpx-slot-fg-import-task-root-shadow`（Import Task 面板阴影）
`--mpx-slot-fg-import-task-root-head-border`（head 分割线颜色）
`--mpx-slot-fg-import-task-root-head-bg`（head 背景）
`--mpx-slot-fg-import-task-root-head-text`（head 文本色）
`--mpx-slot-fg-import-task-root-main-bg`（main 背景）

`--mpx-slot-fg-import-task-root-border = 未定义（走 fallback）`
实际回退：`--mpx-overlay-surface-border` -> `--mpx-border-2`（`src/styles/app/settings/settings.part1.css`）

`--mpx-slot-fg-import-task-root-status-border`（Import Task 左侧状态线颜色）
`--mpx-slot-fg-import-task-root-status-text`（Import Task 状态文本颜色）

`--mpx-slot-fg-import-task-root-status-border = 未定义（走 fallback）`
`--mpx-slot-fg-import-task-root-status-text = 未定义（走 fallback）`
实际回退：`border-left = 3px solid var(--mpx-status-info-border)`，`text = var(--mpx-status-info-text)`（`src/styles/app/base.css`）

`--mpx-slot-fg-import-task-error-text`（Import Task 错误行文本颜色）

`--mpx-slot-fg-import-task-error-text = 未定义（走 fallback）`
实际回退：`inherit`（`src/styles/app/base.css`）

说明
3.10 改造后，Import Task 的外框视觉与调参入口对齐大面板层；状态线语义从 `root-border` 拆分到 `root-status-border`，避免与面板外框语义冲突。

## 4.0 按钮层（基架）

用在什么地方
统一全局按钮视觉链路，覆盖默认按钮、播放器按钮、overlay cell 按钮与 ThemeParameter side 分页按钮。

目标

1. 调整少量基架变量即可批量影响大多数按钮。
2. 特殊场景仍可通过变体与 slot 精细调节。

css 的触发点
`src/styles/themes/contract.css`（4.0 按钮基架与变体 token 定义）
`src/styles/themes/styles/_style-template.css`（style 模板中的 4.0 同构 token）
`src/styles/themes/palettes/skeuomorphic-luxury-white.css`（当前 palette 的 4.0 实际值）
`src/styles/themes/palettes/_palette-template.css`（palette 模板同步到新命名）
`src/styles/app/button-template.css`（按钮模板消费端切到 `btn-variant-default`/`btn-variant-player`）
`src/styles/app/settings/settings.part1.css`（overlay-cell 按钮与 ThemeParameter side 按钮接入新链路）
`src/styles/app/sidebar.css`、`src/styles/app/layout/layout.part*.css`、`src/styles/app/main/main.part*.css`、`src/styles/app/metadata.css`、`src/styles/app/manage.css`（业务消费端批量切换）
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part2.css`

变量与变量对应的值（按组）

`A. 基架层（core）`
`--mpx-btn-core-border`（按钮边框基色）
`--mpx-btn-core-bg-idle/hover/active/pressed`（按钮背景态）
`--mpx-btn-core-text-idle/active/pressed/merged/disabled`（按钮文字态）
`--mpx-btn-core-shadow-idle/hover/active/pressed`（按钮阴影态）
`--mpx-btn-core-transform-hover/active/pressed`（按钮位移动画）
`--mpx-btn-core-danger-hover-bg/border/text/shadow`（危险 hover 态）

`--mpx-btn-core-border = #cbd5e1`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-core-bg-idle = #ecf0f3`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-core-bg-hover = #f8fafc`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-core-bg-active = #dce2e8`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-core-bg-pressed = #d6dee5`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-core-text-idle = #4a4a4a`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-core-text-active = #334155`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-core-text-pressed = #555555`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-core-text-merged = #0f172a`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-core-text-disabled = #9b8465`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-core-transform-hover = translateY(-1px)`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-core-transform-active = translateY(2px)`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-core-transform-pressed = translateY(1px)`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）

`B. 默认变体（default）`
`--mpx-btn-variant-default-*`（默认按钮变体，直接继承 core）

`--mpx-btn-variant-default-border = var(--mpx-btn-core-border)`（`src/styles/themes/contract.css`）
`--mpx-btn-variant-default-bg-idle = var(--mpx-btn-core-bg-idle)`（`src/styles/themes/contract.css`）
`--mpx-btn-variant-default-bg-hover = var(--mpx-btn-core-bg-hover)`（`src/styles/themes/contract.css`）
`--mpx-btn-variant-default-bg-active = var(--mpx-btn-core-bg-active)`（`src/styles/themes/contract.css`）
`--mpx-btn-variant-default-bg-pressed = var(--mpx-btn-core-bg-pressed)`（`src/styles/themes/contract.css`）
`--mpx-btn-variant-default-text-disabled = var(--mpx-btn-core-text-disabled)`（`src/styles/themes/contract.css`）

`C. 播放器变体（player）`
`--mpx-btn-variant-player-border`
`--mpx-btn-variant-player-border-active`
`--mpx-btn-variant-player-bg-idle/hover/active`
`--mpx-btn-variant-player-text-idle/disabled`

`--mpx-btn-variant-player-bg-idle = #fffaf3`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-variant-player-border = rgba(185, 159, 122, 0.82)`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-variant-player-text-idle = #4d3e2d`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-variant-player-bg-hover = #f5eadb`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-variant-player-bg-active = #ecddc8`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-variant-player-border-active = #ad8752`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-variant-player-text-disabled = #9b8465`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）

`D. Overlay Cell 变体（overlay-cell）`
`--mpx-btn-variant-overlay-cell-text-hover/active/pressed`
`--mpx-btn-variant-overlay-cell-bg-hover/active/pressed`
`--mpx-btn-variant-overlay-cell-font-weight-pressed`
`--mpx-btn-variant-overlay-cell-focus-outline-width/color`

`--mpx-btn-variant-overlay-cell-text-hover = color-mix(in srgb, var(--mpx-accent) 72%, var(--mpx-text-1))`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-variant-overlay-cell-bg-hover = var(--mpx-overlay-soft-hover-bg)`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-variant-overlay-cell-text-active = var(--mpx-text-1)`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-variant-overlay-cell-bg-active = var(--mpx-overlay-soft-focus-bg)`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-variant-overlay-cell-text-pressed = var(--mpx-text-1)`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-variant-overlay-cell-font-weight-pressed = 600`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-variant-overlay-cell-bg-pressed = var(--mpx-overlay-soft-focus-bg)`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-btn-variant-overlay-cell-focus-outline-width = 1px`（`src/styles/themes/contract.css`）
`--mpx-btn-variant-overlay-cell-focus-outline-color = var(--mpx-state-focus-color)`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）

`E. ThemeParameter Side 局部变体（slot 微调）`
挂载前缀：`--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-<state>-<prop>`
接入状态：`idle/hover/active/selected/pressed/disabled/pending/danger-hover`

`--mpx-btn-variant-theme-parameter-side-bg-idle = var(--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-bg, var(--mpx-btn-variant-default-bg-idle))`（`src/styles/app/settings/settings.part1.css`）
`--mpx-btn-variant-theme-parameter-side-bg-hover = var(--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-bg, var(--mpx-btn-variant-default-bg-hover))`（`src/styles/app/settings/settings.part1.css`）
`--mpx-btn-variant-theme-parameter-side-bg-active = var(--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-active-bg, var(--mpx-btn-variant-default-bg-active))`（`src/styles/app/settings/settings.part1.css`）
`--mpx-btn-variant-theme-parameter-side-bg-selected = var(--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-selected-bg, var(--mpx-bg-elevated))`（`src/styles/app/settings/settings.part1.css`）
`--mpx-btn-variant-theme-parameter-side-bg-pressed = var(--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pressed-bg, var(--mpx-btn-variant-default-bg-pressed))`（`src/styles/app/settings/settings.part1.css`）
`--mpx-btn-variant-theme-parameter-side-text-disabled = var(--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-disabled-text, var(--mpx-btn-variant-default-text-disabled))`（`src/styles/app/settings/settings.part1.css`）
`--mpx-btn-variant-theme-parameter-side-pending-bg = var(--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pending-bg, var(--mpx-status-warning-bg))`（`src/styles/app/settings/settings.part1.css`）
`--mpx-btn-variant-theme-parameter-side-danger-hover-bg = var(--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-danger-hover-bg, var(--mpx-btn-variant-default-danger-hover-bg))`（`src/styles/app/settings/settings.part1.css`）

说明
4.0 已完成“基架 + 变体 + slot 微调”三层收口：

1. 全局按钮主链路统一到 `core/default/player/overlay-cell`。
2. 旧命名（`btn-template/player-btn/overlay-cell-btn`）已完成迁移并移除。
3. ThemeParameter side 分页按钮保留独立状态级调参能力，同时保持与 default 变体同链路。
4. 命名索引已同步到 `docs/10-ui_definition.md` 与 `docs/11-token_design.md`。

## 5.0 小面板（基架）

用在什么地方
定义事件处理类弹出 dialog 的通用链路（确认/输入/选择）。
基架模板来源：`ImageConvertSettingsPanel`（`fg-main-header-image-convert-panel`）。

当前纳入范围

1. `DangerConfirmDialog`（删除确认）
2. `GroupNameDialog`（分组/移动命名）
3. `SidebarRenameDialog` 的单文件更名分支（`fg-sidebar-shortcut-rename-single-*`）
4. `SettingsShortcutCaptureDialog`
5. `SettingsShortcutBindingDialog`
6. `MetadataVideoEditor` 播放列表命名弹窗
7. `AdReviewStartDialog`（主区与 Meta 两个入口）

css 的触发点
`src/styles/themes/contract.css`（5.0 通用 token）
`src/styles/themes/styles/_style-template.css`（style 模板同构 token）
`src/styles/app/settings/settings.part2.css`（`.mpx-dialog-mask` / `.mpx-dialog-panel` 与 slot 映射）
`src/styles/app/metadata.css`（播放列表命名弹窗接入 5.0 并做 inline 微调）

变量与变量对应的值（按组）
`--mpx-dialog-panel-width = min(520px, 92vw)`（小面板宽度）
`--mpx-dialog-panel-max-width = 92vw`（小面板最大宽度）
`--mpx-dialog-panel-max-height = 80vh`（小面板最大高度）
`--mpx-dialog-panel-border-width = 1px`（小面板边框宽度）
`--mpx-dialog-panel-border-color = var(--mpx-overlay-surface-border, var(--mpx-border-2))`（小面板边框颜色）
`--mpx-dialog-panel-radius = 12px`（小面板圆角）
`--mpx-dialog-panel-bg = var(--mpx-overlay-surface-bg, var(--mpx-bg-elevated))`（小面板背景）
`--mpx-dialog-panel-shadow = var(--mpx-overlay-surface-shadow, var(--mpx-shadow-panel))`（小面板阴影）
`--mpx-dialog-panel-padding = 14px`（小面板内边距）
`--mpx-dialog-panel-gap = 10px`（小面板内部间距）

`--mpx-overlay-surface-border = #b8ac9b`（`src/styles/themes/styles/soft-skeuomorphic.css:267`）
`--mpx-overlay-surface-bg = #f5f2ec`（`src/styles/themes/styles/soft-skeuomorphic.css:268`）
`--mpx-overlay-surface-shadow = 0 0 0 1px rgba(247, 242, 232, 0.96), 0 0 0 2px rgba(190, 176, 154, 0.42), 0 1px 0 rgba(255, 255, 255, 0.96), 0 2px 0 rgba(172, 155, 129, 0.68), 0 12px 30px rgba(120, 110, 100, 0.3), 0 4px 10px rgba(120, 110, 100, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1), inset 0 -1px 0 rgba(165, 146, 119, 0.45)`（`src/styles/themes/styles/soft-skeuomorphic.css:269`）

`--mpx-dialog-panel-border-color = #b8ac9b`（当前主题实际命中）
`--mpx-dialog-panel-bg = #f5f2ec`（当前主题实际命中）
`--mpx-dialog-panel-shadow = 0 0 0 1px rgba(247, 242, 232, 0.96), 0 0 0 2px rgba(190, 176, 154, 0.42), 0 1px 0 rgba(255, 255, 255, 0.96), 0 2px 0 rgba(172, 155, 129, 0.68), 0 12px 30px rgba(120, 110, 100, 0.3), 0 4px 10px rgba(120, 110, 100, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1), inset 0 -1px 0 rgba(165, 146, 119, 0.45)`（当前主题实际命中）

`--mpx-border-2 = #b08d5c`（回退值，`src/styles/themes/palettes/skeuomorphic-luxury-white.css:54`）
`--mpx-bg-elevated = #fffcf8`（回退值，`src/styles/themes/palettes/skeuomorphic-luxury-white.css:41`）
`--mpx-shadow-panel = 0 8px 24px color-mix(in srgb, var(--mpx-palette-shadow-color) 8%, transparent), inset 0 1px 0 rgba(255, 255, 255, 1), inset 0 -1px 2px color-mix(in srgb, var(--mpx-palette-shadow-color) 5%, transparent)`（回退值，`src/styles/themes/styles/soft-skeuomorphic.css:157`）

说明

1. 所有纳入项统一挂到 `mpx-dialog-mask + mpx-dialog-panel` 基架。
2. 各 dialog 仍可通过各自 slot 变量做局部覆写（边框/背景/文字/阴影/尺寸）。
3. 单文件更名从 3.0 大面板拆出，改走 5.0 小面板；批量更名仍保留在 3.4。

## 6.0 控件层

说明
控件层没有基础层，直接从 `6.1` 开始维护。

## 6.1 滚动条样式

用在什么地方
全局滚动容器（含 `mpx-scroll-area` 与常规可滚动区域）的滚动条轨道/滑块样式。
当前按单链路维护，暂不拆变体。

css 的触发点
`src/styles/app/base.css`（`*::-webkit-scrollbar*` 与 `scrollbar-color` 入口）
`src/styles/themes/contract.css`（滚动条语义 token 默认值）
`src/styles/themes/styles/soft-skeuomorphic.css`（当前 style 对 sidebar-tree 滚动条覆写）

变量与变量对应的值（按组）
`--mpx-scrollbar-size`（滚动条尺寸）
`--mpx-scrollbar-radius`（滚动条圆角）
`--mpx-scrollbar-track-bg`（轨道背景）
`--mpx-scrollbar-thumb-bg`（滑块背景）
`--mpx-scrollbar-thumb-hover-bg`（滑块 hover 背景）
`--mpx-scrollbar-thumb-active-bg`（滑块 active 背景）

`--mpx-scrollbar-size = 10px`（`src/styles/themes/contract.css`）
`--mpx-scrollbar-radius = 999px`（`src/styles/themes/contract.css`）
`--mpx-scrollbar-track-bg = #ece5d9`（`src/styles/themes/contract.css`）
`--mpx-scrollbar-thumb-bg = #b7ab95`（`src/styles/themes/contract.css`）
`--mpx-scrollbar-thumb-hover-bg = #2e6f7f`（`src/styles/themes/contract.css`）
`--mpx-scrollbar-thumb-active-bg = var(--mpx-scrollbar-thumb-hover-bg)`（`src/styles/themes/contract.css`）

说明
6.1 当前不区分场景变体；侧栏树滚动条通过 `sidebar-tree` 命名变量链路承接并覆写视觉细节。

## 6.2 Slider

### 6.2.0 Slider 基础层（变体基座）

用在什么地方
所有 `input[type='range']` 的基础轨道/滑块状态参数，作为后续变体共用底座。

css 的触发点
`src/styles/app/base.css`（range 基础样式）
`src/styles/themes/contract.css`（range 基础 token）

变量与变量对应的值（按组）
`--mpx-range-track-height`（轨道高度）
`--mpx-range-track-bg`（轨道背景）
`--mpx-range-thumb-size`（滑块尺寸）
`--mpx-range-thumb-bg`（滑块背景）
`--mpx-range-thumb-border`（滑块描边）
`--mpx-range-thumb-border-width`（滑块描边宽度）
`--mpx-range-thumb-shadow/hover-shadow/active-shadow`（滑块阴影态）
`--mpx-range-thumb-focus-ring`（键盘焦点环）
`--mpx-range-thumb-hover-scale/active-scale`（滑块交互缩放）

`--mpx-range-track-height = 6px`（`src/styles/themes/contract.css`）
`--mpx-range-track-bg = #d6cfc1`（`src/styles/themes/contract.css`）
`--mpx-range-thumb-size = 16px`（`src/styles/themes/contract.css`）
`--mpx-range-thumb-bg = #2e6f7f`（`src/styles/themes/contract.css`）
`--mpx-range-thumb-border = #ffffff`（`src/styles/themes/contract.css`）
`--mpx-range-thumb-border-width = 1.5px`（`src/styles/themes/contract.css`）

说明
6.2.0 仅定义基础状态，不绑定具体业务场景。

### 6.2.1 Slider 变体：播放器面板

用在什么地方
播放器进度/音量滑条与全屏播放器同类控件，统一走 `SkeuoRunway`。

css 的触发点
`src/components/primitives/SkeuoRunway.tsx`
`src/components/VideoMainSection.tsx`
`src/components/MusicMainSectionControlsShell.tsx`
`src/components/fullscreen/FullscreenVideoControls.tsx`
`src/styles/themes/styles/soft-skeuomorphic.runway.css`

变量与变量对应的值（按组）
`--mpx-runway-fill-gold`（进度填充金色变体）
`--mpx-runway-fill-graphite`（进度填充石墨变体）
`--mpx-runway-fill-shadow-gold/graphite`（填充阴影）
`--mpx-runway-thumb-shell-*/core-*`（滑块壳层与核心渐变）
`--mpx-runway-thumb-shell-shadow-*/core-shadow-*`（滑块阴影）

`--mpx-runway-fill-gold = linear-gradient(90deg, #cba468 0%, #b5853b 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css`）
`--mpx-runway-fill-graphite = linear-gradient(90deg, #9ca3af 0%, #4b5563 55%, #374151 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css`）

说明
播放器面板 slider 在 6.2.1 下单独维护，不与设置面板 slider 混在同一调参区。

### 6.2.2 Slider 变体：竖向（上/下同链路）

用在什么地方
竖向 slider（包括朝上与朝下两种交互方向）的共享样式链路。

css 的触发点
`src/styles/app/layout/layout.part2.css`（`header-vertical-range`）
`src/components/fullscreen/FullscreenFooter.tsx`（竖向 range 交互）
`src/styles/themes/styles/soft-skeuomorphic.runway.css`（竖向 range 的软拟物轨道/滑块）

变量与变量对应的值（按组）
`--mpx-skeuo-accent-fill`（已走过区域填充色）
`--mpx-skeuo-inset-bg`（未走过区域底色）
`--mpx-skeuo-shadow-dark`（凹陷暗部阴影）
`--mpx-skeuo-shadow-light`（凹陷亮部阴影）

`--mpx-skeuo-accent-fill = #8a6a3b`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-skeuo-inset-bg = #f3e9d8`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-skeuo-shadow-dark = #cdb799`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）
`--mpx-skeuo-shadow-light = #fffdf7`（`src/styles/themes/palettes/skeuomorphic-luxury-white.css`）

说明
朝上/朝下仅方向变换不同（`transform` 与输入方向），视觉 token 共用同一套。

### 6.2.3 Slider 变体：设置面板

用在什么地方
设置页与主题参数页等非播放器场景中的通用 slider。

css 的触发点
`src/styles/app/settings/settings.part1.css`（设置页 range 布局）
`src/components/theme-parameter/ThemeParameterPanelMain.tsx`（参数调节滑条）
`src/styles/themes/styles/soft-skeuomorphic.runway.css`（`input[type='range']:not(.mpx-runway-input):not(.header-vertical-range)`）

变量与变量对应的值（按组）
`--mpx-runway-groove-bg`（设置 slider 轨道底色）
`--mpx-runway-groove-shadow`（设置 slider 轨道阴影）

`--mpx-runway-groove-bg = #e9ecf0`（`src/styles/themes/styles/soft-skeuomorphic.css`）
`--mpx-runway-groove-shadow = inset 0 2px 4px color-mix(in srgb, var(--mpx-palette-shadow-color) 32%, transparent), inset 0 1px 1px color-mix(in srgb, var(--mpx-palette-shadow-color) 32%, transparent), 0 1px 0 rgba(255, 255, 255, 1)`（`src/styles/themes/styles/soft-skeuomorphic.css`）

说明
当前 6.2.3 与 6.2.1 在部分轨道 token 上存在共享；分页已分离，后续可继续下钻为独立 token 链路。
