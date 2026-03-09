import type {
  ButtonStateKey,
  ContainerDebugSubsection,
  LargePanelInternalSectionId,
  MainImageNameListDebugLayer,
  MainImageNameListDebugSection,
  SidebarMainDebugSection,
  SmallPanelSectionDefinition,
  SmallPanelSectionGroupDefinition,
  ThemeControlSectionId,
  ThemeDebugColorField,
  ThemeDebugTextField,
} from "./themeParameterPanelTypes";

export const CONTAINER_BACKGROUND_TEXT_FIELDS: readonly ThemeDebugTextField[] =
  [
    {
      id: "container-bg-app-fill",
      cssVar: "--mpx-bg-app-fill",
      fallback: "#f2eee7",
      groupId: "box",
    },
  ];

export const CONTAINER_SHARED_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-frame-fill-start",
    cssVar: "--mpx-container-frame-fill-start",
    fallback: "#f5f2ec",
    groupId: "box",
  },
  {
    id: "container-frame-fill-end",
    cssVar: "--mpx-container-frame-fill-end",
    fallback: "#e6e2da",
    groupId: "box",
  },
  {
    id: "container-frame-edge-color",
    cssVar: "--mpx-container-frame-edge-color",
    fallback: "#cdc7bb",
    groupId: "shadow",
  },
  {
    id: "container-frame-border-color",
    cssVar: "--mpx-container-frame-border-color",
    fallback: "#e5e4e0",
    groupId: "border",
  },
];

export const CONTAINER_SHARED_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "container-frame-shadow",
    cssVar: "--mpx-container-frame-shadow",
    fallback:
      "0 0 0 1px color-mix(in srgb, var(--mpx-container-frame-border-color) 92%, transparent), 0 0 0 2px color-mix(in srgb, var(--mpx-container-frame-edge-color) 72%, transparent), 2px 4px 10px rgba(116, 88, 50, 0.18), inset 1px 1px 2px rgba(255, 255, 255, 0.9), inset -2px -2px 4px rgba(116, 88, 50, 0.15)",
    groupId: "shadow",
  },
];

export const CONTAINER_HEADER_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-header-fill-start",
    cssVar: "--mpx-header-fill-start",
    fallback: "#f5f2ec",
    groupId: "box",
  },
  {
    id: "container-header-fill-end",
    cssVar: "--mpx-header-fill-end",
    fallback: "#e6e2da",
    groupId: "box",
  },
  {
    id: "container-header-border-color",
    cssVar: "--mpx-header-border-color",
    fallback: "#e5e4e0",
    groupId: "border",
  },
];

export const CONTAINER_HEADER_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "container-header-shadow",
    cssVar: "--mpx-header-shadow",
    fallback: "var(--mpx-container-frame-shadow)",
    groupId: "shadow",
  },
];

export const CONTAINER_HEADER_BUTTONS_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-header-buttons-border",
      cssVar: "--mpx-slot-fg-header-button-border",
      fallback: "#b7ab95",
      groupId: "head",
    },
    {
      id: "container-header-buttons-bg",
      cssVar: "--mpx-slot-fg-header-button-bg",
      fallback: "#ffffff",
      groupId: "head",
    },
    {
      id: "container-header-buttons-text",
      cssVar: "--mpx-slot-fg-header-button-text",
      fallback: "#2e2a22",
      groupId: "head",
    },
  ];

export const CONTAINER_HEADER_LOGO_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-header-logo-border",
      cssVar: "--mpx-slot-fg-header-logo-border",
      fallback: "#b7ab95",
      groupId: "head",
    },
    {
      id: "container-header-logo-bg",
      cssVar: "--mpx-slot-fg-header-logo-bg",
      fallback: "#ffffff",
      groupId: "head",
    },
    {
      id: "container-header-logo-text",
      cssVar: "--mpx-slot-fg-header-logo-text",
      fallback: "#2e2a22",
      groupId: "head",
    },
  ];

export const CONTAINER_HEADER_G1_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-header-g1-border",
      cssVar: "--mpx-slot-fg-header-g1-border",
      fallback: "#b7ab95",
      groupId: "head",
    },
    {
      id: "container-header-g1-bg",
      cssVar: "--mpx-slot-fg-header-g1-bg",
      fallback: "#ffffff",
      groupId: "head",
    },
    {
      id: "container-header-g1-text",
      cssVar: "--mpx-slot-fg-header-g1-text",
      fallback: "#2e2a22",
      groupId: "head",
    },
  ];

export const CONTAINER_HEADER_G2_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-header-g2-mode-border",
      cssVar: "--mpx-slot-fg-header-g2-mode-border",
      fallback: "#b7ab95",
      groupId: "head",
    },
    {
      id: "container-header-g2-mode-bg",
      cssVar: "--mpx-slot-fg-header-g2-mode-bg",
      fallback: "#ffffff",
      groupId: "head",
    },
    {
      id: "container-header-g2-mode-text",
      cssVar: "--mpx-slot-fg-header-g2-mode-text",
      fallback: "#2e2a22",
      groupId: "head",
    },
  ];

export const CONTAINER_HEADER_GDEBUG_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-header-g-debug-border",
      cssVar: "--mpx-slot-fg-header-g-debug-border",
      fallback: "#b7ab95",
      groupId: "head",
    },
    {
      id: "container-header-g-debug-bg",
      cssVar: "--mpx-slot-fg-header-g-debug-bg",
      fallback: "#ffffff",
      groupId: "head",
    },
    {
      id: "container-header-g-debug-text",
      cssVar: "--mpx-slot-fg-header-g-debug-text",
      fallback: "#2e2a22",
      groupId: "head",
    },
  ];

export const CONTAINER_HEADER_G3_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-header-g3-border",
      cssVar: "--mpx-slot-fg-header-g3-border",
      fallback: "#b7ab95",
      groupId: "head",
    },
    {
      id: "container-header-g3-bg",
      cssVar: "--mpx-slot-fg-header-g3-bg",
      fallback: "#ffffff",
      groupId: "head",
    },
    {
      id: "container-header-g3-text",
      cssVar: "--mpx-slot-fg-header-g3-text",
      fallback: "#2e2a22",
      groupId: "head",
    },
  ];

export const CONTAINER_SIDEBAR_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-sidebar-fill-start",
    cssVar: "--mpx-sidebar-fill-start",
    fallback: "#f5f2ec",
    groupId: "box",
  },
  {
    id: "container-sidebar-fill-end",
    cssVar: "--mpx-sidebar-fill-end",
    fallback: "#e6e2da",
    groupId: "box",
  },
  {
    id: "container-sidebar-border-color",
    cssVar: "--mpx-sidebar-border-color",
    fallback: "#e5e4e0",
    groupId: "border",
  },
];

export const CONTAINER_SIDEBAR_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "container-sidebar-shadow",
    cssVar: "--mpx-sidebar-shadow",
    fallback: "var(--mpx-container-frame-shadow)",
    groupId: "shadow",
  },
];

export const CONTAINER_SIDEBAR_HEADER_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-sidebar-header-bg",
      cssVar: "--mpx-slot-fg-sidebar-header-bg",
      fallback: "rgba(0, 0, 0, 0)",
      fallbackAlpha: 0,
      groupId: "side",
    },
    {
      id: "container-sidebar-header-border",
      cssVar: "--mpx-slot-fg-sidebar-header-border",
      fallback: "rgba(0, 0, 0, 0)",
      fallbackAlpha: 0,
      groupId: "side",
    },
    {
      id: "container-sidebar-header-text",
      cssVar: "--mpx-slot-fg-sidebar-header-text",
      fallback: "#2e2a22",
      groupId: "side",
    },
    {
      id: "container-sidebar-header-button-border",
      cssVar: "--mpx-slot-fg-sidebar-header-button-border",
      fallback: "#b7ab95",
      groupId: "side",
    },
    {
      id: "container-sidebar-header-button-bg",
      cssVar: "--mpx-slot-fg-sidebar-header-button-bg",
      fallback: "#ffffff",
      groupId: "side",
    },
    {
      id: "container-sidebar-header-button-text",
      cssVar: "--mpx-slot-fg-sidebar-header-button-text",
      fallback: "#2e2a22",
      groupId: "side",
    },
  ];

export const CONTAINER_SIDEBAR_HEADER_BUTTONS_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  CONTAINER_SIDEBAR_HEADER_COLOR_FIELDS.filter((field) =>
    field.id.includes("sidebar-header-button"),
  );

export const CONTAINER_SIDEBAR_HEADER_TITLE_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-sidebar-header-title-border",
      cssVar: "--mpx-slot-fg-sidebar-header-title-border",
      fallback: "#b7ab95",
      groupId: "side",
    },
    {
      id: "container-sidebar-header-title-bg",
      cssVar: "--mpx-slot-fg-sidebar-header-title-bg",
      fallback: "#ffffff",
      groupId: "side",
    },
    {
      id: "container-sidebar-header-title-text",
      cssVar: "--mpx-slot-fg-sidebar-header-title-text",
      fallback: "#2e2a22",
      groupId: "side",
    },
  ];

export const CONTAINER_SIDEBAR_HEADER_ACTIONS_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-sidebar-header-action-border",
      cssVar: "--mpx-slot-fg-sidebar-header-action-border",
      fallback: "#b7ab95",
      groupId: "side",
    },
    {
      id: "container-sidebar-header-action-bg",
      cssVar: "--mpx-slot-fg-sidebar-header-action-bg",
      fallback: "#ffffff",
      groupId: "side",
    },
    {
      id: "container-sidebar-header-action-text",
      cssVar: "--mpx-slot-fg-sidebar-header-action-text",
      fallback: "#2e2a22",
      groupId: "side",
    },
  ];

export const CONTAINER_MAIN_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "container-main-fill-start",
    cssVar: "--mpx-main-fill-start",
    fallback: "#f5f2ec",
    groupId: "box",
  },
  {
    id: "container-main-fill-end",
    cssVar: "--mpx-main-fill-end",
    fallback: "#e6e2da",
    groupId: "box",
  },
  {
    id: "container-main-border-color",
    cssVar: "--mpx-main-border-color",
    fallback: "#e5e4e0",
    groupId: "border",
  },
];

export const CONTAINER_MAIN_WORKSPACE_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-bg-workspace",
      cssVar: "--mpx-bg-workspace",
      fallback: "#f3f0ea",
      groupId: "box",
    },
  ];

export const CONTAINER_MAIN_MEDIA_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-main-music-vis-text",
      cssVar: "--mpx-music-vis-text",
      fallback: "#eef1f4",
      groupId: "main",
    },
    {
      id: "container-main-music-vis-hud-bg",
      cssVar: "--mpx-music-vis-hud-bg",
      fallback: "rgba(6, 8, 17, 0.74)",
      groupId: "main",
    },
    {
      id: "container-main-music-vis-hud-text",
      cssVar: "--mpx-music-vis-hud-text",
      fallback: "#eef1f4",
      groupId: "main",
    },
    {
      id: "container-main-music-vis-hud-border",
      cssVar: "--mpx-music-vis-hud-border",
      fallback: "rgba(129, 145, 163, 0.35)",
      groupId: "main",
    },
    {
      id: "container-main-music-vis-error-bg",
      cssVar: "--mpx-music-vis-error-bg",
      fallback: "#250b14",
      groupId: "main",
    },
    {
      id: "container-main-music-vis-error-border",
      cssVar: "--mpx-music-vis-error-border",
      fallback: "#8f2f45",
      groupId: "main",
    },
    {
      id: "container-main-music-ctrl-focus-color",
      cssVar: "--mpx-music-ctrl-focus-color",
      fallback: "#2e6f7f",
      groupId: "main",
    },
    {
      id: "container-main-music-ctrl-range-fill",
      cssVar: "--mpx-music-ctrl-range-fill",
      fallback: "#71b4d2",
      groupId: "main",
    },
    {
      id: "container-main-music-ctrl-toggle-bg",
      cssVar: "--mpx-music-ctrl-toggle-bg",
      fallback: "rgba(43, 47, 53, 0.86)",
      groupId: "main",
    },
    {
      id: "container-main-video-screen-bg",
      cssVar: "--mpx-video-screen-bg",
      fallback: "linear-gradient(135deg, #2d2f33, #212022)",
      groupId: "main",
    },
    {
      id: "container-main-ad-review-overlay-stage-bg",
      cssVar: "--mpx-ad-review-overlay-stage-bg",
      fallback: "rgba(0, 0, 0, 0.48)",
      groupId: "main",
    },
    {
      id: "container-main-ad-review-overlay-card-bg",
      cssVar: "--mpx-ad-review-overlay-card-bg",
      fallback: "rgba(255, 250, 243, 0.9)",
      groupId: "main",
    },
    {
      id: "container-main-ad-review-overlay-card-border",
      cssVar: "--mpx-ad-review-overlay-card-border",
      fallback: "rgba(170, 147, 120, 0.35)",
      groupId: "main",
    },
    {
      id: "container-main-ad-review-overlay-text-main",
      cssVar: "--mpx-ad-review-overlay-text-main",
      fallback: "#2c1d11",
      groupId: "main",
    },
    {
      id: "container-main-ad-review-overlay-text-sub",
      cssVar: "--mpx-ad-review-overlay-text-sub",
      fallback: "#6f5740",
      groupId: "main",
    },
    {
      id: "container-main-ad-review-overlay-text-hint",
      cssVar: "--mpx-ad-review-overlay-text-hint",
      fallback: "#73573d",
      groupId: "main",
    },
    {
      id: "container-main-ad-review-overlay-track-bg",
      cssVar: "--mpx-ad-review-overlay-track-bg",
      fallback: "rgba(171, 140, 108, 0.24)",
      groupId: "main",
    },
    {
      id: "container-main-ad-review-overlay-track-start",
      cssVar: "--mpx-ad-review-overlay-track-start",
      fallback: "#c9703a",
      groupId: "main",
    },
    {
      id: "container-main-ad-review-overlay-track-mid",
      cssVar: "--mpx-ad-review-overlay-track-mid",
      fallback: "#cc7e44",
      groupId: "main",
    },
    {
      id: "container-main-ad-review-overlay-track-end",
      cssVar: "--mpx-ad-review-overlay-track-end",
      fallback: "#d4965f",
      groupId: "main",
    },
    {
      id: "container-main-rating-heart-color",
      cssVar: "--mpx-rating-heart-color",
      fallback: "#8f1d3e",
      groupId: "main",
    },
    {
      id: "container-main-rating-heart-active-color",
      cssVar: "--mpx-rating-heart-active-color",
      fallback: "#7a1836",
      groupId: "main",
    },
  ];

export const CONTAINER_MAIN_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "container-main-shadow",
    cssVar: "--mpx-main-shadow",
    fallback: "var(--mpx-container-frame-shadow)",
    groupId: "shadow",
  },
];

export const CONTAINER_MAIN_HEADER_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-main-header-fill-start",
      cssVar: "--mpx-main-header-fill-start",
      fallback: "rgba(0, 0, 0, 0)",
      fallbackAlpha: 0,
      groupId: "main",
    },
    {
      id: "container-main-header-fill-end",
      cssVar: "--mpx-main-header-fill-end",
      fallback: "rgba(0, 0, 0, 0)",
      fallbackAlpha: 0,
      groupId: "main",
    },
    {
      id: "container-main-header-border-color",
      cssVar: "--mpx-main-header-border-color",
      fallback: "rgba(0, 0, 0, 0)",
      fallbackAlpha: 0,
      groupId: "main",
    },
  ];

export const CONTAINER_MAIN_HEADER_BUTTONS_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-main-header-button-border",
      cssVar: "--mpx-slot-fg-main-header-button-border",
      fallback: "#b7ab95",
      groupId: "main",
    },
    {
      id: "container-main-header-button-bg",
      cssVar: "--mpx-slot-fg-main-header-button-bg",
      fallback: "#ffffff",
      groupId: "main",
    },
    {
      id: "container-main-header-button-text",
      cssVar: "--mpx-slot-fg-main-header-button-text",
      fallback: "#2e2a22",
      groupId: "main",
    },
  ];

export const CONTAINER_METADATA_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-metadata-fill-start",
      cssVar: "--mpx-metadata-fill-start",
      fallback: "#f5f2ec",
      groupId: "box",
    },
    {
      id: "container-metadata-fill-end",
      cssVar: "--mpx-metadata-fill-end",
      fallback: "#e6e2da",
      groupId: "box",
    },
    {
      id: "container-metadata-border-color",
      cssVar: "--mpx-metadata-border-color",
      fallback: "#e5e4e0",
      groupId: "border",
    },
  ];

export const CONTAINER_METADATA_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "container-metadata-shadow",
    cssVar: "--mpx-metadata-shadow",
    fallback: "var(--mpx-container-frame-shadow)",
    groupId: "shadow",
  },
];

export const CONTAINER_METADATA_HEADER_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-metadata-header-fill-start",
      cssVar: "--mpx-metadata-header-fill-start",
      fallback: "rgba(0, 0, 0, 0)",
      fallbackAlpha: 0,
      groupId: "main",
    },
    {
      id: "container-metadata-header-fill-end",
      cssVar: "--mpx-metadata-header-fill-end",
      fallback: "rgba(0, 0, 0, 0)",
      fallbackAlpha: 0,
      groupId: "main",
    },
    {
      id: "container-metadata-header-border-color",
      cssVar: "--mpx-metadata-header-border-color",
      fallback: "rgba(0, 0, 0, 0)",
      fallbackAlpha: 0,
      groupId: "main",
    },
  ];

