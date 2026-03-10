# Token Design（稳定路径 -> Token 前缀）

## 规则

| 项              | 规则                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| Token 前缀基线  | `--mpx-slot-<path>-*`                                                                                   |
| path 生成       | 稳定路径按 `.` 拆分后用 `-` 连接                                                                        |
| 命名归一化      | 段内 `camelCase` 转 `kebab-case`（如 `importMenu` -> `import-menu`）                                    |
| token 落地方式  | 具体 token 在前缀后追加语义后缀（如 `bg` / `text` / `border` / `shadow` / `gap`）                       |
| 按钮层 4.0 例外 | 全局按钮基架/变体不走 slot 前缀：`--mpx-btn-core-*`、`--mpx-btn-variant-<name>-*`                       |
| 按钮层局部覆盖  | 业务按钮的局部覆盖仍走 slot 前缀（`--mpx-slot-<path>-*`），并回落到 `variant/core`                      |
| 示例            | `fg.main.content.video.controls.volume.pop` -> `--mpx-slot-fg-main-content-video-controls-volume-pop-*` |

## 按钮层 4.0 命名索引

| 层级          | 命名模式                                 | 说明                                                   |
| ------------- | ---------------------------------------- | ------------------------------------------------------ |
| Core          | `--mpx-btn-core-<semantic>`              | 按钮基础语义层（颜色、阴影、变换、危险态）             |
| Variant       | `--mpx-btn-variant-<variant>-<semantic>` | 按钮变体层（如 `default` / `player` / `overlay-cell`） |
| Slot override | `--mpx-slot-<path>-<semantic>`           | 业务路径局部覆写，最终映射到 variant/core              |

示例（ThemeParameter side 按钮，现归 `largePanelLayer > 3.5`）
`--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-bg`
`-> --mpx-btn-variant-theme-parameter-side-bg-idle`
`-> --mpx-btn-variant-default-bg-idle`

说明
1. `buttonStates` 页主验收 `--mpx-btn-variant-default-*`、`--mpx-btn-variant-player-*`、`--mpx-btn-variant-overlay-cell-*` 与代表性 `slot override`。
2. ThemeParameter side 的 slot 特化不再占用 `buttonStates` 主页面，而是在 `largePanelLayer > 3.5 Button 按钮总控` 验收。
3. 按钮层 4.0 的具体变量和值，请同步查看 `docs/32-ui-design-tracking-v1.md` 的 `4.0 按钮层（基架）`。

## 文件列表层 6.3 命名索引

| 层级            | 命名模式                               | 说明                                                       |
| --------------- | -------------------------------------- | ---------------------------------------------------------- |
| Common baseline | `--mpx-file-list-<semantic>`           | 文件列表通用基线，供 Main 与 Metadata 两条列表链路共同回退 |
| Main override   | `--mpx-main-image-name-list-<semantic>` | Main 文件列表本地特化，覆盖 image/music 共用列表            |
| Metadata override | `--mpx-metadata-file-list-<semantic>` | Metadata 文件列表本地特化，覆盖 video/music 共用列表        |
| Slot override   | `--mpx-slot-fg-main-content-image-name-list-<semantic>` | Main image 名单模式旧链路 slot 覆写，仍可压过 Main override |

示例（Main 文件列表）
`--mpx-slot-fg-main-content-image-name-list-row-main-hover-bg`
`-> --mpx-main-image-name-list-row-main-hover-bg`
`-> --mpx-file-list-row-main-hover-bg`

## 文件列表 6.3 命名索引

| 层级 | 命名模式 | 说明 |
| --- | --- | --- |
| Source | `--mpx-file-list-<semantic>` | 文件列表通用源头；`6.3` 负责调试这层 |
| Main derived | `--mpx-main-image-name-list-<semantic>` | Main 文件列表派生层（image/music） |
| Metadata derived | `--mpx-metadata-file-list-<semantic>` | Metadata 文件列表派生层（video/music） |
| Slot override | `--mpx-slot-fg-main-content-image-name-list-<semantic>` | Main 文件列表旧 slot 覆写；最终仍压到派生层之上 |

示例（Main / Metadata 都回落到 6.3）
`--mpx-main-image-name-list-row-main-hover-bg -> --mpx-file-list-row-main-hover-bg`
`--mpx-metadata-file-list-row-main-hover-bg -> --mpx-file-list-row-main-hover-bg`

## Import Task（3.10）补充

`fg.header.g1.task.importTask.panel` 在实现层使用 `data-slot="fg-import-task-root"`。
3.10 起，推荐调节变量语义如下：

1. 遮罩层链路：`--mpx-slot-fg-import-task-ovl-bg/ovl-text`
2. 面板外框链路：`--mpx-slot-fg-import-task-root-border/bg/shadow/head-*/main-*`
3. 状态线链路：`--mpx-slot-fg-import-task-root-status-border/status-text`
4. 子块 slot 链路：
   - `--mpx-slot-fg-import-task-error-border/bg/text`
   - `--mpx-slot-fg-import-task-hint-border/bg/text`
   - `--mpx-slot-fg-import-task-review-notice-border/bg/text`
   - `--mpx-slot-fg-import-task-hash-log-list-border/bg/text`
5. 子块语义链路：
   - `--mpx-import-task-error-border/bg/text`
   - `--mpx-import-task-hint-border/bg/text`
   - `--mpx-import-task-review-notice-border/bg/text`
   - `--mpx-import-task-hash-log-border/bg/text`

## Metadata Fetch（3.5）补充

`fg.main.toolbar.image.metadataFetch.panel` 在实现层使用 `data-slot="fg-main-header-image-metadata-fetch-panel"`。

