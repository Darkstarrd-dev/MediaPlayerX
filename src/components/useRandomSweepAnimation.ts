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
  triggerKey?: string | number | boolean | null;
  playOnEnable?: boolean;
  playOnEnableDelayRangeMs?: readonly [number, number];
  idleReplayEnabled?: boolean;
  idleThresholdMs?: number;
  idleDelayRangeMs?: readonly [number, number];
  stopOnInteraction?: boolean;
  canReplayWhenIdle?: () => boolean;

  /**
   * 兼容旧参数：保留后续迁移窗口，含义映射如下
   * initialDelayRangeMs -> playOnEnableDelayRangeMs
   * repeatDelayRangeMs  -> idleDelayRangeMs
   */
  initialDelayRangeMs?: readonly [number, number];
  repeatDelayRangeMs?: readonly [number, number];
}

interface UseRandomSweepAnimationResult {
  sweeping: boolean;
  onAnimationEnd: (event: ReactAnimationEvent<HTMLElement>) => void;
}

const INTERACTION_EVENT_TYPES = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
] as const;

let lastInteractionAtMs = Date.now();
let interactionWatcherRefCount = 0;
const interactionListeners = new Set<() => void>();

function notifyInteractionListeners(): void {
  lastInteractionAtMs = Date.now();
  for (const listener of interactionListeners) {
    listener();
  }
}

function onGlobalInteraction(): void {
  notifyInteractionListeners();
}

function attachGlobalInteractionWatchers(): void {
  if (typeof window === "undefined") {
    return;
  }
  for (const eventType of INTERACTION_EVENT_TYPES) {
    window.addEventListener(eventType, onGlobalInteraction, true);
  }
}

function detachGlobalInteractionWatchers(): void {
  if (typeof window === "undefined") {
    return;
  }
  for (const eventType of INTERACTION_EVENT_TYPES) {
    window.removeEventListener(eventType, onGlobalInteraction, true);
  }
}

function subscribeGlobalInteraction(listener: () => void): () => void {
  interactionListeners.add(listener);
  interactionWatcherRefCount += 1;
  if (interactionWatcherRefCount === 1) {
    attachGlobalInteractionWatchers();
  }
  return () => {
    interactionListeners.delete(listener);
    interactionWatcherRefCount = Math.max(0, interactionWatcherRefCount - 1);
    if (interactionWatcherRefCount === 0) {
      detachGlobalInteractionWatchers();
    }
  };
}

