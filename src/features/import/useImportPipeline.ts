import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEventHandler,
  type RefObject,
} from 'react'

import {
  dataTransferHasFiles,
  extractPathsFromClipboard,
  serializeFile,
  type DataTransferItemWithEntry,
} from '../app/helpers'

interface UseImportPipelineResult {
  fileImportInputRef: RefObject<HTMLInputElement | null>
  folderImportInputRef: RefObject<HTMLInputElement | null>
  dragOverlayActive: boolean
  openImportFilesDialog: () => void
  openImportFoldersDialog: () => void
  onImportFilesSelected: (event: ChangeEvent<HTMLInputElement>) => void
  onImportFoldersSelected: (event: ChangeEvent<HTMLInputElement>) => void
  onDragEnterImport: DragEventHandler<HTMLDivElement>
  onDragOverImport: DragEventHandler<HTMLDivElement>
  onDragLeaveImport: DragEventHandler<HTMLDivElement>
  onDropImport: DragEventHandler<HTMLDivElement>
}

export function useImportPipeline(): UseImportPipelineResult {
  const fileImportInputRef = useRef<HTMLInputElement>(null)
  const folderImportInputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [dragOverlayActive, setDragOverlayActive] = useState(false)

  const openImportFilesDialog = useCallback(() => {
    const input = fileImportInputRef.current
    if (!input) {
      return
    }

    input.value = ''
    input.click()
  }, [])

  const openImportFoldersDialog = useCallback(() => {
    const input = folderImportInputRef.current
    if (!input) {
      return
    }

    input.value = ''
    input.click()
  }, [])

  const onImportFilesSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }

    console.info('导入文件弹窗结果', files.map((file) => serializeFile(file)))
  }, [])

  const onImportFoldersSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }

    const rootFolders = Array.from(
      new Set(
        files
          .map((file) => (file as File & { webkitRelativePath?: string }).webkitRelativePath?.split('/')[0] ?? '')
          .filter(Boolean),
      ),
    )

    console.info('导入文件夹弹窗结果', {
      rootFolders,
      files: files.map((file) => serializeFile(file)),
    })
  }, [])

  useEffect(() => {
    const folderInput = folderImportInputRef.current
    if (!folderInput) {
      return
    }

    folderInput.setAttribute('webkitdirectory', '')
    folderInput.setAttribute('directory', '')
  }, [])

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (!document.hasFocus()) {
        return
      }

      const pastedFiles = Array.from(event.clipboardData?.files ?? [])
      if (pastedFiles.length > 0) {
        console.info('粘贴文件输入', pastedFiles.map((file) => serializeFile(file)))
      }

      const text = event.clipboardData?.getData('text') ?? ''
      const uriList = event.clipboardData?.getData('text/uri-list') ?? ''
      const pastedPaths = Array.from(new Set([...extractPathsFromClipboard(text), ...extractPathsFromClipboard(uriList)]))
      if (pastedPaths.length > 0) {
        console.info('粘贴路径输入', pastedPaths)
      }
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [])

  const onDragEnterImport: DragEventHandler<HTMLDivElement> = (event) => {
    if (!dataTransferHasFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    dragDepthRef.current += 1
    setDragOverlayActive(true)
  }

  const onDropImport: DragEventHandler<HTMLDivElement> = (event) => {
    dragDepthRef.current = 0
    setDragOverlayActive(false)

    if (!dataTransferHasFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()

    const entries: Array<{
      kind: 'file' | 'directory'
      name: string
      fullPath?: string
    }> = []

    for (const item of Array.from(event.dataTransfer.items ?? [])) {
      const entry = (item as DataTransferItemWithEntry).webkitGetAsEntry?.()
      if (!entry) {
        continue
      }

      entries.push({
        kind: entry.isDirectory ? 'directory' : 'file',
        name: entry.name,
        fullPath: entry.fullPath,
      })
    }

    const files = Array.from(event.dataTransfer.files).map((file) => serializeFile(file))
    console.info('拖拽导入输入', {
      entries,
      files,
    })
  }

  const onDragOverImport: DragEventHandler<HTMLDivElement> = (event) => {
    if (!dataTransferHasFiles(event.dataTransfer)) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (!dragOverlayActive) {
      setDragOverlayActive(true)
    }
  }

  const onDragLeaveImport: DragEventHandler<HTMLDivElement> = (event) => {
    if (!dataTransferHasFiles(event.dataTransfer)) {
      return
    }

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) {
      setDragOverlayActive(false)
    }
  }

  return {
    fileImportInputRef,
    folderImportInputRef,
    dragOverlayActive,
    openImportFilesDialog,
    openImportFoldersDialog,
    onImportFilesSelected,
    onImportFoldersSelected,
    onDragEnterImport,
    onDragOverImport,
    onDragLeaveImport,
    onDropImport,
  }
}
