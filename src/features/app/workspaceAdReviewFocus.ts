import { useEffect, useRef } from "react";

interface AdReviewTaskLike {
  task_id: string;
  status: string;
  candidates: Array<unknown>;
}

interface UseAdReviewFocusBindingsParams {
  adReviewPanelOpen: boolean;
  adReviewFocusTaskId: string | null;
  adReviewTask: AdReviewTaskLike | null;
  adReviewDeletePending: boolean;
  setAdReviewFocusTaskId: (taskId: string | null) => void;
  setAdReviewPageIndex: (value: number | ((prev: number) => number)) => void;
  setSelectedSidebarNodeId: (nodeId: string | null) => void;
}

function canAutoFocusTask(
  task: AdReviewTaskLike | null,
): task is AdReviewTaskLike {
  if (!task) {
    return false;
  }
  return (
    task.status === "running" ||
    task.status === "paused" ||
    task.status === "review"
  );
}

export function useAdReviewFocusBindings({
  adReviewPanelOpen,
  adReviewFocusTaskId,
  adReviewTask,
  adReviewDeletePending,
  setAdReviewFocusTaskId,
  setAdReviewPageIndex,
  setSelectedSidebarNodeId,
}: UseAdReviewFocusBindingsParams) {
  const previousAdReviewPanelOpenRef = useRef(adReviewPanelOpen);

  useEffect(() => {
    const wasOpen = previousAdReviewPanelOpenRef.current;
    previousAdReviewPanelOpenRef.current = adReviewPanelOpen;

    if (wasOpen && !adReviewPanelOpen) {
      if (adReviewFocusTaskId) {
        setAdReviewFocusTaskId(null);
        setAdReviewPageIndex(0);
      }
      return;
    }

    const enteringAdReviewMode = !wasOpen && adReviewPanelOpen;
    if (!enteringAdReviewMode) {
      return;
    }

    if (canAutoFocusTask(adReviewTask)) {
      setAdReviewFocusTaskId(adReviewTask.task_id);
      setAdReviewPageIndex(0);
      setSelectedSidebarNodeId(null);
    }
  }, [
    adReviewFocusTaskId,
    adReviewPanelOpen,
    adReviewTask,
    setAdReviewFocusTaskId,
    setAdReviewPageIndex,
    setSelectedSidebarNodeId,
  ]);

  useEffect(() => {
    if (!adReviewPanelOpen || adReviewFocusTaskId) {
      return;
    }

    if (!canAutoFocusTask(adReviewTask)) {
      return;
    }

    setAdReviewFocusTaskId(adReviewTask.task_id);
    setAdReviewPageIndex(0);
    setSelectedSidebarNodeId(null);
  }, [
    adReviewFocusTaskId,
    adReviewPanelOpen,
    adReviewTask,
    setAdReviewFocusTaskId,
    setAdReviewPageIndex,
    setSelectedSidebarNodeId,
  ]);

  const onToggleAdReviewFocus = () => {
    if (adReviewDeletePending) {
      return;
    }
    if (!adReviewTask) {
      setAdReviewFocusTaskId(null);
      return;
    }

    if (
      !canAutoFocusTask(adReviewTask) ||
      adReviewTask.candidates.length === 0
    ) {
      setAdReviewFocusTaskId(null);
      setAdReviewPageIndex(0);
      return;
    }

    setSelectedSidebarNodeId(null);
    setAdReviewFocusTaskId(adReviewTask.task_id);
    setAdReviewPageIndex(0);
  };

  return { onToggleAdReviewFocus };
}
