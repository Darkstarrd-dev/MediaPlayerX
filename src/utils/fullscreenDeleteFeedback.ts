export type FullscreenDeleteFeedbackPane = "image" | "video";

export interface FullscreenDeleteFeedbackDetail {
  // true = 新标记为待删除（红色遮罩），false = 取消标记（蓝色遮罩）
  marked: boolean;
  pane: FullscreenDeleteFeedbackPane;
}

export const FULLSCREEN_DELETE_FEEDBACK_EVENT =
  "mpx:fullscreen-delete-feedback";

function isWindowAvailable(): boolean {
  return typeof window !== "undefined";
}

export function dispatchFullscreenDeleteFeedback(
  detail: FullscreenDeleteFeedbackDetail,
): void {
  if (!isWindowAvailable()) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<FullscreenDeleteFeedbackDetail>(
      FULLSCREEN_DELETE_FEEDBACK_EVENT,
      { detail },
    ),
  );
}

export function onFullscreenDeleteFeedback(
  listener: (detail: FullscreenDeleteFeedbackDetail) => void,
): () => void {
  if (!isWindowAvailable()) {
    return () => undefined;
  }

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<FullscreenDeleteFeedbackDetail>)
      .detail;
    if (!detail) {
      return;
    }
    const normalizedPane = detail.pane === "video" ? "video" : "image";
    listener({
      marked: Boolean(detail.marked),
      pane: normalizedPane,
    });
  };

  window.addEventListener(FULLSCREEN_DELETE_FEEDBACK_EVENT, handler);
  return () => {
    window.removeEventListener(FULLSCREEN_DELETE_FEEDBACK_EVENT, handler);
  };
}