1. 搜索行 / 控件链路：
   - slot：`--mpx-slot-fg-main-header-image-metadata-fetch-panel-control-*`
   - semantic：`--mpx-metadata-fetch-control-*`
2. 结果区链路：
   - slot：`--mpx-slot-fg-main-header-image-metadata-fetch-panel-results-*`
   - semantic：`--mpx-metadata-fetch-results-*`
   - 头部 / 表体补充：`head-inner-*`、`body-bg`、`result-meta-text`、`result-hover-text`
   - Typography：`head-inner-font-size`、`head-inner-font-family`
3. 预览区链路：
   - slot：`--mpx-slot-fg-main-header-image-metadata-fetch-panel-preview-*`
   - semantic：`--mpx-metadata-fetch-preview-*`

## Subtitle Cleanup（3.7）补充

`fg.main.toolbar.manage.subtitleCleanup.panel` 在实现层使用 `data-slot="fg-main-header-manage-subtitle-cleanup-panel"`。

1. Raw Preview 链路：
   - slot：`--mpx-slot-fg-main-header-manage-subtitle-cleanup-raw-preview-panel-*`
   - semantic：`--mpx-subtitle-cleanup-raw-preview-*`
2. Clean Preview 链路：
   - slot：`--mpx-slot-fg-main-header-manage-subtitle-cleanup-clean-preview-panel-*`
   - semantic：`--mpx-subtitle-cleanup-clean-preview-*`

## Phase 1 冻结补充

1. ThemeParameter 分页归属遵循 `docs/32-ui-design-tracking-v1.md` 的 `7.0.1`：
   - 通用参数与 style 参数入口 -> `parameters`
   - 快照导入 / 导出 / 复位 -> `snapshot`
   - 大容器与其已收口子层 -> `containerLayer`
   - 大面板骨架与内部件 -> `largePanelLayer`
   - 小面板骨架 -> `smallPanelLayer`
   - 按钮基架 -> `buttonStates`
   - 滚动条 / slider / runway -> `commonControls`
2. 下列实现别名在 Phase 3 之前视为受控保留，不视为违规：
   - `fg.header.g1.task.importTask.*` 的实现别名家族：`--mpx-slot-fg-import-task-*`
   - `fg.sidebar.main` 的语义家族：`--mpx-sidebar-main-*`
   - `fg.main.content.image.nameList*` 的语义家族：`--mpx-main-image-name-list-*`
   - 滚动条基础层与场景别名并存：`--mpx-scrollbar-*` + `--mpx-sidebar-tree-scrollbar-*`
   - 设置 slider 独立轨道：`--mpx-slider-settings-groove-*`（不再借用 `--mpx-runway-groove-*`）
3. 特例白名单前缀：
   - 播放器子系统：`--mpx-player-surface-*`、`--mpx-player-hud-*`
   - 全屏图像调整：`--mpx-fs-image-adjust-*`（Phase 1 预留）
   - 广告审核删除 overlay：`--mpx-ad-review-overlay-*`

## Settings 内部件（3.10.0）补充

`fg.header.g1.settings.root.panel` 的 side / main / group / item 语义统一收口到 `--mpx-settings-*`。

1. Side 导航链路：
   - `--mpx-settings-side-bg`
   - `--mpx-settings-side-text`
   - `--mpx-settings-side-item-bg`
   - `--mpx-settings-side-item-hover-bg`
   - `--mpx-settings-side-item-active-bg`
   - `--mpx-settings-side-item-active-text`
   - `--mpx-settings-side-border`
2. Main 内容区链路：
   - `--mpx-settings-main-bg`
   - `--mpx-settings-main-text`
   - `--mpx-settings-main-border`
3. Group / Item 链路：
   - `--mpx-settings-group-border`
   - `--mpx-settings-group-head-text`
   - `--mpx-settings-group-head-bg`
   - `--mpx-settings-item-label-text`
   - `--mpx-settings-item-value-text`
   - `--mpx-settings-item-input-bg`
   - `--mpx-settings-item-input-border`
4. Danger 操作链路：
   - `--mpx-settings-danger-btn-bg`
   - `--mpx-settings-danger-btn-border`
   - `--mpx-settings-danger-btn-text`

## Metadata 内部件（2.4.2）补充

Metadata 主面板 body / edit-grid / preference-record / tag 编辑区语义统一收口到 `--mpx-metadata-*`。

1. Body 链路：
   - `--mpx-metadata-body-bg`
   - `--mpx-metadata-body-text`
   - `--mpx-metadata-section-border`
   - `--mpx-metadata-section-label-text`
2. Edit-grid 链路：
   - `--mpx-metadata-edit-label-text`
   - `--mpx-metadata-edit-value-text`
   - `--mpx-metadata-edit-value-bg`
   - `--mpx-metadata-edit-value-border`
3. Preference-record 链路：
   - `--mpx-metadata-pref-card-bg`
   - `--mpx-metadata-pref-card-border`
   - `--mpx-metadata-pref-card-text`
4. Tag 编辑区链路：
   - `--mpx-metadata-tag-editor-bg`
   - `--mpx-metadata-tag-editor-border`
   - `--mpx-metadata-tag-item-bg`
   - `--mpx-metadata-tag-item-text`

兼容说明：既有 `--mpx-metadata-preference-record-*` 与 `--mpx-metadata-feature-tag-picker-*` 当前默认回落到上述新语义 token。

## Main 区域 / 覆盖层（2.3.2）补充