export const CONTAINER_METADATA_HEADER_BUTTONS_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-metadata-header-button-border",
      cssVar: "--mpx-slot-fg-meta-header-button-border",
      fallback: "#b7ab95",
      groupId: "main",
    },
    {
      id: "container-metadata-header-button-bg",
      cssVar: "--mpx-slot-fg-meta-header-button-bg",
      fallback: "#ffffff",
      groupId: "main",
    },
    {
      id: "container-metadata-header-button-text",
      cssVar: "--mpx-slot-fg-meta-header-button-text",
      fallback: "#2e2a22",
      groupId: "main",
    },
  ];

export const CONTAINER_METADATA_INTERNAL_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-metadata-body-bg",
      cssVar: "--mpx-metadata-body-bg",
      fallback: "rgba(0, 0, 0, 0)",
      fallbackAlpha: 0,
      groupId: "main",
    },
    {
      id: "container-metadata-body-text",
      cssVar: "--mpx-metadata-body-text",
      fallback: "#2e2a22",
      groupId: "main",
    },
    {
      id: "container-metadata-section-border",
      cssVar: "--mpx-metadata-section-border",
      fallback: "#d6cfc1",
      groupId: "main",
    },
    {
      id: "container-metadata-section-label-text",
      cssVar: "--mpx-metadata-section-label-text",
      fallback: "#6a6358",
      groupId: "main",
    },
    {
      id: "container-metadata-edit-label-text",
      cssVar: "--mpx-metadata-edit-label-text",
      fallback: "#6a6358",
      groupId: "main",
    },
    {
      id: "container-metadata-edit-value-text",
      cssVar: "--mpx-metadata-edit-value-text",
      fallback: "#2e2a22",
      groupId: "main",
    },
    {
      id: "container-metadata-edit-value-bg",
      cssVar: "--mpx-metadata-edit-value-bg",
      fallback: "#ffffff",
      groupId: "main",
    },
    {
      id: "container-metadata-edit-value-border",
      cssVar: "--mpx-metadata-edit-value-border",
      fallback: "#d6cfc1",
      groupId: "main",
    },
    {
      id: "container-metadata-pref-card-bg",
      cssVar: "--mpx-metadata-pref-card-bg",
      fallback: "#f9f6ef",
      groupId: "main",
    },
    {
      id: "container-metadata-pref-card-border",
      cssVar: "--mpx-metadata-pref-card-border",
      fallback: "#d6cfc1",
      groupId: "main",
    },
    {
      id: "container-metadata-pref-card-text",
      cssVar: "--mpx-metadata-pref-card-text",
      fallback: "#2e2a22",
      groupId: "main",
    },
    {
      id: "container-metadata-tag-editor-bg",
      cssVar: "--mpx-metadata-tag-editor-bg",
      fallback: "#ffffff",
      groupId: "main",
    },
    {
      id: "container-metadata-tag-editor-border",
      cssVar: "--mpx-metadata-tag-editor-border",
      fallback: "#b7ab95",
      groupId: "main",
    },
    {
      id: "container-metadata-tag-item-bg",
      cssVar: "--mpx-metadata-tag-item-bg",
      fallback: "#dcecf0",
      groupId: "main",
    },
    {
      id: "container-metadata-tag-item-text",
      cssVar: "--mpx-metadata-tag-item-text",
      fallback: "#2e6f7f",
      groupId: "main",
    },
  ];

export const CONTAINER_FRAME_SECTION_DEFINITIONS = [
  {
    id: "header",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeader",
    colorFields: CONTAINER_HEADER_COLOR_FIELDS,
    textFields: CONTAINER_HEADER_TEXT_FIELDS,
    appearanceParameterIds: [
      "header-fill-angle",
      "header-radius",
      "header-z-index",
    ],
    transformParameterIds: [
      "header-frame-translate-x",
      "header-frame-translate-y",
      "header-frame-rotate-z",
      "header-frame-scale-x",
      "header-frame-scale-y",
      "header-frame-origin-x",
      "header-frame-origin-y",
    ],
  },
  {
    id: "sidebar",
    summaryKey: "ui.themeParameter.containerLayer.sectionSidebar",
    colorFields: CONTAINER_SIDEBAR_COLOR_FIELDS,
    textFields: CONTAINER_SIDEBAR_TEXT_FIELDS,
    appearanceParameterIds: [
      "sidebar-fill-angle",
      "sidebar-radius",
      "sidebar-z-index",
    ],
    transformParameterIds: [
      "sidebar-frame-translate-x",
      "sidebar-frame-translate-y",
      "sidebar-frame-rotate-z",
      "sidebar-frame-scale-x",
      "sidebar-frame-scale-y",
      "sidebar-frame-origin-x",
      "sidebar-frame-origin-y",
    ],
  },
  {
    id: "main",
    summaryKey: "ui.themeParameter.containerLayer.sectionMain",
    colorFields: CONTAINER_MAIN_COLOR_FIELDS,
    textFields: CONTAINER_MAIN_TEXT_FIELDS,
    appearanceParameterIds: ["main-fill-angle", "main-radius", "main-z-index"],
    transformParameterIds: [
      "main-frame-translate-x",
      "main-frame-translate-y",
      "main-frame-rotate-z",
      "main-frame-scale-x",
      "main-frame-scale-y",
      "main-frame-origin-x",
      "main-frame-origin-y",
    ],
  },
  {
    id: "metadata",
    summaryKey: "ui.themeParameter.containerLayer.sectionMetadata",
    colorFields: CONTAINER_METADATA_COLOR_FIELDS,
    textFields: CONTAINER_METADATA_TEXT_FIELDS,
    appearanceParameterIds: [
      "metadata-fill-angle",
      "metadata-radius",
      "metadata-z-index",
    ],
    transformParameterIds: [
      "metadata-frame-translate-x",
      "metadata-frame-translate-y",
      "metadata-frame-rotate-z",
      "metadata-frame-scale-x",
      "metadata-frame-scale-y",
      "metadata-frame-origin-x",
      "metadata-frame-origin-y",
    ],
  },
] as const;

export const CONTAINER_SHARED_SHELL_PARAMETER_IDS = [
  "layout-padding",
  "splitter-width",
  "container-frame-radius",
] as const;

export const CONTAINER_SHARED_SHELL_INLINE_PARAMETER_IDS = [
  "container-frame-fill-angle",
] as const;

export const CONTAINER_SHARED_SHELL_COLOR_FIELD_IDS = [
  "container-frame-fill-start",
  "container-frame-fill-end",
  "container-frame-border-color",
  "container-frame-edge-color",
] as const;

export const CONTAINER_SHARED_SHELL_TEXT_FIELD_IDS = [
  "container-frame-shadow",
] as const;

export const CONTAINER_SHADOW_SYNC_TEXT_FIELD_IDS = [
  "container-header-shadow",
  "container-sidebar-shadow",
  "container-main-shadow",
  "container-metadata-shadow",
] as const;

export const CONTAINER_FILL_SYNC_COLOR_FIELD_IDS = {
  "container-frame-fill-start": [
    "container-header-fill-start",
    "container-sidebar-fill-start",
    "container-main-fill-start",
    "container-metadata-fill-start",
  ],
  "container-frame-fill-end": [
    "container-header-fill-end",
    "container-sidebar-fill-end",
    "container-main-fill-end",
    "container-metadata-fill-end",
  ],
} as const;

export const LARGE_PANEL_ROOT_INLINE_PARAMETER_IDS = [
  "large-panel-fill-angle",
] as const;

export const LARGE_PANEL_ROOT_PARAMETER_IDS = [
  "large-panel-border-width",
  "large-panel-width",
  "large-panel-height",
  "large-panel-radius",
  "large-panel-shell-padding",
  "large-panel-shell-gap",
] as const;

export const LARGE_PANEL_SHARED_INLINE_PARAMETER_IDS = [
  "large-panel-section-fill-angle",
] as const;

export const LARGE_PANEL_SHARED_PARAMETER_IDS = [
  "large-panel-section-border-width",
] as const;

export const LARGE_PANEL_SHARED_COLOR_FIELD_SYNC_IDS = {
  "large-panel-section-fill-start": [
    "large-panel-head-fill-start",
    "large-panel-side-fill-start",
    "large-panel-main-fill-start",
  ],
  "large-panel-section-fill-end": [
    "large-panel-head-fill-end",
    "large-panel-side-fill-end",
    "large-panel-main-fill-end",
  ],
  "large-panel-section-border-color": [
    "large-panel-head-border-color",
    "large-panel-side-border-color",
    "large-panel-main-border-color",
  ],
} as const;

export const SMALL_PANEL_ROOT_INLINE_PARAMETER_IDS = [
  "small-panel-fill-angle",
] as const;

export const SMALL_PANEL_ROOT_PARAMETER_IDS = [
  "small-panel-width",
  "small-panel-max-width",
  "small-panel-height",
  "small-panel-max-height",
  "small-panel-border-width",
  "small-panel-radius",
  "small-panel-padding",
  "small-panel-gap",
] as const;

export const SMALL_PANEL_ROOT_COLOR_FIELD_SYNC_IDS = {
  "small-panel-border-color": [
    "small-panel-shortcut-edit-panel-border",
    "small-panel-shortcut-capture-panel-border",
    "small-panel-group-name-panel-border",
    "small-panel-delete-confirm-panel-border",
    "small-panel-ad-review-start-main-border",
    "small-panel-ad-review-start-metadata-border",
    "small-panel-convert-panel-border",
    "small-panel-playlist-name-slot-border",
    "small-panel-rename-single-slot-border",
  ],
  "small-panel-fill-start": [
    "small-panel-shortcut-edit-panel-fill-start",
    "small-panel-shortcut-capture-panel-fill-start",
    "small-panel-group-name-panel-fill-start",
    "small-panel-delete-confirm-panel-fill-start",
    "small-panel-ad-review-start-main-fill-start",
    "small-panel-ad-review-start-metadata-fill-start",
    "small-panel-convert-panel-fill-start",
    "small-panel-playlist-name-slot-fill-start",
    "small-panel-rename-single-slot-fill-start",
  ],
  "small-panel-fill-end": [
    "small-panel-shortcut-edit-panel-fill-end",
    "small-panel-shortcut-capture-panel-fill-end",
    "small-panel-group-name-panel-fill-end",
    "small-panel-delete-confirm-panel-fill-end",
    "small-panel-ad-review-start-main-fill-end",
    "small-panel-ad-review-start-metadata-fill-end",
    "small-panel-convert-panel-fill-end",
    "small-panel-playlist-name-slot-fill-end",
    "small-panel-rename-single-slot-fill-end",
  ],
} as const;

export const CONTAINER_SIDEBAR_MAIN_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-sidebar-main-bg",
      cssVar: "--mpx-sidebar-main-bg",
      fallback: "#000000",
      fallbackAlpha: 1,
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-text",
      cssVar: "--mpx-sidebar-main-label-text",
      fallback: "#30271d",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-border",
      cssVar: "--mpx-sidebar-main-label-border",
      fallback: "#bcc1c9",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-plain-border",
      cssVar: "--mpx-sidebar-main-label-plain-border",
      fallback: "#d5d0c8",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-active-bg",
      cssVar: "--mpx-sidebar-main-label-active-bg",
      fallback: "#2d6e7d",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-collapsed-active-bg",
      cssVar: "--mpx-sidebar-main-label-collapsed-active-bg",
      fallback: "#f2d796",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-expanded-active-bg",
      cssVar: "--mpx-sidebar-main-label-expanded-active-bg",
      fallback: "#f2d796",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-plain-active-bg",
      cssVar: "--mpx-sidebar-main-label-plain-active-bg",
      fallback: "#000000",
      fallbackAlpha: 0,
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-active-ring",
      cssVar: "--mpx-sidebar-main-active-ring",
      fallback: "#2d6e7d",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-active-underlay",
      cssVar: "--mpx-sidebar-main-active-underlay",
      fallback: "#e6e2da",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-marker-focus-bg",
      cssVar: "--mpx-sidebar-main-label-marker-focus-bg",
      fallback: "#2d6e7d",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-collapsed-marker-focus-bg",
      cssVar: "--mpx-sidebar-main-label-collapsed-marker-focus-bg",
      fallback: "#f2d796",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-expanded-marker-focus-bg",
      cssVar: "--mpx-sidebar-main-label-expanded-marker-focus-bg",
      fallback: "#f2d796",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-plain-marker-focus-bg",
      cssVar: "--mpx-sidebar-main-label-plain-marker-focus-bg",
      fallback: "#f2d796",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-marker-selected-bg",
      cssVar: "--mpx-sidebar-main-label-marker-selected-bg",
      fallback: "#9a885f",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-collapsed-marker-selected-bg",
      cssVar: "--mpx-sidebar-main-label-collapsed-marker-selected-bg",
      fallback: "#8a919a",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-expanded-marker-selected-bg",
      cssVar: "--mpx-sidebar-main-label-expanded-marker-selected-bg",
      fallback: "#8a919a",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-plain-marker-selected-bg",
      cssVar: "--mpx-sidebar-main-label-plain-marker-selected-bg",
      fallback: "#8a919a",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-manage-selected-bg",
      cssVar: "--mpx-sidebar-main-label-manage-selected-bg",
      fallback: "#9a885f",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-collapsed-manage-selected-bg",
      cssVar: "--mpx-sidebar-main-label-collapsed-manage-selected-bg",
      fallback: "#8a919a",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-expanded-manage-selected-bg",
      cssVar: "--mpx-sidebar-main-label-expanded-manage-selected-bg",
      fallback: "#8a919a",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-plain-manage-selected-bg",
      cssVar: "--mpx-sidebar-main-label-plain-manage-selected-bg",
      fallback: "#000000",
      fallbackAlpha: 0,
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-toggle-text",
      cssVar: "--mpx-sidebar-main-label-toggle-text",
      fallback: "#5b4f3f",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-count-text",
      cssVar: "--mpx-sidebar-main-count-text",
      fallback: "#000000",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-count-border",
      cssVar: "--mpx-sidebar-main-count-border",
      fallback: "#bcc4cf",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-count-bg",
      cssVar: "--mpx-sidebar-main-count-bg",
      fallback: "#000000",
      fallbackAlpha: 0,
      groupId: "side",
    },
    {
      id: "container-sidebar-main-count-packages-text",
      cssVar: "--mpx-sidebar-main-count-packages-text",
      fallback: "#2d6e7d",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-count-packages-border",
      cssVar: "--mpx-sidebar-main-count-packages-border",
      fallback: "#d8cba8",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-count-packages-bg",
      cssVar: "--mpx-sidebar-main-count-packages-bg",
      fallback: "#000000",
      fallbackAlpha: 0,
      groupId: "side",
    },
    {
      id: "container-sidebar-main-count-images-text",
      cssVar: "--mpx-sidebar-main-count-images-text",
      fallback: "#4ea87c",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-count-images-border",
      cssVar: "--mpx-sidebar-main-count-images-border",
      fallback: "#4ea87c",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-count-images-bg",
      cssVar: "--mpx-sidebar-main-count-images-bg",
      fallback: "#000000",
      fallbackAlpha: 0,
      groupId: "side",
    },
    {
      id: "container-sidebar-main-bullet-pending-bg",
      cssVar: "--mpx-sidebar-main-bullet-pending-bg",
      fallback: "#98836a",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-bullet-running-bg",
      cssVar: "--mpx-sidebar-main-bullet-running-bg",
      fallback: "#4ea87c",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-bullet-running-ring",
      cssVar: "--mpx-sidebar-main-bullet-running-ring",
      fallback: "#93b4bc",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-bullet-active-bg",
      cssVar: "--mpx-sidebar-main-bullet-active-bg",
      fallback: "#2d6e7d",
      groupId: "side",
    },
  ];

export const CONTAINER_SIDEBAR_MAIN_TEXT_FIELDS: readonly ThemeDebugTextField[] =
  [
    {
      id: "container-sidebar-main-label-bg",
      cssVar: "--mpx-sidebar-main-label-bg",
      fallback: "linear-gradient(135deg, #e4e6ea, #c8ccd3)",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-shadow",
      cssVar: "--mpx-sidebar-main-label-shadow",
      fallback: "0 2px 4px rgba(150, 140, 130, 0.2), inset 0 1px 0 #ffffff",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-hover-filter",
      cssVar: "--mpx-sidebar-main-label-hover-filter",
      fallback: "brightness(0.97)",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-collapsed-bg",
      cssVar: "--mpx-sidebar-main-label-collapsed-bg",
      fallback: "linear-gradient(135deg, #ede6d6, #ddd4bf)",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-expanded-bg",
      cssVar: "--mpx-sidebar-main-label-expanded-bg",
      fallback: "linear-gradient(135deg, #f8f4eb, #ede6d6)",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-plain-bg",
      cssVar: "--mpx-sidebar-main-label-plain-bg",
      fallback: "linear-gradient(135deg, #f3f0ea, #e9e5de)",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-active-shadow",
      cssVar: "--mpx-sidebar-main-label-active-shadow",
      fallback:
        "var(--mpx-sidebar-control-active-shadow, var(--mpx-control-active-shadow))",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-active-hover-shadow",
      cssVar: "--mpx-sidebar-main-label-active-hover-shadow",
      fallback:
        "var(--mpx-sidebar-control-active-shadow, var(--mpx-control-active-shadow))",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-label-manage-selected-shadow",
      cssVar: "--mpx-sidebar-main-label-manage-selected-shadow",
      fallback:
        "var(--mpx-sidebar-control-active-shadow, var(--mpx-control-active-shadow))",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-count-shadow",
      cssVar: "--mpx-sidebar-main-count-shadow",
      fallback: "var(--mpx-runway-groove-shadow)",
      groupId: "side",
    },
    {
      id: "container-sidebar-main-count-packages-shadow",
      cssVar: "--mpx-sidebar-main-count-packages-shadow",
      fallback:
        "inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 1px 1px rgba(0, 0, 0, 0.15), 0 1px 0 rgba(255, 255, 255, 1)",
      groupId: "side",
    },
  ];

