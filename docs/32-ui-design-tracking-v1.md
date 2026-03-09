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
`--mpx-container-frame-fill-start`（四大容器共享壳层 fill 起始色）
`--mpx-container-frame-fill-end`（四大容器共享壳层 fill 结束色）
`--mpx-container-frame-fill-angle`（四大容器共享壳层渐变角度）
`--mpx-container-frame-fill`（四大容器共享壳层 fill）

`--mpx-container-frame-fill = linear-gradient(var(--mpx-container-frame-fill-angle), var(--mpx-container-frame-fill-start) 0%, var(--mpx-container-frame-fill-end) 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css`）
`--mpx-container-frame-fill-start = #f5f2ec`（`src/styles/themes/styles/soft-skeuomorphic.css`）
`--mpx-container-frame-fill-end = #e6e2da`（`src/styles/themes/styles/soft-skeuomorphic.css`）

`--mpx-container-frame-edge-color`（共享壳层阴影边缘混色）
`--mpx-container-frame-border-color`（四大容器共享边框色）
`--mpx-container-frame-shadow`（四大容器共享壳层阴影）

`--mpx-container-frame-shadow = 2px 4px 10px rgba(116, 88, 50, 0.18), inset 1px 1px 2px rgba(255, 255, 255, 0.9), inset -2px -2px 4px rgba(116, 88, 50, 0.15), 0 0 0 1px color-mix(in srgb, var(--mpx-container-frame-edge-color) 60%, transparent), 0 0 0 2px color-mix(in srgb, var(--mpx-container-frame-fill-start) 50%, transparent)`（`src/styles/themes/styles/soft-skeuomorphic.css`）
`--mpx-container-frame-edge-color = #cdc7bb`（`src/styles/themes/styles/soft-skeuomorphic.css`）

说明
`2.1~2.4` 都默认挂到这套“共享壳层 + 单容器 frame”语义上；各容器仍可通过各自 `slot` 变量独立覆写。

## 2.1 Header 容器

用在什么地方
顶部主容器 `.app-header`。
结构命名：`data-slot="fg-header-root"`（`src/components/AppHeader.tsx:434`）。

