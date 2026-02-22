import { useEffect, useMemo, useRef, useState } from "react";

import type {
  FlushSubtitleSessionResponseDto,
  PushSubtitleAudioRequestDto,
  SubtitleCueDto,
} from "../../contracts/backend";
import {
  VideoSubtitleCapture,
  type CapturedAudioChunk,
} from "./VideoSubtitleCapture";
import {
  emitSubtitleDebug,
  isAbortLikeError,
  readSubtitleDebugBoolean,
  readSubtitleDebugOffsetMode,
  readSubtitleDebugOffsetSec,
} from "./liveSubtitlesDebug";
import {
  appendCues,
  hasCueAtTimeline,
  hasCueNearTimeline,
  isTimelineInRanges,
  resolveActiveGeneratedRange,
  toDisplayCues,
  type GeneratedRangeDto,
} from "./liveSubtitlesCueOps";
import {
  buildDisplayTextByMode,
  detectLatestCueLanguage,
  pickDisplayEventMessage,
} from "./liveSubtitlesDisplay";
import {
  concatFloat32,
  encodeFloat32ToBase64,
  popBatchChunk,
} from "./liveSubtitlesAudioQueue";
import { createLiveSubtitlesRepositoryApi } from "./liveSubtitlesRepositoryApi";
import {
  type PersistenceBatchPayload,
  type PersistenceSyncState,
  type UseLiveSubtitlesParams,
} from "./liveSubtitlesTypes";

