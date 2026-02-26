import type { MutableRefObject } from "react";

import { emitSubtitleDebug } from "./liveSubtitlesDebug";
import type { GeneratedRangeDto } from "./liveSubtitlesCueOps";

interface RuntimeStateRefs {
  pushAbortRef: MutableRefObject<AbortController | null>;
  pushAbortCountRef: MutableRefObject<number>;
  pushQueueRef: MutableRefObject<Array<unknown>>;
  sessionRunningRef: MutableRefObject<boolean>;
  sessionEpochRef: MutableRefObject<number>;
  chunkSeqRef: MutableRefObject<number>;
  lastAppliedSeqRef: MutableRefObject<number>;
  subtitlePersistenceEnabledRef: MutableRefObject<boolean>;
  persistenceQueueRef: MutableRefObject<Array<unknown>>;
  persistenceInFlightRef: MutableRefObject<boolean>;
  replayFromPersistenceRef: MutableRefObject<boolean>;
  replayForceUntilSecRef: MutableRefObject<number | null>;
  pendingFirstOverlapReplaceRef: MutableRefObject<boolean>;
  firstOverlapReplaceSeekAnchorSecRef: MutableRefObject<number | null>;
  persistenceWindowCuesRef: MutableRefObject<Array<unknown>>;
  persistenceWindowRawCuesRef: MutableRefObject<Array<unknown>>;
  persistenceGeneratedRangesRef: MutableRefObject<GeneratedRangeDto[]>;
  persistenceReadInFlightRef: MutableRefObject<boolean>;
  persistenceLastReadAtMsRef: MutableRefObject<number>;
  persistenceLastReadTimelineSecRef: MutableRefObject<number>;
  replayLockRangeRef: MutableRefObject<GeneratedRangeDto | null>;
  highRateReplayHintShownRef: MutableRefObject<boolean>;
  skipCaptureChunksRef: MutableRefObject<number>;
  currentValidRangeRef: MutableRefObject<GeneratedRangeDto | null>;
}

interface ValidRangeStateRefs {
  validPlaybackRateThresholdRef: MutableRefObject<number>;
  currentValidRangeRef: MutableRefObject<GeneratedRangeDto | null>;
}

export function abortInFlightPushRuntime(
  pushAbortRef: MutableRefObject<AbortController | null>,
  pushAbortCountRef: MutableRefObject<number>,
): void {
  if (pushAbortRef.current) {
    pushAbortRef.current.abort();
    pushAbortCountRef.current += 1;
  }
  pushAbortRef.current = null;
}

export function resetPersistenceRuntimeState(refs: RuntimeStateRefs): void {
  refs.subtitlePersistenceEnabledRef.current = false;
  refs.persistenceQueueRef.current = [];
  refs.persistenceInFlightRef.current = false;
  refs.replayFromPersistenceRef.current = false;
  refs.replayForceUntilSecRef.current = null;
  refs.pendingFirstOverlapReplaceRef.current = false;
  refs.firstOverlapReplaceSeekAnchorSecRef.current = null;
  refs.persistenceWindowCuesRef.current = [];
  refs.persistenceWindowRawCuesRef.current = [];
  refs.persistenceGeneratedRangesRef.current = [];
  refs.persistenceReadInFlightRef.current = false;
  refs.persistenceLastReadAtMsRef.current = 0;
  refs.persistenceLastReadTimelineSecRef.current = -1;
  refs.replayLockRangeRef.current = null;
  refs.highRateReplayHintShownRef.current = false;
  refs.skipCaptureChunksRef.current = 0;
  refs.currentValidRangeRef.current = null;
}

export function resetRuntimeState(
  refs: RuntimeStateRefs,
  options?: {
    detachCapture?: boolean;
    resetEpoch?: boolean;
    detachCaptureFn?: () => void;
  },
): void {
  abortInFlightPushRuntime(refs.pushAbortRef, refs.pushAbortCountRef);
  refs.pushQueueRef.current = [];
  refs.sessionRunningRef.current = false;
  resetPersistenceRuntimeState(refs);
  if (options?.resetEpoch) {
    refs.sessionEpochRef.current = 0;
    refs.chunkSeqRef.current = 0;
    refs.lastAppliedSeqRef.current = -1;
  }
  if (options?.detachCapture && options.detachCaptureFn) {
    options.detachCaptureFn();
  }
}

export function beginNewEpochState(
  refs: RuntimeStateRefs,
  reason: string,
): void {
  abortInFlightPushRuntime(refs.pushAbortRef, refs.pushAbortCountRef);
  refs.sessionEpochRef.current += 1;
  refs.chunkSeqRef.current = 0;
  refs.lastAppliedSeqRef.current = -1;
  const droppedQueueLen = refs.pushQueueRef.current.length;
  refs.pushQueueRef.current = [];
  refs.persistenceQueueRef.current = [];
  refs.replayFromPersistenceRef.current = false;
  refs.replayForceUntilSecRef.current = null;
  refs.pendingFirstOverlapReplaceRef.current = false;
  refs.firstOverlapReplaceSeekAnchorSecRef.current = null;
  refs.replayLockRangeRef.current = null;
  refs.highRateReplayHintShownRef.current = false;
  refs.skipCaptureChunksRef.current = 0;
  refs.currentValidRangeRef.current = null;
  emitSubtitleDebug("renderer_epoch_begin", {
    reason,
    session_epoch: refs.sessionEpochRef.current,
    dropped_queue_len: droppedQueueLen,
    push_abort_count: refs.pushAbortCountRef.current,
  });
}

export function startValidRangeIfQualifiedState(
  videoElement: HTMLVideoElement,
  refs: ValidRangeStateRefs,
): void {
  const playbackRate = Math.max(0.1, videoElement.playbackRate || 1);
  if (playbackRate > refs.validPlaybackRateThresholdRef.current) {
    refs.currentValidRangeRef.current = null;
    return;
  }
  const timelineSec = Math.max(0, videoElement.currentTime || 0);
  refs.currentValidRangeRef.current = {
    start_sec: timelineSec,
    end_sec: timelineSec,
  };
}

export function updateValidRangeIfQualifiedState(
  videoElement: HTMLVideoElement,
  refs: ValidRangeStateRefs,
  timelineSec: number,
): void {
  const playbackRate = Math.max(0.1, videoElement.playbackRate || 1);
  if (playbackRate > refs.validPlaybackRateThresholdRef.current) {
    refs.currentValidRangeRef.current = null;
    return;
  }
  if (!refs.currentValidRangeRef.current) {
    refs.currentValidRangeRef.current = {
      start_sec: timelineSec,
      end_sec: timelineSec,
    };
    return;
  }
  refs.currentValidRangeRef.current = {
    start_sec: refs.currentValidRangeRef.current.start_sec,
    end_sec: Math.max(refs.currentValidRangeRef.current.end_sec, timelineSec),
  };
}