const SIDEBAR_MAIN_ROOT_DEBUG_SECTIONS: readonly SidebarMainDebugSection[] = [
  {
    id: "sidebar-main-root-bg",
    title: "3、背景颜色",
    tag: "bg",
    cssVars: ["--mpx-sidebar-main-bg"],
  },
];

const SIDEBAR_MAIN_LABEL_DEBUG_SECTIONS: readonly SidebarMainDebugSection[] = [
  {
    id: "sidebar-main-label-text",
    title: "1、文字颜色",
    tag: "text",
    cssVars: [
      "--mpx-sidebar-main-label-text",
      "--mpx-sidebar-main-label-toggle-text",
    ],
  },
  {
    id: "sidebar-main-label-border",
    title: "2、边框颜色",
    tag: "border",
    cssVars: [
      "--mpx-sidebar-main-label-border",
      "--mpx-sidebar-main-label-plain-border",
    ],
  },
  {
    id: "sidebar-main-label-bg",
    title: "3、背景颜色",
    tag: "bg",
    cssVars: [
      "--mpx-sidebar-main-label-bg",
      "--mpx-sidebar-main-label-collapsed-bg",
      "--mpx-sidebar-main-label-expanded-bg",
      "--mpx-sidebar-main-label-plain-bg",
    ],
  },
  {
    id: "sidebar-main-label-state",
    title: "4、静态指示颜色",
    tag: "state",
    cssVars: [
      "--mpx-sidebar-main-label-active-bg",
      "--mpx-sidebar-main-active-underlay",
      "--mpx-sidebar-main-active-ring",
      "--mpx-sidebar-main-label-marker-focus-bg",
      "--mpx-sidebar-main-label-marker-selected-bg",
      "--mpx-sidebar-main-label-manage-selected-bg",
      "--mpx-sidebar-main-label-collapsed-active-bg",
      "--mpx-sidebar-main-label-expanded-active-bg",
      "--mpx-sidebar-main-label-plain-active-bg",
      "--mpx-sidebar-main-label-collapsed-marker-focus-bg",
      "--mpx-sidebar-main-label-expanded-marker-focus-bg",
      "--mpx-sidebar-main-label-plain-marker-focus-bg",
      "--mpx-sidebar-main-label-collapsed-marker-selected-bg",
      "--mpx-sidebar-main-label-expanded-marker-selected-bg",
      "--mpx-sidebar-main-label-plain-marker-selected-bg",
      "--mpx-sidebar-main-label-collapsed-manage-selected-bg",
      "--mpx-sidebar-main-label-expanded-manage-selected-bg",
      "--mpx-sidebar-main-label-plain-manage-selected-bg",
    ],
  },
  {
    id: "sidebar-main-label-interactive",
    title: "5、动态指示颜色",
    tag: "interactive",
    cssVars: [
      "--mpx-sidebar-main-label-hover-filter",
      "--mpx-sidebar-main-label-shadow",
      "--mpx-sidebar-main-label-active-shadow",
      "--mpx-sidebar-main-label-active-hover-shadow",
      "--mpx-sidebar-main-label-manage-selected-shadow",
    ],
  },
];

const SIDEBAR_MAIN_COUNT_DEBUG_SECTIONS: readonly SidebarMainDebugSection[] = [
  {
    id: "sidebar-main-count-text",
    title: "1、文字颜色",
    tag: "text",
    cssVars: [
      "--mpx-sidebar-main-count-text",
      "--mpx-sidebar-main-count-packages-text",
      "--mpx-sidebar-main-count-images-text",
    ],
  },
  {
    id: "sidebar-main-count-border",
    title: "2、边框颜色",
    tag: "border",
    cssVars: [
      "--mpx-sidebar-main-count-border",
      "--mpx-sidebar-main-count-packages-border",
      "--mpx-sidebar-main-count-images-border",
    ],
  },
  {
    id: "sidebar-main-count-bg",
    title: "3、背景颜色",
    tag: "bg",
    cssVars: [
      "--mpx-sidebar-main-count-bg",
      "--mpx-sidebar-main-count-packages-bg",
      "--mpx-sidebar-main-count-images-bg",
    ],
  },
  {
    id: "sidebar-main-count-interactive",
    title: "5、动态指示颜色",
    tag: "interactive",
    cssVars: [
      "--mpx-sidebar-main-count-shadow",
      "--mpx-sidebar-main-count-packages-shadow",
    ],
  },
];

const SIDEBAR_MAIN_BULLET_DEBUG_SECTIONS: readonly SidebarMainDebugSection[] = [
  {
    id: "sidebar-main-bullet-state",
    title: "4、静态指示颜色",
    tag: "state",
    cssVars: [
      "--mpx-sidebar-main-bullet-pending-bg",
      "--mpx-sidebar-main-bullet-running-bg",
      "--mpx-sidebar-main-bullet-active-bg",
    ],
  },
  {
    id: "sidebar-main-bullet-interactive",
    title: "5、动态指示颜色",
    tag: "interactive",
    cssVars: ["--mpx-sidebar-main-bullet-running-ring"],
  },
];

export const SIDEBAR_MAIN_DEBUG_LAYERS = [
  {
    id: "sidebar-main-root",
    title: "1、root",
    sections: SIDEBAR_MAIN_ROOT_DEBUG_SECTIONS,
  },
  {
    id: "sidebar-main-label",
    title: "2、label",
    sections: SIDEBAR_MAIN_LABEL_DEBUG_SECTIONS,
  },
  {
    id: "sidebar-main-count",
    title: "3、count",
    sections: SIDEBAR_MAIN_COUNT_DEBUG_SECTIONS,
  },
  {
    id: "sidebar-main-bullet",
    title: "4、bullet",
    sections: SIDEBAR_MAIN_BULLET_DEBUG_SECTIONS,
  },
] as const;

export const CONTAINER_MAIN_IMAGE_NAME_LIST_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "container-main-image-name-list-border",
      cssVar: "--mpx-main-image-name-list-border",
      fallback: "#c7d0d8",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-bg",
      cssVar: "--mpx-main-image-name-list-bg",
      fallback: "#ecf0f3",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-text",
      cssVar: "--mpx-main-image-name-list-text",
      fallback: "#30271d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-border",
      cssVar: "--mpx-main-image-name-list-row-border",
      fallback: "#dce1e7",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-bg",
      cssVar: "--mpx-main-image-name-list-row-bg",
      fallback: "#e9ecf0",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-text",
      cssVar: "--mpx-main-image-name-list-row-text",
      fallback: "#30271d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-label-text",
      cssVar: "--mpx-main-image-name-list-label-text",
      fallback: "#30271d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-head-border",
      cssVar: "--mpx-main-image-name-list-head-border",
      fallback: "#b5bdc8",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-head-bg",
      cssVar: "--mpx-main-image-name-list-head-bg",
      fallback: "#d6dbe1",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-head-text",
      cssVar: "--mpx-main-image-name-list-head-text",
      fallback: "#544634",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-body-bg",
      cssVar: "--mpx-main-image-name-list-body-bg",
      fallback: "#e9ecf0",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-hover-bg",
      cssVar: "--mpx-main-image-name-list-row-hover-bg",
      fallback: "#e9ecf0",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-focused-border-left",
      cssVar: "--mpx-main-image-name-list-row-focused-border-left",
      fallback: "#2d6e7d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-selected-border-left",
      cssVar: "--mpx-main-image-name-list-row-selected-border-left",
      fallback: "#9a885f",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-selected-bg",
      cssVar: "--mpx-main-image-name-list-row-selected-bg",
      fallback: "#9a885f",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-text",
      cssVar: "--mpx-main-image-name-list-row-main-text",
      fallback: "#30271d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-hover-bg",
      cssVar: "--mpx-main-image-name-list-row-main-hover-bg",
      fallback: "#f3f6f8",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-pressed-bg",
      cssVar: "--mpx-main-image-name-list-row-main-pressed-bg",
      fallback: "#d7dde4",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-hover-text",
      cssVar: "--mpx-main-image-name-list-row-main-hover-text",
      fallback: "#2f5f6d",
      groupId: "main",
    },
    {
      id: "container-main-image-name-list-row-main-selected-text",
      cssVar: "--mpx-main-image-name-list-row-main-selected-text",
      fallback: "#30271d",
      groupId: "main",
    },
  ];

export const CONTAINER_MAIN_IMAGE_NAME_LIST_TEXT_FIELDS: readonly ThemeDebugTextField[] =
  [];

const MAIN_IMAGE_NAME_LIST_ROOT_DEBUG_SECTIONS: readonly MainImageNameListDebugSection[] =
  [
    {
      id: "main-image-name-list-root-text",
      title: "1、文字颜色",
      tag: "text",
      cssVars: ["--mpx-main-image-name-list-text"],
    },
    {
      id: "main-image-name-list-root-border",
      title: "2、边框颜色",
      tag: "border",
      cssVars: ["--mpx-main-image-name-list-border"],
    },
    {
      id: "main-image-name-list-root-bg",
      title: "3、背景颜色",
      tag: "bg",
      cssVars: ["--mpx-main-image-name-list-bg"],
    },
  ];

const MAIN_IMAGE_NAME_LIST_HEADER_DEBUG_SECTIONS: readonly MainImageNameListDebugSection[] =
  [
    {
      id: "main-image-name-list-header-text",
      title: "1、文字颜色",
      tag: "text",
      cssVars: ["--mpx-main-image-name-list-head-text"],
    },
    {
      id: "main-image-name-list-header-border",
      title: "2、边框颜色",
      tag: "border",
      cssVars: ["--mpx-main-image-name-list-head-border"],
    },
    {
      id: "main-image-name-list-header-bg",
      title: "3、背景颜色",
      tag: "bg",
      cssVars: ["--mpx-main-image-name-list-head-bg"],
    },
  ];

const MAIN_IMAGE_NAME_LIST_LIST_DEBUG_SECTIONS: readonly MainImageNameListDebugSection[] =
  [
    {
      id: "main-image-name-list-list-text",
      title: "1、文字颜色",
      tag: "text",
      cssVars: [
        "--mpx-main-image-name-list-label-text",
        "--mpx-main-image-name-list-row-text",
        "--mpx-main-image-name-list-row-main-text",
        "--mpx-main-image-name-list-row-main-selected-text",
        "--mpx-main-image-name-list-row-main-hover-text",
      ],
    },
    {
      id: "main-image-name-list-list-border",
      title: "2、边框颜色",
      tag: "border",
      cssVars: ["--mpx-main-image-name-list-row-border"],
    },
    {
      id: "main-image-name-list-list-bg",
      title: "3、背景颜色",
      tag: "bg",
      cssVars: [
        "--mpx-main-image-name-list-body-bg",
        "--mpx-main-image-name-list-row-bg",
        "--mpx-main-image-name-list-row-selected-bg",
      ],
    },
    {
      id: "main-image-name-list-list-state",
      title: "4、静态指示颜色",
      tag: "state",
      cssVars: [
        "--mpx-main-image-name-list-row-selected-border-left",
        "--mpx-main-image-name-list-row-focused-border-left",
      ],
    },
    {
      id: "main-image-name-list-list-interactive",
      title: "5、动态指示颜色",
      tag: "interactive",
      cssVars: [
        "--mpx-main-image-name-list-row-hover-bg",
        "--mpx-main-image-name-list-row-main-hover-bg",
        "--mpx-main-image-name-list-row-main-pressed-bg",
      ],
    },
  ];

export const MAIN_IMAGE_NAME_LIST_DEBUG_LAYERS: readonly MainImageNameListDebugLayer[] =
  [
    {
      id: "main-image-name-list-root",
      title: "1、root",
      sections: MAIN_IMAGE_NAME_LIST_ROOT_DEBUG_SECTIONS,
    },
    {
      id: "main-image-name-list-header",
      title: "2、header",
      sections: MAIN_IMAGE_NAME_LIST_HEADER_DEBUG_SECTIONS,
    },
    {
      id: "main-image-name-list-list",
      title: "3、list",
      sections: MAIN_IMAGE_NAME_LIST_LIST_DEBUG_SECTIONS,
    },
  ];

export const HEADER_DEBUG_SUBSECTIONS: readonly ContainerDebugSubsection[] = [
  {
    id: "header-buttons",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeaderButtons",
    colorFields: CONTAINER_HEADER_BUTTONS_COLOR_FIELDS,
  },
  {
    id: "header-logo",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeaderLogo",
    colorFields: CONTAINER_HEADER_LOGO_COLOR_FIELDS,
  },
  {
    id: "header-g1",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeaderG1",
    colorFields: CONTAINER_HEADER_G1_COLOR_FIELDS,
  },
  {
    id: "header-g2",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeaderG2",
    colorFields: CONTAINER_HEADER_G2_COLOR_FIELDS,
  },
  {
    id: "header-g-debug",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeaderGDebug",
    colorFields: CONTAINER_HEADER_GDEBUG_COLOR_FIELDS,
  },
  {
    id: "header-g3",
    summaryKey: "ui.themeParameter.containerLayer.sectionHeaderG3",
    colorFields: CONTAINER_HEADER_G3_COLOR_FIELDS,
  },
];

export const SIDEBAR_HEADER_DEBUG_SUBSECTIONS: readonly ContainerDebugSubsection[] =
  [
    {
      id: "sidebar-header-root",
      summaryKey: "ui.themeParameter.containerLayer.sectionSidebarHeader",
      colorFields: CONTAINER_SIDEBAR_HEADER_COLOR_FIELDS,
    },
    {
      id: "sidebar-header-title",
      summaryKey: "ui.themeParameter.containerLayer.sectionSidebarHeaderTitle",
      colorFields: CONTAINER_SIDEBAR_HEADER_TITLE_COLOR_FIELDS,
    },
    {
      id: "sidebar-header-actions",
      summaryKey:
        "ui.themeParameter.containerLayer.sectionSidebarHeaderActions",
      colorFields: CONTAINER_SIDEBAR_HEADER_ACTIONS_COLOR_FIELDS,
    },
  ];

export const MAIN_HEADER_DEBUG_SUBSECTIONS: readonly ContainerDebugSubsection[] =
  [
    {
      id: "main-header-root",
      summaryKey: "ui.themeParameter.containerLayer.sectionMainHeader",
      colorFields: CONTAINER_MAIN_HEADER_COLOR_FIELDS,
      parameterIds: ["main-header-fill-angle"],
    },
    {
      id: "main-header-buttons",
      summaryKey: "ui.themeParameter.containerLayer.sectionMainHeaderButtons",
      colorFields: CONTAINER_MAIN_HEADER_BUTTONS_COLOR_FIELDS,
    },
  ];

export const METADATA_HEADER_DEBUG_SUBSECTIONS: readonly ContainerDebugSubsection[] =
  [
    {
      id: "metadata-header-root",
      summaryKey: "ui.themeParameter.containerLayer.sectionMetadataHeader",
      colorFields: CONTAINER_METADATA_HEADER_COLOR_FIELDS,
      parameterIds: ["metadata-header-fill-angle"],
    },
    {
      id: "metadata-header-buttons",
      summaryKey:
        "ui.themeParameter.containerLayer.sectionMetadataHeaderButtons",
      colorFields: CONTAINER_METADATA_HEADER_BUTTONS_COLOR_FIELDS,
    },
  ];

export const CONTAINER_LAYER_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  ...CONTAINER_SHARED_COLOR_FIELDS,
  ...CONTAINER_HEADER_COLOR_FIELDS,
  ...CONTAINER_HEADER_BUTTONS_COLOR_FIELDS,
  ...CONTAINER_HEADER_LOGO_COLOR_FIELDS,
  ...CONTAINER_HEADER_G1_COLOR_FIELDS,
  ...CONTAINER_HEADER_G2_COLOR_FIELDS,
  ...CONTAINER_HEADER_GDEBUG_COLOR_FIELDS,
  ...CONTAINER_HEADER_G3_COLOR_FIELDS,
  ...CONTAINER_SIDEBAR_COLOR_FIELDS,
  ...CONTAINER_SIDEBAR_HEADER_COLOR_FIELDS,
  ...CONTAINER_SIDEBAR_HEADER_TITLE_COLOR_FIELDS,
  ...CONTAINER_SIDEBAR_HEADER_ACTIONS_COLOR_FIELDS,
  ...CONTAINER_MAIN_COLOR_FIELDS,
  ...CONTAINER_MAIN_HEADER_COLOR_FIELDS,
  ...CONTAINER_MAIN_HEADER_BUTTONS_COLOR_FIELDS,
  ...CONTAINER_MAIN_WORKSPACE_COLOR_FIELDS,
  ...CONTAINER_MAIN_MEDIA_COLOR_FIELDS,
  ...CONTAINER_METADATA_COLOR_FIELDS,
  ...CONTAINER_METADATA_HEADER_COLOR_FIELDS,
  ...CONTAINER_METADATA_HEADER_BUTTONS_COLOR_FIELDS,
  ...CONTAINER_METADATA_INTERNAL_COLOR_FIELDS,
  ...CONTAINER_SIDEBAR_MAIN_COLOR_FIELDS,
  ...CONTAINER_MAIN_IMAGE_NAME_LIST_COLOR_FIELDS,
];

