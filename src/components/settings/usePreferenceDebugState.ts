import { useCallback, useEffect, useState } from "react";

import type { SettingsSection } from "./renderSettingsMainSection";
import {
  PREFERENCE_METRICS_STATE_KEY,
  parsePreferenceDebugViewModel,
  type PreferenceDebugViewModel,
} from "./settingsPanelHelpers";

interface UsePreferenceDebugStateParams {
  settingsOpen: boolean;
  activeSection: SettingsSection;
  t: (key: string) => string;
}

interface UsePreferenceDebugStateResult {
  preferenceDebugLoading: boolean;
  preferenceDebugError: string | null;
  preferenceDebugData: PreferenceDebugViewModel | null;
  refreshPreferenceDebug: () => void;
  resetPreferenceDebugState: () => void;
}

export function usePreferenceDebugState({
  settingsOpen,
  activeSection,
  t,
}: UsePreferenceDebugStateParams): UsePreferenceDebugStateResult {
  const [preferenceDebugLoading, setPreferenceDebugLoading] = useState(false);
  const [preferenceDebugError, setPreferenceDebugError] = useState<string | null>(
    null,
  );
  const [preferenceDebugData, setPreferenceDebugData] =
    useState<PreferenceDebugViewModel | null>(null);
  const [preferenceDebugRefreshNonce, setPreferenceDebugRefreshNonce] =
    useState(0);

  const refreshPreferenceDebug = useCallback(() => {
    setPreferenceDebugRefreshNonce((value) => value + 1);
  }, []);

  const resetPreferenceDebugState = useCallback(() => {
    setPreferenceDebugLoading(false);
    setPreferenceDebugError(null);
    setPreferenceDebugData(null);
    setPreferenceDebugRefreshNonce(0);
  }, []);

  useEffect(() => {
    if (!settingsOpen || activeSection !== "system") {
      return;
    }

    const backendApi =
      typeof window !== "undefined" ? window.mediaPlayerBackend : undefined;
    if (!backendApi || typeof backendApi.readAppState !== "function") {
      setPreferenceDebugLoading(false);
      setPreferenceDebugError(t("ui.settings.preferenceDebugUnsupported"));
      setPreferenceDebugData(null);
      return;
    }

    let active = true;
    setPreferenceDebugLoading(true);
    setPreferenceDebugError(null);

    void backendApi
      .readAppState({
        state_key: PREFERENCE_METRICS_STATE_KEY,
        fallback_json: "{}",
      })
      .then((response) => {
        if (!active) {
          return;
        }
        setPreferenceDebugData(parsePreferenceDebugViewModel(response.state_json));
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        const fallback = t("ui.settings.preferenceDebugReadFailed");
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : fallback;
        setPreferenceDebugError(message);
        setPreferenceDebugData(null);
      })
      .finally(() => {
        if (!active) {
          return;
        }
        setPreferenceDebugLoading(false);
      });

    return () => {
      active = false;
    };
  }, [activeSection, preferenceDebugRefreshNonce, settingsOpen, t]);

  return {
    preferenceDebugLoading,
    preferenceDebugError,
    preferenceDebugData,
    refreshPreferenceDebug,
    resetPreferenceDebugState,
  };
}
