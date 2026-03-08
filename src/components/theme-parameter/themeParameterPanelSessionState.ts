import type {
  LargePanelInternalSectionId,
  SmallPanelSectionId,
  ThemeParameterPageId,
} from "./ThemeParameterPanelMain";

export interface ContainerDebugSessionState {
  colors: Record<string, string>;
  texts: Record<string, string>;
}

interface LargePanelInternalSectionsExpandedState {
  importTask: boolean;
  metadataFetch: boolean;
  metadataPreferenceRecord: boolean;
  metadataBookletBinding: boolean;
  metadataFeatureTagPicker: boolean;
  subtitleCleanup: boolean;
  transcodeDialog: boolean;
  sidebarRenamePreview: boolean;
}

interface SmallPanelSectionsExpandedState {
  shortcutEdit: boolean;
  shortcutCapture: boolean;
  groupName: boolean;
  deleteConfirm: boolean;
  adReviewStart: boolean;
  convert: boolean;
  playlistNameDialog: boolean;
  renameSingle: boolean;
}

export interface ThemeParameterUISessionState {
  activePage: ThemeParameterPageId;
  pageScrollTops: Partial<Record<ThemeParameterPageId, number>>;
  containerBackgroundExpanded: boolean;
  containerSharedShellExpanded: boolean;
  containerHeaderExpanded: boolean;
  containerHeaderAppearanceExpanded: boolean;
  containerHeaderButtonsExpanded: boolean;
  containerHeaderLogoExpanded: boolean;
  containerHeaderG1Expanded: boolean;
  containerHeaderG2Expanded: boolean;
  containerHeaderGDebugExpanded: boolean;
  containerHeaderG3Expanded: boolean;
  containerSidebarExpanded: boolean;
  containerSidebarAppearanceExpanded: boolean;
  containerSidebarHeaderExpanded: boolean;
  containerSidebarHeaderTitleExpanded: boolean;
  containerSidebarHeaderActionsExpanded: boolean;
  containerMainExpanded: boolean;
  containerMainAppearanceExpanded: boolean;
  containerMainHeaderExpanded: boolean;
  containerMainHeaderButtonsExpanded: boolean;
  containerMainWorkspaceExpanded: boolean;
  containerMetadataExpanded: boolean;
  containerMetadataAppearanceExpanded: boolean;
  containerMetadataHeaderExpanded: boolean;
  containerMetadataHeaderButtonsExpanded: boolean;
  containerSidebarMainExpanded: boolean;
  containerMainImageNameListExpanded: boolean;
  largePanelRootExpanded: boolean;
  largePanelSharedSectionExpanded: boolean;
  largePanelHeadExpanded: boolean;
  largePanelSideExpanded: boolean;
  largePanelMainExpanded: boolean;
  largePanelInternalExpanded: boolean;
  largePanelInternalSectionsExpanded: Record<LargePanelInternalSectionId, boolean>;
  smallPanelRootExpanded: boolean;
  smallPanelSectionsExpanded: Record<SmallPanelSectionId, boolean>;
  commonExpanded: boolean;
  styleExpanded: boolean;
}

const DEFAULT_CONTAINER_DEBUG_SESSION_STATE: ContainerDebugSessionState = {
  colors: {},
  texts: {},
};

const DEFAULT_LARGE_PANEL_INTERNAL_SECTIONS_EXPANDED: LargePanelInternalSectionsExpandedState = {
  importTask: false,
  metadataFetch: false,
  metadataPreferenceRecord: false,
  metadataBookletBinding: false,
  metadataFeatureTagPicker: false,
  subtitleCleanup: false,
  transcodeDialog: false,
  sidebarRenamePreview: false,
};

const DEFAULT_SMALL_PANEL_SECTIONS_EXPANDED: SmallPanelSectionsExpandedState = {
  shortcutEdit: false,
  shortcutCapture: false,
  groupName: false,
  deleteConfirm: false,
  adReviewStart: false,
  convert: false,
  playlistNameDialog: false,
  renameSingle: false,
};

