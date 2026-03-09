import type { CSSProperties } from "react";

export function buildSkeuoRangeStyle(value: number, min = 0, max = 100) {
  const percent =
    max <= min ? 0 : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  return {
    "--mpx-skeuo-range-pct": `${percent}%`,
  } as CSSProperties;
}
