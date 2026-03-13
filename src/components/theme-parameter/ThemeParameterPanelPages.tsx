import type {
  ChangeEvent,
  Dispatch,
  MutableRefObject,
  ReactNode,
  SetStateAction,
  SyntheticEvent,
} from "react";

import type {
  ThemeParameterPageId,
  ThemeParameterPreviewMode,
} from "./themeParameterPanelTypes";

type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;
type BooleanSetter = Dispatch<SetStateAction<boolean>>;

interface PageItem {
  id: ThemeParameterPageId;
  labelKey: string;
}

function handleToggle(
  setter: BooleanSetter,
  event: SyntheticEvent<HTMLDetailsElement>,
): void {
  setter((event.currentTarget as HTMLDetailsElement).open);
}

export function ThemeParameterPageSidebar({
  activePage,
  pages,
  setActivePage,
  t,
}: {
  activePage: ThemeParameterPageId;
  pages: ReadonlyArray<PageItem>;
  setActivePage: Dispatch<SetStateAction<ThemeParameterPageId>>;
  t: Translate;
}) {
  return (
    <aside
      className="mpx-large-panel-side settings-side theme-parameter-side mpx-btn-group mpx-btn-group--panel-large-side"
      data-slot="fg-panel-large-side-btn-group-nav"
    >
      {pages.map((page) => (
        <button
          key={page.id}
          type="button"
          className={
            activePage === page.id
              ? "mpx-btn theme-parameter-side-btn is-active"
              : "mpx-btn theme-parameter-side-btn"
          }
          data-slot="fg-panel-large-side-btn-group-nav-btn-item"
          onClick={() => setActivePage(page.id)}
        >
          {t(page.labelKey)}
        </button>
      ))}
    </aside>
  );
}

export function ThemeParameterParametersPage({
  commonContent,
  commonExpanded,
  searchText,
  setCommonExpanded,
  setSearchText,
  setStyleExpanded,
  showCommonNoResults,
  showNoStyleSpecific,
  showStyleNoResults,
  styleContent,
  styleExpanded,
  styleId,
  t,
}: {
  commonContent: ReactNode;
  commonExpanded: boolean;
  searchText: string;
  setCommonExpanded: BooleanSetter;
  setSearchText: Dispatch<SetStateAction<string>>;
  setStyleExpanded: BooleanSetter;
  showCommonNoResults: boolean;
  showNoStyleSpecific: boolean;
  showStyleNoResults: boolean;
  styleContent: ReactNode;
  styleExpanded: boolean;
  styleId: string;
  t: Translate;
}) {
  return (
    <section className="settings-block theme-parameter-block">
      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.themeParameter.page.parameters")}</span>
        </header>
        <label
          className="theme-parameter-search"
          htmlFor="theme-parameter-search-input"
        >
          <span>{t("ui.themeParameter.searchLabel")}</span>
          <input
            id="theme-parameter-search-input"
            type="text"
            value={searchText}
            placeholder={t("ui.themeParameter.searchPlaceholder")}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </label>
      </section>

      <details
        className="settings-collapsible"
        open={commonExpanded}
        onToggle={(event) => handleToggle(setCommonExpanded, event)}
      >
        <summary>{t("ui.themeParameter.sectionCommon")}</summary>
        <div className="settings-collapsible-content">
          {commonContent}
          {showCommonNoResults ? (
            <p className="settings-placeholder">{t("ui.common.noResults")}</p>
          ) : null}
        </div>
      </details>

      <details
        className="settings-collapsible"
        open={styleExpanded}
        onToggle={(event) => handleToggle(setStyleExpanded, event)}
      >
        <summary>{t("ui.themeParameter.sectionStyle", { styleId })}</summary>
        <div className="settings-collapsible-content">
          {showNoStyleSpecific ? (
            <p className="settings-placeholder">
              {t("ui.themeParameter.noStyleSpecific")}
            </p>
          ) : (
            styleContent
          )}
          {showStyleNoResults ? (
            <p className="settings-placeholder">{t("ui.common.noResults")}</p>
          ) : null}
        </div>
      </details>
    </section>
  );
}

