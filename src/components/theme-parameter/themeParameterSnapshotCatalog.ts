export interface ThemeParameterSnapshot {
  version: 1;
  styleId: string;
  values?: Record<string, number>;
  debugColors?: Record<string, string>;
  debugTexts?: Record<string, string>;
}

export interface SnapshotColorField {
  id: string;
  cssVar: string;
  fallback: string;
}

export interface SnapshotTextField {
  id: string;
  cssVar: string;
}

export const SNAPSHOT_COLOR_FIELDS: readonly SnapshotColorField[] = [
  {
    id: "container-bg-workspace",
    cssVar: "--mpx-bg-workspace",
    fallback: "#f3f0ea",
  },
  {
    id: "container-bg-panel",
    cssVar: "--mpx-bg-panel",
    fallback: "#fbf8f3",
  },
  {
    id: "container-bg-elevated",
    cssVar: "--mpx-bg-elevated",
    fallback: "#ffffff",
  },
  {
    id: "container-frame-fill-start",
    cssVar: "--mpx-container-frame-fill-start",
    fallback: "#f5f2ec",
  },
  {
    id: "container-frame-fill-end",
    cssVar: "--mpx-container-frame-fill-end",
    fallback: "#e6e2da",
  },
  {
    id: "container-frame-edge-color",
    cssVar: "--mpx-container-frame-edge-color",
    fallback: "#cdc7bb",
  },
  {
    id: "container-frame-border-color",
    cssVar: "--mpx-container-frame-border-color",
    fallback: "#e5e4e0",
  },
  {
    id: "container-header-fill-start",
    cssVar: "--mpx-header-fill-start",
    fallback: "#f5f2ec",
  },
  {
    id: "container-header-fill-end",
    cssVar: "--mpx-header-fill-end",
    fallback: "#e6e2da",
  },
  {
    id: "container-header-border-color",
    cssVar: "--mpx-header-border-color",
    fallback: "#e5e4e0",
  },
  {
    id: "container-header-buttons-border",
    cssVar: "--mpx-slot-fg-header-button-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-header-buttons-bg",
    cssVar: "--mpx-slot-fg-header-button-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-header-buttons-text",
    cssVar: "--mpx-slot-fg-header-button-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-header-logo-border",
    cssVar: "--mpx-slot-fg-header-logo-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-header-logo-bg",
    cssVar: "--mpx-slot-fg-header-logo-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-header-logo-text",
    cssVar: "--mpx-slot-fg-header-logo-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-header-g1-border",
    cssVar: "--mpx-slot-fg-header-g1-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-header-g1-bg",
    cssVar: "--mpx-slot-fg-header-g1-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-header-g1-text",
    cssVar: "--mpx-slot-fg-header-g1-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-header-g2-mode-border",
    cssVar: "--mpx-slot-fg-header-g2-mode-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-header-g2-mode-bg",
    cssVar: "--mpx-slot-fg-header-g2-mode-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-header-g2-mode-text",
    cssVar: "--mpx-slot-fg-header-g2-mode-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-header-g-debug-border",
    cssVar: "--mpx-slot-fg-header-g-debug-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-header-g-debug-bg",
    cssVar: "--mpx-slot-fg-header-g-debug-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-header-g-debug-text",
    cssVar: "--mpx-slot-fg-header-g-debug-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-header-g3-border",
    cssVar: "--mpx-slot-fg-header-g3-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-header-g3-bg",
    cssVar: "--mpx-slot-fg-header-g3-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-header-g3-text",
    cssVar: "--mpx-slot-fg-header-g3-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-sidebar-fill-start",
    cssVar: "--mpx-sidebar-fill-start",
    fallback: "#f5f2ec",
  },
  {
    id: "container-sidebar-fill-end",
    cssVar: "--mpx-sidebar-fill-end",
    fallback: "#e6e2da",
  },
  {
    id: "container-sidebar-border-color",
    cssVar: "--mpx-sidebar-border-color",
    fallback: "#e5e4e0",
  },
  {
    id: "container-sidebar-header-bg",
    cssVar: "--mpx-slot-fg-sidebar-header-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-sidebar-header-border",
    cssVar: "--mpx-slot-fg-sidebar-header-border",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-sidebar-header-text",
    cssVar: "--mpx-slot-fg-sidebar-header-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-sidebar-header-button-border",
    cssVar: "--mpx-slot-fg-sidebar-header-button-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-sidebar-header-button-bg",
    cssVar: "--mpx-slot-fg-sidebar-header-button-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-sidebar-header-button-text",
    cssVar: "--mpx-slot-fg-sidebar-header-button-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-sidebar-header-title-border",
    cssVar: "--mpx-slot-fg-sidebar-header-title-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-sidebar-header-title-bg",
    cssVar: "--mpx-slot-fg-sidebar-header-title-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-sidebar-header-title-text",
    cssVar: "--mpx-slot-fg-sidebar-header-title-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-sidebar-header-action-border",
    cssVar: "--mpx-slot-fg-sidebar-header-action-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-sidebar-header-action-bg",
    cssVar: "--mpx-slot-fg-sidebar-header-action-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-sidebar-header-action-text",
    cssVar: "--mpx-slot-fg-sidebar-header-action-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-main-fill-start",
    cssVar: "--mpx-main-fill-start",
    fallback: "#f5f2ec",
  },
  {
    id: "container-main-fill-end",
    cssVar: "--mpx-main-fill-end",
    fallback: "#e6e2da",
  },
  {
    id: "container-main-border-color",
    cssVar: "--mpx-main-border-color",
    fallback: "#e5e4e0",
  },
  {
    id: "container-main-header-fill-start",
    cssVar: "--mpx-main-header-fill-start",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-main-header-fill-end",
    cssVar: "--mpx-main-header-fill-end",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-main-header-border-color",
    cssVar: "--mpx-main-header-border-color",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-main-header-button-border",
    cssVar: "--mpx-slot-fg-main-header-button-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-main-header-button-bg",
    cssVar: "--mpx-slot-fg-main-header-button-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-main-header-button-text",
    cssVar: "--mpx-slot-fg-main-header-button-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-metadata-fill-start",
    cssVar: "--mpx-metadata-fill-start",
    fallback: "#f5f2ec",
  },
  {
    id: "container-metadata-fill-end",
    cssVar: "--mpx-metadata-fill-end",
    fallback: "#e6e2da",
  },
  {
    id: "container-metadata-border-color",
    cssVar: "--mpx-metadata-border-color",
    fallback: "#e5e4e0",
  },
  {
    id: "container-metadata-header-fill-start",
    cssVar: "--mpx-metadata-header-fill-start",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-metadata-header-fill-end",
    cssVar: "--mpx-metadata-header-fill-end",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-metadata-header-border-color",
    cssVar: "--mpx-metadata-header-border-color",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-metadata-header-button-border",
    cssVar: "--mpx-slot-fg-meta-header-button-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-metadata-header-button-bg",
    cssVar: "--mpx-slot-fg-meta-header-button-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-metadata-header-button-text",
    cssVar: "--mpx-slot-fg-meta-header-button-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-metadata-body-bg",
    cssVar: "--mpx-metadata-body-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-metadata-body-text",
    cssVar: "--mpx-metadata-body-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-metadata-section-border",
    cssVar: "--mpx-metadata-section-border",
    fallback: "#d6cfc1",
  },
  {
    id: "container-metadata-section-label-text",
    cssVar: "--mpx-metadata-section-label-text",
    fallback: "#6a6358",
  },
  {
    id: "container-metadata-edit-label-text",
    cssVar: "--mpx-metadata-edit-label-text",
    fallback: "#6a6358",
  },
  {
    id: "container-metadata-edit-value-text",
    cssVar: "--mpx-metadata-edit-value-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-metadata-edit-value-bg",
    cssVar: "--mpx-metadata-edit-value-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-metadata-edit-value-border",
    cssVar: "--mpx-metadata-edit-value-border",
    fallback: "#d6cfc1",
  },
  {
    id: "container-metadata-pref-card-bg",
    cssVar: "--mpx-metadata-pref-card-bg",
    fallback: "#f9f6ef",
  },
  {
    id: "container-metadata-pref-card-border",
    cssVar: "--mpx-metadata-pref-card-border",
    fallback: "#d6cfc1",
  },
  {
    id: "container-metadata-pref-card-text",
    cssVar: "--mpx-metadata-pref-card-text",
    fallback: "#2e2a22",
  },
  {
    id: "container-metadata-tag-editor-bg",
    cssVar: "--mpx-metadata-tag-editor-bg",
    fallback: "#ffffff",
  },
  {
    id: "container-metadata-tag-editor-border",
    cssVar: "--mpx-metadata-tag-editor-border",
    fallback: "#b7ab95",
  },
  {
    id: "container-metadata-tag-item-bg",
    cssVar: "--mpx-metadata-tag-item-bg",
    fallback: "#dcecf0",
  },
  {
    id: "container-metadata-tag-item-text",
    cssVar: "--mpx-metadata-tag-item-text",
    fallback: "#2e6f7f",
  },
  {
    id: "container-border-1",
    cssVar: "--mpx-border-1",
    fallback: "#d6cfc1",
  },
  {
    id: "container-border-2",
    cssVar: "--mpx-border-2",
    fallback: "#b7ab95",
  },
  {
    id: "container-sidebar-main-bg",
    cssVar: "--mpx-sidebar-main-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-sidebar-main-label-text",
    cssVar: "--mpx-sidebar-main-label-text",
    fallback: "#30271d",
  },
  {
    id: "container-sidebar-main-label-border",
    cssVar: "--mpx-sidebar-main-label-border",
    fallback: "#bcc1c9",
  },
  {
    id: "container-sidebar-main-label-plain-border",
    cssVar: "--mpx-sidebar-main-label-plain-border",
    fallback: "#d5d0c8",
  },
  {
    id: "container-sidebar-main-label-active-bg",
    cssVar: "--mpx-sidebar-main-label-active-bg",
    fallback: "#2d6e7d",
  },
  {
    id: "container-sidebar-main-label-active-ring",
    cssVar: "--mpx-sidebar-main-active-ring",
    fallback: "#2d6e7d",
  },
  {
    id: "container-sidebar-main-label-active-underlay",
    cssVar: "--mpx-sidebar-main-active-underlay",
    fallback: "#e6e2da",
  },
  {
    id: "container-sidebar-main-label-marker-focus-bg",
    cssVar: "--mpx-sidebar-main-label-marker-focus-bg",
    fallback: "#2d6e7d",
  },
  {
    id: "container-sidebar-main-label-marker-selected-bg",
    cssVar: "--mpx-sidebar-main-label-marker-selected-bg",
    fallback: "#9a885f",
  },
  {
    id: "container-sidebar-main-label-manage-selected-bg",
    cssVar: "--mpx-sidebar-main-label-manage-selected-bg",
    fallback: "#9a885f",
  },
  {
    id: "container-sidebar-main-label-toggle-text",
    cssVar: "--mpx-sidebar-main-label-toggle-text",
    fallback: "#5b4f3f",
  },
  {
    id: "container-sidebar-main-count-text",
    cssVar: "--mpx-sidebar-main-count-text",
    fallback: "#000000",
  },
  {
    id: "container-sidebar-main-count-border",
    cssVar: "--mpx-sidebar-main-count-border",
    fallback: "#bcc4cf",
  },
  {
    id: "container-sidebar-main-count-bg",
    cssVar: "--mpx-sidebar-main-count-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-sidebar-main-count-packages-text",
    cssVar: "--mpx-sidebar-main-count-packages-text",
    fallback: "#2d6e7d",
  },
  {
    id: "container-sidebar-main-count-packages-border",
    cssVar: "--mpx-sidebar-main-count-packages-border",
    fallback: "#d8cba8",
  },
  {
    id: "container-sidebar-main-count-packages-bg",
    cssVar: "--mpx-sidebar-main-count-packages-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-sidebar-main-count-images-text",
    cssVar: "--mpx-sidebar-main-count-images-text",
    fallback: "#4ea87c",
  },
  {
    id: "container-sidebar-main-count-images-border",
    cssVar: "--mpx-sidebar-main-count-images-border",
    fallback: "#4ea87c",
  },
  {
    id: "container-sidebar-main-count-images-bg",
    cssVar: "--mpx-sidebar-main-count-images-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "container-sidebar-main-bullet-pending-bg",
    cssVar: "--mpx-sidebar-main-bullet-pending-bg",
    fallback: "#98836a",
  },
  {
    id: "container-sidebar-main-bullet-running-bg",
    cssVar: "--mpx-sidebar-main-bullet-running-bg",
    fallback: "#4ea87c",
  },
  {
    id: "container-sidebar-main-bullet-running-ring",
    cssVar: "--mpx-sidebar-main-bullet-running-ring",
    fallback: "#93b4bc",
  },
  {
    id: "container-sidebar-main-bullet-active-bg",
    cssVar: "--mpx-sidebar-main-bullet-active-bg",
    fallback: "#2d6e7d",
  },
  {
    id: "container-main-image-name-list-border",
    cssVar: "--mpx-main-image-name-list-border",
    fallback: "#c7d0d8",
  },
  {
    id: "container-main-image-name-list-bg",
    cssVar: "--mpx-main-image-name-list-bg",
    fallback: "#ecf0f3",
  },
  {
    id: "container-main-image-name-list-text",
    cssVar: "--mpx-main-image-name-list-text",
    fallback: "#30271d",
  },
  {
    id: "container-main-image-name-list-row-border",
    cssVar: "--mpx-main-image-name-list-row-border",
    fallback: "#dce1e7",
  },
  {
    id: "container-main-image-name-list-row-bg",
    cssVar: "--mpx-main-image-name-list-row-bg",
    fallback: "#e9ecf0",
  },
  {
    id: "container-main-image-name-list-row-text",
    cssVar: "--mpx-main-image-name-list-row-text",
    fallback: "#30271d",
  },
  {
    id: "container-main-image-name-list-label-text",
    cssVar: "--mpx-main-image-name-list-label-text",
    fallback: "#30271d",
  },
  {
    id: "container-main-image-name-list-head-border",
    cssVar: "--mpx-main-image-name-list-head-border",
    fallback: "#b5bdc8",
  },
  {
    id: "container-main-image-name-list-head-bg",
    cssVar: "--mpx-main-image-name-list-head-bg",
    fallback: "#d6dbe1",
  },
  {
    id: "container-main-image-name-list-head-text",
    cssVar: "--mpx-main-image-name-list-head-text",
    fallback: "#544634",
  },
  {
    id: "container-main-image-name-list-body-bg",
    cssVar: "--mpx-main-image-name-list-body-bg",
    fallback: "#e9ecf0",
  },
  {
    id: "container-main-image-name-list-row-hover-bg",
    cssVar: "--mpx-main-image-name-list-row-hover-bg",
    fallback: "#e9ecf0",
  },
  {
    id: "container-main-image-name-list-row-focused-border-left",
    cssVar: "--mpx-main-image-name-list-row-focused-border-left",
    fallback: "#2d6e7d",
  },
  {
    id: "container-main-image-name-list-row-selected-border-left",
    cssVar: "--mpx-main-image-name-list-row-selected-border-left",
    fallback: "#9a885f",
  },
  {
    id: "container-main-image-name-list-row-selected-bg",
    cssVar: "--mpx-main-image-name-list-row-selected-bg",
    fallback: "#9a885f",
  },
  {
    id: "container-main-image-name-list-row-main-text",
    cssVar: "--mpx-main-image-name-list-row-main-text",
    fallback: "#30271d",
  },
  {
    id: "container-main-image-name-list-row-main-hover-bg",
    cssVar: "--mpx-main-image-name-list-row-main-hover-bg",
    fallback: "#f3f6f8",
  },
  {
    id: "container-main-image-name-list-row-main-pressed-bg",
    cssVar: "--mpx-main-image-name-list-row-main-pressed-bg",
    fallback: "#d7dde4",
  },
  {
    id: "container-main-image-name-list-row-main-hover-text",
    cssVar: "--mpx-main-image-name-list-row-main-hover-text",
    fallback: "#2f5f6d",
  },
  {
    id: "container-main-image-name-list-row-main-selected-text",
    cssVar: "--mpx-main-image-name-list-row-main-selected-text",
    fallback: "#30271d",
  },
  {
    id: "large-panel-border-color",
    cssVar: "--mpx-large-panel-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-fill-start",
    cssVar: "--mpx-large-panel-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-fill-end",
    cssVar: "--mpx-large-panel-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-section-fill-start",
    cssVar: "--mpx-large-panel-section-fill-start",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "large-panel-section-fill-end",
    cssVar: "--mpx-large-panel-section-fill-end",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "large-panel-section-border-color",
    cssVar: "--mpx-large-panel-section-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-head-border-color",
    cssVar: "--mpx-large-panel-head-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-head-fill-start",
    cssVar: "--mpx-large-panel-head-fill-start",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "large-panel-head-fill-end",
    cssVar: "--mpx-large-panel-head-fill-end",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "large-panel-head-text",
    cssVar: "--mpx-large-panel-head-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-side-border-color",
    cssVar: "--mpx-large-panel-side-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-side-fill-start",
    cssVar: "--mpx-large-panel-side-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-side-fill-end",
    cssVar: "--mpx-large-panel-side-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-main-border-color",
    cssVar: "--mpx-large-panel-main-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-main-fill-start",
    cssVar: "--mpx-large-panel-main-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-main-fill-end",
    cssVar: "--mpx-large-panel-main-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-bg",
    cssVar: "--mpx-large-panel-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-head-bg",
    cssVar: "--mpx-large-panel-head-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "large-panel-side-bg",
    cssVar: "--mpx-large-panel-side-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-main-bg",
    cssVar: "--mpx-large-panel-main-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-settings-side-bg",
    cssVar: "--mpx-settings-side-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-settings-side-text",
    cssVar: "--mpx-settings-side-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-settings-side-item-bg",
    cssVar: "--mpx-settings-side-item-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "large-panel-settings-side-item-hover-bg",
    cssVar: "--mpx-settings-side-item-hover-bg",
    fallback: "rgba(46, 111, 127, 0.06)",
  },
  {
    id: "large-panel-settings-side-item-active-bg",
    cssVar: "--mpx-settings-side-item-active-bg",
    fallback: "#e6f1f4",
  },
  {
    id: "large-panel-settings-side-item-active-text",
    cssVar: "--mpx-settings-side-item-active-text",
    fallback: "#2e6f7f",
  },
  {
    id: "large-panel-settings-side-border",
    cssVar: "--mpx-settings-side-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-settings-main-bg",
    cssVar: "--mpx-settings-main-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-settings-main-text",
    cssVar: "--mpx-settings-main-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-settings-main-border",
    cssVar: "--mpx-settings-main-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-settings-group-border",
    cssVar: "--mpx-settings-group-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-settings-group-head-text",
    cssVar: "--mpx-settings-group-head-text",
    fallback: "#1a1814",
  },
  {
    id: "large-panel-settings-group-head-bg",
    cssVar: "--mpx-settings-group-head-bg",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "large-panel-settings-item-label-text",
    cssVar: "--mpx-settings-item-label-text",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-settings-item-value-text",
    cssVar: "--mpx-settings-item-value-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-settings-item-input-bg",
    cssVar: "--mpx-settings-item-input-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-settings-item-input-border",
    cssVar: "--mpx-settings-item-input-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-settings-danger-btn-bg",
    cssVar: "--mpx-settings-danger-btn-bg",
    fallback: "#fdeee8",
  },
  {
    id: "large-panel-settings-danger-btn-border",
    cssVar: "--mpx-settings-danger-btn-border",
    fallback: "#d7a596",
  },
  {
    id: "large-panel-settings-danger-btn-text",
    cssVar: "--mpx-settings-danger-btn-text",
    fallback: "#5f2a1e",
  },
  {
    id: "large-panel-import-task-error-border",
    cssVar: "--mpx-import-task-error-border",
    fallback: "#d7a596",
  },
  {
    id: "large-panel-import-task-error-bg",
    cssVar: "--mpx-import-task-error-bg",
    fallback: "#fdeee8",
  },
  {
    id: "large-panel-import-task-error-text",
    cssVar: "--mpx-import-task-error-text",
    fallback: "#5f2a1e",
  },
  {
    id: "large-panel-import-task-hint-border",
    cssVar: "--mpx-import-task-hint-border",
    fallback: "#c5d6de",
  },
  {
    id: "large-panel-import-task-hint-bg",
    cssVar: "--mpx-import-task-hint-bg",
    fallback: "#edf6f9",
  },
  {
    id: "large-panel-import-task-hint-text",
    cssVar: "--mpx-import-task-hint-text",
    fallback: "#173b47",
  },
  {
    id: "large-panel-import-task-review-notice-border",
    cssVar: "--mpx-import-task-review-notice-border",
    fallback: "#d8c69b",
  },
  {
    id: "large-panel-import-task-review-notice-bg",
    cssVar: "--mpx-import-task-review-notice-bg",
    fallback: "#fff7e7",
  },
  {
    id: "large-panel-import-task-review-notice-text",
    cssVar: "--mpx-import-task-review-notice-text",
    fallback: "#5a3b12",
  },
  {
    id: "large-panel-import-task-hash-log-border",
    cssVar: "--mpx-import-task-hash-log-border",
    fallback: "#c5d6de",
  },
  {
    id: "large-panel-import-task-hash-log-bg",
    cssVar: "--mpx-import-task-hash-log-bg",
    fallback: "#edf6f9",
  },
  {
    id: "large-panel-import-task-hash-log-text",
    cssVar: "--mpx-import-task-hash-log-text",
    fallback: "#173b47",
  },
  {
    id: "large-panel-metadata-fetch-control-border",
    cssVar: "--mpx-metadata-fetch-control-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-metadata-fetch-control-bg",
    cssVar: "--mpx-metadata-fetch-control-bg",
    fallback: "#f5f2ec",
  },
  {
    id: "large-panel-metadata-fetch-control-hover-bg",
    cssVar: "--mpx-metadata-fetch-control-hover-bg",
    fallback: "#f7f3ee",
  },
  {
    id: "large-panel-metadata-fetch-control-focus-bg",
    cssVar: "--mpx-metadata-fetch-control-focus-bg",
    fallback: "#efe9df",
  },
  {
    id: "large-panel-metadata-fetch-control-text",
    cssVar: "--mpx-metadata-fetch-control-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-metadata-fetch-control-placeholder",
    cssVar: "--mpx-metadata-fetch-control-placeholder",
    fallback: "#6f6a61",
  },
  {
    id: "large-panel-metadata-fetch-results-border",
    cssVar: "--mpx-metadata-fetch-results-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-metadata-fetch-results-bg",
    cssVar: "--mpx-metadata-fetch-results-bg",
    fallback: "#fffcf8",
  },
  {
    id: "large-panel-metadata-fetch-results-active-ring",
    cssVar: "--mpx-metadata-fetch-results-active-ring",
    fallback: "#4d8fa0",
  },
  {
    id: "large-panel-metadata-fetch-head-border",
    cssVar: "--mpx-metadata-fetch-head-border",
    fallback: "#d9d3c8",
  },
  {
    id: "large-panel-metadata-fetch-head-bg",
    cssVar: "--mpx-metadata-fetch-head-bg",
    fallback: "#f1ebe3",
  },
  {
    id: "large-panel-metadata-fetch-head-text",
    cssVar: "--mpx-metadata-fetch-head-text",
    fallback: "#6f6a61",
  },
  {
    id: "large-panel-metadata-fetch-body-bg",
    cssVar: "--mpx-metadata-fetch-body-bg",
    fallback: "#f5f2ec",
  },
  {
    id: "large-panel-metadata-fetch-result-meta-text",
    cssVar: "--mpx-metadata-fetch-result-meta-text",
    fallback: "#6f6a61",
  },
  {
    id: "large-panel-metadata-fetch-result-hover-text",
    cssVar: "--mpx-metadata-fetch-result-hover-text",
    fallback: "#2f5f6d",
  },
  {
    id: "large-panel-metadata-fetch-preview-divider",
    cssVar: "--mpx-metadata-fetch-preview-divider",
    fallback: "#ddd7cc",
  },
  {
    id: "large-panel-metadata-fetch-preview-bg",
    cssVar: "--mpx-metadata-fetch-preview-bg",
    fallback: "#f5f2ec",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-border",
    cssVar: "--mpx-metadata-fetch-preview-toggle-border",
    fallback: "#d9d3c8",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-bg",
    cssVar: "--mpx-metadata-fetch-preview-toggle-bg",
    fallback: "#f1ebe3",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-text",
    cssVar: "--mpx-metadata-fetch-preview-toggle-text",
    fallback: "#6f6a61",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-hover-bg",
    cssVar: "--mpx-metadata-fetch-preview-toggle-hover-bg",
    fallback: "#e7dfd2",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-active-bg",
    cssVar: "--mpx-metadata-fetch-preview-toggle-active-bg",
    fallback: "#ddd7cc",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-focus-outline",
    cssVar: "--mpx-metadata-fetch-preview-toggle-focus-outline",
    fallback: "#4d8fa0",
  },
  {
    id: "large-panel-metadata-preference-record-border",
    cssVar: "--mpx-metadata-preference-record-border",
    fallback: "#c7d0d8",
  },
  {
    id: "large-panel-metadata-preference-record-bg",
    cssVar: "--mpx-metadata-preference-record-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-metadata-preference-record-text",
    cssVar: "--mpx-metadata-preference-record-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-metadata-preference-record-summary-text",
    cssVar: "--mpx-metadata-preference-record-summary-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-metadata-preference-record-hint-text",
    cssVar: "--mpx-metadata-preference-record-hint-text",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-metadata-preference-record-field-border",
    cssVar: "--mpx-metadata-preference-record-field-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-metadata-preference-record-field-bg",
    cssVar: "--mpx-metadata-preference-record-field-bg",
    fallback: "#f8f5ef",
  },
  {
    id: "large-panel-metadata-preference-record-field-text",
    cssVar: "--mpx-metadata-preference-record-field-text",
    fallback: "#6b6356",
  },
  {
    id: "large-panel-metadata-booklet-binding-border",
    cssVar: "--mpx-metadata-booklet-binding-border",
    fallback: "#c7d0d8",
  },
  {
    id: "large-panel-metadata-booklet-binding-bg",
    cssVar: "--mpx-metadata-booklet-binding-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-metadata-booklet-binding-text",
    cssVar: "--mpx-metadata-booklet-binding-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-metadata-booklet-binding-meta-text",
    cssVar: "--mpx-metadata-booklet-binding-meta-text",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-metadata-booklet-binding-control-border",
    cssVar: "--mpx-metadata-booklet-binding-control-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-metadata-booklet-binding-control-bg",
    cssVar: "--mpx-metadata-booklet-binding-control-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-metadata-booklet-binding-control-text",
    cssVar: "--mpx-metadata-booklet-binding-control-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-hint-text",
    cssVar: "--mpx-metadata-feature-tag-picker-hint-text",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-group-key-text",
    cssVar: "--mpx-metadata-feature-tag-picker-group-key-text",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-popover-border",
    cssVar: "--mpx-metadata-feature-tag-picker-popover-border",
    fallback: "#d6cfc1",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-popover-bg",
    cssVar: "--mpx-metadata-feature-tag-picker-popover-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-border",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-border",
    fallback: "#b7ab95",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-bg",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-text",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-active-border",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-active-border",
    fallback: "#2e6f7f",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-active-bg",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-active-bg",
    fallback: "#dcecf0",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-active-text",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-active-text",
    fallback: "#2e6f7f",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-border",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-border",
    fallback: "#ddd7cc",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-bg",
    fallback: "#f5f2ec",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-text",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-border",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-border",
    fallback: "#d9d3c8",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-bg",
    fallback: "#f1ebe3",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-text",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-text",
    fallback: "#6f6a61",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-hover-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-hover-bg",
    fallback: "#e7dfd2",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-active-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-active-bg",
    fallback: "#ddd7cc",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-focus-outline",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-focus-outline",
    fallback: "#4d8fa0",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-border",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-border",
    fallback: "#ddd7cc",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-bg",
    fallback: "#f5f2ec",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-text",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-border",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-border",
    fallback: "#d9d3c8",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-bg",
    fallback: "#f1ebe3",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-text",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-text",
    fallback: "#6f6a61",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-hover-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-hover-bg",
    fallback: "#e7dfd2",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-active-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-active-bg",
    fallback: "#ddd7cc",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-focus-outline",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-focus-outline",
    fallback: "#4d8fa0",
  },
  {
    id: "large-panel-transcode-dialog-control-border",
    cssVar: "--mpx-transcode-dialog-control-border",
    fallback: "#c7d0d8",
  },
  {
    id: "large-panel-transcode-dialog-control-bg",
    cssVar: "--mpx-transcode-dialog-control-bg",
    fallback: "#ecf0f3",
  },
  {
    id: "large-panel-transcode-dialog-control-hover-bg",
    cssVar: "--mpx-transcode-dialog-control-hover-bg",
    fallback: "#e3e9ef",
  },
  {
    id: "large-panel-transcode-dialog-control-focus-bg",
    cssVar: "--mpx-transcode-dialog-control-focus-bg",
    fallback: "#dbe3eb",
  },
  {
    id: "large-panel-transcode-dialog-control-text",
    cssVar: "--mpx-transcode-dialog-control-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-transcode-dialog-control-placeholder",
    cssVar: "--mpx-transcode-dialog-control-placeholder",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-transcode-dialog-action-btn-border",
    cssVar: "--mpx-transcode-dialog-action-btn-border",
    fallback: "#b7ab95",
  },
  {
    id: "large-panel-transcode-dialog-action-btn-bg",
    cssVar: "--mpx-transcode-dialog-action-btn-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-transcode-dialog-action-btn-text",
    cssVar: "--mpx-transcode-dialog-action-btn-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-sidebar-rename-dialog-text",
    cssVar: "--mpx-sidebar-rename-dialog-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-sidebar-rename-dialog-muted-text",
    cssVar: "--mpx-sidebar-rename-dialog-muted-text",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-border",
    cssVar: "--mpx-sidebar-rename-dialog-control-border",
    fallback: "#c7d0d8",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-bg",
    fallback: "#ecf0f3",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-hover-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-hover-bg",
    fallback: "#e3e9ef",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-focus-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-focus-bg",
    fallback: "#dbe3eb",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-text",
    cssVar: "--mpx-sidebar-rename-dialog-control-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-placeholder",
    cssVar: "--mpx-sidebar-rename-dialog-control-placeholder",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-sidebar-rename-dialog-action-btn-border",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-border",
    fallback: "#b7ab95",
  },
  {
    id: "large-panel-sidebar-rename-dialog-action-btn-bg",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-sidebar-rename-dialog-action-btn-text",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-sidebar-rename-preview-border",
    cssVar: "--mpx-sidebar-rename-preview-border",
    fallback: "#c7d0d8",
  },
  {
    id: "large-panel-sidebar-rename-preview-bg",
    cssVar: "--mpx-sidebar-rename-preview-bg",
    fallback: "#ffffff",
  },
  {
    id: "large-panel-sidebar-rename-preview-head-border",
    cssVar: "--mpx-sidebar-rename-preview-head-border",
    fallback: "#bcc7d1",
  },
  {
    id: "large-panel-sidebar-rename-preview-head-bg",
    cssVar: "--mpx-sidebar-rename-preview-head-bg",
    fallback: "#d1d5db",
  },
  {
    id: "large-panel-sidebar-rename-preview-head-text",
    cssVar: "--mpx-sidebar-rename-preview-head-text",
    fallback: "#6a6358",
  },
  {
    id: "large-panel-sidebar-rename-preview-list-bg",
    cssVar: "--mpx-sidebar-rename-preview-list-bg",
    fallback: "#ecf0f3",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-border",
    cssVar: "--mpx-sidebar-rename-preview-row-border",
    fallback: "#cfd7df",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-text",
    cssVar: "--mpx-sidebar-rename-preview-row-text",
    fallback: "#2e2a22",
  },
  {
    id: "large-panel-sidebar-rename-preview-arrow-text",
    cssVar: "--mpx-sidebar-rename-preview-arrow-text",
    fallback: "rgba(106, 99, 88, 0.7)",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-source-hover-bg",
    cssVar: "--mpx-sidebar-rename-preview-row-source-hover-bg",
    fallback: "#e3e9ef",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-source-active-bg",
    cssVar: "--mpx-sidebar-rename-preview-row-source-active-bg",
    fallback: "#dbe3eb",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-source-pressed-bg",
    cssVar: "--mpx-sidebar-rename-preview-row-source-pressed-bg",
    fallback: "#dbe3eb",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-changed-accent",
    cssVar: "--mpx-sidebar-rename-preview-row-changed-accent",
    fallback: "#9fb1c3",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-failed-accent",
    cssVar: "--mpx-sidebar-rename-preview-row-failed-accent",
    fallback: "#c7928a",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-failed-text",
    cssVar: "--mpx-sidebar-rename-preview-row-failed-text",
    fallback: "#5f2a1e",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-unchanged-text",
    cssVar: "--mpx-sidebar-rename-preview-row-unchanged-text",
    fallback: "#6a6358",
  },
  {
    id: "small-panel-border-color",
    cssVar: "--mpx-dialog-panel-root-border-color",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-fill-start",
    cssVar: "--mpx-dialog-panel-root-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-fill-end",
    cssVar: "--mpx-dialog-panel-root-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-shortcut-edit-panel-border",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-border",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-shortcut-edit-panel-fill-start",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-shortcut-edit-panel-fill-end",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-shortcut-edit-panel-text",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-text",
    fallback: "#2e2a22",
  },
  {
    id: "small-panel-shortcut-capture-panel-border",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-border",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-shortcut-capture-panel-fill-start",
    cssVar:
      "--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-shortcut-capture-panel-fill-end",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-shortcut-capture-panel-text",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-text",
    fallback: "#2e2a22",
  },
  {
    id: "small-panel-group-name-panel-border",
    cssVar: "--mpx-slot-fg-main-header-manage-group-name-panel-border",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-group-name-panel-fill-start",
    cssVar: "--mpx-slot-fg-main-header-manage-group-name-panel-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-group-name-panel-fill-end",
    cssVar: "--mpx-slot-fg-main-header-manage-group-name-panel-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-delete-confirm-panel-border",
    cssVar: "--mpx-slot-fg-main-header-manage-delete-confirm-panel-border",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-delete-confirm-panel-fill-start",
    cssVar:
      "--mpx-slot-fg-main-header-manage-delete-confirm-panel-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-delete-confirm-panel-fill-end",
    cssVar: "--mpx-slot-fg-main-header-manage-delete-confirm-panel-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-convert-panel-border",
    cssVar: "--mpx-slot-fg-main-header-image-convert-panel-border",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-convert-panel-fill-start",
    cssVar: "--mpx-slot-fg-main-header-image-convert-panel-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-convert-panel-fill-end",
    cssVar: "--mpx-slot-fg-main-header-image-convert-panel-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-ad-review-start-main-border",
    cssVar: "--mpx-slot-fg-main-header-image-ad-review-start-panel-border",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-ad-review-start-main-fill-start",
    cssVar: "--mpx-slot-fg-main-header-image-ad-review-start-panel-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-ad-review-start-main-fill-end",
    cssVar: "--mpx-slot-fg-main-header-image-ad-review-start-panel-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-ad-review-start-main-text",
    cssVar: "--mpx-slot-fg-main-header-image-ad-review-start-panel-text",
    fallback: "#2e2a22",
  },
  {
    id: "small-panel-ad-review-start-metadata-border",
    cssVar: "--mpx-slot-fg-meta-main-ad-review-start-panel-border",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-ad-review-start-metadata-fill-start",
    cssVar: "--mpx-slot-fg-meta-main-ad-review-start-panel-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-ad-review-start-metadata-fill-end",
    cssVar: "--mpx-slot-fg-meta-main-ad-review-start-panel-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-ad-review-start-metadata-text",
    cssVar: "--mpx-slot-fg-meta-main-ad-review-start-panel-text",
    fallback: "#2e2a22",
  },
  {
    id: "small-panel-playlist-name-slot-border",
    cssVar: "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-border",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-playlist-name-slot-fill-start",
    cssVar:
      "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-playlist-name-slot-fill-end",
    cssVar:
      "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-playlist-name-slot-text",
    cssVar: "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-text",
    fallback: "#2e2a22",
  },
  {
    id: "small-panel-playlist-name-slot-input-border",
    cssVar: "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-input-border",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-playlist-name-slot-input-bg",
    cssVar: "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-input-bg",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-playlist-name-slot-input-text",
    cssVar: "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-input-text",
    fallback: "#2e2a22",
  },
  {
    id: "small-panel-playlist-name-slot-input-placeholder",
    cssVar: "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-input-placeholder",
    fallback: "#6a6358",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-text",
    cssVar: "--mpx-metadata-playlist-name-dialog-text",
    fallback: "#2e2a22",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-border",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-border",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-bg",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-bg",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-text",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-text",
    fallback: "#2e2a22",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-placeholder",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-placeholder",
    fallback: "#6a6358",
  },
  {
    id: "small-panel-rename-single-slot-border",
    cssVar: "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-border",
    fallback: "#d6cfc1",
  },
  {
    id: "small-panel-rename-single-slot-fill-start",
    cssVar: "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-fill-start",
    fallback: "#ffffff",
  },
  {
    id: "small-panel-rename-single-slot-fill-end",
    cssVar: "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-fill-end",
    fallback: "#ffffff",
  },
  {
    id: "button-side-idle-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-border",
    fallback: "#cbd5e1",
  },
  {
    id: "button-side-idle-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-bg",
    fallback: "#ecf0f3",
  },
  {
    id: "button-side-idle-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-text",
    fallback: "#4a4a4a",
  },
  {
    id: "button-side-hover-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-border",
    fallback: "#cbd5e1",
  },
  {
    id: "button-side-hover-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-bg",
    fallback: "#f8fafc",
  },
  {
    id: "button-side-hover-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-text",
    fallback: "#4a4a4a",
  },
  {
    id: "button-side-active-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-active-border",
    fallback: "#cbd5e1",
  },
  {
    id: "button-side-active-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-active-bg",
    fallback: "#dce2e8",
  },
  {
    id: "button-side-active-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-active-text",
    fallback: "#334155",
  },
  {
    id: "button-side-selected-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-selected-border",
    fallback: "#d6cfc1",
  },
  {
    id: "button-side-selected-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-selected-bg",
    fallback: "#ffffff",
  },
  {
    id: "button-side-selected-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-selected-text",
    fallback: "#2e2a22",
  },
  {
    id: "button-side-pressed-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pressed-border",
    fallback: "#cbd5e1",
  },
  {
    id: "button-side-pressed-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pressed-bg",
    fallback: "#d6dee5",
  },
  {
    id: "button-side-pressed-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pressed-text",
    fallback: "#555555",
  },
  {
    id: "button-side-disabled-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-disabled-border",
    fallback: "#cbd5e1",
  },
  {
    id: "button-side-disabled-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-disabled-bg",
    fallback: "#ecf0f3",
  },
  {
    id: "button-side-disabled-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-disabled-text",
    fallback: "#9b8465",
  },
  {
    id: "button-side-pending-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pending-border",
    fallback: "#d7ba8a",
  },
  {
    id: "button-side-pending-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pending-bg",
    fallback: "#fbf1e0",
  },
  {
    id: "button-side-pending-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pending-text",
    fallback: "#6a4b1e",
  },
  {
    id: "button-side-danger-hover-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-danger-hover-border",
    fallback: "#fca5a5",
  },
  {
    id: "button-side-danger-hover-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-danger-hover-bg",
    fallback: "#fee2e2",
  },
  {
    id: "button-side-danger-hover-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-danger-hover-text",
    fallback: "#dc2626",
  },
  {
    id: "control-scrollbar-track-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-bg",
    fallback: "#ece5d9",
  },
  {
    id: "control-scrollbar-thumb-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-bg",
    fallback: "#b7ab95",
  },
  {
    id: "control-scrollbar-thumb-hover-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-hover-bg",
    fallback: "#2e6f7f",
  },
  {
    id: "control-scrollbar-thumb-active-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-active-bg",
    fallback: "#2e6f7f",
  },
  {
    id: "control-scrollbar-color-thumb",
    cssVar: "--mpx-sidebar-tree-scrollbar-color-thumb",
    fallback: "#b7ab95",
  },
  {
    id: "control-scrollbar-color-track",
    cssVar: "--mpx-sidebar-tree-scrollbar-color-track",
    fallback: "#ece5d9",
  },
  {
    id: "control-scrollbar-thumb-border-color",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-border-color",
    fallback: "rgba(0, 0, 0, 0)",
  },
  {
    id: "control-slider-base-track-bg",
    cssVar: "--mpx-range-track-bg",
    fallback: "#d6cfc1",
  },
  {
    id: "control-slider-base-thumb-bg",
    cssVar: "--mpx-range-thumb-bg",
    fallback: "#2e6f7f",
  },
  {
    id: "control-slider-base-thumb-border",
    cssVar: "--mpx-range-thumb-border",
    fallback: "#ffffff",
  },
  {
    id: "control-slider-player-fill-gold",
    cssVar: "--mpx-runway-fill-gold",
    fallback: "linear-gradient(90deg, #cba468 0%, #b5853b 100%)",
  },
  {
    id: "control-slider-player-fill-graphite",
    cssVar: "--mpx-runway-fill-graphite",
    fallback: "linear-gradient(90deg, #9ca3af 0%, #4b5563 55%, #374151 100%)",
  },
  {
    id: "control-slider-player-thumb-shell-pearl",
    cssVar: "--mpx-runway-thumb-shell-pearl",
    fallback: "linear-gradient(90deg, #d6bc86 0%, #c79d4a 50%, #d6bc86 100%)",
  },
  {
    id: "control-slider-player-thumb-shell-graphite",
    cssVar: "--mpx-runway-thumb-shell-graphite",
    fallback: "linear-gradient(145deg, #ffffff 0%, #e5e7eb 40%, #9ca3af 100%)",
  },
  {
    id: "control-slider-vertical-accent-fill",
    cssVar: "--mpx-skeuo-accent-fill",
    fallback: "#8a6a3b",
  },
  {
    id: "control-slider-vertical-inset-bg",
    cssVar: "--mpx-skeuo-inset-bg",
    fallback: "#f3e9d8",
  },
  {
    id: "control-slider-settings-groove-bg",
    cssVar: "--mpx-slider-settings-groove-bg",
    fallback: "#e9ecf0",
  },
];