export function useLiveSubtitles({
  enabled,
  videoElement,
  videoPath,
  currentTimeSec,
  modelDir,
  modelId,
  providerPreference,
  language,
  validPlaybackRateThreshold,
  renderMode,
  advancedOptions,
  repository,
}: UseLiveSubtitlesParams) {
  const vadPreset = advancedOptions.vad.preset;
  const vadThreshold = advancedOptions.vad.threshold;
  const vadMinSilenceSec = advancedOptions.vad.minSilenceSec;
  const vadMinSpeechSec = advancedOptions.vad.minSpeechSec;
  const vadMaxSpeechSec = advancedOptions.vad.maxSpeechSec;
  const speakerSimilarityThreshold =
    advancedOptions.speaker.similarityThreshold;
  const {
    startSubtitleSession: repositoryStartSubtitleSession,
    stopSubtitleSession: repositoryStopSubtitleSession,
    resetSubtitleSession: repositoryResetSubtitleSession,
    flushSubtitleSession: repositoryFlushSubtitleSession,
    pushSubtitleAudio: repositoryPushSubtitleAudio,
    startSubtitlePersistence: repositoryStartSubtitlePersistence,
    appendSubtitlePersistence: repositoryAppendSubtitlePersistence,
    readSubtitlePersistenceWindow: repositoryReadSubtitlePersistenceWindow,
  } = repository;

  const [cues, setCues] = useState<SubtitleCueDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const capture = useMemo(() => new VideoSubtitleCapture(), []);
  const cleanupRef = useRef<(() => Promise<void>) | null>(null);
  const pushQueueRef = useRef<CapturedAudioChunk[]>([]);
  const pushInFlightRef = useRef(false);
  const sessionRunningRef = useRef(false);
  const sessionEpochRef = useRef(0);
  const chunkSeqRef = useRef(0);
  const lastAppliedSeqRef = useRef(-1);
  const pushAbortRef = useRef<AbortController | null>(null);
  const pushAbortCountRef = useRef(0);
  const subtitleOffsetSecRef = useRef(0);
  const subtitlePersistenceEnabledRef = useRef(false);
  const persistenceQueueRef = useRef<PersistenceBatchPayload[]>([]);
  const persistenceInFlightRef = useRef(false);
  const replayFromPersistenceRef = useRef(false);
  const replayForceUntilSecRef = useRef<number | null>(null);
  const pendingFirstOverlapReplaceRef = useRef(false);
  const firstOverlapReplaceSeekAnchorSecRef = useRef<number | null>(null);
  const persistenceWindowCuesRef = useRef<SubtitleCueDto[]>([]);
  const persistenceWindowRawCuesRef = useRef<SubtitleCueDto[]>([]);
  const persistenceGeneratedRangesRef = useRef<GeneratedRangeDto[]>([]);
  const persistenceReadInFlightRef = useRef(false);
  const persistenceLastReadAtMsRef = useRef(0);
  const persistenceLastReadTimelineSecRef = useRef(-1);
  const replayLockRangeRef = useRef<GeneratedRangeDto | null>(null);
  const highRateReplayHintShownRef = useRef(false);
  const skipCaptureChunksRef = useRef(0);
  const seekingInProgressRef = useRef(false);
  const validPlaybackRateThresholdRef = useRef(1.0);
  const currentValidRangeRef = useRef<GeneratedRangeDto | null>(null);

  useEffect(() => {
    cleanupRef.current = null;
    return () => capture.dispose();
  }, [capture]);

  useEffect(() => {
    const {
      startSubtitleSession,
      stopSubtitleSession,
      resetSubtitleSession,
      flushSubtitleSession,
      pushSubtitleAudio,
      startSubtitlePersistence,
      appendSubtitlePersistence,
      readSubtitlePersistenceWindow,
    } = createLiveSubtitlesRepositoryApi({
      startSubtitleSession: repositoryStartSubtitleSession,
      stopSubtitleSession: repositoryStopSubtitleSession,
      resetSubtitleSession: repositoryResetSubtitleSession,
      flushSubtitleSession: repositoryFlushSubtitleSession,
      pushSubtitleAudio: repositoryPushSubtitleAudio,
      startSubtitlePersistence: repositoryStartSubtitlePersistence,
      appendSubtitlePersistence: repositoryAppendSubtitlePersistence,
      readSubtitlePersistenceWindow: repositoryReadSubtitlePersistenceWindow,
    });

    const abortInFlightPush = () => {
      if (pushAbortRef.current) {
        pushAbortRef.current.abort();
        pushAbortCountRef.current += 1;
      }
      pushAbortRef.current = null;
    };

    const resetPersistenceRuntimeState = () => {
      subtitlePersistenceEnabledRef.current = false;
      persistenceQueueRef.current = [];
      persistenceInFlightRef.current = false;
      replayFromPersistenceRef.current = false;
      replayForceUntilSecRef.current = null;
      pendingFirstOverlapReplaceRef.current = false;
      firstOverlapReplaceSeekAnchorSecRef.current = null;
      persistenceWindowCuesRef.current = [];
      persistenceWindowRawCuesRef.current = [];
      persistenceGeneratedRangesRef.current = [];
      persistenceReadInFlightRef.current = false;
      persistenceLastReadAtMsRef.current = 0;
      persistenceLastReadTimelineSecRef.current = -1;
      replayLockRangeRef.current = null;
      highRateReplayHintShownRef.current = false;
      skipCaptureChunksRef.current = 0;
      currentValidRangeRef.current = null;
    };

    const resetRuntimeState = (options?: {
      detachCapture?: boolean;
      resetEpoch?: boolean;
    }) => {
      abortInFlightPush();
      pushQueueRef.current = [];
      sessionRunningRef.current = false;
      resetPersistenceRuntimeState();
      if (options?.resetEpoch) {
        sessionEpochRef.current = 0;
        chunkSeqRef.current = 0;
        lastAppliedSeqRef.current = -1;
      }
      if (options?.detachCapture) {
        capture.detach();
      }
    };

    if (!enabled || !videoElement || !modelId || modelDir.trim() === "") {
      setLoading(false);
      setMessage(null);
      setCues([]);
      resetRuntimeState({ detachCapture: true, resetEpoch: true });
      return;
    }

    if (
      !startSubtitleSession ||
      !stopSubtitleSession ||
      !resetSubtitleSession ||
      !flushSubtitleSession ||
      !pushSubtitleAudio
    ) {
      setLoading(false);
      setMessage("subtitle session API unavailable");
      setCues([]);
      return;
    }

    let cancelled = false;

    const beginNewEpoch = (reason: string) => {
      if (pushAbortRef.current) {
        pushAbortRef.current.abort();
        pushAbortCountRef.current += 1;
      }
      sessionEpochRef.current += 1;
      chunkSeqRef.current = 0;
      lastAppliedSeqRef.current = -1;
      const droppedQueueLen = pushQueueRef.current.length;
      pushQueueRef.current = [];
      pushAbortRef.current = null;
      persistenceQueueRef.current = [];
      replayFromPersistenceRef.current = false;
      replayForceUntilSecRef.current = null;
      pendingFirstOverlapReplaceRef.current = false;
      firstOverlapReplaceSeekAnchorSecRef.current = null;
      replayLockRangeRef.current = null;
      highRateReplayHintShownRef.current = false;
      skipCaptureChunksRef.current = 0;
      currentValidRangeRef.current = null;
      emitSubtitleDebug("renderer_epoch_begin", {
        reason,
        session_epoch: sessionEpochRef.current,
        dropped_queue_len: droppedQueueLen,
        push_abort_count: pushAbortCountRef.current,
      });
    };

    const startValidRangeIfQualified = () => {
      const playbackRate = Math.max(0.1, videoElement.playbackRate || 1);
      if (playbackRate > validPlaybackRateThresholdRef.current) {
        currentValidRangeRef.current = null;
        return;
      }
      const timelineSec = Math.max(0, videoElement.currentTime || 0);
      currentValidRangeRef.current = {
        start_sec: timelineSec,
        end_sec: timelineSec,
      };
    };

    const updateValidRangeIfQualified = (timelineSec: number) => {
      const playbackRate = Math.max(0.1, videoElement.playbackRate || 1);
      if (playbackRate > validPlaybackRateThresholdRef.current) {
        currentValidRangeRef.current = null;
        return;
      }
      if (!currentValidRangeRef.current) {
        currentValidRangeRef.current = {
          start_sec: timelineSec,
          end_sec: timelineSec,
        };
        return;
      }
      currentValidRangeRef.current = {
        start_sec: currentValidRangeRef.current.start_sec,
        end_sec: Math.max(currentValidRangeRef.current.end_sec, timelineSec),
      };
    };

    const syncPersistenceWindow = async (
      timelineSec: number,
      options?: { hydrateCues?: boolean; force?: boolean },
    ): Promise<PersistenceSyncState> => {
      if (
        !subtitlePersistenceEnabledRef.current ||
        !readSubtitlePersistenceWindow
      ) {
        return {
          timelineHasCue: false,
          timelineHasCueNear: false,
          timelineInGeneratedRange: false,
          activeRange: null,
        };
      }

      const now = performance.now();
      const requestEpoch = sessionEpochRef.current;
      const force = options?.force === true;
      const hydrateCues = options?.hydrateCues === true;
      const minIntervalMs = replayFromPersistenceRef.current ? 180 : 750;
      if (
        !force &&
        now - persistenceLastReadAtMsRef.current < minIntervalMs &&
        Math.abs(timelineSec - persistenceLastReadTimelineSecRef.current) < 1.2
      ) {
        const timelineHasCue = hasCueAtTimeline(
          persistenceWindowCuesRef.current,
          timelineSec,
        );
        const timelineHasCueNear = hasCueNearTimeline(
          persistenceWindowCuesRef.current,
          timelineSec,
        );
        const timelineInGeneratedRange = isTimelineInRanges(
          persistenceGeneratedRangesRef.current,
          timelineSec,
        );
        return {
          timelineHasCue,
          timelineHasCueNear,
          timelineInGeneratedRange,
          activeRange: resolveActiveGeneratedRange(
            persistenceGeneratedRangesRef.current,
            timelineSec,
          ),
        };
      }
      if (persistenceReadInFlightRef.current && !force) {
        const timelineHasCue = hasCueAtTimeline(
          persistenceWindowCuesRef.current,
          timelineSec,
        );
        const timelineHasCueNear = hasCueNearTimeline(
          persistenceWindowCuesRef.current,
          timelineSec,
        );
        const timelineInGeneratedRange = isTimelineInRanges(
          persistenceGeneratedRangesRef.current,
          timelineSec,
        );
        return {
          timelineHasCue,
          timelineHasCueNear,
          timelineInGeneratedRange,
          activeRange: resolveActiveGeneratedRange(
            persistenceGeneratedRangesRef.current,
            timelineSec,
          ),
        };
      }

      persistenceReadInFlightRef.current = true;
      persistenceLastReadAtMsRef.current = now;
      persistenceLastReadTimelineSecRef.current = timelineSec;
      try {
        const response = await readSubtitlePersistenceWindow({
          timeline_sec: timelineSec,
          backtrack_sec: 1.5,
          lookahead_sec: 6,
          limit: 60,
          prefer_persisted_file: true,
        });
        if (requestEpoch !== sessionEpochRef.current) {
          const timelineHasCue = hasCueAtTimeline(
            persistenceWindowCuesRef.current,
            timelineSec,
          );
          const timelineHasCueNear = hasCueNearTimeline(
            persistenceWindowCuesRef.current,
            timelineSec,
          );
          const timelineInGeneratedRange = isTimelineInRanges(
            persistenceGeneratedRangesRef.current,
            timelineSec,
          );
          return {
            timelineHasCue,
            timelineHasCueNear,
            timelineInGeneratedRange,
            activeRange: resolveActiveGeneratedRange(
              persistenceGeneratedRangesRef.current,
              timelineSec,
            ),
          };
        }
        const displayCues = toDisplayCues(response.cues);
        persistenceWindowRawCuesRef.current = response.cues;
        persistenceWindowCuesRef.current = displayCues;
        persistenceGeneratedRangesRef.current = response.generated_ranges;
        if (!cancelled && hydrateCues) {
          setCues(displayCues);
        }
        const timelineHasCueNear = hasCueNearTimeline(displayCues, timelineSec);
        return {
          timelineHasCue: response.timeline_has_cue,
          timelineHasCueNear,
          timelineInGeneratedRange: response.timeline_in_generated_range,
          activeRange: resolveActiveGeneratedRange(
            response.generated_ranges,
            timelineSec,
          ),
        };
      } catch {
        if (
          !cancelled &&
          hydrateCues &&
          requestEpoch === sessionEpochRef.current
        ) {
          setCues([]);
        }
        return {
          timelineHasCue: false,
          timelineHasCueNear: false,
          timelineInGeneratedRange: false,
          activeRange: null,
        };
      } finally {
        persistenceReadInFlightRef.current = false;
      }
    };

    const drainPushQueue = async () => {
      if (pushInFlightRef.current || cancelled || !sessionRunningRef.current) {
        return;
      }
      const nextChunk = popBatchChunk(
        pushQueueRef.current,
        renderMode === "advanced" ? 0.2 : 0.35,
      );
      if (!nextChunk) {
        return;
      }

      const sessionEpoch = sessionEpochRef.current;
      const chunkSeq = chunkSeqRef.current++;
      const queueLenBeforePush = pushQueueRef.current.length;
      const playbackTimeSec = Math.max(0, videoElement.currentTime || 0);
      subtitleOffsetSecRef.current = readSubtitleDebugOffsetSec();
      const offsetMode = readSubtitleDebugOffsetMode();
      const chunkStartSec = nextChunk.startSec;
      const chunkEndSec = nextChunk.endSec;

      pushInFlightRef.current = true;
      try {
        const abortController = new AbortController();
        pushAbortRef.current = abortController;
        const sendAt = performance.now();
        const request: PushSubtitleAudioRequestDto = {
          chunk_base64: encodeFloat32ToBase64(nextChunk.samples),
          sample_rate_hz: nextChunk.sampleRateHz,
          chunk_start_sec: chunkStartSec,
          chunk_end_sec: chunkEndSec,
          channel_count: nextChunk.channelCount,
          session_epoch: sessionEpoch,
          chunk_seq: chunkSeq,
        };
        const response = await pushSubtitleAudio(request, {
          signal: abortController.signal,
        });
        const rttMs = Math.round(performance.now() - sendAt);

        if (response.session_epoch !== sessionEpochRef.current) {
          emitSubtitleDebug("renderer_push_drop_epoch_mismatch", {
            request_epoch: sessionEpoch,
            response_epoch: response.session_epoch,
            chunk_seq: chunkSeq,
          });
          return;
        }
        if (response.chunk_seq < lastAppliedSeqRef.current) {
          emitSubtitleDebug("renderer_push_drop_out_of_order", {
            chunk_seq: response.chunk_seq,
            last_applied_seq: lastAppliedSeqRef.current,
          });
          return;
        }
        lastAppliedSeqRef.current = response.chunk_seq;

        emitSubtitleDebug("renderer_push_result", {
          session_epoch: sessionEpoch,
          chunk_seq: chunkSeq,
          playback_time_sec: Number(playbackTimeSec.toFixed(3)),
          chunk_start_sec: Number(nextChunk.startSec.toFixed(3)),
          chunk_end_sec: Number(nextChunk.endSec.toFixed(3)),
          chunk_duration_sec: Number(
            (nextChunk.endSec - nextChunk.startSec).toFixed(3),
          ),
          asr_chunk_start_sec: Number(chunkStartSec.toFixed(3)),
          asr_chunk_end_sec: Number(chunkEndSec.toFixed(3)),
          queue_len_before_push: queueLenBeforePush,
          queue_len_after_push: pushQueueRef.current.length,
          chunk_rtt_ms: rttMs,
          offset_sec: subtitleOffsetSecRef.current,
          offset_mode: offsetMode,
          push_abort_count: pushAbortCountRef.current,
          response_events: response.events.map((item) => item.code),
          response_cues: response.cues.length,
        });

        if (!cancelled) {
          if (!replayFromPersistenceRef.current) {
            setCues((previous) => appendCues(previous, response.cues));
          }
          const currentPlaybackRate = Math.max(
            0.1,
            videoElement.playbackRate || 1,
          );
          enqueuePersistenceCues(
            response.cues,
            response.session_epoch,
            response.chunk_seq,
            nextChunk.startSec,
            nextChunk.endSec,
            currentPlaybackRate,
          );
        }
      } catch (error) {
        if (!cancelled && !isAbortLikeError(error)) {
          setMessage(error instanceof Error ? error.message : String(error));
          emitSubtitleDebug("renderer_push_error", {
            session_epoch: sessionEpoch,
            chunk_seq: chunkSeq,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } finally {
        pushAbortRef.current = null;
        pushInFlightRef.current = false;
        if (!cancelled) {
          void drainPushQueue();
        }
      }
    };

    const drainPersistenceQueue = async () => {
      if (
        persistenceInFlightRef.current ||
        cancelled ||
        !subtitlePersistenceEnabledRef.current ||
        !appendSubtitlePersistence
      ) {
        return;
      }
      if (persistenceQueueRef.current.length === 0) {
        return;
      }

      persistenceInFlightRef.current = true;
      try {
        const batches = persistenceQueueRef.current;
        persistenceQueueRef.current = [];
        for (const batch of batches) {
          await appendSubtitlePersistence({
            cues: batch.cues,
            session_epoch: batch.sessionEpoch,
            chunk_seq: batch.chunkSeq,
            batch_start_sec: batch.batchStartSec,
            batch_end_sec: batch.batchEndSec,
            playback_rate: batch.playbackRate,
            enforce_valid_range_guard: batch.enforceValidRangeGuard,
            allow_first_overlap_replace_once:
              batch.allowFirstOverlapReplaceOnce,
            seek_anchor_sec: batch.seekAnchorSec,
            current_valid_range: batch.currentValidRange,
          });
        }
      } catch {
        // ignore subtitle persistence failures during playback
      } finally {
        persistenceInFlightRef.current = false;
        if (!cancelled && persistenceQueueRef.current.length > 0) {
          void drainPersistenceQueue();
        }
      }
    };

    const enqueuePersistenceCues = (
      nextCues: SubtitleCueDto[],
      sessionEpoch: number,
      chunkSeq: number,
      batchStartSec: number | null,
      batchEndSec: number | null,
      playbackRate: number,
    ) => {
      if (!subtitlePersistenceEnabledRef.current) {
        return;
      }
      const currentValidRange = currentValidRangeRef.current
        ? {
            start_sec: Number(
              currentValidRangeRef.current.start_sec.toFixed(3),
            ),
            end_sec: Number(currentValidRangeRef.current.end_sec.toFixed(3)),
          }
        : null;
      const enforceValidRangeGuard =
        replayFromPersistenceRef.current || seekingInProgressRef.current;
      let allowFirstOverlapReplaceOnce = false;
      let seekAnchorSec: number | null = null;
      if (nextCues.length > 0 && pendingFirstOverlapReplaceRef.current) {
        allowFirstOverlapReplaceOnce = true;
        seekAnchorSec = firstOverlapReplaceSeekAnchorSecRef.current;
        pendingFirstOverlapReplaceRef.current = false;
        firstOverlapReplaceSeekAnchorSecRef.current = null;
      }
      persistenceQueueRef.current.push({
        cues: nextCues,
        sessionEpoch,
        chunkSeq,
        batchStartSec,
        batchEndSec,
        playbackRate,
        enforceValidRangeGuard,
        allowFirstOverlapReplaceOnce,
        seekAnchorSec,
        currentValidRange,
      });
      void drainPersistenceQueue();
    };

    const handleCuesAndEvents = (response: {
      cues: SubtitleCueDto[];
      events: FlushSubtitleSessionResponseDto["events"];
    }) => {
      if (!replayFromPersistenceRef.current) {
        setCues((previous) => appendCues(previous, response.cues));
      }
      const startSec =
        response.cues.length > 0 ? response.cues[0].start_sec : null;
      const endSec =
        response.cues.length > 0
          ? response.cues[response.cues.length - 1].end_sec
          : null;
      const currentPlaybackRate = videoElement
        ? Math.max(0.1, videoElement.playbackRate || 1)
        : 1.0;
      enqueuePersistenceCues(
        response.cues,
        sessionEpochRef.current,
        Math.max(0, lastAppliedSeqRef.current),
        startSec,
        endSec,
        currentPlaybackRate,
      );
      const displayMessage = pickDisplayEventMessage(response.events);
      if (displayMessage) {
        setMessage(displayMessage);
      }
    };

    const start = async () => {
      setLoading(true);
      setMessage(null);
      setCues([]);
      beginNewEpoch("start");

      try {
        const startResponse = await startSubtitleSession({
          model_dir: modelDir,
          model_id: modelId,
          provider_preference: providerPreference,
          language: language.trim() || "auto",
          fallback_to_cpu: true,
          render_mode: renderMode,
          advanced_options:
            renderMode === "advanced"
              ? {
                  vad: {
                    preset: vadPreset,
                    threshold: vadThreshold,
                    min_silence_sec: vadMinSilenceSec,
                    min_speech_sec: vadMinSpeechSec,
                    max_speech_sec: vadMaxSpeechSec,
                  },
                  speaker: {
                    similarity_threshold: speakerSimilarityThreshold,
                  },
                }
              : undefined,
        });

        if (cancelled) {
          await stopSubtitleSession({ reason: "cancelled-before-ready" }).catch(
            () => undefined,
          );
          return;
        }

        sessionRunningRef.current = true;
        setMessage(pickDisplayEventMessage(startResponse.events));

        subtitlePersistenceEnabledRef.current = false;
        validPlaybackRateThresholdRef.current = 1.0;
        persistenceQueueRef.current = [];
        replayFromPersistenceRef.current = false;
        replayForceUntilSecRef.current = null;
        pendingFirstOverlapReplaceRef.current = false;
        firstOverlapReplaceSeekAnchorSecRef.current = null;
        replayLockRangeRef.current = null;
        highRateReplayHintShownRef.current = false;
        currentValidRangeRef.current = null;
        persistenceWindowCuesRef.current = [];
        persistenceWindowRawCuesRef.current = [];
        persistenceGeneratedRangesRef.current = [];
        persistenceLastReadAtMsRef.current = 0;
        persistenceLastReadTimelineSecRef.current = -1;
        if (startSubtitlePersistence && videoPath && videoPath.trim() !== "") {
          try {
            const persistenceResponse = await startSubtitlePersistence({
              video_path: videoPath,
              language: language.trim() || "auto",
              reset_existing: false,
              valid_playback_rate_threshold: validPlaybackRateThreshold,
            });
            subtitlePersistenceEnabledRef.current = persistenceResponse.enabled;
            if (persistenceResponse.enabled) {
              const timelineSec = Math.max(0, videoElement.currentTime || 0);
              replayFromPersistenceRef.current = true;
              const persistedState = await syncPersistenceWindow(timelineSec, {
                hydrateCues: true,
                force: true,
              });
              const shouldReplayFromPersistence =
                persistedState.timelineInGeneratedRange &&
                persistedState.timelineHasCueNear;
              replayFromPersistenceRef.current = shouldReplayFromPersistence;
              replayLockRangeRef.current = shouldReplayFromPersistence
                ? persistedState.activeRange
                : null;
            }
          } catch (error) {
            subtitlePersistenceEnabledRef.current = false;
            if (!cancelled && !isAbortLikeError(error)) {
              setMessage(
                error instanceof Error ? error.message : String(error),
              );
            }
          }
        }

        await capture.attach(videoElement, (chunk) => {
          if (
            !sessionRunningRef.current ||
            cancelled ||
            videoElement.paused ||
            videoElement.ended
          ) {
            return;
          }

          // 如果正在 seeking，等待窗口刷新完成
          if (seekingInProgressRef.current) {
            emitSubtitleDebug("renderer_skip_generation_during_seeking", {
              timeline_sec: Number(chunk.endSec.toFixed(3)),
            });
            return;
          }

          if (skipCaptureChunksRef.current > 0) {
            skipCaptureChunksRef.current -= 1;
            emitSubtitleDebug("renderer_skip_generation_after_seek_reset", {
              timeline_sec: Number(chunk.endSec.toFixed(3)),
              remaining_skip_chunks: skipCaptureChunksRef.current,
            });
            return;
          }

          const timelineSec = Math.max(0, chunk.endSec);
          const playbackRate = Math.max(0.1, videoElement.playbackRate || 1);
          updateValidRangeIfQualified(timelineSec);

          const replayForceUntilSec = replayForceUntilSecRef.current;
          if (replayForceUntilSec !== null) {
            if (timelineSec <= replayForceUntilSec + 0.02) {
              replayFromPersistenceRef.current = true;
            } else {
              replayForceUntilSecRef.current = null;
            }
          }

          const lockRange = replayLockRangeRef.current;
          if (lockRange) {
            if (
              timelineSec >= lockRange.start_sec - 0.02 &&
              timelineSec <= lockRange.end_sec + 0.03
            ) {
              const lockHasCueNear = hasCueNearTimeline(
                persistenceWindowCuesRef.current,
                timelineSec,
              );
              replayFromPersistenceRef.current = lockHasCueNear;
              if (!lockHasCueNear) {
                replayLockRangeRef.current = null;
              }
            } else if (timelineSec > lockRange.end_sec + 0.03) {
              replayLockRangeRef.current = null;
              replayFromPersistenceRef.current = false;
              setCues([]);
            }
          }

          const cachedHasCue = hasCueAtTimeline(
            persistenceWindowCuesRef.current,
            timelineSec,
          );
          const cachedHasCueNear = hasCueNearTimeline(
            persistenceWindowCuesRef.current,
            timelineSec,
          );

          if (
            playbackRate > 2.05 &&
            subtitlePersistenceEnabledRef.current &&
            readSubtitlePersistenceWindow
          ) {
            replayFromPersistenceRef.current = true;
            if (!highRateReplayHintShownRef.current) {
              highRateReplayHintShownRef.current = true;
              setMessage("播放速度超过 2x：切换为仅回放已生成字幕");
            }
            void syncPersistenceWindow(timelineSec, {
              hydrateCues: true,
              force: false,
            }).then((result) => {
              if (cancelled) {
                return;
              }
              replayFromPersistenceRef.current = true;
              replayLockRangeRef.current = result.timelineInGeneratedRange
                ? result.activeRange
                : null;
            });
            return;
          }
          if (highRateReplayHintShownRef.current && playbackRate <= 2.01) {
            highRateReplayHintShownRef.current = false;
            setMessage((previous) =>
              previous === "播放速度超过 2x：切换为仅回放已生成字幕"
                ? null
                : previous,
            );
          }

          if (
            subtitlePersistenceEnabledRef.current &&
            readSubtitlePersistenceWindow
          ) {
            const cachedInGeneratedRange = isTimelineInRanges(
              persistenceGeneratedRangesRef.current,
              timelineSec,
            );

            if (cachedInGeneratedRange && cachedHasCueNear) {
              replayFromPersistenceRef.current = true;
            } else if (cachedInGeneratedRange && !cachedHasCueNear) {
              replayFromPersistenceRef.current = false;
              replayLockRangeRef.current = null;
            }

            const shouldRefreshPersistence =
              replayFromPersistenceRef.current ||
              cachedInGeneratedRange ||
              Math.abs(
                timelineSec - persistenceLastReadTimelineSecRef.current,
              ) >= 2;
            if (shouldRefreshPersistence) {
              void syncPersistenceWindow(timelineSec, {
                hydrateCues:
                  replayFromPersistenceRef.current ||
                  cachedInGeneratedRange ||
                  cachedHasCue ||
                  cachedHasCueNear,
                force:
                  replayFromPersistenceRef.current || cachedInGeneratedRange,
              }).then((result) => {
                if (cancelled) {
                  return;
                }
                const shouldReplayFromPersistence =
                  result.timelineInGeneratedRange && result.timelineHasCueNear;
                replayFromPersistenceRef.current = shouldReplayFromPersistence;
                replayLockRangeRef.current = shouldReplayFromPersistence
                  ? result.activeRange
                  : null;
              });
            }
          }

          if (replayFromPersistenceRef.current) {
            emitSubtitleDebug("renderer_skip_generation_for_persisted_cue", {
              timeline_sec: Number(timelineSec.toFixed(3)),
            });
            return;
          }

          const highWaterMark =
            playbackRate <= 1.5
              ? renderMode === "advanced"
                ? 18
                : 28
              : playbackRate <= 2.5
                ? renderMode === "advanced"
                  ? 30
                  : 42
                : renderMode === "advanced"
                  ? 50
                  : 60;
          if (pushQueueRef.current.length > highWaterMark) {
            const queueLenBeforeCompaction = pushQueueRef.current.length;
            const first = pushQueueRef.current.shift();
            const second = pushQueueRef.current.shift();
            if (first && second) {
              pushQueueRef.current.unshift({
                sampleRateHz: first.sampleRateHz,
                channelCount: first.channelCount,
                startSec: first.startSec,
                endSec: second.endSec,
                samples: concatFloat32([first.samples, second.samples]),
              });
            } else {
              if (first) {
                pushQueueRef.current.unshift(first);
              }
              if (second) {
                pushQueueRef.current.unshift(second);
              }
            }
            emitSubtitleDebug("renderer_queue_compaction", {
              mode: renderMode,
              high_water_mark: highWaterMark,
              queue_len_before: queueLenBeforeCompaction,
              queue_len_after: pushQueueRef.current.length,
            });
          }
          pushQueueRef.current.push(chunk);
          emitSubtitleDebug("renderer_capture_chunk", {
            mode: renderMode,
            playback_time_sec: Number(
              Math.max(0, videoElement.currentTime || 0).toFixed(3),
            ),
            chunk_start_sec: Number(chunk.startSec.toFixed(3)),
            chunk_end_sec: Number(chunk.endSec.toFixed(3)),
            offset_sec: subtitleOffsetSecRef.current,
            offset_mode: readSubtitleDebugOffsetMode(),
            queue_len: pushQueueRef.current.length,
          });
          void drainPushQueue();
        });

        const onSeeked = () => {
          capture.resetBuffer();
          skipCaptureChunksRef.current = 12;
          beginNewEpoch("seeked");
          replayForceUntilSecRef.current = null;
          currentValidRangeRef.current = null;
          const timelineSec = Math.max(0, videoElement.currentTime || 0);
          seekingInProgressRef.current = true;
          replayFromPersistenceRef.current = true;

          void (async () => {
            let persistedState: PersistenceSyncState = {
              timelineHasCue: false,
              timelineHasCueNear: false,
              timelineInGeneratedRange: false,
              activeRange: null,
            };

            if (
              subtitlePersistenceEnabledRef.current &&
              readSubtitlePersistenceWindow
            ) {
              try {
                persistedState = await syncPersistenceWindow(timelineSec, {
                  hydrateCues: true,
                  force: true,
                });
              } catch {
                if (!cancelled) {
                  setCues([]);
                }
              }
            } else if (!cancelled) {
              setCues([]);
            }

            if (cancelled) {
              return;
            }

            if (
              readSubtitleDebugBoolean("subtitle.debug.suppressControlResets")
            ) {
              emitSubtitleDebug("renderer_control_event_ignored", {
                reason: "seeked",
                current_time_sec: Number(
                  Math.max(0, videoElement.currentTime || 0).toFixed(3),
                ),
              });
            } else {
              await resetSubtitleSession({
                timeline_sec: Math.max(0, videoElement.currentTime || 0),
              }).catch(() => undefined);
            }

            if (cancelled) {
              return;
            }

            if (
              subtitlePersistenceEnabledRef.current &&
              readSubtitlePersistenceWindow
            ) {
              const shouldReplayFromPersistence =
                persistedState.timelineInGeneratedRange &&
                persistedState.timelineHasCueNear;
              replayFromPersistenceRef.current = shouldReplayFromPersistence;
              replayLockRangeRef.current = shouldReplayFromPersistence
                ? persistedState.activeRange
                : null;
              pendingFirstOverlapReplaceRef.current =
                persistedState.timelineInGeneratedRange;
              firstOverlapReplaceSeekAnchorSecRef.current =
                persistedState.timelineInGeneratedRange
                  ? Number(timelineSec.toFixed(3))
                  : null;
              const firstRawCueStartSec =
                persistenceWindowRawCuesRef.current[0]?.start_sec ?? null;
              if (
                persistedState.timelineInGeneratedRange &&
                Number.isFinite(firstRawCueStartSec) &&
                timelineSec < Number(firstRawCueStartSec)
              ) {
                replayForceUntilSecRef.current =
                  Number(firstRawCueStartSec) + 0.05;
              } else {
                replayForceUntilSecRef.current = null;
              }
              emitSubtitleDebug("renderer_seeking_window_refreshed", {
                timeline_sec: Number(timelineSec.toFixed(3)),
                in_generated_range: persistedState.timelineInGeneratedRange,
                has_cue: persistedState.timelineHasCue,
                has_cue_near: persistedState.timelineHasCueNear,
                replay_force_until_sec: replayForceUntilSecRef.current,
              });
            } else {
              replayFromPersistenceRef.current = false;
              replayForceUntilSecRef.current = null;
              pendingFirstOverlapReplaceRef.current = false;
              firstOverlapReplaceSeekAnchorSecRef.current = null;
              replayLockRangeRef.current = null;
            }

            seekingInProgressRef.current = false;
            if (!videoElement.paused) {
              startValidRangeIfQualified();
            }
          })().catch(() => {
            if (!cancelled) {
              replayFromPersistenceRef.current = false;
              replayForceUntilSecRef.current = null;
              pendingFirstOverlapReplaceRef.current = false;
              firstOverlapReplaceSeekAnchorSecRef.current = null;
              replayLockRangeRef.current = null;
              seekingInProgressRef.current = false;
              if (!videoElement.paused) {
                startValidRangeIfQualified();
              }
              setCues([]);
            }
          });
        };
        const onPause = () => {
          currentValidRangeRef.current = null;
          void flushSubtitleSession()
            .then(handleCuesAndEvents)
            .catch(() => undefined);
        };
        const onPlay = () => {
          if (
            readSubtitleDebugBoolean("subtitle.debug.suppressControlResets")
          ) {
            emitSubtitleDebug("renderer_control_event_ignored", {
              reason: "play",
              current_time_sec: Number(
                Math.max(0, videoElement.currentTime || 0).toFixed(3),
              ),
            });
            return;
          }
          beginNewEpoch("play");
          capture.resetBuffer();
          skipCaptureChunksRef.current = 1;
          startValidRangeIfQualified();
          void resetSubtitleSession({
            timeline_sec: Math.max(0, videoElement.currentTime || 0),
          }).catch(() => undefined);
        };
        const onRateChange = () => {
          const playbackRate = Math.max(0.1, videoElement.playbackRate || 1);
          if (playbackRate > validPlaybackRateThresholdRef.current) {
            currentValidRangeRef.current = null;
          } else if (!videoElement.paused) {
            startValidRangeIfQualified();
          }
          if (
            readSubtitleDebugBoolean("subtitle.debug.suppressControlResets")
          ) {
            emitSubtitleDebug("renderer_control_event_ignored", {
              reason: "ratechange",
              current_time_sec: Number(
                Math.max(0, videoElement.currentTime || 0).toFixed(3),
              ),
              playback_rate: Number(playbackRate.toFixed(3)),
            });
            return;
          }
          beginNewEpoch("ratechange");
          capture.resetBuffer();
          skipCaptureChunksRef.current = 1;
          if (
            playbackRate <= validPlaybackRateThresholdRef.current &&
            !videoElement.paused
          ) {
            startValidRangeIfQualified();
          }
          setCues([]);
          void resetSubtitleSession({
            timeline_sec: Math.max(0, videoElement.currentTime || 0),
          }).catch(() => undefined);
        };

        videoElement.addEventListener("seeked", onSeeked);
        videoElement.addEventListener("pause", onPause);
        videoElement.addEventListener("play", onPlay);
        videoElement.addEventListener("ratechange", onRateChange);

        if (!videoElement.paused) {
          startValidRangeIfQualified();
        }

        if (cancelled) {
          videoElement.removeEventListener("seeked", onSeeked);
          videoElement.removeEventListener("pause", onPause);
          videoElement.removeEventListener("play", onPlay);
          videoElement.removeEventListener("ratechange", onRateChange);
          await stopSubtitleSession({ reason: "cancelled-after-ready" }).catch(
            () => undefined,
          );
          resetRuntimeState({ detachCapture: true });
          return;
        }

        setLoading(false);

        cleanupRef.current = async () => {
          videoElement.removeEventListener("seeked", onSeeked);
          videoElement.removeEventListener("pause", onPause);
          videoElement.removeEventListener("play", onPlay);
          videoElement.removeEventListener("ratechange", onRateChange);
          resetRuntimeState({ detachCapture: true });
          await stopSubtitleSession({ reason: "renderer-dispose" }).catch(
            () => undefined,
          );
        };
      } catch (error) {
        if (sessionRunningRef.current) {
          await stopSubtitleSession({ reason: "renderer-start-failed" }).catch(
            () => undefined,
          );
        }
        setLoading(false);
        const messageText =
          error instanceof Error ? error.message : String(error);
        setMessage(messageText);
        setCues([]);
        resetRuntimeState({ detachCapture: true });
      }
    };

    void start();

    return () => {
      cancelled = true;
      const cleanup = cleanupRef.current;
      cleanupRef.current = null;
      if (cleanup) {
        void cleanup();
      } else {
        resetRuntimeState({ detachCapture: true });
        void stopSubtitleSession({ reason: "renderer-dispose" }).catch(
          () => undefined,
        );
      }
    };
  }, [
    capture,
    enabled,
    modelDir,
    modelId,
    videoPath,
    providerPreference,
    language,
    renderMode,
    vadPreset,
    vadThreshold,
    vadMinSilenceSec,
    vadMinSpeechSec,
    vadMaxSpeechSec,
    validPlaybackRateThreshold,
    speakerSimilarityThreshold,
    repositoryFlushSubtitleSession,
    repositoryPushSubtitleAudio,
    repositoryStartSubtitlePersistence,
    repositoryAppendSubtitlePersistence,
    repositoryReadSubtitlePersistenceWindow,
    repositoryResetSubtitleSession,
    repositoryStartSubtitleSession,
    repositoryStopSubtitleSession,
    videoElement,
  ]);

  const activeText = useMemo(() => {
    const subtitleOffsetSec = readSubtitleDebugOffsetSec();
    const offsetMode = readSubtitleDebugOffsetMode();
    return buildDisplayTextByMode(
      cues,
      currentTimeSec,
      subtitleOffsetSec,
      offsetMode,
      renderMode,
    );
  }, [cues, currentTimeSec, renderMode]);

  const detectedLanguage = useMemo(() => detectLatestCueLanguage(cues), [cues]);

  return { loading, message, activeText, detectedLanguage };
}
