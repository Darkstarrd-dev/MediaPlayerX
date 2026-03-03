import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { toErrorMessage as toErrorMessageWithFallback } from "./errorMessageUtils";

export interface ReadSliceState<T> {
  data: T | null;
  snapshot: T | null;
  loading: boolean;
  error: string | null;
  requestId: number;
}

interface ScheduleReadSliceParams<TDto, TData> {
  requestIdRef: MutableRefObject<number>;
  setState: Dispatch<SetStateAction<ReadSliceState<TData>>>;
  fetcher: (signal: AbortSignal) => Promise<TDto>;
  mapDto: (dto: TDto) => TData;
  debounceMs?: number;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function toErrorMessage(error: unknown): string {
  return toErrorMessageWithFallback(error, "unknown_backend_error");
}

export function createEmptySliceState<T>(): ReadSliceState<T> {
  return {
    data: null,
    snapshot: null,
    loading: false,
    error: null,
    requestId: 0,
  };
}

export function scheduleReadSlice<TDto, TData>({
  requestIdRef,
  setState,
  fetcher,
  mapDto,
  debounceMs,
}: ScheduleReadSliceParams<TDto, TData>): () => void {
  const abortController = new AbortController();
  const requestId = requestIdRef.current + 1;
  requestIdRef.current = requestId;

  const runFetch = () => {
    setState((previous) => ({
      ...previous,
      loading: true,
      error: null,
      requestId,
    }));

    fetcher(abortController.signal)
      .then((dto) => {
        if (requestIdRef.current !== requestId) {
          return;
        }

        const mapped = mapDto(dto);
        setState({
          data: mapped,
          snapshot: mapped,
          loading: false,
          error: null,
          requestId,
        });
      })
      .catch((error: unknown) => {
        if (requestIdRef.current !== requestId || isAbortError(error)) {
          return;
        }
        setState((previous) => ({
          ...previous,
          data: previous.snapshot,
          loading: false,
          error: toErrorMessage(error),
          requestId,
        }));
      });
  };

  let timeoutId: ReturnType<typeof window.setTimeout> | null = null;
  if (typeof debounceMs === "number" && debounceMs > 0) {
    timeoutId = window.setTimeout(runFetch, debounceMs);
  } else {
    runFetch();
  }

  return () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    abortController.abort();
  };
}
