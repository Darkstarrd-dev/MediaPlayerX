# Token Design（稳定路径 -> Token 前缀）

## 规则

| 项 | 规则 |
|---|---|
| Token 前缀基线 | `--mpx-slot-<path>-*` |
| path 生成 | 稳定路径按 `.` 拆分后用 `-` 连接 |
| 命名归一化 | 段内 `camelCase` 转 `kebab-case`（如 `importMenu` -> `import-menu`） |
| token 落地方式 | 具体 token 在前缀后追加语义后缀（如 `bg` / `text` / `border` / `shadow` / `gap`） |
| 示例 | `fg.main.content.video.controls.volume.pop` -> `--mpx-slot-fg-main-content-video-controls-volume-pop-*` |

## 稳定路径到 Token 前缀

| 稳定路径 | Token 前缀 |
|---|---|
| `bg.app.root` | `--mpx-slot-bg-app-root-*` |
| `bg.app.workspace` | `--mpx-slot-bg-app-workspace-*` |
| `fg.header.root` | `--mpx-slot-fg-header-root-*` |
| `fg.sidebar.root` | `--mpx-slot-fg-sidebar-root-*` |
| `fg.main.root` | `--mpx-slot-fg-main-root-*` |
| `fg.meta.root` | `--mpx-slot-fg-meta-root-*` |
| `fs.layer.root` | `--mpx-slot-fs-layer-root-*` |
| `fg.app.dragImport.ovl` | `--mpx-slot-fg-app-drag-import-ovl-*` |
| `fg.app.tooltip.ovl` | `--mpx-slot-fg-app-tooltip-ovl-*` |
| `fg.header.logo` | `--mpx-slot-fg-header-logo-*` |
| `fg.header.logo.importMenu.panel` | `--mpx-slot-fg-header-logo-import-menu-panel-*` |
| `fg.header.g1` | `--mpx-slot-fg-header-g1-*` |
| `fg.header.g1.task.button` | `--mpx-slot-fg-header-g1-task-button-*` |
| `fg.header.g1.task.state.idle` | `--mpx-slot-fg-header-g1-task-state-idle-*` |
| `fg.header.g1.task.state.busy` | `--mpx-slot-fg-header-g1-task-state-busy-*` |
| `fg.header.g1.task.state.open` | `--mpx-slot-fg-header-g1-task-state-open-*` |
| `fg.header.g1.task.importTask.panel` | `--mpx-slot-fg-header-g1-task-import-task-panel-*` |
| `fg.header.g1.task.importTask.error.panel` | `--mpx-slot-fg-header-g1-task-import-task-error-panel-*` |
| `fg.header.g1.palette` | `--mpx-slot-fg-header-g1-palette-*` |
| `fg.header.g1.settings` | `--mpx-slot-fg-header-g1-settings-*` |
| `fg.header.g1.settings.root.panel` | `--mpx-slot-fg-header-g1-settings-root-panel-*` |
| `fg.header.g1.settings.shortcutEdit.panel` | `--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-*` |
| `fg.header.g1.settings.shortcutCapture.panel` | `--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-*` |
| `fg.header.g2` | `--mpx-slot-fg-header-g2-*` |
| `fg.header.g2.mode.image` | `--mpx-slot-fg-header-g2-mode-image-*` |
| `fg.header.g2.mode.video` | `--mpx-slot-fg-header-g2-mode-video-*` |
| `fg.header.g2.mode.music` | `--mpx-slot-fg-header-g2-mode-music-*` |
| `fg.header.g2.musicQuick` | `--mpx-slot-fg-header-g2-music-quick-*` |
| `fg.header.g3` | `--mpx-slot-fg-header-g3-*` |
| `fg.header.g3.search` | `--mpx-slot-fg-header-g3-search-*` |
| `fg.header.g3.manage` | `--mpx-slot-fg-header-g3-manage-*` |
| `fg.header.g3.metadata` | `--mpx-slot-fg-header-g3-metadata-*` |
| `fg.header.g4` | `--mpx-slot-fg-header-g4-*` |
| `fg.header.g4.themeParameter` | `--mpx-slot-fg-header-g4-theme-parameter-*` |
| `fg.header.g4.themeParameter.root.panel` | `--mpx-slot-fg-header-g4-theme-parameter-root-panel-*` |
| `fg.header.g4.help` | `--mpx-slot-fg-header-g4-help-*` |
| `fg.header.g4.help.root.panel` | `--mpx-slot-fg-header-g4-help-root-panel-*` |
| `fg.header.g4.help.root.buttonOverlay.ovl` | `--mpx-slot-fg-header-g4-help-root-button-overlay-ovl-*` |
| `fg.header.g4.window.min` | `--mpx-slot-fg-header-g4-window-min-*` |
| `fg.header.g4.window.maxrestore` | `--mpx-slot-fg-header-g4-window-maxrestore-*` |
| `fg.header.g4.window.close` | `--mpx-slot-fg-header-g4-window-close-*` |
| `fg.sysinfo.root` | `--mpx-slot-fg-sysinfo-root-*` |
| `fg.sysinfo.backendError` | `--mpx-slot-fg-sysinfo-backend-error-*` |
| `fg.sysinfo.runtimeWarning` | `--mpx-slot-fg-sysinfo-runtime-warning-*` |
| `fg.sidebar.expand` | `--mpx-slot-fg-sidebar-expand-*` |
| `fg.sidebar.toolbar` | `--mpx-slot-fg-sidebar-toolbar-*` |
| `fg.sidebar.toolbar.title` | `--mpx-slot-fg-sidebar-toolbar-title-*` |
| `fg.sidebar.toolbar.back` | `--mpx-slot-fg-sidebar-toolbar-back-*` |
| `fg.sidebar.toolbar.clear` | `--mpx-slot-fg-sidebar-toolbar-clear-*` |
| `fg.sidebar.toolbar.collapseAll` | `--mpx-slot-fg-sidebar-toolbar-collapse-all-*` |
| `fg.sidebar.toolbar.prevImageParent` | `--mpx-slot-fg-sidebar-toolbar-prev-image-parent-*` |
| `fg.sidebar.toolbar.nextImageParent` | `--mpx-slot-fg-sidebar-toolbar-next-image-parent-*` |
| `fg.sidebar.toolbar.rootToggle` | `--mpx-slot-fg-sidebar-toolbar-root-toggle-*` |
| `fg.sidebar.main` | `--mpx-slot-fg-sidebar-main-*` |
| `fg.sidebar.main.label` | `--mpx-slot-fg-sidebar-main-label-*` |
| `fg.sidebar.shortcut.rename.panel` | `--mpx-slot-fg-sidebar-shortcut-rename-panel-*` |
| `fg.sidebar.footer` | `--mpx-slot-fg-sidebar-footer-*` |
| `fg.main.toolbar` | `--mpx-slot-fg-main-toolbar-*` |
| `fg.main.toolbar.state.manage` | `--mpx-slot-fg-main-toolbar-state-manage-*` |
| `fg.main.toolbar.state.metadata` | `--mpx-slot-fg-main-toolbar-state-metadata-*` |
| `fg.main.toolbar.state.normal` | `--mpx-slot-fg-main-toolbar-state-normal-*` |
| `fg.main.toolbar.manage.groupName.panel` | `--mpx-slot-fg-main-toolbar-manage-group-name-panel-*` |
| `fg.main.toolbar.manage.deleteConfirm.panel` | `--mpx-slot-fg-main-toolbar-manage-delete-confirm-panel-*` |
| `fg.main.content.image.grid` | `--mpx-slot-fg-main-content-image-grid-*` |
| `fg.main.content.image.grid.card` | `--mpx-slot-fg-main-content-image-grid-card-*` |
| `fg.main.content.image.nodeGrid` | `--mpx-slot-fg-main-content-image-node-grid-*` |
| `fg.main.content.image.nodeGrid.card` | `--mpx-slot-fg-main-content-image-node-grid-card-*` |
| `fg.main.content.image.nameList` | `--mpx-slot-fg-main-content-image-name-list-*` |
| `fg.main.content.image.nameList.row` | `--mpx-slot-fg-main-content-image-name-list-row-*` |
| `fg.main.content.image.nameList.label` | `--mpx-slot-fg-main-content-image-name-list-label-*` |
| `fg.main.content.image.marquee.ovl` | `--mpx-slot-fg-main-content-image-marquee-ovl-*` |
| `fg.main.toolbar.image.scale.pop` | `--mpx-slot-fg-main-toolbar-image-scale-pop-*` |
| `fg.main.toolbar.image.adReviewStrategy.pop` | `--mpx-slot-fg-main-toolbar-image-ad-review-strategy-pop-*` |
| `fg.main.toolbar.image.adReviewProgress.pop` | `--mpx-slot-fg-main-toolbar-image-ad-review-progress-pop-*` |
| `fg.main.toolbar.image.adReviewStart.panel` | `--mpx-slot-fg-main-toolbar-image-ad-review-start-panel-*` |
| `fg.main.toolbar.image.metadataFetch.panel` | `--mpx-slot-fg-main-toolbar-image-metadata-fetch-panel-*` |
| `fg.main.toolbar.image.deleteProgress.ovl` | `--mpx-slot-fg-main-toolbar-image-delete-progress-ovl-*` |
| `fg.main.toolbar.image.rs.panel` | `--mpx-slot-fg-main-toolbar-image-rs-panel-*` |
| `fg.main.content.video.preview` | `--mpx-slot-fg-main-content-video-preview-*` |
| `fg.main.content.video.preview.screen` | `--mpx-slot-fg-main-content-video-preview-screen-*` |
| `fg.main.content.video.preview.media` | `--mpx-slot-fg-main-content-video-preview-media-*` |
| `fg.main.content.video.preview.cover` | `--mpx-slot-fg-main-content-video-preview-cover-*` |
| `fg.main.content.video.preview.empty` | `--mpx-slot-fg-main-content-video-preview-empty-*` |
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
| `fg.main.toolbar.manage.subtitleCleanup.panel` | `--mpx-slot-fg-main-toolbar-manage-subtitle-cleanup-panel-*` |
| `fg.main.content.music.preview` | `--mpx-slot-fg-main-content-music-preview-*` |
| `fg.main.content.music.preview.canvas.gpu` | `--mpx-slot-fg-main-content-music-preview-canvas-gpu-*` |
| `fg.main.content.music.preview.canvas.cpu` | `--mpx-slot-fg-main-content-music-preview-canvas-cpu-*` |
| `fg.main.content.music.controls` | `--mpx-slot-fg-main-content-music-controls-*` |
| `fg.main.content.music.controls.progress` | `--mpx-slot-fg-main-content-music-controls-progress-*` |
| `fg.main.content.music.controls.left` | `--mpx-slot-fg-main-content-music-controls-left-*` |
| `fg.main.content.music.controls.center` | `--mpx-slot-fg-main-content-music-controls-center-*` |
| `fg.main.content.music.controls.right` | `--mpx-slot-fg-main-content-music-controls-right-*` |
| `fg.main.content.music.controls.shader.pop` | `--mpx-slot-fg-main-content-music-controls-shader-pop-*` |
| `fg.main.content.music.controls.shaderSettings.pop` | `--mpx-slot-fg-main-content-music-controls-shader-settings-pop-*` |
| `fg.main.content.music.controls.volume.pop` | `--mpx-slot-fg-main-content-music-controls-volume-pop-*` |
| `fg.main.footer` | `--mpx-slot-fg-main-footer-*` |
| `fg.main.footer.meta` | `--mpx-slot-fg-main-footer-meta-*` |
| `fg.main.footer.pagination` | `--mpx-slot-fg-main-footer-pagination-*` |
| `fg.meta.restore` | `--mpx-slot-fg-meta-restore-*` |
| `fg.meta.toolbar` | `--mpx-slot-fg-meta-toolbar-*` |
| `fg.meta.toolbar.title` | `--mpx-slot-fg-meta-toolbar-title-*` |
| `fg.meta.toolbar.toggle` | `--mpx-slot-fg-meta-toolbar-toggle-*` |
| `fg.meta.main` | `--mpx-slot-fg-meta-main-*` |
| `fg.meta.main.imageEditor` | `--mpx-slot-fg-meta-main-image-editor-*` |
| `fg.meta.main.videoEditor` | `--mpx-slot-fg-meta-main-video-editor-*` |
| `fg.meta.main.videoEditor.playlistNameDialog.panel` | `--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-*` |
| `fg.meta.main.musicEditor` | `--mpx-slot-fg-meta-main-music-editor-*` |
| `fg.meta.main.search` | `--mpx-slot-fg-meta-main-search-*` |
| `fg.meta.main.search.featureTagPicker.panel` | `--mpx-slot-fg-meta-main-search-feature-tag-picker-panel-*` |
| `fg.meta.main.adReview` | `--mpx-slot-fg-meta-main-ad-review-*` |
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
| `fs.image.controls.shell` | `--mpx-slot-fs-image-controls-shell-*` |
| `fs.image.controls.autoplay.pop` | `--mpx-slot-fs-image-controls-autoplay-pop-*` |
| `fs.image.controls.zoom.pop` | `--mpx-slot-fs-image-controls-zoom-pop-*` |
| `boot.splash.window` | `--mpx-slot-boot-splash-window-*` |
| `boot.splash.root` | `--mpx-slot-boot-splash-root-*` |
| `boot.splash.stage` | `--mpx-slot-boot-splash-stage-*` |
| `boot.splash.stage.cardStage` | `--mpx-slot-boot-splash-stage-card-stage-*` |
| `boot.splash.stage.character` | `--mpx-slot-boot-splash-stage-character-*` |
| `boot.splash.card` | `--mpx-slot-boot-splash-card-*` |
| `boot.splash.card.track` | `--mpx-slot-boot-splash-card-track-*` |

## 变更约束

| 变更类型 | 必做动作 |
|---|---|
| 新增 UI 槽位 | 先在 `ui_definition.md` 增加稳定路径，再在本文件增加对应 Token 前缀行 |
| 修改稳定路径 | 同步修改两张表中的路径与前缀；禁止只改其一 |
| 删除 UI 槽位 | 两张表同时删除；若需兼容，先标记 deprecated 并给迁移窗口 |