export const CONTAINER_LAYER_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  ...CONTAINER_BACKGROUND_TEXT_FIELDS,
  ...CONTAINER_SHARED_TEXT_FIELDS,
  ...CONTAINER_HEADER_TEXT_FIELDS,
  ...CONTAINER_SIDEBAR_TEXT_FIELDS,
  ...CONTAINER_MAIN_TEXT_FIELDS,
  ...CONTAINER_METADATA_TEXT_FIELDS,
  ...CONTAINER_SIDEBAR_MAIN_TEXT_FIELDS,
  ...CONTAINER_MAIN_IMAGE_NAME_LIST_TEXT_FIELDS,
];

export const CONTAINER_SEMANTIC_PREFIX_TO_LEGACY_SLOT: ReadonlyArray<{
  semanticPrefix: string;
  slotPrefix: string;
}> = [
  {
    semanticPrefix: "--mpx-sidebar-main-",
    slotPrefix: "--mpx-slot-fg-sidebar-main-",
  },
  {
    semanticPrefix: "--mpx-main-image-name-list-",
    slotPrefix: "--mpx-slot-fg-main-content-image-name-list-",
  },
];

export function resolveLegacySlotVarForSemanticVar(
  cssVar: string,
): string | null {
  for (const mapping of CONTAINER_SEMANTIC_PREFIX_TO_LEGACY_SLOT) {
    if (!cssVar.startsWith(mapping.semanticPrefix)) {
      continue;
    }
    return `${mapping.slotPrefix}${cssVar.slice(mapping.semanticPrefix.length)}`;
  }
  return null;
}

export function clearLegacySlotOverrideForSemanticVar(
  root: HTMLElement,
  cssVar: string,
): void {
  const legacySlotVar = resolveLegacySlotVarForSemanticVar(cssVar);
  if (!legacySlotVar) {
    return;
  }
  root.style.removeProperty(legacySlotVar);
}

export function resolveDebugVarUsage(cssVar: string): string {
  if (cssVar === "--mpx-bg-app-fill") {
    return "用于应用背景 fill（App background fill，支持渐变等高级效果）";
  }
  if (cssVar === "--mpx-bg-workspace") {
    return "用于主区图片网格背景（image grid background）";
  }
  if (cssVar === "--mpx-container-frame-fill-start") {
    return "用于共享壳层 fill 起始色";
  }
  if (cssVar === "--mpx-container-frame-fill-end") {
    return "用于共享壳层 fill 结束色";
  }
  if (cssVar === "--mpx-container-frame-fill-angle") {
    return "用于共享壳层渐变角度";
  }
  if (cssVar === "--mpx-container-frame-edge-color") {
    return "用于共享壳层阴影边缘混色";
  }
  if (cssVar === "--mpx-container-frame-border-color") {
    return "用于四大容器共享边框色";
  }
  if (cssVar === "--mpx-container-frame-shadow") {
    return "用于四大容器共享壳层阴影";
  }
  if (cssVar === "--mpx-container-frame-radius") {
    return "用于共享壳层圆角";
  }
  if (cssVar === "--mpx-layout-padding") {
    return "用于布局内边距";
  }
  if (cssVar === "--mpx-splitter-width") {
    return "用于分割条宽度";
  }
  if (cssVar === "--mpx-header-bg") {
    return "用于 Header frame 填充";
  }
  if (cssVar === "--mpx-header-border-color") {
    return "用于 Header frame 边框色";
  }
  if (cssVar === "--mpx-header-shadow") {
    return "用于 Header frame 阴影";
  }
  if (cssVar === "--mpx-header-fill-start") {
    return "用于 Header frame fill 起始色";
  }
  if (cssVar === "--mpx-header-fill-end") {
    return "用于 Header frame fill 结束色";
  }
  if (cssVar === "--mpx-header-fill-angle") {
    return "用于 Header frame 渐变角度";
  }
  if (cssVar === "--mpx-header-z-index") {
    return "用于 Header 层级";
  }
  if (cssVar === "--mpx-slot-fg-header-button-border") {
    return "用于 Header 按钮总控边框（fg-header 全局按钮 fallback）";
  }
  if (cssVar === "--mpx-slot-fg-header-button-bg") {
    return "用于 Header 按钮总控背景（fg-header 全局按钮 fallback）";
  }
  if (cssVar === "--mpx-slot-fg-header-button-text") {
    return "用于 Header 按钮总控文字（fg-header 全局按钮 fallback）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-header-logo-")) {
    return "用于 Header logo 按钮链路（fg-header-logo）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-header-g1-")) {
    return "用于 Header g1 分组链路（fg-header-g1）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-header-g2-mode-")) {
    return "用于 Header g2 模式切换链路（fg-header-g2）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-header-g-debug-")) {
    return "用于 Header gDebug 分组链路（fg-header-g-debug）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-header-g3-")) {
    return "用于 Header g3 分组链路（fg-header-g3）";
  }
  if (cssVar === "--mpx-sidebar-bg") {
    return "用于 Sidebar frame 填充";
  }
  if (cssVar === "--mpx-sidebar-border-color") {
    return "用于 Sidebar frame 边框色";
  }
  if (cssVar === "--mpx-sidebar-shadow") {
    return "用于 Sidebar frame 阴影";
  }
  if (cssVar === "--mpx-sidebar-fill-start") {
    return "用于 Sidebar frame fill 起始色";
  }
  if (cssVar === "--mpx-sidebar-fill-end") {
    return "用于 Sidebar frame fill 结束色";
  }
  if (cssVar === "--mpx-sidebar-fill-angle") {
    return "用于 Sidebar frame 渐变角度";
  }
  if (cssVar === "--mpx-sidebar-z-index") {
    return "用于 Sidebar 层级";
  }
  if (cssVar === "--mpx-slot-fg-sidebar-header-bg") {
    return "用于 Sidebar header 根背景（.sidebar-header）";
  }
  if (cssVar === "--mpx-slot-fg-sidebar-header-border") {
    return "用于 Sidebar header 根分隔线（.sidebar-header border-bottom）";
  }
  if (cssVar === "--mpx-slot-fg-sidebar-header-text") {
    return "用于 Sidebar header 根文字 fallback（title / action text fallback）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-sidebar-header-button-")) {
    return "用于 Sidebar header 按钮总控（fg-sidebar-header 按钮 fallback）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-sidebar-header-title-")) {
    return "用于 Sidebar header title 按钮（fg-sidebar-header-title）";
  }
  if (cssVar.startsWith("--mpx-slot-fg-sidebar-header-action-")) {
    return "用于 Sidebar header 其余按钮总控（fg-sidebar-header action）";
  }
  if (cssVar === "--mpx-main-bg") {
    return "用于 Main frame 填充";
  }
  if (cssVar === "--mpx-main-border-color") {
    return "用于 Main frame 边框色";
  }
  if (cssVar === "--mpx-main-shadow") {
    return "用于 Main frame 阴影";
  }
  if (cssVar === "--mpx-main-fill-start") {
    return "用于 Main frame fill 起始色";
  }
  if (cssVar === "--mpx-main-fill-end") {
    return "用于 Main frame fill 结束色";
  }
  if (cssVar === "--mpx-main-fill-angle") {
    return "用于 Main frame 渐变角度";
  }
  if (cssVar === "--mpx-main-z-index") {
    return "用于 Main 层级";
  }
  if (cssVar === "--mpx-main-header-fill-start") {
    return "用于 Main header 根背景起始色";
  }
  if (cssVar === "--mpx-main-header-fill-end") {
    return "用于 Main header 根背景结束色";
  }
  if (cssVar === "--mpx-main-header-border-color") {
    return "用于 Main header 根分隔线颜色";
  }
  if (cssVar.startsWith("--mpx-slot-fg-main-header-button-")) {
    return "用于 Main header 按钮总控（fg-main-header button fallback）";
  }
  if (cssVar === "--mpx-metadata-bg") {
    return "用于 Metadata frame 填充";
  }
  if (cssVar === "--mpx-metadata-border-color") {
    return "用于 Metadata frame 边框色";
  }
  if (cssVar === "--mpx-metadata-shadow") {
    return "用于 Metadata frame 阴影";
  }
  if (cssVar === "--mpx-metadata-fill-start") {
    return "用于 Metadata frame fill 起始色";
  }
  if (cssVar === "--mpx-metadata-fill-end") {
    return "用于 Metadata frame fill 结束色";
  }
  if (cssVar === "--mpx-metadata-fill-angle") {
    return "用于 Metadata frame 渐变角度";
  }
  if (cssVar === "--mpx-metadata-z-index") {
    return "用于 Metadata 层级";
  }
  if (cssVar === "--mpx-metadata-header-fill-start") {
    return "用于 Metadata header 根背景起始色";
  }
  if (cssVar === "--mpx-metadata-header-fill-end") {
    return "用于 Metadata header 根背景结束色";
  }
  if (cssVar === "--mpx-metadata-header-border-color") {
    return "用于 Metadata header 根分隔线颜色";
  }
  if (cssVar.startsWith("--mpx-slot-fg-meta-header-button-")) {
    return "用于 Metadata header 按钮总控（fg-meta-header button fallback）";
  }
  if (cssVar === "--mpx-sidebar-main-bg") {
    return "用于侧栏主列表壳层背景（.sidebar-tree）";
  }
  if (cssVar === "--mpx-sidebar-main-label-border") {
    return "用于侧栏主列表标签边框（.sidebar-label）";
  }
  if (cssVar === "--mpx-sidebar-main-label-active-bg") {
    return "用于侧栏主列表标签激活背景（.sidebar-row.is-active .sidebar-label）";
  }
  if (cssVar === "--mpx-sidebar-main-label-collapsed-active-bg") {
    return "用于可折叠-折叠节点激活背景（.sidebar-label.is-collapsible.is-collapsed）";
  }
  if (cssVar === "--mpx-sidebar-main-label-expanded-active-bg") {
    return "用于可折叠-展开节点激活背景（.sidebar-label.is-collapsible:not(.is-collapsed)）";
  }
  if (cssVar === "--mpx-sidebar-main-label-plain-active-bg") {
    return "用于非可折叠节点激活背景（.sidebar-label:not(.is-collapsible)）";
  }
  if (cssVar === "--mpx-sidebar-main-active-ring") {
    return "用于侧栏主列表标签激活外圈（active ring）";
  }
  if (cssVar === "--mpx-sidebar-main-active-underlay") {
    return "用于侧栏主列表标签激活内圈衬底（active underlay）";
  }
  if (cssVar === "--mpx-sidebar-main-label-toggle-text") {
    return "用于侧栏可折叠箭头颜色（.sidebar-toggle-arrow）";
  }
  if (cssVar === "--mpx-sidebar-main-label-collapsed-marker-focus-bg") {
    return "用于可折叠-折叠节点 focus marker 颜色";
  }
  if (cssVar === "--mpx-sidebar-main-label-expanded-marker-focus-bg") {
    return "用于可折叠-展开节点 focus marker 颜色";
  }
  if (cssVar === "--mpx-sidebar-main-label-plain-marker-focus-bg") {
    return "用于非可折叠节点 focus marker 颜色";
  }
  if (cssVar === "--mpx-sidebar-main-label-collapsed-marker-selected-bg") {
    return "用于可折叠-折叠节点 selected marker 颜色";
  }
  if (cssVar === "--mpx-sidebar-main-label-expanded-marker-selected-bg") {
    return "用于可折叠-展开节点 selected marker 颜色";
  }
  if (cssVar === "--mpx-sidebar-main-label-plain-marker-selected-bg") {
    return "用于非可折叠节点 selected marker 颜色";
  }
  if (cssVar === "--mpx-sidebar-main-label-collapsed-manage-selected-bg") {
    return "用于可折叠-折叠节点管理选中背景";
  }
  if (cssVar === "--mpx-sidebar-main-label-expanded-manage-selected-bg") {
    return "用于可折叠-展开节点管理选中背景";
  }
  if (cssVar === "--mpx-sidebar-main-label-plain-manage-selected-bg") {
    return "用于非可折叠节点管理选中背景";
  }
  if (cssVar === "--mpx-sidebar-main-count-bg") {
    return "用于侧栏计数徽标通用背景（.sidebar-count）";
  }
  if (cssVar.startsWith("--mpx-sidebar-main-")) {
    return "用于侧栏主列表（fg-sidebar-main）样式链路";
  }
  if (cssVar.startsWith("--mpx-main-image-name-list-")) {
    return "用于图片文件名列表（fg-main-content-image-name-list）样式链路";
  }
  if (cssVar === "--mpx-large-panel-border-color") {
    return "大面板边框颜色";
  }
  if (cssVar === "--mpx-large-panel-border-width") {
    return "大面板边框宽度";
  }
  if (cssVar === "--mpx-large-panel-fill-start") {
    return "大面板背景渐变颜色A";
  }
  if (cssVar === "--mpx-large-panel-fill-end") {
    return "大面板背景渐变颜色B";
  }
  if (cssVar === "--mpx-large-panel-fill-angle") {
    return "大面板背景渐变角度";
  }
  if (cssVar === "--mpx-large-panel-shadow") {
    return "大面板背景阴影设置";
  }
  if (cssVar === "--mpx-large-panel-width") {
    return "大面板宽度";
  }
  if (cssVar === "--mpx-large-panel-height") {
    return "大面板高度";
  }
  if (cssVar === "--mpx-large-panel-radius") {
    return "大面板圆角值";
  }
  if (cssVar === "--mpx-large-panel-shell-padding") {
    return "大面板Main内容边距";
  }
  if (cssVar === "--mpx-large-panel-shell-gap") {
    return "大面板Main内容间距";
  }
  if (cssVar === "--mpx-large-panel-section-border-color") {
    return "大面板内共用边框颜色";
  }
  if (cssVar === "--mpx-large-panel-section-border-width") {
    return "大面板内共用边框宽度";
  }
  if (cssVar === "--mpx-large-panel-section-fill-start") {
    return "大面板内共用背景渐变颜色A";
  }
  if (cssVar === "--mpx-large-panel-section-fill-end") {
    return "大面板内共用背景渐变颜色B";
  }
  if (cssVar === "--mpx-large-panel-section-fill-angle") {
    return "大面板内共用背景渐变角度";
  }
  if (cssVar === "--mpx-large-panel-head-border-color") {
    return "大面板Head边框颜色";
  }
  if (cssVar === "--mpx-large-panel-head-border-width") {
    return "大面板Head边框宽度";
  }
  if (cssVar === "--mpx-large-panel-head-fill-start") {
    return "大面板Head背景渐变颜色A";
  }
  if (cssVar === "--mpx-large-panel-head-fill-end") {
    return "大面板Head背景渐变颜色B";
  }
  if (cssVar === "--mpx-large-panel-head-fill-angle") {
    return "大面板Head背景渐变角度";
  }
  if (cssVar === "--mpx-large-panel-side-border-color") {
    return "大面板Side边框颜色";
  }
  if (cssVar === "--mpx-large-panel-side-border-width") {
    return "大面板Side边框宽度";
  }
  if (cssVar === "--mpx-large-panel-side-fill-start") {
    return "大面板Side背景渐变颜色A";
  }
  if (cssVar === "--mpx-large-panel-side-fill-end") {
    return "大面板Side背景渐变颜色B";
  }
  if (cssVar === "--mpx-large-panel-side-fill-angle") {
    return "大面板Side背景渐变角度";
  }
  if (cssVar === "--mpx-large-panel-main-border-color") {
    return "大面板Main边框颜色";
  }
  if (cssVar === "--mpx-large-panel-main-border-width") {
    return "大面板Main边框宽度";
  }
  if (cssVar === "--mpx-large-panel-main-fill-start") {
    return "大面板Main背景渐变颜色A";
  }
  if (cssVar === "--mpx-large-panel-main-fill-end") {
    return "大面板Main背景渐变颜色B";
  }
  if (cssVar === "--mpx-large-panel-main-fill-angle") {
    return "大面板Main背景渐变角度";
  }
  if (cssVar === "--mpx-settings-side-border") {
    return "大面板side容器边框颜色";
  }
  if (cssVar === "--mpx-settings-side-bg") {
    return "大面板side容器背景颜色";
  }
  if (cssVar === "--mpx-settings-side-text") {
    return "大面板side容器文字颜色";
  }
  if (cssVar === "--mpx-settings-side-item-bg") {
    return "大面板side容器标签背景颜色";
  }
  if (cssVar === "--mpx-settings-side-item-hover-bg") {
    return "大面板side容器标签hover状态背景颜色";
  }
  if (cssVar === "--mpx-settings-side-item-active-bg") {
    return "大面板side容器标签focused状态背景颜色";
  }
  if (cssVar === "--mpx-settings-side-item-active-text") {
    return "大面板side容器标签focused状态文字颜色";
  }
  if (cssVar === "--mpx-settings-main-border") {
    return "大面板main容器边框颜色";
  }
  if (cssVar === "--mpx-settings-main-bg") {
    return "大面板main容器背景颜色";
  }
  if (cssVar === "--mpx-settings-main-text") {
    return "大面板main容器文字A颜色";
  }
  if (cssVar === "--mpx-settings-group-border") {
    return "大面板main容器内分组边框颜色";
  }
  if (cssVar === "--mpx-settings-group-head-text") {
    return "大面板main容器内分组大标题文字颜色";
  }
  if (cssVar === "--mpx-settings-item-label-text") {
    return "大面板main容器内分组小标题文字颜色";
  }
  if (cssVar === "--mpx-settings-item-value-text") {
    return "大面板main容器内分组输入框文字颜色";
  }
  if (cssVar === "--mpx-settings-item-input-bg") {
    return "大面板main容器内分组输入框背景颜色";
  }
  if (cssVar === "--mpx-settings-item-input-border") {
    return "大面板main容器内分组输入框边框颜色";
  }
  if (cssVar === "--mpx-settings-danger-btn-border") {
    return "大面板main容器内高危按钮边框颜色";
  }
  if (cssVar === "--mpx-settings-danger-btn-bg") {
    return "大面板main容器内高危按钮背景颜色";
  }
  if (cssVar === "--mpx-settings-danger-btn-text") {
    return "大面板main容器内高危按钮文字颜色";
  }
  if (cssVar === "--mpx-import-task-error-border") {
    return "错误事件边框颜色";
  }
  if (cssVar === "--mpx-import-task-error-bg") {
    return "错误事件背景颜色";
  }
  if (cssVar === "--mpx-import-task-error-text") {
    return "错误事件文字颜色";
  }
  if (cssVar === "--mpx-import-task-hint-border") {
    return "提示事件边框颜色";
  }
  if (cssVar === "--mpx-import-task-hint-bg") {
    return "提示事件背景颜色";
  }
  if (cssVar === "--mpx-import-task-hint-text") {
    return "提示事件文字颜色";
  }
  if (cssVar === "--mpx-import-task-review-notice-border") {
    return "审核提醒事件边框颜色";
  }
  if (cssVar === "--mpx-import-task-review-notice-bg") {
    return "审核提醒事件背景颜色";
  }
  if (cssVar === "--mpx-import-task-review-notice-text") {
    return "审核提醒事件文字颜色";
  }
  if (cssVar === "--mpx-import-task-hash-log-border") {
    return "哈希日志事件边框颜色";
  }
  if (cssVar === "--mpx-import-task-hash-log-bg") {
    return "哈希日志事件背景颜色";
  }
  if (cssVar === "--mpx-import-task-hash-log-text") {
    return "哈希日志事件文字颜色";
  }
  if (cssVar.startsWith("--mpx-large-panel-section-")) {
    return "用于大面板 Head / Side / Main 共享默认值";
  }
  if (cssVar.startsWith("--mpx-large-panel-head-")) {
    return "仅用于大面板 Head 分区";
  }
  if (cssVar.startsWith("--mpx-large-panel-shell-")) {
    return "仅用于大面板 shell 分栏容器";
  }
  if (cssVar.startsWith("--mpx-large-panel-side-")) {
    return "仅用于大面板 Side 分区";
  }
  if (cssVar.startsWith("--mpx-large-panel-main-")) {
    return "仅用于大面板 Main 分区";
  }
  if (cssVar.startsWith("--mpx-large-panel-")) {
    return "仅用于大面板 root 本体";
  }
  if (cssVar.startsWith("--mpx-import-task-")) {
    return "用于导入任务面板子块（error / hint / review notice / hash log）";
  }
  if (cssVar.startsWith("--mpx-metadata-fetch-")) {
    return "用于元数据抓取面板内部件（search row / result columns / preview cards）";
  }
  if (cssVar.startsWith("--mpx-metadata-preference-record-")) {
    return "用于 metadata 偏好指标卡片（preference record）";
  }
  if (cssVar.startsWith("--mpx-metadata-booklet-binding-")) {
    return "用于音乐 metadata 的封面 / Booklet 绑定卡片";
  }
  if (cssVar.startsWith("--mpx-metadata-feature-tag-picker-")) {
    return "用于标签检索面板内部件（tag popover / hint / active tag）";
  }
  if (cssVar.startsWith("--mpx-subtitle-cleanup-")) {
    return "用于字幕清理面板预览区（raw / clean preview panels）";
  }
  if (
    cssVar.startsWith("--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-")
  ) {
    return "用于快捷键编辑小面板 slot 覆写";
  }
  if (
    cssVar.startsWith(
      "--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-",
    )
  ) {
    return "用于快捷键录制小面板 slot 覆写";
  }
  if (cssVar.startsWith("--mpx-slot-fg-main-header-manage-group-name-panel-")) {
    return "用于分组命名小面板 slot 覆写";
  }
  if (
    cssVar.startsWith("--mpx-slot-fg-main-header-manage-delete-confirm-panel-")
  ) {
    return "用于删除确认小面板 slot 覆写";
  }
  if (cssVar.startsWith("--mpx-slot-fg-main-header-image-convert-panel-")) {
    return "用于图片转换小面板 slot 覆写";
  }
  if (
    cssVar.startsWith("--mpx-slot-fg-main-header-image-ad-review-start-panel-")
  ) {
    return "用于主区广告审查起始小面板 slot 覆写";
  }
  if (cssVar.startsWith("--mpx-slot-fg-meta-main-ad-review-start-panel-")) {
    return "用于 Metadata 广告审查起始小面板 slot 覆写";
  }
  if (
    cssVar.startsWith(
      "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-",
    )
  ) {
    return "用于播放列表命名小面板 slot 覆写";
  }
  if (
    cssVar.startsWith("--mpx-slot-fg-sidebar-shortcut-rename-single-panel-")
  ) {
    return "用于单文件重命名小面板 slot 覆写";
  }
  if (cssVar.startsWith("--mpx-metadata-playlist-name-dialog-")) {
    return "用于视频 metadata 的播放列表命名小面板";
  }
  if (cssVar.startsWith("--mpx-transcode-dialog-")) {
    return "用于音频 / 视频转码面板内部控件与底部操作按钮";
  }
  if (cssVar.startsWith("--mpx-sidebar-rename-dialog-")) {
    return "用于侧栏重命名对话框的输入控件与操作按钮";
  }
  if (cssVar.startsWith("--mpx-sidebar-rename-preview-")) {
    return "用于侧栏批量重命名预览表（head / row / source button）";
  }
  if (cssVar.startsWith("--mpx-dialog-panel-")) {
    return "仅用于小面板 root 本体";
  }
  if (cssVar.startsWith("--mpx-btn-core-")) {
    return "用于按钮基础语义层（core）";
  }
  if (cssVar.startsWith("--mpx-btn-variant-default-")) {
    return "用于通用按钮 default 变体";
  }
  if (cssVar.startsWith("--mpx-btn-variant-player-")) {
    return "用于播放器按钮 player 变体";
  }
  if (cssVar.startsWith("--mpx-btn-variant-theme-parameter-side-")) {
    return "用于 Theme Parameter 大面板侧栏按钮变体";
  }
  if (cssVar.startsWith("--mpx-sidebar-tree-scrollbar-")) {
    return "用于侧栏滚动条样式";
  }
  if (cssVar.startsWith("--mpx-range-")) {
    return "用于 Slider 基础层样式";
  }
  if (cssVar.startsWith("--mpx-runway-")) {
    return "用于播放器/滑条 runway 样式";
  }
  if (cssVar.startsWith("--mpx-slider-settings-")) {
    return "用于设置页与 ThemeParameter 页的横向 slider 轨道样式";
  }
  if (cssVar.startsWith("--mpx-btn-variant-overlay-cell-")) {
    return "用于 overlay-cell 按钮状态样式";
  }
  return "用于对应 CSS 消费点的主题调试变量";
}

