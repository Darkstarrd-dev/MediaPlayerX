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
