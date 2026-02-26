# UI Definition（稳定路径映射）

## 约定

| 稳定路径 | 当前实现锚点 | 唯一标识（拟定） | 出现条件 | 说明 | 其他 |
|---|---|---|---|---|---|
| `命名规则.layers` | `src/components/AppShell.tsx` | `-` | always | 顶层层级：`boot` / `bg` / `fg` / `fs` | `fg` 同级固定为 `header/sysinfo/sidebar/main/meta` |
| `命名规则.order` | 全局约定 | `-` | always | 保持“旧定义骨架优先”，新增项挂到所属语义位置 | 不再单独维护交互层章节 |
| `命名规则.interaction_suffix` | 全局约定 | `-` | always | 交互后缀统一：`.panel` / `.pop` / `.ovl` | 例如：`fg.header.logo.importMenu.panel` |
| `命名规则.trigger_attach` | 全局约定 | `-` | always | 交互路径必须绑定触发语义路径 | 禁止 `panel.xxx` / `pop.xxx` / `ovl.xxx` 前缀写法 |
| `命名规则.empty_slot` | 全局约定 | `-` | always | 允许预留空槽位 | 未实现也保留稳定路径 |

## 1. Core Layers

| 稳定路径 | 当前实现锚点 | 唯一标识（拟定） | 出现条件 | 说明 | 其他 |
|---|---|---|---|---|---|
| `bg.app.root` | `div.app` | `data-slot="bg-app-root"` | always | 应用背景层 | 全局底色/渐变 |
| `bg.app.workspace` | `.app-body` / `.workspace-body` | `data-slot="bg-app-workspace"` | always | 工作区背景承载层 | 前景容器常为透明 |
| `fg.header.root` | `header.app-header` | `data-slot="fg-header-root"` | always | Header 根容器 | 与 `sidebar/main/meta/sysinfo` 同级 |
| `fg.sidebar.root` | `aside.sidebar` | `data-slot="fg-sidebar-root"` | `!sidebarCollapsed` | Sidebar 根容器 | |
| `fg.main.root` | `main.main-pane` | `data-slot="fg-main-root"` | always | Main 根容器 | |
| `fg.meta.root` | `aside.metadata-panel` | `data-slot="fg-meta-root"` | `!metadataCollapsed` | Meta 根容器 | |
| `fs.layer.root` | `.fullscreen-layer` | `data-slot="fs-layer-root"` | `fullscreenActive && mode != music` | Fullscreen 根层 | fixed 覆盖全屏 |
| `fg.app.dragImport.ovl` | `.drop-overlay` | `data-slot="fg-app-drag-import-ovl"` | 拖拽导入进行中 | 拖拽导入提示覆盖层 | fixed 全屏 |
| `fg.app.tooltip.ovl` | `.app-tooltip-bubble`（TooltipLayer portal） | `data-slot="fg-app-tooltip-ovl"` | hover/focus tooltip | 全局 tooltip 层 | 固定定位气泡 |

## 2. Foreground / Header

