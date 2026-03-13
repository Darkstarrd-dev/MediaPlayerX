import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { MainUiIcon } from "../MainUiIcon";
import { useDraggablePanel } from "../useDraggablePanel";
import { buildA11yProps } from "../../i18n/a11y";
import { useI18n } from "../../i18n/useI18n";
import { ThemeParameterPanelMain } from "./ThemeParameterPanelMain";
import {
  applyThemeParameterSyncTargets,
  collectThemeParameterSyncIds,
  consumeThemeParameterSyncTargetsForReset,
  createThemeParameterSyncState,
  pruneThemeParameterSyncTarget,
  resetThemeParameterSyncState,
} from "./themeParameterSync";
import { includesSearch } from "./themeParameterUtils";
import { useThemeParameterUiSession } from "./useThemeParameterUiSession";
import { useThemeParameterSnapshotControls } from "./useThemeParameterSnapshotControls";
import {
  COMMON_PARAMETERS,
  CONTAINER_FRAME_PARAMETERS,
  EMPTY_PARAMETERS,
  LARGE_PANEL_PARAMETERS,
  SMALL_PANEL_PARAMETERS,
  readParameterValues,
  resolveParameterLabel,
  resolveStyleGroup,
  STYLE_PARAMETERS,
  type ThemeParameterDefinition,
  type ThemeParameterValues,
} from "./themeParameterDefinitions";
import type { ThemeParameterPreviewMode } from "./themeParameterPanelTypes";
import {
  clearContainerDebugSessionState,
  readContainerDebugSessionState,
  writeContainerDebugSessionState,
} from "./themeParameterPanelSessionState";
import {
  CONTAINER_DEBUG_COLOR_FIELDS,
  CONTAINER_DEBUG_TEXT_FIELDS,
} from "./themeParameterSnapshotCatalog";

const PREVIEW_MODE_ATTR = "data-mpx-theme-debug-preview";
const THEME_PARAMETER_RESET_EVENT = "mpx-theme-parameter-reset";

const CONTAINER_LAYER_PARAMETER_IDS = new Set([
  "layout-padding",
  "splitter-width",
  "container-frame-radius",
  "container-frame-fill-angle",
  "header-fill-angle",
  "sidebar-fill-angle",
  "main-fill-angle",
  "main-header-fill-angle",
  "metadata-fill-angle",
  "metadata-header-fill-angle",
  "header-radius",
  "header-z-index",
  "sidebar-radius",
  "sidebar-z-index",
  "main-radius",
  "main-z-index",
  "metadata-radius",
  "metadata-z-index",
  "soft-pane-elevation",
  "soft-container-elevation",
  "liquid-glass-surface-opacity",
  "neobrutalism-shadow-offset",
  "neobrutalism-border-width",
  "neobrutalism-corner-radius",
]);

function isContainerLayerParameter(
  parameter: ThemeParameterDefinition,
): boolean {
  if (CONTAINER_LAYER_PARAMETER_IDS.has(parameter.id)) {
    return true;
  }
  return parameter.id.includes("-pane-") || parameter.id.includes("-frame-");
}

interface ThemeParameterPanelProps {
  open: boolean;
  hidden?: boolean;
  styleId: string;
  settingsFontSize: number;
  onClose: () => void;
  onHide?: () => void;
}

const LEGACY_CONTAINER_SLOT_PREFIX_TO_SEMANTIC: ReadonlyArray<{
  legacyPrefix: string;
  semanticPrefix: string;
}> = [
  {
    legacyPrefix: "--mpx-slot-fg-sidebar-main-",
    semanticPrefix: "--mpx-sidebar-main-",
  },
  {
    legacyPrefix: "--mpx-slot-fg-main-content-image-name-list-",
    semanticPrefix: "--mpx-main-image-name-list-",
  },
];

function resolveLegacyContainerSemanticVar(
  legacyCssVar: string,
): string | null {
  for (const mapping of LEGACY_CONTAINER_SLOT_PREFIX_TO_SEMANTIC) {
    if (!legacyCssVar.startsWith(mapping.legacyPrefix)) {
      continue;
    }
    return `${mapping.semanticPrefix}${legacyCssVar.slice(mapping.legacyPrefix.length)}`;
  }
  return null;
}

function migrateLegacySidebarMainSlots(root: HTMLElement): void {
  const legacyPairs: Array<{ legacyCssVar: string; semanticCssVar: string }> =
    [];
  for (let index = 0; index < root.style.length; index += 1) {
    const legacyCssVar = root.style.item(index);
    const semanticCssVar = resolveLegacyContainerSemanticVar(legacyCssVar);
    if (!semanticCssVar) {
      continue;
    }
    legacyPairs.push({ legacyCssVar, semanticCssVar });
  }

  for (const pair of legacyPairs) {
    const semanticValue = root.style
      .getPropertyValue(pair.semanticCssVar)
      .trim();
    const legacyValue = root.style.getPropertyValue(pair.legacyCssVar).trim();
    if (legacyValue && !semanticValue) {
      root.style.setProperty(pair.semanticCssVar, legacyValue);
    }
    root.style.removeProperty(pair.legacyCssVar);
  }
}

