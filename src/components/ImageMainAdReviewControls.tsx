import { formatPercent } from "./metadata/metadataPanelUtils";
import type { ImageMainSectionProps } from "./ImageMainSection.types";
import type { useI18n } from "../i18n/useI18n";

type TranslateFn = ReturnType<typeof useI18n>["t"];

interface ImageMainAdReviewControlsProps {
  t: TranslateFn;
  showAdReviewToolbarControls: boolean;
  isReviewRunningOrPaused: boolean;
  isReviewWithCandidates: boolean;
  canSwitchManageReviewMode: boolean;
  convertInteractionLocked: boolean;
  adReviewPending: boolean;
  pendingManageAction: boolean;
  adReviewExecutionMode: "normal" | "performance";
  manageReviewMode: NonNullable<ImageMainSectionProps["manageReviewMode"]>;
  onManageReviewModeChange: NonNullable<
    ImageMainSectionProps["onManageReviewModeChange"]
  >;
  openAdReviewStrategyPopover: boolean;
  openAdReviewStrategyPopoverByHover: () => void;
  closeAdReviewStrategyPopoverByHover: () => void;
  adReviewStrategyMode: NonNullable<
    ImageMainSectionProps["adReviewStrategyMode"]
  >;
  onAdReviewStrategyModeChange: NonNullable<
    ImageMainSectionProps["onAdReviewStrategyModeChange"]
  >;
  adReviewMaxConcurrency: number;
  adReviewHeadN: number;
  adReviewTailN: number;
  adReviewTailStopCleanStreak: number;
  onAdReviewMaxConcurrencyChange: NonNullable<
    ImageMainSectionProps["onAdReviewMaxConcurrencyChange"]
  >;
  onAdReviewHeadNChange: NonNullable<
    ImageMainSectionProps["onAdReviewHeadNChange"]
  >;
  onAdReviewTailNChange: NonNullable<
    ImageMainSectionProps["onAdReviewTailNChange"]
  >;
  onAdReviewTailStopCleanStreakChange: NonNullable<
    ImageMainSectionProps["onAdReviewTailStopCleanStreakChange"]
  >;
  openAdReviewProgressPopover: boolean;
  openAdReviewProgressPopoverByHover: () => void;
  closeAdReviewProgressPopoverByHover: () => void;
  adReviewTask: ImageMainSectionProps["adReviewTask"];
  adReviewRunning: boolean;
  canExecuteAdReview: boolean;
  triggerToolbarAdReviewStartOrPause: () => void;
  onRemoveAdReviewTask: NonNullable<
    ImageMainSectionProps["onRemoveAdReviewTask"]
  >;
  adReviewDeletePending: boolean;
  adReviewFocusActive: boolean;
  hasAdReviewFocusCandidates: boolean;
  onToggleAdReviewFocus: NonNullable<
    ImageMainSectionProps["onToggleAdReviewFocus"]
  >;
  selectedAdReviewCandidateCount: number;
  hasCheckedAdReviewCandidates: boolean;
  onDeleteSelectedAdReviewCandidates: NonNullable<
    ImageMainSectionProps["onDeleteSelectedAdReviewCandidates"]
  >;
  onDismissAdReviewTask: NonNullable<
    ImageMainSectionProps["onDismissAdReviewTask"]
  >;
}

