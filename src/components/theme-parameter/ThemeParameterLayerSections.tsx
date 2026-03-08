import type { Dispatch, ReactNode, SetStateAction } from "react";

import type { ThemeParameterDefinition } from "./themeParameterDefinitions";
import type {
  ContainerDebugSubsection,
  LargePanelInternalSectionDefinition,
  SmallPanelSectionGroupDefinition,
  ThemeDebugColorField,
  ThemeDebugTextField,
} from "./themeParameterPanelTypes";

interface ThemeParameterContainerFrameSectionProps {
  section: {
    appearanceParameterIds: readonly string[];
    transformParameterIds: readonly string[];
    colorFields: readonly ThemeDebugColorField[];
    textFields: readonly ThemeDebugTextField[];
  };
  appearanceOpen: boolean;
  setAppearanceOpen: Dispatch<SetStateAction<boolean>>;
  appearanceParameters: ThemeParameterDefinition[];
  transformParameters: ThemeParameterDefinition[];
  renderColorFieldRow: (field: ThemeDebugColorField) => ReactNode;
  renderTextFieldRow: (field: ThemeDebugTextField) => ReactNode;
  renderParameterRows: (parameters: ThemeParameterDefinition[]) => ReactNode;
  renderParameterRowsWithVarLabel: (
    parameters: ThemeParameterDefinition[],
  ) => ReactNode;
}

interface ThemeParameterDebugSubsectionProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  section: ContainerDebugSubsection;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  content: ReactNode;
}

interface ThemeParameterLargePanelSectionRowsProps {
  colorFields: readonly ThemeDebugColorField[];
  inlineParameters?: ThemeParameterDefinition[];
  textFields?: readonly ThemeDebugTextField[];
  parameters?: ThemeParameterDefinition[];
  renderColorFieldRow: (field: ThemeDebugColorField) => ReactNode;
  renderTextFieldRow: (field: ThemeDebugTextField) => ReactNode;
  renderParameterRowsWithVarLabel: (
    parameters: ThemeParameterDefinition[],
  ) => ReactNode;
}

interface ThemeParameterLargePanelInternalSectionsProps {
  t: (key: string, values?: Record<string, string | number>) => string;
  sections: readonly LargePanelInternalSectionDefinition[];
  expanded: Record<LargePanelInternalSectionDefinition["id"], boolean>;
  setExpanded: (
    sectionId: LargePanelInternalSectionDefinition["id"],
    action: SetStateAction<boolean>,
  ) => void;
  renderSectionRows: (options: {
    colorFields: readonly ThemeDebugColorField[];
    inlineParameters?: ThemeParameterDefinition[];
    textFields?: readonly ThemeDebugTextField[];
    parameters?: ThemeParameterDefinition[];
  }) => ReactNode;
}

interface ThemeParameterSmallPanelSectionGroupsProps {
  groups: readonly SmallPanelSectionGroupDefinition[];
  resolveInlineParameters: (
    parameterIds: readonly string[],
  ) => ThemeParameterDefinition[];
  renderColorFieldRow: (field: ThemeDebugColorField) => ReactNode;
  renderTextFieldRow: (field: ThemeDebugTextField) => ReactNode;
  renderParameterRowsWithVarLabel: (
    parameters: ThemeParameterDefinition[],
  ) => ReactNode;
}

export function ThemeParameterContainerFrameSection({
  section,
  appearanceOpen,
  setAppearanceOpen,
  appearanceParameters,
  transformParameters,
  renderColorFieldRow,
  renderTextFieldRow,
  renderParameterRows,
  renderParameterRowsWithVarLabel,
}: ThemeParameterContainerFrameSectionProps) {
  const fillAngleParameters = appearanceParameters.filter((parameter) =>
    parameter.id.endsWith("fill-angle"),
  );
  const shapeParameters = appearanceParameters.filter(
    (parameter) => !parameter.id.endsWith("fill-angle"),
  );
  const fillColorFields = section.colorFields.filter(
    (field) => field.id.includes("fill-start") || field.id.includes("fill-end"),
  );
  const otherColorFields = section.colorFields.filter(
    (field) => !fillColorFields.includes(field),
  );

  return (
    <>
      <details
        className="settings-collapsible"
        open={appearanceOpen}
        onToggle={(event) =>
          setAppearanceOpen((event.currentTarget as HTMLDetailsElement).open)
        }
      >
        <summary>基础外观</summary>
        <div className="settings-collapsible-content">
          <section className="settings-group theme-parameter-debug-group">
            {fillColorFields.length > 0 ? (
              <div className="theme-parameter-color-list">
                {fillColorFields.map(renderColorFieldRow)}
              </div>
            ) : null}
            {fillAngleParameters.length > 0
              ? renderParameterRowsWithVarLabel(fillAngleParameters)
              : null}
            {otherColorFields.length > 0 ? (
              <div className="theme-parameter-color-list">
                {otherColorFields.map(renderColorFieldRow)}
              </div>
            ) : null}
            {section.textFields.length > 0 ? (
              <div className="theme-parameter-text-list">
                {section.textFields.map(renderTextFieldRow)}
              </div>
            ) : null}
            {shapeParameters.length > 0
              ? renderParameterRowsWithVarLabel(shapeParameters)
              : null}
          </section>
          <section className="settings-group theme-parameter-debug-group">
            <header className="settings-group-head">
              <span>视觉变换</span>
            </header>
            {transformParameters.length > 0
              ? renderParameterRows(transformParameters)
              : null}
          </section>
        </div>
      </details>
      <section className="settings-group theme-parameter-debug-group">
        <header className="settings-group-head">
          <span>高级 3D（预留）</span>
        </header>
        <p className="settings-placeholder">
          当前已在 contract 预留 3D transform 变量，后续再补可视化调节控件。
        </p>
      </section>
    </>
  );
}

