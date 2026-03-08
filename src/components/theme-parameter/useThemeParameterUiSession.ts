import { useCallback, useMemo, useState, type SetStateAction } from "react";

import type {
  LargePanelInternalSectionId,
  SmallPanelSectionId,
  ThemeParameterPageId,
} from "./themeParameterPanelTypes";
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
      setContainerMetadataInternalsExpanded: createBooleanSetter(
        "containerMetadataInternalsExpanded",
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
      setLargePanelInternalExpanded: createBooleanSetter(
        "largePanelInternalExpanded",
      ),
      setSmallPanelRootExpanded: createBooleanSetter("smallPanelRootExpanded"),
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
    setSmallPanelSectionExpanded,
    ...booleanSetters,
  };
}