Main 内容区在 Phase 5 新增以下语义 token，用于收口 video / music / overlay / rating 残留硬编码色。ThemeParameter 当前分组归属为：`--mpx-workspace-*` 与 `--mpx-ad-review-overlay-*` 落在 `2.3.2.1 工作区 缩略图模式`，`--mpx-thumbnail-card-*` 落在 `6.4 缩略图卡片样式（总控）`，`--mpx-image-grid-card-*` / `--mpx-video-grid-card-*` 作为 `2.3.2.1` image/video 局部覆写，`--mpx-music-vis-*` / `--mpx-music-ctrl-*` / `--mpx-video-screen-bg` 落在 `2.3.2.3 工作区 预览模式`，`--mpx-rating-heart-*` 落在 `2.4.2.1 评价组件`。

1. Music visualizer / shader 控件链路：
    - `--mpx-music-vis-text`
    - `--mpx-music-vis-hud-bg`
    - `--mpx-music-vis-hud-text`
    - `--mpx-music-vis-hud-border`
    - `--mpx-music-vis-error-bg`
    - `--mpx-music-vis-error-border`
    - `--mpx-music-ctrl-focus-color`
    - `--mpx-music-ctrl-range-fill`
    - `--mpx-range-fill-progress`
    - `--mpx-music-ctrl-toggle-bg`
2. Video screen / fullscreen 背景链路：
    - `--mpx-video-screen-bg`
    - `--mpx-workspace-surface-shadow`
3. 广告审核删除 overlay 链路：
   - `--mpx-ad-review-overlay-stage-bg`
   - `--mpx-ad-review-overlay-card-bg`
   - `--mpx-ad-review-overlay-card-border`
   - `--mpx-ad-review-overlay-card-shadow`
   - `--mpx-ad-review-overlay-text-main`
   - `--mpx-ad-review-overlay-text-sub`
   - `--mpx-ad-review-overlay-text-hint`
   - `--mpx-ad-review-overlay-track-bg`
   - `--mpx-ad-review-overlay-track-start`
   - `--mpx-ad-review-overlay-track-mid`
   - `--mpx-ad-review-overlay-track-end`
4. Rating heart 链路：
   - `--mpx-rating-heart-color`
   - `--mpx-rating-heart-active-color`

## 容器 frame / spacing 补充

### 共享壳层与单容器 frame

1. 四大容器共享壳层统一使用 `--mpx-container-frame-*`：
   - `--mpx-container-frame-fill-start/end/angle/fill`
   - `--mpx-container-frame-edge-color`
   - `--mpx-container-frame-border-color`
   - `--mpx-container-frame-shadow`
   - `--mpx-container-frame-radius`
2. 单容器 frame 覆写统一使用 `--mpx-header-*`、`--mpx-sidebar-*`、`--mpx-main-*`、`--mpx-metadata-*`。
3. 单容器 visual transform 统一使用 `--mpx-<container>-frame-*`：
   - `translate-x / translate-y`
   - `rotate-x / rotate-y / rotate-z`
   - `scale-x / scale-y`
   - `origin-x / origin-y`
   - `perspective / transform-style / backface-visibility`

### Header 浮动间距

1. Header 根层布局间隙统一使用 `--mpx-header-floating-gap`。
2. `--mpx-header-floating-gap` 属于布局层 spacing，不属于单容器 frame transform。
3. `fg.header.root` 的 margin 已直接消费 `--mpx-header-floating-gap`，不再保留独立 slot margin fallback。
4. `fg.sysinfo.root` 的 margin 已独立消费 `--mpx-sysinfo-root-margin`，默认值为 `0px`，不再跟随 Header。
5. `sysinfo-card` 的视觉骨架已并入大面板体系，当前直接消费：
   - `--mpx-large-panel-main-border-width`
   - `--mpx-large-panel-main-border-color`
   - `--mpx-large-panel-main-bg`
   - `--mpx-large-panel-main-radius`
   - `--mpx-large-panel-shadow`

## 稳定路径到 Token 前缀

