export type StyleGroup =
  | "default"
  | "soft-skeuomorphic"
  | "liquid-glass"
  | "neobrutalism";

export function resolveStyleGroup(styleId: string): StyleGroup {
  if (styleId.startsWith("soft-skeuomorphic")) {
    return "soft-skeuomorphic";
  }
  if (styleId === "liquid-glass") {
    return "liquid-glass";
  }
  if (styleId === "neobrutalism") {
    return "neobrutalism";
  }
  return "default";
}

export function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeByStep(
  value: number,
  min: number,
  max: number,
  step: number,
): number {
  const clamped = clampValue(value, min, max);
  const stepped = Math.round(clamped / step) * step;
  return Number(stepped.toFixed(step < 1 ? 2 : 0));
}

export function parseNumber(raw: string, fallback: number): number {
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function readCssPxVariable(
  computed: CSSStyleDeclaration,
  variableName: string,
  fallback: number,
): number {
  return parseNumber(computed.getPropertyValue(variableName).trim(), fallback);
}

export function removeVariables(
  root: HTMLElement,
  variableNames: readonly string[],
): void {
  for (const variableName of variableNames) {
    root.style.removeProperty(variableName);
  }
}

export function parseBackdropFilter(
  value: string,
): { blur: number; saturation: number } | null {
  const blurMatch = value.match(/blur\(([-\d.]+)px\)/i);
  const saturationMatch = value.match(/saturate\(([-\d.]+)%\)/i);
  if (!blurMatch || !saturationMatch) {
    return null;
  }
  const blur = Number.parseFloat(blurMatch[1]);
  const saturation = Number.parseFloat(saturationMatch[1]);
  if (!Number.isFinite(blur) || !Number.isFinite(saturation)) {
    return null;
  }
  return { blur, saturation };
}

export function parseFirstPercentValue(raw: string, fallback: number): number {
  const match = raw.match(/([\d.]+)%/);
  if (!match) {
    return fallback;
  }
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : fallback;
}

export function parseFirstPxValueFromShadow(
  raw: string,
  fallback: number,
): number {
  const match = raw.match(/([\d.]+)px/);
  if (!match) {
    return fallback;
  }
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? value : fallback;
}

export function parseFirstNonZeroPxValue(
  raw: string,
  fallback: number,
): number {
  const matches = raw.matchAll(/(-?[\d.]+)px/g);
  for (const match of matches) {
    const value = Number.parseFloat(match[1]);
    if (Number.isFinite(value) && Math.abs(value) > 0.01) {
      return Math.abs(value);
    }
  }
  return fallback;
}