export function ThemeParameterSnapshotPage({
  copySnapshotJson,
  downloadSnapshotJson,
  exportSnapshotJson,
  importSnapshotJson,
  loadSnapshotFile,
  openSnapshotFilePicker,
  setSnapshotIncludeComputedValues,
  setSnapshotJson,
  setSnapshotMessage,
  snapshotFileInputRef,
  snapshotIncludeComputedValues,
  snapshotJson,
  snapshotMessage,
  t,
}: {
  copySnapshotJson: () => Promise<void>;
  downloadSnapshotJson: () => void;
  exportSnapshotJson: () => void;
  importSnapshotJson: () => void;
  loadSnapshotFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  openSnapshotFilePicker: () => void;
  setSnapshotIncludeComputedValues: Dispatch<SetStateAction<boolean>>;
  setSnapshotJson: Dispatch<SetStateAction<string>>;
  setSnapshotMessage: Dispatch<SetStateAction<string>>;
  snapshotFileInputRef: MutableRefObject<HTMLInputElement | null>;
  snapshotIncludeComputedValues: boolean;
  snapshotJson: string;
  snapshotMessage: string;
  t: Translate;
}) {
  return (
    <section className="settings-block theme-parameter-block">
      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.themeParameter.page.snapshot")}</span>
        </header>
        <label>
          <input
            type="checkbox"
            checked={snapshotIncludeComputedValues}
            onChange={(event) => {
              setSnapshotIncludeComputedValues(event.target.checked);
            }}
          />
          <span>{t("ui.themeParameter.snapshotIncludeComputedValues")}</span>
        </label>
        <div className="theme-parameter-actions">
          <button type="button" onClick={exportSnapshotJson}>
            {t("ui.themeParameter.exportJson")}
          </button>
          <button type="button" onClick={downloadSnapshotJson}>
            {t("ui.themeParameter.downloadJsonFile")}
          </button>
          <button type="button" onClick={openSnapshotFilePicker}>
            {t("ui.themeParameter.loadJsonFile")}
          </button>
          <button
            type="button"
            onClick={() => {
              void copySnapshotJson();
            }}
          >
            {t("ui.themeParameter.copyJson")}
          </button>
          <button type="button" onClick={importSnapshotJson}>
            {t("ui.themeParameter.importJson")}
          </button>
          <button
            type="button"
            onClick={() => {
              setSnapshotJson("");
              setSnapshotMessage("");
            }}
          >
            {t("ui.themeParameter.clearJson")}
          </button>
        </div>
        <input
          ref={snapshotFileInputRef}
          className="theme-parameter-file-input"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            void loadSnapshotFile(event);
          }}
        />
        <label
          className="theme-parameter-json-field"
          htmlFor="theme-parameter-json-input"
        >
          <span>{t("ui.themeParameter.snapshotLabel")}</span>
          <textarea
            id="theme-parameter-json-input"
            value={snapshotJson}
            placeholder={t("ui.themeParameter.snapshotPlaceholder")}
            onChange={(event) => setSnapshotJson(event.target.value)}
          />
        </label>
        {snapshotMessage ? (
          <p className="settings-placeholder">{snapshotMessage}</p>
        ) : null}
      </section>
    </section>
  );
}