| 稳定路径                                          | Token 前缀                                                       |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| `bg.app.*`                                        | `--mpx-slot-bg-app-*-*`                                          |
| `bg.app.root`                                     | `--mpx-slot-bg-app-root-*`                                       |
| `bg.app.workspace`                                | `--mpx-slot-bg-app-workspace-*`                                  |
| `fg.header.root`                                  | `--mpx-slot-fg-header-root-*`                                    |
| `fg.sidebar.root`                                 | `--mpx-slot-fg-sidebar-root-*`                                   |
| `fg.main.root`                                    | `--mpx-slot-fg-main-root-*`                                      |
| `fg.meta.root`                                    | `--mpx-slot-fg-meta-root-*`                                      |
| `fs.layer.root`                                   | `--mpx-slot-fs-layer-root-*`                                     |
| `fg.app.dragImport.ovl`                           | `--mpx-slot-fg-app-drag-import-ovl-*`                            |
| `fg.app.tooltip.ovl`                              | `--mpx-slot-fg-app-tooltip-ovl-*`                                |
| `fg.header.logo`                                  | `--mpx-slot-fg-header-logo-*`                                    |
| `fg.header.logo.importMenu.panel`                 | `--mpx-slot-fg-header-logo-import-menu-panel-*`                  |
| `fg.header.logo.state.idle`                       | `--mpx-slot-fg-header-logo-state-idle-*`                         |
| `fg.header.logo.state.busy`                       | `--mpx-slot-fg-header-logo-state-busy-*`                         |
| `fg.header.logo.state.open`                       | `--mpx-slot-fg-header-logo-state-open-*`                         |
| `fg.header.g1`                                    | `--mpx-slot-fg-header-g1-*`                                      |
| `fg.header.g1.panelToggles`                       | `--mpx-slot-fg-header-g1-panel-toggles-*`                        |
| `fg.header.g1.toggle.sidebar`                     | `--mpx-slot-fg-header-g1-toggle-sidebar-*`                       |
| `fg.header.g1.toggle.metadata`                    | `--mpx-slot-fg-header-g1-toggle-metadata-*`                      |
| `fg.header.g1.task.importTask.panel`              | `--mpx-slot-fg-header-g1-task-import-task-panel-*`               |
| `fg.header.g1.task.importTask.ovl`                | `--mpx-slot-fg-header-g1-task-import-task-ovl-*`                 |
| `fg.header.g1.task.importTask.error.panel`        | `--mpx-slot-fg-header-g1-task-import-task-error-panel-*`         |
| `fg.header.g1.task.importTask.hint.panel`         | `--mpx-slot-fg-header-g1-task-import-task-hint-panel-*`          |
| `fg.header.g1.task.importTask.reviewNotice.panel` | `--mpx-slot-fg-header-g1-task-import-task-review-notice-panel-*` |
| `fg.header.g1.task.importTask.hashLogList.panel`  | `--mpx-slot-fg-header-g1-task-import-task-hash-log-list-panel-*` |
| `fg.header.g1.palette`                            | `--mpx-slot-fg-header-g1-palette-*`                              |
| `fg.header.g1.settings`                           | `--mpx-slot-fg-header-g1-settings-*`                             |
| `*.settings.root.*`                               | `--mpx-slot-*-settings-root-*-*`                                 |
| `fg.header.g1.settings.root.ovl`                  | `--mpx-slot-fg-header-g1-settings-root-ovl-*`                    |
| `fg.header.g1.settings.root.panel`                | `--mpx-slot-fg-header-g1-settings-root-panel-*`                  |
| `*.shortcutEdit.*`                                | `--mpx-slot-*-shortcut-edit-*-*`                                 |
| `fg.header.g1.settings.shortcutEdit.ovl`          | `--mpx-slot-fg-header-g1-settings-shortcut-edit-ovl-*`           |
| `fg.header.g1.settings.shortcutEdit.panel`        | `--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-*`         |
| `fg.header.g1.settings.shortcutCapture.ovl`       | `--mpx-slot-fg-header-g1-settings-shortcut-capture-ovl-*`        |
| `fg.header.g1.settings.shortcutCapture.panel`     | `--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-*`      |
| `fg.header.g2`                                    | `--mpx-slot-fg-header-g2-*`                                      |
| `fg.header.g2.mode.image`                         | `--mpx-slot-fg-header-g2-mode-image-*`                           |
| `fg.header.g2.mode.video`                         | `--mpx-slot-fg-header-g2-mode-video-*`                           |
| `fg.header.g2.mode.music`                         | `--mpx-slot-fg-header-g2-mode-music-*`                           |
| `fg.header.g2.musicQuick`                         | `--mpx-slot-fg-header-g2-music-quick-*`                          |
| `fg.header.gDebug`                                | `--mpx-slot-fg-header-g-debug-*`                                 |
| `fg.header.gDebug.tooltips`                       | `--mpx-slot-fg-header-g-debug-tooltips-*`                        |
| `fg.header.gDebug.nativeChrome`                   | `--mpx-slot-fg-header-g-debug-native-chrome-*`                   |
| `fg.header.gDebug.themeParameter`                 | `--mpx-slot-fg-header-g-debug-theme-parameter-*`                 |
| `fg.header.g3`                                    | `--mpx-slot-fg-header-g3-*`                                      |
| `fg.header.g3.popoverDebugPin`                    | `--mpx-slot-fg-header-g3-popover-debug-pin-*`                    |
| `fg.header.g3.themeParameter`                     | `--mpx-slot-fg-header-g3-theme-parameter-*`                      |
| `fg.header.g3.themeParameter.root.ovl`            | `--mpx-slot-fg-header-g3-theme-parameter-root-ovl-*`             |
| `fg.header.g3.themeParameter.root.panel`          | `--mpx-slot-fg-header-g3-theme-parameter-root-panel-*`           |
| `fg.header.g3.help`                               | `--mpx-slot-fg-header-g3-help-*`                                 |
| `fg.header.g3.help.root.ovl`                      | `--mpx-slot-fg-header-g3-help-root-ovl-*`                        |
| `fg.header.g3.help.root.panel`                    | `--mpx-slot-fg-header-g3-help-root-panel-*`                      |
| `fg.header.g3.help.root.buttonOverlay.ovl`        | `--mpx-slot-fg-header-g3-help-root-button-overlay-ovl-*`         |
| `fg.header.g3.window.min`                         | `--mpx-slot-fg-header-g3-window-min-*`                           |
| `fg.header.g3.window.maxrestore`                  | `--mpx-slot-fg-header-g3-window-maxrestore-*`                    |
| `fg.header.g3.window.close`                       | `--mpx-slot-fg-header-g3-window-close-*`                         |

Header containerLayer 下钻补充（2026-03）：

- Header 按钮总控：`--mpx-slot-fg-header-button-border/bg/text`
- Header logo：`--mpx-slot-fg-header-logo-border/bg/text`
- Header g1：`--mpx-slot-fg-header-g1-border/bg/text`
- Header g2 总控当前使用实际 mode 链：`--mpx-slot-fg-header-g2-mode-border/bg/text`
- Header gDebug：`--mpx-slot-fg-header-g-debug-border/bg/text`
- Header g3：`--mpx-slot-fg-header-g3-border/bg/text`

