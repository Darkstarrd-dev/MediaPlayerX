import type { useI18n } from "../i18n/useI18n";

type TranslateFn = ReturnType<typeof useI18n>["t"];

interface AdReviewExecButtonProps {
  t: TranslateFn;
  adReviewRunning: boolean;
  disabled: boolean;
  onClick: () => void;
}

export function AdReviewExecButton({
  t,
  adReviewRunning,
  disabled,
  onClick,
}: AdReviewExecButtonProps) {
  return (
    <button
      className={`manage-ad-review-icon-btn main-icon-square-btn manage-ad-review-exec-btn ${adReviewRunning ? "is-running" : ""}`}
      type="button"
      aria-label={
        adReviewRunning ? t("a11y.manage.pause") : t("a11y.manage.start")
      }
      title={adReviewRunning ? t("a11y.manage.pause") : t("a11y.manage.start")}
      disabled={disabled}
      onClick={onClick}
    >
      <span aria-hidden="true">{adReviewRunning ? "⏸" : "▶"}</span>
    </button>
  );
}