| 稳定路径 | 当前实现锚点 | 唯一标识（拟定） | 出现条件 | 说明 | 其他 |
|---|---|---|---|---|---|
| `fg.header.logo` | `.logo-wrap > .logo-btn` | `data-slot="fg-header-logo"` | always | 独立 Logo 组 | 导入菜单 hover 触发；点击打开任务面板 |
| `fg.header.logo.importMenu.panel` | `.import-menu` | `data-slot="fg-header-logo-import-menu-panel"` | `importMenuOpen` | Logo 导入菜单 | 锚点在 logo 下拉 |
| `fg.header.logo.state.idle` | `.logo-btn.is-task-idle` | `data-slot-state="fg-header-logo-state-idle"` | `taskStatusBusy=false` | Logo 空闲态 | 文案 `MediaPlayerX` |
| `fg.header.logo.state.busy` | `.logo-btn.is-task-busy` | `data-slot-state="fg-header-logo-state-busy"` | `importBusy || adReviewRunning || adReviewDeleting` | Logo 忙碌态 | 文案 `Processing...` |
| `fg.header.logo.state.open` | `.logo-btn.is-task-open` | `data-slot-state="fg-header-logo-state-open"` | `importTaskPanelOpen` | Logo 面板展开态 | 焦点环 |
| `fg.header.g1` | `.header-group-primary` | `data-slot="fg-header-g1"` | always | 第 1 组 | panel toggles + palette + settings（紧随 logo） |
| `fg.header.g1.toggle.sidebar` | `.panel-toggle-btn` (L) | `data-slot="fg-header-g1-toggle-sidebar"` | `showPanelToggleControls` | 侧边栏开关按钮 | L 按钮 |
| `fg.header.g1.toggle.metadata` | `.panel-toggle-btn` (R) | `data-slot="fg-header-g1-toggle-metadata"` | `showPanelToggleControls` | 元数据面板开关按钮 | R 按钮 |
| `fg.header.g1.task.importTask.panel` | `.import-task-panel` | `data-slot="fg-header-g1-task-import-task-panel"` | `importTaskPanelOpen` | 导入任务面板 | 渲染在 `fg.sysinfo` 容器 |
| `fg.header.g1.task.importTask.error.panel` | `.import-task-panel > p`（错误行） | `data-slot="fg-header-g1-task-import-task-error-panel"` | `taskError != null` | 任务面板错误区 | clear 按钮 |
| `fg.header.g1.palette` | `.window-control-btn` (palette) | `data-slot="fg-header-g1-palette"` | always | 昼夜切换按钮 | 无 popover |
| `fg.header.g1.settings` | `.window-control-btn` (settings) | `data-slot="fg-header-g1-settings"` | always | 设置按钮 | 触发设置面板 |
| `fg.header.g1.settings.root.panel` | `.settings-mask > .settings-panel` | `data-slot="fg-header-g1-settings-root-panel"` | `settingsOpen` | 设置面板 | 全屏遮罩+居中主面板 |
| `fg.header.g1.settings.shortcutEdit.panel` | `.settings-floating-mask`（快捷键编辑） | `data-slot="fg-header-g1-settings-shortcut-edit-panel"` | `bindingTarget != null` | 设置子面板（编辑） | 浮层叠加在设置面板上 |
| `fg.header.g1.settings.shortcutCapture.panel` | `.settings-floating-mask`（快捷键捕获） | `data-slot="fg-header-g1-settings-shortcut-capture-panel"` | `capturingTarget != null` | 设置子面板（捕获） | 浮层叠加 |
| `fg.header.g2` | `.header-group-modes` | `data-slot="fg-header-g2"` | always | 第 2 组 | 模式切换（header 中心线居中） |
| `fg.header.g2.mode.image` | `.mode-switch button` (image) | `data-slot="fg-header-g2-mode-image"` | always | Image 模式按钮 | active 样式切换 |
| `fg.header.g2.mode.video` | `.mode-switch button` (video) | `data-slot="fg-header-g2-mode-video"` | always | Video 模式按钮 | active 样式切换 |
| `fg.header.g2.mode.music` | `.mode-switch button` (music) | `data-slot="fg-header-g2-mode-music"` | always | Music 模式按钮 | active 样式切换 |
| `fg.header.g2.musicQuick` | `.music-quick-actions` | `data-slot="fg-header-g2-music-quick"` | `mode != music && showMusicQuickActions` | 音乐快捷控件 | play/stop |
| `fg.header.gDebug` | `.header-group-debug` | `data-slot="fg-header-g-debug"` | `headerDebugGroupVisible` | Debug 组 | 位于 g2 与 g3 之间 |
| `fg.header.gDebug.tooltips` | `.window-control-btn--theme-parameter` (TT) | `data-slot="fg-header-g-debug-tooltips"` | `headerDebugGroupVisible` | Tooltip 开关按钮 | 切换 `tooltipEnabled` |
| `fg.header.gDebug.nativeChrome` | `.window-control-btn--theme-parameter` (N) | `data-slot="fg-header-g-debug-native-chrome"` | `headerDebugGroupVisible` | Electron 外框/菜单开关按钮 | 切换 `electronNativeChromeEnabled` |
| `fg.header.gDebug.themeParameter` | `.window-control-btn--theme-parameter` (T) | `data-slot="fg-header-g-debug-theme-parameter"` | `headerDebugGroupVisible` | 主题参数按钮 | 打开 ThemeParameter 面板；关闭态会先启用按钮可见性 |
| `fg.header.g3` | `.header-group-window` | `data-slot="fg-header-g3"` | always | 第 3 组 | 帮助/窗口控制 |
| `fg.header.g3.popoverDebugPin` | `.header-group-debug > .window-control-btn`（O/C） | `data-slot="fg-header-g3-popover-debug-pin"` | `headerDebugGroupVisible` | 调试悬浮层固定开关 | `C`=关闭，`O`=开启 |
| `fg.header.g3.themeParameter.root.panel` | `.settings-mask > .settings-panel.theme-parameter-panel` | `data-slot="fg-header-g3-theme-parameter-root-panel"` | `themeParameterOpen` | Theme 参数面板 | 全屏遮罩+居中主面板 |
| `fg.header.g3.help` | `.window-control-btn` (help) | `data-slot="fg-header-g3-help"` | always | 帮助按钮 | 打开 Help 面板 |
| `fg.header.g3.help.root.panel` | `.settings-mask > .settings-panel`（HelpPanel） | `data-slot="fg-header-g3-help-root-panel"` | `helpOpen` | Help 面板 | 全屏遮罩+居中主面板 |
| `fg.header.g3.help.root.buttonOverlay.ovl` | `.help-overlay` | `data-slot="fg-header-g3-help-root-button-overlay-ovl"` | `helpOverlayActive` | 按钮说明覆盖层 | 打开 Help 后由面板内动作触发 |
| `fg.header.g3.window.min` | `window-control-btn` (minimize) | `data-slot="fg-header-g3-window-min"` | desktop | 最小化 | 无面板 |
| `fg.header.g3.window.maxrestore` | `window-control-btn` (maximize/fullscreen/restore) | `data-slot="fg-header-g3-window-maxrestore"` | desktop | 三态切换：最大化→全屏→还原 | 全屏态进入 Electron Fullscreen |
| `fg.header.g3.window.close` | `.window-control-btn--close` | `data-slot="fg-header-g3-window-close"` | desktop | 关闭窗口 | 无面板 |

