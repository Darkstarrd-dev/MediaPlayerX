export type SidebarNodeKind = "folder" | "package" | "video" | "audio";

export interface ParsedSidebarNodeRef {
  kind: SidebarNodeKind;
  pathKey: string;
}

const DEFAULT_ALLOWED_KINDS: ReadonlySet<SidebarNodeKind> = new Set([
  "folder",
  "package",
  "video",
  "audio",
]);

export function parseSidebarNodeId(
  nodeId: string,
  allowedKinds: ReadonlySet<SidebarNodeKind> = DEFAULT_ALLOWED_KINDS,
): ParsedSidebarNodeRef | null {
  const delimiterIndex = nodeId.indexOf(":");
  if (delimiterIndex <= 0) {
    return null;
  }

  const rawKind = nodeId.slice(0, delimiterIndex);
  if (!allowedKinds.has(rawKind as SidebarNodeKind)) {
    return null;
  }

  const pathKey = nodeId.slice(delimiterIndex + 1);
  if (pathKey.length === 0) {
    return null;
  }

  return {
    kind: rawKind as SidebarNodeKind,
    pathKey,
  };
}

export function pathKeyHasPrefix(pathKey: string, prefix: string): boolean {
  if (pathKey === prefix) {
    return true;
  }
  return pathKey.startsWith(`${prefix}/`);
}