export function ThemeParameterDebugSubsection({
  t,
  section,
  open,
  setOpen,
  content,
}: ThemeParameterDebugSubsectionProps) {
  return (
    <details
      key={section.id}
      className="settings-collapsible"
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
    >
      <summary>{t(section.summaryKey)}</summary>
      <div className="settings-collapsible-content">
        <section className="settings-group theme-parameter-debug-group">
          <header className="settings-group-head">
            <span>变量</span>
          </header>
          {content}
        </section>
      </div>
    </details>
  );
}

export function ThemeParameterLargePanelSectionRows({
  colorFields,
  inlineParameters = [],
  textFields = [],
  parameters = [],
  renderColorFieldRow,
  renderTextFieldRow,
  renderParameterRowsWithVarLabel,
}: ThemeParameterLargePanelSectionRowsProps) {
  if (colorFields.length === 0) {
    return null;
  }

  return (
    <section className="settings-group theme-parameter-debug-group">
      <header className="settings-group-head">
        <span>基础外观</span>
      </header>
      <div className="theme-parameter-color-list">
        {colorFields.map(renderColorFieldRow)}
      </div>
      {inlineParameters.length > 0
        ? renderParameterRowsWithVarLabel(inlineParameters)
        : null}
      {textFields.length > 0 ? (
        <div className="theme-parameter-text-list">
          {textFields.map(renderTextFieldRow)}
        </div>
      ) : null}
      {parameters.length > 0 ? renderParameterRowsWithVarLabel(parameters) : null}
    </section>
  );
}

export function ThemeParameterLargePanelInternalSections({
  t,
  sections,
  expanded,
  setExpanded,
  renderSectionRows,
}: ThemeParameterLargePanelInternalSectionsProps) {
  return (
    <>
      {sections.map((section) => (
        <details
          key={section.id}
          className="settings-collapsible"
          open={expanded[section.id]}
          onToggle={(event) =>
            setExpanded(section.id, (event.currentTarget as HTMLDetailsElement).open)
          }
        >
          <summary>{t(section.summaryKey)}</summary>
          <div className="settings-collapsible-content">
            {renderSectionRows({
              colorFields: section.colorFields,
              textFields: section.textFields,
            })}
          </div>
        </details>
      ))}
    </>
  );
}

export function ThemeParameterSmallPanelSectionGroups({
  groups,
  resolveInlineParameters,
  renderColorFieldRow,
  renderTextFieldRow,
  renderParameterRowsWithVarLabel,
}: ThemeParameterSmallPanelSectionGroupsProps) {
  return groups.map((group, index) => {
    const inlineParameters = group.inlineParameterIds
      ? resolveInlineParameters(group.inlineParameterIds)
      : [];

    if (
      group.colorFields.length === 0 &&
      group.textFields.length === 0 &&
      inlineParameters.length === 0
    ) {
      return null;
    }

    return (
      <section
        key={`${group.title ?? "root"}-${index}`}
        className="settings-group theme-parameter-debug-group"
      >
        {group.title ? (
          <header className="settings-group-head">
            <span>{group.title}</span>
          </header>
        ) : null}
        {group.colorFields.length > 0 ? (
          <div className="theme-parameter-color-list">
            {group.colorFields.map(renderColorFieldRow)}
          </div>
        ) : null}
        {group.textFields.length > 0 ? (
          <div className="theme-parameter-text-list">
            {group.textFields.map(renderTextFieldRow)}
          </div>
        ) : null}
        {inlineParameters.length > 0
          ? renderParameterRowsWithVarLabel(inlineParameters)
          : null}
      </section>
    );
  });
}