## 3. Foreground / SysInfo（不常驻）

| 稳定路径 | 当前实现锚点 | 唯一标识（拟定） | 出现条件 | 说明 | 其他 |
|---|---|---|---|---|---|
| `fg.sysinfo.root` | `section.fg-sysinfo`（`src/components/AppTopBanners.tsx`） | `data-slot="fg-sysinfo-root"` | `importTaskPanelOpen || backendErrorRows.length>0 || runtimeWarningVisible` | 系统信息容器（非常驻） | 独立 DOM 容器 |
| `fg.sysinfo.backendError` | `.backend-error-banner` | `data-slot="fg-sysinfo-backend-error"` | `backendErrorRows.length>0` | 后端异常横幅 | 来源于后端读取异常 |
| `fg.sysinfo.runtimeWarning` | `.runtime-warning-banner` | `data-slot="fg-sysinfo-runtime-warning"` | `runtimeWarningVisible` | 运行能力警告横幅 | 可手动 dismiss |

## 4. Foreground / Sidebar

| 稳定路径 | 当前实现锚点 | 唯一标识（拟定） | 出现条件 | 说明 | 其他 |
|---|---|---|---|---|---|
| `fg.sidebar.expand` | `.sidebar-expand-btn` | `data-slot="fg-sidebar-expand"` | `sidebarCollapsed` | 侧栏折叠时展开按钮 | 左侧悬浮箭头 |
| `fg.sidebar.toolbar` | `.sidebar-head` | `data-slot="fg-sidebar-toolbar"` | `!sidebarCollapsed` | 侧栏 toolbar | |
| `fg.sidebar.toolbar.title` | `.sidebar-title-btn` | `data-slot="fg-sidebar-toolbar-title"` | always in sidebar | 结构标题/折叠触发 | |
| `fg.sidebar.toolbar.back` | `.sidebar-head-icon-btn`(return) | `data-slot="fg-sidebar-toolbar-back"` | `searchResultMode` | 搜索结果返回 | |
| `fg.sidebar.toolbar.clear` | `.sidebar-head-icon-btn`(unselectAll) | `data-slot="fg-sidebar-toolbar-clear"` | `manageMode || metadataManageMode` | 清空选择 | |
| `fg.sidebar.toolbar.collapseAll` | `.sidebar-head-icon-btn`(collapse) | `data-slot="fg-sidebar-toolbar-collapse-all"` | `mode=image && !searchResultMode` | 一键折叠含图父级节点 | |
| `fg.sidebar.toolbar.prevImageParent` | `.sidebar-head-icon-btn`(prev) | `data-slot="fg-sidebar-toolbar-prev-image-parent"` | `mode=image && !searchResultMode` | 跳转到上一个含图父级节点 | |
| `fg.sidebar.toolbar.nextImageParent` | `.sidebar-head-icon-btn`(next) | `data-slot="fg-sidebar-toolbar-next-image-parent"` | `mode=image && !searchResultMode` | 跳转到下一个含图父级节点 | |
| `fg.sidebar.toolbar.rootToggle` | `.sidebar-head-icon-btn`(setRoot/return) | `data-slot="fg-sidebar-toolbar-root-toggle"` | `!searchResultMode` | 根范围切换 | |
| `fg.sidebar.main` | `.sidebar-tree` | `data-slot="fg-sidebar-main"` | `!sidebarCollapsed` | 侧栏主列表区 | 可滚动 |
| `fg.sidebar.main.label` | `.sidebar-label` | `data-slot="fg-sidebar-main-label"` | per node | 节点标签按钮 | |
| `fg.sidebar.shortcut.rename.panel` | `.settings-floating-mask > .sidebar-rename-dialog` | `data-slot="fg-sidebar-shortcut-rename-panel"` | sidebar 上下文触发 `KeyR` 且存在目标节点 | 侧栏重命名弹窗 | 触发逻辑在 `useAppInteractionEffects` |
| `fg.sidebar.footer` | 预留 | `data-slot="fg-sidebar-footer"` | 预留 | 空槽位 | 保留用于未来扩展 |

## 5. Foreground / Main