export const BUTTON_STATE_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "button-default-border",
    cssVar: "--mpx-btn-variant-default-border",
    fallback: "#cbd5e1",
    groupId: "root",
  },
  {
    id: "button-default-bg-idle",
    cssVar: "--mpx-btn-variant-default-bg-idle",
    fallback: "#ecf0f3",
    groupId: "root",
  },
  {
    id: "button-default-bg-hover",
    cssVar: "--mpx-btn-variant-default-bg-hover",
    fallback: "#f8fafc",
    groupId: "root",
  },
  {
    id: "button-default-bg-active",
    cssVar: "--mpx-btn-variant-default-bg-active",
    fallback: "#dce2e8",
    groupId: "root",
  },
  {
    id: "button-default-bg-pressed",
    cssVar: "--mpx-btn-variant-default-bg-pressed",
    fallback: "#d6dee5",
    groupId: "root",
  },
  {
    id: "button-default-text-idle",
    cssVar: "--mpx-btn-variant-default-text-idle",
    fallback: "#4a4a4a",
    groupId: "root",
  },
  {
    id: "button-default-text-active",
    cssVar: "--mpx-btn-variant-default-text-active",
    fallback: "#334155",
    groupId: "root",
  },
  {
    id: "button-default-text-pressed",
    cssVar: "--mpx-btn-variant-default-text-pressed",
    fallback: "#555555",
    groupId: "root",
  },
  {
    id: "button-default-text-merged",
    cssVar: "--mpx-btn-variant-default-text-merged",
    fallback: "#0f172a",
    groupId: "root",
  },
  {
    id: "button-default-text-disabled",
    cssVar: "--mpx-btn-variant-default-text-disabled",
    fallback: "#d5dfec",
    fallbackAlpha: 0.62,
    groupId: "root",
  },
  {
    id: "button-default-danger-hover-bg",
    cssVar: "--mpx-btn-variant-default-danger-hover-bg",
    fallback: "#fee2e2",
    groupId: "root",
  },
  {
    id: "button-default-danger-hover-border",
    cssVar: "--mpx-btn-variant-default-danger-hover-border",
    fallback: "#fca5a5",
    groupId: "root",
  },
  {
    id: "button-default-danger-hover-text",
    cssVar: "--mpx-btn-variant-default-danger-hover-text",
    fallback: "#dc2626",
    groupId: "root",
  },
  {
    id: "button-player-border",
    cssVar: "--mpx-btn-variant-player-border",
    fallback: "#7588a2",
    fallbackAlpha: 0.8,
    groupId: "main",
  },
  {
    id: "button-player-border-active",
    cssVar: "--mpx-btn-variant-player-border-active",
    fallback: "#8ca5c4",
    fallbackAlpha: 0.92,
    groupId: "main",
  },
  {
    id: "button-player-bg-idle",
    cssVar: "--mpx-btn-variant-player-bg-idle",
    fallback: "#1e2834",
    fallbackAlpha: 0.74,
    groupId: "main",
  },
  {
    id: "button-player-bg-hover",
    cssVar: "--mpx-btn-variant-player-bg-hover",
    fallback: "#2a384a",
    fallbackAlpha: 0.9,
    groupId: "main",
  },
  {
    id: "button-player-bg-active",
    cssVar: "--mpx-btn-variant-player-bg-active",
    fallback: "#405670",
    fallbackAlpha: 0.95,
    groupId: "main",
  },
  {
    id: "button-player-text-idle",
    cssVar: "--mpx-btn-variant-player-text-idle",
    fallback: "#f1f6ff",
    groupId: "main",
  },
  {
    id: "button-player-text-disabled",
    cssVar: "--mpx-btn-variant-player-text-disabled",
    fallback: "#d5dfec",
    fallbackAlpha: 0.62,
    groupId: "main",
  },
  {
    id: "button-overlay-cell-text-hover",
    cssVar: "--mpx-btn-variant-overlay-cell-text-hover",
    fallback: "#678390",
    groupId: "main",
  },
  {
    id: "button-overlay-cell-bg-hover",
    cssVar: "--mpx-btn-variant-overlay-cell-bg-hover",
    fallback: "#e3e9ef",
    groupId: "main",
  },
  {
    id: "button-overlay-cell-text-active",
    cssVar: "--mpx-btn-variant-overlay-cell-text-active",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "button-overlay-cell-bg-active",
    cssVar: "--mpx-btn-variant-overlay-cell-bg-active",
    fallback: "#dbe3eb",
    groupId: "main",
  },
  {
    id: "button-overlay-cell-text-pressed",
    cssVar: "--mpx-btn-variant-overlay-cell-text-pressed",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "button-overlay-cell-bg-pressed",
    cssVar: "--mpx-btn-variant-overlay-cell-bg-pressed",
    fallback: "#dbe3eb",
    groupId: "main",
  },
  {
    id: "button-overlay-cell-focus-outline-color",
    cssVar: "--mpx-btn-variant-overlay-cell-focus-outline-color",
    fallback: "#8ea0ad",
    groupId: "main",
  },
  {
    id: "button-side-idle-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-border",
    fallback: "#cbd5e1",
    groupId: "side",
  },
  {
    id: "button-side-idle-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-bg",
    fallback: "#ecf0f3",
    groupId: "side",
  },
  {
    id: "button-side-idle-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-idle-text",
    fallback: "#4a4a4a",
    groupId: "side",
  },
  {
    id: "button-side-hover-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-border",
    fallback: "#cbd5e1",
    groupId: "side",
  },
  {
    id: "button-side-hover-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-bg",
    fallback: "#f8fafc",
    groupId: "side",
  },
  {
    id: "button-side-hover-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-hover-text",
    fallback: "#4a4a4a",
    groupId: "side",
  },
  {
    id: "button-side-active-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-active-border",
    fallback: "#cbd5e1",
    groupId: "side",
  },
  {
    id: "button-side-active-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-active-bg",
    fallback: "#dce2e8",
    groupId: "side",
  },
  {
    id: "button-side-active-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-active-text",
    fallback: "#334155",
    groupId: "side",
  },
  {
    id: "button-side-selected-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-selected-border",
    fallback: "#d6cfc1",
    groupId: "side",
  },
  {
    id: "button-side-selected-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-selected-bg",
    fallback: "#ffffff",
    groupId: "side",
  },
  {
    id: "button-side-selected-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-selected-text",
    fallback: "#2e2a22",
    groupId: "side",
  },
  {
    id: "button-side-pressed-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pressed-border",
    fallback: "#cbd5e1",
    groupId: "side",
  },
  {
    id: "button-side-pressed-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pressed-bg",
    fallback: "#d6dee5",
    groupId: "side",
  },
  {
    id: "button-side-pressed-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pressed-text",
    fallback: "#555555",
    groupId: "side",
  },
  {
    id: "button-side-disabled-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-disabled-border",
    fallback: "#cbd5e1",
    groupId: "side",
  },
  {
    id: "button-side-disabled-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-disabled-bg",
    fallback: "#ecf0f3",
    groupId: "side",
  },
  {
    id: "button-side-disabled-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-disabled-text",
    fallback: "#9b8465",
    groupId: "side",
  },
  {
    id: "button-side-pending-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pending-border",
    fallback: "#d7ba8a",
    groupId: "side",
  },
  {
    id: "button-side-pending-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pending-bg",
    fallback: "#fbf1e0",
    groupId: "side",
  },
  {
    id: "button-side-pending-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-pending-text",
    fallback: "#6a4b1e",
    groupId: "side",
  },
  {
    id: "button-side-danger-hover-border",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-danger-hover-border",
    fallback: "#fca5a5",
    groupId: "side",
  },
  {
    id: "button-side-danger-hover-bg",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-danger-hover-bg",
    fallback: "#fee2e2",
    groupId: "side",
  },
  {
    id: "button-side-danger-hover-text",
    cssVar:
      "--mpx-slot-fg-header-g3-theme-parameter-root-panel-side-btn-danger-hover-text",
    fallback: "#dc2626",
    groupId: "side",
  },
];

export const BUTTON_STATE_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "button-default-shadow-idle",
    cssVar: "--mpx-btn-variant-default-shadow-idle",
    fallback:
      "0 4px 6px rgba(0, 0, 0, 0.12), inset 0 2px 1px rgba(255, 255, 255, 0.9), inset 0 -2px 1px rgba(0, 0, 0, 0.08)",
    groupId: "shadow",
  },
  {
    id: "button-default-shadow-hover",
    cssVar: "--mpx-btn-variant-default-shadow-hover",
    fallback:
      "0 6px 10px rgba(0, 0, 0, 0.15), inset 0 2px 1px rgba(255, 255, 255, 1), inset 0 -2px 1px rgba(0, 0, 0, 0.08)",
    groupId: "shadow",
  },
  {
    id: "button-default-shadow-active",
    cssVar: "--mpx-btn-variant-default-shadow-active",
    fallback:
      "0 1px 2px rgba(0, 0, 0, 0.1), inset 0 2px 4px rgba(0, 0, 0, 0.15), inset 0 -1px 1px rgba(255, 255, 255, 0.5)",
    groupId: "shadow",
  },
  {
    id: "button-default-shadow-pressed",
    cssVar: "--mpx-btn-variant-default-shadow-pressed",
    fallback:
      "0 1px 1px rgba(255, 255, 255, 0.8), inset 0 4px 8px rgba(0, 0, 0, 0.25), inset 0 -2px 2px rgba(255, 255, 255, 0.7)",
    groupId: "shadow",
  },
  {
    id: "button-default-transform-hover",
    cssVar: "--mpx-btn-variant-default-transform-hover",
    fallback: "translateY(-1px)",
    groupId: "root",
  },
  {
    id: "button-default-transform-active",
    cssVar: "--mpx-btn-variant-default-transform-active",
    fallback: "translateY(2px)",
    groupId: "root",
  },
  {
    id: "button-default-transform-pressed",
    cssVar: "--mpx-btn-variant-default-transform-pressed",
    fallback: "translateY(1px)",
    groupId: "root",
  },
  {
    id: "button-default-danger-hover-shadow",
    cssVar: "--mpx-btn-variant-default-danger-hover-shadow",
    fallback:
      "0 6px 10px rgba(220, 38, 38, 0.15), inset 0 2px 1px rgba(255, 255, 255, 1), inset 0 -2px 1px rgba(220, 38, 38, 0.15)",
    groupId: "shadow",
  },
  {
    id: "button-overlay-cell-font-weight-pressed",
    cssVar: "--mpx-btn-variant-overlay-cell-font-weight-pressed",
    fallback: "600",
    groupId: "main",
  },
  {
    id: "button-overlay-cell-focus-outline-width",
    cssVar: "--mpx-btn-variant-overlay-cell-focus-outline-width",
    fallback: "1px",
    groupId: "main",
  },
];

