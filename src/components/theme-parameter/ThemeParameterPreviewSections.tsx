import type { Dispatch, ReactNode, SetStateAction } from "react";

import { SkeuoRunway } from "../primitives/SkeuoRunway";
import { ThemeParameterCommonControlTextFieldRow } from "./ThemeParameterFieldRows";
import {
  BUTTON_SLOT_SECTION_DEFINITIONS,
  BUTTON_VARIANT_DEFAULT_COLOR_FIELDS,
  BUTTON_VARIANT_DEFAULT_TEXT_FIELDS,
  BUTTON_VARIANT_OVERLAY_CELL_COLOR_FIELDS,
  BUTTON_VARIANT_OVERLAY_CELL_TEXT_FIELDS,
  BUTTON_VARIANT_PLAYER_COLOR_FIELDS,
  COMMON_CONTROL_COLOR_FIELDS,
  COMMON_CONTROL_TEXT_FIELDS,
  CONTROL_SECTION_DEFINITIONS,
} from "./themeParameterPanelCatalog";
import { buildSoftRangeStyle } from "./themeParameterRangeStyle";
import type {
  ControlPreviewValues,
  ThemeDebugColorField,
  ThemeDebugTextField,
  ThemeControlSectionId,
} from "./themeParameterPanelTypes";

interface ThemeParameterCommonControlSectionsProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  controlPreviewValues: ControlPreviewValues;
  setControlPreviewValues: Dispatch<SetStateAction<ControlPreviewValues>>;
  scrollbarExpanded: boolean;
  setScrollbarExpanded: Dispatch<SetStateAction<boolean>>;
  sliderBaseExpanded: boolean;
  setSliderBaseExpanded: Dispatch<SetStateAction<boolean>>;
  sliderPlayerExpanded: boolean;
  setSliderPlayerExpanded: Dispatch<SetStateAction<boolean>>;
  sliderVerticalExpanded: boolean;
  setSliderVerticalExpanded: Dispatch<SetStateAction<boolean>>;
  sliderSettingsExpanded: boolean;
  setSliderSettingsExpanded: Dispatch<SetStateAction<boolean>>;
  fileListExpanded: boolean;
  setFileListExpanded: Dispatch<SetStateAction<boolean>>;
  thumbnailCardExpanded: boolean;
  setThumbnailCardExpanded: Dispatch<SetStateAction<boolean>>;
  debugTextValues: Record<string, string>;
  isTextFieldChanged: (field: ThemeDebugTextField) => boolean;
  setDebugTextFieldValue: (field: ThemeDebugTextField, raw: string) => void;
  resetTextField: (field: ThemeDebugTextField) => void;
  resetLabel: string;
  renderColorFieldRow: (field: ThemeDebugColorField) => ReactNode;
}

interface ThemeParameterButtonStateDebugProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  defaultExpanded: boolean;
  setDefaultExpanded: Dispatch<SetStateAction<boolean>>;
  playerExpanded: boolean;
  setPlayerExpanded: Dispatch<SetStateAction<boolean>>;
  overlayCellExpanded: boolean;
  setOverlayCellExpanded: Dispatch<SetStateAction<boolean>>;
  slotExpanded: boolean;
  setSlotExpanded: Dispatch<SetStateAction<boolean>>;
  slotHeaderExpanded: boolean;
  setSlotHeaderExpanded: Dispatch<SetStateAction<boolean>>;
  slotSidebarHeaderExpanded: boolean;
  setSlotSidebarHeaderExpanded: Dispatch<SetStateAction<boolean>>;
  slotMainHeaderExpanded: boolean;
  setSlotMainHeaderExpanded: Dispatch<SetStateAction<boolean>>;
  slotMetadataHeaderExpanded: boolean;
  setSlotMetadataHeaderExpanded: Dispatch<SetStateAction<boolean>>;
  renderColorFieldRow: (field: ThemeDebugColorField) => ReactNode;
  renderTextFieldRow: (field: ThemeDebugTextField) => ReactNode;
}