| 稳定路径 | 当前实现锚点 | 唯一标识（拟定） | 出现条件 | 说明 | 其他 |
|---|---|---|---|---|---|
| `fg.main.toolbar` | `.main-toolbar` | `data-slot="fg-main-toolbar"` | `mode in (image,video,music)` | 主工具栏 | |
| `fg.main.toolbar.state.manage` | 各 MainSection 的 manage 分支 | `data-slot="fg-main-toolbar-state-manage"` | `manageMode` | 管理态工具栏 | |
| `fg.main.toolbar.state.metadata` | 各 MainSection 的 metadata 分支 | `data-slot="fg-main-toolbar-state-metadata"` | `metadataManageMode` | 元数据管理态 | |
| `fg.main.toolbar.state.normal` | 各 MainSection 的 normal 分支 | `data-slot="fg-main-toolbar-state-normal"` | `!manageMode && !metadataManageMode` | 常规浏览态 | |
| `fg.main.toolbar.manage.groupName.panel` | `.settings-floating-mask > .manage-group-dialog` | `data-slot="fg-main-toolbar-manage-group-name-panel"` | 分组/移动命名弹窗打开 | GroupNameDialog | 居中浮层 |
| `fg.main.toolbar.manage.deleteConfirm.panel` | `.settings-floating-mask > .manage-confirm-dialog` | `data-slot="fg-main-toolbar-manage-delete-confirm-panel"` | 删除确认弹窗打开 | DangerConfirmDialog | 除 toolbar 外也可由 sidebar `Delete` 快捷键触发 |

### 5.1 Main / Image

| 稳定路径 | 当前实现锚点 | 唯一标识（拟定） | 出现条件 | 说明 | 其他 |
|---|---|---|---|---|---|
| `fg.main.content.image.grid` | `.image-grid` | `data-slot="fg-main-content-image-grid"` | `mode=image && !nodeBrowseMode && !showNamesOnly` | 缩略图网格 | |
| `fg.main.content.image.grid.card` | `.image-grid .thumb-card` | `data-slot="fg-main-content-image-grid-card"` | `mode=image && !nodeBrowseMode && !showNamesOnly` | 缩略图卡片项 | 包含普通项与 skeleton 项 |
| `fg.main.content.image.nodeGrid` | `.image-grid.node-browse-grid` | `data-slot="fg-main-content-image-node-grid"` | `mode=image && nodeBrowseMode` | 节点浏览网格 | |
| `fg.main.content.image.nodeGrid.card` | `.image-grid.node-browse-grid .thumb-card` | `data-slot="fg-main-content-image-node-grid-card"` | `mode=image && nodeBrowseMode` | 节点浏览卡片项 | |
| `fg.main.content.image.nameList` | `.name-list` | `data-slot="fg-main-content-image-name-list"` | `mode=image && showNamesOnly` | 文件名列表模式 | |
| `fg.main.content.image.nameList.row` | `.name-list-row` | `data-slot="fg-main-content-image-name-list-row"` | `mode=image && showNamesOnly` | 文件名列表行容器 | |
| `fg.main.content.image.nameList.label` | `.name-list-row-label` | `data-slot="fg-main-content-image-name-list-label"` | `mode=image && showNamesOnly` | 文件名列文本（首列） | |
| `fg.main.content.image.marquee.ovl` | `.manage-selection-marquee` | `data-slot="fg-main-content-image-marquee-ovl"` | 框选中 | 管理框选遮罩 | fixed 定位 |
| `fg.main.toolbar.image.scale.pop` | `.main-toolbar-scale-control .header-popover-panel` | `data-slot="fg-main-toolbar-image-scale-pop"` | scale popover open | 缩略图比例弹层 | 下拉窄面板 |
| `fg.main.toolbar.image.adReviewStrategy.pop` | `.main-toolbar-ad-review-strategy-panel` | `data-slot="fg-main-toolbar-image-ad-review-strategy-pop"` | 对应按钮 hover/open | 审核策略 popover | 左对齐下拉 |
| `fg.main.toolbar.image.adReviewProgress.pop` | `.main-toolbar-ad-review-progress-panel` | `data-slot="fg-main-toolbar-image-ad-review-progress-pop"` | 运行中 hover/open | 审核进度 popover | 左对齐下拉 |
| `fg.main.toolbar.image.adReviewStart.panel` | `.manage-ad-review-start-mask > .manage-ad-review-start-dialog` | `data-slot="fg-main-toolbar-image-ad-review-start-panel"` | 从图像主区工具栏启动审核时 | 审核启动对话框 | 居中浮层 |
| `fg.main.toolbar.image.metadataFetch.panel` | `.settings-mask > .settings-panel.metadata-fetch-panel` | `data-slot="fg-main-toolbar-image-metadata-fetch-panel"` | 点击 metadata fetch 后 | 元数据抓取面板 | 全屏遮罩 |
| `fg.main.toolbar.image.deleteProgress.ovl` | `.ad-review-delete-overlay` | `data-slot="fg-main-toolbar-image-delete-progress-ovl"` | 批量删除执行中 | 删除等待进度覆盖层 | 全屏遮罩+进度条 |
| `fg.main.toolbar.image.rs.panel` | `.main-toolbar-image-convert-panel` | `data-slot="fg-main-toolbar-image-rs-panel"` | manage 模式点击 `RS` 后 | 图包转换参数面板 | 6 行参数/动作区（含 Longest Edge） |

