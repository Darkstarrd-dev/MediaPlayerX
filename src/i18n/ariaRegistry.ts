export interface A11yRegistryEntry {
  id: string
  labelKey: string
  titleKey?: string
}

export const a11yRegistry = {
  headerSearch: {
    id: 'header.search',
    labelKey: 'a11y.header.search',
    titleKey: 'tip.header.search',
  },
  headerManage: {
    id: 'header.manage',
    labelKey: 'a11y.header.manage',
    titleKey: 'tip.header.manage',
  },
  headerSettings: {
    id: 'header.settings',
    labelKey: 'a11y.header.settings',
    titleKey: 'tip.header.settings',
  },
  headerHelp: {
    id: 'header.help',
    labelKey: 'a11y.header.help',
    titleKey: 'tip.header.help',
  },
  headerMetadataToggle: {
    id: 'header.metadataToggle',
    labelKey: 'a11y.header.switchToMetadataMode',
  },
  headerModeSwitch: {
    id: 'header.modeSwitch',
    labelKey: 'a11y.header.modeSwitch',
  },
  headerModeImage: {
    id: 'header.mode.image',
    labelKey: 'a11y.header.imageMode',
  },
  headerModeVideo: {
    id: 'header.mode.video',
    labelKey: 'a11y.header.videoMode',
  },
  headerModeMusic: {
    id: 'header.mode.music',
    labelKey: 'a11y.header.musicMode',
  },
  headerMusicStop: {
    id: 'header.music.stop',
    labelKey: 'a11y.header.musicStop',
  },
  headerThumbnailScaleGroup: {
    id: 'header.thumbnailScale.group',
    labelKey: 'a11y.header.thumbnailScaleGroup',
  },
  headerThumbnailScale: {
    id: 'header.thumbnailScale.button',
    labelKey: 'a11y.header.thumbnailScale',
  },
  headerScaleSettings: {
    id: 'header.thumbnailScale.settings',
    labelKey: 'a11y.header.scaleSettings',
  },
  headerScaleLevels: {
    id: 'header.thumbnailScale.levels',
    labelKey: 'a11y.header.scaleLevels',
  },
  headerScaleSlider: {
    id: 'header.thumbnailScale.slider',
    labelKey: 'a11y.header.scaleSlider',
  },
  headerAutoPlayGroup: {
    id: 'header.autoplay.group',
    labelKey: 'a11y.header.autoPlayGroup',
  },
  headerAutoPlay: {
    id: 'header.autoplay.button',
    labelKey: 'a11y.header.autoPlay',
  },
  headerAutoPlaySettings: {
    id: 'header.autoplay.settings',
    labelKey: 'a11y.header.autoPlaySettings',
  },
  headerAutoPlayLevels: {
    id: 'header.autoplay.levels',
    labelKey: 'a11y.header.autoPlayLevels',
  },
  headerAutoPlaySlider: {
    id: 'header.autoplay.slider',
    labelKey: 'a11y.header.autoPlaySlider',
  },
  headerWindowControls: {
    id: 'header.windowControls',
    labelKey: 'a11y.header.windowControls',
  },
  headerWindowMinimize: {
    id: 'header.window.minimize',
    labelKey: 'a11y.header.windowMinimize',
  },
  headerWindowToggleMaximize: {
    id: 'header.window.toggleMaximize',
    labelKey: 'a11y.header.windowMaximize',
  },
  headerWindowClose: {
    id: 'header.window.close',
    labelKey: 'a11y.header.windowClose',
  },

  commonBack: {
    id: 'common.back',
    labelKey: 'a11y.common.back',
    titleKey: 'tip.common.back',
  },
  commonPrevPage: {
    id: 'common.prevPage',
    labelKey: 'a11y.common.prevPage',
    titleKey: 'tip.common.prevPage',
  },
  commonNextPage: {
    id: 'common.nextPage',
    labelKey: 'a11y.common.nextPage',
    titleKey: 'tip.common.nextPage',
  },
  commonRestoreDefault: {
    id: 'common.restoreDefault',
    labelKey: 'a11y.common.restoreDefault',
    titleKey: 'tip.common.restoreDefault',
  },
  commonExpandSidebar: {
    id: 'common.expandSidebar',
    labelKey: 'a11y.common.expandSidebar',
  },
  commonExpandSearchPanel: {
    id: 'common.expandSearchPanel',
    labelKey: 'a11y.common.expandSearchPanel',
  },
  commonExpandManagePanel: {
    id: 'common.expandManagePanel',
    labelKey: 'a11y.common.expandManagePanel',
  },
  commonExpandMetadataPanel: {
    id: 'common.expandMetadataPanel',
    labelKey: 'a11y.common.expandMetadataPanel',
  },
  commonExpandMetadataManagementPanel: {
    id: 'common.expandMetadataManagementPanel',
    labelKey: 'a11y.common.expandMetadataManagementPanel',
  },
  commonAdjustSidebarWidth: {
    id: 'common.adjustSidebarWidth',
    labelKey: 'a11y.common.adjustSidebarWidth',
  },
  commonAdjustMetadataPanelWidth: {
    id: 'common.adjustMetadataPanelWidth',
    labelKey: 'a11y.common.adjustMetadataPanelWidth',
  },
  commonAdjustSearchPanelHeight: {
    id: 'common.adjustSearchPanelHeight',
    labelKey: 'a11y.common.adjustSearchPanelHeight',
  },
  commonAdjustManagePanelHeight: {
    id: 'common.adjustManagePanelHeight',
    labelKey: 'a11y.common.adjustManagePanelHeight',
  },
  commonAdjustMetadataManagementPanelHeight: {
    id: 'common.adjustMetadataManagementPanelHeight',
    labelKey: 'a11y.common.adjustMetadataManagementPanelHeight',
  },
  commonAdjustFullscreenSplit: {
    id: 'common.adjustFullscreenSplit',
    labelKey: 'a11y.common.adjustFullscreenSplit',
  },

  mediaSelectAllPage: {
    id: 'media.selectAllPage',
    labelKey: 'a11y.media.selectAllPage',
    titleKey: 'tip.media.selectAllPage',
  },
  mediaPlaylist: {
    id: 'media.playlist',
    labelKey: 'a11y.media.playlist',
  },
  mediaPlaylistFullscreenOnly: {
    id: 'media.playlistFullscreenOnly',
    labelKey: 'a11y.media.playlistFullscreenOnly',
  },
  mediaDualMode: {
    id: 'media.dualMode',
    labelKey: 'a11y.media.dualMode',
  },
  mediaDualModeFullscreenOnly: {
    id: 'media.dualModeFullscreenOnly',
    labelKey: 'a11y.media.dualModeFullscreenOnly',
  },
  mediaFullscreenProgress: {
    id: 'media.fullscreenProgress',
    labelKey: 'a11y.media.fullscreenProgress',
  },
  mediaFullscreenVolume: {
    id: 'media.fullscreenVolume',
    labelKey: 'a11y.media.fullscreenVolume',
  },
  mediaFullscreenAutoPlaySpeed: {
    id: 'media.fullscreenAutoPlaySpeed',
    labelKey: 'a11y.media.fullscreenAutoPlaySpeed',
  },

  musicShaderToggleLayer: {
    id: 'music.shader.toggleLayer',
    labelKey: 'a11y.music.shaderToggleLayer',
  },
  musicShaderToggleEnabled: {
    id: 'music.shader.toggleEnabled',
    labelKey: 'a11y.music.shaderToggleEnabled',
  },
  musicShaderSettings: {
    id: 'music.shader.settings',
    labelKey: 'a11y.music.shaderSettings',
  },
  musicPlaylist: {
    id: 'music.playlist',
    labelKey: 'a11y.music.playlist',
  },

  metadataSearchFilters: {
    id: 'metadata.searchFilters',
    labelKey: 'a11y.metadata.searchFilters',
  },
  metadataRatingFilter: {
    id: 'metadata.ratingFilter',
    labelKey: 'a11y.metadata.ratingFilter',
  },
  metadataRatingNone: {
    id: 'metadata.rating.none',
    labelKey: 'a11y.metadata.ratingNone',
  },
  metadataEnglishCircle: {
    id: 'metadata.englishCircle',
    labelKey: 'a11y.metadata.englishCircle',
  },
  metadataFetchSourceSwitch: {
    id: 'metadata.fetch.sourceSwitch',
    labelKey: 'a11y.metadata.fetchSourceSwitch',
  },

  settingsGroups: {
    id: 'settings.groups',
    labelKey: 'a11y.settings.groups',
  },
  settingsShortcutEditDialog: {
    id: 'settings.shortcut.editDialog',
    labelKey: 'a11y.settings.shortcutEditDialog',
  },
  settingsShortcutCaptureDialog: {
    id: 'settings.shortcut.captureDialog',
    labelKey: 'a11y.settings.shortcutCaptureDialog',
  },

  tagsPanel: {
    id: 'tags.panel',
    labelKey: 'a11y.tags.panel',
  },
  tagsGroups: {
    id: 'tags.groups',
    labelKey: 'a11y.tags.groups',
  },
  tagsSelect: {
    id: 'tags.select',
    labelKey: 'a11y.tags.select',
  },

  managePanel: {
    id: 'manage.panel',
    labelKey: 'a11y.manage.panel',
  },
  manageControls: {
    id: 'manage.controls',
    labelKey: 'a11y.manage.controls',
  },
  manageStrategyToggle: {
    id: 'manage.strategyToggle',
    labelKey: 'a11y.manage.strategyToggle',
  },
  manageConcurrency: {
    id: 'manage.concurrency',
    labelKey: 'a11y.manage.concurrency',
  },
  manageHeadWindow: {
    id: 'manage.headWindow',
    labelKey: 'a11y.manage.headWindow',
  },
  manageTailWindow: {
    id: 'manage.tailWindow',
    labelKey: 'a11y.manage.tailWindow',
  },
  manageTailStopClean: {
    id: 'manage.tailStopClean',
    labelKey: 'a11y.manage.tailStopClean',
  },
  manageQueue: {
    id: 'manage.queue',
    labelKey: 'a11y.manage.queue',
  },
  manageStartModeDialog: {
    id: 'manage.startModeDialog',
    labelKey: 'a11y.manage.startModeDialog',
  },
  manageAdReview: {
    id: 'manage.adReview',
    labelKey: 'a11y.manage.adReview',
    titleKey: 'tip.manage.adReview',
  },
} as const satisfies Record<string, A11yRegistryEntry>

export type A11yRegistryKey = keyof typeof a11yRegistry