const renderCommonControlHorizontalPreview = (
  sectionId: ThemeControlSectionId,
  controlPreviewValues: ControlPreviewValues,
  setControlPreviewValues: Dispatch<SetStateAction<ControlPreviewValues>>,
) => {
  switch (sectionId) {
    case "control-scrollbar": {
      return (
        <div
          className="theme-parameter-control-preview-row is-horizontal"
          data-testid="theme-control-preview-scrollbar-horizontal"
        >
          <div
            className="theme-parameter-scroll-preview mpx-scroll-area"
            aria-label="滚动条横向预览"
            tabIndex={0}
          >
            <div className="theme-parameter-scroll-preview-content">
              {Array.from({ length: 18 }).map((_, index) => (
                <span
                  key={`scroll-preview-chip-${index}`}
                  className="theme-parameter-scroll-preview-chip"
                >
                  {`Scroll-${index + 1}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      );
    }
    case "control-slider-base": {
      return (
        <div
          className="theme-parameter-control-preview-row is-horizontal"
          data-testid="theme-control-preview-slider-base-horizontal"
        >
          <label className="theme-parameter-control-range-row">
            <span>基础 slider（横向）</span>
            <input
              aria-label="slider-base-horizontal-preview"
              className="theme-parameter-control-range"
              max={100}
              min={0}
              step={1}
              type="range"
              value={controlPreviewValues.sliderBaseHorizontal}
              onChange={(event) => {
                setControlPreviewValues((current) => ({
                  ...current,
                  sliderBaseHorizontal: Number(event.target.value),
                }));
              }}
            />
          </label>
        </div>
      );
    }
    case "control-slider-player": {
      return (
        <div
          className="theme-parameter-control-preview-row is-horizontal"
          data-testid="theme-control-preview-slider-player-horizontal"
        >
          <div className="video-controls-progress theme-parameter-player-progress-preview">
            <span className="video-progress-time">01:24 / 03:40</span>
            <SkeuoRunway
              ariaLabel="slider-player-progress-preview"
              fillTone="gold"
              max={100}
              min={0}
              preset="progress"
              rangePercent={controlPreviewValues.sliderPlayerProgress}
              step={1}
              value={controlPreviewValues.sliderPlayerProgress}
              onChange={(event) => {
                setControlPreviewValues((current) => ({
                  ...current,
                  sliderPlayerProgress: Number(event.target.value),
                }));
              }}
            />
          </div>
        </div>
      );
    }
    case "control-slider-vertical": {
      return (
        <div
          className="theme-parameter-control-preview-row is-horizontal"
          data-testid="theme-control-preview-slider-vertical-horizontal"
        >
          <label className="theme-parameter-control-range-row">
            <span>竖向链路横向参考</span>
            <input
              aria-label="slider-vertical-reference-preview"
              className="music-ctrl-shader-range theme-parameter-control-range"
              max={100}
              min={0}
              step={1}
              style={buildSoftRangeStyle(
                controlPreviewValues.sliderVerticalReference,
              )}
              type="range"
              value={controlPreviewValues.sliderVerticalReference}
              onChange={(event) => {
                setControlPreviewValues((current) => ({
                  ...current,
                  sliderVerticalReference: Number(event.target.value),
                }));
              }}
            />
          </label>
        </div>
      );
    }
    case "control-slider-settings": {
      return (
        <div
          className="theme-parameter-control-preview-row is-horizontal"
          data-testid="theme-control-preview-slider-settings-horizontal"
        >
          <label className="theme-parameter-control-range-row">
            <span>设置面板 slider（横向）</span>
            <input
              aria-label="slider-settings-horizontal-preview"
              className="theme-parameter-control-range"
              max={100}
              min={0}
              step={1}
              type="range"
              value={controlPreviewValues.sliderSettingsHorizontal}
              onChange={(event) => {
                setControlPreviewValues((current) => ({
                  ...current,
                  sliderSettingsHorizontal: Number(event.target.value),
                }));
              }}
            />
          </label>
        </div>
      );
    }
    case "control-file-list": {
      return (
        <div
          className="theme-parameter-control-preview-row is-horizontal"
          data-testid="theme-control-preview-file-list-horizontal"
        >
          <section className="theme-parameter-file-list-preview">
            <header className="theme-parameter-file-list-preview-head">
              <span>文件名</span>
              <span>时长</span>
              <span>大小</span>
            </header>
            <div className="theme-parameter-file-list-preview-body">
              <div className="theme-parameter-file-list-preview-row is-focused">
                <button
                  type="button"
                  className="theme-parameter-file-list-preview-row-main mpx-overlay-cell-btn"
                  data-mpx-button-variant="overlay-cell"
                >
                  <span className="theme-parameter-file-list-preview-label">
                    Main-image.png
                  </span>
                  <span>--</span>
                  <span>824KB</span>
                </button>
              </div>
              <div className="theme-parameter-file-list-preview-row is-selected">
                <button
                  type="button"
                  className="theme-parameter-file-list-preview-row-main is-selected mpx-overlay-cell-btn"
                  data-mpx-button-variant="overlay-cell"
                >
                  <span className="theme-parameter-file-list-preview-label">
                    Music-track.flac
                  </span>
                  <span>03:42</span>
                  <span>31MB</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      );
    }
    default:
      return null;
  }
};

const renderCommonControlVerticalPreview = (
  sectionId: ThemeControlSectionId,
  controlPreviewValues: ControlPreviewValues,
  setControlPreviewValues: Dispatch<SetStateAction<ControlPreviewValues>>,
) => {
  switch (sectionId) {
    case "control-slider-player": {
      return null;
    }
    case "control-slider-vertical": {
      return (
        <div
          className="theme-parameter-control-vertical-stack is-volume-variants"
          data-testid="theme-control-preview-slider-vertical-stack"
        >
          <label className="theme-parameter-control-vertical-item">
            <span className="theme-parameter-control-preview-caption">
              朝上
            </span>
            <div className="theme-parameter-control-vertical-track-box">
              <div className="mpx-runway-axis is-vertical theme-parameter-control-vertical-runway theme-parameter-control-vertical-axis">
                <SkeuoRunway
                  ariaLabel="slider-vertical-up-preview"
                  inputClassName="video-ctrl-volume-range"
                  max={100}
                  min={0}
                  orientation="vertical"
                  preset="control"
                  rangePercent={controlPreviewValues.sliderVerticalUp}
                  step={1}
                  value={controlPreviewValues.sliderVerticalUp}
                  onChange={(event) => {
                    setControlPreviewValues((current) => ({
                      ...current,
                      sliderVerticalUp: Number(event.target.value),
                    }));
                  }}
                />
              </div>
            </div>
          </label>
          <label className="theme-parameter-control-vertical-item">
            <span className="theme-parameter-control-preview-caption">
              朝下
            </span>
            <div className="theme-parameter-control-vertical-track-box">
              <div className="mpx-runway-axis is-vertical theme-parameter-control-vertical-runway theme-parameter-control-vertical-axis is-down">
                <SkeuoRunway
                  ariaLabel="slider-vertical-down-preview"
                  inputClassName="video-ctrl-volume-range"
                  max={100}
                  min={0}
                  orientation="vertical"
                  preset="control"
                  rangePercent={controlPreviewValues.sliderVerticalDown}
                  step={1}
                  value={controlPreviewValues.sliderVerticalDown}
                  onChange={(event) => {
                    setControlPreviewValues((current) => ({
                      ...current,
                      sliderVerticalDown: Number(event.target.value),
                    }));
                  }}
                />
              </div>
            </div>
          </label>
        </div>
      );
    }
    default:
      return null;
  }
};

function renderButtonFieldRows(options: {
  colorFields: readonly ThemeDebugColorField[];
  textFields?: readonly ThemeDebugTextField[];
  renderColorFieldRow: (field: ThemeDebugColorField) => ReactNode;
  renderTextFieldRow: (field: ThemeDebugTextField) => ReactNode;
}) {
  const {
    colorFields,
    textFields = [],
    renderColorFieldRow,
    renderTextFieldRow,
  } = options;
  return (
    <section className="settings-group theme-parameter-debug-group">
      {colorFields.length > 0 ? (
        <div className="theme-parameter-color-list">
          {colorFields.map(renderColorFieldRow)}
        </div>
      ) : null}
      {textFields.length > 0 ? (
        <div className="theme-parameter-text-list">
          {textFields.map(renderTextFieldRow)}
        </div>
      ) : null}
    </section>
  );
}

export function ThemeParameterCommonControlSections({
  t,
  controlPreviewValues,
  setControlPreviewValues,
  scrollbarExpanded,
  setScrollbarExpanded,
  sliderBaseExpanded,
  setSliderBaseExpanded,
  sliderPlayerExpanded,
  setSliderPlayerExpanded,
  sliderVerticalExpanded,
  setSliderVerticalExpanded,
  sliderSettingsExpanded,
  setSliderSettingsExpanded,
  fileListExpanded,
  setFileListExpanded,
  thumbnailCardExpanded,
  setThumbnailCardExpanded,
  debugTextValues,
  isTextFieldChanged,
  setDebugTextFieldValue,
  resetTextField,
  resetLabel,
  renderColorFieldRow,
}: ThemeParameterCommonControlSectionsProps) {
  const renderTextFieldRow = (field: ThemeDebugTextField) => {
    return (
      <ThemeParameterCommonControlTextFieldRow
        key={field.id}
        field={field}
        raw={debugTextValues[field.id] ?? field.fallback}
        isChanged={isTextFieldChanged(field)}
        onChange={setDebugTextFieldValue}
        onReset={resetTextField}
        resetLabel={resetLabel}
      />
    );
  };

  const expandedStateMap: Record<ThemeControlSectionId, boolean> = {
    "control-scrollbar": scrollbarExpanded,
    "control-slider-base": sliderBaseExpanded,
    "control-slider-player": sliderPlayerExpanded,
    "control-slider-vertical": sliderVerticalExpanded,
    "control-slider-settings": sliderSettingsExpanded,
    "control-file-list": fileListExpanded,
    "control-thumbnail-card": thumbnailCardExpanded,
  };

  const expandedSetterMap: Record<
    ThemeControlSectionId,
    Dispatch<SetStateAction<boolean>>
  > = {
    "control-scrollbar": setScrollbarExpanded,
    "control-slider-base": setSliderBaseExpanded,
    "control-slider-player": setSliderPlayerExpanded,
    "control-slider-vertical": setSliderVerticalExpanded,
    "control-slider-settings": setSliderSettingsExpanded,
    "control-file-list": setFileListExpanded,
    "control-thumbnail-card": setThumbnailCardExpanded,
  };

  return (
    <>
      {CONTROL_SECTION_DEFINITIONS.map((section) => {
        const colorFields = COMMON_CONTROL_COLOR_FIELDS.filter(
          (field) => field.sectionId === section.id,
        );
        const textFields = COMMON_CONTROL_TEXT_FIELDS.filter(
          (field) => field.sectionId === section.id,
        );
        if (colorFields.length === 0 && textFields.length === 0) {
          return null;
        }
        const horizontalPreview = renderCommonControlHorizontalPreview(
          section.id,
          controlPreviewValues,
          setControlPreviewValues,
        );
        const verticalPreview = renderCommonControlVerticalPreview(
          section.id,
          controlPreviewValues,
          setControlPreviewValues,
        );
        return (
          <details
            key={section.id}
            className="settings-collapsible"
            open={expandedStateMap[section.id]}
            onToggle={(event) =>
              expandedSetterMap[section.id](
                (event.currentTarget as HTMLDetailsElement).open,
              )
            }
            data-testid={`theme-control-section-${section.id}`}
          >
            <summary>{t(section.titleKey)}</summary>
            <div className="settings-collapsible-content">
              <section className="settings-group theme-parameter-debug-group">
                <p className="theme-parameter-note-intro">
                  {t(section.noteKey)}
                </p>
                {horizontalPreview}
                <div
                  className={
                    verticalPreview
                      ? "theme-parameter-control-content has-right-vertical"
                      : "theme-parameter-control-content"
                  }
                >
                  <div className="theme-parameter-control-fields">
                    {colorFields.length > 0 ? (
                      <div className="theme-parameter-color-list">
                        {colorFields.map(renderColorFieldRow)}
                      </div>
                    ) : null}
                    {textFields.length > 0 ? (
                      <div className="theme-parameter-text-list">
                        {textFields.map(renderTextFieldRow)}
                      </div>
                    ) : null}
                  </div>
                  {verticalPreview ? (
                    <aside className="theme-parameter-control-vertical-side">
                      {verticalPreview}
                    </aside>
                  ) : null}
                </div>
              </section>
            </div>
          </details>
        );
      })}
    </>
  );
}

export function ThemeParameterButtonStateDebug({
  t,
  defaultExpanded,
  setDefaultExpanded,
  playerExpanded,
  setPlayerExpanded,
  overlayCellExpanded,
  setOverlayCellExpanded,
  slotExpanded,
  setSlotExpanded,
  slotHeaderExpanded,
  setSlotHeaderExpanded,
  slotSidebarHeaderExpanded,
  setSlotSidebarHeaderExpanded,
  slotMainHeaderExpanded,
  setSlotMainHeaderExpanded,
  slotMetadataHeaderExpanded,
  setSlotMetadataHeaderExpanded,
  renderColorFieldRow,
  renderTextFieldRow,
}: ThemeParameterButtonStateDebugProps) {
  const slotExpandedStateMap = {
    header: slotHeaderExpanded,
    sidebarHeader: slotSidebarHeaderExpanded,
    mainHeader: slotMainHeaderExpanded,
    metadataHeader: slotMetadataHeaderExpanded,
  } as const;

  const slotSetterMap = {
    header: setSlotHeaderExpanded,
    sidebarHeader: setSlotSidebarHeaderExpanded,
    mainHeader: setSlotMainHeaderExpanded,
    metadataHeader: setSlotMetadataHeaderExpanded,
  } as const;

  return (
    <>
      <details
        className="settings-collapsible"
        open={defaultExpanded}
        onToggle={(event) =>
          setDefaultExpanded((event.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary>{t("ui.themeParameter.buttonLayer.sectionDefault")}</summary>
        <div className="settings-collapsible-content">
          <p className="theme-parameter-note-intro">
            {t("ui.themeParameter.buttonLayer.noteDefault")}
          </p>
          {renderButtonFieldRows({
            colorFields: BUTTON_VARIANT_DEFAULT_COLOR_FIELDS,
            textFields: BUTTON_VARIANT_DEFAULT_TEXT_FIELDS,
            renderColorFieldRow,
            renderTextFieldRow,
          })}
        </div>
      </details>

      <details
        className="settings-collapsible"
        open={playerExpanded}
        onToggle={(event) =>
          setPlayerExpanded((event.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary>{t("ui.themeParameter.buttonLayer.sectionPlayer")}</summary>
        <div className="settings-collapsible-content">
          <p className="theme-parameter-note-intro">
            {t("ui.themeParameter.buttonLayer.notePlayer")}
          </p>
          {renderButtonFieldRows({
            colorFields: BUTTON_VARIANT_PLAYER_COLOR_FIELDS,
            renderColorFieldRow,
            renderTextFieldRow,
          })}
        </div>
      </details>

      <details
        className="settings-collapsible"
        open={overlayCellExpanded}
        onToggle={(event) =>
          setOverlayCellExpanded(
            (event.currentTarget as HTMLDetailsElement).open,
          )
        }
      >
        <summary>
          {t("ui.themeParameter.buttonLayer.sectionOverlayCell")}
        </summary>
        <div className="settings-collapsible-content">
          <p className="theme-parameter-note-intro">
            {t("ui.themeParameter.buttonLayer.noteOverlayCell")}
          </p>
          {renderButtonFieldRows({
            colorFields: BUTTON_VARIANT_OVERLAY_CELL_COLOR_FIELDS,
            textFields: BUTTON_VARIANT_OVERLAY_CELL_TEXT_FIELDS,
            renderColorFieldRow,
            renderTextFieldRow,
          })}
        </div>
      </details>

      <details
        className="settings-collapsible"
        open={slotExpanded}
        onToggle={(event) =>
          setSlotExpanded((event.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary>{t("ui.themeParameter.buttonLayer.sectionSlot")}</summary>
        <div className="settings-collapsible-content">
          <p className="theme-parameter-note-intro">
            {t("ui.themeParameter.buttonLayer.noteSlot")}
          </p>
          {BUTTON_SLOT_SECTION_DEFINITIONS.map((section) => (
            <details
              key={section.id}
              className="settings-collapsible"
              open={slotExpandedStateMap[section.id]}
              onToggle={(event) =>
                slotSetterMap[section.id](
                  (event.currentTarget as HTMLDetailsElement).open,
                )
              }
            >
              <summary>{t(section.summaryKey)}</summary>
              <div className="settings-collapsible-content">
                {renderButtonFieldRows({
                  colorFields: section.colorFields,
                  renderColorFieldRow,
                  renderTextFieldRow,
                })}
              </div>
            </details>
          ))}
        </div>
      </details>
    </>
  );
}