export function ThemeParameterContainerLayerPage({
  activePreviewMode,
  backgroundContent,
  containerHeaderContent,
  containerMainContent,
  containerMetadataContent,
  containerSidebarContent,
  containerBackgroundExpanded,
  containerHeaderExpanded,
  containerMainExpanded,
  containerMetadataExpanded,
  containerSidebarExpanded,
  containerSharedShellExpanded,
  containerSharedShellContent,
  setContainerBackgroundExpanded,
  setContainerHeaderExpanded,
  setContainerMainExpanded,
  setContainerMetadataExpanded,
  setContainerSidebarExpanded,
  setContainerSharedShellExpanded,
  t,
  togglePreviewMode,
}: {
  activePreviewMode: ThemeParameterPreviewMode;
  backgroundContent: ReactNode;
  containerHeaderContent: ReactNode;
  containerMainContent: ReactNode;
  containerMetadataContent: ReactNode;
  containerSidebarContent: ReactNode;
  containerBackgroundExpanded: boolean;
  containerHeaderExpanded: boolean;
  containerMainExpanded: boolean;
  containerMetadataExpanded: boolean;
  containerSidebarExpanded: boolean;
  containerSharedShellExpanded: boolean;
  containerSharedShellContent: ReactNode;
  setContainerBackgroundExpanded: BooleanSetter;
  setContainerHeaderExpanded: BooleanSetter;
  setContainerMainExpanded: BooleanSetter;
  setContainerMetadataExpanded: BooleanSetter;
  setContainerSidebarExpanded: BooleanSetter;
  setContainerSharedShellExpanded: BooleanSetter;
  t: Translate;
  togglePreviewMode: (mode: Exclude<ThemeParameterPreviewMode, "none">) => void;
}) {
  return (
    <section className="settings-block theme-parameter-block">
      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.themeParameter.page.containerLayer")}</span>
        </header>
        <div className="theme-parameter-debug-preview-actions">
          <button
            type="button"
            className={
              activePreviewMode === "bg-only"
                ? "theme-parameter-debug-preview-btn is-active"
                : "theme-parameter-debug-preview-btn"
            }
            onClick={() => togglePreviewMode("bg-only")}
          >
            {t("ui.themeParameter.preview.bgOnly")}
          </button>
          <button
            type="button"
            className={
              activePreviewMode === "bg-plus-container"
                ? "theme-parameter-debug-preview-btn is-active"
                : "theme-parameter-debug-preview-btn"
            }
            onClick={() => togglePreviewMode("bg-plus-container")}
          >
            {t("ui.themeParameter.preview.bgPlusContainer")}
          </button>
        </div>
      </section>

      <details
        className="settings-collapsible"
        open={containerBackgroundExpanded}
        onToggle={(event) =>
          handleToggle(setContainerBackgroundExpanded, event)
        }
      >
        <summary>
          {t("ui.themeParameter.containerLayer.sectionBackground")}
        </summary>
        <div className="settings-collapsible-content">{backgroundContent}</div>
      </details>

      <details
        className="settings-collapsible"
        open={containerSharedShellExpanded}
        onToggle={(event) =>
          handleToggle(setContainerSharedShellExpanded, event)
        }
      >
        <summary>
          {t("ui.themeParameter.containerLayer.sectionSharedShell")}
        </summary>
        <div className="settings-collapsible-content">
          {containerSharedShellContent}
        </div>
      </details>

      <details
        className="settings-collapsible"
        open={containerHeaderExpanded}
        onToggle={(event) => handleToggle(setContainerHeaderExpanded, event)}
      >
        <summary>{t("ui.themeParameter.containerLayer.sectionHeader")}</summary>
        <div className="settings-collapsible-content">
          {containerHeaderContent}
        </div>
      </details>

      <details
        className="settings-collapsible"
        open={containerSidebarExpanded}
        onToggle={(event) => handleToggle(setContainerSidebarExpanded, event)}
      >
        <summary>
          {t("ui.themeParameter.containerLayer.sectionSidebar")}
        </summary>
        <div className="settings-collapsible-content">
          {containerSidebarContent}
        </div>
      </details>

      <details
        className="settings-collapsible"
        open={containerMainExpanded}
        onToggle={(event) => handleToggle(setContainerMainExpanded, event)}
      >
        <summary>{t("ui.themeParameter.containerLayer.sectionMain")}</summary>
        <div className="settings-collapsible-content">
          {containerMainContent}
        </div>
      </details>

      <details
        className="settings-collapsible"
        open={containerMetadataExpanded}
        onToggle={(event) => handleToggle(setContainerMetadataExpanded, event)}
      >
        <summary>
          {t("ui.themeParameter.containerLayer.sectionMetadata")}
        </summary>
        <div className="settings-collapsible-content">
          {containerMetadataContent}
        </div>
      </details>
    </section>
  );
}

