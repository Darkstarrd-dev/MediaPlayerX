import type { CSSProperties } from "react";

import type { AppSettingsStoreSnapshot } from "./useAppSettingsStore";
import type { SynchronousMediaRepository } from "../backend/repository";
import type { MediaLocator } from "../../types";
import type { useI18n } from "../../i18n/useI18n";

export const AUTO_SUBTITLE_ID = "__auto__";
export const NODE_BROWSE_WARMUP_MAX_TARGETS = 96;

export function toAutoSubtitleLanguageLabel(
  language: string | null,
  t: ReturnType<typeof useI18n>["t"],
): string {
  const normalized = (language ?? "").trim().toLowerCase();
  if (normalized === "zh") {
    return t("ui.media.autoSubtitleLanguageZh");
  }
  if (normalized === "en") {
    return t("ui.media.autoSubtitleLanguageEn");
  }
  if (normalized === "ja") {
    return t("ui.media.autoSubtitleLanguageJa");
  }
  if (normalized === "ko") {
    return t("ui.media.autoSubtitleLanguageKo");
  }
  if (normalized === "yue") {
    return t("ui.media.autoSubtitleLanguageYue");
  }
  return t("ui.media.autoSubtitleLanguageAuto");
}

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function normalizeHexColor(
  value: string | null | undefined,
  fallback: string,
): string {
  const normalized = (value ?? "").trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) {
    return fallback;
  }
  return normalized.toLowerCase();
}

function toFiniteNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseHexColor(value: string): [number, number, number] | null {
  const normalized = normalizeHexColor(value, "");
  if (!normalized) {
    return null;
  }
  const red = Number.parseInt(normalized.slice(1, 3), 16);
  const green = Number.parseInt(normalized.slice(3, 5), 16);
  const blue = Number.parseInt(normalized.slice(5, 7), 16);
  if (
    !Number.isFinite(red) ||
    !Number.isFinite(green) ||
    !Number.isFinite(blue)
  ) {
    return null;
  }
  return [red, green, blue];
}

function toHexChannel(value: number): string {
  const channel = Math.max(0, Math.min(255, Math.round(value)));
  return channel.toString(16).padStart(2, "0");
}

function mixHexColors(left: string, right: string, factor: number): string {
  const leftRgb = parseHexColor(left);
  const rightRgb = parseHexColor(right);
  if (!leftRgb || !rightRgb) {
    return normalizeHexColor(left, "#ffffff");
  }
  const t = Math.max(0, Math.min(1, factor));
  const mixedRed = leftRgb[0] + (rightRgb[0] - leftRgb[0]) * t;
  const mixedGreen = leftRgb[1] + (rightRgb[1] - leftRgb[1]) * t;
  const mixedBlue = leftRgb[2] + (rightRgb[2] - leftRgb[2]) * t;
  return `#${toHexChannel(mixedRed)}${toHexChannel(mixedGreen)}${toHexChannel(mixedBlue)}`;
}

function applyGradientCurve(curve: string, point: number): number {
  const x = Math.max(0, Math.min(1, point));
  if (curve === "linear") {
    return x;
  }
  if (curve === "smooth") {
    return x * x * (3 - 2 * x);
  }
  if (curve === "smoother") {
    return x * x * x * (x * (x * 6 - 15) + 10);
  }
  if (curve === "bezier") {
    const u = 1 - x;
    return 3 * u * u * x * 0.1 + 3 * u * x * x + x * x * x;
  }
  return x;
}

function resolveGradientDirection(direction: string): string {
  if (direction === "right-to-left") {
    return "to left";
  }
  if (direction === "top-to-bottom") {
    return "to bottom";
  }
  if (direction === "bottom-to-top") {
    return "to top";
  }
  if (direction === "top-left-to-bottom-right") {
    return "to bottom right";
  }
  if (direction === "top-right-to-bottom-left") {
    return "to bottom left";
  }
  if (direction === "bottom-left-to-top-right") {
    return "to top right";
  }
  if (direction === "bottom-right-to-top-left") {
    return "to top left";
  }
  return "to right";
}

