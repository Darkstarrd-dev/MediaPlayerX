import type {
  ThemeParameterDefinition,
  ThemeParameterValues,
} from "./themeParameterDefinitions";

interface ThemeParameterSyncGroup {
  sourceId: string;
  targetIds: readonly string[];
}

export const THEME_PARAMETER_SYNC_GROUPS: readonly ThemeParameterSyncGroup[] = [
  {
    sourceId: "container-frame-radius",
    targetIds: ["header-radius", "sidebar-radius", "main-radius", "metadata-radius"],
  },
  {
    sourceId: "container-frame-fill-angle",
    targetIds: [
      "header-fill-angle",
      "sidebar-fill-angle",
      "main-fill-angle",
      "metadata-fill-angle",
    ],
  },
  {
    sourceId: "large-panel-section-fill-angle",
    targetIds: [
      "large-panel-head-fill-angle",
      "large-panel-side-fill-angle",
      "large-panel-main-fill-angle",
    ],
  },
  {
    sourceId: "large-panel-section-border-width",
    targetIds: [
      "large-panel-head-border-width",
      "large-panel-side-border-width",
      "large-panel-main-border-width",
    ],
  },
  {
    sourceId: "small-panel-fill-angle",
    targetIds: [
      "small-panel-shortcut-edit-fill-angle",
      "small-panel-shortcut-capture-fill-angle",
      "small-panel-group-name-fill-angle",
      "small-panel-delete-confirm-fill-angle",
      "small-panel-ad-review-start-main-fill-angle",
      "small-panel-ad-review-start-metadata-fill-angle",
      "small-panel-convert-fill-angle",
      "small-panel-playlist-name-dialog-fill-angle",
      "small-panel-rename-single-fill-angle",
    ],
  },
] as const;

export interface ThemeParameterSyncState {
  [sourceId: string]: Set<string>;
}

const SYNC_GROUP_BY_SOURCE_ID = new Map(
  THEME_PARAMETER_SYNC_GROUPS.map((group) => [group.sourceId, group]),
);

const SYNC_SOURCE_ID_BY_TARGET_ID = new Map<string, string>();
for (const group of THEME_PARAMETER_SYNC_GROUPS) {
  for (const targetId of group.targetIds) {
    SYNC_SOURCE_ID_BY_TARGET_ID.set(targetId, group.sourceId);
  }
}

export function createThemeParameterSyncState(): ThemeParameterSyncState {
  return Object.fromEntries(
    THEME_PARAMETER_SYNC_GROUPS.map((group) => [group.sourceId, new Set<string>()]),
  );
}

export function resetThemeParameterSyncState(
  state: ThemeParameterSyncState,
): void {
  for (const group of THEME_PARAMETER_SYNC_GROUPS) {
    state[group.sourceId] = new Set();
  }
}

function resolveThemeParameterSyncGroup(
  parameterId: string,
): ThemeParameterSyncGroup | null {
  return SYNC_GROUP_BY_SOURCE_ID.get(parameterId) ?? null;
}

function ensureActiveSyncTargets(
  state: ThemeParameterSyncState,
  group: ThemeParameterSyncGroup,
): Set<string> {
  const activeTargets = state[group.sourceId];
  if (activeTargets && activeTargets.size > 0) {
    return activeTargets;
  }
  const nextTargets = new Set(group.targetIds);
  state[group.sourceId] = nextTargets;
  return nextTargets;
}

export function collectThemeParameterSyncIds(parameterId: string): string[] {
  const group = resolveThemeParameterSyncGroup(parameterId);
  return group ? [parameterId, ...group.targetIds] : [parameterId];
}

export function applyThemeParameterSyncTargets(options: {
  state: ThemeParameterSyncState;
  parameterId: string;
  parameterMap: Map<string, ThemeParameterDefinition>;
  root: HTMLElement;
  nextValue: number;
  nextValues: ThemeParameterValues;
}): boolean {
  const group = resolveThemeParameterSyncGroup(options.parameterId);
  if (!group) {
    return false;
  }
  for (const targetId of ensureActiveSyncTargets(options.state, group)) {
    const syncParameter = options.parameterMap.get(targetId);
    if (!syncParameter) {
      continue;
    }
    options.nextValues[targetId] = options.nextValue;
    syncParameter.apply(options.root, options.nextValue, options.nextValues);
  }
  return true;
}

export function applyImportedThemeParameterSyncTargets(options: {
  state: ThemeParameterSyncState;
  parameterId: string;
  importedValues: Record<string, unknown>;
  importedParameterIds: Set<string>;
  parameterMap: Map<string, ThemeParameterDefinition>;
  root: HTMLElement;
  nextValue: number;
  nextValues: ThemeParameterValues;
}): boolean {
  const group = resolveThemeParameterSyncGroup(options.parameterId);
  if (!group) {
    return false;
  }
  options.state[group.sourceId] = new Set(group.targetIds);
  for (const targetId of options.state[group.sourceId]) {
    if (
      typeof options.importedValues[targetId] === "number" &&
      Number.isFinite(options.importedValues[targetId])
    ) {
      continue;
    }
    const syncParameter = options.parameterMap.get(targetId);
    if (!syncParameter) {
      continue;
    }
    options.nextValues[targetId] = options.nextValue;
    options.importedParameterIds.add(targetId);
    syncParameter.apply(options.root, options.nextValue, options.nextValues);
  }
  return true;
}

export function consumeThemeParameterSyncTargetsForReset(
  state: ThemeParameterSyncState,
  parameterId: string,
): string[] | null {
  const group = resolveThemeParameterSyncGroup(parameterId);
  if (!group) {
    return null;
  }
  const syncedIds = Array.from(state[group.sourceId] ?? []);
  state[group.sourceId] = new Set();
  return syncedIds;
}

export function pruneThemeParameterSyncTarget(
  state: ThemeParameterSyncState,
  parameterId: string,
): boolean {
  const sourceId = SYNC_SOURCE_ID_BY_TARGET_ID.get(parameterId);
  if (!sourceId) {
    return false;
  }
  state[sourceId]?.delete(parameterId);
  return true;
}