export function ThemeParameterLargePanelLayerPage({
  activePreviewMode,
  bodySections,
  internalSection,
  rootExpanded,
  rootSection,
  setRootExpanded,
  setSharedExpanded,
  sharedExpanded,
  sharedSection,
  t,
  togglePreviewMode,
}: {
  activePreviewMode: ThemeParameterPreviewMode;
  bodySections: ReactNode;
  internalSection: ReactNode;
  rootExpanded: boolean;
  rootSection: ReactNode;
  setRootExpanded: BooleanSetter;
  setSharedExpanded: BooleanSetter;
  sharedExpanded: boolean;
  sharedSection: ReactNode;
  t: Translate;
  togglePreviewMode: (mode: Exclude<ThemeParameterPreviewMode, "none">) => void;
}) {
  return (
    <section className="settings-block theme-parameter-block">
      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.themeParameter.page.largePanelLayer")}</span>
        </header>
        <div className="theme-parameter-debug-preview-actions">
          <button
            type="button"
            className={
              activePreviewMode === "bg-plus-large-panel"
                ? "theme-parameter-debug-preview-btn is-active"
                : "theme-parameter-debug-preview-btn"
            }
            onClick={() => togglePreviewMode("bg-plus-large-panel")}
          >
            {t("ui.themeParameter.preview.bgPlusLargePanel")}
          </button>
        </div>
      </section>
      <details
        className="settings-collapsible"
        open={rootExpanded}
        onToggle={(event) => handleToggle(setRootExpanded, event)}
      >
        <summary>{t("ui.themeParameter.largePanelLayer.sectionRoot")}</summary>
        <div className="settings-collapsible-content">{rootSection}</div>
      </details>
      <details
        className="settings-collapsible"
        open={sharedExpanded}
        onToggle={(event) => handleToggle(setSharedExpanded, event)}
      >
        <summary>
          {t("ui.themeParameter.largePanelLayer.sectionShared")}
        </summary>
        <div className="settings-collapsible-content">{sharedSection}</div>
      </details>
      {bodySections}
      {internalSection}
    </section>
  );
}

export function ThemeParameterSmallPanelLayerPage({
  activePreviewMode,
  bodySections,
  rootExpanded,
  rootSection,
  setRootExpanded,
  t,
  togglePreviewMode,
}: {
  activePreviewMode: ThemeParameterPreviewMode;
  bodySections: ReactNode;
  rootExpanded: boolean;
  rootSection: ReactNode;
  setRootExpanded: BooleanSetter;
  t: Translate;
  togglePreviewMode: (mode: Exclude<ThemeParameterPreviewMode, "none">) => void;
}) {
  return (
    <section className="settings-block theme-parameter-block">
      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.themeParameter.page.smallPanelLayer")}</span>
        </header>
        <div className="theme-parameter-debug-preview-actions">
          <button
            type="button"
            className={
              activePreviewMode === "bg-plus-small-panel"
                ? "theme-parameter-debug-preview-btn is-active"
                : "theme-parameter-debug-preview-btn"
            }
            onClick={() => togglePreviewMode("bg-plus-small-panel")}
          >
            {t("ui.themeParameter.preview.bgPlusSmallPanel")}
          </button>
        </div>
      </section>
      <details
        className="settings-collapsible"
        open={rootExpanded}
        onToggle={(event) => handleToggle(setRootExpanded, event)}
      >
        <summary>{t("ui.themeParameter.smallPanelLayer.sectionRoot")}</summary>
        <div className="settings-collapsible-content">{rootSection}</div>
      </details>
      {bodySections}
    </section>
  );
}

export function ThemeParameterCommonControlsPage({
  content,
  t,
}: {
  content: ReactNode;
  t: Translate;
}) {
  return (
    <section className="settings-block theme-parameter-block">
      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.themeParameter.page.commonControls")}</span>
        </header>
      </section>
      {content}
    </section>
  );
}

export function ThemeParameterButtonStatesPage({
  content,
  t,
}: {
  content: ReactNode;
  t: Translate;
}) {
  return (
    <section className="settings-block theme-parameter-block">
      <section className="settings-group">
        <header className="settings-group-head">
          <span>{t("ui.themeParameter.page.buttonStates")}</span>
        </header>
      </section>
      {content}
    </section>
  );
}