export function canReplaySweepWhenGlobalMediaIdle(): boolean {
  if (typeof document === "undefined") {
    return true;
  }
  const dataset = document.documentElement.dataset;
  const videoPlaying = dataset.mpxVideoPlaying === "1";
  const musicShaderPlaying = dataset.mpxMusicShaderPlaying === "1";
  return !videoPlaying && !musicShaderPlaying;
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
    triggerKey,
    playOnEnable = true,
    playOnEnableDelayRangeMs = options.initialDelayRangeMs ?? [240, 960],
    idleReplayEnabled = true,
    idleThresholdMs = 120000,
    idleDelayRangeMs = options.repeatDelayRangeMs ?? [150000, 480000],
    stopOnInteraction = true,
    canReplayWhenIdle,
  } = options;
  const [sweeping, setSweeping] = useState(false);
  const sweepTimerRef = useRef<number | null>(null);
  const enabledRef = useRef(enabled);
  const idleReplayEnabledRef = useRef(idleReplayEnabled);
  const idleThresholdMsRef = useRef(idleThresholdMs);
  const idleDelayRangeMsRef = useRef(idleDelayRangeMs);
  const stopOnInteractionRef = useRef(stopOnInteraction);
  const canReplayWhenIdleRef = useRef(canReplayWhenIdle);
  const triggerKeyRef = useRef(triggerKey);

  enabledRef.current = enabled;
  idleReplayEnabledRef.current = idleReplayEnabled;
  idleThresholdMsRef.current = idleThresholdMs;
  idleDelayRangeMsRef.current = idleDelayRangeMs;
  stopOnInteractionRef.current = stopOnInteraction;
  canReplayWhenIdleRef.current = canReplayWhenIdle;

  const clearSweepTimer = useCallback(() => {
    if (sweepTimerRef.current !== null) {
      window.clearTimeout(sweepTimerRef.current);
      sweepTimerRef.current = null;
    }
  }, []);

  const tryStartSweep = useCallback(() => {
    if (!enabledRef.current) {
      return;
    }
    setSweeping(true);
  }, []);

  const scheduleIdleReplayAttempt = useCallback(
    (minDelayMs: number, maxDelayMs: number) => {
      clearSweepTimer();
      const delay = toRandomDelay(minDelayMs, maxDelayMs);
      sweepTimerRef.current = window.setTimeout(() => {
        const idleDurationMs = Date.now() - lastInteractionAtMs;
        const mediaReady = canReplayWhenIdleRef.current
          ? canReplayWhenIdleRef.current()
          : true;
        const idleReady = idleDurationMs >= idleThresholdMsRef.current;

        if (
          enabledRef.current &&
          idleReplayEnabledRef.current &&
          idleReady &&
          mediaReady
        ) {
          setSweeping(true);
        } else if (enabledRef.current && idleReplayEnabledRef.current) {
          const [nextMinDelay, nextMaxDelay] = idleDelayRangeMsRef.current;
          scheduleIdleReplayAttempt(nextMinDelay, nextMaxDelay);
        }

        sweepTimerRef.current = null;
      }, delay);
    },
    [clearSweepTimer],
  );

  const scheduleEnableSweep = useCallback(
    (minDelayMs: number, maxDelayMs: number) => {
      clearSweepTimer();
      const delay = toRandomDelay(minDelayMs, maxDelayMs);
      sweepTimerRef.current = window.setTimeout(() => {
        tryStartSweep();
        sweepTimerRef.current = null;
      }, delay);
    },
    [clearSweepTimer, tryStartSweep],
  );

  useEffect(() => {
    if (!enabled) {
      setSweeping(false);
      clearSweepTimer();
      triggerKeyRef.current = triggerKey;
      return;
    }
    if (playOnEnable) {
      scheduleEnableSweep(
        playOnEnableDelayRangeMs[0],
        playOnEnableDelayRangeMs[1],
      );
    }
    triggerKeyRef.current = triggerKey;
    return () => {
      clearSweepTimer();
    };
  }, [
    clearSweepTimer,
    enabled,
    playOnEnable,
    playOnEnableDelayRangeMs,
    scheduleEnableSweep,
    triggerKey,
  ]);

  useEffect(() => {
    if (!enabled) {
      triggerKeyRef.current = triggerKey;
      return;
    }

    const previousTriggerKey = triggerKeyRef.current;
    triggerKeyRef.current = triggerKey;
    if (triggerKey == null || previousTriggerKey === triggerKey) {
      return;
    }

    clearSweepTimer();
    tryStartSweep();
  }, [clearSweepTimer, enabled, triggerKey, tryStartSweep]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    return subscribeGlobalInteraction(() => {
      if (stopOnInteractionRef.current) {
        setSweeping(false);
      }
      clearSweepTimer();
      if (!enabledRef.current || !idleReplayEnabledRef.current) {
        return;
      }
      const [nextMinDelay, nextMaxDelay] = idleDelayRangeMsRef.current;
      scheduleIdleReplayAttempt(nextMinDelay, nextMaxDelay);
    });
  }, [clearSweepTimer, enabled, scheduleIdleReplayAttempt]);

  const onAnimationEnd = useCallback(
    (event: ReactAnimationEvent<HTMLElement>) => {
      if (event.animationName !== animationName) {
        return;
      }
      setSweeping(false);
      if (!enabledRef.current || !idleReplayEnabledRef.current) {
        return;
      }
      scheduleIdleReplayAttempt(
        idleDelayRangeMsRef.current[0],
        idleDelayRangeMsRef.current[1],
      );
    },
    [animationName, scheduleIdleReplayAttempt],
  );

  return {
    sweeping,
    onAnimationEnd,
  };
}