export function buildSubtitleOverlayStyle(
  settings: AppSettingsStoreSnapshot,
): CSSProperties {
  const textFillMode =
    settings.subtitleTextFillMode === "gradient" ? "gradient" : "solid";
  const textColor = normalizeHexColor(settings.subtitleTextColor, "#ffffff");
  const gradientStartColor = normalizeHexColor(
    settings.subtitleGradientStartColor,
    "#ffffff",
  );
  const gradientEndColor = normalizeHexColor(
    settings.subtitleGradientEndColor,
    "#7fd6ff",
  );
  const gradientDirection = resolveGradientDirection(
    settings.subtitleGradientDirection,
  );
  const gradientCurve = settings.subtitleGradientCurve;
  const strokeColor = normalizeHexColor(
    settings.subtitleStrokeColor,
    "#000000",
  );
  const strokeWidth = Math.max(
    0,
    Math.min(8, toFiniteNumber(settings.subtitleStrokeWidth, 2)),
  );
  const strokeShadowColor = normalizeHexColor(
    settings.subtitleStrokeShadowColor,
    "#000000",
  );
  const strokeShadowRadius = Math.max(
    0,
    Math.min(24, toFiniteNumber(settings.subtitleStrokeShadowRadius, 6)),
  );
  const subtitleFontSize = Math.max(
    14,
    Math.min(72, toFiniteNumber(settings.subtitleFontSize, 24)),
  );
  const subtitleMaxLineChars = Math.max(
    8,
    Math.min(80, Math.round(toFiniteNumber(settings.subtitleMaxLineChars, 28))),
  );
  const offsetY = Math.max(
    -400,
    Math.min(400, toFiniteNumber(settings.subtitleOffsetY, 180)),
  );

  const style: CSSProperties = {
    color: textColor,
    fontSize: `${subtitleFontSize.toFixed(0)}px`,
    maxWidth: `min(92%, ${subtitleMaxLineChars}ch)`,
    textShadow: "none",
    filter:
      strokeShadowRadius > 0
        ? `drop-shadow(0 0 ${strokeShadowRadius.toFixed(0)}px ${strokeShadowColor})`
        : "none",
    WebkitTextStroke:
      strokeWidth > 0
        ? `${strokeWidth.toFixed(1)}px ${strokeColor}`
        : "0 transparent",
  };
  (style as Record<string, string>)["--mpx-subtitle-offset-y"] =
    `${offsetY.toFixed(0)}px`;
  (style as Record<string, string>)["--mpx-subtitle-max-line-chars"] =
    String(subtitleMaxLineChars);

  if (textFillMode === "gradient") {
    const points = [0, 0.25, 0.5, 0.75, 1];
    const stops = points.map((point) => {
      const factor = applyGradientCurve(gradientCurve, point);
      const color = mixHexColors(gradientStartColor, gradientEndColor, factor);
      const percent = Math.round(point * 100);
      return `${color} ${percent}%`;
    });
    const styleRecord = style as Record<string, string>;
    style.backgroundImage = `linear-gradient(${gradientDirection}, ${stops.join(", ")})`;
    style.backgroundSize = "100% 100%";
    style.backgroundRepeat = "no-repeat";
    style.backgroundClip = "text";
    style.color = "transparent";
    styleRecord.boxDecorationBreak = "clone";
    styleRecord.WebkitBackgroundClip = "text";
    styleRecord.WebkitBoxDecorationBreak = "clone";
    styleRecord.WebkitTextFillColor = "transparent";
  } else {
    const styleRecord = style as Record<string, string>;
    style.backgroundImage = "none";
    style.backgroundClip = "border-box";
    style.color = textColor;
    styleRecord.WebkitBackgroundClip = "border-box";
    styleRecord.WebkitTextFillColor = textColor;
  }

  return style;
}

export function toAutoSubtitleUiMessage(
  rawMessage: string | null,
  t: ReturnType<typeof useI18n>["t"],
): string | null {
  const normalized = (rawMessage ?? "").trim();
  if (!normalized) {
    return null;
  }

  if (
    normalized.startsWith("subtitle_model_missing_local:") ||
    normalized.startsWith("subtitle_model_files_missing:")
  ) {
    return t("ui.media.autoSubtitleModelFilesMissing");
  }

  if (normalized === "subtitle session API unavailable") {
    return t("ui.media.autoSubtitleUnavailable");
  }

  const exportsIndex = normalized.toLowerCase().indexOf("; exports=");
  if (exportsIndex >= 0) {
    return normalized.slice(0, exportsIndex).trim();
  }

  return normalized;
}

export function isSyncSubtitleRepository(
  repository: unknown,
): repository is SynchronousMediaRepository {
  if (!repository || typeof repository !== "object") {
    return false;
  }

  const candidate = repository as Partial<SynchronousMediaRepository>;
  return (
    typeof candidate.listVideoSubtitlesSync === "function" &&
    typeof candidate.resolveMediaResourceSync === "function"
  );
}

export function toLocatorDto(locator: MediaLocator) {
  if (locator.kind === "filesystem") {
    return {
      kind: "filesystem" as const,
      absolute_path: locator.absolutePath,
      extension: locator.extension,
      media_type: locator.mediaType,
      mime_type: locator.mimeType,
    };
  }
  return {
    kind: "archive-entry" as const,
    archive_path: locator.archivePath,
    archive_format: locator.archiveFormat,
    entry_name: locator.entryName,
    extension: locator.extension,
    media_type: locator.mediaType,
    mime_type: locator.mimeType,
  };
}
