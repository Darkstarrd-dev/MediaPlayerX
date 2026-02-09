import {
  dataTransferHasFiles,
  extractPathsFromClipboard,
  serializeFile,
} from '../app/helpers'

export function collectNativePaths(files: File[]): string[] {
  const paths = files
    .map((file) => serializeFile(file).path)
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  return Array.from(new Set(paths))
}

export function collectPathsFromDataTransfer(dataTransfer: DataTransfer | null): string[] {
  if (!dataTransfer) {
    return []
  }

  const nativePaths = collectNativePaths(Array.from(dataTransfer.files ?? []))
  const uriPaths = extractPathsFromClipboard(dataTransfer.getData('text/uri-list') ?? '')
  const textPaths = extractPathsFromClipboard(dataTransfer.getData('text/plain') ?? '')
  return Array.from(new Set([...nativePaths, ...uriPaths, ...textPaths]))
}

export function shouldShowDragOverlay(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false
  }

  if (dataTransferHasFiles(dataTransfer)) {
    return true
  }

  try {
    const uriList = dataTransfer.getData('text/uri-list') ?? ''
    const plainText = dataTransfer.getData('text/plain') ?? ''
    return extractPathsFromClipboard(uriList).length > 0 || extractPathsFromClipboard(plainText).length > 0
  } catch {
    return false
  }
}

type DragEventLike = DragEvent | { nativeEvent: DragEvent }

export function isEventImportHandled(event: DragEventLike): boolean {
  const nativeEvent = 'nativeEvent' in event ? event.nativeEvent : event
  return Boolean((nativeEvent as unknown as { __mpx_import_handled__?: boolean }).__mpx_import_handled__)
}

export function markEventImportHandled(event: DragEventLike): void {
  const nativeEvent = 'nativeEvent' in event ? event.nativeEvent : event
  ;(nativeEvent as unknown as { __mpx_import_handled__?: boolean }).__mpx_import_handled__ = true
}
