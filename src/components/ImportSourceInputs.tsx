import type { ChangeEventHandler, RefObject } from 'react'

interface ImportSourceInputsProps {
  fileImportInputRef: RefObject<HTMLInputElement | null>
  folderImportInputRef: RefObject<HTMLInputElement | null>
  onImportFilesSelected: ChangeEventHandler<HTMLInputElement>
  onImportFoldersSelected: ChangeEventHandler<HTMLInputElement>
}

function ImportSourceInputs({
  fileImportInputRef,
  folderImportInputRef,
  onImportFilesSelected,
  onImportFoldersSelected,
}: ImportSourceInputsProps) {
  return (
    <>
      <input ref={fileImportInputRef} multiple style={{ display: 'none' }} type="file" onChange={onImportFilesSelected} />
      <input ref={folderImportInputRef} multiple style={{ display: 'none' }} type="file" onChange={onImportFoldersSelected} />
    </>
  )
}

export default ImportSourceInputs
