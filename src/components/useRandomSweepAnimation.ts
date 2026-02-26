import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type AnimationEvent as ReactAnimationEvent,
} from "react";

interface UseRandomSweepAnimationOptions {
  enabled?: boolean;
  animationName?: string;
  initialDelayRangeMs?: readonly [number, number];
  repeatDelayRangeMs?: readonly [number, number];
}

interface UseRandomSweepAnimationResult {
  sweeping: boolean;
  onAnimationEnd: (event: ReactAnimationEvent<HTMLElement>) => void;
}

function toRandomDelay(minDelayMs: number, maxDelayMs: number): number {
  if (maxDelayMs <= minDelayMs) {
    return minDelayMs;
  }
  return Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1) + minDelayMs);
}

export function useRandomSweepAnimation(
  options: UseRandomSweepAnimationOptions = {},
): UseRandomSweepAnimationResult {
  const {
    enabled = true,
    animationName = "mpx-random-sheen-once",
    initialDelayRangeMs = [1000, 3000],
    repeatDelayRangeMs = [2000, 8000],
  } = options;
  const [sweeping, setSweeping] = useState(false);
  const sweepTimerRef = useRef<number | null>(null);

  const clearSweepTimer = useCallback(() => {
    if (sweepTimerRef.current !== null) {
      window.clearTimeout(sweepTimerRef.current);
      sweepTimerRef.current = null;
    }
  }, []);

  const scheduleSweep = useCallback(
    (minDelayMs: number, maxDelayMs: number) => {
      clearSweepTimer();
      const delay = toRandomDelay(minDelayMs, maxDelayMs);
      sweepTimerRef.current = window.setTimeout(() => {
        setSweeping(true);
        sweepTimerRef.current = null;
      }, delay);
    },
    [clearSweepTimer],
  );

  useEffect(() => {
    if (!enabled) {
      setSweeping(false);
      clearSweepTimer();
      return;
    }
    scheduleSweep(initialDelayRangeMs[0], initialDelayRangeMs[1]);
    return () => {
      clearSweepTimer();
    };
  }, [clearSweepTimer, enabled, initialDelayRangeMs, scheduleSweep]);

  const onAnimationEnd = useCallback(
    (event: ReactAnimationEvent<HTMLElement>) => {
      if (event.animationName !== animationName) {
        return;
      }
      setSweeping(false);
      if (!enabled) {
        return;
      }
      scheduleSweep(repeatDelayRangeMs[0], repeatDelayRangeMs[1]);
    },
    [animationName, enabled, repeatDelayRangeMs, scheduleSweep],
  );

  return {
    sweeping,
    onAnimationEnd,
  };
}
