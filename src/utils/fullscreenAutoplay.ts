export type FullscreenDisplayMode = "dual" | "video-only" | "image-only";
export type FullscreenImageNavigationSource = "manual" | "autoplay";

interface ResolveFullscreenImageAutoplayEnabledParams {
  fullscreenActive: boolean;
  fullscreenDisplay: FullscreenDisplayMode;
}

export function resolveFullscreenImageAutoplayEnabled({
  fullscreenActive,
  fullscreenDisplay,
}: ResolveFullscreenImageAutoplayEnabledParams): boolean {
  return fullscreenActive && fullscreenDisplay !== "video-only";
}

interface ResolveFullscreenImageNavigationEnabledParams {
  fullscreenActive: boolean;
  fullscreenDisplay: FullscreenDisplayMode;
  fullscreenVideoFocus: boolean;
  source?: FullscreenImageNavigationSource;
}

export function resolveFullscreenImageNavigationEnabled({
  fullscreenActive,
  fullscreenDisplay,
  fullscreenVideoFocus,
  source = "manual",
}: ResolveFullscreenImageNavigationEnabledParams): boolean {
  if (!fullscreenActive) {
    return false;
  }

  if (source === "autoplay") {
    return fullscreenDisplay !== "video-only";
  }

  return (
    fullscreenDisplay === "image-only" ||
    (fullscreenDisplay === "dual" && !fullscreenVideoFocus)
  );
}

interface ResolveFullscreenAutoplayControlEnabledParams {
  imageConvertPreviewActive: boolean;
  fullscreenDisplay: FullscreenDisplayMode;
}

export function resolveFullscreenAutoplayControlEnabled({
  imageConvertPreviewActive,
  fullscreenDisplay,
}: ResolveFullscreenAutoplayControlEnabledParams): boolean {
  return !imageConvertPreviewActive && fullscreenDisplay !== "video-only";
}