| `fg.sysinfo.root` | `--mpx-slot-fg-sysinfo-root-*` |
| `fg.sysinfo.backendError` | `--mpx-slot-fg-sysinfo-backend-error-*` |
| `fg.sysinfo.runtimeWarning` | `--mpx-slot-fg-sysinfo-runtime-warning-*` |
| `fg.sidebar.expand` | `--mpx-slot-fg-sidebar-expand-*` |
| `fg.sidebar.toolbar` | `--mpx-slot-fg-sidebar-toolbar-*` |
| `fg.sidebar.toolbar.title` | `--mpx-slot-fg-sidebar-toolbar-title-*` |
| `fg.sidebar.toolbar.back` | `--mpx-slot-fg-sidebar-toolbar-back-*` |
| `fg.sidebar.toolbar.clear` | `--mpx-slot-fg-sidebar-toolbar-clear-*` |
| `fg.sidebar.toolbar.labelModeToggle` | `--mpx-slot-fg-sidebar-toolbar-label-mode-toggle-*` |
| `fg.sidebar.toolbar.collapseAll` | `--mpx-slot-fg-sidebar-toolbar-collapse-all-*` |
| `fg.sidebar.toolbar.prevImageParent` | `--mpx-slot-fg-sidebar-toolbar-prev-image-parent-*` |
| `fg.sidebar.toolbar.nextImageParent` | `--mpx-slot-fg-sidebar-toolbar-next-image-parent-*` |
| `fg.sidebar.toolbar.rootToggle` | `--mpx-slot-fg-sidebar-toolbar-root-toggle-*` |
| `fg.sidebar.main` | `--mpx-slot-fg-sidebar-main-*` |
| `fg.sidebar.main.label` | `--mpx-slot-fg-sidebar-main-label-*` |
| `fg.sidebar.shortcut.rename.batch.ovl` | `--mpx-slot-fg-sidebar-shortcut-rename-batch-ovl-*` |
| `fg.sidebar.shortcut.rename.batch.panel` | `--mpx-slot-fg-sidebar-shortcut-rename-batch-panel-*` |
| `fg.sidebar.shortcut.rename.single.ovl` | `--mpx-slot-fg-sidebar-shortcut-rename-single-ovl-*` |
| `fg.sidebar.shortcut.rename.single.panel` | `--mpx-slot-fg-sidebar-shortcut-rename-single-panel-*` |
| `fg.sidebar.footer` | `--mpx-slot-fg-sidebar-footer-*` |

Sidebar header 下钻补充（2026-03）：

- Header 根：`--mpx-slot-fg-sidebar-header-bg/border/text`
- Header 按钮总控：`--mpx-slot-fg-sidebar-header-button-border/bg/text`
- Header title：`--mpx-slot-fg-sidebar-header-title-border/bg/text`
- Header 其余按钮总控：`--mpx-slot-fg-sidebar-header-action-border/bg/text`

| `fg.main.toolbar` | `--mpx-slot-fg-main-toolbar-*` |
| `fg.main.toolbar.state.manage` | `--mpx-slot-fg-main-toolbar-state-manage-*` |
| `fg.main.toolbar.state.metadata` | `--mpx-slot-fg-main-toolbar-state-metadata-*` |
| `fg.main.toolbar.state.normal` | `--mpx-slot-fg-main-toolbar-state-normal-*` |
| `fg.main.toolbar.manage.groupName.ovl` | `--mpx-slot-fg-main-toolbar-manage-group-name-ovl-*` |
| `fg.main.toolbar.manage.groupName.panel` | `--mpx-slot-fg-main-toolbar-manage-group-name-panel-*` |
| `fg.main.toolbar.manage.deleteConfirm.ovl` | `--mpx-slot-fg-main-toolbar-manage-delete-confirm-ovl-*` |
| `fg.main.toolbar.manage.deleteConfirm.panel` | `--mpx-slot-fg-main-toolbar-manage-delete-confirm-panel-*` |
| `fg.main.toolbar.manage.videoTranscode.ovl` | `--mpx-slot-fg-main-toolbar-manage-video-transcode-ovl-*` |
| `fg.main.toolbar.manage.videoTranscode.panel` | `--mpx-slot-fg-main-toolbar-manage-video-transcode-panel-*` |
| `fg.main.toolbar.manage.musicTranscode.ovl` | `--mpx-slot-fg-main-toolbar-manage-music-transcode-ovl-*` |
| `fg.main.toolbar.manage.musicTranscode.panel` | `--mpx-slot-fg-main-toolbar-manage-music-transcode-panel-*` |
| `fg.main.content.image.grid` | `--mpx-slot-fg-main-content-image-grid-*` |
| `fg.main.content.image.grid.card` | `--mpx-slot-fg-main-content-image-grid-card-*` |
| `fg.main.content.image.nodeGrid` | `--mpx-slot-fg-main-content-image-node-grid-*` |
| `fg.main.content.image.nodeGrid.card` | `--mpx-slot-fg-main-content-image-node-grid-card-*` |
| `fg.main.content.image.nameList` | `--mpx-slot-fg-main-content-image-name-list-*` |
| `fg.main.content.image.nameList.row` | `--mpx-slot-fg-main-content-image-name-list-row-*` |
| `fg.main.content.image.nameList.label` | `--mpx-slot-fg-main-content-image-name-list-label-*` |
| `fg.main.content.image.marquee.ovl` | `--mpx-slot-fg-main-content-image-marquee-ovl-*` |

Main / Metadata header 语义 token 补充（2026-03）：