export function ImageMainAdReviewControls({
  t,
  showAdReviewToolbarControls,
  isReviewRunningOrPaused,
  isReviewWithCandidates,
  canSwitchManageReviewMode,
  convertInteractionLocked,
  adReviewPending,
  pendingManageAction,
  adReviewExecutionMode,
  manageReviewMode,
  onManageReviewModeChange,
  openAdReviewStrategyPopover,
  openAdReviewStrategyPopoverByHover,
  closeAdReviewStrategyPopoverByHover,
  adReviewStrategyMode,
  onAdReviewStrategyModeChange,
  adReviewMaxConcurrency,
  adReviewHeadN,
  adReviewTailN,
  adReviewTailStopCleanStreak,
  onAdReviewMaxConcurrencyChange,
  onAdReviewHeadNChange,
  onAdReviewTailNChange,
  onAdReviewTailStopCleanStreakChange,
  openAdReviewProgressPopover,
  openAdReviewProgressPopoverByHover,
  closeAdReviewProgressPopoverByHover,
  adReviewTask,
  adReviewRunning,
  canExecuteAdReview,
  triggerToolbarAdReviewStartOrPause,
  onRemoveAdReviewTask,
  adReviewDeletePending,
  adReviewFocusActive,
  hasAdReviewFocusCandidates,
  onToggleAdReviewFocus,
  selectedAdReviewCandidateCount,
  hasCheckedAdReviewCandidates,
  onDeleteSelectedAdReviewCandidates,
  onDismissAdReviewTask,
}: ImageMainAdReviewControlsProps) {
  const isPerformanceMode =
    manageReviewMode === "ad" && adReviewExecutionMode === "performance";
  const effectiveStrategyMode = isPerformanceMode
    ? "head-tail"
    : adReviewStrategyMode;

  if (!showAdReviewToolbarControls) {
    return null;
  }

  return (
    <>
      {!isReviewRunningOrPaused &&
      !isReviewWithCandidates &&
      canSwitchManageReviewMode &&
      !isPerformanceMode ? (
        <button
          className="manage-ad-review-icon-btn main-icon-square-btn"
          type="button"
          disabled={convertInteractionLocked || adReviewPending}
          onClick={() =>
            onManageReviewModeChange(manageReviewMode === "ad" ? "cover" : "ad")
          }
          data-tooltip-label={
            manageReviewMode === "ad"
              ? t("ui.manage.adReviewTitle")
              : t("ui.manage.coverReviewTitle")
          }
        >
          <span aria-hidden="true">
            {manageReviewMode === "ad" ? "AD" : "C"}
          </span>
        </button>
      ) : null}
      {!isReviewRunningOrPaused &&
      !isReviewWithCandidates &&
      manageReviewMode === "ad" ? (
        <div
          className={`header-popover-control main-toolbar-ad-review-strategy-control ${
            openAdReviewStrategyPopover ? "is-open" : ""
          }`}
          onMouseEnter={openAdReviewStrategyPopoverByHover}
          onMouseLeave={closeAdReviewStrategyPopoverByHover}
        >
          <button
            className={`manage-ad-review-icon-btn main-icon-square-btn header-popover-trigger ${
              effectiveStrategyMode === "head-tail" ? "is-active" : ""
            }`}
            type="button"
            aria-pressed={openAdReviewStrategyPopover}
            aria-label={t("a11y.manage.strategyToggle")}
            data-tooltip-label={
              effectiveStrategyMode === "head-tail"
                ? t("tip.manage.strategyHeadTailToAll")
                : t("tip.manage.strategyAllToHeadTail")
            }
            disabled={
              pendingManageAction || adReviewPending || isPerformanceMode
            }
            onClick={() =>
              onAdReviewStrategyModeChange(
                effectiveStrategyMode === "head-tail" ? "all" : "head-tail",
              )
            }
          >
            <span aria-hidden="true">
              {effectiveStrategyMode === "head-tail" ? "H" : "A"}
            </span>
          </button>

          <div
            className="header-popover-panel main-toolbar-ad-review-strategy-panel"
            data-slot="fg-main-toolbar-image-ad-review-strategy-pop"
            hidden={
              !openAdReviewStrategyPopover ||
              effectiveStrategyMode !== "head-tail"
            }
            role="dialog"
            aria-label={t("a11y.manage.strategyPanel")}
          >
            <p className="main-toolbar-ad-review-strategy-title">
              {t("ui.manage.strategyHeadTailPanelTitle")}
            </p>

            <div className="main-toolbar-ad-review-slider-row">
              <span>{t("ui.manage.concurrency")}</span>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={adReviewMaxConcurrency}
                onChange={(event) =>
                  onAdReviewMaxConcurrencyChange(Number(event.target.value))
                }
              />
              <strong>{adReviewMaxConcurrency}</strong>
            </div>
            <p className="main-toolbar-ad-review-slider-hint">
              {t("ui.manage.strategyHintConcurrency")}
            </p>

            <div className="main-toolbar-ad-review-slider-row">
              <span>{t("ui.manage.headWindow")}</span>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={adReviewHeadN}
                onChange={(event) =>
                  onAdReviewHeadNChange(Number(event.target.value))
                }
              />
              <strong>{adReviewHeadN}</strong>
            </div>
            <p className="main-toolbar-ad-review-slider-hint">
              {t("ui.manage.strategyHintHead")}
            </p>

            <div className="main-toolbar-ad-review-slider-row">
              <span>{t("ui.manage.tailWindow")}</span>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={adReviewTailN}
                onChange={(event) =>
                  onAdReviewTailNChange(Number(event.target.value))
                }
              />
              <strong>{adReviewTailN}</strong>
            </div>
            <p className="main-toolbar-ad-review-slider-hint">
              {t("ui.manage.strategyHintTail")}
            </p>

            {isPerformanceMode ? null : (
              <>
                <div className="main-toolbar-ad-review-slider-row">
                  <span>{t("ui.manage.tailStopClean")}</span>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={adReviewTailStopCleanStreak}
                    onChange={(event) =>
                      onAdReviewTailStopCleanStreakChange(
                        Number(event.target.value),
                      )
                    }
                  />
                  <strong>{adReviewTailStopCleanStreak}</strong>
                </div>
                <p className="main-toolbar-ad-review-slider-hint">
                  {t("ui.manage.strategyHintTailStop")}
                </p>
              </>
            )}
          </div>
        </div>
      ) : null}
      {isReviewRunningOrPaused ? (
        <>
          <div
            className={`header-popover-control main-toolbar-ad-review-progress-control ${openAdReviewProgressPopover ? "is-open" : ""}`}
            onMouseEnter={openAdReviewProgressPopoverByHover}
            onMouseLeave={closeAdReviewProgressPopoverByHover}
          >
            <button
              className="main-toolbar-ad-review-running-pill"
              type="button"
              aria-pressed={openAdReviewProgressPopover}
              aria-label={t("ui.manage.progress", {
                percent: Math.round((adReviewTask?.progress ?? 0) * 100),
                reviewed: adReviewTask?.reviewed_count ?? 0,
                total: adReviewTask?.total_count ?? 0,
              })}
              data-tooltip-label={t("ui.manage.progress", {
                percent: Math.round((adReviewTask?.progress ?? 0) * 100),
                reviewed: adReviewTask?.reviewed_count ?? 0,
                total: adReviewTask?.total_count ?? 0,
              })}
            >
              {t("ui.manage.progress", {
                percent: Math.round((adReviewTask?.progress ?? 0) * 100),
                reviewed: adReviewTask?.reviewed_count ?? 0,
                total: adReviewTask?.total_count ?? 0,
              })}
            </button>

            <div
              className="header-popover-panel main-toolbar-ad-review-progress-panel"
              data-slot="fg-main-toolbar-image-ad-review-progress-pop"
              hidden={!openAdReviewProgressPopover}
              role="dialog"
              aria-label={t("ui.manage.progress", {
                percent: Math.round((adReviewTask?.progress ?? 0) * 100),
                reviewed: adReviewTask?.reviewed_count ?? 0,
                total: adReviewTask?.total_count ?? 0,
              })}
            >
              {adReviewTask ? (
                <>
                  <p className="main-toolbar-ad-review-progress-line">
                    {`策略 ${adReviewTask.execution?.strategy.mode === "head-tail" ? "head-tail" : "all"} 并发 ${adReviewTask.execution?.max_concurrency ?? adReviewMaxConcurrency}`}
                  </p>
                  <p className="main-toolbar-ad-review-progress-line">
                    {`头部 ${adReviewTask.execution?.strategy.mode === "head-tail" ? adReviewTask.execution.strategy.head_n : "-"} 尾部 ${adReviewTask.execution?.strategy.mode === "head-tail" ? adReviewTask.execution.strategy.tail_n : "-"} 尾部截止 ${adReviewTask.execution?.strategy.mode === "head-tail" ? adReviewTask.execution.strategy.tail_stop_clean_streak : "-"}`}
                  </p>
                  {adReviewTask.audit ? (
                    <>
                      <p className="main-toolbar-ad-review-progress-line">
                        {`来源 known-hash ${adReviewTask.audit.source_distribution.known_hash} strategy-skip ${adReviewTask.audit.source_distribution.strategy_skipped}`}
                      </p>
                      <p className="main-toolbar-ad-review-progress-line">
                        {`LLM 疑似 ${adReviewTask.audit.source_distribution.llm_suspected} 正常 ${adReviewTask.audit.source_distribution.llm_clean} 失败 ${adReviewTask.audit.source_distribution.llm_failed}`}
                      </p>
                      <p className="main-toolbar-ad-review-progress-line">
                        {`命中率 LLM ${formatPercent(adReviewTask.audit.llm_hit_rate)} 总体 ${formatPercent(adReviewTask.audit.overall_hit_rate)}`}
                      </p>
                    </>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
          <button
            className={`manage-ad-review-icon-btn main-icon-square-btn manage-ad-review-exec-btn ${adReviewRunning ? "is-running" : ""}`}
            type="button"
            aria-label={
              adReviewRunning ? t("a11y.manage.pause") : t("a11y.manage.start")
            }
            data-tooltip-label={
              adReviewRunning ? t("a11y.manage.pause") : t("a11y.manage.start")
            }
            disabled={
              convertInteractionLocked ||
              adReviewPending ||
              (!adReviewRunning && !canExecuteAdReview)
            }
            onClick={triggerToolbarAdReviewStartOrPause}
          >
            <span aria-hidden="true">{adReviewRunning ? "⏸" : "▶"}</span>
          </button>
          {adReviewTask ? (
            <button
              className="manage-ad-review-icon-btn main-icon-square-btn"
              type="button"
              aria-label={t("ui.manage.removeTask")}
              data-tooltip-label={t("ui.manage.removeTask")}
              disabled={
                pendingManageAction ||
                adReviewPending ||
                adReviewDeletePending ||
                adReviewTask.status === "running"
              }
              onClick={() => onRemoveAdReviewTask(adReviewTask.task_id)}
            >
              <span aria-hidden="true">X</span>
            </button>
          ) : null}
        </>
      ) : null}
      {isReviewWithCandidates ? (
        <>
          <button
            className={`main-toolbar-ad-review-review-pill ${adReviewFocusActive ? "is-active" : ""}`}
            type="button"
            aria-label={t("a11y.manage.focus")}
            data-tooltip-label={t("a11y.manage.focus")}
            disabled={
              pendingManageAction ||
              adReviewPending ||
              !hasAdReviewFocusCandidates
            }
            onClick={() => {
              if (!adReviewFocusActive) {
                onToggleAdReviewFocus();
              }
            }}
          >
            {t("ui.manage.reviewToolbarProgress", {
              selected: selectedAdReviewCandidateCount,
              total: adReviewTask?.candidates.length ?? 0,
            })}
          </button>
          {adReviewTask ? (
            <button
              className="manage-ad-review-icon-btn main-icon-square-btn"
              type="button"
              aria-label={t("ui.manage.removeTask")}
              data-tooltip-label={t("ui.manage.removeTask")}
              disabled={
                pendingManageAction || adReviewPending || adReviewDeletePending
              }
              onClick={() => onRemoveAdReviewTask(adReviewTask.task_id)}
            >
              <span aria-hidden="true">X</span>
            </button>
          ) : null}
          <button
            className="manage-ad-review-icon-btn main-icon-square-btn"
            type="button"
            aria-label={t("ui.manage.delete")}
            data-tooltip-label={t("ui.manage.delete")}
            disabled={
              pendingManageAction ||
              adReviewPending ||
              !hasCheckedAdReviewCandidates
            }
            onClick={onDeleteSelectedAdReviewCandidates}
          >
            <span aria-hidden="true">D</span>
          </button>
          <button
            className="manage-ad-review-icon-btn main-icon-square-btn"
            type="button"
            aria-label={t("ui.manage.resetDismiss")}
            data-tooltip-label={t("ui.manage.resetDismiss")}
            disabled={pendingManageAction || adReviewPending}
            onClick={onDismissAdReviewTask}
          >
            <span aria-hidden="true">R</span>
          </button>
        </>
      ) : null}
    </>
  );
}
