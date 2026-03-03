import { normalizeOptionalPath } from "./pathNormalizationUtils";

export const VISION_TEST_RED_IMAGE_BASE64 =
  "/9j/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCABkAGQDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFgEBAQEAAAAAAAAAAAAAAAAAAAcJ/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AnQBDGqYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/2Q==";

export { normalizeOptionalPath };

export function toDirectoryDefaultPath(value: string): string | undefined {
  const normalized = normalizeOptionalPath(value);
  if (!normalized) {
    return undefined;
  }

  const withoutFragment = normalized.split("#")[0].trim();
  if (!withoutFragment) {
    return undefined;
  }

  const normalizedSlashes = withoutFragment.replace(/\\/g, "/");
  const lastSlashIndex = normalizedSlashes.lastIndexOf("/");
  if (lastSlashIndex < 2) {
    return withoutFragment;
  }

  return withoutFragment.slice(0, lastSlashIndex);
}
