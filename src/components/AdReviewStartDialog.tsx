import type { useI18n } from "../i18n/useI18n";
import type { ImageMainSectionProps } from "./ImageMainSection.types";

type TranslateFn = ReturnType<typeof useI18n>["t"];

interface AdReviewStartDialogProps {
  t: TranslateFn;
  open: boolean;
  manageReviewMode: NonNullable<ImageMainSectionProps["manageReviewMode"]>;
  onClose: () => void;
  onStartWithOption: (skipReviewedNodes: boolean) => void;
}

export function AdReviewStartDialog({
  t,
  open,
  manageReviewMode,
  onClose,
  onStartWithOption,
}: AdReviewStartDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="manage-ad-review-start-mask"
      data-slot="fg-main-toolbar-image-ad-review-start-panel"
      role="dialog"
      aria-modal="true"
      aria-label={t("a11y.manage.startModeDialog")}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="settings-floating-panel manage-ad-review-start-dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h3>
          {manageReviewMode === "cover"
            ? t("ui.manage.startDialogTitleCover")
            : t("ui.manage.startDialogTitle")}
        </h3>
        <p className="manage-ad-review-start-description">
          {t("ui.manage.startDialogDescription")}
        </p>
        <div className="settings-floating-actions">
          <button type="button" onClick={() => onStartWithOption(true)}>
            {t("ui.manage.startSkipScanned")}
          </button>
          <button type="button" onClick={() => onStartWithOption(false)}>
            {t("ui.manage.startDontSkipScanned")}
          </button>
          <button type="button" onClick={onClose}>
            {t("ui.common.cancel")}
          </button>
        </div>
      </section>
    </div>
  );
}
