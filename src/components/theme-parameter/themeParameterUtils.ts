export function formatValue(value: number, step: number): string {
  if (step < 1) {
    return value.toFixed(1);
  }
  return String(Math.round(value));
}

export interface ColorState {
  hex: string;
  alpha: number;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function clampAlpha(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(0, Math.min(1, value));
}

function toHex(channel: number): string {
  return clampByte(channel).toString(16).padStart(2, "0");
}

function parseHexColor(value: string): ColorState | null {
  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(normalized)) {
    const [r, g, b] = normalized.slice(1).split("");
    return {
      hex: `#${r}${r}${g}${g}${b}${b}`,
      alpha: 1,
    };
  }
  if (/^#[0-9a-f]{4}$/.test(normalized)) {
    const [r, g, b, a] = normalized.slice(1).split("");
    return {
      hex: `#${r}${r}${g}${g}${b}${b}`,
      alpha: parseInt(`${a}${a}`, 16) / 255,
    };
  }
  if (/^#[0-9a-f]{6}$/.test(normalized)) {
    return {
      hex: normalized,
      alpha: 1,
    };
  }
  if (/^#[0-9a-f]{8}$/.test(normalized)) {
    return {
      hex: normalized.slice(0, 7),
      alpha: parseInt(normalized.slice(7), 16) / 255,
    };
  }
  return null;
}

function parseRgbColor(value: string): ColorState | null {
  const rgbaMatch = value
    .trim()
    .match(
      /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i,
    );
  if (!rgbaMatch) {
    return null;
  }
  const r = clampByte(Number(rgbaMatch[1]));
  const g = clampByte(Number(rgbaMatch[2]));
  const b = clampByte(Number(rgbaMatch[3]));
  const alphaRaw = rgbaMatch[4];
  const alpha = alphaRaw === undefined ? 1 : clampAlpha(Number(alphaRaw));
  return {
    hex: `#${toHex(r)}${toHex(g)}${toHex(b)}`,
    alpha,
  };
}

export function parseColorState(
  value: string,
  fallbackHex = "#ffffff",
): ColorState | null {
  const parsedHex = parseHexColor(value);
  if (parsedHex) {
    return parsedHex;
  }
  const parsedRgb = parseRgbColor(value);
  if (parsedRgb) {
    return parsedRgb;
  }
  const fallback = parseHexColor(fallbackHex);
  if (!fallback) {
    return null;
  }
  return fallback;
}

export function formatColorStateAsCss({ hex, alpha }: ColorState): string {
  const normalized = parseColorState(hex);
  const effective = normalized ?? { hex: "#ffffff", alpha: 1 };
  const effectiveAlpha = clampAlpha(alpha);
  if (effectiveAlpha >= 0.999) {
    return effective.hex;
  }
  const r = parseInt(effective.hex.slice(1, 3), 16);
  const g = parseInt(effective.hex.slice(3, 5), 16);
  const b = parseInt(effective.hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${Number(effectiveAlpha.toFixed(3))})`;
}

export function readCssColorState(
  computed: CSSStyleDeclaration,
  cssVar: string,
  fallbackHex: string,
): ColorState {
  const raw = computed.getPropertyValue(cssVar).trim();
  return (
    parseColorState(raw, fallbackHex) ?? {
      hex: fallbackHex,
      alpha: 1,
    }
  );
}

export function includesSearch(text: string, keyword: string): boolean {
  return text.toLowerCase().includes(keyword.trim().toLowerCase());
}

export function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("invalid file reader result"));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("file reader failed"));
    };
    reader.readAsText(file);
  });
}