### 5.2 Main / Video

| 稳定路径 | 当前实现锚点 | 唯一标识（拟定） | 出现条件 | 说明 | 其他 |
|---|---|---|---|---|---|
| `fg.main.content.video.preview` | `.video-preview` | `data-slot="fg-main-content-video-preview"` | `mode=video` | 视频预览容器 | |
| `fg.main.content.video.preview.screen` | `.video-screen` | `data-slot="fg-main-content-video-preview-screen"` | `mode=video` | 屏幕区域 | |
| `fg.main.content.video.preview.media` | `.video-screen-media` | `data-slot="fg-main-content-video-preview-media"` | 有视频源 | video 元件 | |
| `fg.main.content.video.preview.cover` | `.video-screen-cover-image` | `data-slot="fg-main-content-video-preview-cover"` | 有封面且未出帧 | 封面层 | |
| `fg.main.content.video.preview.empty` | `.video-screen-empty` | `data-slot="fg-main-content-video-preview-empty"` | 无视频源 | 空态提示 | |
| `fg.main.content.video.preview.subtitle.ovl` | `<SubtitleOverlay />`（`.video-screen` 内） | `-` | `subtitleVisible && (autoSubtitleActive || subtitleTrackUrl!=null)` | 预览区字幕覆盖层 | 与视频/封面同层叠加 |
| `fg.main.content.video.controls` | `.video-controls-shell` | `data-slot="fg-main-content-video-controls"` | `mode=video` | 控制壳容器 | |
| `fg.main.content.video.controls.progress` | `.video-controls-progress` + `SkeuoRunway` | `data-slot="fg-main-content-video-controls-progress"` | `mode=video` | 进度控制 | |
| `fg.main.content.video.controls.left` | `.video-controls-group.is-left` | `data-slot="fg-main-content-video-controls-left"` | `mode=video` | 左控制组 | |
| `fg.main.content.video.controls.center` | `.video-controls-group.is-center` | `data-slot="fg-main-content-video-controls-center"` | `mode=video` | 中控制组 | |
| `fg.main.content.video.controls.right` | `.video-controls-group.is-right` | `data-slot="fg-main-content-video-controls-right"` | `mode=video` | 右控制组 | |
| `fg.main.content.video.controls.fit.pop` | `#video-main-popover-fit.video-ctrl-panel` | `data-slot="fg-main-content-video-controls-fit-pop"` | fit open | 画面适配弹层 | 上弹定位 |
| `fg.main.content.video.controls.subtitle.pop` | `#video-main-popover-subtitle.video-ctrl-panel` | `data-slot="fg-main-content-video-controls-subtitle-pop"` | subtitle open | 字幕弹层 | 上弹定位 |
| `fg.main.content.video.controls.speed.pop` | `#video-main-popover-speed.video-ctrl-panel` | `data-slot="fg-main-content-video-controls-speed-pop"` | speed open | 速度弹层 | 上弹定位 |
| `fg.main.content.video.controls.playlist.pop` | `#video-main-popover-playlist.video-ctrl-panel` | `data-slot="fg-main-content-video-controls-playlist-pop"` | playlist open | 播放列表弹层 | fullscreen 时可见 |
| `fg.main.content.video.controls.volume.pop` | `#video-main-popover-volume.video-ctrl-panel.is-volume` | `data-slot="fg-main-content-video-controls-volume-pop"` | volume open | 音量弹层 | 纵向轴（旋转） |
| `fg.main.toolbar.manage.subtitleCleanup.panel` | `.settings-mask > .settings-panel.metadata-fetch-panel`（SubtitleCleanupPanel） | `data-slot="fg-main-toolbar-manage-subtitle-cleanup-panel"` | manage 工具栏点击字幕清洗按钮后 | 字幕清洗面板 | 全屏遮罩 |
| `fg.main.toolbar.manage.subtitleCleanup.rawPreview.panel` | `.metadata-fetch-preview-card`（Raw） | `-` | `subtitleCleanupOpen && !rawCollapsed` | 字幕清洗原文预览区 | 可折叠 textarea |
| `fg.main.toolbar.manage.subtitleCleanup.cleanPreview.panel` | `.metadata-fetch-preview-card`（Cleaned） | `-` | `subtitleCleanupOpen && !cleanCollapsed` | 字幕清洗结果预览区 | 可编辑 textarea |

### 5.3 Main / Music