function captureContainerDebugSessionState(root: HTMLElement): void {
  const nextColors: Record<string, string> = {};
  for (const field of CONTAINER_DEBUG_COLOR_FIELDS) {
    const raw = root.style.getPropertyValue(field.cssVar).trim();
    if (raw) {
      nextColors[field.cssVar] = raw;
    }
  }
  const nextTexts: Record<string, string> = {};
  for (const field of CONTAINER_DEBUG_TEXT_FIELDS) {
    const raw = root.style.getPropertyValue(field.cssVar).trim();
    if (raw) {
      nextTexts[field.cssVar] = raw;
    }
  }
  writeContainerDebugSessionState({
    colors: nextColors,
    texts: nextTexts,
  });
}

function applyContainerDebugSessionState(root: HTMLElement): void {
  const sessionState = readContainerDebugSessionState();
  for (const [cssVar, value] of Object.entries(sessionState.colors)) {
    root.style.setProperty(cssVar, value);
  }
  for (const [cssVar, value] of Object.entries(sessionState.texts)) {
    root.style.setProperty(cssVar, value);
  }
}

function ThemeParameterPanel({
  open,
  hidden = false,
  styleId,
  settingsFontSize,
  onClose,
  onHide = () => {},
}: ThemeParameterPanelProps) {
  const { t } = useI18n();
  const styleGroup = resolveStyleGroup(styleId);
  const styleParameters =
    styleGroup === "default" ? EMPTY_PARAMETERS : STYLE_PARAMETERS[styleGroup];
  const parameters = useMemo(
    () =>
      styleGroup === "default"
        ? [
            ...COMMON_PARAMETERS,
            ...CONTAINER_FRAME_PARAMETERS,
            ...LARGE_PANEL_PARAMETERS,
            ...SMALL_PANEL_PARAMETERS,
          ]
        : [
            ...COMMON_PARAMETERS,
            ...CONTAINER_FRAME_PARAMETERS,
            ...STYLE_PARAMETERS[styleGroup],
            ...LARGE_PANEL_PARAMETERS,
            ...SMALL_PANEL_PARAMETERS,
          ],
    [styleGroup],
  );
  const parameterMap = useMemo(
    () => new Map(parameters.map((parameter) => [parameter.id, parameter])),
    [parameters],
  );
  const {
    uiState,
    restoreUiState,
    persistUiState,
    setActivePage,
    setPageScrollTop,
    setCommonExpanded,
    setStyleExpanded,
    setContainerBackgroundExpanded,
    setContainerSharedShellExpanded,
    setContainerHeaderExpanded,
    setContainerHeaderAppearanceExpanded,
    setContainerHeaderButtonsExpanded,
    setContainerHeaderLogoExpanded,
    setContainerHeaderG1Expanded,
    setContainerHeaderG2Expanded,
    setContainerHeaderGDebugExpanded,
    setContainerHeaderG3Expanded,
    setContainerSidebarExpanded,
    setContainerSidebarAppearanceExpanded,
    setContainerSidebarHeaderExpanded,
    setContainerSidebarHeaderTitleExpanded,
    setContainerSidebarHeaderActionsExpanded,
    setContainerMainExpanded,
    setContainerMainAppearanceExpanded,
    setContainerMainHeaderExpanded,
    setContainerMainHeaderButtonsExpanded,
    setContainerMainWorkspaceExpanded,
    setContainerMainPreviewExpanded,
    setContainerMetadataExpanded,
    setContainerMetadataAppearanceExpanded,
    setContainerMetadataHeaderExpanded,
    setContainerMetadataHeaderButtonsExpanded,
    setContainerMetadataRatingExpanded,
    setContainerMetadataInternalsExpanded,
    setContainerMetadataFileListExpanded,
    setContainerMetadataPreferenceRecordExpanded,
    setContainerMetadataBookletBindingExpanded,
    setContainerSidebarMainExpanded,
    setContainerMainImageNameListExpanded,
    setLargePanelRootExpanded,
    setLargePanelSharedSectionExpanded,
    setLargePanelHeadExpanded,
    setLargePanelSideExpanded,
    setLargePanelMainExpanded,
    setLargePanelButtonExpanded,
    setLargePanelInternalExpanded,
    setLargePanelInternalSectionExpanded,
    setLargePanelInternalSettingsGroupExpanded,
    setSmallPanelRootExpanded,
    setSmallPanelSectionExpanded,
    setButtonVariantDefaultExpanded,
    setButtonVariantPlayerExpanded,
    setButtonVariantOverlayCellExpanded,
    setButtonSlotExpanded,
    setButtonSlotHeaderExpanded,
    setButtonSlotSidebarHeaderExpanded,
    setButtonSlotMainHeaderExpanded,
    setButtonSlotMetadataHeaderExpanded,
    setControlScrollbarExpanded,
    setControlSliderBaseExpanded,
    setControlSliderPlayerExpanded,
    setControlSliderVerticalExpanded,
    setControlSliderSettingsExpanded,
    setControlFileListExpanded,
    setControlThumbnailCardExpanded,
    setControlPopoverPanelExpanded,
    setControlTextInputExpanded,
    setControlSelectExpanded,
    setWorkspaceThumbnailContainerExpanded,
    setWorkspaceThumbnailStyleExpanded,
    setWorkspaceImageCardExpanded,
    setWorkspaceVideoCardExpanded,
    setWorkspacePreviewMusicExpanded,
    setWorkspacePreviewVideoExpanded,
  } = useThemeParameterUiSession();
  const [values, setValues] = useState<ThemeParameterValues>({});
  const parameterSyncStateRef = useRef(createThemeParameterSyncState());
  const [activePreviewMode, setActivePreviewMode] =
    useState<ThemeParameterPreviewMode>("none");
  const [searchText, setSearchText] = useState("");
  const mainScrollElementRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const { panelOffset, panelDragging, headHandlers } = useDraggablePanel(open);

  const {
    activePage,
    commonExpanded,
    styleExpanded,
    containerBackgroundExpanded,
    containerSharedShellExpanded,
    containerHeaderExpanded,
    containerHeaderAppearanceExpanded,
    containerHeaderButtonsExpanded,
    containerHeaderLogoExpanded,
    containerHeaderG1Expanded,
    containerHeaderG2Expanded,
    containerHeaderGDebugExpanded,
    containerHeaderG3Expanded,
    containerSidebarExpanded,
    containerSidebarAppearanceExpanded,
    containerSidebarHeaderExpanded,
    containerSidebarHeaderTitleExpanded,
    containerSidebarHeaderActionsExpanded,
    containerMainExpanded,
    containerMainAppearanceExpanded,
    containerMainHeaderExpanded,
    containerMainHeaderButtonsExpanded,
    containerMainWorkspaceExpanded,
    containerMainPreviewExpanded,
    containerMetadataExpanded,
    containerMetadataAppearanceExpanded,
    containerMetadataHeaderExpanded,
    containerMetadataHeaderButtonsExpanded,
    containerMetadataRatingExpanded,
    containerMetadataInternalsExpanded,
    containerMetadataFileListExpanded,
    containerMetadataPreferenceRecordExpanded,
    containerMetadataBookletBindingExpanded,
    containerSidebarMainExpanded,
    containerMainImageNameListExpanded,
    largePanelRootExpanded,
    largePanelSharedSectionExpanded,
    largePanelHeadExpanded,
    largePanelSideExpanded,
    largePanelMainExpanded,
    largePanelButtonExpanded,
    largePanelInternalExpanded,
    largePanelInternalSectionsExpanded,
    largePanelInternalSettingsGroupsExpanded,
    smallPanelRootExpanded,
    smallPanelSectionsExpanded,
    buttonVariantDefaultExpanded,
    buttonVariantPlayerExpanded,
    buttonVariantOverlayCellExpanded,
    buttonSlotExpanded,
    buttonSlotHeaderExpanded,
    buttonSlotSidebarHeaderExpanded,
    buttonSlotMainHeaderExpanded,
    buttonSlotMetadataHeaderExpanded,
    controlScrollbarExpanded,
    controlSliderBaseExpanded,
    controlSliderPlayerExpanded,
    controlSliderVerticalExpanded,
    controlSliderSettingsExpanded,
    controlFileListExpanded,
    controlThumbnailCardExpanded,
    controlPopoverPanelExpanded,
    controlTextInputExpanded,
    controlSelectExpanded,
    workspaceThumbnailContainerExpanded,
    workspaceThumbnailStyleExpanded,
    workspaceImageCardExpanded,
    workspaceVideoCardExpanded,
    workspacePreviewMusicExpanded,
    workspacePreviewVideoExpanded,
  } = uiState;

  const containerLayerParameters = useMemo(
    () => parameters.filter(isContainerLayerParameter),
    [parameters],
  );

  const filteredCommonParameters = useMemo(() => {
    const keyword = searchText.trim();
    if (!keyword) {
      return COMMON_PARAMETERS;
    }
    return COMMON_PARAMETERS.filter((parameter) =>
      includesSearch(resolveParameterLabel(parameter, t), keyword),
    );
  }, [searchText, t]);

  const filteredStyleParameters = useMemo(() => {
    const keyword = searchText.trim();
    if (!keyword) {
      return styleParameters;
    }
    return styleParameters.filter((parameter) =>
      includesSearch(resolveParameterLabel(parameter, t), keyword),
    );
  }, [searchText, styleParameters, t]);
  const {
    snapshotJson,
    setSnapshotJson,
    snapshotIncludeComputedValues,
    setSnapshotIncludeComputedValues,
    snapshotMessage,
    setSnapshotMessage,
    snapshotFileInputRef,
    exportSnapshotJson,
    downloadSnapshotJson,
    openSnapshotFilePicker,
    loadSnapshotFile,
    copySnapshotJson,
    importSnapshotJson,
    resetSnapshotToBaseline,
    initializeSnapshotSession,
    addSnapshotExplicitParameterIds,
    removeSnapshotExplicitParameterIds,
  } = useThemeParameterSnapshotControls({
    t,
    styleId,
    parameters,
    values,
    setValues,
    parameterMap,
    parameterSyncStateRef,
  });

  const handleResetToOpenState = useCallback(() => {
    clearContainerDebugSessionState();
    resetThemeParameterSyncState(parameterSyncStateRef.current);
    resetSnapshotToBaseline();
  }, [resetSnapshotToBaseline]);

  useEffect(() => {
    if (!open) {
      return;
    }
    wasOpenRef.current = true;
    resetThemeParameterSyncState(parameterSyncStateRef.current);
    const root = document.documentElement;
    migrateLegacySidebarMainSlots(root);
    applyContainerDebugSessionState(root);
    const initialValues = readParameterValues(parameters);
    restoreUiState();
    setActivePreviewMode("none");
    setValues(initialValues);
    initializeSnapshotSession(initialValues);
  }, [initializeSnapshotSession, open, parameters, restoreUiState, styleId]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const scrollTop = uiState.pageScrollTops[activePage] ?? 0;
    if (mainScrollElementRef.current) {
      mainScrollElementRef.current.scrollTop = scrollTop;
    }
  }, [activePage, open, uiState.pageScrollTops]);

  useEffect(() => {
    if (open) {
      return;
    }
    if (!wasOpenRef.current) {
      return;
    }
    const scrollTop =
      mainScrollElementRef.current?.scrollTop ??
      uiState.pageScrollTops[activePage] ??
      0;
    captureContainerDebugSessionState(document.documentElement);
    persistUiState(scrollTop);
    wasOpenRef.current = false;
  }, [open, persistUiState, uiState.pageScrollTops, activePage]);

  useEffect(() => {
    if (!open || activePreviewMode === "none") {
      document.documentElement.removeAttribute(PREVIEW_MODE_ATTR);
      return;
    }
    document.documentElement.setAttribute(PREVIEW_MODE_ATTR, activePreviewMode);
    return () => {
      document.documentElement.removeAttribute(PREVIEW_MODE_ATTR);
    };
  }, [activePreviewMode, open]);

  useEffect(() => {
    if (!open || hidden) {
      return;
    }
    const handlePanelReset = () => {
      handleResetToOpenState();
    };
    window.addEventListener(THEME_PARAMETER_RESET_EVENT, handlePanelReset);
    return () => {
      window.removeEventListener(THEME_PARAMETER_RESET_EVENT, handlePanelReset);
    };
  }, [handleResetToOpenState, hidden, open]);

  if (!open || hidden) {
    return null;
  }

  const panelA11y = buildA11yProps({
    id: "themeParameter.panel",
    labelKey: "a11y.themeParameter.panel",
    t,
  });
  const closeA11y = buildA11yProps({
    id: "themeParameter.close",
    labelKey: "a11y.themeParameter.close",
    titleKey: "tip.themeParameter.close",
    t,
  });
  const hideA11y = buildA11yProps({
    id: "themeParameter.hide",
    labelKey: "a11y.themeParameter.hide",
    titleKey: "tip.themeParameter.hide",
    t,
  });
  const resetA11y = buildA11yProps({
    id: "themeParameter.reset",
    labelKey: "a11y.themeParameter.reset",
    titleKey: "tip.themeParameter.reset",
    t,
  });

  const applyParameter = (
    parameter: ThemeParameterDefinition,
    rawValue: number,
  ) => {
    const nextValue = Math.max(
      parameter.min,
      Math.min(
        parameter.max,
        Number(
          (Math.round(rawValue / parameter.step) * parameter.step).toFixed(
            parameter.step < 1 ? 2 : 0,
          ),
        ),
      ),
    );
    const root = document.documentElement;
    addSnapshotExplicitParameterIds(collectThemeParameterSyncIds(parameter.id));
    setValues((previous) => {
      const nextValues = {
        ...previous,
        [parameter.id]: nextValue,
      };
      parameter.apply(root, nextValue, nextValues);
      if (
        !applyThemeParameterSyncTargets({
          state: parameterSyncStateRef.current,
          parameterId: parameter.id,
          parameterMap,
          root,
          nextValue,
          nextValues,
        })
      ) {
        pruneThemeParameterSyncTarget(
          parameterSyncStateRef.current,
          parameter.id,
        );
      }
      return nextValues;
    });
  };

  const isParameterChanged = (parameter: ThemeParameterDefinition): boolean => {
    if (parameter.cssVarName) {
      return (
        document.documentElement.style
          .getPropertyValue(parameter.cssVarName)
          .trim().length > 0
      );
    }
    const value = values[parameter.id] ?? parameter.fallback;
    return Math.abs(value - parameter.fallback) > 1e-6;
  };

  const resetSingleParameter = (parameter: ThemeParameterDefinition) => {
    const root = document.documentElement;
    const syncedIds = consumeThemeParameterSyncTargetsForReset(
      parameterSyncStateRef.current,
      parameter.id,
    );
    if (syncedIds !== null) {
      parameter.reset(root);
      for (const parameterId of syncedIds) {
        parameterMap.get(parameterId)?.reset(root);
      }
      const computed = getComputedStyle(root);
      setValues((previous) => {
        const nextValues = {
          ...previous,
          [parameter.id]: parameter.read(computed),
        };
        for (const parameterId of syncedIds) {
          const syncParameter = parameterMap.get(parameterId);
          if (!syncParameter) {
            continue;
          }
          nextValues[parameterId] = syncParameter.read(computed);
        }
        return nextValues;
      });
      removeSnapshotExplicitParameterIds([parameter.id, ...syncedIds]);
      return;
    }
    parameter.reset(root);
    const computed = getComputedStyle(root);
    const nextValue = parameter.read(computed);
    setValues((previous) => ({
      ...previous,
      [parameter.id]: nextValue,
    }));
    removeSnapshotExplicitParameterIds([parameter.id]);
    pruneThemeParameterSyncTarget(parameterSyncStateRef.current, parameter.id);
  };

  const resolveLabel = (parameter: ThemeParameterDefinition): string => {
    return resolveParameterLabel(parameter, t);
  };

  const togglePreviewMode = (
    mode: Exclude<ThemeParameterPreviewMode, "none">,
  ) => {
    setActivePreviewMode((previous) => (previous === mode ? "none" : mode));
  };

  const handleContainerDebugChanged = () => {
    captureContainerDebugSessionState(document.documentElement);
  };

  const smallPanelPreviewCards = [
    {
      key: "shortcut-edit",
      title: "5.1 Shortcut Edit",
      slot: "fg-header-g1-settings-shortcut-edit-panel",
      className: "mpx-dialog-panel theme-debug-small-panel-preview-card",
    },
    {
      key: "shortcut-capture",
      title: "5.2 Shortcut Capture",
      slot: "fg-header-g1-settings-shortcut-capture-panel",
      className: "mpx-dialog-panel theme-debug-small-panel-preview-card",
    },
    {
      key: "group-name",
      title: "5.3 Group Name",
      slot: "fg-main-header-manage-group-name-panel",
      className: "mpx-dialog-panel theme-debug-small-panel-preview-card",
    },
    {
      key: "delete-confirm",
      title: "5.4 Delete Confirm",
      slot: "fg-main-header-manage-delete-confirm-panel",
      className: "mpx-dialog-panel theme-debug-small-panel-preview-card",
    },
    {
      key: "ad-review-start-main",
      title: "5.5 Ad Review Start / Main",
      slot: "fg-main-header-image-ad-review-start-panel",
      className:
        "mpx-dialog-panel theme-debug-small-panel-preview-card manage-ad-review-start-dialog",
    },
    {
      key: "ad-review-start-metadata",
      title: "5.5 Ad Review Start / Metadata",
      slot: "fg-meta-main-ad-review-start-panel",
      className:
        "mpx-dialog-panel theme-debug-small-panel-preview-card manage-ad-review-start-dialog",
    },
    {
      key: "convert",
      title: "5.6 Convert",
      slot: "fg-main-header-image-convert-panel",
      className: "mpx-dialog-panel theme-debug-small-panel-preview-card",
    },
    {
      key: "playlist-name",
      title: "5.7 Playlist Name Dialog",
      slot: "fg-meta-main-video-editor-playlist-name-dialog-panel",
      className:
        "mpx-dialog-panel mpx-dialog-panel--inline metadata-playlist-save-dialog theme-debug-small-panel-preview-card",
    },
    {
      key: "rename-single",
      title: "5.8 Rename Single",
      slot: "fg-sidebar-shortcut-rename-single-panel",
      className:
        "mpx-dialog-panel sidebar-rename-single-dialog theme-debug-small-panel-preview-card",
    },
  ] as const;

  return (
    <div
      {...panelA11y}
      className="settings-mask"
      data-slot="fg-header-g3-theme-parameter-root-ovl"
      role="dialog"
      aria-modal="true"
      data-overlay-close="theme-parameter"
    >
      {activePreviewMode === "bg-plus-large-panel" ? (
        <div
          className="theme-debug-large-panel-preview-layer"
          aria-hidden="true"
        >
          <section className="mpx-large-panel theme-debug-large-panel-preview">
            <header className="mpx-large-panel-head theme-debug-large-panel-preview-head">
              <span className="mpx-large-panel-head-spacer settings-head-spacer" />
              <h3 className="theme-debug-large-panel-preview-head-title">
                {t("ui.themeParameter.panel")}
              </h3>
              <span className="theme-debug-large-panel-preview-head-action">
                Debug
              </span>
            </header>
            <div className="mpx-large-panel-shell theme-debug-large-panel-preview-shell">
              <aside className="mpx-large-panel-side theme-debug-large-panel-preview-side">
                <div className="theme-debug-large-panel-preview-item" />
                <div className="theme-debug-large-panel-preview-item" />
                <div className="theme-debug-large-panel-preview-item" />
              </aside>
              <main className="mpx-large-panel-main theme-debug-large-panel-preview-main">
                <article className="theme-debug-large-panel-preview-card">
                  <h4 className="theme-debug-large-panel-preview-card-title">
                    Preview Content
                  </h4>
                  <div className="theme-debug-large-panel-preview-card-line" />
                  <div className="theme-debug-large-panel-preview-card-line" />
                  <div className="theme-debug-large-panel-preview-card-line is-short" />
                </article>
              </main>
            </div>
          </section>
        </div>
      ) : null}
      {activePreviewMode === "bg-plus-small-panel" ? (
        <div
          className="theme-debug-small-panel-preview-layer"
          aria-hidden="true"
        >
          <div className="theme-debug-small-panel-preview-grid">
            <section className="mpx-dialog-panel theme-debug-small-panel-preview">
              <h3>5.0 Root</h3>
              <div className="theme-debug-small-panel-preview-content" />
              <div className="theme-debug-small-panel-preview-actions" />
            </section>
            {smallPanelPreviewCards.map((card) => (
              <section
                key={card.key}
                className={card.className}
                data-slot={card.slot}
              >
                <h3>{card.title}</h3>
                <div className="theme-debug-small-panel-preview-content" />
                <div className="theme-debug-small-panel-preview-actions" />
              </section>
            ))}
          </div>
        </div>
      ) : null}
      <section
        className={`mpx-large-panel mpx-large-panel--theme-parameter settings-panel theme-parameter-panel mpx-btn-scope-panel-large ${panelDragging ? "is-dragging" : ""}`}
        data-slot="fg-header-g3-theme-parameter-root-panel"
        style={{
          fontSize: `${settingsFontSize}px`,
          transform: `translate(${panelOffset.x}px, ${panelOffset.y}px)`,
        }}
      >
        <div
          className="mpx-large-panel-head settings-head settings-head-draggable"
          {...headHandlers}
        >
          <span
            className="mpx-large-panel-head-spacer settings-head-spacer"
            aria-hidden="true"
          />
          <h2 style={{ color: "var(--mpx-large-panel-head-text, inherit)" }}>
            {t("ui.themeParameter.panel")}
          </h2>
          <div
            className="settings-head-actions mpx-btn-group mpx-btn-group--panel-large-head-main"
            data-slot="fg-panel-large-head-btn-group-main"
          >
            <button
              {...resetA11y}
              className="mpx-btn settings-icon-btn main-icon-square-btn"
              data-slot="fg-panel-large-head-btn-group-main-btn-reset"
              type="button"
              onClick={handleResetToOpenState}
            >
              <MainUiIcon name="refresh" />
            </button>
            <button
              {...hideA11y}
              className="mpx-btn settings-icon-btn main-icon-square-btn"
              data-slot="fg-panel-large-head-btn-group-main-btn-hide"
              type="button"
              onClick={onHide}
            >
              <MainUiIcon name="hidden" />
            </button>
            <button
              {...closeA11y}
              className="mpx-btn settings-icon-btn main-icon-square-btn"
              data-slot="fg-panel-large-head-btn-group-main-btn-close"
              type="button"
              onClick={onClose}
            >
              <MainUiIcon name="close" />
            </button>
          </div>
        </div>

        <ThemeParameterPanelMain
          t={t}
          styleId={styleId}
          activePage={activePage}
          setActivePage={(action) => {
            setActivePage(action, mainScrollElementRef.current?.scrollTop ?? 0);
          }}
          activePreviewMode={activePreviewMode}
          togglePreviewMode={togglePreviewMode}
          searchText={searchText}
          setSearchText={setSearchText}
          snapshotJson={snapshotJson}
          setSnapshotJson={setSnapshotJson}
          snapshotIncludeComputedValues={snapshotIncludeComputedValues}
          setSnapshotIncludeComputedValues={setSnapshotIncludeComputedValues}
          snapshotMessage={snapshotMessage}
          setSnapshotMessage={setSnapshotMessage}
          snapshotFileInputRef={snapshotFileInputRef}
          loadSnapshotFile={loadSnapshotFile}
          exportSnapshotJson={exportSnapshotJson}
          downloadSnapshotJson={downloadSnapshotJson}
          openSnapshotFilePicker={openSnapshotFilePicker}
          copySnapshotJson={copySnapshotJson}
          importSnapshotJson={importSnapshotJson}
          setMainScrollElement={(element) => {
            mainScrollElementRef.current = element;
          }}
          onMainScroll={() => {
            setPageScrollTop(
              activePage,
              mainScrollElementRef.current?.scrollTop ?? 0,
            );
          }}
          commonExpanded={commonExpanded}
          setCommonExpanded={setCommonExpanded}
          styleExpanded={styleExpanded}
          setStyleExpanded={setStyleExpanded}
          containerBackgroundExpanded={containerBackgroundExpanded}
          setContainerBackgroundExpanded={setContainerBackgroundExpanded}
          containerSharedShellExpanded={containerSharedShellExpanded}
          setContainerSharedShellExpanded={setContainerSharedShellExpanded}
          containerHeaderExpanded={containerHeaderExpanded}
          setContainerHeaderExpanded={setContainerHeaderExpanded}
          containerHeaderAppearanceExpanded={containerHeaderAppearanceExpanded}
          setContainerHeaderAppearanceExpanded={
            setContainerHeaderAppearanceExpanded
          }
          containerHeaderButtonsExpanded={containerHeaderButtonsExpanded}
          setContainerHeaderButtonsExpanded={setContainerHeaderButtonsExpanded}
          containerHeaderLogoExpanded={containerHeaderLogoExpanded}
          setContainerHeaderLogoExpanded={setContainerHeaderLogoExpanded}
          containerHeaderG1Expanded={containerHeaderG1Expanded}
          setContainerHeaderG1Expanded={setContainerHeaderG1Expanded}
          containerHeaderG2Expanded={containerHeaderG2Expanded}
          setContainerHeaderG2Expanded={setContainerHeaderG2Expanded}
          containerHeaderGDebugExpanded={containerHeaderGDebugExpanded}
          setContainerHeaderGDebugExpanded={setContainerHeaderGDebugExpanded}
          containerHeaderG3Expanded={containerHeaderG3Expanded}
          setContainerHeaderG3Expanded={setContainerHeaderG3Expanded}
          containerSidebarExpanded={containerSidebarExpanded}
          setContainerSidebarExpanded={setContainerSidebarExpanded}
          containerSidebarAppearanceExpanded={
            containerSidebarAppearanceExpanded
          }
          setContainerSidebarAppearanceExpanded={
            setContainerSidebarAppearanceExpanded
          }
          containerSidebarHeaderExpanded={containerSidebarHeaderExpanded}
          setContainerSidebarHeaderExpanded={setContainerSidebarHeaderExpanded}
          containerSidebarHeaderTitleExpanded={
            containerSidebarHeaderTitleExpanded
          }
          setContainerSidebarHeaderTitleExpanded={
            setContainerSidebarHeaderTitleExpanded
          }
          containerSidebarHeaderActionsExpanded={
            containerSidebarHeaderActionsExpanded
          }
          setContainerSidebarHeaderActionsExpanded={
            setContainerSidebarHeaderActionsExpanded
          }
          containerMainExpanded={containerMainExpanded}
          setContainerMainExpanded={setContainerMainExpanded}
          containerMainAppearanceExpanded={containerMainAppearanceExpanded}
          setContainerMainAppearanceExpanded={
            setContainerMainAppearanceExpanded
          }
          containerMainHeaderExpanded={containerMainHeaderExpanded}
          setContainerMainHeaderExpanded={setContainerMainHeaderExpanded}
          containerMainHeaderButtonsExpanded={
            containerMainHeaderButtonsExpanded
          }
          setContainerMainHeaderButtonsExpanded={
            setContainerMainHeaderButtonsExpanded
          }
          containerMainWorkspaceExpanded={containerMainWorkspaceExpanded}
          setContainerMainWorkspaceExpanded={setContainerMainWorkspaceExpanded}
          containerMainPreviewExpanded={containerMainPreviewExpanded}
          setContainerMainPreviewExpanded={setContainerMainPreviewExpanded}
          containerMetadataExpanded={containerMetadataExpanded}
          setContainerMetadataExpanded={setContainerMetadataExpanded}
          containerMetadataAppearanceExpanded={
            containerMetadataAppearanceExpanded
          }
          setContainerMetadataAppearanceExpanded={
            setContainerMetadataAppearanceExpanded
          }
          containerMetadataHeaderExpanded={containerMetadataHeaderExpanded}
          setContainerMetadataHeaderExpanded={
            setContainerMetadataHeaderExpanded
          }
          containerMetadataHeaderButtonsExpanded={
            containerMetadataHeaderButtonsExpanded
          }
          setContainerMetadataHeaderButtonsExpanded={
            setContainerMetadataHeaderButtonsExpanded
          }
          containerMetadataRatingExpanded={containerMetadataRatingExpanded}
          setContainerMetadataRatingExpanded={
            setContainerMetadataRatingExpanded
          }
          containerMetadataInternalsExpanded={
            containerMetadataInternalsExpanded
          }
          setContainerMetadataInternalsExpanded={
            setContainerMetadataInternalsExpanded
          }
          containerMetadataFileListExpanded={containerMetadataFileListExpanded}
          setContainerMetadataFileListExpanded={
            setContainerMetadataFileListExpanded
          }
          containerMetadataPreferenceRecordExpanded={
            containerMetadataPreferenceRecordExpanded
          }
          setContainerMetadataPreferenceRecordExpanded={
            setContainerMetadataPreferenceRecordExpanded
          }
          containerMetadataBookletBindingExpanded={
            containerMetadataBookletBindingExpanded
          }
          setContainerMetadataBookletBindingExpanded={
            setContainerMetadataBookletBindingExpanded
          }
          containerSidebarMainExpanded={containerSidebarMainExpanded}
          setContainerSidebarMainExpanded={setContainerSidebarMainExpanded}
          containerMainImageNameListExpanded={
            containerMainImageNameListExpanded
          }
          setContainerMainImageNameListExpanded={
            setContainerMainImageNameListExpanded
          }
          largePanelRootExpanded={largePanelRootExpanded}
          setLargePanelRootExpanded={setLargePanelRootExpanded}
          largePanelSharedSectionExpanded={largePanelSharedSectionExpanded}
          setLargePanelSharedSectionExpanded={
            setLargePanelSharedSectionExpanded
          }
          largePanelHeadExpanded={largePanelHeadExpanded}
          setLargePanelHeadExpanded={setLargePanelHeadExpanded}
          largePanelSideExpanded={largePanelSideExpanded}
          setLargePanelSideExpanded={setLargePanelSideExpanded}
          largePanelMainExpanded={largePanelMainExpanded}
          setLargePanelMainExpanded={setLargePanelMainExpanded}
          largePanelButtonExpanded={largePanelButtonExpanded}
          setLargePanelButtonExpanded={setLargePanelButtonExpanded}
          largePanelInternalExpanded={largePanelInternalExpanded}
          setLargePanelInternalExpanded={setLargePanelInternalExpanded}
          largePanelInternalSectionsExpanded={
            largePanelInternalSectionsExpanded
          }
          largePanelInternalSettingsGroupsExpanded={
            largePanelInternalSettingsGroupsExpanded
          }
          setLargePanelInternalSectionExpanded={
            setLargePanelInternalSectionExpanded
          }
          setLargePanelInternalSettingsGroupExpanded={
            setLargePanelInternalSettingsGroupExpanded
          }
          smallPanelRootExpanded={smallPanelRootExpanded}
          setSmallPanelRootExpanded={setSmallPanelRootExpanded}
          smallPanelSectionsExpanded={smallPanelSectionsExpanded}
          setSmallPanelSectionExpanded={setSmallPanelSectionExpanded}
          buttonVariantDefaultExpanded={buttonVariantDefaultExpanded}
          setButtonVariantDefaultExpanded={setButtonVariantDefaultExpanded}
          buttonVariantPlayerExpanded={buttonVariantPlayerExpanded}
          setButtonVariantPlayerExpanded={setButtonVariantPlayerExpanded}
          buttonVariantOverlayCellExpanded={buttonVariantOverlayCellExpanded}
          setButtonVariantOverlayCellExpanded={
            setButtonVariantOverlayCellExpanded
          }
          buttonSlotExpanded={buttonSlotExpanded}
          setButtonSlotExpanded={setButtonSlotExpanded}
          buttonSlotHeaderExpanded={buttonSlotHeaderExpanded}
          setButtonSlotHeaderExpanded={setButtonSlotHeaderExpanded}
          buttonSlotSidebarHeaderExpanded={buttonSlotSidebarHeaderExpanded}
          setButtonSlotSidebarHeaderExpanded={
            setButtonSlotSidebarHeaderExpanded
          }
          buttonSlotMainHeaderExpanded={buttonSlotMainHeaderExpanded}
          setButtonSlotMainHeaderExpanded={setButtonSlotMainHeaderExpanded}
          buttonSlotMetadataHeaderExpanded={buttonSlotMetadataHeaderExpanded}
          setButtonSlotMetadataHeaderExpanded={
            setButtonSlotMetadataHeaderExpanded
          }
          controlScrollbarExpanded={controlScrollbarExpanded}
          setControlScrollbarExpanded={setControlScrollbarExpanded}
          controlSliderBaseExpanded={controlSliderBaseExpanded}
          setControlSliderBaseExpanded={setControlSliderBaseExpanded}
          controlSliderPlayerExpanded={controlSliderPlayerExpanded}
          setControlSliderPlayerExpanded={setControlSliderPlayerExpanded}
          controlSliderVerticalExpanded={controlSliderVerticalExpanded}
          setControlSliderVerticalExpanded={setControlSliderVerticalExpanded}
          controlSliderSettingsExpanded={controlSliderSettingsExpanded}
          setControlSliderSettingsExpanded={setControlSliderSettingsExpanded}
          controlFileListExpanded={controlFileListExpanded}
          setControlFileListExpanded={setControlFileListExpanded}
          controlThumbnailCardExpanded={controlThumbnailCardExpanded}
          setControlThumbnailCardExpanded={setControlThumbnailCardExpanded}
          controlPopoverPanelExpanded={controlPopoverPanelExpanded}
          setControlPopoverPanelExpanded={setControlPopoverPanelExpanded}
          controlTextInputExpanded={controlTextInputExpanded}
          setControlTextInputExpanded={setControlTextInputExpanded}
          controlSelectExpanded={controlSelectExpanded}
          setControlSelectExpanded={setControlSelectExpanded}
          workspaceThumbnailContainerExpanded={workspaceThumbnailContainerExpanded}
          setWorkspaceThumbnailContainerExpanded={setWorkspaceThumbnailContainerExpanded}
          workspaceThumbnailStyleExpanded={workspaceThumbnailStyleExpanded}
          setWorkspaceThumbnailStyleExpanded={setWorkspaceThumbnailStyleExpanded}
          workspaceImageCardExpanded={workspaceImageCardExpanded}
          setWorkspaceImageCardExpanded={setWorkspaceImageCardExpanded}
          workspaceVideoCardExpanded={workspaceVideoCardExpanded}
          setWorkspaceVideoCardExpanded={setWorkspaceVideoCardExpanded}
          workspacePreviewMusicExpanded={workspacePreviewMusicExpanded}
          setWorkspacePreviewMusicExpanded={setWorkspacePreviewMusicExpanded}
          workspacePreviewVideoExpanded={workspacePreviewVideoExpanded}
          setWorkspacePreviewVideoExpanded={setWorkspacePreviewVideoExpanded}
          filteredCommonParameters={filteredCommonParameters}
          filteredStyleParameters={filteredStyleParameters}
          styleParameters={styleParameters}
          containerLayerParameters={containerLayerParameters}
          largePanelLayerParameters={LARGE_PANEL_PARAMETERS}
          smallPanelLayerParameters={SMALL_PANEL_PARAMETERS}
          values={values}
          applyParameter={applyParameter}
          isParameterChanged={isParameterChanged}
          resetSingleParameter={resetSingleParameter}
          resolveLabel={resolveLabel}
          onContainerDebugChanged={handleContainerDebugChanged}
        />
      </section>
    </div>
  );
}

export type { ThemeParameterDefinition, ThemeParameterValues };

export default ThemeParameterPanel;