- Main header root：`--mpx-main-header-fill-start/end/angle/bg/border-color`
- Main header 按钮总控：`--mpx-slot-fg-main-header-button-border/bg/text`
- Metadata header root：`--mpx-metadata-header-fill-start/end/angle/bg/border-color`
- Metadata header 按钮总控：`--mpx-slot-fg-meta-header-button-border/bg/text`
- 两者默认不再回退各自容器 fill，header 背景语义与容器背景解耦
  | `fg.main.toolbar.image.scale.control` | `--mpx-slot-fg-main-toolbar-image-scale-control-*` |
  | `fg.main.toolbar.image.scale.pop` | `--mpx-slot-fg-main-toolbar-image-scale-pop-*` |
  | `fg.main.toolbar.image.adReviewStrategy.pop` | `--mpx-slot-fg-main-toolbar-image-ad-review-strategy-pop-*` |
  | `fg.main.toolbar.image.adReviewProgress.pop` | `--mpx-slot-fg-main-toolbar-image-ad-review-progress-pop-*` |
  | `fg.main.toolbar.image.adReviewStart.ovl` | `--mpx-slot-fg-main-toolbar-image-ad-review-start-ovl-*` |
  | `fg.main.toolbar.image.adReviewStart.panel` | `--mpx-slot-fg-main-toolbar-image-ad-review-start-panel-*` |
  | `fg.main.toolbar.image.metadataFetch.ovl` | `--mpx-slot-fg-main-toolbar-image-metadata-fetch-ovl-*` |
  | `fg.main.toolbar.image.metadataFetch.panel` | `--mpx-slot-fg-main-toolbar-image-metadata-fetch-panel-*` |
  | `fg.main.toolbar.image.deleteProgress.ovl` | `--mpx-slot-fg-main-toolbar-image-delete-progress-ovl-*` |
  | `fg.main.toolbar.image.convert.ovl` | `--mpx-slot-fg-main-toolbar-image-convert-ovl-*` |
  | `fg.main.toolbar.image.convert.panel` | `--mpx-slot-fg-main-toolbar-image-convert-panel-*` |
  | `fg.main.content.video.preview` | `--mpx-slot-fg-main-content-video-preview-*` |
  | `fg.main.content.video.preview.screen` | `--mpx-slot-fg-main-content-video-preview-screen-*` |
  | `fg.main.content.video.preview.media` | `--mpx-slot-fg-main-content-video-preview-media-*` |
  | `fg.main.content.video.preview.cover` | `--mpx-slot-fg-main-content-video-preview-cover-*` |
  | `fg.main.content.video.preview.empty` | `--mpx-slot-fg-main-content-video-preview-empty-*` |
