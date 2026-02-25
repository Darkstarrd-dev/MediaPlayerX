import { useCallback, useMemo, useRef, useState } from "react";

function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

interface UseVideoSeekDraftOptions {
  durationSec: number;
  currentTime: number;
  videoMuted: boolean;
  videoVolume: number;
  onSeekVideo: (time: number) => void;
}

export function useVideoSeekDraft(options: UseVideoSeekDraftOptions): {
  seekDraftTime: number | null;
  displayTime: number;
  progressPercent: number;
  volumePercent: number;
  setSeekDraftTime: (value: number | null) => void;
  commitSeekDraft: () => void;
  commitSeekDraftAndBlur: (input: HTMLInputElement) => void;
  previewSeekDuringDrag: (nextTime: number) => void;
  resetSeekDraft: () => void;
} {
  const { durationSec, currentTime, videoMuted, videoVolume, onSeekVideo } =
    options;
  const [seekDraftTime, setSeekDraftTime] = useState<number | null>(null);
  const lastSeekPreviewAtRef = useRef(0);
  const lastSeekPreviewValueRef = useRef<number | null>(null);

  const safeDuration = Math.max(0, durationSec);
  const clampedTime = clampRange(currentTime, 0, safeDuration);
  const displayTime =
    seekDraftTime == null
      ? clampedTime
      : clampRange(seekDraftTime, 0, safeDuration);
  const progressPercent =
    safeDuration > 0
      ? clampRange((displayTime / safeDuration) * 100, 0, 100)
      : 0;
  const volumePercent = clampRange(videoMuted ? 0 : videoVolume, 0, 100);

  const commitSeekDraft = useCallback(() => {
    if (seekDraftTime == null) {
      return;
    }
    const nextTime = clampRange(seekDraftTime, 0, safeDuration);
    onSeekVideo(nextTime);
    lastSeekPreviewAtRef.current = Date.now();
    lastSeekPreviewValueRef.current = nextTime;
    setSeekDraftTime(null);
  }, [onSeekVideo, safeDuration, seekDraftTime]);

  const commitSeekDraftAndBlur = useCallback(
    (input: HTMLInputElement) => {
      commitSeekDraft();
      input.blur();
    },
    [commitSeekDraft],
  );

  const previewSeekDuringDrag = useCallback(
    (nextTime: number) => {
      const now = Date.now();
      const lastAt = lastSeekPreviewAtRef.current;
      const lastValue = lastSeekPreviewValueRef.current;
      const hasLargeJump =
        lastValue == null || Math.abs(nextTime - lastValue) >= 2;
      if (lastAt !== 0 && now - lastAt < 90 && !hasLargeJump) {
        return;
      }
      onSeekVideo(nextTime);
      lastSeekPreviewAtRef.current = now;
      lastSeekPreviewValueRef.current = nextTime;
    },
    [onSeekVideo],
  );

  const resetSeekDraft = useCallback(() => {
    setSeekDraftTime(null);
    lastSeekPreviewAtRef.current = 0;
    lastSeekPreviewValueRef.current = null;
  }, []);

  return useMemo(
    () => ({
      seekDraftTime,
      displayTime,
      progressPercent,
      volumePercent,
      setSeekDraftTime,
      commitSeekDraft,
      commitSeekDraftAndBlur,
      previewSeekDuringDrag,
      resetSeekDraft,
    }),
    [
      seekDraftTime,
      displayTime,
      progressPercent,
      volumePercent,
      commitSeekDraft,
      commitSeekDraftAndBlur,
      previewSeekDuringDrag,
      resetSeekDraft,
    ],
  );
}