| 稳定路径 | 当前实现锚点 | 唯一标识（拟定） | 出现条件 | 说明 | 其他 |
|---|---|---|---|---|---|
| `fg.main.content.music.preview` | `.music-name-list.music-visualizer` | `data-slot="fg-main-content-music-preview"` | `mode=music && active` | 音乐预览容器 | |
| `fg.main.content.music.preview.canvas.gpu` | `.music-visualizer-canvas`(gpu) | `data-slot="fg-main-content-music-preview-canvas-gpu"` | runtime | GPU 画布 | |
| `fg.main.content.music.preview.canvas.cpu` | `.music-visualizer-canvas`(cpu) | `data-slot="fg-main-content-music-preview-canvas-cpu"` | fallback | CPU 画布 | |
| `fg.main.content.music.preview.hud.ovl` | `.music-visualizer-hud` | `-` | `runtimeShowFps || visualizerRuntimeError!=null` | 可视化调试/错误 HUD | 与画布同层覆盖 |
| `fg.main.content.music.preview.fullscreenHotzone.ovl` | `.music-controls-fullscreen-hotzone` | `-` | `mode=music && fullscreenActive` | 全屏控制热区 | 触发浮动控件显示 |
| `fg.main.content.music.controls` | `.music-controls-shell` | `data-slot="fg-main-content-music-controls"` | `mode=music && active` | 音乐控制壳 | |
| `fg.main.content.music.controls.fullscreenFloating.panel` | `.music-controls-shell.is-fullscreen-floating` | `-` | `mode=music && fullscreenActive && controlsMounted` | 音乐全屏浮动控制层 | 与主内容分离的悬浮壳 |
| `fg.main.content.music.controls.progress` | `.music-controls-progress` + `SkeuoRunway` | `data-slot="fg-main-content-music-controls-progress"` | 同上 | 进度控制 | |
| `fg.main.content.music.controls.left` | `.music-controls-group.is-left` | `data-slot="fg-main-content-music-controls-left"` | 同上 | 左控制组 | |
| `fg.main.content.music.controls.center` | `.music-controls-group.is-center` | `data-slot="fg-main-content-music-controls-center"` | 同上 | 中控制组 | |
| `fg.main.content.music.controls.right` | `.music-controls-group.is-right` | `data-slot="fg-main-content-music-controls-right"` | 同上 | 右控制组 | |
| `fg.main.content.music.controls.shader.pop` | `#music-main-popover-shader.music-ctrl-panel` | `data-slot="fg-main-content-music-controls-shader-pop"` | shader open | shader 列表弹层 | 上弹定位 |
| `fg.main.content.music.controls.shaderSettings.pop` | `#music-main-popover-shader-settings.music-ctrl-panel` | `data-slot="fg-main-content-music-controls-shader-settings-pop"` | shaderSettings open | shader 参数弹层 | 上弹定位 |
| `fg.main.content.music.controls.volume.pop` | `#music-main-popover-volume.music-ctrl-panel.is-volume` | `data-slot="fg-main-content-music-controls-volume-pop"` | volume open | 音量弹层 | 纵向轴（旋转） |

### 5.4 Main / Footer

| 稳定路径 | 当前实现锚点 | 唯一标识（拟定） | 出现条件 | 说明 | 其他 |
|---|---|---|---|---|---|
| `fg.main.footer` | `.main-footer` | `data-slot="fg-main-footer"` | always | 主面板 footer | |
| `fg.main.footer.meta` | `.main-footer-meta` | `data-slot="fg-main-footer-meta"` | always | 路径/元信息 | |
| `fg.main.footer.pagination` | `.main-footer-pagination` | `data-slot="fg-main-footer-pagination"` | `mode=image && imageTotalPages>1` | 页码翻页区 | 含节点浏览分页 |

## 6. Foreground / Meta