| `fg.main.content.video.preview.subtitle.ovl` | `--mpx-slot-fg-main-content-video-preview-subtitle-ovl-*` |
| `fg.main.content.video.grid` | `--mpx-slot-fg-main-content-video-grid-*` |
| `fg.main.content.video.grid.card` | `--mpx-slot-fg-main-content-video-grid-card-*` |
| `fg.main.content.video.controls` | `--mpx-slot-fg-main-content-video-controls-*` |
  | `fg.main.content.video.controls.progress` | `--mpx-slot-fg-main-content-video-controls-progress-*` |
  | `fg.main.content.video.controls.left` | `--mpx-slot-fg-main-content-video-controls-left-*` |
  | `fg.main.content.video.controls.center` | `--mpx-slot-fg-main-content-video-controls-center-*` |
  | `fg.main.content.video.controls.right` | `--mpx-slot-fg-main-content-video-controls-right-*` |
  | `fg.main.content.video.controls.fit.pop` | `--mpx-slot-fg-main-content-video-controls-fit-pop-*` |
  | `fg.main.content.video.controls.subtitle.pop` | `--mpx-slot-fg-main-content-video-controls-subtitle-pop-*` |
  | `fg.main.content.video.controls.speed.pop` | `--mpx-slot-fg-main-content-video-controls-speed-pop-*` |
  | `fg.main.content.video.controls.playlist.pop` | `--mpx-slot-fg-main-content-video-controls-playlist-pop-*` |
  | `fg.main.content.video.controls.volume.pop` | `--mpx-slot-fg-main-content-video-controls-volume-pop-*` |
  | `fg.main.toolbar.manage.subtitleCleanup.ovl` | `--mpx-slot-fg-main-toolbar-manage-subtitle-cleanup-ovl-*` |
  | `fg.main.toolbar.manage.subtitleCleanup.panel` | `--mpx-slot-fg-main-toolbar-manage-subtitle-cleanup-panel-*` |
  | `fg.main.toolbar.manage.subtitleCleanup.rawPreview.panel` | `--mpx-slot-fg-main-toolbar-manage-subtitle-cleanup-raw-preview-panel-*` |
  | `fg.main.toolbar.manage.subtitleCleanup.cleanPreview.panel` | `--mpx-slot-fg-main-toolbar-manage-subtitle-cleanup-clean-preview-panel-*` |
  | `fg.main.content.music.preview` | `--mpx-slot-fg-main-content-music-preview-*` |
  | `fg.main.content.music.preview.canvas.gpu` | `--mpx-slot-fg-main-content-music-preview-canvas-gpu-*` |
  | `fg.main.content.music.preview.canvas.cpu` | `--mpx-slot-fg-main-content-music-preview-canvas-cpu-*` |
  | `fg.main.content.music.nameList` | `--mpx-slot-fg-main-content-music-name-list-*` |
  | `fg.main.content.music.nameList.row` | `--mpx-slot-fg-main-content-music-name-list-row-*` |
  | `fg.main.content.music.preview.hud.ovl` | `--mpx-slot-fg-main-content-music-preview-hud-ovl-*` |
  | `fg.main.content.music.preview.fullscreenHotzone.ovl` | `--mpx-slot-fg-main-content-music-preview-fullscreen-hotzone-ovl-*` |
  | `fg.main.content.music.fullscreen.ovl` | `--mpx-slot-fg-main-content-music-fullscreen-ovl-*` |
  | `fg.main.content.music.controls` | `--mpx-slot-fg-main-content-music-controls-*` |
  | `fg.main.content.music.controls.fullscreenFloating.panel` | `--mpx-slot-fg-main-content-music-controls-fullscreen-floating-panel-*` |
  | `fg.main.content.music.controls.progress` | `--mpx-slot-fg-main-content-music-controls-progress-*` |
  | `fg.main.content.music.controls.left` | `--mpx-slot-fg-main-content-music-controls-left-*` |
  | `fg.main.content.music.controls.center` | `--mpx-slot-fg-main-content-music-controls-center-*` |
  | `fg.main.content.music.controls.right` | `--mpx-slot-fg-main-content-music-controls-right-*` |
  | `fg.main.content.music.controls.volume.pop` | `--mpx-slot-fg-main-content-music-controls-volume-pop-*` |
  | `fg.main.footer` | `--mpx-slot-fg-main-footer-*` |
  | `fg.main.footer.meta` | `--mpx-slot-fg-main-footer-meta-*` |
  | `fg.main.footer.pagination` | `--mpx-slot-fg-main-footer-pagination-*` |
  | `fg.meta.restore` | `--mpx-slot-fg-meta-restore-*` |
  | `fg.meta.toolbar` | `--mpx-slot-fg-meta-toolbar-*` |
  | `fg.meta.toolbar.g3` | `--mpx-slot-fg-meta-toolbar-g3-*` |
  | `fg.meta.toolbar.g3.search` | `--mpx-slot-fg-meta-toolbar-g3-search-*` |
  | `fg.meta.toolbar.g3.manage` | `--mpx-slot-fg-meta-toolbar-g3-manage-*` |
  | `fg.meta.toolbar.g3.metadata` | `--mpx-slot-fg-meta-toolbar-g3-metadata-*` |
  | `fg.meta.toolbar.g3.playlist` | `--mpx-slot-fg-meta-toolbar-g3-playlist-*` |
  | `fg.meta.toolbar.toggle` | `--mpx-slot-fg-meta-toolbar-toggle-*` |
  | `fg.meta.main` | `--mpx-slot-fg-meta-main-*` |
  | `fg.meta.main.imageEditor` | `--mpx-slot-fg-meta-main-image-editor-*` |
  | `fg.meta.main.imageEditor.preferenceMetrics.panel` | `--mpx-slot-fg-meta-main-image-editor-preference-metrics-panel-*` |
  | `fg.meta.main.videoEditor` | `--mpx-slot-fg-meta-main-video-editor-*` |
  | `fg.meta.main.videoEditor.preferenceMetrics.panel` | `--mpx-slot-fg-meta-main-video-editor-preference-metrics-panel-*` |
  | `fg.meta.main.videoEditor.playlistNameDialog.panel` | `--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-*` |
  | `fg.meta.main.musicEditor` | `--mpx-slot-fg-meta-main-music-editor-*` |
  | `fg.meta.main.musicEditor.bookletBinding.panel` | `--mpx-slot-fg-meta-main-music-editor-booklet-binding-panel-*` |
  | `fg.meta.main.search` | `--mpx-slot-fg-meta-main-search-*` |
  | `fg.meta.main.search.featureTagPicker.ovl` | `--mpx-slot-fg-meta-main-search-feature-tag-picker-ovl-*` |
  | `fg.meta.main.search.featureTagPicker.panel` | `--mpx-slot-fg-meta-main-search-feature-tag-picker-panel-*` |
  | `fg.meta.main.adReview` | `--mpx-slot-fg-meta-main-ad-review-*` |
  | `fg.meta.main.adReview.start.ovl` | `--mpx-slot-fg-meta-main-ad-review-start-ovl-*` |
  | `fg.meta.main.adReview.start.panel` | `--mpx-slot-fg-meta-main-ad-review-start-panel-*` |
  | `fg.meta.footer` | `--mpx-slot-fg-meta-footer-*` |
  | `bg.fs.mask` | `--mpx-slot-bg-fs-mask-*` |
  | `fs.layer.content` | `--mpx-slot-fs-layer-content-*` |
  | `fs.nondual.root` | `--mpx-slot-fs-nondual-root-*` |
  | `fs.dual.root` | `--mpx-slot-fs-dual-root-*` |
  | `fs.dual.pane.image` | `--mpx-slot-fs-dual-pane-image-*` |
  | `fs.dual.pane.video` | `--mpx-slot-fs-dual-pane-video-*` |
  | `fs.video.controls.shell` | `--mpx-slot-fs-video-controls-shell-*` |
  | `fs.video.controls.fit.pop` | `--mpx-slot-fs-video-controls-fit-pop-*` |
  | `fs.video.controls.subtitle.pop` | `--mpx-slot-fs-video-controls-subtitle-pop-*` |
  | `fs.video.controls.speed.pop` | `--mpx-slot-fs-video-controls-speed-pop-*` |
  | `fs.video.controls.playlist.pop` | `--mpx-slot-fs-video-controls-playlist-pop-*` |
  | `fs.video.controls.volume.pop` | `--mpx-slot-fs-video-controls-volume-pop-*` |
  | `fs.video.controls.hotzone.ovl` | `--mpx-slot-fs-video-controls-hotzone-ovl-*` |
  | `fs.video.controls.float.panel` | `--mpx-slot-fs-video-controls-float-panel-*` |
  | `fs.image.controls.shell` | `--mpx-slot-fs-image-controls-shell-*` |
  | `fs.image.controls.autoplay.pop` | `--mpx-slot-fs-image-controls-autoplay-pop-*` |
  | `fs.image.controls.zoom.pop` | `--mpx-slot-fs-image-controls-zoom-pop-*` |
  | `fs.image.controls.adjust.ovl` | `--mpx-slot-fs-image-controls-adjust-ovl-*` |
  | `fs.image.controls.adjust.panel` | `--mpx-slot-fs-image-controls-adjust-panel-*` |
  | `fs.image.convertPreview.panel` | `--mpx-slot-fs-image-convert-preview-panel-*` |
  | `fs.image.convertPreview.scale.pop` | `--mpx-slot-fs-image-convert-preview-scale-pop-*` |
  | `fs.image.convertPreview.format.pop` | `--mpx-slot-fs-image-convert-preview-format-pop-*` |
  | `fs.image.convertPreview.quality.pop` | `--mpx-slot-fs-image-convert-preview-quality-pop-*` |
  | `fs.image.convertPreview.splitter` | `--mpx-slot-fs-image-convert-preview-splitter-*` |
  | `fs.image.convertPreview.error.ovl` | `--mpx-slot-fs-image-convert-preview-error-ovl-*` |
  | `boot.splash.window` | `--mpx-slot-boot-splash-window-*` |
  | `boot.splash.root` | `--mpx-slot-boot-splash-root-*` |
  | `boot.splash.stage` | `--mpx-slot-boot-splash-stage-*` |
  | `boot.splash.stage.cardStage` | `--mpx-slot-boot-splash-stage-card-stage-*` |
  | `boot.splash.stage.character` | `--mpx-slot-boot-splash-stage-character-*` |
  | `boot.splash.card` | `--mpx-slot-boot-splash-card-*` |
  | `boot.splash.card.track` | `--mpx-slot-boot-splash-card-track-*` |