export const BUTTON_VARIANT_DEFAULT_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  BUTTON_STATE_COLOR_FIELDS.filter((field) => field.id.startsWith("button-default-"));

export const BUTTON_VARIANT_DEFAULT_TEXT_FIELDS: readonly ThemeDebugTextField[] =
  BUTTON_STATE_TEXT_FIELDS.filter((field) => field.id.startsWith("button-default-"));

export const BUTTON_VARIANT_PLAYER_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  BUTTON_STATE_COLOR_FIELDS.filter((field) => field.id.startsWith("button-player-"));

export const BUTTON_VARIANT_OVERLAY_CELL_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  BUTTON_STATE_COLOR_FIELDS.filter((field) =>
    field.id.startsWith("button-overlay-cell-"),
  );

export const BUTTON_VARIANT_OVERLAY_CELL_TEXT_FIELDS: readonly ThemeDebugTextField[] =
  BUTTON_STATE_TEXT_FIELDS.filter((field) =>
    field.id.startsWith("button-overlay-cell-"),
  );

export const LARGE_PANEL_BUTTON_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  BUTTON_STATE_COLOR_FIELDS.filter((field) => field.id.startsWith("button-side-"));

export const BUTTON_SLOT_SECTION_DEFINITIONS = [
  {
    id: "header",
    summaryKey: "ui.themeParameter.buttonLayer.sectionSlotHeader",
    colorFields: CONTAINER_HEADER_BUTTONS_COLOR_FIELDS,
  },
  {
    id: "sidebarHeader",
    summaryKey: "ui.themeParameter.buttonLayer.sectionSlotSidebarHeader",
    colorFields: CONTAINER_SIDEBAR_HEADER_BUTTONS_COLOR_FIELDS,
  },
  {
    id: "mainHeader",
    summaryKey: "ui.themeParameter.buttonLayer.sectionSlotMainHeader",
    colorFields: CONTAINER_MAIN_HEADER_BUTTONS_COLOR_FIELDS,
  },
  {
    id: "metadataHeader",
    summaryKey: "ui.themeParameter.buttonLayer.sectionSlotMetadataHeader",
    colorFields: CONTAINER_METADATA_HEADER_BUTTONS_COLOR_FIELDS,
  },
] as const;

export const BUTTON_STATE_FIELD_PREFIX: Readonly<
  Record<ButtonStateKey, string>
> = {
  idle: "idle",
  hover: "hover",
  active: "active",
  selected: "selected",
  pressed: "pressed",
  disabled: "disabled",
  pending: "pending",
  "close-hover": "danger-hover",
};

export const CONTROL_SECTION_DEFINITIONS: ReadonlyArray<{
  id: ThemeControlSectionId;
  titleKey: string;
  noteKey: string;
}> = [
  {
    id: "control-scrollbar",
    titleKey: "ui.themeParameter.controls.section.scrollbar",
    noteKey: "ui.themeParameter.controls.note.scrollbar",
  },
  {
    id: "control-slider-base",
    titleKey: "ui.themeParameter.controls.section.sliderBase",
    noteKey: "ui.themeParameter.controls.note.sliderBase",
  },
  {
    id: "control-slider-player",
    titleKey: "ui.themeParameter.controls.section.sliderPlayer",
    noteKey: "ui.themeParameter.controls.note.sliderPlayer",
  },
  {
    id: "control-slider-vertical",
    titleKey: "ui.themeParameter.controls.section.sliderVertical",
    noteKey: "ui.themeParameter.controls.note.sliderVertical",
  },
  {
    id: "control-slider-settings",
    titleKey: "ui.themeParameter.controls.section.sliderSettings",
    noteKey: "ui.themeParameter.controls.note.sliderSettings",
  },
];

export const COMMON_CONTROL_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "control-scrollbar-track-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-bg",
    fallback: "#ece5d9",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-bg",
    fallback: "#b7ab95",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-hover-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-hover-bg",
    fallback: "#2e6f7f",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-active-bg",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-active-bg",
    fallback: "#2e6f7f",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-color-thumb",
    cssVar: "--mpx-sidebar-tree-scrollbar-color-thumb",
    fallback: "#b7ab95",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-color-track",
    cssVar: "--mpx-sidebar-tree-scrollbar-color-track",
    fallback: "#ece5d9",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-border-color",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-border-color",
    fallback: "rgba(0, 0, 0, 0)",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-slider-base-track-bg",
    cssVar: "--mpx-range-track-bg",
    fallback: "#d6cfc1",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-bg",
    cssVar: "--mpx-range-thumb-bg",
    fallback: "#2e6f7f",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-border",
    cssVar: "--mpx-range-thumb-border",
    fallback: "#ffffff",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-player-fill-gold",
    cssVar: "--mpx-runway-fill-gold",
    fallback: "linear-gradient(90deg, #cba468 0%, #b5853b 100%)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-fill-graphite",
    cssVar: "--mpx-runway-fill-graphite",
    fallback: "linear-gradient(90deg, #9ca3af 0%, #4b5563 55%, #374151 100%)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-shell-pearl",
    cssVar: "--mpx-runway-thumb-shell-pearl",
    fallback: "linear-gradient(90deg, #d6bc86 0%, #c79d4a 50%, #d6bc86 100%)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-shell-graphite",
    cssVar: "--mpx-runway-thumb-shell-graphite",
    fallback: "linear-gradient(145deg, #ffffff 0%, #e5e7eb 40%, #9ca3af 100%)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-vertical-accent-fill",
    cssVar: "--mpx-skeuo-accent-fill",
    fallback: "#8a6a3b",
    groupId: "box",
    sectionId: "control-slider-vertical",
  },
  {
    id: "control-slider-vertical-inset-bg",
    cssVar: "--mpx-skeuo-inset-bg",
    fallback: "#f3e9d8",
    groupId: "box",
    sectionId: "control-slider-vertical",
  },
  {
    id: "control-slider-settings-groove-bg",
    cssVar: "--mpx-slider-settings-groove-bg",
    fallback: "#e9ecf0",
    groupId: "box",
    sectionId: "control-slider-settings",
  },
];

export const COMMON_CONTROL_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "control-scrollbar-size",
    cssVar: "--mpx-sidebar-tree-scrollbar-size",
    fallback: "10px",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-track-radius",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-radius",
    fallback: "10px",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-radius",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-radius",
    fallback: "999px",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-track-border",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-border",
    fallback: "none",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-track-shadow",
    cssVar: "--mpx-sidebar-tree-scrollbar-track-shadow",
    fallback: "none",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-end-gap",
    cssVar: "--mpx-sidebar-tree-scrollbar-end-gap",
    fallback: "0px",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-min-height",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-min-height",
    fallback: "24px",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-border-width",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-border-width",
    fallback: "0px",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-shadow",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-shadow",
    fallback: "none",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-scrollbar-thumb-active-shadow",
    cssVar: "--mpx-sidebar-tree-scrollbar-thumb-active-shadow",
    fallback: "none",
    groupId: "box",
    sectionId: "control-scrollbar",
  },
  {
    id: "control-slider-base-track-height",
    cssVar: "--mpx-range-track-height",
    fallback: "6px",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-size",
    cssVar: "--mpx-range-thumb-size",
    fallback: "16px",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-border-width",
    cssVar: "--mpx-range-thumb-border-width",
    fallback: "1.5px",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-shadow",
    cssVar: "--mpx-range-thumb-shadow",
    fallback: "0 1px 2px rgba(0, 0, 0, 0.24)",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-hover-shadow",
    cssVar: "--mpx-range-thumb-hover-shadow",
    fallback:
      "0 0 0 2px color-mix(in srgb, var(--mpx-range-thumb-bg) 28%, transparent), 0 2px 4px rgba(0, 0, 0, 0.28)",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-active-shadow",
    cssVar: "--mpx-range-thumb-active-shadow",
    fallback:
      "0 0 0 2px color-mix(in srgb, var(--mpx-range-thumb-bg) 36%, transparent), 0 1px 2px rgba(0, 0, 0, 0.24)",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-focus-ring",
    cssVar: "--mpx-range-thumb-focus-ring",
    fallback:
      "0 0 0 2px color-mix(in srgb, var(--mpx-border-focus) 45%, transparent)",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-hover-scale",
    cssVar: "--mpx-range-thumb-hover-scale",
    fallback: "1.06",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-base-thumb-active-scale",
    cssVar: "--mpx-range-thumb-active-scale",
    fallback: "1.12",
    groupId: "box",
    sectionId: "control-slider-base",
  },
  {
    id: "control-slider-player-fill-shadow-gold",
    cssVar: "--mpx-runway-fill-shadow-gold",
    fallback:
      "inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 -1px 1px rgba(0, 0, 0, 0.1)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-fill-shadow-graphite",
    cssVar: "--mpx-runway-fill-shadow-graphite",
    fallback:
      "inset 0 1px 1px rgba(255, 255, 255, 0.3), inset 0 -1px 1px rgba(0, 0, 0, 0.25)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-shell-shadow-pearl",
    cssVar: "--mpx-runway-thumb-shell-shadow-pearl",
    fallback: "0 1px 1px rgba(0, 0, 0, 0.05)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-shell-shadow-graphite",
    cssVar: "--mpx-runway-thumb-shell-shadow-graphite",
    fallback:
      "0 2px 4px rgba(0, 0, 0, 0.2), inset 1px 1px 2px rgba(255, 255, 255, 1), inset -1px -1px 2px rgba(156, 163, 175, 0.5)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-core-pearl",
    cssVar: "--mpx-runway-thumb-core-pearl",
    fallback:
      "radial-gradient(circle at 35% 25%, #ffffff 0%, #f8f9fa 40%, #d1d5db 100%)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-core-graphite",
    cssVar: "--mpx-runway-thumb-core-graphite",
    fallback:
      "radial-gradient(circle at 35% 25%, #9ca3af 0%, #4b5563 50%, #374151 100%)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-core-shadow-pearl",
    cssVar: "--mpx-runway-thumb-core-shadow-pearl",
    fallback:
      "inset 1px 1px 2px rgba(255, 255, 255, 1), inset -1px -1px 3px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(0, 0, 0, 0.05)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-player-thumb-core-shadow-graphite",
    cssVar: "--mpx-runway-thumb-core-shadow-graphite",
    fallback:
      "inset 1px 1px 2px rgba(255, 255, 255, 0.5), inset -1px -1px 3px rgba(0, 0, 0, 0.5), 0 1px 1px rgba(255, 255, 255, 0.5)",
    groupId: "box",
    sectionId: "control-slider-player",
  },
  {
    id: "control-slider-vertical-shadow-dark",
    cssVar: "--mpx-skeuo-shadow-dark",
    fallback: "#cdb799",
    groupId: "box",
    sectionId: "control-slider-vertical",
  },
  {
    id: "control-slider-vertical-shadow-light",
    cssVar: "--mpx-skeuo-shadow-light",
    fallback: "#fffdf7",
    groupId: "box",
    sectionId: "control-slider-vertical",
  },
  {
    id: "control-slider-settings-groove-shadow",
    cssVar: "--mpx-slider-settings-groove-shadow",
    fallback:
      "inset 0 2px 4px color-mix(in srgb, var(--mpx-palette-shadow-color) 32%, transparent), inset 0 1px 1px color-mix(in srgb, var(--mpx-palette-shadow-color) 32%, transparent), 0 1px 0 rgba(255, 255, 255, 1)",
    groupId: "box",
    sectionId: "control-slider-settings",
  },
];

export const LARGE_PANEL_ROOT_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "large-panel-border-color",
    cssVar: "--mpx-large-panel-border-color",
    fallback: "#d6cfc1",
    groupId: "root",
  },
  {
    id: "large-panel-fill-start",
    cssVar: "--mpx-large-panel-fill-start",
    fallback: "#ffffff",
    groupId: "root",
  },
  {
    id: "large-panel-fill-end",
    cssVar: "--mpx-large-panel-fill-end",
    fallback: "#ffffff",
    groupId: "root",
  },
];

export const LARGE_PANEL_SHARED_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  [
    {
      id: "large-panel-section-border-color",
      cssVar: "--mpx-large-panel-section-border-color",
      fallback: "#d6cfc1",
      groupId: "root",
    },
    {
      id: "large-panel-section-fill-start",
      cssVar: "--mpx-large-panel-section-fill-start",
      fallback: "#000000",
      fallbackAlpha: 0,
      groupId: "root",
    },
    {
      id: "large-panel-section-fill-end",
      cssVar: "--mpx-large-panel-section-fill-end",
      fallback: "#000000",
      fallbackAlpha: 0,
      groupId: "root",
    },
  ];

const LARGE_PANEL_HEAD_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "large-panel-head-border-color",
    cssVar: "--mpx-large-panel-head-border-color",
    fallback: "#d6cfc1",
    groupId: "head",
  },
  {
    id: "large-panel-head-fill-start",
    cssVar: "--mpx-large-panel-head-fill-start",
    fallback: "#000000",
    fallbackAlpha: 0,
    groupId: "head",
  },
  {
    id: "large-panel-head-fill-end",
    cssVar: "--mpx-large-panel-head-fill-end",
    fallback: "#000000",
    fallbackAlpha: 0,
    groupId: "head",
  },
  {
    id: "large-panel-head-text",
    cssVar: "--mpx-large-panel-head-text",
    fallback: "#2e2a22",
    groupId: "head",
  },
];

const LARGE_PANEL_SIDE_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "large-panel-side-border-color",
    cssVar: "--mpx-large-panel-side-border-color",
    fallback: "#d6cfc1",
    groupId: "side",
  },
  {
    id: "large-panel-side-fill-start",
    cssVar: "--mpx-large-panel-side-fill-start",
    fallback: "#ffffff",
    groupId: "side",
  },
  {
    id: "large-panel-side-fill-end",
    cssVar: "--mpx-large-panel-side-fill-end",
    fallback: "#ffffff",
    groupId: "side",
  },
];

const LARGE_PANEL_MAIN_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "large-panel-main-border-color",
    cssVar: "--mpx-large-panel-main-border-color",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "large-panel-main-fill-start",
    cssVar: "--mpx-large-panel-main-fill-start",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-main-fill-end",
    cssVar: "--mpx-large-panel-main-fill-end",
    fallback: "#ffffff",
    groupId: "main",
  },
];