const DEFAULT_UI_SESSION_STATE: ThemeParameterUISessionState = {
  activePage: "parameters",
  pageScrollTops: {},
  containerBackgroundExpanded: true,
  containerSharedShellExpanded: true,
  containerHeaderExpanded: false,
  containerHeaderAppearanceExpanded: true,
  containerHeaderButtonsExpanded: false,
  containerHeaderLogoExpanded: false,
  containerHeaderG1Expanded: false,
  containerHeaderG2Expanded: false,
  containerHeaderGDebugExpanded: false,
  containerHeaderG3Expanded: false,
  containerSidebarExpanded: false,
  containerSidebarAppearanceExpanded: true,
  containerSidebarHeaderExpanded: false,
  containerSidebarHeaderTitleExpanded: false,
  containerSidebarHeaderActionsExpanded: false,
  containerMainExpanded: false,
  containerMainAppearanceExpanded: true,
  containerMainHeaderExpanded: false,
  containerMainHeaderButtonsExpanded: false,
  containerMainWorkspaceExpanded: false,
  containerMetadataExpanded: false,
  containerMetadataAppearanceExpanded: true,
  containerMetadataHeaderExpanded: false,
  containerMetadataHeaderButtonsExpanded: false,
  containerSidebarMainExpanded: false,
  containerMainImageNameListExpanded: false,
  largePanelRootExpanded: true,
  largePanelSharedSectionExpanded: true,
  largePanelHeadExpanded: false,
  largePanelSideExpanded: false,
  largePanelMainExpanded: false,
  largePanelInternalExpanded: false,
  largePanelInternalSectionsExpanded: {
    ...DEFAULT_LARGE_PANEL_INTERNAL_SECTIONS_EXPANDED,
  },
  smallPanelRootExpanded: true,
  smallPanelSectionsExpanded: {
    ...DEFAULT_SMALL_PANEL_SECTIONS_EXPANDED,
  },
  commonExpanded: true,
  styleExpanded: true,
};

let containerDebugSessionState: ContainerDebugSessionState = {
  ...DEFAULT_CONTAINER_DEBUG_SESSION_STATE,
};

let uiSessionState: ThemeParameterUISessionState = {
  ...DEFAULT_UI_SESSION_STATE,
  largePanelInternalSectionsExpanded: {
    ...DEFAULT_UI_SESSION_STATE.largePanelInternalSectionsExpanded,
  },
  smallPanelSectionsExpanded: {
    ...DEFAULT_UI_SESSION_STATE.smallPanelSectionsExpanded,
  },
};

export function readContainerDebugSessionState(): ContainerDebugSessionState {
  return {
    colors: { ...containerDebugSessionState.colors },
    texts: { ...containerDebugSessionState.texts },
  };
}

export function writeContainerDebugSessionState(
  nextState: ContainerDebugSessionState,
): void {
  containerDebugSessionState = {
    colors: { ...nextState.colors },
    texts: { ...nextState.texts },
  };
}

export function clearContainerDebugSessionState(): void {
  containerDebugSessionState = {
    ...DEFAULT_CONTAINER_DEBUG_SESSION_STATE,
  };
}

export function readThemeParameterUiSessionState(): ThemeParameterUISessionState {
  return {
    ...uiSessionState,
    largePanelInternalSectionsExpanded: {
      ...uiSessionState.largePanelInternalSectionsExpanded,
    },
    smallPanelSectionsExpanded: {
      ...uiSessionState.smallPanelSectionsExpanded,
    },
  };
}

export function writeThemeParameterUiSessionState(
  nextState: ThemeParameterUISessionState,
): void {
  uiSessionState = {
    ...nextState,
    largePanelInternalSectionsExpanded: {
      ...nextState.largePanelInternalSectionsExpanded,
    },
    smallPanelSectionsExpanded: {
      ...nextState.smallPanelSectionsExpanded,
    },
  };
}

export function updateThemeParameterUiSessionState(
  patch: Partial<ThemeParameterUISessionState>,
): void {
  uiSessionState = {
    ...uiSessionState,
    ...patch,
    largePanelInternalSectionsExpanded: {
      ...(patch.largePanelInternalSectionsExpanded ??
        uiSessionState.largePanelInternalSectionsExpanded),
    },
    smallPanelSectionsExpanded: {
      ...(patch.smallPanelSectionsExpanded ?? uiSessionState.smallPanelSectionsExpanded),
    },
  };
}

export function resetThemeParameterPanelSessionStateForTest(): void {
  clearContainerDebugSessionState();
  uiSessionState = {
    ...DEFAULT_UI_SESSION_STATE,
    largePanelInternalSectionsExpanded: {
      ...DEFAULT_UI_SESSION_STATE.largePanelInternalSectionsExpanded,
    },
    smallPanelSectionsExpanded: {
      ...DEFAULT_UI_SESSION_STATE.smallPanelSectionsExpanded,
    },
  };
}