| 稳定路径 | 当前实现锚点 | 唯一标识（拟定） | 出现条件 | 说明 | 其他 |
|---|---|---|---|---|---|
| `fg.meta.restore` | `.meta-restore` | `data-slot="fg-meta-restore"` | `metadataCollapsed` | Meta 折叠恢复按钮 | |
| `fg.meta.toolbar` | `.metadata-head` | `data-slot="fg-meta-toolbar"` | `!metadataCollapsed` | Meta toolbar | |
| `fg.meta.toolbar.g3` | `.metadata-toolbar-g3` | `data-slot="fg-meta-toolbar-g3"` | `mode in (image,video,music)` | 搜索/管理/元数据管理组 | 由原 header 第 3 组迁移 |
| `fg.meta.toolbar.g3.search` | `.search-trigger-btn` (search) | `data-slot="fg-meta-toolbar-g3-search"` | 同上 | 搜索开关按钮 | `data-a11y-id="metadata.toolbar.g3.search"`；`aria-label=a11y.metadata.toolbarSearch` |
| `fg.meta.toolbar.g3.manage` | `.search-trigger-btn` (manage) | `data-slot="fg-meta-toolbar-g3-manage"` | 同上 | 管理模式开关 | `data-a11y-id="metadata.toolbar.g3.manage"`；`aria-label=a11y.metadata.toolbarManage` |
| `fg.meta.toolbar.g3.metadata` | `.search-trigger-btn` (metadata) | `data-slot="fg-meta-toolbar-g3-metadata"` | 同上 | 元数据管理开关 | `data-a11y-id="metadata.toolbar.g3.metadataToggle"`；`aria-label` 动态：`a11y.metadata.enterMetadataManageMode` / `a11y.metadata.exitMetadataManageMode` |
| `fg.meta.toolbar.toggle` | `.metadata-head-icon-btn` | `data-slot="fg-meta-toolbar-toggle"` | `mode=image` | 图像预览/元数据切换 | |
| `fg.meta.main` | `MetadataImageEditor/MetadataVideoEditor/MetadataMusicEditor` | `data-slot="fg-meta-main"` | `!metadataCollapsed` | Meta 主体编辑区 | 按模式分流 |
| `fg.meta.main.imageEditor` | `<MetadataImageEditor />` | `data-slot="fg-meta-main-image-editor"` | `mode=image` | 图像元数据编辑 | |
| `fg.meta.main.imageEditor.preferenceMetrics.panel` | `.metadata-edit-grid`（Preference Metrics 只读字段） | `-` | `mode=image && editable` | 图像偏好行为指标展示区 | event/pages/completion/lastEvent |
| `fg.meta.main.videoEditor` | `<MetadataVideoEditor />` | `data-slot="fg-meta-main-video-editor"` | `mode=video` | 视频元数据编辑 | |
| `fg.meta.main.videoEditor.preferenceMetrics.panel` | `.metadata-edit-grid`（Preference Metrics 只读字段） | `-` | `mode=video && editable` | 视频偏好行为指标展示区 | event/watch/completion/lastEvent |
| `fg.meta.main.videoEditor.playlistNameDialog.panel` | `.metadata-playlist-save-dialog` | `data-slot="fg-meta-main-video-editor-playlist-name-dialog-panel"` | save/create playlist 时 | 播放列表命名对话区 | 内联于 meta，不是全屏遮罩 |
| `fg.meta.main.musicEditor` | `<MetadataMusicEditor />` | `data-slot="fg-meta-main-music-editor"` | `mode=music` | 音乐元数据编辑 | |
| `fg.meta.main.musicEditor.bookletBinding.panel` | `.metadata-music-booklet-bindings` | `-` | `mode=music && editable` | 封面/Booklet 绑定配置区 | coverSource/bookletSource + 快捷动作 |
| `fg.meta.main.search` | `<MetadataSearchSection />` | `data-slot="fg-meta-main-search"` | `searchModeActive` | 元数据检索区 | |
| `fg.meta.main.search.featureTagPicker.panel` | `.feature-tag-modal-overlay > .feature-tag-modal-panel` | `data-slot="fg-meta-main-search-feature-tag-picker-panel"` | tag picker open | 标签选择模态面板 | 全屏遮罩+居中 |
| `fg.meta.main.adReview` | `<MetadataAdReviewSection />` | `data-slot="fg-meta-main-ad-review"` | `mode=image && manageMode && adReviewPanelOpen` | 审核区 | |
| `fg.meta.main.adReview.start.panel` | `.manage-ad-review-start-mask > .manage-ad-review-start-dialog` | `data-slot="fg-meta-main-ad-review-start-panel"` | 从 Meta 审核区启动审核时 | 审核启动对话框 | 居中浮层 |
| `fg.meta.footer` | 预留 | `data-slot="fg-meta-footer"` | 预留 | 空槽位 | 保留用于未来扩展 |

## 7. Fullscreen

