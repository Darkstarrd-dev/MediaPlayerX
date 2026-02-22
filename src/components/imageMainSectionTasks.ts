export function resolveTaskIdFromStartResponse(
  response: unknown,
): string | null {
  if (!response || typeof response !== "object") {
    return null;
  }
  const directTaskId = (response as { task_id?: unknown }).task_id;
  if (typeof directTaskId === "string" && directTaskId.trim().length > 0) {
    return directTaskId;
  }
  const nestedTaskId = (response as { task?: { task_id?: unknown } }).task
    ?.task_id;
  if (typeof nestedTaskId === "string" && nestedTaskId.trim().length > 0) {
    return nestedTaskId;
  }
  return null;
}
