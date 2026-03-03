export function normalizeOptionalPath(value: string): string | undefined {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function normalizePathForCompare(value: string): string {
  const normalized = value.trim().replace(/\\/g, "/");
  if (typeof window !== "undefined" && /win/i.test(window.navigator.platform)) {
    return normalized.toLowerCase();
  }
  return normalized;
}
