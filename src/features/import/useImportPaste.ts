import { useEffect } from 'react'

import { extractPathsFromClipboard } from '../app/helpers'
import type { ReadonlyMediaRepository } from '../backend/repository'
import { collectNativePaths } from './importPathUtils'

interface UseImportPasteParams {
  repository: ReadonlyMediaRepository
  timeoutMs: number
  enqueuePastePaths: (paths: string[]) => void
  onError: (error: unknown) => void
}

export function useImportPaste({
  repository,
  timeoutMs,
  enqueuePastePaths,
  onError,
}: UseImportPasteParams): void {
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (!document.hasFocus()) {
        return
      }

      const activeElement = document.activeElement as HTMLElement | null
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable)
      ) {
        return
      }

      const pastedFiles = Array.from(event.clipboardData?.files ?? [])
      const text = event.clipboardData?.getData('text') ?? ''
      const uriList = event.clipboardData?.getData('text/uri-list') ?? ''
      const pastedPaths = Array.from(new Set([...extractPathsFromClipboard(text), ...extractPathsFromClipboard(uriList)]))

      const filePaths = collectNativePaths(pastedFiles)
      const mergedPaths = Array.from(new Set([...filePaths, ...pastedPaths]))
      if (mergedPaths.length > 0) {
        event.preventDefault()
        enqueuePastePaths(mergedPaths)
        return
      }

      const clipboardReader = repository.readClipboardImportPaths
      if (!clipboardReader) {
        return
      }

      event.preventDefault()
      void clipboardReader({ timeoutMs })
        .then((response) => {
          if (response.paths.length > 0) {
            enqueuePastePaths(response.paths)
          }
        })
        .catch((error: unknown) => {
          onError(error)
        })
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [enqueuePastePaths, onError, repository, timeoutMs])
}