| 稳定路径 | 当前实现锚点 | 唯一标识（拟定） | 出现条件 | 说明 | 其他 |
|---|---|---|---|---|---|
| `bg.fs.mask` | `.fullscreen-layer` | `data-slot="bg-fs-mask"` | `fullscreenActive && mode != music` | 全屏背景层 | 固定覆盖全屏 |
| `fs.layer.content` | `.fullscreen-content` | `data-slot="fs-layer-content"` | 同上 | 全屏内容区 | |
| `fs.nondual.root` | `.fullscreen-single-pane` | `data-slot="fs-nondual-root"` | `fullscreenDisplay in (video-only,image-only)` | 单屏布局 | |
| `fs.dual.root` | `.fullscreen-content` + `.fullscreen-divider` | `data-slot="fs-dual-root"` | `fullscreenDisplay=dual` | 双屏布局 | 中间可拖拽分割条 |
| `fs.dual.pane.image` | `.fullscreen-pane.fullscreen-image` | `data-slot="fs-dual-pane-image"` | dual | 双屏左/右图像 pane | |
| `fs.dual.pane.video` | `.fullscreen-pane.fullscreen-video` | `data-slot="fs-dual-pane-video"` | dual | 双屏左/右视频 pane | |
| `fs.video.controls.shell` | `.fullscreen-video-controls-shell` | `data-slot="fs-video-controls-shell"` | 视频 pane 可见 | 全屏视频控制壳 | |
| `fs.video.controls.fit.pop` | `#fullscreen-popover-fit.video-ctrl-panel` | `data-slot="fs-video-controls-fit-pop"` | fit open | 全屏视频适配弹层 | 上弹定位 |
| `fs.video.controls.subtitle.pop` | `#fullscreen-popover-subtitle.video-ctrl-panel` | `data-slot="fs-video-controls-subtitle-pop"` | subtitle open | 全屏字幕弹层 | 上弹定位 |
| `fs.video.controls.speed.pop` | `#fullscreen-popover-speed.video-ctrl-panel` | `data-slot="fs-video-controls-speed-pop"` | speed open | 全屏速度弹层 | 上弹定位 |
| `fs.video.controls.playlist.pop` | `#fullscreen-popover-playlist.video-ctrl-panel` | `data-slot="fs-video-controls-playlist-pop"` | playlist open | 全屏播放列表弹层 | 上弹定位 |
| `fs.video.controls.volume.pop` | `#fullscreen-popover-volume.video-ctrl-panel.is-volume` | `data-slot="fs-video-controls-volume-pop"` | volume open | 全屏音量弹层 | 纵向轴（旋转） |
| `fs.video.controls.hotzone.ovl` | `.fullscreen-video-controls-hotzone` | `-` | `fullscreenDisplay != image-only` | 全屏视频控件触发热区 | 顶/底锚点随视频位置切换 |
| `fs.video.controls.float.panel` | `.fullscreen-video-controls` | `-` | `fullscreenDisplay != image-only && videoControlsVisible` | 全屏视频浮动控件容器 | 承载 `fs.video.controls.*` 子项 |
| `fs.image.controls.shell` | `.fullscreen-footer` | `data-slot="fs-image-controls-shell"` | 图像 pane 可见 | 全屏图像控制壳 | |
| `fs.image.controls.autoplay.pop` | `.fullscreen-autoplay-popover` | `data-slot="fs-image-controls-autoplay-pop"` | autoplay popover open | 自动播放参数弹层 | upward |
| `fs.image.controls.zoom.pop` | `.fullscreen-zoom-popover` | `data-slot="fs-image-controls-zoom-pop"` | zoom popover open | 缩放参数弹层 | upward |
| `fs.image.controls.adjust.panel` | `.fullscreen-image-adjust-mask > .fullscreen-image-adjust-panel` | `data-slot="fs-image-controls-adjust-panel"` | 图像预览态点击 `ADJ` 后 | 全屏图像调节面板 | 默认左下，可拖拽 |
| `fs.image.convertPreview.panel` | `.fullscreen-image-compare` | `-` | `mode=image && imageConvertPreviewMode` | 图包转换左右对比容器 | 左原图右预览图 |
| `fs.image.convertPreview.splitter` | `.fullscreen-image-compare-divider` | `-` | `mode=image && imageConvertPreviewMode && !imageConvertPreviewError` | 对比中线拖拽控件 | 调整对比比例 |
| `fs.image.convertPreview.error.ovl` | `.fullscreen-image-compare-error` | `-` | `mode=image && imageConvertPreviewMode && imageConvertPreviewError!=null` | 转换预览失败提示层 | 回退原图显示 |

## 8. Boot（Splash）

| 稳定路径 | 当前实现锚点 | 唯一标识（拟定） | 出现条件 | 说明 | 其他 |
|---|---|---|---|---|---|
| `boot.splash.window` | `electron/main.ts` (`createStartupSplashWindow`) | `data-slot="boot-splash-window"` | 应用启动到主窗体显示前 | 启动窗口容器 | 固定窗口 `700x560`，无边框、透明、置顶 |
| `boot.splash.root` | `electron/startupSplashTemplate.ts` (`main.splash`) | `data-slot="boot-splash-root"` | 同上 | 启动画面根节点 | 全窗铺满 |
| `boot.splash.stage` | `.splash` | `data-slot="boot-splash-stage"` | 同上 | 舞台层 | `display:grid; place-items:end center` |
| `boot.splash.stage.cardStage` | `.card-stage` | `data-slot="boot-splash-stage-card-stage"` | 同上 | 卡片舞台容器 | 有角色图时 `has-character` |
| `boot.splash.stage.character` | `.character` | `data-slot="boot-splash-stage-character"` | 有 banner 源时 | 角色图层 | 绝对定位，`left:50% top:0` |
| `boot.splash.card` | `.card` | `data-slot="boot-splash-card"` | 同上 | 状态卡片 | 圆角、阴影、半透明背景 |
| `boot.splash.card.track` | `.track` | `data-slot="boot-splash-card-track"` | 同上 | 启动进度轨道 | `::before` 动画条 |