## Phase 2 补充（2026-03-06）

- `fg.meta.main.imageEditor.preferenceMetrics.panel` 与 `fg.meta.main.videoEditor.preferenceMetrics.panel` 额外承载 `border / bg / text / summary-text / hint-text / field-border / field-bg / field-text` 后缀，消费 `--mpx-metadata-preference-record-*`；ThemeParameter 归属 `containerLayer > Metadata`。
- `fg.meta.main.musicEditor.bookletBinding.panel` 额外承载 `border / bg / text / meta-text / control-border / control-bg / control-text` 后缀，消费 `--mpx-metadata-booklet-binding-*`；ThemeParameter 归属 `containerLayer > Metadata`。
- `fg.meta.main.search.featureTagPicker.panel` 额外承载 `hint-text / group-key-text / popover-* / tag-*` 后缀，消费 `--mpx-metadata-feature-tag-picker-*`。
- `fg.meta.main.videoEditor.playlistNameDialog.panel` 额外承载 `input-border / input-bg / input-text / input-placeholder / text` 后缀，消费 `--mpx-metadata-playlist-name-dialog-*`。
- `fg.main.toolbar.manage.musicTranscode.panel` 与 `fg.main.toolbar.manage.videoTranscode.panel` 额外承载 `control-* / action-btn-*` 后缀，消费 `--mpx-transcode-dialog-*`。
- `fg.sidebar.shortcut.rename.single.panel` 额外承载 `input-* / action-btn-* / text / muted-text` 后缀，`fg.sidebar.shortcut.rename.batch.panel`（实现层 `fg-sidebar-shortcut-rename-panel`）额外承载 `control-* / action-btn-* / preview-* / text / muted-text` 后缀，分别消费 `--mpx-sidebar-rename-dialog-*` 与 `--mpx-sidebar-rename-preview-*`。

## Phase 2 补充（2026-03-08）

- 小面板 root 骨架从单一 `bg` 改为 `fill-start / fill-end / fill-angle` 三件套；`--mpx-dialog-panel-bg` 不再在 `:root` 预合成，而是下沉到 `.mpx-dialog-panel` / `.settings-floating-panel` 元素级消费层生成，避免 slot 覆写被继承的已解析 gradient 吞掉。
- `fg.header.g1.settings.shortcutEdit.panel`、`fg.header.g1.settings.shortcutCapture.panel`、`fg.main.header.manage.groupName.panel`、`fg.main.header.manage.deleteConfirm.panel`、`fg.main.header.image.convert.panel`、`fg.main.header.image.adReviewStart.panel`、`fg.meta.main.adReviewStart.panel`、`fg.meta.main.videoEditor.playlistNameDialog.panel`、`fg.sidebar.shortcut.rename.single.panel` 均新增 `fill-start / fill-end / fill-angle` 后缀，统一按 `root 总控 -> slot 分控 -> 个别覆写` 链路消费。
- `fg.sidebar.shortcut.rename.single.panel` 在 ThemeParameter 小面板页只保留 `border / fill-start / fill-end / fill-angle / shadow`；共享内部件统一并入大面板内部件页，通过 `--mpx-sidebar-rename-dialog-*` 调试。

## 变更约束

| 变更类型     | 必做动作                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| 新增 UI 槽位 | 先在 `10-ui_definition.md` 增加稳定路径，再在本文件增加对应 Token 前缀行 |
| 修改稳定路径 | 同步修改两张表中的路径与前缀；禁止只改其一                               |
| 删除 UI 槽位 | 两张表同时删除；若需兼容，先标记 deprecated 并给迁移窗口                 |