const LARGE_PANEL_INTERNAL_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "large-panel-settings-side-bg",
    cssVar: "--mpx-settings-side-bg",
    fallback: "#ffffff",
    groupId: "side",
  },
  {
    id: "large-panel-settings-side-text",
    cssVar: "--mpx-settings-side-text",
    fallback: "#2e2a22",
    groupId: "side",
  },
  {
    id: "large-panel-settings-side-item-bg",
    cssVar: "--mpx-settings-side-item-bg",
    fallback: "rgba(0, 0, 0, 0)",
    fallbackAlpha: 0,
    groupId: "side",
  },
  {
    id: "large-panel-settings-side-item-hover-bg",
    cssVar: "--mpx-settings-side-item-hover-bg",
    fallback: "rgba(46, 111, 127, 0.06)",
    groupId: "side",
  },
  {
    id: "large-panel-settings-side-item-active-bg",
    cssVar: "--mpx-settings-side-item-active-bg",
    fallback: "#e6f1f4",
    groupId: "side",
  },
  {
    id: "large-panel-settings-side-item-active-text",
    cssVar: "--mpx-settings-side-item-active-text",
    fallback: "#2e6f7f",
    groupId: "side",
  },
  {
    id: "large-panel-settings-side-border",
    cssVar: "--mpx-settings-side-border",
    fallback: "#d6cfc1",
    groupId: "side",
  },
  {
    id: "large-panel-settings-main-bg",
    cssVar: "--mpx-settings-main-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-settings-main-text",
    cssVar: "--mpx-settings-main-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-settings-main-border",
    cssVar: "--mpx-settings-main-border",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "large-panel-settings-group-border",
    cssVar: "--mpx-settings-group-border",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "large-panel-settings-group-head-text",
    cssVar: "--mpx-settings-group-head-text",
    fallback: "#1a1814",
    groupId: "main",
  },
  {
    id: "large-panel-settings-group-head-bg",
    cssVar: "--mpx-settings-group-head-bg",
    fallback: "rgba(0, 0, 0, 0)",
    fallbackAlpha: 0,
    groupId: "main",
  },
  {
    id: "large-panel-settings-item-label-text",
    cssVar: "--mpx-settings-item-label-text",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-settings-item-value-text",
    cssVar: "--mpx-settings-item-value-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-settings-item-input-bg",
    cssVar: "--mpx-settings-item-input-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-settings-item-input-border",
    cssVar: "--mpx-settings-item-input-border",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "large-panel-settings-danger-btn-bg",
    cssVar: "--mpx-settings-danger-btn-bg",
    fallback: "#fdeee8",
    groupId: "main",
  },
  {
    id: "large-panel-settings-danger-btn-border",
    cssVar: "--mpx-settings-danger-btn-border",
    fallback: "#d7a596",
    groupId: "main",
  },
  {
    id: "large-panel-settings-danger-btn-text",
    cssVar: "--mpx-settings-danger-btn-text",
    fallback: "#5f2a1e",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-error-border",
    cssVar: "--mpx-import-task-error-border",
    fallback: "#d7a596",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-error-bg",
    cssVar: "--mpx-import-task-error-bg",
    fallback: "#fdeee8",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-error-text",
    cssVar: "--mpx-import-task-error-text",
    fallback: "#5f2a1e",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-hint-border",
    cssVar: "--mpx-import-task-hint-border",
    fallback: "#c5d6de",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-hint-bg",
    cssVar: "--mpx-import-task-hint-bg",
    fallback: "#edf6f9",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-hint-text",
    cssVar: "--mpx-import-task-hint-text",
    fallback: "#173b47",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-review-notice-border",
    cssVar: "--mpx-import-task-review-notice-border",
    fallback: "#d8c69b",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-review-notice-bg",
    cssVar: "--mpx-import-task-review-notice-bg",
    fallback: "#fff7e7",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-review-notice-text",
    cssVar: "--mpx-import-task-review-notice-text",
    fallback: "#5a3b12",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-hash-log-border",
    cssVar: "--mpx-import-task-hash-log-border",
    fallback: "#c5d6de",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-hash-log-bg",
    cssVar: "--mpx-import-task-hash-log-bg",
    fallback: "#edf6f9",
    groupId: "main",
  },
  {
    id: "large-panel-import-task-hash-log-text",
    cssVar: "--mpx-import-task-hash-log-text",
    fallback: "#173b47",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-control-border",
    cssVar: "--mpx-metadata-fetch-control-border",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-control-bg",
    cssVar: "--mpx-metadata-fetch-control-bg",
    fallback: "#f5f2ec",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-control-hover-bg",
    cssVar: "--mpx-metadata-fetch-control-hover-bg",
    fallback: "#f7f3ee",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-control-focus-bg",
    cssVar: "--mpx-metadata-fetch-control-focus-bg",
    fallback: "#efe9df",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-control-text",
    cssVar: "--mpx-metadata-fetch-control-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-control-placeholder",
    cssVar: "--mpx-metadata-fetch-control-placeholder",
    fallback: "#6f6a61",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-results-border",
    cssVar: "--mpx-metadata-fetch-results-border",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-results-bg",
    cssVar: "--mpx-metadata-fetch-results-bg",
    fallback: "#fffcf8",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-results-active-ring",
    cssVar: "--mpx-metadata-fetch-results-active-ring",
    fallback: "#4d8fa0",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-head-border",
    cssVar: "--mpx-metadata-fetch-head-border",
    fallback: "#d9d3c8",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-head-bg",
    cssVar: "--mpx-metadata-fetch-head-bg",
    fallback: "#f1ebe3",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-head-text",
    cssVar: "--mpx-metadata-fetch-head-text",
    fallback: "#6f6a61",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-body-bg",
    cssVar: "--mpx-metadata-fetch-body-bg",
    fallback: "#f5f2ec",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-result-meta-text",
    cssVar: "--mpx-metadata-fetch-result-meta-text",
    fallback: "#6f6a61",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-result-hover-text",
    cssVar: "--mpx-metadata-fetch-result-hover-text",
    fallback: "#2f5f6d",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-divider",
    cssVar: "--mpx-metadata-fetch-preview-divider",
    fallback: "#ddd7cc",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-bg",
    cssVar: "--mpx-metadata-fetch-preview-bg",
    fallback: "#f5f2ec",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-border",
    cssVar: "--mpx-metadata-fetch-preview-toggle-border",
    fallback: "#d9d3c8",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-bg",
    cssVar: "--mpx-metadata-fetch-preview-toggle-bg",
    fallback: "#f1ebe3",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-text",
    cssVar: "--mpx-metadata-fetch-preview-toggle-text",
    fallback: "#6f6a61",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-hover-bg",
    cssVar: "--mpx-metadata-fetch-preview-toggle-hover-bg",
    fallback: "#e7dfd2",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-active-bg",
    cssVar: "--mpx-metadata-fetch-preview-toggle-active-bg",
    fallback: "#ddd7cc",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-preview-toggle-focus-outline",
    cssVar: "--mpx-metadata-fetch-preview-toggle-focus-outline",
    fallback: "#4d8fa0",
    groupId: "main",
  },
  {
    id: "container-metadata-preference-record-border",
    cssVar: "--mpx-metadata-preference-record-border",
    fallback: "#c7d0d8",
    groupId: "main",
  },
  {
    id: "container-metadata-preference-record-bg",
    cssVar: "--mpx-metadata-preference-record-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "container-metadata-preference-record-text",
    cssVar: "--mpx-metadata-preference-record-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "container-metadata-preference-record-summary-text",
    cssVar: "--mpx-metadata-preference-record-summary-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "container-metadata-preference-record-hint-text",
    cssVar: "--mpx-metadata-preference-record-hint-text",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "container-metadata-preference-record-field-border",
    cssVar: "--mpx-metadata-preference-record-field-border",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "container-metadata-preference-record-field-bg",
    cssVar: "--mpx-metadata-preference-record-field-bg",
    fallback: "#f8f5ef",
    groupId: "main",
  },
  {
    id: "container-metadata-preference-record-field-text",
    cssVar: "--mpx-metadata-preference-record-field-text",
    fallback: "#6b6356",
    groupId: "main",
  },
  {
    id: "container-metadata-booklet-binding-border",
    cssVar: "--mpx-metadata-booklet-binding-border",
    fallback: "#c7d0d8",
    groupId: "main",
  },
  {
    id: "container-metadata-booklet-binding-bg",
    cssVar: "--mpx-metadata-booklet-binding-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "container-metadata-booklet-binding-text",
    cssVar: "--mpx-metadata-booklet-binding-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "container-metadata-booklet-binding-meta-text",
    cssVar: "--mpx-metadata-booklet-binding-meta-text",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "container-metadata-booklet-binding-control-border",
    cssVar: "--mpx-metadata-booklet-binding-control-border",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "container-metadata-booklet-binding-control-bg",
    cssVar: "--mpx-metadata-booklet-binding-control-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "container-metadata-booklet-binding-control-text",
    cssVar: "--mpx-metadata-booklet-binding-control-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-hint-text",
    cssVar: "--mpx-metadata-feature-tag-picker-hint-text",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-group-key-text",
    cssVar: "--mpx-metadata-feature-tag-picker-group-key-text",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-popover-border",
    cssVar: "--mpx-metadata-feature-tag-picker-popover-border",
    fallback: "#d6cfc1",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-popover-bg",
    cssVar: "--mpx-metadata-feature-tag-picker-popover-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-border",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-border",
    fallback: "#b7ab95",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-bg",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-text",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-active-border",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-active-border",
    fallback: "#2e6f7f",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-active-bg",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-active-bg",
    fallback: "#dcecf0",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-feature-tag-picker-tag-active-text",
    cssVar: "--mpx-metadata-feature-tag-picker-tag-active-text",
    fallback: "#2e6f7f",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-border",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-border",
    fallback: "#ddd7cc",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-bg",
    fallback: "#f5f2ec",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-text",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-border",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-border",
    fallback: "#d9d3c8",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-bg",
    fallback: "#f1ebe3",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-text",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-text",
    fallback: "#6f6a61",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-hover-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-hover-bg",
    fallback: "#e7dfd2",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-active-bg",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-active-bg",
    fallback: "#ddd7cc",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-raw-preview-toggle-focus-outline",
    cssVar: "--mpx-subtitle-cleanup-raw-preview-toggle-focus-outline",
    fallback: "#4d8fa0",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-border",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-border",
    fallback: "#ddd7cc",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-bg",
    fallback: "#f5f2ec",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-text",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-border",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-border",
    fallback: "#d9d3c8",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-bg",
    fallback: "#f1ebe3",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-text",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-text",
    fallback: "#6f6a61",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-hover-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-hover-bg",
    fallback: "#e7dfd2",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-active-bg",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-active-bg",
    fallback: "#ddd7cc",
    groupId: "main",
  },
  {
    id: "large-panel-subtitle-cleanup-clean-preview-toggle-focus-outline",
    cssVar: "--mpx-subtitle-cleanup-clean-preview-toggle-focus-outline",
    fallback: "#4d8fa0",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-control-border",
    cssVar: "--mpx-transcode-dialog-control-border",
    fallback: "#c7d0d8",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-control-bg",
    cssVar: "--mpx-transcode-dialog-control-bg",
    fallback: "#ecf0f3",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-control-hover-bg",
    cssVar: "--mpx-transcode-dialog-control-hover-bg",
    fallback: "#e3e9ef",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-control-focus-bg",
    cssVar: "--mpx-transcode-dialog-control-focus-bg",
    fallback: "#dbe3eb",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-control-text",
    cssVar: "--mpx-transcode-dialog-control-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-control-placeholder",
    cssVar: "--mpx-transcode-dialog-control-placeholder",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-action-btn-border",
    cssVar: "--mpx-transcode-dialog-action-btn-border",
    fallback: "#b7ab95",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-action-btn-bg",
    cssVar: "--mpx-transcode-dialog-action-btn-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-transcode-dialog-action-btn-text",
    cssVar: "--mpx-transcode-dialog-action-btn-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-text",
    cssVar: "--mpx-sidebar-rename-dialog-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-muted-text",
    cssVar: "--mpx-sidebar-rename-dialog-muted-text",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-border",
    cssVar: "--mpx-sidebar-rename-dialog-control-border",
    fallback: "#c7d0d8",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-bg",
    fallback: "#ecf0f3",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-hover-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-hover-bg",
    fallback: "#e3e9ef",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-focus-bg",
    cssVar: "--mpx-sidebar-rename-dialog-control-focus-bg",
    fallback: "#dbe3eb",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-text",
    cssVar: "--mpx-sidebar-rename-dialog-control-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-control-placeholder",
    cssVar: "--mpx-sidebar-rename-dialog-control-placeholder",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-action-btn-border",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-border",
    fallback: "#b7ab95",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-action-btn-bg",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-dialog-action-btn-text",
    cssVar: "--mpx-sidebar-rename-dialog-action-btn-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-border",
    cssVar: "--mpx-sidebar-rename-preview-border",
    fallback: "#c7d0d8",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-bg",
    cssVar: "--mpx-sidebar-rename-preview-bg",
    fallback: "#ffffff",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-head-border",
    cssVar: "--mpx-sidebar-rename-preview-head-border",
    fallback: "#bcc7d1",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-head-bg",
    cssVar: "--mpx-sidebar-rename-preview-head-bg",
    fallback: "#d1d5db",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-head-text",
    cssVar: "--mpx-sidebar-rename-preview-head-text",
    fallback: "#6a6358",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-list-bg",
    cssVar: "--mpx-sidebar-rename-preview-list-bg",
    fallback: "#ecf0f3",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-border",
    cssVar: "--mpx-sidebar-rename-preview-row-border",
    fallback: "#cfd7df",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-text",
    cssVar: "--mpx-sidebar-rename-preview-row-text",
    fallback: "#2e2a22",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-arrow-text",
    cssVar: "--mpx-sidebar-rename-preview-arrow-text",
    fallback: "rgba(106, 99, 88, 0.7)",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-source-hover-bg",
    cssVar: "--mpx-sidebar-rename-preview-row-source-hover-bg",
    fallback: "#e3e9ef",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-source-active-bg",
    cssVar: "--mpx-sidebar-rename-preview-row-source-active-bg",
    fallback: "#dbe3eb",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-source-pressed-bg",
    cssVar: "--mpx-sidebar-rename-preview-row-source-pressed-bg",
    fallback: "#dbe3eb",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-changed-accent",
    cssVar: "--mpx-sidebar-rename-preview-row-changed-accent",
    fallback: "#9fb1c3",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-failed-accent",
    cssVar: "--mpx-sidebar-rename-preview-row-failed-accent",
    fallback: "#c7928a",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-failed-text",
    cssVar: "--mpx-sidebar-rename-preview-row-failed-text",
    fallback: "#5f2a1e",
    groupId: "main",
  },
  {
    id: "large-panel-sidebar-rename-preview-row-unchanged-text",
    cssVar: "--mpx-sidebar-rename-preview-row-unchanged-text",
    fallback: "#6a6358",
    groupId: "main",
  },
];

export const LARGE_PANEL_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  ...LARGE_PANEL_ROOT_COLOR_FIELDS,
  ...LARGE_PANEL_SHARED_COLOR_FIELDS,
  ...LARGE_PANEL_HEAD_COLOR_FIELDS,
  ...LARGE_PANEL_SIDE_COLOR_FIELDS,
  ...LARGE_PANEL_MAIN_COLOR_FIELDS,
  ...LARGE_PANEL_INTERNAL_COLOR_FIELDS,
];

export const LARGE_PANEL_ROOT_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "large-panel-shadow",
    cssVar: "--mpx-large-panel-shadow",
    fallback:
      "0 14px 38px rgba(30, 27, 21, 0.18), 0 2px 8px rgba(30, 27, 21, 0.08)",
    groupId: "root",
  },
];

const LARGE_PANEL_INTERNAL_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "large-panel-metadata-fetch-control-font-size",
    cssVar: "--mpx-metadata-fetch-control-font-size",
    fallback: "15px",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-head-font-size",
    cssVar: "--mpx-metadata-fetch-head-font-size",
    fallback: "15px",
    groupId: "main",
  },
  {
    id: "large-panel-metadata-fetch-head-font-family",
    cssVar: "--mpx-metadata-fetch-head-font-family",
    fallback: '"Microsoft YaHei", "微软雅黑", sans-serif',
    groupId: "main",
  },
];

export const LARGE_PANEL_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  ...LARGE_PANEL_ROOT_TEXT_FIELDS,
  ...LARGE_PANEL_INTERNAL_TEXT_FIELDS,
];

const filterDebugFieldsByPrefixes = <
  T extends ThemeDebugColorField | ThemeDebugTextField,
>(
  fields: readonly T[],
  prefixes: readonly string[],
) => {
  return fields.filter((field) =>
    prefixes.some((prefix) => field.cssVar.startsWith(prefix)),
  );
};

interface LargePanelInternalSectionDefinition {
  id: LargePanelInternalSectionId;
  summaryKey: string;
  prefixes: readonly string[];
  colorFields: readonly ThemeDebugColorField[];
  textFields: readonly ThemeDebugTextField[];
}

const LARGE_PANEL_INTERNAL_SECTION_PREFIX_DEFINITIONS = [
  {
    id: "settings",
    summaryKey: "ui.themeParameter.largePanelLayer.sectionInternalSettings",
    prefixes: ["--mpx-settings-"],
    groups: [
      {
        id: "side",
        summaryKey: "ui.themeParameter.largePanelLayer.sectionInternalSettingsSide",
        fieldIds: [
          "large-panel-settings-side-border",
          "large-panel-settings-side-bg",
          "large-panel-settings-side-text",
          "large-panel-settings-side-item-bg",
          "large-panel-settings-side-item-hover-bg",
          "large-panel-settings-side-item-active-bg",
          "large-panel-settings-side-item-active-text",
        ],
      },
      {
        id: "main",
        summaryKey: "ui.themeParameter.largePanelLayer.sectionInternalSettingsMain",
        fieldIds: [
          "large-panel-settings-main-border",
          "large-panel-settings-main-bg",
          "large-panel-settings-main-text",
          "large-panel-settings-group-border",
          "large-panel-settings-group-head-text",
          "large-panel-settings-item-label-text",
          "large-panel-settings-item-value-text",
          "large-panel-settings-item-input-bg",
          "large-panel-settings-item-input-border",
          "large-panel-settings-danger-btn-border",
          "large-panel-settings-danger-btn-bg",
          "large-panel-settings-danger-btn-text",
        ],
      },
    ],
  },
  {
    id: "importTask",
    summaryKey: "ui.themeParameter.largePanelLayer.sectionInternalImportTask",
    prefixes: ["--mpx-import-task-"],
  },
  {
    id: "metadataFetch",
    summaryKey:
      "ui.themeParameter.largePanelLayer.sectionInternalMetadataFetch",
    prefixes: ["--mpx-metadata-fetch-"],
  },
  {
    id: "metadataFeatureTagPicker",
    summaryKey:
      "ui.themeParameter.largePanelLayer.sectionInternalMetadataFeatureTagPicker",
    prefixes: ["--mpx-metadata-feature-tag-picker-"],
  },
  {
    id: "subtitleCleanup",
    summaryKey:
      "ui.themeParameter.largePanelLayer.sectionInternalSubtitleCleanup",
    prefixes: [
      "--mpx-subtitle-cleanup-raw-preview-",
      "--mpx-subtitle-cleanup-clean-preview-",
    ],
  },
  {
    id: "transcodeDialog",
    summaryKey:
      "ui.themeParameter.largePanelLayer.sectionInternalTranscodeDialog",
    prefixes: ["--mpx-transcode-dialog-"],
  },
  {
    id: "sidebarRenamePreview",
    summaryKey:
      "ui.themeParameter.largePanelLayer.sectionInternalSidebarRenamePreview",
    prefixes: ["--mpx-sidebar-rename-dialog-", "--mpx-sidebar-rename-preview-"],
  },
] as const satisfies readonly {
  id: LargePanelInternalSectionId;
  summaryKey: string;
  prefixes: readonly string[];
  groups?: readonly {
    id: "side" | "main";
    summaryKey: string;
    fieldIds: readonly string[];
  }[];
}[];

