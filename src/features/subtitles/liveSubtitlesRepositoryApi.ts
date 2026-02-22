import type { MediaRepository } from "../backend/repository";

export type LiveSubtitlesRepositoryMethods = Pick<
  MediaRepository,
  | "startSubtitleSession"
  | "stopSubtitleSession"
  | "resetSubtitleSession"
  | "flushSubtitleSession"
  | "pushSubtitleAudio"
  | "startSubtitlePersistence"
  | "appendSubtitlePersistence"
  | "readSubtitlePersistenceWindow"
>;

export interface LiveSubtitlesRepositoryApi {
  startSubtitleSession: NonNullable<
    MediaRepository["startSubtitleSession"]
  > | null;
  stopSubtitleSession: NonNullable<
    MediaRepository["stopSubtitleSession"]
  > | null;
  resetSubtitleSession: NonNullable<
    MediaRepository["resetSubtitleSession"]
  > | null;
  flushSubtitleSession: NonNullable<
    MediaRepository["flushSubtitleSession"]
  > | null;
  pushSubtitleAudio: NonNullable<MediaRepository["pushSubtitleAudio"]> | null;
  startSubtitlePersistence: NonNullable<
    MediaRepository["startSubtitlePersistence"]
  > | null;
  appendSubtitlePersistence: NonNullable<
    MediaRepository["appendSubtitlePersistence"]
  > | null;
  readSubtitlePersistenceWindow: NonNullable<
    MediaRepository["readSubtitlePersistenceWindow"]
  > | null;
}

export function createLiveSubtitlesRepositoryApi(
  repository: LiveSubtitlesRepositoryMethods,
): LiveSubtitlesRepositoryApi {
  return {
    startSubtitleSession: repository.startSubtitleSession ?? null,
    stopSubtitleSession: repository.stopSubtitleSession ?? null,
    resetSubtitleSession: repository.resetSubtitleSession ?? null,
    flushSubtitleSession: repository.flushSubtitleSession ?? null,
    pushSubtitleAudio: repository.pushSubtitleAudio ?? null,
    startSubtitlePersistence: repository.startSubtitlePersistence ?? null,
    appendSubtitlePersistence: repository.appendSubtitlePersistence ?? null,
    readSubtitlePersistenceWindow:
      repository.readSubtitlePersistenceWindow ?? null,
  };
}
