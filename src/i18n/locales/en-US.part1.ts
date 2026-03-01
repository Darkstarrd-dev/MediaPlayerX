import type { ZhCnCatalog } from "./zh-CN";

export const enUsCatalogPart1: Partial<{ [K in keyof ZhCnCatalog]: string }> = {
  "ui.common.close": "Close",
  "ui.common.cancel": "Cancel",
  "ui.common.confirm": "Confirm",
  "ui.common.loading": "Loading...",
  "ui.common.noResults": "No results",
  "ui.header.search": "Search",
  "ui.header.manage": "Manage Files",
  "ui.header.settings": "Settings",
  "ui.header.imageMode": "Picture Mode",
  "ui.header.videoMode": "Video Mode",
  "ui.header.musicMode": "Music Mode",
  "ui.help.panel": "Help Panel",
  "ui.help.placeholder":
    "This panel is reserved for help and documentation content.",
  "ui.help.section.image": "Image Mode",
  "ui.help.section.fullscreen": "Fullscreen Mode",
  "ui.help.section.adReviewStrategy": "Ad Review Strategy",
  "ui.help.shortcutNotSet": "Not set",
  "ui.help.image.sectionTitle": "Thumbnail panel interaction guide",
  "ui.help.image.groupMouse": "Mouse",
  "ui.help.image.groupKeyboard": "Keyboard",
  "ui.help.image.mouse.clickSelect": "Click thumbnail: focus image.",
  "ui.help.image.mouse.doubleClickFullscreen":
    "Double-click thumbnail: enter fullscreen.",
  "ui.help.image.mouse.wheelPage": "Mouse wheel: previous / next page.",
  "ui.help.image.mouse.ctrlWheelSidebar":
    "Ctrl + mouse wheel: switch to previous / next sidebar node.",
  "ui.help.image.mouse.nodeBrowseClick":
    "In node browse mode, click cover card: enter the child node.",
  "ui.help.image.mouse.manageDragToggle":
    "In manage mode, hold left mouse and drag across thumbnails: continuous check / uncheck.",
  "ui.help.image.mouse.manageMarquee":
    "In manage mode name-list blank area, left-drag: marquee select; Shift + drag: append selection.",
  "ui.help.image.keyboard.arrowLeftRight": "Previous / next image.",
  "ui.help.image.keyboard.arrowUpDown": "Previous / next row.",
  "ui.help.image.keyboard.fixedCtrlLeftRightShortcut": "Ctrl+Left / Ctrl+Right",
  "ui.help.image.keyboard.ctrlLeftRight":
    "Same as mouse wheel (previous / next page).",
  "ui.help.image.keyboard.fixedCtrlUpDownShortcut": "Ctrl+Up / Ctrl+Down",
  "ui.help.image.keyboard.ctrlUpDown":
    "Same as Ctrl + mouse wheel (switch sidebar node).",
  "ui.help.image.keyboard.fixedCtrlCShortcut": "Ctrl+C",
  "ui.help.image.keyboard.copyFocusedMediaToClipboard":
    "When main area is focused, copy current media to clipboard (image mode copies current original image, video mode copies current frame).",
  "ui.help.image.keyboard.enterFullscreen": "Enter fullscreen.",
  "ui.help.image.keyboard.toggleFullscreen": "Toggle fullscreen.",
  "ui.help.image.keyboard.toggleWindowFullscreen":
    "Toggle window fullscreen (only when media fullscreen is inactive).",
  "ui.help.image.keyboard.focusSwitch":
    "Switch focus between sidebar and main.",
  "ui.help.image.keyboard.fixedModeSwitchShortcut": "F1 / F2 / F3",
  "ui.help.image.keyboard.modeSwitchF1F3":
    "Global (outside fullscreen, or fullscreen in non-dual mode): switch image / video / music modes.",
  "ui.help.image.keyboard.fixedPanelSwitchShortcut": "Ctrl+1 / Ctrl+2 / Ctrl+3",
  "ui.help.image.keyboard.panelSwitchCtrl1Ctrl3":
    "Global (outside fullscreen): toggle search / file manage / metadata manage modes.",
  "ui.help.image.keyboard.fixedSeriesJumpShortcut":
    "Ctrl+F1 / Ctrl+F2 / Ctrl+F3",
  "ui.help.image.keyboard.seriesJumpCtrlF1F3":
    "Outside fullscreen, jump to image / video / music by available same-series target (same as toolbar jump buttons).",
  "ui.help.image.keyboard.rating":
    "Set rating for current focused node (0-5 stars; available in image/video modes).",
  "ui.help.image.keyboard.videoPlaylistAdd":
    "In video mode, add current focused video to playlist.",
  "ui.help.image.keyboard.videoPlaylistRemove":
    "In video mode, remove current focused video from playlist; when a metadata-playlist item is focused, Delete also removes it.",
  "ui.help.image.keyboard.manageOrganize":
    "In file-manage mode, open organize dialog (move/group, requires selected nodes).",
  "ui.help.image.keyboard.imageConvertShortcut":
    "In image mode, trigger RS: in file-manage mode it is the same as RS button; outside file-manage mode it targets current focused sidebar node.",
  "ui.help.image.keyboard.helpOverlayToggle":
    "Outside fullscreen, toggle button-help overlay (? toggle, Esc close).",
  "ui.help.fullscreen.sectionTitle": "Fullscreen interaction guide",
  "ui.help.fullscreen.groupMouse": "Mouse",
  "ui.help.fullscreen.groupKeyboard": "Keyboard",
  "ui.help.fullscreen.mouse.wheelStepMedia":
    "Mouse wheel: previous / next item on focused pane (image or video).",
  "ui.help.fullscreen.mouse.ctrlWheelZoom":
    "Ctrl + wheel: zoom in single-image fullscreen.",
  "ui.help.fullscreen.mouse.dragPanImage":
    "Left-drag to pan when single-image pane is zoomed.",
  "ui.help.fullscreen.mouse.dragVideoDual":
    "In dual display, left-drag to pan video pane content.",
  "ui.help.fullscreen.mouse.clickPaneFocus":
    "In dual display, moving cursor into image/video pane switches focused pane (Tab also works).",
  "ui.help.fullscreen.mouse.dragSplitDivider":
    "In dual display, drag center divider to adjust split ratio.",
  "ui.help.fullscreen.mouse.moveBottomShowFooter":
    "Move cursor to bottom area to show fullscreen footer controls.",
  "ui.help.fullscreen.keyboard.arrowLeftRight":
    "Image-focused pane: previous / next item.",
  "ui.help.fullscreen.keyboard.arrowUpDown":
    "In image mode, jump to first / last item.",
  "ui.help.fullscreen.keyboard.packagePrevNext":
    "In image mode, switch previous / next package.",
  "ui.help.fullscreen.keyboard.align":
    "Adjust focused pane alignment (up/down/left/right).",
  "ui.help.fullscreen.keyboard.focusSwitch":
    "Switch focus between sidebar and main (available outside fullscreen).",
  "ui.help.fullscreen.keyboard.toggleFullscreen": "Toggle fullscreen.",
  "ui.help.fullscreen.keyboard.escapeExit": "Exit fullscreen.",
  "ui.help.fullscreen.keyboard.tabDualFocusSwitch":
    "In dual display, switch focused pane (image/video).",
  "ui.help.fullscreen.keyboard.fixedCtrlCShortcut": "Ctrl+C",
  "ui.help.fullscreen.keyboard.copyFocusedMediaToClipboard":
    "Copy focused media to clipboard (image copies current image, video copies current frame; in dual mode it follows focused pane).",
  "ui.help.fullscreen.keyboard.modeSwitchF1F3":
    "In fullscreen non-dual mode, switch image / video / music modes (disabled in dual display).",
  "ui.help.fullscreen.keyboard.toggleDualDisplay":
    "In image/video fullscreen, toggle single / dual display; when leaving dual, fallback to current focused pane.",
  "ui.help.fullscreen.keyboard.swapSidesDual":
    "In dual display, swap left/right pane order.",
  "ui.help.fullscreen.keyboard.autoplayToggle":
    "Toggle autoplay (fullscreen image-focused pane).",
  "ui.help.fullscreen.keyboard.videoSeekShort":
    "Video mode / video-focused pane: seek backward 5s / forward 5s.",
  "ui.help.fullscreen.keyboard.videoPlayPause":
    "Video mode / video-focused pane: play / pause.",
  "ui.help.fullscreen.keyboard.videoSeekLong":
    "Video mode / video-focused pane: seek backward 30s / forward 30s.",
  "ui.help.fullscreen.keyboard.videoSeekFrame":
    "Video mode / video-focused pane: frame-step backward / forward.",
  "ui.help.fullscreen.keyboard.videoVolumeStep":
    "Video mode / video-focused pane: volume up / down by 5%.",
  "ui.help.fullscreen.keyboard.videoMuteToggle":
    "Video mode / video-focused pane: toggle mute.",
  "ui.help.fullscreen.keyboard.videoPrevNext":
    "Video mode / video-focused pane: previous / next video (based on active queue source: playlist or sidebar).",
  "ui.help.fullscreen.keyboard.videoSaveCover":
    "Video mode / video-focused pane: save current frame as cover.",
  "ui.help.fullscreen.keyboard.videoSubtitleToggle":
    "Video mode / video-focused pane: toggle subtitle visibility.",
  "ui.help.fullscreen.keyboard.videoFitCycle":
    "Video mode / video-focused pane: cycle video fit mode.",
  "ui.help.adReviewStrategy.sectionTitle": "Ad review strategy reference",
  "ui.help.adReviewStrategy.groupOverview": "Strategy overview",
  "ui.help.adReviewStrategy.overview.modeAll":
    "All mode: scan all images with no skip. Use for first-pass review or accuracy-first cases.",
  "ui.help.adReviewStrategy.overview.modeHeadTail":
    "Head-tail mode: scan head/tail windows first, then apply tail-extension and skip rules to reduce LLM calls.",
  "ui.help.adReviewStrategy.overview.knownHashFirst":
    "Known deleted hashes are checked first (known-hash). Hits are marked suspected without new LLM calls.",
  "ui.help.adReviewStrategy.groupHeadTailFlow": "Head-tail execution flow",
  "ui.help.adReviewStrategy.flow.step1":
    "1) Hash short-circuit first: all images check known-hash before LLM.",
  "ui.help.adReviewStrategy.flow.step2":
    "2) Tail window scan: scan the last tailN images (deduplicated against head window).",
  "ui.help.adReviewStrategy.flow.step3":
    "3) Head window scan: scan the first headN images.",
  "ui.help.adReviewStrategy.flow.step4":
    "4) If tail window has no ads: all remaining unscanned images are marked strategy-skip (tail_window_clean).",
  "ui.help.adReviewStrategy.flow.step5":
    "5) If tail window has ads: continue scanning backward until tailStopCleanStreak consecutive clean images; mark remaining as strategy-skip (tail_extension_stop).",
  "ui.help.adReviewStrategy.groupDefaults": "Current defaults",
  "ui.help.adReviewStrategy.defaults.strategyMode":
    "Default strategy mode: all.",
  "ui.help.adReviewStrategy.defaults.headN": "Default headN: 4 (range 1-20).",
  "ui.help.adReviewStrategy.defaults.tailN": "Default tailN: 4 (range 1-20).",
  "ui.help.adReviewStrategy.defaults.tailStop":
    "Default tailStopCleanStreak: 4 (range 1-20).",
  "ui.help.adReviewStrategy.defaults.maxConcurrency":
    "Default maxConcurrency: 4 (range 1-20).",
  "ui.help.adReviewStrategy.groupRiskAndUsage": "Risk and usage guide",
  "ui.help.adReviewStrategy.risk.middleLeak":
    "Risk: ads concentrated in middle pages may be missed in head-tail mode. Switch to All for high coverage.",
  "ui.help.adReviewStrategy.risk.whenUseAll":
    "Use All when building first hash baseline, reviewing disputed sets, or when false negatives are unacceptable.",
  "ui.help.adReviewStrategy.risk.whenUseHeadTail":
    "Use Head-tail for fast batch triage when ads are usually near beginning/end pages.",
  "ui.header.metadataManage": "Metadata Manage",
  "ui.header.importFiles": "Import files",
  "ui.header.importFolders": "Import folders",
  "ui.header.taskStatusLoading": "Loading",
  "ui.header.taskStatusDeleting": "Deleting",
  "ui.header.taskStatusReviewing": "Reviewing",
  "ui.header.taskStatusIdle": "Idle",
  "ui.header.taskStatusImportRunning": "Importing {{count}}",
  "ui.header.taskStatusArchiveRunning": "Normalizing {{progress}}%",
  "ui.header.taskStatusArchivePending": "Normalize queue {{count}}",
  "ui.header.taskStatusThumbnailRunning":
    "Thumbnails {{count}} ({{progress}}%)",
  "ui.header.taskStatusThumbnailQueued": "Thumbnail jobs {{count}}",
  "ui.settings.panel": "Settings Panel",
  "ui.settings.sectionLayout": "Layout",
  "ui.settings.sectionPerformance": "Advanced Paging",
  "ui.settings.sectionAudio": "Audio",
  "ui.settings.sectionModel": "AI Model",
  "ui.settings.sectionDebug": "Debug",
  "ui.settings.sectionShortcuts": "Shortcuts",
  "ui.settings.sectionDatabase": "Database",
  "ui.settings.sectionSystem": "System",
  "ui.settings.languageSection": "Language",
  "ui.settings.languageLabel": "UI language",
  "ui.settings.languageOptionAuto": "Follow system",
  "ui.settings.languageOptionZhCn": "简体中文",
  "ui.settings.languageOptionEnUs": "English",
  "ui.settings.themeSection": "Theme settings",
  "ui.settings.styleLabel": "Style",
  "ui.settings.paletteDayDefault": "Day default palette",
  "ui.settings.paletteNightDefault": "Night default palette",
  "ui.settings.currentActiveTag": " (active)",
  "ui.settings.backdropOpacity": "Panel backdrop opacity {{value}}%",
  "ui.settings.thumbnailSection": "Thumbnail settings",
  "ui.settings.thumbnailGapScale": "Thumbnail gap scale {{scale}} ({{px}}px)",
  "ui.settings.thumbnailQuality": "Thumbnail quality",
  "ui.settings.thumbnailResolution": "Thumbnail width",
  "ui.settings.thumbnailAdaptiveResolution": "Adaptive thumbnail resolution",
  "ui.settings.thumbnailGenerationConcurrency": "Generation concurrency",
  "ui.settings.thumbnailResolveConcurrency": "URL resolve concurrency",
  "ui.settings.performanceLoadSection": "Loading performance",
  "ui.settings.thumbnailPipelineSection": "Thumbnail pipeline",
  "ui.settings.performancePreset": "Performance preset",
  "ui.settings.performancePresetPlaceholder": "-- Select preset --",
  "ui.settings.performancePresetNormal": "Normal (4-core / 8 GB)",
  "ui.settings.performancePresetPerformance": "Performance (8-core / 16 GB)",
  "ui.settings.performancePresetUltra": "Ultra (16-core / 32 GB)",
  "ui.settings.thumbnailQueueSize": "Queue size limit",
  "ui.settings.cpuTokenLimit": "CPU concurrency tokens",
  "ui.settings.thumbnailWarmupRadius": "Adjacent page warmup radius",
  "ui.settings.warmupRadiusOff": "Off",
  "ui.settings.thumbnailWarmupConcurrency": "Warmup batch level",
  "ui.settings.fullscreenPrefetchRadius": "Fullscreen prefetch depth",
  "ui.settings.fullscreenDecodeCacheSize": "Fullscreen decode cache size",
  "ui.settings.fullscreenResamplingEnabled": "Fullscreen resampling",
  "ui.settings.fullscreenResamplingEnabledTooltip":
    "When enabled, fullscreen images are pre-generated for the viewport target size. If not ready, it falls back to original image without blocking page turning.",
  "ui.settings.fullscreenDownsamplingKernel": "Downsampling kernel",
  "ui.settings.fullscreenDownsamplingKernelTooltip":
    "Used when source image is larger than the viewport. Lanczos3 is sharper, Mitchell is balanced, Cubic is smoother, Nearest preserves pixel edges.",
  "ui.settings.fullscreenUpsamplingKernel": "Upsampling kernel",
  "ui.settings.fullscreenUpsamplingKernelTooltip":
    "Used when source image is smaller than the viewport. Nearest is recommended for pixel art, Lanczos3 or Mitchell for regular images.",
  "ui.settings.resamplingKernelLanczos3": "Lanczos3 (sharp)",
  "ui.settings.resamplingKernelMitchell": "Mitchell (balanced)",
  "ui.settings.resamplingKernelNearest": "Nearest (pixel-art)",
  "ui.settings.resamplingKernelCubic": "Cubic (smooth)",
  "ui.settings.layoutSection": "Layout parameters",
  "ui.settings.layoutLocked": "Layout lock",
  "ui.settings.debugSection": "Debug settings",
  "ui.settings.debugHeaderGroup": "Debug",
  "ui.settings.debugTooltips": "tooltips",
  "ui.settings.debugOverlaySection": "Overlay debug",
  "ui.settings.debugOpenDeleteOverlay": "Open delete progress overlay (2.2s)",
  "ui.settings.debugNativeChrome": "Show Electron chrome/menu",
  "ui.settings.showThemeParameterButton": "Show theme parameter button",
  "ui.settings.toggleOn": "On",
  "ui.settings.toggleOff": "Off",
  "ui.themeParameter.panel": "Theme Parameter",
  "ui.themeParameter.toolsSection": "Tools",
  "ui.themeParameter.actionsSection": "Actions",
  "ui.themeParameter.searchLabel": "Parameter search",
  "ui.themeParameter.searchPlaceholder": "Type keywords to filter parameters",
  "ui.themeParameter.snapshotLabel": "Snapshot JSON",
  "ui.themeParameter.snapshotPlaceholder":
    "Paste JSON to import, or export and copy from here",
  "ui.themeParameter.exportJson": "Export JSON",
  "ui.themeParameter.downloadJsonFile": "Download JSON file",
  "ui.themeParameter.loadJsonFile": "Load JSON file",
  "ui.themeParameter.copyJson": "Copy JSON",
  "ui.themeParameter.importJson": "Apply import",
  "ui.themeParameter.clearJson": "Clear JSON",
  "ui.themeParameter.snapshotExported": "Snapshot generated for current style.",
  "ui.themeParameter.snapshotDownloaded": "Snapshot file downloaded.",
  "ui.themeParameter.snapshotDownloadFailed":
    "Download failed. Please copy JSON manually.",
  "ui.themeParameter.snapshotCopied": "Snapshot copied to clipboard.",
  "ui.themeParameter.snapshotCopyFailed":
    "Copy failed. Please copy the text manually.",
  "ui.themeParameter.snapshotFileLoaded": "Snapshot file loaded: {{fileName}}.",
  "ui.themeParameter.snapshotFileLoadFailed": "Failed to read JSON file.",
  "ui.themeParameter.snapshotImported": "Snapshot applied.",
  "ui.themeParameter.snapshotImportedStyleMismatch":
    "Snapshot style {{styleId}} does not match current style. Only compatible parameters were applied.",
  "ui.themeParameter.snapshotImportFailed":
    "Failed to parse JSON or invalid payload format.",
  "ui.themeParameter.snapshotEmpty": "Please provide or export JSON first.",
  "ui.themeParameter.sectionCommon": "Common parameters",
  "ui.themeParameter.sectionStyle": "Style parameters ({{styleId}})",
  "ui.themeParameter.sectionMetric": "{{scope}} {{target}} {{metric}}",
  "ui.themeParameter.scopeHeader": "Header",
  "ui.themeParameter.scopeSidebar": "Sidebar",
  "ui.themeParameter.scopeMain": "Main",
  "ui.themeParameter.scopeMetadata": "Metadata",
  "ui.themeParameter.targetPane": "pane",
  "ui.themeParameter.targetControl": "control",
  "ui.themeParameter.metricElevation": "elevation",
  "ui.themeParameter.metricShadowStrength": "shadow strength",
  "ui.themeParameter.metricShadowHardness": "shadow hardness",
  "ui.themeParameter.metricBorderContrast": "border contrast",
  "ui.themeParameter.metricBorderColor": "border color",
  "ui.themeParameter.noStyleSpecific":
    "No style-specific parameter for current style.",
  "ui.themeParameter.resetCurrentStyle": "Reset current style parameters",
  "ui.themeParameter.layoutPadding": "Layout padding",
  "ui.themeParameter.splitterWidth": "Splitter width",
  "ui.themeParameter.panelRadius": "Panel radius",
  "ui.themeParameter.headerRadius": "Header radius",
  "ui.themeParameter.cardRadius": "Card radius",
  "ui.themeParameter.controlRadius": "Control radius",
  "ui.themeParameter.panelBorderWidth": "Panel border width",
  "ui.themeParameter.controlBorderWidth": "Control border width",
  "ui.themeParameter.panelPadding": "Panel padding",
  "ui.themeParameter.headerButtonSize": "Header button size",
  "ui.themeParameter.headerButtonRadius": "Header button radius",
  "ui.themeParameter.headerGroupGap": "Header group gap",
  "ui.themeParameter.headerItemGap": "Header item gap",
  "ui.themeParameter.skeuoPaneElevation": "Skeuo pane elevation",
  "ui.themeParameter.skeuoHeaderGap": "Header floating gap",
  "ui.themeParameter.skeuoContainerElevation": "Skeuo container elevation",
  "ui.themeParameter.skeuoControlElevation": "Skeuo control elevation",
  "ui.themeParameter.skeuoBorderContrast": "Skeuo border contrast",
  "ui.themeParameter.skeuoShadowStrength": "Skeuo shadow strength",
  "ui.themeParameter.skeuoPressDepth": "Skeuo press depth",
  "ui.themeParameter.glassBlur": "Liquid glass blur",
  "ui.themeParameter.glassSaturation": "Liquid glass saturation",
  "ui.themeParameter.glassSurfaceOpacity": "Liquid glass surface opacity",
  "ui.themeParameter.glassControlDepth": "Liquid glass control lift depth",
  "ui.themeParameter.shadowOffset": "Hard shadow offset",
  "ui.themeParameter.controlHoverOffset": "Control hover offset",
  "ui.themeParameter.brutalBorderWidth": "Brutal border width",
  "ui.themeParameter.brutalCornerRadius": "Brutal corner radius",
  "ui.settings.headerHeightScale": "Header height scale {{scale}} ({{px}}px)",
  "ui.settings.settingsFontScale": "Settings font scale {{scale}} ({{px}}px)",
  "ui.settings.layoutGapScaleCoeff": "Layout gap coeff {{value}}x",
  "ui.settings.sidebarRatio": "Sidebar ratio {{percent}}%",
  "ui.settings.sidebarMinWidthScale":
    "Sidebar min width scale {{scale}} ({{px}}px)",
  "ui.settings.sidebarFontScale": "Sidebar font scale {{scale}} ({{px}}px)",
  "ui.settings.sidebarCountFontScale":
    "Sidebar count font scale {{scale}} ({{px}}px)",
  "ui.settings.sidebarIndentScale": "Tree indent scale {{scale}} ({{px}}px)",
  "ui.settings.sidebarVerticalGapScale":
    "Tree vertical gap scale {{scale}} ({{px}}px)",
  "ui.settings.metadataPanelRatio": "Metadata panel ratio {{percent}}%",
  "ui.settings.workspaceBottomPanelHeightScale":
    "Search/manage panel height scale {{scale}} ({{px}}px)",
  "ui.settings.fullscreenVideoControlsMaxWidthScale":
    "Fullscreen video controls max width scale {{scale}} ({{px}}px)",
  "ui.settings.mediaPreloadMemoryBudgetMb":
    "Media preload memory budget {{value}}MB",
  "ui.settings.tooltip.uiLocale":
    'Set UI language. "Follow system" applies system language on startup.',
  "ui.settings.tooltip.style":
    "Switch the full theme style set (Style), including available day/night palette options.",
  "ui.settings.tooltip.paletteDay":
    "Set default day-mode palette. Effective when day palette is active.",
  "ui.settings.tooltip.paletteNight":
    "Set default night-mode palette. Effective when night palette is active.",
  "ui.settings.tooltip.backdropOpacity":
    "Adjust settings panel backdrop opacity; higher values darken the background.",
  "ui.settings.tooltip.thumbnailGap":
    "Control spacing between thumbnails, affecting density and visible count per screen.",
  "ui.settings.tooltip.thumbnailQuality":
    "Control thumbnail encoding quality. Higher means better quality but larger size and slower generation.",
  "ui.settings.tooltip.thumbnailResolution":
    "Control target thumbnail width. Larger values improve clarity but increase memory/decode cost.",
  "ui.settings.tooltip.thumbnailAdaptiveResolution":
    "Scale thumbnail resolution to match actual display size (multiplied by device DPR). Significantly faster in dense grid layouts. When off, uses fixed thumbnail width.",
  "ui.settings.tooltip.thumbnailGenerationConcurrency":
    "Control concurrent thumbnail generation tasks. Too high may compete with foreground rendering.",
  "ui.settings.tooltip.thumbnailResolveConcurrency":
    "Control concurrent thumbnail URL resolving. Too high increases I/O pressure.",
  "ui.settings.tooltip.thumbnailQueueSize":
    "Thumbnail generation task queue capacity. When full, oldest tasks are dropped (frontend retries automatically). Increase to reduce drops during fast scrolling, but uses more memory.",
  "ui.settings.tooltip.cpuTokenLimit":
    "Global CPU-intensive task concurrency. Increase to speed up thumbnail generation and fullscreen resampling, but competes with import tasks for CPU.",
  "ui.settings.tooltip.performancePreset":
    "Apply a pre-tuned parameter set for specific hardware profiles. Immediately overwrites current values; the preset name itself is not saved.",
  "ui.settings.tooltip.layoutLocked":
    "Lock main layout ratios to prevent accidental changes by dragging.",
  "ui.settings.tooltip.headerHeight":
    "Adjust header height and available top toolbar space.",
  "ui.settings.tooltip.settingsFontScale":
    "Adjust settings panel font size for readability vs density.",
  "ui.settings.tooltip.layoutGapScaleCoeff":
    "Adjust the unified gap coefficient between Header/Sidebar/Main/Meta. Baseline is 1% of window width.",
  "ui.settings.tooltip.sidebarRatio":
    "Adjust sidebar ratio. Larger values reduce main content width.",
  "ui.settings.tooltip.sidebarMinWidth":
    "Set minimum sidebar width to avoid over-compression.",
  "ui.settings.tooltip.sidebarFontScale": "Adjust sidebar primary text size.",
  "ui.settings.tooltip.sidebarCountFontScale":
    "Adjust sidebar count text size to balance readability and visual noise.",
  "ui.settings.tooltip.sidebarIndentScale":
    "Adjust tree indent spacing to improve hierarchy recognition.",
  "ui.settings.tooltip.sidebarVerticalGapScale":
    "Adjust vertical spacing between tree items for compactness.",
  "ui.settings.tooltip.metadataPanelRatio":
    "Adjust right metadata panel width ratio.",
  "ui.settings.tooltip.workspaceBottomPanelHeightScale":
    "Adjust bottom search/manage panel height.",
  "ui.settings.tooltip.fullscreenVideoControlsMaxWidthScale":
    "Limit fullscreen video controls max width to avoid over-spread on ultra-wide screens.",
  "ui.settings.tooltip.mediaPreloadMemoryBudgetMb":
    "Limit media preload memory budget. Higher values improve smoothness but increase memory usage.",
  "ui.settings.tooltip.thumbnailWarmupRadius":
    "Warm up thumbnails around current page to reduce first-frame wait after page turn.",
  "ui.settings.tooltip.thumbnailWarmupConcurrency":
    "Warmup batch level (not thread count). Higher is faster but can steal foreground resources.",
  "ui.settings.tooltip.fullscreenPrefetchRadius":
    "Prefetch depth for adjacent media in fullscreen. Larger improves smoothness but uses more memory.",
  "ui.settings.tooltip.fullscreenDecodeCacheSize":
    "Fullscreen decode cache cap. Larger improves hit rate but raises memory usage.",
  "ui.settings.tooltip.databaseReset":
    "Reset media library database and rebuild indexes; clears persisted library state.",
  "ui.settings.tooltip.sqlDatabasePath":
    "Current SQLite database directory for storage migration and diagnostics.",
  "ui.settings.tooltip.thumbnailCacheDirectory":
    "Thumbnail cache directory. Moving it can reduce system drive usage.",
  "ui.settings.tooltip.proxyServer":
    "Configure request proxy (HTTP/SOCKS) for model downloads and external requests.",
  "ui.settings.tooltip.ehentaiAuth":
    "Sign in through built-in browser and keep session automatically, no manual Cookie paste needed.",
  "ui.settings.tooltip.offlineSubtitleVadPreset":
    "Choose VAD preset to balance segmentation sensitivity and stability.",
  "ui.settings.tooltip.offlineSubtitleVadThreshold":
    "VAD decision threshold. Lower detects more speech; higher is more conservative.",
  "ui.settings.tooltip.offlineSubtitleVadMinSilenceSec":
    "Minimum silence duration used to split sentences.",
  "ui.settings.tooltip.offlineSubtitleVadMinSpeechSec":
    "Minimum speech duration; segments below this are suppressed.",
  "ui.settings.tooltip.offlineSubtitleVadMaxSpeechSec":
    "Maximum speech segment duration before forced split.",
  "ui.settings.tooltip.offlineSubtitleSpeakerThreshold":
    "Speaker similarity threshold. Higher values separate speakers more strictly.",
  "ui.settings.tooltip.offlineSubtitleValidPlaybackRateThreshold":
    "Valid playback-rate threshold for filtering unreliable segments.",
  "ui.settings.tooltip.offlineSubtitleLanguage":
    "Set target ASR language. Auto mode performs language detection first.",
  "ui.settings.tooltip.offlineSubtitleModelProfile":
    "Select offline subtitle model profile: Current keeps the stable existing pipeline; FunASR-Nano uses an isolated debug pipeline.",
  "ui.settings.tooltip.offlineSubtitleModelDir":
    "Offline subtitle model directory. Must contain recognized model files.",
  "ui.settings.tooltip.offlineSubtitleOffsetY":
    "Adjust subtitle vertical position to avoid covering key content.",
  "ui.settings.tooltip.offlineSubtitleTextFillMode":
    "Set subtitle text fill mode: solid or gradient.",
  "ui.settings.tooltip.offlineSubtitleTextColor":
    "Subtitle text color in solid mode.",
  "ui.settings.tooltip.offlineSubtitleGradientStartColor":
    "Start color for gradient subtitle text.",
  "ui.settings.tooltip.offlineSubtitleGradientEndColor":
    "End color for gradient subtitle text.",
  "ui.settings.tooltip.offlineSubtitleGradientDirection":
    "Set subtitle gradient direction.",
  "ui.settings.tooltip.offlineSubtitleGradientCurve":
    "Set gradient interpolation curve for transition feel.",
  "ui.settings.tooltip.offlineSubtitleStrokeColor":
    "Set subtitle stroke color for contrast.",
  "ui.settings.tooltip.offlineSubtitleStrokeWidth":
    "Set subtitle stroke width to improve readability on complex backgrounds.",
  "ui.settings.tooltip.offlineSubtitleFontSize":
    "Set subtitle font size for readability vs occlusion.",
  "ui.settings.tooltip.offlineSubtitleMaxLineChars":
    "Limit max characters per line; auto-wrap when exceeded.",
  "ui.settings.tooltip.offlineSubtitleStrokeShadowColor":
    "Set stroke shadow color for edge separation.",
  "ui.settings.tooltip.offlineSubtitleStrokeShadowRadius":
    "Set stroke shadow blur radius.",
  "ui.settings.tooltip.adReviewVisionEndpoint":
    "Endpoint URL used by ad-review vision model.",
  "ui.settings.tooltip.adReviewVisionModel":
    "Vision model identifier used by ad review.",
  "ui.settings.tooltip.subtitleCleanupLlmEndpoint":
    "LLM endpoint used for subtitle cleanup tasks.",
  "ui.settings.tooltip.subtitleCleanupLlmModel":
    "LLM model identifier used for subtitle cleanup tasks.",
  "ui.settings.tooltip.subtitleCleanupLlmPrompt":
    "Prompt template for subtitle cleanup behavior and output style.",
  "ui.settings.runtimeDiagnosticsLegend": "Runtime diagnostics",
  "ui.settings.runtimeDiagnosticsHint":
    "Used to inspect backend bridge/path differences between EXE and dev:desktop.",
  "ui.settings.repositoryMode": "Repository mode",
  "ui.settings.appVersion": "App version",
  "ui.settings.platformArch": "Platform/arch",
  "ui.settings.userDataPath": "UserData path",
  "ui.settings.rendererProd": "Renderer PROD",
  "ui.settings.backendBridge": "Backend bridge",
  "ui.settings.mainIsPackaged": "Main isPackaged",
  "ui.settings.libraryRoot": "Library root",
  "ui.settings.databasePath": "Database path",
  "ui.settings.bridgeMissingWarning":
    "Production build with no backend bridge detected. Mock fallback is disabled; verify preload injection in packaged output.",
  "ui.settings.backendBridgeMissingInMock":
    "Backend bridge (window.mediaPlayerBackend) is missing; this may be browser mock mode.",
  "ui.settings.runtimeDiagnosticsUnsupported":
    "Runtime diagnostics API (readRuntimeInfo) is not available in current backend.",
  "ui.settings.runtimeDiagnosticsTimeout":
    "Runtime diagnostics request timed out (>{{ms}}ms)",
  "ui.settings.runtimeDiagnosticsReadFailed":
    "Failed to read runtime diagnostics",
  "ui.settings.gpuDiagnosticsLegend": "GPU diagnostics (Main)",
  "ui.settings.hardwareAccelerationEnabled": "Hardware acceleration enabled",
  "ui.settings.gpuFeatureStatusEmpty": "No GPU FeatureStatus data.",
  "ui.settings.gpuInfoEmpty": "No GPUInfo(basic) data.",
  "ui.settings.mediaCapabilitiesLegend": "Decode capability probe (Renderer)",
  "ui.settings.mediaCapability.h264Avc1080p": "H.264 / AVC 1080p",
  "ui.settings.mediaCapability.h265Hevc1080p": "H.265 / HEVC 1080p",
  "ui.settings.mediaCapability.av11080p": "AV1 1080p",
  "ui.settings.mediaCapability.vp91080p": "VP9 1080p",
  "ui.settings.mediaCapabilitiesLoading": "Checking...",
  "ui.settings.mediaCapabilitiesUnsupportedApi":
    "MediaCapabilities API is not supported in current environment",
  "ui.settings.mediaCapabilitiesTimeout":
    "Decode capability probe timed out (>{{ms}}ms)",
  "ui.settings.mediaCapabilitiesProbeFailed": "Decode capability probe failed",
  "ui.settings.preferenceDebugLegend": "Preference debug panel",
  "ui.settings.preferenceDebugHint":
    "Inspect preference aggregate snapshot and latest reported session events from xp_preference_metrics_v1 app_state.",
  "ui.settings.preferenceDebugLoading": "Loading preference debug data...",
  "ui.settings.preferenceDebugUnsupported":
    "Current backend does not expose readAppState; preference debug data is unavailable.",
  "ui.settings.preferenceDebugReadFailed":
    "Failed to read preference debug data",
  "ui.settings.preferenceDebugNoData": "No preference debug data",
  "ui.settings.preferenceDebugReason": "Last write reason",
  "ui.settings.preferenceDebugUpdatedAt": "Last write time",
  "ui.settings.preferenceDebugImageAggregateCount": "Image aggregate items",
  "ui.settings.preferenceDebugVideoAggregateCount": "Video aggregate items",
  "ui.settings.preferenceDebugImageSessionCount": "Latest image session events",
  "ui.settings.preferenceDebugVideoSessionCount": "Latest video session events",
  "ui.settings.preferenceDebugImageSessionsLatest":
    "Latest image session events (max 8)",
  "ui.settings.preferenceDebugVideoSessionsLatest":
    "Latest video session events (max 8)",
  "ui.error.codeTag": "Error code {{code}}",
  "ui.error.unknown": "Unknown error",
  "ui.settings.mediaCapabilitySupported":
    "supported={{supported}}, smooth={{smooth}}, powerEfficient={{powerEfficient}}",
  "ui.settings.mediaCapabilityUnsupportedWithError": "unsupported ({{error}})",
  "ui.settings.mediaCapabilityUnsupported": "unsupported",
  "ui.settings.adReviewVisionLegend": "AI ad review vision model",
  "ui.settings.subtitleCleanupLlmLegend": "Subtitle cleanup LLM",
  "ui.settings.subtitleCleanupLlmEndpoint": "Subtitle cleanup endpoint",
  "ui.settings.subtitleCleanupLlmModel": "Subtitle cleanup model",
  "ui.settings.subtitleCleanupLlmPromptSection":
    "Subtitle cleanup prompt (collapsible)",
  "ui.settings.subtitleCleanupLlmPrompt": "Subtitle cleanup prompt",
  "ui.settings.subtitleCleanupLlmHint":
    "Used by manage-mode subtitle cleanup, separate from ad review model settings.",
  "ui.settings.offlineSubtitleLegend": "Offline auto subtitles",
  "ui.settings.offlineSubtitleEnabled": "Offline auto subtitles",
  "ui.settings.offlineSubtitleRenderMode": "Auto subtitle mode",
  "ui.settings.offlineSubtitleRenderModeSimple": "Simple",
  "ui.settings.offlineSubtitleRenderModeAdvanced": "Advanced",
  "ui.settings.offlineSubtitleAdvancedSection": "Advanced parameters",
  "ui.settings.offlineSubtitleVadPreset": "VAD preset",
  "ui.settings.offlineSubtitleVadPresetBalanced": "Balanced",
  "ui.settings.offlineSubtitleVadPresetConservative":
    "Conservative (fewer splits)",
  "ui.settings.offlineSubtitleVadPresetAggressive": "Aggressive (more splits)",
  "ui.settings.offlineSubtitleVadThreshold": "VAD threshold",
  "ui.settings.offlineSubtitleVadMinSilenceSec": "Minimum silence duration",
  "ui.settings.offlineSubtitleVadMinSpeechSec": "Minimum speech duration",
  "ui.settings.offlineSubtitleVadMaxSpeechSec": "Maximum speech duration",
  "ui.settings.offlineSubtitleSpeakerThreshold": "Speaker similarity threshold",
  "ui.settings.offlineSubtitleValidPlaybackRateThreshold":
    "Valid playback rate threshold",
  "ui.settings.offlineSubtitleAcceleration": "Inference acceleration",
  "ui.settings.offlineSubtitleAccelerationCpu": "CPU only",
  "ui.settings.offlineSubtitleLanguage": "Recognition language",
  "ui.settings.offlineSubtitleLanguageAuto": "Auto detect",
  "ui.settings.offlineSubtitleLanguageZh": "Chinese",
  "ui.settings.offlineSubtitleLanguageEn": "English",
  "ui.settings.offlineSubtitleLanguageJa": "Japanese",
  "ui.settings.offlineSubtitleLanguageKo": "Korean",
  "ui.settings.offlineSubtitleLanguageYue": "Cantonese",
  "ui.settings.offlineSubtitleModelProfile": "Model profile",
  "ui.settings.offlineSubtitleModelProfileCurrent": "Current (stable)",
  "ui.settings.offlineSubtitleModelProfileFunasrNano": "FunASR-Nano (debug)",
  "ui.settings.offlineSubtitleModelDir": "Model directory",
  "ui.settings.offlineSubtitleModelDirPlaceholder": "Choose model directory",
  "ui.settings.offlineSubtitleChooseModelDir": "Choose model directory",
  "ui.settings.offlineSubtitleTextFillMode": "Text fill",
  "ui.settings.offlineSubtitleTextFillModeSolid": "Solid",
  "ui.settings.offlineSubtitleTextFillModeGradient": "Gradient",
  "ui.settings.offlineSubtitleTextColor": "Text color",
  "ui.settings.offlineSubtitleGradientStartColor": "Gradient start color",
  "ui.settings.offlineSubtitleGradientEndColor": "Gradient end color",
  "ui.settings.offlineSubtitleGradientDirection": "Gradient direction",
  "ui.settings.offlineSubtitleGradientDirectionLeftToRight": "Left -> Right",
  "ui.settings.offlineSubtitleGradientDirectionRightToLeft": "Right -> Left",
  "ui.settings.offlineSubtitleGradientDirectionTopToBottom": "Top -> Bottom",
  "ui.settings.offlineSubtitleGradientDirectionBottomToTop": "Bottom -> Top",
  "ui.settings.offlineSubtitleGradientDirectionTopLeftToBottomRight":
    "Top-left -> Bottom-right",
  "ui.settings.offlineSubtitleGradientDirectionTopRightToBottomLeft":
    "Top-right -> Bottom-left",
  "ui.settings.offlineSubtitleGradientDirectionBottomLeftToTopRight":
    "Bottom-left -> Top-right",
  "ui.settings.offlineSubtitleGradientDirectionBottomRightToTopLeft":
    "Bottom-right -> Top-left",
  "ui.settings.offlineSubtitleGradientCurve": "Gradient curve",
  "ui.settings.offlineSubtitleGradientCurveLinear": "linear",
  "ui.settings.offlineSubtitleGradientCurveSmooth": "smooth",
  "ui.settings.offlineSubtitleGradientCurveBezier": "bezier",
  "ui.settings.offlineSubtitleGradientCurveSmoother": "smoother",
  "ui.settings.offlineSubtitleStrokeColor": "Stroke color",
  "ui.settings.offlineSubtitleStrokeWidth": "Stroke width",
  "ui.settings.offlineSubtitleFontSize": "Subtitle font size",
  "ui.settings.offlineSubtitleFontSizeValue": "{{value}} px",
  "ui.settings.offlineSubtitleMaxLineChars": "Single-line length limit",
  "ui.settings.offlineSubtitleMaxLineCharsValue":
    "{{value}} chars (wrap when exceeded)",
  "ui.settings.offlineSubtitleStrokeShadowColor": "Stroke shadow color",
  "ui.settings.offlineSubtitleStrokeShadowRadius": "Stroke shadow radius",
  "ui.settings.offlineSubtitleOffsetY": "Subtitle Y offset",
  "ui.settings.offlineSubtitleOffsetYValue":
    "{{value}} px (positive moves up, negative moves down)",
  "ui.settings.offlineSubtitleOffsetYShortcutHint":
    "Shortcut: Shift + Up / Shift + Down (video-related modes only)",
  "ui.settings.offlineSubtitleStyleSection": "Subtitle style (collapsible)",
  "ui.settings.offlineSubtitleRescanDirectory": "Rescan model directory",
  "ui.settings.offlineSubtitleDownloadModel": "Download fixed model",
  "ui.settings.offlineSubtitleCancelDownload": "Cancel download",
  "ui.settings.offlineSubtitleNoLocalModels":
    "No installed model found in current model directory.",
  "ui.settings.offlineSubtitleLocalModelsSummary":
    "{{count}} local model(s) installed.",
  "ui.settings.offlineSubtitleDownloadProgress":
    "status={{status}} | progress={{percent}}% | speed={{speed}}KB/s | eta={{eta}}s | message={{message}}",
  "ui.settings.offlineSubtitleDownloadUnsupported":
    "Current backend does not support offline subtitle model downloads.",
  "ui.settings.offlineSubtitleDownloadUnsupportedForProfile":
    "One-click download is not available for this profile: {{profile}}. Please prepare model files manually.",
  "ui.settings.offlineSubtitleModelDirRequired":
    "Please choose model directory first.",
  "ui.settings.offlineSubtitleProxyConfirm":
    "Proxy is configured: {{proxy}}. Use proxy for this model download?",
  "ui.settings.offlineSubtitleDownloadFailed":
    "Model download failed: {{message}}",
  "ui.settings.offlineSubtitleOpenModelPage": "Open model page",
  "ui.settings.offlineSubtitleOpenModelPageFailed":
    "Failed to open model page: {{message}}",
  "ui.settings.offlineSubtitleRefreshSummary":
    "Model list refreshed: remote {{remote}}, local {{local}}.",
  "ui.settings.offlineSubtitleRefreshSummaryAt":
    "Model list refreshed: remote {{remote}}, local {{local}} ({{at}}).",
  "ui.settings.offlineSubtitleScanValid":
    "Model directory is valid and ready for auto subtitles.",
  "ui.settings.offlineSubtitleScanMissing":
    "No valid model files found in this directory (Current requires tokens.txt + model.onnx; FunASR-Nano requires encoder_adaptor/llm/embedding + tokenizer directory).",
  "ui.settings.offlineSubtitleScanSelectConcreteDir":
    "Detected {{count}} valid model directories. Please select the concrete model directory instead of its parent.",
  "ui.settings.offlineSubtitleManualInstallHint":
    'Current: place tokens.txt and model.onnx. FunASR-Nano: place encoder_adaptor/llm/embedding and tokenizer directory, then click "Rescan model directory".',
  "ui.settings.pickSubtitleModelDirectoryDialogTitle":
    "Choose offline subtitle model directory",
  "ui.settings.adReviewVisionEndpoint": "Vision endpoint",
  "ui.settings.adReviewVisionModel": "Vision model ID",
  "ui.settings.adReviewVisionPassed": "Test passed",
  "ui.settings.adReviewVisionUntested": "Untested",
  "ui.settings.adReviewVisionHint":
    "After testing passes, the ad review button is shown in manage toolbar.",
  "ui.settings.visionModelTestUnsupported":
    "Current backend does not support vision model tests",
  "ui.settings.visionModelRequired":
    "Please fill both vision endpoint and model ID",
  "ui.settings.visionModelTesting": "Testing...",
  "ui.settings.visionModelTestFailed": "Model test failed: {{message}}",
  "ui.settings.visionModelSaveUnsupported":
    "Current backend does not support saving model settings",
  "ui.settings.visionModelSaved": "Vision model settings saved",
  "ui.settings.visionModelSaveFailed": "Save failed: {{message}}",
  "ui.settings.shortcutsTitle": "Shortcut settings",
  "ui.settings.shortcutConflictsTitle": "Conflict check",
  "ui.settings.shortcutConflictsNone": "No conflicts.",
  "ui.settings.shortcutConflictLine":
    "{{scope}} scope: {{combo}} -> {{actions}}",
  "ui.settings.shortcutNotSet": "Not set",
  "ui.settings.shortcutNoneConfigured": "No shortcut configured.",
  "ui.settings.shortcutCaptureTitle": "Capture shortcut",
  "ui.settings.shortcutCaptureHint": "Press keyboard/mouse (supports combos).",
  "ui.settings.shortcutCaptureWaiting": "Waiting for input...",
  "ui.settings.shortcutMousePresets": "Quick mouse presets",
  "ui.settings.shortcutConfirmAdd": "Confirm add",
  "ui.settings.mousePresetLeft": "Mouse left",
  "ui.settings.mousePresetMiddle": "Mouse middle",
  "ui.settings.mousePresetRight": "Mouse right",
  "ui.settings.mousePresetBack": "Mouse back",
  "ui.settings.mousePresetForward": "Mouse forward",
  "ui.settings.mousePresetWheelUp": "Wheel up",
  "ui.settings.mousePresetWheelDown": "Wheel down",
  "ui.settings.databaseResetHint":
    "In development, this can clear local database then restart to verify init flow.",
  "ui.settings.databaseResetLabel": "Reset database (dev)",
  "ui.settings.databaseResetPending": "Clearing...",
  "ui.settings.databaseResetAction": "Clear database",
  "ui.settings.databaseResetUnsupported":
    "Current backend does not support clearing database",
  "ui.settings.databaseResetConfirmPrompt":
    "Clearing database removes rating/cover/task/playlist caches, and clears import reference list and thumbnail/normalized caches. This is for development only. Continue?",
  "ui.settings.databaseResetFailed": "Failed to clear database",
  "ui.settings.databaseDirectoryLegend": "Database directory settings",
  "ui.settings.databaseDirectoryHint":
    "Selection is saved immediately and restored after restart.",
  "ui.settings.databaseDirectoryMigrationHint":
    "If existing data is present, switching SQL directory migrates the database file automatically.",
  "ui.settings.sqlDatabasePathLabel": "SQL path",
  "ui.settings.readRuntimeInfoPlaceholder":
    "Visible after runtime diagnostics load",
  "ui.settings.runtimePathSaving": "Saving...",
  "ui.settings.runtimePathUnsupported":
    "Current backend does not support persisting directories",
  "ui.settings.runtimePathSaved": "Directory saved",
  "ui.settings.runtimePathSavedMigrated":
    "Directory saved, database file migrated",
  "ui.settings.runtimePathSaveFailed": "Directory save failed: {{message}}",
  "ui.settings.runtimeCapabilityReadFailed":
    "Runtime capability probe failed: {{message}}",
  "ui.settings.chooseSqlDirectory": "Choose SQL directory",
  "ui.settings.pickSqlDirectoryDialogTitle": "Choose SQL library directory",
  "ui.settings.thumbnailCacheDirectoryLabel": "Thumbnail cache path",
  "ui.settings.chooseThumbnailDirectory": "Choose thumbnail directory",
  "ui.settings.pickThumbnailDirectoryDialogTitle":
    "Choose thumbnail cache directory",
  "ui.settings.networkProxyLegend": "Network proxy settings",
  "ui.settings.networkProxyHint":
    "Used for metadata fetch flow; supports socks5:// and http(s)://.",
  "ui.settings.proxyServerLabel": "Proxy server",
  "ui.settings.proxyServerPlaceholder": "e.g. socks5://127.0.0.1:2080",
  "ui.settings.ehentaiAuthLegend": "E-Hentai Account Connection",
  "ui.settings.ehentaiAuthHint":
    "Authentication now uses web sign-in session only; manual Cookie input is no longer supported.",
  "ui.settings.ehentaiAuthChecking": "Checking sign-in status...",
  "ui.settings.ehentaiAuthConnected": "Connected",
  "ui.settings.ehentaiAuthDisconnected": "Disconnected",
  "ui.settings.ehentaiAuthConnectAction": "Connect account",
  "ui.settings.ehentaiAuthDisconnectAction": "Disconnect and clear",
  "ui.settings.ehentaiAuthRefreshAction": "Refresh status",
  "ui.settings.ehentaiAuthConnecting": "Opening sign-in page...",
  "ui.settings.ehentaiAuthDisconnecting": "Disconnecting...",
  "ui.settings.ehentaiAuthUnsupported":
    "Current backend does not support account connection",
  "ui.settings.ehentaiAuthCheckFailed": "Status check failed: {{message}}",
  "ui.settings.ehentaiAuthConnectOpened":
    "Sign-in window opened. Complete sign-in and click Refresh Status.",
  "ui.settings.ehentaiAuthConnectFailed": "Connect failed: {{message}}",
  "ui.settings.ehentaiAuthDisconnectFailed": "Disconnect failed: {{message}}",
  "ui.settings.ehentaiAuthDisconnectFailedDefault":
    "Disconnect did not complete, please retry",
  "ui.settings.backendError.library": "Data snapshot",
  "ui.settings.backendError.sidebar": "Sidebar tree",
  "ui.settings.backendError.page": "Main paged list",
  "ui.settings.backendError.metadata": "Metadata panel",
  "ui.settings.backendError.gradeWrite": "Grade write",
  "ui.settings.backendError.metadataWrite": "Metadata write",
  "ui.settings.backendError.coverWrite": "Cover write",
  "ui.settings.backendError.manageWrite": "Manage action",
  "ui.settings.backendError.playlistRead": "Playlist read",
  "ui.settings.backendError.playlistWrite": "Playlist write",
  "ui.settings.backendError.runtimeCapability": "Runtime dependency precheck",
  "ui.metadata.fetchTitle": "Fetch Metadata",
  "ui.metadata.expandPanel": "Expand metadata panel",
  "ui.metadata.panelTitle": "Metadata panel",
  "ui.metadata.noEditableAudio": "No editable audio selected",
  "ui.metadata.album": "Album",
  "ui.metadata.author": "Author",
  "ui.metadata.trackTitle": "Track title",
  "ui.metadata.seriesId": "Series ID",
  "ui.metadata.preferenceRecordTitle": "Behavior analysis record",
  "ui.metadata.preferenceEventCount": "Event count",
  "ui.metadata.preferencePagesRead": "Pages read",
  "ui.metadata.preferenceWatchSeconds": "Watch duration",
  "ui.metadata.preferenceCompletionRatio": "Completion ratio",
  "ui.metadata.preferenceLastEventAt": "Last event time",
  "ui.metadata.bookletBinding": "Booklet binding",
  "ui.metadata.coverSource": "Cover source",
  "ui.metadata.auto": "Auto",
  "ui.metadata.none": "None",
  "ui.metadata.bookletSource": "Booklet source",
  "ui.metadata.openCover": "Open cover",
  "ui.metadata.openBooklet": "Open booklet",
  "ui.metadata.resetAuto": "Reset auto",
  "ui.metadata.noPlaylistEntries": "No playlist entries",
  "ui.metadata.videoInfoTab": "Video info",
  "ui.metadata.playlistTab": "Playlist",
  "ui.metadata.savePlaylist": "Save playlist",
  "ui.metadata.savePlaylistPrompt": "Playlist name",
  "ui.metadata.createPlaylist": "Create playlist",
  "ui.metadata.createPlaylistPrompt": "New playlist name",
  "ui.metadata.savedPlaylistNamePlaceholder": "Enter playlist name",
  "ui.metadata.savedPlaylistSelect": "Saved playlists",
  "ui.metadata.savedPlaylistSelectPlaceholder": "Select saved playlist",
  "ui.metadata.loadSavedPlaylist": "Load saved playlist",
  "ui.metadata.deleteSavedPlaylist": "Delete saved playlist",
  "ui.metadata.noSavedPlaylists": "No saved playlists",
  "ui.metadata.fileName": "File name",
  "ui.metadata.japaneseTitle": "Japanese title",
  "ui.metadata.workTitle": "Work title",
  "ui.metadata.englishTitle": "English title",
  "ui.metadata.japaneseCircle": "Japanese circle name",
  "ui.metadata.circle": "Circle",
  "ui.metadata.englishCircle": "English circle name",
  "ui.metadata.japaneseAuthor": "Japanese author name",
  "ui.metadata.englishAuthor": "English author name",
  "ui.metadata.tagsPlaceholder": "Separate multiple tags with commas",
  "ui.metadata.imageFallbackName": "Image",
  "ui.metadata.packageName": "Package name",
  "ui.metadata.publishedAt": "Published at",
  "ui.metadata.ratingFavorited": "Rating/Favorited",
  "ui.metadata.parodyName": "Parody",
  "ui.metadata.characterName": "Character",
  "ui.metadata.source": "Source",
  "ui.metadata.sourceSite": "Source site",
  "ui.metadata.sourceSiteNhentai": "nhentai",
  "ui.metadata.sourceSiteEhentai": "ehentai",
  "ui.metadata.sourceSiteOthers": "Others",
  "ui.metadata.sourceUrl": "Source URL",
  "ui.metadata.evaluationReadOnly": "Rating/Favorited (read-only)",
  "ui.metadata.parody": "Parody",
  "ui.metadata.character": "Character",
  "ui.metadata.sourceId": "Source ID",
  "ui.metadata.sourceToken": "Source token",
  "ui.metadata.coverUrl": "Cover URL",
  "ui.metadata.noEditablePackage": "No editable package selected",
  "ui.metadata.hitNodeCount": "Matched nodes: {{count}}",
  "ui.metadata.name": "Name",
  "ui.metadata.nameQueryPlaceholder": "Fuzzy match by name",
  "ui.metadata.workTitleQueryPlaceholder": "Fuzzy match by work title",
  "ui.metadata.circleQueryPlaceholder": "Type circle, supports autocomplete",
  "ui.metadata.authorQueryPlaceholder": "Type author, supports autocomplete",
  "ui.metadata.closePanel": "Close panel",
  "ui.metadata.selectTags": "Select tags",
  "ui.metadata.clearTags": "Clear tags",
  "ui.metadata.noTagsSelected": "No tags selected",
  "ui.metadata.tags": "Tags",
  "ui.metadata.packageRatingLabel": "Package rating",
  "ui.metadata.searchHint":
    "Combine fields with AND logic; results sync to Sidebar and main view in real time.",
  "ui.metadata.selectedTagsSummary": "Selected: {{tags}}",
  "ui.metadata.expandManagementPanelTip": "Expand metadata management panel",
  "ui.search.expandPanelTip": "Expand search panel",
  "ui.search.collapse": "Collapse",
  "ui.search.collapseTags": "Collapse tags",
  "ui.footer.pageSummary": "Page {{current}} / {{total}}",
  "ui.sidebar.expand": "Expand sidebar",
  "ui.sidebar.structure": "Directory tree",
  "ui.sidebar.renameDialogInputLabel": "Rename",
  "ui.sidebar.renameDialogInputPlaceholder": "Enter new name",
  "ui.sidebar.renameDialogModeLabel": "Mode",
  "ui.sidebar.renameDialogModeReplace": "Replace",
  "ui.sidebar.renameDialogModeNumbering": "Numbering",
  "ui.sidebar.renameDialogModeRemoveRange": "Remove range",
  "ui.sidebar.renameDialogModeMetadata": "Metadata",
  "ui.sidebar.renameDialogModeSingle": "Single",
  "ui.sidebar.renameDialogReplaceFromPlaceholder": "Replace from",
  "ui.sidebar.renameDialogReplaceToPlaceholder": "Replace to",
  "ui.sidebar.renameDialogApplyFromSourceLabel": "Use source",
  "ui.sidebar.renameDialogNumberBaseLabel": "Name",
  "ui.sidebar.renameDialogNumberStartLabel": "Start",
  "ui.sidebar.renameDialogNumberStepLabel": "Step",
  "ui.sidebar.renameDialogNumberPadWidthLabel": "Digits",
  "ui.sidebar.renameDialogNumberBasePlaceholder": "Base name",
  "ui.sidebar.renameDialogNumberStartPlaceholder": "Start",
  "ui.sidebar.renameDialogNumberStepPlaceholder": "Step",
  "ui.sidebar.renameDialogNumberPadWidthPlaceholder": "Pad width",
  "ui.sidebar.renameDialogRemoveStartPlaceholder": "Start position",
  "ui.sidebar.renameDialogRemoveEndPlaceholder": "End position",
  "ui.sidebar.renameDialogRemoveHeadPlaceholder": "Remove from head",
  "ui.sidebar.renameDialogRemoveTailPlaceholder": "Remove from tail",
  "ui.sidebar.renameDialogRemoveRangeHint":
    "Range remove (1-based positions, inclusive)",
  "ui.sidebar.renameDialogRemoveEdgesHint":
    "Extra remove (from head forward / from tail backward)",
  "ui.sidebar.renameDialogMetadataTemplatePlaceholder": "Metadata template",
  "ui.sidebar.renameDialogPreviewLabel": "Preview",
  "ui.sidebar.renameDialogPreviewOriginalHeader": "Original name",
  "ui.sidebar.renameDialogPreviewNewHeader": "New name",
  "ui.sidebar.renameDialogPreviewUnchanged": "Keep original",
  "ui.sidebar.renameDialogPreviewSummary":
    "Total {{total}}, success {{success}}, failed {{failed}}, unchanged {{unchanged}}",
  "ui.sidebar.searchResultsRoot": "Search results",
  "ui.sidebar.adReviewResultsRoot": "Ad review suspects",
  "ui.fullscreen.singleDisplay": "Single",
  "ui.fullscreen.dualDisplay": "Dual",
  "ui.fullscreen.swapSides": "Swap sides",
  "ui.fullscreen.focusDual":
    "Focus: {{focus}} (click pane or press Tab to switch)",
  "ui.fullscreen.focusVideo": "Video",
  "ui.fullscreen.focusImage": "Image",
  "ui.fullscreen.focusSingle": "Focus: single display",
  "ui.fullscreen.prevPage": "Previous page",
  "ui.fullscreen.nextPage": "Next page",
  "ui.fullscreen.prevPackage": "Previous package",
  "ui.fullscreen.nextPackage": "Next package",
  "ui.fullscreen.stopAutoplay": "Stop autoplay",
  "ui.fullscreen.autoplay": "Autoplay",
  "ui.fullscreen.speed": "Speed",
  "ui.fullscreen.alignUp": "Align top",
  "ui.fullscreen.alignDown": "Align bottom",
  "ui.fullscreen.alignLeft": "Align left",
  "ui.fullscreen.alignRight": "Align right",
  "ui.fullscreen.alignCenter": "Align center",
  "ui.fullscreen.zoomOut": "Zoom out",
  "ui.fullscreen.zoomIn": "Zoom in",
  "ui.fullscreen.reset": "Reset",
  "ui.fullscreen.exit": "Exit fullscreen",
  "ui.fullscreen.footerImageInfo":
    "Image #{{ordinal}} | {{width}} x {{height}}",
  "ui.fullscreen.noImage": "No image available",
  "ui.fullscreen.videoStatePlaying": "Live video",
  "ui.fullscreen.videoStateCover": "Cover state",
  "ui.fullscreen.footerVideoInfo":
    "{{state}} {{current}} / {{duration}} | {{fileName}} ({{width}} x {{height}})",
  "ui.fullscreen.noVideo": "No video available",
  "ui.metadata.fetchTargetPackage": "Target package: {{label}}",
  "ui.metadata.fetchSearchParams": "Search parameters",
  "ui.metadata.fetchSourceNhentai": "Nhentai",
  "ui.metadata.fetchSourceEhentai": "E-Hentai",
  "ui.metadata.fetchSourceModeNh": "NH",
} as const;
