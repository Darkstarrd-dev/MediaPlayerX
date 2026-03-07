import type { ThemeParameterPageId } from "./ThemeParameterPanelMain";

interface ContainerDebugSessionState {
  colors: Record<string, string>;
  texts: Record<string, string>;
}

interface ThemeParameterUISessionState {
  activePage: ThemeParameterPageId;
  pageScrollTops: Partial<Record<ThemeParameterPageId, number>>;
  containerBackgroundExpanded: boolean;
  containerSharedShellExpanded: boolean;
  containerHeaderExpanded: boolean;
  containerSidebarExpanded: boolean;
  containerMainExpanded: boolean;
  containerMainWorkspaceExpanded: boolean;
  containerMetadataExpanded: boolean;
  containerSidebarMainExpanded: boolean;
  containerMainImageNameListExpanded: boolean;
  largePanelRootExpanded: boolean;
  largePanelSharedSectionExpanded: boolean;
  largePanelHeadExpanded: boolean;
  largePanelSideExpanded: boolean;
  largePanelMainExpanded: boolean;
  largePanelInternalExpanded: boolean;
  commonExpanded: boolean;
  styleExpanded: boolean;
}

const DEFAULT_CONTAINER_DEBUG_SESSION_STATE: ContainerDebugSessionState = {
  colors: {},
  texts: {},
};

const DEFAULT_UI_SESSION_STATE: ThemeParameterUISessionState = {
  activePage: "parameters",
  pageScrollTops: {},
  containerBackgroundExpanded: true,
  containerSharedShellExpanded: true,
  containerHeaderExpanded: false,
  containerSidebarExpanded: false,
  containerMainExpanded: false,
  containerMainWorkspaceExpanded: false,
  containerMetadataExpanded: false,
  containerSidebarMainExpanded: false,
  containerMainImageNameListExpanded: false,
  largePanelRootExpanded: true,
  largePanelSharedSectionExpanded: true,
  largePanelHeadExpanded: false,
  largePanelSideExpanded: false,
  largePanelMainExpanded: false,
  largePanelInternalExpanded: false,
  commonExpanded: true,
  styleExpanded: true,
};

let containerDebugSessionState: ContainerDebugSessionState = {
  ...DEFAULT_CONTAINER_DEBUG_SESSION_STATE,
};

let uiSessionState: ThemeParameterUISessionState = {
  ...DEFAULT_UI_SESSION_STATE,
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
  };
}

export function writeThemeParameterUiSessionState(
  nextState: ThemeParameterUISessionState,
): void {
  uiSessionState = {
    ...nextState,
  };
}

export function updateThemeParameterUiSessionState(
  patch: Partial<ThemeParameterUISessionState>,
): void {
  uiSessionState = {
    ...uiSessionState,
    ...patch,
  };
}

export function resetThemeParameterPanelSessionStateForTest(): void {
  clearContainerDebugSessionState();
  uiSessionState = {
    ...DEFAULT_UI_SESSION_STATE,
  };
}