const CONTAINER_METADATA_PREFERENCE_RECORD_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  LARGE_PANEL_INTERNAL_COLOR_FIELDS.filter((field) =>
    field.cssVar.startsWith("--mpx-metadata-preference-record-"),
  );

const CONTAINER_METADATA_BOOKLET_BINDING_COLOR_FIELDS: readonly ThemeDebugColorField[] =
  LARGE_PANEL_INTERNAL_COLOR_FIELDS.filter((field) =>
    field.cssVar.startsWith("--mpx-metadata-booklet-binding-"),
  );

export const METADATA_INTERNAL_DEBUG_SUBSECTIONS: readonly ContainerDebugSubsection[] =
  [
    {
      id: "metadata-internals",
      summaryKey: "ui.themeParameter.containerLayer.sectionMetadataInternals",
      colorFields: CONTAINER_METADATA_INTERNAL_COLOR_FIELDS,
    },
    {
      id: "metadata-preference-record",
      summaryKey:
        "ui.themeParameter.containerLayer.sectionMetadataPreferenceRecord",
      colorFields: CONTAINER_METADATA_PREFERENCE_RECORD_COLOR_FIELDS,
    },
    {
      id: "metadata-booklet-binding",
      summaryKey:
        "ui.themeParameter.containerLayer.sectionMetadataBookletBinding",
      colorFields: CONTAINER_METADATA_BOOKLET_BINDING_COLOR_FIELDS,
    },
  ];

export const LARGE_PANEL_INTERNAL_SECTION_DEFINITIONS: readonly LargePanelInternalSectionDefinition[] =
  LARGE_PANEL_INTERNAL_SECTION_PREFIX_DEFINITIONS.map((section) => ({
    ...section,
    colorFields: filterDebugFieldsByPrefixes(
      LARGE_PANEL_INTERNAL_COLOR_FIELDS,
      section.prefixes,
    ),
    textFields: filterDebugFieldsByPrefixes(
      LARGE_PANEL_INTERNAL_TEXT_FIELDS,
      section.prefixes,
    ),
  }));

export const LARGE_PANEL_SECTION_DEFINITIONS = [
  {
    id: "head",
    summaryKey: "ui.themeParameter.largePanelLayer.sectionHead",
    colorFields: LARGE_PANEL_HEAD_COLOR_FIELDS,
    inlineParameterIds: ["large-panel-head-fill-angle"],
    parameterIds: [
      "large-panel-head-border-width",
      "large-panel-head-padding-y",
      "large-panel-head-padding-x",
    ],
  },
  {
    id: "side",
    summaryKey: "ui.themeParameter.largePanelLayer.sectionSide",
    colorFields: LARGE_PANEL_SIDE_COLOR_FIELDS,
    inlineParameterIds: ["large-panel-side-fill-angle"],
    parameterIds: [
      "large-panel-side-border-width",
      "large-panel-side-radius",
      "large-panel-side-padding",
      "large-panel-side-gap",
    ],
  },
  {
    id: "main",
    summaryKey: "ui.themeParameter.largePanelLayer.sectionMain",
    colorFields: LARGE_PANEL_MAIN_COLOR_FIELDS,
    inlineParameterIds: ["large-panel-main-fill-angle"],
    parameterIds: [
      "large-panel-main-border-width",
      "large-panel-main-radius",
      "large-panel-main-padding-y",
      "large-panel-main-padding-x",
    ],
  },
] as const;

export const SMALL_PANEL_COLOR_FIELDS: readonly ThemeDebugColorField[] = [
  {
    id: "small-panel-border-color",
    cssVar: "--mpx-dialog-panel-root-border-color",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-fill-start",
    cssVar: "--mpx-dialog-panel-root-fill-start",
    fallback: "#ffffff",
    groupId: "root",
  },
  {
    id: "small-panel-fill-end",
    cssVar: "--mpx-dialog-panel-root-fill-end",
    fallback: "#ffffff",
    groupId: "root",
  },
  {
    id: "small-panel-shortcut-edit-panel-border",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-border",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-shortcut-edit-panel-fill-start",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-fill-start",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-shortcut-edit-panel-fill-end",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-fill-end",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-shortcut-edit-panel-text",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-text",
    fallback: "#2e2a22",
    groupId: "box",
  },
  {
    id: "small-panel-shortcut-capture-panel-border",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-border",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-shortcut-capture-panel-fill-start",
    cssVar:
      "--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-fill-start",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-shortcut-capture-panel-fill-end",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-fill-end",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-shortcut-capture-panel-text",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-text",
    fallback: "#2e2a22",
    groupId: "box",
  },
  {
    id: "small-panel-group-name-panel-border",
    cssVar: "--mpx-slot-fg-main-header-manage-group-name-panel-border",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-group-name-panel-fill-start",
    cssVar: "--mpx-slot-fg-main-header-manage-group-name-panel-fill-start",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-group-name-panel-fill-end",
    cssVar: "--mpx-slot-fg-main-header-manage-group-name-panel-fill-end",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-delete-confirm-panel-border",
    cssVar: "--mpx-slot-fg-main-header-manage-delete-confirm-panel-border",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-delete-confirm-panel-fill-start",
    cssVar: "--mpx-slot-fg-main-header-manage-delete-confirm-panel-fill-start",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-delete-confirm-panel-fill-end",
    cssVar: "--mpx-slot-fg-main-header-manage-delete-confirm-panel-fill-end",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-convert-panel-border",
    cssVar: "--mpx-slot-fg-main-header-image-convert-panel-border",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-convert-panel-fill-start",
    cssVar: "--mpx-slot-fg-main-header-image-convert-panel-fill-start",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-convert-panel-fill-end",
    cssVar: "--mpx-slot-fg-main-header-image-convert-panel-fill-end",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-ad-review-start-main-border",
    cssVar: "--mpx-slot-fg-main-header-image-ad-review-start-panel-border",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-ad-review-start-main-fill-start",
    cssVar: "--mpx-slot-fg-main-header-image-ad-review-start-panel-fill-start",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-ad-review-start-main-fill-end",
    cssVar: "--mpx-slot-fg-main-header-image-ad-review-start-panel-fill-end",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-ad-review-start-main-text",
    cssVar: "--mpx-slot-fg-main-header-image-ad-review-start-panel-text",
    fallback: "#2e2a22",
    groupId: "box",
  },
  {
    id: "small-panel-ad-review-start-metadata-border",
    cssVar: "--mpx-slot-fg-meta-main-ad-review-start-panel-border",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-ad-review-start-metadata-fill-start",
    cssVar: "--mpx-slot-fg-meta-main-ad-review-start-panel-fill-start",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-ad-review-start-metadata-fill-end",
    cssVar: "--mpx-slot-fg-meta-main-ad-review-start-panel-fill-end",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-ad-review-start-metadata-text",
    cssVar: "--mpx-slot-fg-meta-main-ad-review-start-panel-text",
    fallback: "#2e2a22",
    groupId: "box",
  },
  {
    id: "small-panel-playlist-name-slot-border",
    cssVar:
      "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-border",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-playlist-name-slot-fill-start",
    cssVar:
      "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-fill-start",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-playlist-name-slot-fill-end",
    cssVar:
      "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-fill-end",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-playlist-name-slot-text",
    cssVar:
      "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-text",
    fallback: "#2e2a22",
    groupId: "box",
  },
  {
    id: "small-panel-playlist-name-slot-input-border",
    cssVar:
      "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-input-border",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-playlist-name-slot-input-bg",
    cssVar:
      "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-input-bg",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-playlist-name-slot-input-text",
    cssVar:
      "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-input-text",
    fallback: "#2e2a22",
    groupId: "box",
  },
  {
    id: "small-panel-playlist-name-slot-input-placeholder",
    cssVar:
      "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-input-placeholder",
    fallback: "#6a6358",
    groupId: "box",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-text",
    cssVar: "--mpx-metadata-playlist-name-dialog-text",
    fallback: "#2e2a22",
    groupId: "box",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-border",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-border",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-bg",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-bg",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-text",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-text",
    fallback: "#2e2a22",
    groupId: "box",
  },
  {
    id: "small-panel-metadata-playlist-name-dialog-input-placeholder",
    cssVar: "--mpx-metadata-playlist-name-dialog-input-placeholder",
    fallback: "#6a6358",
    groupId: "box",
  },
  {
    id: "small-panel-rename-single-slot-border",
    cssVar: "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-border",
    fallback: "#d6cfc1",
    groupId: "border",
  },
  {
    id: "small-panel-rename-single-slot-fill-start",
    cssVar: "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-fill-start",
    fallback: "#ffffff",
    groupId: "box",
  },
  {
    id: "small-panel-rename-single-slot-fill-end",
    cssVar: "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-fill-end",
    fallback: "#ffffff",
    groupId: "box",
  },
];

export const SMALL_PANEL_TEXT_FIELDS: readonly ThemeDebugTextField[] = [
  {
    id: "small-panel-shadow",
    cssVar: "--mpx-dialog-panel-shadow",
    fallback:
      "0 18px 40px color-mix(in srgb, var(--mpx-palette-text-raw) 18%, transparent)",
    groupId: "shadow",
  },
  {
    id: "small-panel-shortcut-edit-panel-shadow",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-shadow",
    fallback:
      "0 18px 40px color-mix(in srgb, var(--mpx-palette-text-raw) 18%, transparent)",
    groupId: "shadow",
  },
  {
    id: "small-panel-shortcut-capture-panel-shadow",
    cssVar: "--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-shadow",
    fallback:
      "0 18px 40px color-mix(in srgb, var(--mpx-palette-text-raw) 18%, transparent)",
    groupId: "shadow",
  },
  {
    id: "small-panel-group-name-panel-shadow",
    cssVar: "--mpx-slot-fg-main-header-manage-group-name-panel-shadow",
    fallback:
      "0 18px 40px color-mix(in srgb, var(--mpx-palette-text-raw) 18%, transparent)",
    groupId: "shadow",
  },
  {
    id: "small-panel-delete-confirm-panel-shadow",
    cssVar: "--mpx-slot-fg-main-header-manage-delete-confirm-panel-shadow",
    fallback:
      "0 18px 40px color-mix(in srgb, var(--mpx-palette-text-raw) 18%, transparent)",
    groupId: "shadow",
  },
  {
    id: "small-panel-convert-panel-shadow",
    cssVar: "--mpx-slot-fg-main-header-image-convert-panel-shadow",
    fallback:
      "0 18px 40px color-mix(in srgb, var(--mpx-palette-text-raw) 18%, transparent)",
    groupId: "shadow",
  },
  {
    id: "small-panel-ad-review-start-main-shadow",
    cssVar: "--mpx-slot-fg-main-header-image-ad-review-start-panel-shadow",
    fallback:
      "0 18px 40px color-mix(in srgb, var(--mpx-palette-text-raw) 18%, transparent)",
    groupId: "shadow",
  },
  {
    id: "small-panel-ad-review-start-metadata-shadow",
    cssVar: "--mpx-slot-fg-meta-main-ad-review-start-panel-shadow",
    fallback:
      "0 18px 40px color-mix(in srgb, var(--mpx-palette-text-raw) 18%, transparent)",
    groupId: "shadow",
  },
  {
    id: "small-panel-playlist-name-slot-shadow",
    cssVar:
      "--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-shadow",
    fallback:
      "0 18px 40px color-mix(in srgb, var(--mpx-palette-text-raw) 18%, transparent)",
    groupId: "shadow",
  },
  {
    id: "small-panel-rename-single-slot-shadow",
    cssVar: "--mpx-slot-fg-sidebar-shortcut-rename-single-panel-shadow",
    fallback:
      "0 18px 40px color-mix(in srgb, var(--mpx-palette-text-raw) 18%, transparent)",
    groupId: "shadow",
  },
];

export const SMALL_PANEL_ROOT_COLOR_FIELDS = SMALL_PANEL_COLOR_FIELDS.filter(
  (field) =>
    field.cssVar === "--mpx-dialog-panel-root-border-color" ||
    field.cssVar === "--mpx-dialog-panel-root-fill-start" ||
    field.cssVar === "--mpx-dialog-panel-root-fill-end",
);

export const SMALL_PANEL_ROOT_TEXT_FIELDS = SMALL_PANEL_TEXT_FIELDS.filter(
  (field) => field.cssVar === "--mpx-dialog-panel-shadow",
);

const createSmallPanelSectionGroup = (
  title: string | null,
  prefixes: readonly string[],
  inlineParameterIds?: readonly string[],
): SmallPanelSectionGroupDefinition => ({
  title,
  colorFields: filterDebugFieldsByPrefixes(SMALL_PANEL_COLOR_FIELDS, prefixes),
  textFields: filterDebugFieldsByPrefixes(SMALL_PANEL_TEXT_FIELDS, prefixes),
  inlineParameterIds,
});

export const SMALL_PANEL_SECTION_DEFINITIONS: readonly SmallPanelSectionDefinition[] =
  [
    {
      id: "shortcutEdit",
      summaryKey: "ui.themeParameter.smallPanelLayer.sectionShortcutEdit",
      groups: [
        createSmallPanelSectionGroup(
          null,
          ["--mpx-slot-fg-header-g1-settings-shortcut-edit-panel-"],
          ["small-panel-shortcut-edit-fill-angle"],
        ),
      ],
    },
    {
      id: "shortcutCapture",
      summaryKey: "ui.themeParameter.smallPanelLayer.sectionShortcutCapture",
      groups: [
        createSmallPanelSectionGroup(
          null,
          ["--mpx-slot-fg-header-g1-settings-shortcut-capture-panel-"],
          ["small-panel-shortcut-capture-fill-angle"],
        ),
      ],
    },
    {
      id: "groupName",
      summaryKey: "ui.themeParameter.smallPanelLayer.sectionGroupName",
      groups: [
        createSmallPanelSectionGroup(
          null,
          ["--mpx-slot-fg-main-header-manage-group-name-panel-"],
          ["small-panel-group-name-fill-angle"],
        ),
      ],
    },
    {
      id: "deleteConfirm",
      summaryKey: "ui.themeParameter.smallPanelLayer.sectionDeleteConfirm",
      groups: [
        createSmallPanelSectionGroup(
          null,
          ["--mpx-slot-fg-main-header-manage-delete-confirm-panel-"],
          ["small-panel-delete-confirm-fill-angle"],
        ),
      ],
    },
    {
      id: "adReviewStart",
      summaryKey: "ui.themeParameter.smallPanelLayer.sectionAdReviewStart",
      groups: [
        createSmallPanelSectionGroup(
          "Main Toolbar",
          ["--mpx-slot-fg-main-header-image-ad-review-start-panel-"],
          ["small-panel-ad-review-start-main-fill-angle"],
        ),
        createSmallPanelSectionGroup(
          "Metadata",
          ["--mpx-slot-fg-meta-main-ad-review-start-panel-"],
          ["small-panel-ad-review-start-metadata-fill-angle"],
        ),
      ],
    },
    {
      id: "convert",
      summaryKey: "ui.themeParameter.smallPanelLayer.sectionConvert",
      groups: [
        createSmallPanelSectionGroup(
          null,
          ["--mpx-slot-fg-main-header-image-convert-panel-"],
          ["small-panel-convert-fill-angle"],
        ),
      ],
    },
    {
      id: "playlistNameDialog",
      summaryKey: "ui.themeParameter.smallPanelLayer.sectionPlaylistNameDialog",
      groups: [
        createSmallPanelSectionGroup(
          "Panel Slot Override",
          ["--mpx-slot-fg-meta-main-video-editor-playlist-name-dialog-panel-"],
          ["small-panel-playlist-name-dialog-fill-angle"],
        ),
        createSmallPanelSectionGroup("Shared Internals", [
          "--mpx-metadata-playlist-name-dialog-",
        ]),
      ],
    },
    {
      id: "renameSingle",
      summaryKey: "ui.themeParameter.smallPanelLayer.sectionRenameSingle",
      groups: [
        createSmallPanelSectionGroup(
          "Panel Slot Override",
          ["--mpx-slot-fg-sidebar-shortcut-rename-single-panel-"],
          ["small-panel-rename-single-fill-angle"],
        ),
      ],
    },
  ];