css 的触发点
`src/styles/app/layout/layout.part1.css:10`
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css:520`

变量与变量对应的值（按组）
`--mpx-header-bg`（Header 语义背景变量）
`--mpx-container-frame-fill`（共享壳层背景）

`--mpx-header-bg = var(--mpx-container-frame-fill)`（`src/styles/themes/styles/soft-skeuomorphic.css`）
`--mpx-container-frame-fill = linear-gradient(var(--mpx-container-frame-fill-angle), var(--mpx-container-frame-fill-start) 0%, var(--mpx-container-frame-fill-end) 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css`）

`--mpx-header-radius-effective`（Header 实际圆角）
`--mpx-header-radius`（Header 基础圆角）

`--mpx-header-radius-effective = max(0px, calc(var(--mpx-header-radius) * var(--mpx-radius-value-scale-coeff)))`（`src/styles/themes/contract.css:480`）
`--mpx-header-radius = 16px`（`src/styles/themes/styles/soft-skeuomorphic.css:155`）

`--mpx-header-floating-gap`（Header 浮动间距语义变量）

`--mpx-header-floating-gap = var(--mpx-layout-gap-px, calc(var(--mpx-layout-gap-unit) * var(--mpx-layout-gap-scale, 1))) var(--mpx-layout-gap-px, calc(var(--mpx-layout-gap-unit) * var(--mpx-layout-gap-scale, 1))) 0`（`src/styles/themes/styles/soft-skeuomorphic.css`）

说明
Header 在当前主题下走通用壳层背景与阴影；`border` 在主题覆盖层为 `none`，外观线条主要由阴影体系实现。
SysInfo 不再默认跟随 Header 视觉 token，已迁入大面板 token 体系。

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
`--mpx-sidebar-bg`（Sidebar 语义背景变量）
`--mpx-container-frame-fill`（共享壳层背景）

`--mpx-sidebar-bg = var(--mpx-container-frame-fill)`（`src/styles/themes/styles/soft-skeuomorphic.css`）
`--mpx-container-frame-fill = linear-gradient(var(--mpx-container-frame-fill-angle), var(--mpx-container-frame-fill-start) 0%, var(--mpx-container-frame-fill-end) 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css`）

`--mpx-sidebar-shadow`（Sidebar 语义阴影）
`--mpx-container-frame-shadow`（共享壳层阴影）

`--mpx-sidebar-shadow = var(--mpx-container-frame-shadow)`（`src/styles/themes/styles/soft-skeuomorphic.css`）
主题层实际值：`box-shadow: var(--mpx-container-frame-shadow)`（`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`）

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

ThemeParameter 面板结构改为 4 个可折叠层，固定顺序如下；每层内部再按 `文字颜色 -> 边框颜色 -> 背景颜色 -> 静态指示颜色 -> 动态指示颜色` 排列，无对应项则跳过。

`1. root`

`--mpx-sidebar-main-bg`

`2. label`

`--mpx-sidebar-main-label-text`
`--mpx-sidebar-main-label-toggle-text`
`--mpx-sidebar-main-label-border`
`--mpx-sidebar-main-label-plain-border`
`--mpx-sidebar-main-label-bg`
`--mpx-sidebar-main-label-collapsed-bg`
`--mpx-sidebar-main-label-expanded-bg`
`--mpx-sidebar-main-label-plain-bg`
`--mpx-sidebar-main-label-active-bg`
`--mpx-sidebar-main-active-underlay`
`--mpx-sidebar-main-active-ring`
`--mpx-sidebar-main-label-marker-focus-bg`
`--mpx-sidebar-main-label-marker-selected-bg`
`--mpx-sidebar-main-label-manage-selected-bg`
`--mpx-sidebar-main-label-collapsed-active-bg`
`--mpx-sidebar-main-label-expanded-active-bg`
`--mpx-sidebar-main-label-plain-active-bg`
`--mpx-sidebar-main-label-collapsed-marker-focus-bg`
`--mpx-sidebar-main-label-expanded-marker-focus-bg`
`--mpx-sidebar-main-label-plain-marker-focus-bg`
`--mpx-sidebar-main-label-collapsed-marker-selected-bg`
`--mpx-sidebar-main-label-expanded-marker-selected-bg`
`--mpx-sidebar-main-label-plain-marker-selected-bg`
`--mpx-sidebar-main-label-collapsed-manage-selected-bg`
`--mpx-sidebar-main-label-expanded-manage-selected-bg`
`--mpx-sidebar-main-label-plain-manage-selected-bg`
`--mpx-sidebar-main-label-hover-filter`
`--mpx-sidebar-main-label-shadow`
`--mpx-sidebar-main-label-active-shadow`
`--mpx-sidebar-main-label-active-hover-shadow`
`--mpx-sidebar-main-label-manage-selected-shadow`

`3. count`

`--mpx-sidebar-main-count-text`
`--mpx-sidebar-main-count-packages-text`
`--mpx-sidebar-main-count-images-text`
`--mpx-sidebar-main-count-border`
`--mpx-sidebar-main-count-packages-border`
`--mpx-sidebar-main-count-images-border`
`--mpx-sidebar-main-count-bg`
`--mpx-sidebar-main-count-packages-bg`
`--mpx-sidebar-main-count-images-bg`
`--mpx-sidebar-main-count-shadow`
`--mpx-sidebar-main-count-packages-shadow`

`4. bullet`

marker 实现方式：
`sidebar-label` 左侧色带通过 `::before` 伪元素实现（不是 `border-left`）。
默认 `opacity: 0`，在 `is-active / is-manage.is-selected / focus-visible` 时 `opacity: 1`。

伪元素分工约束：
`::before` 用于 marker（左侧色带）。
`::after` 保留给 `.mpx-random-sheen-host` 的 sweeping 高光动画。
两者不能共用同一伪元素，否则 sweeping 动画会被覆盖。

对 `is-collapsible` 节点，`::before` 会被折叠箭头 `content` 覆盖，因此不显示 marker（与基线行为一致）。

`--mpx-sidebar-main-bullet-pending-bg`
`--mpx-sidebar-main-bullet-running-bg`
`--mpx-sidebar-main-bullet-running-ring`
`--mpx-sidebar-main-bullet-active-bg`

说明
`fg-sidebar-main` 调试入口已切到语义 token（`--mpx-sidebar-main-*`）；slot 变量继续保留用于局部覆写，快照字段 `id` 保持兼容。

注意：在 `soft-skeuomorphic` 主题下，`active / manage-selected / bg` 相关变量的主消费点在 `part1.css`，不是 `sidebar.css`，原因是 `part1.css` 基础 label 规则特异性更高。

`marker` 使用 `::before`，`sweeping` 使用 `::after`。若更改伪元素分配，`is-sweeping` 高光动画会失效。

当前状态语义建议按实现理解为：

1. `is-active` = 当前项（current item），不是 DOM focus。
2. `is-hover-active` = hover。
3. `is-manage.is-selected` = 批量选择态（manage-selected）。
4. `focus-visible` 仅补充键盘焦点下的 marker 可见性。
5. `is-pressed-active` 当前只是内部兼容 class，不建议继续作为主调试语义对外暴露。

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
`--mpx-main-bg`（Main 语义背景变量）
`--mpx-container-frame-fill`（共享壳层背景）

`--mpx-main-bg = var(--mpx-container-frame-fill)`（`src/styles/themes/styles/soft-skeuomorphic.css`）
`--mpx-container-frame-fill = linear-gradient(var(--mpx-container-frame-fill-angle), var(--mpx-container-frame-fill-start) 0%, var(--mpx-container-frame-fill-end) 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css`）

`--mpx-main-shadow`（Main 语义阴影）
`--mpx-container-frame-shadow`（共享壳层阴影）

`--mpx-main-shadow = var(--mpx-container-frame-shadow)`（`src/styles/themes/styles/soft-skeuomorphic.css`）
主题层实际值：`box-shadow: var(--mpx-container-frame-shadow)`（`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`）

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

ThemeParameter 面板结构改为 3 个可折叠层，固定顺序如下；每层内部再按 `文字颜色 -> 边框颜色 -> 背景颜色 -> 静态指示颜色 -> 动态指示颜色` 排列，无对应项则跳过。

`1. root`

`--mpx-main-image-name-list-text`
`--mpx-main-image-name-list-border`
`--mpx-main-image-name-list-bg`

`2. header`

`--mpx-main-image-name-list-head-text`
`--mpx-main-image-name-list-head-border`
`--mpx-main-image-name-list-head-bg`

`3. list`

`--mpx-main-image-name-list-label-text`
`--mpx-main-image-name-list-row-text`
`--mpx-main-image-name-list-row-main-text`
`--mpx-main-image-name-list-row-main-selected-text`
`--mpx-main-image-name-list-row-main-hover-text`
`--mpx-main-image-name-list-row-border`
`--mpx-main-image-name-list-body-bg`
`--mpx-main-image-name-list-row-bg`
`--mpx-main-image-name-list-row-selected-bg`
`--mpx-main-image-name-list-row-selected-border-left`
`--mpx-main-image-name-list-row-focused-border-left`
`--mpx-main-image-name-list-row-hover-bg`
`--mpx-main-image-name-list-row-main-hover-bg`
`--mpx-main-image-name-list-row-main-pressed-bg`

说明
`fg-main-content-image-name-list` 调试入口已切到语义 token（`--mpx-main-image-name-list-*`）；slot 变量继续保留用于局部覆写，快照字段 `id` 保持兼容。

表格主体状态收口规则（2026-03）：

1. `无状态`：使用 `row-border / row-bg / row-main-text`。
2. `hover`：仅强调 `row-main-hover-bg / row-main-hover-text`。
3. `pressed`：表示鼠标按下未放手前的瞬时态，仅强调 `row-main-pressed-bg`；优先级高于 `selected`。
4. `selected`：保留左侧 `selected-border-left`，并叠加 `row-selected-bg + row-main-selected-text`。
5. `focused`：仅使用 `focused-border-left`。
6. `selected + focused`：背景与文字继续沿用 `selected`，左侧色条改用 `focused`；不再保留独立 `selected-focused` token。

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
`--mpx-metadata-bg`（Meta 语义背景变量）
`--mpx-container-frame-fill`（共享壳层背景）

`--mpx-metadata-bg = var(--mpx-container-frame-fill)`（`src/styles/themes/styles/soft-skeuomorphic.css`）
`--mpx-container-frame-fill = linear-gradient(var(--mpx-container-frame-fill-angle), var(--mpx-container-frame-fill-start) 0%, var(--mpx-container-frame-fill-end) 100%)`（`src/styles/themes/styles/soft-skeuomorphic.css`）

`--mpx-metadata-shadow`（Meta 语义阴影）
`--mpx-container-frame-shadow`（共享壳层阴影）

`--mpx-metadata-shadow = var(--mpx-container-frame-shadow)`（`src/styles/themes/styles/soft-skeuomorphic.css`）
主题层实际值：`box-shadow: var(--mpx-container-frame-shadow)`（`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`）

说明
Meta 容器顶部命名已统一为 `metadata-header` / `fg-meta-header`，不再使用 `toolbar` 称呼。

### 2.4.1 偏好指标卡片（preference record）

用在什么地方
`fg-meta-main-image-editor-preference-metrics-panel` 与 `fg-meta-main-video-editor-preference-metrics-panel`（`.metadata-preference-record`）。

css 的触发点
`src/components/metadata/MetadataImageEditor.tsx`
`src/components/metadata/MetadataVideoEditor.tsx`
`src/styles/app/settings/settings.part1.css`
`src/styles/app/metadata.css`
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`

变量与变量对应的值（按组）
已统一为 `语义 token -> slot token -> 选择器消费` 三段链路：

1. 语义层：`--mpx-metadata-preference-record-*`（定义在 `src/styles/themes/contract.css`）
2. slot 层：
   - `--mpx-slot-fg-meta-main-image-editor-preference-metrics-panel-*`
   - `--mpx-slot-fg-meta-main-video-editor-preference-metrics-panel-*`
3. 消费层：`src/styles/app/settings/settings.part1.css` + `src/styles/app/metadata.css` + `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`

`A. 外卡本体`

`--mpx-metadata-preference-record-border`
`--mpx-metadata-preference-record-bg`
`--mpx-metadata-preference-record-text`

`B. 标题 / hint`

`--mpx-metadata-preference-record-summary-text`
`--mpx-metadata-preference-record-hint-text`

`C. 只读字段`

`--mpx-metadata-preference-record-field-border`
`--mpx-metadata-preference-record-field-bg`
`--mpx-metadata-preference-record-field-text`

说明
Image / Video 两处 preference record 已改为同一语义家族，`ThemeParameterPanel` 统一在 `containerLayer > 2.4 Metadata > 2.4.2.2 Metadata 内部件 / 2.4.2.5 Metadata 偏好记录` 验收，不再依赖散落的 `.metadata-preference-record` 类规则直写。

### 2.4.2 音乐 Booklet 绑定卡片

用在什么地方
`fg-meta-main-music-editor-booklet-binding-panel`（`.metadata-music-booklet-bindings`）。

css 的触发点
`src/components/metadata/MetadataMusicEditor.tsx`
`src/styles/app/settings/settings.part1.css`
`src/styles/app/metadata.css`
`src/styles/themes/styles/soft-skeuomorphic.css`
`src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`

变量与变量对应的值（按组）
已统一为 `语义 token -> slot token -> 选择器消费` 三段链路：

1. 语义层：`--mpx-metadata-booklet-binding-*`（定义在 `src/styles/themes/contract.css`）
2. slot 层：`--mpx-slot-fg-meta-main-music-editor-booklet-binding-panel-*`
3. 消费层：`src/styles/app/settings/settings.part1.css` + `src/styles/app/metadata.css` + `src/styles/themes/styles/soft-skeuomorphic.css` + `src/styles/themes/styles/soft-skeuomorphic-components/soft-skeuomorphic.components.part1.css`

`A. 卡片本体`

`--mpx-metadata-booklet-binding-border`
`--mpx-metadata-booklet-binding-bg`
`--mpx-metadata-booklet-binding-text`
`--mpx-metadata-booklet-binding-meta-text`

`B. 选择控件`

`--mpx-metadata-booklet-binding-control-border`
`--mpx-metadata-booklet-binding-control-bg`
`--mpx-metadata-booklet-binding-control-text`

说明
Booklet 绑定区现已不再借壳通用 `input/select` 默认值；slot 可局部覆写，语义层统一在 `containerLayer > 2.4 Metadata > 2.4.2.6 Music Metadata Booklet 绑定` 调试。

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
`快照工具` 导出的 JSON 现已包含 `debugTexts`，用于保存容器壳层阴影原始串（如 `--mpx-container-frame-shadow`、`--mpx-header-shadow`）。
`3.2` 四个调试分页里每个已改动字段都显示“复位”按钮，点击后恢复到主题默认值（移除对应 inline 覆写）。
`--mpx-container-frame-edge-color`、`--mpx-container-frame-border-color` 与 `--mpx-container-frame-shadow` 已接入大容器层调试分页；颜色项支持透明度输入。

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

内部件链路（Phase 2 已补齐）

已统一为 `语义 token -> slot token -> 选择器消费` 三段链路：

1. 语义层：`--mpx-metadata-fetch-*`（定义在 `src/styles/themes/contract.css`）
2. slot 层：`--mpx-slot-fg-main-header-image-metadata-fetch-panel-*`
3. 消费层：`src/styles/app/manage.css`

`A. 搜索行 / 控件行（search row / source group / search button）`

`--mpx-metadata-fetch-control-border`
`--mpx-metadata-fetch-control-bg`
`--mpx-metadata-fetch-control-hover-bg`
`--mpx-metadata-fetch-control-focus-bg`
`--mpx-metadata-fetch-control-text`
`--mpx-metadata-fetch-control-placeholder`
`--mpx-metadata-fetch-control-font-size`

`B. 双列结果区（results / source column / source head / source body）`

`--mpx-metadata-fetch-results-border`
`--mpx-metadata-fetch-results-bg`
`--mpx-metadata-fetch-results-active-ring`
`--mpx-metadata-fetch-head-border`
`--mpx-metadata-fetch-head-bg`
`--mpx-metadata-fetch-head-text`
`--mpx-metadata-fetch-head-font-size`
`--mpx-metadata-fetch-head-font-family`
`--mpx-metadata-fetch-body-bg`
`--mpx-metadata-fetch-result-meta-text`
`--mpx-metadata-fetch-result-hover-text`

`C. 预览区（preview stack / preview card / preview toggle）`

`--mpx-metadata-fetch-preview-divider`
`--mpx-metadata-fetch-preview-bg`
`--mpx-metadata-fetch-preview-toggle-border`
`--mpx-metadata-fetch-preview-toggle-bg`
`--mpx-metadata-fetch-preview-toggle-text`
`--mpx-metadata-fetch-preview-toggle-hover-bg`
`--mpx-metadata-fetch-preview-toggle-active-bg`
`--mpx-metadata-fetch-preview-toggle-focus-outline`

说明
Metadata Fetch 现已不止统一外层尺寸；内部搜索行、结果列与预览卡也已进入 `largePanelLayer` 调试范围。

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

内部件链路（Phase 2 已补齐）

已统一为 `语义 token -> slot token -> 选择器消费` 三段链路：

1. 语义层：`--mpx-metadata-feature-tag-picker-*`（定义在 `src/styles/themes/contract.css`）
2. slot 层：`--mpx-slot-fg-meta-main-search-feature-tag-picker-panel-*`
3. 消费层：`src/styles/app/settings/settings.part1.css` + `src/styles/app/metadata.css`

`A. hint / 分组键`

`--mpx-metadata-feature-tag-picker-hint-text`
`--mpx-metadata-feature-tag-picker-group-key-text`

`B. tag 容器`

`--mpx-metadata-feature-tag-picker-popover-border`
`--mpx-metadata-feature-tag-picker-popover-bg`

`C. tag 按钮（默认 / active）`

`--mpx-metadata-feature-tag-picker-tag-border`
`--mpx-metadata-feature-tag-picker-tag-bg`
`--mpx-metadata-feature-tag-picker-tag-text`
`--mpx-metadata-feature-tag-picker-tag-active-border`
`--mpx-metadata-feature-tag-picker-tag-active-bg`
`--mpx-metadata-feature-tag-picker-tag-active-text`

说明
标签检索面板现已不止统一外层骨架；内部 tag popover / hint / active tag 也已进入 `largePanelLayer` 调试范围。

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

preview 子块链路（Phase 2 已补齐）

已统一为 `语义 token -> slot token -> 选择器消费` 三段链路：

1. 语义层：`--mpx-subtitle-cleanup-raw-preview-*`、`--mpx-subtitle-cleanup-clean-preview-*`（定义在 `src/styles/themes/contract.css`）
2. slot 层：
   - `--mpx-slot-fg-main-header-manage-subtitle-cleanup-raw-preview-panel-*`
   - `--mpx-slot-fg-main-header-manage-subtitle-cleanup-clean-preview-panel-*`
3. 消费层：`src/styles/app/settings/settings.part1.css` + `src/styles/app/manage.css`

`A. Raw Preview`

`--mpx-subtitle-cleanup-raw-preview-border`
`--mpx-subtitle-cleanup-raw-preview-bg`
`--mpx-subtitle-cleanup-raw-preview-text`
`--mpx-subtitle-cleanup-raw-preview-toggle-border`
`--mpx-subtitle-cleanup-raw-preview-toggle-bg`
`--mpx-subtitle-cleanup-raw-preview-toggle-text`
`--mpx-subtitle-cleanup-raw-preview-toggle-hover-bg`
`--mpx-subtitle-cleanup-raw-preview-toggle-active-bg`
`--mpx-subtitle-cleanup-raw-preview-toggle-focus-outline`

`B. Clean Preview`

`--mpx-subtitle-cleanup-clean-preview-border`
`--mpx-subtitle-cleanup-clean-preview-bg`
`--mpx-subtitle-cleanup-clean-preview-text`
`--mpx-subtitle-cleanup-clean-preview-toggle-border`
`--mpx-subtitle-cleanup-clean-preview-toggle-bg`
`--mpx-subtitle-cleanup-clean-preview-toggle-text`
`--mpx-subtitle-cleanup-clean-preview-toggle-hover-bg`
`--mpx-subtitle-cleanup-clean-preview-toggle-active-bg`
`--mpx-subtitle-cleanup-clean-preview-toggle-focus-outline`

说明
字幕清理现已不止统一外层容器；`raw / clean preview` 两个预览面板也已进入 `largePanelLayer` 调试范围。

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

内部件现已补齐 `语义 token -> slot token -> selector consume` 三段链路：

1. 语义层：`--mpx-transcode-dialog-control-*`、`--mpx-transcode-dialog-action-btn-*`
2. slot 层：`--mpx-slot-fg-main-header-manage-music-transcode-panel-control-*`、`--mpx-slot-fg-main-header-manage-music-transcode-panel-action-btn-*`
3. 消费层：`settings.part2.css / settings.part3.css`

说明
音频转码继续复用原业务内部表单与历史任务区；路径行输入框、select 与 footer / inline action button 已不再借壳 `sidebar-rename-soft-*` 或 Header G2 token。

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

内部件现已补齐 `语义 token -> slot token -> selector consume` 三段链路：

1. 语义层：`--mpx-transcode-dialog-control-*`、`--mpx-transcode-dialog-action-btn-*`
2. slot 层：`--mpx-slot-fg-main-header-manage-video-transcode-panel-control-*`、`--mpx-slot-fg-main-header-manage-video-transcode-panel-action-btn-*`
3. 消费层：`settings.part2.css / settings.part3.css`

说明
视频转码参数区、估算区与任务状态逻辑保持原行为；输出目录行与底部操作按钮已切到独立 transcode 语义家族。

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

`--mpx-import-task-error-border/bg/text`（错误行语义 token）
`--mpx-import-task-hint-border/bg/text`（提示行语义 token）
`--mpx-import-task-review-notice-border/bg/text`（待审核提醒语义 token）
`--mpx-import-task-hash-log-border/bg/text`（哈希日志项语义 token）

默认回退定义在 `src/styles/themes/contract.css`：

1. `error -> status-danger`
2. `hint -> status-info`
3. `review-notice -> status-warning`
4. `hash-log -> status-info`

消费点：`src/styles/app/base.css`

1. `[data-slot='fg-import-task-error']`
2. `[data-slot='fg-import-task-hint']`
3. `.import-task-panel-review-notice`
4. `.import-task-panel-hash-log-list li`

说明
3.10 改造后，Import Task 的外框视觉与调参入口对齐大面板层；状态线语义从 `root-border` 拆分到 `root-status-border`，避免与面板外框语义冲突。

Phase 2 当前进度（2026-03-06）

1. Import Task 子块已补齐 `contract semantic token -> slot token -> selector consume` 链路。
2. `largePanelLayer` 页已可直接调试 `error / hint / review-notice / hash-log` 四组语义颜色字段。
3. 快照导出将包含上述字段，便于后续进入正式 theme config schema。

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

`E. ThemeParameter Side 局部变体（slot 微调，现归 largePanelLayer > 3.5）`
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
3. `buttonStates` 页现在主验收 `default/player/overlay-cell/slot` 四层；ThemeParameter side 分页按钮迁移到 `largePanelLayer > 3.5 Button 按钮总控`。
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
`--mpx-dialog-panel-height = auto`（小面板高度，root 可选显式覆盖）
`--mpx-dialog-panel-max-height = 80vh`（小面板最大高度）
`--mpx-dialog-panel-border-width = 1px`（小面板边框宽度）
`--mpx-dialog-panel-root-border-color = var(--mpx-overlay-surface-border, var(--mpx-border-2))`（小面板 root 默认边框颜色）
`--mpx-dialog-panel-border-color = var(--mpx-dialog-panel-root-border-color)`（小面板默认边框颜色，slot 可在元素级直接覆写）
`--mpx-dialog-panel-radius = 12px`（小面板圆角）
`--mpx-dialog-panel-root-fill-start = var(--mpx-overlay-surface-bg, var(--mpx-bg-elevated))`（小面板 root 默认渐变起点）
`--mpx-dialog-panel-root-fill-end = var(--mpx-dialog-panel-root-fill-start)`（小面板 root 默认渐变终点）
`--mpx-dialog-panel-root-fill-angle = 180deg`（小面板 root 默认渐变角度）
`--mpx-dialog-panel-fill-start = var(--mpx-dialog-panel-root-fill-start)`（小面板默认渐变起点，slot 可在元素级直接覆写）
`--mpx-dialog-panel-fill-end = var(--mpx-dialog-panel-root-fill-end)`（小面板默认渐变终点，slot 可在元素级直接覆写）
`--mpx-dialog-panel-fill-angle = var(--mpx-dialog-panel-root-fill-angle)`（小面板默认渐变角度，slot 可在元素级直接覆写）
`--mpx-dialog-panel-bg = linear-gradient(...)`（在 `.mpx-dialog-panel` / `.settings-floating-panel` 元素级现场合成）
`--mpx-dialog-panel-shadow = var(--mpx-overlay-surface-shadow, var(--mpx-shadow-panel))`（小面板阴影）
`--mpx-dialog-panel-padding = 14px`（小面板内边距）
`--mpx-dialog-panel-gap = 10px`（小面板内部间距）

`--mpx-overlay-surface-border = #b8ac9b`（`src/styles/themes/styles/soft-skeuomorphic.css:267`）
`--mpx-overlay-surface-bg = #f5f2ec`（`src/styles/themes/styles/soft-skeuomorphic.css:268`）
`--mpx-overlay-surface-shadow = 0 0 0 1px rgba(247, 242, 232, 0.96), 0 0 0 2px rgba(190, 176, 154, 0.42), 0 1px 0 rgba(255, 255, 255, 0.96), 0 2px 0 rgba(172, 155, 129, 0.68), 0 12px 30px rgba(120, 110, 100, 0.3), 0 4px 10px rgba(120, 110, 100, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1), inset 0 -1px 0 rgba(165, 146, 119, 0.45)`（`src/styles/themes/styles/soft-skeuomorphic.css:269`）

`--mpx-dialog-panel-root-border-color = #b8ac9b`（当前主题实际命中）
`--mpx-dialog-panel-root-fill-start = #f5f2ec`（当前主题实际命中）
`--mpx-dialog-panel-root-fill-end = #f5f2ec`（当前主题实际命中）
`--mpx-dialog-panel-shadow = 0 0 0 1px rgba(247, 242, 232, 0.96), 0 0 0 2px rgba(190, 176, 154, 0.42), 0 1px 0 rgba(255, 255, 255, 0.96), 0 2px 0 rgba(172, 155, 129, 0.68), 0 12px 30px rgba(120, 110, 100, 0.3), 0 4px 10px rgba(120, 110, 100, 0.1), inset 0 1px 0 rgba(255, 255, 255, 1), inset 0 -1px 0 rgba(165, 146, 119, 0.45)`（当前主题实际命中）

`--mpx-border-2 = #b08d5c`（回退值，`src/styles/themes/palettes/skeuomorphic-luxury-white.css:54`）
`--mpx-bg-elevated = #fffcf8`（回退值，`src/styles/themes/palettes/skeuomorphic-luxury-white.css:41`）
`--mpx-shadow-panel = 0 8px 24px color-mix(in srgb, var(--mpx-palette-shadow-color) 8%, transparent), inset 0 1px 0 rgba(255, 255, 255, 1), inset 0 -1px 2px color-mix(in srgb, var(--mpx-palette-shadow-color) 5%, transparent)`（回退值，`src/styles/themes/styles/soft-skeuomorphic.css:157`）

说明

1. 所有纳入项统一挂到 `mpx-dialog-mask + mpx-dialog-panel` 基架。
2. 小面板按 `root source -> slot element override -> element-level bg composition -> consumption` 链路消费 `border-color / fill-start / fill-end / fill-angle`；实际渲染优先吃 slot 分控，未覆写时回退到 root 总控。
3. 遮罩层 `ovl-bg` 不再回退到 `panel fill`，避免调试 panel 本体时误改整屏遮罩。
4. 单文件更名从 3.0 大面板拆出，改走 5.0 小面板；批量更名仍保留在 3.4。

### 5.2 SidebarRenameDialog 小面板 / 大面板内部件

用在什么地方
`SidebarRenameDialog` 的单文件更名分支与批量更名分支共享一组受控内部语义：输入控件 / 操作按钮 / 批量预览表。

变量与变量对应的值（按组）

1. 通用 dialog 控件：`--mpx-sidebar-rename-dialog-text`、`--mpx-sidebar-rename-dialog-muted-text`、`--mpx-sidebar-rename-dialog-control-*`、`--mpx-sidebar-rename-dialog-action-btn-*`
2. 批量预览表：`--mpx-sidebar-rename-preview-border/bg/head-*/list-bg/row-*`
3. slot 映射：
   - 小面板本体：`--mpx-slot-fg-sidebar-shortcut-rename-single-panel-border/fill-start/fill-end/fill-angle/shadow`
   - 大面板共享内部件：`--mpx-sidebar-rename-dialog-*`
   - 大面板预览表：`--mpx-sidebar-rename-preview-*`

说明
`SidebarRenameDialog` 已不再借壳 `sidebar-rename-soft-*` 与 `fg-header-g2-mode-image-*`；单文件重命名在 `smallPanelLayer` 只暴露本体边框 / fill / 阴影，共享内部件与批量预览表统一纳入 `largePanelLayer`。

### 5.1 播放列表命名小面板

用在什么地方
`fg-meta-main-video-editor-playlist-name-dialog-panel`（`.metadata-playlist-save-dialog.mpx-dialog-panel.mpx-dialog-panel--inline`）。

css 的触发点
`src/components/metadata/MetadataVideoEditor.tsx`
`src/styles/app/settings/settings.part2.css`
`src/styles/app/metadata.css`

变量与变量对应的值（按组）
已统一为 `语义 token -> slot token -> 选择器消费` 三段链路：

1. 骨架层：`--mpx-dialog-panel-*`（5.0 小面板基架）
2. 内部语义层：`--mpx-metadata-playlist-name-dialog-*`（定义在 `src/styles/themes/contract.css`）
3. slot 层：`--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-*`
4. 消费层：`src/styles/app/settings/settings.part2.css` + `src/styles/app/metadata.css`

`A. 文本 / 提示`

`--mpx-metadata-playlist-name-dialog-text`

`B. 输入框`

`--mpx-metadata-playlist-name-dialog-input-border`
`--mpx-metadata-playlist-name-dialog-input-bg`
`--mpx-metadata-playlist-name-dialog-input-text`
`--mpx-metadata-playlist-name-dialog-input-placeholder`

说明
播放列表命名弹窗现已不只挂到 `5.0` 骨架；其 prompt 与 input 也可在 `smallPanelLayer` 直接调试与快照覆盖。

## 6.0 控件层

说明
控件层没有基础层，直接从 `6.1` 开始维护。

## 6.1 滚动条样式

用在什么地方
全局滚动容器（含 `mpx-scroll-area` 与常规可滚动区域）的滚动条轨道/滑块样式。
当前按“全局基础层 + sidebar-tree 受控别名细节覆写”维护，暂不再拆新变体。

css 的触发点
`src/styles/app/base.css`（`*::-webkit-scrollbar*` 与 `scrollbar-color` 入口）
`src/styles/themes/contract.css`（滚动条语义 token 默认值）
`src/styles/themes/styles/soft-skeuomorphic.css`（当前 style 对 sidebar-tree 滚动条覆写）

变量与变量对应的值（按组）

`A. 全局基础层`

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

`B. sidebar-tree 细节覆写层（ThemeParameter commonControls 已直接暴露）`

`--mpx-sidebar-tree-scrollbar-track-radius/thumb-radius`
`--mpx-sidebar-tree-scrollbar-color-track/color-thumb`
`--mpx-sidebar-tree-scrollbar-track-bg/border/shadow`
`--mpx-sidebar-tree-scrollbar-end-gap`
`--mpx-sidebar-tree-scrollbar-thumb-min-height`
`--mpx-sidebar-tree-scrollbar-thumb-border-width/border-color`
`--mpx-sidebar-tree-scrollbar-thumb-bg/hover-bg/active-bg`
`--mpx-sidebar-tree-scrollbar-thumb-shadow/active-shadow`

说明
6.1 当前不再视为“未分页尾项”：`ThemeParameterPanel` 的 `commonControls` 页已同时覆盖全局基础值与 `sidebar-tree` 细节覆写字段。
`base.css` 的真实消费顺序仍为 `sidebar-tree alias -> global scrollbar base -> fallback`，因此 `sidebar-tree` 前缀继续保留为受控别名，而不是匿名硬编码。

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
`--mpx-slider-settings-groove-bg`（设置 slider 轨道底色）
`--mpx-slider-settings-groove-shadow`（设置 slider 轨道阴影）

`--mpx-slider-settings-groove-bg = #e9ecf0`（`src/styles/themes/styles/soft-skeuomorphic.css`）
`--mpx-slider-settings-groove-shadow = inset 0 2px 4px color-mix(in srgb, var(--mpx-palette-shadow-color) 32%, transparent), inset 0 1px 1px color-mix(in srgb, var(--mpx-palette-shadow-color) 32%, transparent), 0 1px 0 rgba(255, 255, 255, 1)`（`src/styles/themes/styles/soft-skeuomorphic.css`）

说明
6.2.3 已从播放器 runway 轨道中拆出，`ThemeParameterPanel` 的 `commonControls` 页现在直接调试 `--mpx-slider-settings-groove-*`。
`--mpx-runway-groove-*` 继续保留给播放器 / runway 相关消费点，不再承担设置 slider 的轨道语义。

## 7.0 Phase 1 收口基线（2026-03-06）

### 7.0.1 ThemeParameter 分页归属总表

| 层级范围                                  | 主语义 token 家族                                                                                                | 主 slot / data-slot 家族                                                                                                                       | 主消费点                                                                                                        | ThemeParameter 分页 | 状态                                                          |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------- |
| `1.0 背景层` + `2.0~2.4 大容器层`         | `--mpx-bg-*`、`--mpx-container-frame-*`、`--mpx-header-*`、`--mpx-sidebar-*`、`--mpx-main-*`、`--mpx-metadata-*` | `--mpx-slot-bg-app-*`、`--mpx-slot-fg-header-root-*`、`--mpx-slot-fg-sidebar-root-*`、`--mpx-slot-fg-main-root-*`、`--mpx-slot-fg-meta-root-*` | `layout.part*.css`、`sidebar.css`、`main.part*.css`、`metadata.css`、`soft-skeuomorphic.components.part1.css`   | `containerLayer`    | 已建立主链路                                                  |
| `2.2.2.1 fg-sidebar-main`                 | `--mpx-sidebar-main-*`                                                                                           | `--mpx-slot-fg-sidebar-main-*`                                                                                                                 | `sidebar.css`、`manage.css`、`soft-skeuomorphic.components.part1.css`、`soft-skeuomorphic.components.part2.css` | `containerLayer`    | 已进入分页；保留高特异性消费说明                              |
| `2.3.2.2 fg-main-content-image-name-list` | `--mpx-main-image-name-list-*`                                                                                   | `--mpx-slot-fg-main-content-image-name-list-*`                                                                                                 | `main.part1.css`、`main.part2.css`、`manage.css`                                                                | `containerLayer`    | 已进入分页                                                    |
| `3.0~3.10 大面板层`                       | `--mpx-large-panel-*`                                                                                            | 各大面板 `root/head/side/main/ovl` slot 家族                                                                                                   | `settings.part1.css`、`settings.part2.css`、业务面板 CSS                                                        | `largePanelLayer`   | 骨架已统一，内部件仍有残余                                    |
| `5.0 小面板层`                            | `--mpx-dialog-panel-*`                                                                                           | 各 dialog `ovl/panel` slot 家族                                                                                                                | `settings.part2.css`、`metadata.css`                                                                            | `smallPanelLayer`   | 骨架已统一                                                    |
| `4.0 按钮层`                              | `--mpx-btn-core-*`、`--mpx-btn-variant-*`                                                                        | `--mpx-slot-<path>-*`（局部覆写）                                                                                                              | `button-template.css`、`settings.part1.css`、业务消费端样式                                                     | `buttonStates`      | 已建立主链路                                                  |
| `6.1 滚动条` + `6.2 Slider`               | `--mpx-scrollbar-*`、`--mpx-range-*`、`--mpx-runway-*`、`--mpx-slider-settings-*`                                | 控件自身 slot/语义链路                                                                                                                         | `base.css`、`soft-skeuomorphic.runway.css`、`layout.part2.css`、`settings.part1.css`                            | `commonControls`    | 已进入分页，scrollbar detail 与 settings slider groove 已补齐 |
| 播放器 / 全屏图像调整 / 广告审核 overlay  | `--mpx-player-surface-*`、`--mpx-player-hud-*`、`--mpx-fs-image-adjust-*`（预留）、`--mpx-ad-review-overlay-*`   | 各子系统自有前缀或受控保留位                                                                                                                   | `main.part2.css`、`main.part3.css`、`main.part4.css`、`layout.part3.css`、`manage.css`                          | 暂不并入当前分页    | 允许特例，保留独立语义域                                      |

说明

1. `ThemeParameterPanel` 当前分页只承接可稳定批量调节的层级；播放器、全屏图像调整、广告审核 overlay 保留为特例子系统。
2. `parameters / snapshot` 两页用于通用参数与快照，不作为 UI 层级归属页。

### 7.0.1.1 ThemeParameter 分页验收对照表（Phase 2）

| 分页              | 必须覆盖的层级节点                                                                                                                          | 暂不纳入的特例节点                                    | 当前预览入口                                | 说明                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------- |
| `parameters`      | `COMMON_PARAMETERS` + 当前 style 参数 + 大/小面板数值参数                                                                                   | 不承载特例白名单，只负责通用参数滑条                  | 无独立预览；直接写入实际变量                | 该页是参数入口，不作为层级归属页                          |
| `snapshot`        | 当前所有分页已暴露字段的导出 / 导入 / 复位                                                                                                  | 不负责新增字段定义                                    | 无独立预览；作用于当前 inline 覆写集合      | Phase 3 会把该结构继续收敛到正式 theme schema             |
| `containerLayer`  | `1.0` 背景层、`2.0 共享壳层`、`2.1 Header`、`2.2 Sidebar`、`2.3 Main`、`2.4 Metadata`、`fg-sidebar-main`、`fg-main-content-image-name-list`、`metadata file list`、`rating heart` | 播放器子系统、全屏图像调整                            | `bg-only`、`bg-plus-container`              | 已按共享壳层 + 单容器 frame 结构重排；Main/Metadata 文件列表分别接在 `2.3.2.2` / `2.4.2.3`，`rating heart` 接在 `2.4.2.1` |
| `largePanelLayer` | `3.0~3.10` 大面板骨架与已收口内部件：ThemeParameter side button、Import Task、Metadata Fetch、FeatureTagPicker、Subtitle Cleanup、Transcode、SidebarRename 批量预览等 | 播放器独立 panel / HUD、未登记的舞台化 overlay        | `bg-plus-large-panel`                       | 主验收对象是 `root/head/side/main/button` 骨架与受控内部语义 |
| `smallPanelLayer` | `5.0` 小面板骨架与已收口内部件：playlist-name-dialog、rename.single 等                                                                      | 不承接大面板内部件与播放器 popover                    | `bg-plus-small-panel`                       | 以 dialog panel 本体与其局部控件为主                      |
| `commonControls`  | `6.1` 滚动条基础层 + sidebar-tree 细节覆写、`6.2.0` range 基础层、`6.2.1` runway、`6.2.2` 竖向 slider、`6.2.3` settings slider groove、`6.3` file list baseline | 全屏图像调整曲线控件、播放器 HUD 内非 slider 特化控件 | 页内控件样例（scrollbar / slider / file-list preview） | 当前已补齐 scrollbar detail、settings groove 与文件列表通用基线 |
| `buttonStates`    | `4.0` 按钮层的 `default/player/overlay-cell/slot` 四层链路                                                                                  | 业务按钮全集并不在本页逐个复刻                        | 页内分组折叠区                              | 用于验收 `core -> variant -> slot` 的总体收口情况         |

### 7.0.1.2 ThemeParameter 逐页手工验收清单（待执行）

| 分页              | 验收动作                                                                    | 预期结果                                                             | 当前记录状态                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `parameters`      | 调节任一通用参数后关闭并重新打开面板                                        | 变量值保持到当前会话态，UI 同步更新                                  | 待执行                                                                                                                                                                 |
| `snapshot`        | 导出当前快照 -> 清空 / 复位 -> 重新导入                                     | 已暴露字段全部恢复，提示文案正确                                     | 待执行                                                                                                                                                                 |
| `containerLayer`  | 在 `bg-only` / `bg-plus-container` 下分别修改颜色、文本串、数值项并单项复位 | 预览区即时生效，复位后回到主题默认值                                 | 进行中：`2.0 共享壳层`、`2.1 Header`、`2.2 Sidebar`、`2.3 Main`、`2.4 Metadata`、`2.2.2.1 fg-sidebar-main`、`2.3.2.2 fg-main-content-image-name-list` 已进入新结构验收 |
| `largePanelLayer` | 在 `bg-plus-large-panel` 下修改 `root/head/side/main` 与内部件颜色项        | 大面板骨架与已收口内部件同步响应                                     | 待执行                                                                                                                                                                 |
| `smallPanelLayer` | 在 `bg-plus-small-panel` 下修改 dialog 骨架与文本串并复位                   | 小面板预览与实际 slot 命中一致                                       | 待执行                                                                                                                                                                 |
| `commonControls`  | 逐项测试 scrollbar、runway、vertical、settings slider 字段                  | 对应控件样例即时变化；scrollbar detail 与 settings groove 命中新链路 | 待执行                                                                                                                                                                 |
| `buttonStates`    | 切换各状态样例并修改 side button 颜色项                                     | state demo 与左侧分页按钮命中一致                                    | 待执行                                                                                                                                                                 |

执行约束

1. 每页至少记录四类结果：`改值生效`、`单项复位生效`、`快照恢复生效`、`切页不丢状态`。
2. 若发现“文档标注变量”与“实际命中变量”不一致，优先修正文档或实现，禁止口头跳过。
3. 手工验收完成后，再回填 `docs/35-ui-theme-config-tauri-roadmap-v1.md` 的 Phase 2 勾选状态。

### 7.0.1.3 `containerLayer` 首轮手工验收结论与重排建议

已完成范围：

1. `2.0 共享壳层`（背景层 / 壳层 / 通用数值项）
2. `2.2.2.1 fg-sidebar-main`
3. `2.3.2.2 fg-main-content-image-name-list`

四类必填结果当前状态：

- `改值生效`：已通过；首轮验收中已观察到大量稳定命中样本
- `单项复位生效`：已通过；已验证可针对单字段独立复位
- `快照恢复生效`：已通过；已验证当前页样本字段可被快照导出/导入恢复
- `切页不丢状态`：已通过；已验证分页切换后 inline 覆写与输入状态保留

#### 建议的新验收顺序（先主链路，后条件项）

`A. 2.0 共享壳层：稳定有效、适合前置验收`

- `--mpx-bg-app`
- `--mpx-container-frame-fill-start`
- `--mpx-container-frame-fill-end`
- `--mpx-container-frame-edge-color`
- `--mpx-container-frame-border-color`
- `--mpx-container-frame-shadow`
- `layout-padding`
- `splitter-width`
- `container-frame-fill-angle`
- `panel-radius`
- `header-radius`
- `card-radius`

`B. 2.2.2.1 fg-sidebar-main：先验稳定主路径`

- `--mpx-sidebar-main-bg`
- `--mpx-sidebar-main-label-text`
- `--mpx-sidebar-main-label-border`
- `--mpx-sidebar-main-label-shadow`
- `--mpx-sidebar-main-label-hover-filter`
- `--mpx-sidebar-main-active-underlay`
- `--mpx-sidebar-main-label-active-shadow`
- `--mpx-sidebar-main-label-active-hover-shadow`
- `--mpx-sidebar-main-label-toggle-text`
- `--mpx-sidebar-main-label-collapsed-bg`
- `--mpx-sidebar-main-label-plain-border`
- `--mpx-sidebar-main-label-plain-bg`
- `--mpx-sidebar-main-count-text`
- `--mpx-sidebar-main-count-border`
- `--mpx-sidebar-main-count-shadow`

`C. 2.3.2.2 fg-main-content-image-name-list：先验壳层 / 表头 / 行主链路`

- `--mpx-main-image-name-list-border`
- `--mpx-main-image-name-list-label-text`
- `--mpx-main-image-name-list-head-border`
- `--mpx-main-image-name-list-head-bg`
- `--mpx-main-image-name-list-head-text`
- `--mpx-main-image-name-list-row-border`
- `--mpx-main-image-name-list-row-bg`
- `--mpx-main-image-name-list-row-main-text`
- `--mpx-main-image-name-list-row-focused-border-left`
- `--mpx-main-image-name-list-row-selected-border-left`
- `--mpx-main-image-name-list-row-selected-bg`
- `--mpx-main-image-name-list-row-main-pressed-bg`
- `--mpx-main-image-name-list-row-main-hover-text`
- `--mpx-main-image-name-list-row-main-selected-text`

#### 当前建议后置或降级的字段类型

`1. 预览错位 / 当前页难以验证`

- `--mpx-bg-workspace`：文档预期应影响图片网格背景，但当前 `containerLayer` 预览未稳定复现
- `--mpx-bg-panel`：在当前主题下更多是 fallback 或次级消费点，不适合作为首批容器验收样本
- `--mpx-bg-elevated`：更容易先命中 ThemeParameter / overlay 内页，不适合作为当前页前置样本

`2. 当前主题统一壳层覆盖导致不宜前置`

- `--mpx-border-2`
- `panel-border-width`
- `skeuo-header-pane-border-contrast`
- `skeuo-header-pane-border-color`
- `skeuo-main-pane-border-contrast`
- `skeuo-main-pane-border-color`
- 大部分 pane 级 `elevation / shadow-strength / shadow-hardness` 细分项

说明：在 `soft-skeuomorphic × skeuomorphic-luxury-white` 下，四大容器主视觉更偏向统一消费 `--mpx-container-frame-fill` 与 `--mpx-container-frame-shadow`，导致若干 pane 级字段虽存在链路，但不适合作为当前主题前置验收样本。

`3. 条件生效 / 需特定状态`

- `fg-sidebar-main` 中大量 `expanded / collapsed / manage-selected / marker-*` 变量，需切换展开态、管理态或文件管理模式才可观测
- `fg-main-content-image-name-list` 中 `selected` / `focused` / `hover` / `pressed` 已收敛为主路径；`row-hover-bg` 与 `body-bg` 仍属于次级链路
- `bullet` 组当前不便稳定复测，继续保留为后置项

#### 结构性问题（待后续收口）

1. 字段用途说明仍有较多“泛描述”，不足以指导人工验收；需补充“主消费点 / fallback / 预览前提”。
2. `fg-sidebar-main` 与 `fg-main-content-image-name-list` 当前状态拆分过细，存在“实现可调，但不适合作为首轮手工验收主路径”的变量组合。
3. 后续继续验收时，优先走“稳定主路径 -> 条件状态 -> 后置项”的顺序，避免把当前主题下本就弱命中的变量排在前面，放大误判成本。
4. `containerLayer` 基础层后续不再继续叠加旧 `legacy` 命名，而是改走 `docs/36-theme-container-frame-migration-plan-v1.md` 定义的“共享壳层 + 单容器 frame + visual transform”新结构；最终以新变量族替换旧变量与 alias。

### 7.0.2 残余链路清单（Phase 1 冻结结果）

| 区域                                                                                | 当前问题                                                                                                                                  | 现状归类 | 所属分页                              | 后续 Phase |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------- | ---------- |
| `MusicAudioTranscodePanel` / `VideoTranscodePanel` / `SidebarRenameDialog` 内部控件 | 已收口到 `--mpx-transcode-dialog-*` / `--mpx-sidebar-rename-dialog-*` / `--mpx-sidebar-rename-preview-*`                                  | 已完成   | `largePanelLayer` + `smallPanelLayer` | 已完成     |
| `6.1` 滚动条                                                                        | `ThemeParameterPanel` 已补齐 sidebar-tree scrollbar detail 字段；全局 `--mpx-scrollbar-*` 继续作为基础层，`sidebar-tree` 保留受控别名覆写 | 已完成   | `commonControls`                      | 已完成     |
| `6.2.1` / `6.2.3` slider                                                            | 设置页 slider groove 已拆到 `--mpx-slider-settings-groove-*`，与播放器 runway 轨道分离                                                    | 已完成   | `commonControls`                      | 已完成     |

冻结约束

1. 上表区域在后续收口前，禁止继续新增匿名硬编码视觉值。
2. 若必须临时新增变量，必须先登记到对应层级与分页，再落到 CSS。
3. 不允许继续新增“借用别的业务区域 token 家族”这种跨层链路。

### 7.0.3 特例白名单与命名空间

| 区域                           | 命名空间前缀                                   | 当前状态                             | 不并入当前通用分页的原因                                       | 后续约束                             |
| ------------------------------ | ---------------------------------------------- | ------------------------------------ | -------------------------------------------------------------- | ------------------------------------ |
| 播放器面板 / HUD / popover     | `--mpx-player-surface-*`、`--mpx-player-hud-*` | 已在 contract / palette 中存在       | 属于播放器子系统，视觉语义与普通面板不同                       | 继续保持独立语义，不回退到匿名类色值 |
| 全屏图像调整（levels / curve） | `--mpx-fs-image-adjust-*`（预留）              | Phase 1 先冻结命名空间，暂未全量落地 | 图示语义强，不适合强并入 `commonControls` 或 `largePanelLayer` | 后续若参数化，优先落到该前缀         |
| 广告审核删除 overlay           | `--mpx-ad-review-overlay-*`                    | 本次已统一为受控前缀                 | 属于舞台化演出层，不适合并入常规面板 token                     | 保持独立前缀，允许少量结构化复合值   |

### 7.0.4 Phase 1 结论

1. 文档层已建立“层级 -> 语义 token -> slot token / data-slot -> 消费点 -> ThemeParameter 分页”的对照基线。
2. Phase 2 起重点不再是继续铺大层，而是补齐上表列出的半成品链路与内部件收口。
3. Phase 3 的 theme schema 只接收已经完成 Phase 1 / Phase 2 对照的字段，不再接收匿名 CSS 例外项。

### 7.0.5 Phase 1-5 完成状态（2026-03-09）

本轮 Theme System 优化已完成 `Phase 1 -> Phase 5`，当前状态如下：

| Phase | 范围 | 结果 |
|------|------|------|
| 1 | Theme 层 `@layer` 架构 | 已完成：`contract / palette / theme-style` 全部进入显式 layer |
| 2 | App 层 `@layer` + `!important` 清零 | 已完成：`src/styles/` 与 `src/components/subtitles.css` 中 `!important` 为 0 |
| 3 | Settings 内部件三级派生 | 已完成：`--mpx-settings-*` 已接入 ThemeParameter |
| 4 | Metadata 内部件三级派生 | 已完成：`--mpx-metadata-*` 已接入 ThemeParameter |
| 5 | Main 内容区 + 硬编码清理 | 已完成：`--mpx-main-image-name-list-*`、`--mpx-music-vis-*`、`--mpx-music-ctrl-*`、`--mpx-video-screen-bg`、`--mpx-ad-review-overlay-*`、`--mpx-rating-heart-*` 已收口 |

补充说明：

1. `containerLayer` 当前已覆盖：`2.0` 共享壳层、`2.1` Header、`2.2` Sidebar、`2.2.2.1 fg-sidebar-main`、`2.3` Main、`2.3.2.1` 工作区缩略图模式（缩略图容器 / 缩略图样式）、`2.3.2.2 fg-main-content-image-name-list`、`2.3.2.3` 工作区预览模式（视频 / 音乐）、`2.4` Metadata、`2.4.2.1` 评价组件、`2.4.2.2` Metadata 内部件。
2. `largePanelLayer` 当前已覆盖的内部件：Settings、Import Task、Metadata Fetch、Metadata Feature Tag Picker、Subtitle Cleanup、Transcode Dialog、Sidebar Rename Preview；`Metadata Preference Record` 与 `Metadata Booklet Binding` 已回归 `containerLayer > Metadata`。
3. Main 区硬编码色清理结论：
   - `music-visualizer HUD`、`video screen`、`ad-review overlay`、`rating heart`、`subtitle overlay` 已切回语义 token；当前 ThemeParameter 位置分配为 `preview / thumbnail style / metadata rating` 三处。
   - `layout.part3.css` 中 `#000 / #fff / #111 / #777 / #f6f8fa` 保留为 color picker 功能性标定色，不纳入通用视觉 token。

验收状态：

| 项目 | 当前状态 |
|------|----------|
| `@layer` 迁移 | 已完成 |
| `!important` 清零 | 已完成 |
| Settings / Metadata / Main 内部件 token 化 | 已完成 |
| ThemeParameter 分页接入 | 已完成 |
| 快照导入 / 导出字段同步 | 已完成 |
