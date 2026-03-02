import { MainUiIcon } from "./MainUiIcon";
import type { useI18n } from "../i18n/useI18n";

type TranslateFn = ReturnType<typeof useI18n>["t"];

interface ImageMainMetadataToolbarProps {
  t: TranslateFn;
  metadataPending: boolean;
  metadataManageSelectionMode: "single" | "multiple";
  manageOperationHint: string | null;
  onMetadataSyncName: () => void;
  onToggleMetadataManageSelectionMode: () => void;
  onOpenMetadataFetch: () => void;
}

export function ImageMainMetadataToolbar({
  t,
  metadataPending,
  metadataManageSelectionMode,
  manageOperationHint,
  onMetadataSyncName,
  onToggleMetadataManageSelectionMode,
  onOpenMetadataFetch,
}: ImageMainMetadataToolbarProps) {
  void manageOperationHint;
  const metadataSelectionToggleLabel =
    metadataManageSelectionMode === "single"
      ? t("a11y.metadata.switchToMultipleSelectMode")
      : t("a11y.metadata.switchToSingleSelectMode");

  return (
    <>
      <span hidden data-slot="fg-main-toolbar-state-metadata" />
      <strong className="main-toolbar-title">
        {t("ui.header.metadataManage")}
      </strong>
      <div className="toolbar-actions toolbar-actions-manage">
        <button
          className="feature-action-btn main-icon-square-btn"
          type="button"
          aria-label={metadataSelectionToggleLabel}
          data-tooltip-label={metadataSelectionToggleLabel}
          onClick={onToggleMetadataManageSelectionMode}
        >
          {metadataManageSelectionMode === "single" ? "S" : "M"}
        </button>
        <button
          className="feature-action-btn main-icon-square-btn"
          type="button"
          aria-label={t("a11y.common.syncName")}
          data-tooltip-label={t("tip.common.syncName")}
          disabled={metadataPending}
          onClick={onMetadataSyncName}
        >
          <MainUiIcon name="refresh" />
        </button>
        <button
          className="feature-action-btn main-icon-square-btn"
          type="button"
          aria-label={t("a11y.metadata.fetch")}
          data-tooltip-label={t("a11y.metadata.fetch")}
          onClick={onOpenMetadataFetch}
        >
          <MainUiIcon name="getMetaData" />
        </button>
      </div>
    </>
  );
}