export const SNAPSHOT_TEXT_FIELDS: readonly SnapshotTextField[] = [
  {
    id: "container-bg-app-fill",
    cssVar: "--mpx-bg-app-fill",
  },
  {
    id: "container-frame-shadow",
    cssVar: "--mpx-container-frame-shadow",
  },
  {
    id: "container-header-shadow",
    cssVar: "--mpx-header-shadow",
  },
  {
    id: "container-sidebar-shadow",
    cssVar: "--mpx-sidebar-shadow",
  },
  {
    id: "container-main-shadow",
    cssVar: "--mpx-main-shadow",
  },
  {
    id: "container-metadata-shadow",
    cssVar: "--mpx-metadata-shadow",
  },
  {
    id: "container-sidebar-main-label-bg",
    cssVar: "--mpx-sidebar-main-label-bg",
  },
  {
    id: "container-sidebar-main-label-shadow",
    cssVar: "--mpx-sidebar-main-label-shadow",
  },
  {
    id: "container-sidebar-main-label-hover-filter",
    cssVar: "--mpx-sidebar-main-label-hover-filter",
  },
  {
    id: "container-sidebar-main-label-collapsed-bg",
    cssVar: "--mpx-sidebar-main-label-collapsed-bg",
  },
  {
    id: "container-sidebar-main-label-expanded-bg",
    cssVar: "--mpx-sidebar-main-label-expanded-bg",
  },
  {
    id: "container-sidebar-main-label-plain-bg",
    cssVar: "--mpx-sidebar-main-label-plain-bg",
  },
  {
    id: "container-sidebar-main-label-active-shadow",
    cssVar: "--mpx-sidebar-main-label-active-shadow",
  },
  {
    id: "container-sidebar-main-label-active-hover-shadow",
    cssVar: "--mpx-sidebar-main-label-active-hover-shadow",
  },
  {
    id: "container-sidebar-main-label-manage-selected-shadow",
    cssVar: "--mpx-sidebar-main-label-manage-selected-shadow",
  },
  {
    id: "container-sidebar-main-count-shadow",
    cssVar: "--mpx-sidebar-main-count-shadow",
  },
  {
    id: "container-sidebar-main-count-packages-shadow",
    cssVar: "--mpx-sidebar-main-count-packages-shadow",
  },
  {
    id: "large-panel-shadow",
    cssVar: "--mpx-large-panel-shadow",
  },
  {
    id: "large-panel-metadata-fetch-control-font-size",
    cssVar: "--mpx-metadata-fetch-control-font-size",
  },
  {
    id: "large-panel-metadata-fetch-head-font-size",
    cssVar: "--mpx-metadata-fetch-head-font-size",
  },
  {
    id: "large-panel-metadata-fetch-head-font-family",
    cssVar: "--mpx-metadata-fetch-head-font-family",
  },
  {
    id: "small-panel-shadow",
    cssVar: "--mpx-dialog-panel-shadow",
  },
  {
    id: "small-panel-shortcut-edit-panel-shadow",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-shadow",
  },
  {
    id: "small-panel-shortcut-capture-panel-shadow",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-shadow",
  },
  {
    id: "small-panel-group-name-panel-shadow",
    cssVar: "--mpx-slot-fg-main-header-manage-group-name-panel-shadow",
  },
  {
    id: "small-panel-delete-confirm-panel-shadow",
    cssVar: "--mpx-slot-fg-main-header-manage-delete-confirm-panel-shadow",
  },
  {
    id: "small-panel-convert-panel-shadow",
    cssVar: "--mpx-slot-fg-main-header-image-convert-panel-shadow",
  },
  {
    id: "small-panel-ad-review-start-main-shadow",
    cssVar: "--mpx-slot-fg-main-header-image-ad-review-start-panel-shadow",
  },
  {
    id: "small-panel-ad-review-start-metadata-shadow",
    cssVar: "--mpx-slot-fg-meta-main-ad-review-start-panel-shadow",
  },
  {
    id: "small-panel-playlist-name-slot-shadow",
    cssVar: "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-shadow",
  },
  {
    id: "small-panel-rename-single-slot-shadow",
    cssVar: "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-shadow",
  },
  {
    id: "control-scrollbar-size",
    cssVar: "--mpx-sidebar-tree-scrollbar-size",
  },
  {
    id: "control-scrollbar-track-radius",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-radius",
  },
  {
    id: "control-scrollbar-thumb-radius",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-radius",
  },
  {
    id: "control-scrollbar-track-border",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-border",
  },
  {
    id: "control-scrollbar-track-shadow",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-shadow",
  },
  {
    id: "control-scrollbar-end-gap",
    cssVar: "--mpx-sidebar-tree-scrollbar-end-gap",
  },
  {
    id: "control-scrollbar-thumb-min-height",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-min-height",
  },
  {
    id: "control-scrollbar-thumb-border-width",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-border-width",
  },
  {
    id: "control-scrollbar-thumb-shadow",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-shadow",
  },
  {
    id: "control-scrollbar-thumb-active-shadow",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-active-shadow",
  },
  {
    id: "control-slider-base-track-height",
    cssVar: "--mpx-range-track-height",
  },
  {
    id: "control-slider-base-thumb-size",
    cssVar: "--mpx-range-thumb-size",
  },
  {
    id: "control-slider-base-thumb-border-width",
    cssVar: "--mpx-range-thumb-border-width",
  },
  {
    id: "control-slider-base-thumb-shadow",
    cssVar: "--mpx-range-thumb-shadow",
  },
  {
    id: "control-slider-base-thumb-hover-shadow",
    cssVar: "--mpx-range-thumb-hover-shadow",
  },
  {
    id: "control-slider-base-thumb-active-shadow",
    cssVar: "--mpx-range-thumb-active-shadow",
  },
  {
    id: "control-slider-base-thumb-focus-ring",
    cssVar: "--mpx-range-thumb-focus-ring",
  },
  {
    id: "control-slider-base-thumb-hover-scale",
    cssVar: "--mpx-range-thumb-hover-scale",
  },
  {
    id: "control-slider-base-thumb-active-scale",
    cssVar: "--mpx-range-thumb-active-scale",
  },
  {
    id: "control-slider-player-fill-shadow-gold",
    cssVar: "--mpx-runway-fill-shadow-gold",
  },
  {
    id: "control-slider-player-fill-shadow-graphite",
    cssVar: "--mpx-runway-fill-shadow-graphite",
  },
  {
    id: "control-slider-player-thumb-shell-shadow-pearl",
    cssVar: "--mpx-runway-thumb-shell-shadow-pearl",
  },
  {
    id: "control-slider-player-thumb-shell-shadow-graphite",
    cssVar: "--mpx-runway-thumb-shell-shadow-graphite",
  },
  {
    id: "control-slider-player-thumb-core-pearl",
    cssVar: "--mpx-runway-thumb-core-pearl",
  },
  {
    id: "control-slider-player-thumb-core-graphite",
    cssVar: "--mpx-runway-thumb-core-graphite",
  },
  {
    id: "control-slider-player-thumb-core-shadow-pearl",
    cssVar: "--mpx-runway-thumb-core-shadow-pearl",
  },
  {
    id: "control-slider-player-thumb-core-shadow-graphite",
    cssVar: "--mpx-runway-thumb-core-shadow-graphite",
  },
  {
    id: "control-slider-vertical-shadow-dark",
    cssVar: "--mpx-skeuo-shadow-dark",
  },
  {
    id: "control-slider-vertical-shadow-light",
    cssVar: "--mpx-skeuo-shadow-light",
  },
  {
    id: "control-slider-settings-groove-shadow",
    cssVar: "--mpx-slider-settings-groove-shadow",
  },
];

export const CONTAINER_DEBUG_COLOR_FIELDS = SNAPSHOT_COLOR_FIELDS.filter((field) =>
  field.id.startsWith("container-"),
);

export const CONTAINER_DEBUG_TEXT_FIELDS = SNAPSHOT_TEXT_FIELDS.filter((field) =>
  field.id.startsWith("container-"),
);
