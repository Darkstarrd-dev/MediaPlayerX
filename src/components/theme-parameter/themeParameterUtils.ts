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

function splitCssTopLevel(value: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }
    if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }
    if (char === separator && depth === 0) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function tokenizeCssTopLevelByWhitespace(value: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === "(") {
      depth += 1;
      current += char;
      continue;
    }
    if (char === ")") {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }
    if (/\s/.test(char) && depth === 0) {
      if (current.trim()) {
        parts.push(current.trim());
      }
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

export interface SimpleLinearGradientValue {
  angle: number;
  colorStops: [string, string];
}

export function parseSimpleLinearGradient(
  value: string,
): SimpleLinearGradientValue | null {
  const match = value
    .trim()
    .match(/^linear-gradient\(\s*(-?[\d.]+)deg\s*,(.*)\)$/i);
  if (!match) {
    return null;
  }
  const angle = Number.parseFloat(match[1]);
  if (!Number.isFinite(angle)) {
    return null;
  }
  const args = splitCssTopLevel(match[2], ",");
  if (args.length !== 2) {
    return null;
  }
  return {
    angle,
    colorStops: [args[0], args[1]],
  };
}

export function formatSimpleLinearGradient(
  value: SimpleLinearGradientValue,
): string {
  return `linear-gradient(${value.angle}deg, ${value.colorStops[0]}, ${value.colorStops[1]})`;
}

export interface SimpleFilterFunctionValue {
  name: string;
  numericValue: number;
  unit: string;
}

export function parseSimpleFilterFunction(
  value: string,
): SimpleFilterFunctionValue | null {
  const match = value
    .trim()
    .match(/^([a-z-]+)\(\s*(-?[\d.]+)([%a-z]*)\s*\)$/i);
  if (!match) {
    return null;
  }
  const numericValue = Number.parseFloat(match[2]);
  if (!Number.isFinite(numericValue)) {
    return null;
  }
  return {
    name: match[1],
    numericValue,
    unit: match[3] ?? "",
  };
}

export function formatSimpleFilterFunction(
  value: SimpleFilterFunctionValue,
): string {
  return `${value.name}(${value.numericValue}${value.unit})`;
}

export interface BoxShadowLayerValue {
  inset: boolean;
  offsetX: string;
  offsetY: string;
  blur: string;
  spread: string;
  color: string;
}

const LENGTH_TOKEN_RE = /^-?[\d.]+(?:px|r?em|%|vh|vw|vmin|vmax|ch|ex|pt|pc|cm|mm|in)?$/i;

export function parseBoxShadowValue(value: string): BoxShadowLayerValue[] | null {
  const layers = splitCssTopLevel(value.trim(), ",");
  if (layers.length === 0) {
    return null;
  }

  const parsedLayers = layers.map((layer) => {
    const tokens = tokenizeCssTopLevelByWhitespace(layer);
    if (tokens.length < 3) {
      return null;
    }

    let cursor = 0;
    let inset = false;
    if (tokens[cursor]?.toLowerCase() === "inset") {
      inset = true;
      cursor += 1;
    }

    const lengths: string[] = [];
    while (cursor < tokens.length && LENGTH_TOKEN_RE.test(tokens[cursor])) {
      lengths.push(tokens[cursor]);
      cursor += 1;
    }

    if (lengths.length < 2 || lengths.length > 4) {
      return null;
    }

    const color = tokens.slice(cursor).join(" ");
    if (!color) {
      return null;
    }

    return {
      inset,
      offsetX: lengths[0] ?? "0px",
      offsetY: lengths[1] ?? "0px",
      blur: lengths[2] ?? "0px",
      spread: lengths[3] ?? "0px",
      color,
    } satisfies BoxShadowLayerValue;
  });

  if (parsedLayers.some((layer) => layer === null)) {
    return null;
  }

  return parsedLayers as BoxShadowLayerValue[];
}

export function formatBoxShadowValue(layers: readonly BoxShadowLayerValue[]): string {
  return layers
    .map((layer) => {
      const parts = [
        layer.inset ? "inset" : "",
        layer.offsetX.trim() || "0px",
        layer.offsetY.trim() || "0px",
        layer.blur.trim() || "0px",
        layer.spread.trim() || "0px",
        layer.color.trim() || "#000000",
      ].filter(Boolean);
      return parts.join(" ");
    })
    .join(", ");
}
