import { useCallback, useMemo, useState, type SetStateAction } from "react";

import type {
  LargePanelInternalSectionId,
  LargePanelInternalSettingsGroupId,
  SmallPanelSectionId,
  ThemeParameterPageId,
} from "./ThemeParameterPanelMain";
import type { ThemeControlSectionId } from "./themeParameterPanelTypes";
import {
  readThemeParameterUiSessionState,
  writeThemeParameterUiSessionState,
  type ThemeParameterUISessionState,
} from "./themeParameterPanelSessionState";

type BooleanUiStateKey = {
  [Key in keyof ThemeParameterUISessionState]: ThemeParameterUISessionState[Key] extends boolean
    ? Key
    : never;
}[keyof ThemeParameterUISessionState];

function resolveNextState<T>(action: SetStateAction<T>, previous: T): T {
  if (typeof action === "function") {
    return (action as (previousValue: T) => T)(previous);
  }
  return action;
}

export function useThemeParameterUiSession() {
  const [uiState, setUiState] = useState<ThemeParameterUISessionState>(() =>
    readThemeParameterUiSessionState(),
  );

  const updateUiState = useCallback(
    (
      updater: (
        previous: ThemeParameterUISessionState,
      ) => ThemeParameterUISessionState,
    ) => {
      setUiState((previous) => {
        const next = updater(previous);
        writeThemeParameterUiSessionState(next);
        return next;
      });
    },
    [],
  );

  const setPageScrollTop = useCallback(
    (page: ThemeParameterPageId, scrollTop: number) => {
      updateUiState((previous) => ({
        ...previous,
        pageScrollTops: {
          ...previous.pageScrollTops,
          [page]: scrollTop,
        },
      }));
    },
    [updateUiState],
  );

  const setActivePage = useCallback(
    (action: SetStateAction<ThemeParameterPageId>, currentScrollTop = 0) => {
      updateUiState((previous) => {
        const nextPage = resolveNextState(action, previous.activePage);
        return {
          ...previous,
          activePage: nextPage,
          pageScrollTops: {
            ...previous.pageScrollTops,
            [previous.activePage]: currentScrollTop,
          },
        };
      });
    },
    [updateUiState],
  );

  const restoreUiState = useCallback(() => {
    setUiState(readThemeParameterUiSessionState());
  }, []);

  const persistUiState = useCallback(
    (scrollTop: number) => {
      const nextState = {
        ...uiState,
        pageScrollTops: {
          ...uiState.pageScrollTops,
          [uiState.activePage]: scrollTop,
        },
      };
      writeThemeParameterUiSessionState(nextState);
      setUiState(nextState);
    },
    [uiState],
  );

  const createBooleanSetter = useCallback(
    (key: BooleanUiStateKey) => {
      return (action: SetStateAction<boolean>) => {
        updateUiState((previous) => ({
          ...previous,
          [key]: resolveNextState(action, previous[key]),
        }));
      };
    },
    [updateUiState],
  );

  const setLargePanelInternalSectionExpanded = useCallback(
    (
      sectionId: LargePanelInternalSectionId,
      action: SetStateAction<boolean>,
    ) => {
      updateUiState((previous) => ({
        ...previous,
        largePanelInternalSectionsExpanded: {
          ...previous.largePanelInternalSectionsExpanded,
          [sectionId]: resolveNextState(
            action,
            previous.largePanelInternalSectionsExpanded[sectionId],
          ),
        },
      }));
    },
    [updateUiState],
  );

  const setLargePanelInternalSettingsGroupExpanded = useCallback(
    (
      groupId: LargePanelInternalSettingsGroupId,
      action: SetStateAction<boolean>,
    ) => {
      updateUiState((previous) => ({
        ...previous,
        largePanelInternalSettingsGroupsExpanded: {
          ...previous.largePanelInternalSettingsGroupsExpanded,
          [groupId]: resolveNextState(
            action,
            previous.largePanelInternalSettingsGroupsExpanded[groupId],
          ),
        },
      }));
    },
    [updateUiState],
  );

  const setSmallPanelSectionExpanded = useCallback(
    (sectionId: SmallPanelSectionId, action: SetStateAction<boolean>) => {
      updateUiState((previous) => ({
        ...previous,
        smallPanelSectionsExpanded: {
          ...previous.smallPanelSectionsExpanded,
          [sectionId]: resolveNextState(
            action,
            previous.smallPanelSectionsExpanded[sectionId],
          ),
        },
      }));
    },
    [updateUiState],
  );

  const setControlSectionExpanded = useCallback(
    (sectionId: ThemeControlSectionId, action: SetStateAction<boolean>) => {
      updateUiState((previous) => ({
        ...previous,
        controlSectionsExpanded: {
          ...previous.controlSectionsExpanded,
          [sectionId]: resolveNextState(action, previous.controlSectionsExpanded[sectionId]),
        },
      }));
    },
    [updateUiState],
  );

  const booleanSetters = useMemo(
    () => ({
      setCommonExpanded: createBooleanSetter("commonExpanded"),
      setStyleExpanded: createBooleanSetter("styleExpanded"),
      setContainerBackgroundExpanded: createBooleanSetter(
        "containerBackgroundExpanded",
      ),
      setContainerSharedShellExpanded: createBooleanSetter(
        "containerSharedShellExpanded",
      ),
      setContainerHeaderExpanded: createBooleanSetter(
        "containerHeaderExpanded",
      ),
      setContainerHeaderAppearanceExpanded: createBooleanSetter(
        "containerHeaderAppearanceExpanded",
      ),
      setContainerHeaderButtonsExpanded: createBooleanSetter(
        "containerHeaderButtonsExpanded",
      ),
      setContainerHeaderLogoExpanded: createBooleanSetter(
        "containerHeaderLogoExpanded",
      ),
      setContainerHeaderG1Expanded: createBooleanSetter(
        "containerHeaderG1Expanded",
      ),
      setContainerHeaderG2Expanded: createBooleanSetter(
        "containerHeaderG2Expanded",
      ),
      setContainerHeaderGDebugExpanded: createBooleanSetter(
        "containerHeaderGDebugExpanded",
      ),
      setContainerHeaderG3Expanded: createBooleanSetter(
        "containerHeaderG3Expanded",
      ),
      setContainerSidebarExpanded: createBooleanSetter(
        "containerSidebarExpanded",
      ),
      setContainerSidebarAppearanceExpanded: createBooleanSetter(
        "containerSidebarAppearanceExpanded",
      ),
      setContainerSidebarHeaderExpanded: createBooleanSetter(
        "containerSidebarHeaderExpanded",
      ),
      setContainerSidebarHeaderTitleExpanded: createBooleanSetter(
        "containerSidebarHeaderTitleExpanded",
      ),
      setContainerSidebarHeaderActionsExpanded: createBooleanSetter(
        "containerSidebarHeaderActionsExpanded",
      ),
      setContainerMainExpanded: createBooleanSetter("containerMainExpanded"),
      setContainerMainAppearanceExpanded: createBooleanSetter(
        "containerMainAppearanceExpanded",
      ),
      setContainerMainHeaderExpanded: createBooleanSetter(
        "containerMainHeaderExpanded",
      ),
      setContainerMainHeaderButtonsExpanded: createBooleanSetter(
        "containerMainHeaderButtonsExpanded",
      ),
      setContainerMainWorkspaceExpanded: createBooleanSetter(
        "containerMainWorkspaceExpanded",
      ),
      setContainerMainPreviewExpanded: createBooleanSetter(
        "containerMainPreviewExpanded",
      ),
      setContainerMetadataExpanded: createBooleanSetter(
        "containerMetadataExpanded",
      ),
      setContainerMetadataAppearanceExpanded: createBooleanSetter(
        "containerMetadataAppearanceExpanded",
      ),
      setContainerMetadataHeaderExpanded: createBooleanSetter(
        "containerMetadataHeaderExpanded",
      ),
      setContainerMetadataHeaderButtonsExpanded: createBooleanSetter(
        "containerMetadataHeaderButtonsExpanded",
      ),
      setContainerMetadataFileListExpanded: createBooleanSetter(
        "containerMetadataFileListExpanded",
      ),
      setContainerSidebarMainExpanded: createBooleanSetter(
        "containerSidebarMainExpanded",
      ),
      setContainerMainImageNameListExpanded: createBooleanSetter(
        "containerMainImageNameListExpanded",
      ),
      setLargePanelRootExpanded: createBooleanSetter("largePanelRootExpanded"),
      setLargePanelSharedSectionExpanded: createBooleanSetter(
        "largePanelSharedSectionExpanded",
      ),
      setLargePanelHeadExpanded: createBooleanSetter("largePanelHeadExpanded"),
      setLargePanelSideExpanded: createBooleanSetter("largePanelSideExpanded"),
      setLargePanelMainExpanded: createBooleanSetter("largePanelMainExpanded"),
      setLargePanelButtonExpanded: createBooleanSetter("largePanelButtonExpanded"),
      setLargePanelInternalExpanded: createBooleanSetter(
        "largePanelInternalExpanded",
      ),
      setSmallPanelRootExpanded: createBooleanSetter("smallPanelRootExpanded"),
      setButtonVariantDefaultExpanded: createBooleanSetter(
        "buttonVariantDefaultExpanded",
      ),
      setButtonVariantPlayerExpanded: createBooleanSetter(
        "buttonVariantPlayerExpanded",
      ),
      setButtonVariantOverlayCellExpanded: createBooleanSetter(
        "buttonVariantOverlayCellExpanded",
      ),
      setButtonSlotExpanded: createBooleanSetter("buttonSlotExpanded"),
      setButtonSlotHeaderExpanded: createBooleanSetter(
        "buttonSlotHeaderExpanded",
      ),
      setButtonSlotSidebarHeaderExpanded: createBooleanSetter(
        "buttonSlotSidebarHeaderExpanded",
      ),
      setButtonSlotMainHeaderExpanded: createBooleanSetter(
        "buttonSlotMainHeaderExpanded",
      ),
      setButtonSlotMetadataHeaderExpanded: createBooleanSetter(
        "buttonSlotMetadataHeaderExpanded",
      ),
      setControlScrollbarExpanded: createBooleanSetter(
        "controlScrollbarExpanded",
      ),
      setControlSliderBaseExpanded: createBooleanSetter(
        "controlSliderBaseExpanded",
      ),
      setControlSliderPlayerExpanded: createBooleanSetter(
        "controlSliderPlayerExpanded",
      ),
      setControlSliderVerticalExpanded: createBooleanSetter(
        "controlSliderVerticalExpanded",
      ),
      setControlSliderSettingsExpanded: createBooleanSetter(
        "controlSliderSettingsExpanded",
      ),
      setControlFileListExpanded: createBooleanSetter(
        "controlFileListExpanded",
      ),
    }),
    [createBooleanSetter],
  );

  return {
    uiState,
    restoreUiState,
    persistUiState,
    setActivePage,
    setPageScrollTop,
    setLargePanelInternalSectionExpanded,
    setLargePanelInternalSettingsGroupExpanded,
    setSmallPanelSectionExpanded,
    setControlSectionExpanded,
    ...booleanSetters,
  };
}
