import { useCallback, useEffect, useRef } from "react";

// 滚轮逐页翻页的最小持续时间（与键盘按住翻页的 IMAGE_NAV_REPEAT_MIN_INTERVAL_MS 一致）。
// 快速滚轮会在极短时间内派发多个 wheel 事件；若每个事件直接翻一页，连续 setState 会被
// React 批量合并、跳过中间页渲染，表现为「直接跳到目标页」的伪卡顿。
// 本 hook 把滚轮输入累加为待翻页步数，再以最小持续时间逐页消费，确保每个中间页都被显示、不丢页。
export const IMAGE_WHEEL_PAGE_MIN_INTERVAL_MS = 72;

interface UseFullscreenWheelPagerParams {
  /** 仅在全屏激活时启用；关闭时清空待翻页队列与定时器 */
  enabled: boolean;
  /** 逐页消费回调：direction 为 +1（下一页）或 -1（上一页） */
  onStep: (direction: -1 | 1) => void;
}

interface UseFullscreenWheelPagerResult {
  /** 入队一次翻页输入（同方向累加，反向可抵消） */
  enqueue: (direction: -1 | 1) => void;
  /** 立即清空队列与定时器 */
  reset: () => void;
}

export function useFullscreenWheelPager({
  enabled,
  onStep,
}: UseFullscreenWheelPagerParams): UseFullscreenWheelPagerResult {
  // 带符号的剩余待翻页步数：正数向后翻、负数向前翻
  const pendingRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const onStepRef = useRef(onStep);

  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    pendingRef.current = 0;
    stopTimer();
  }, [stopTimer]);

  const consumeOne = useCallback(() => {
    const pending = pendingRef.current;
    if (pending === 0) {
      stopTimer();
      return;
    }
    const direction: -1 | 1 = pending > 0 ? 1 : -1;
    pendingRef.current = pending - direction;
    onStepRef.current(direction);
    if (pendingRef.current === 0) {
      stopTimer();
    }
  }, [stopTimer]);

  const enqueue = useCallback(
    (direction: -1 | 1) => {
      pendingRef.current += direction;
      if (pendingRef.current === 0) {
        // 反向输入恰好抵消，无需翻页
        stopTimer();
        return;
      }
      if (timerRef.current === null) {
        // 以最小持续时间逐页消费；首页也走该节奏，保证每页都有可见停留
        timerRef.current = window.setInterval(
          consumeOne,
          IMAGE_WHEEL_PAGE_MIN_INTERVAL_MS,
        );
      }
    },
    [consumeOne, stopTimer],
  );

  useEffect(() => {
    if (!enabled) {
      reset();
    }
  }, [enabled, reset]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  return { enqueue, reset };
}
