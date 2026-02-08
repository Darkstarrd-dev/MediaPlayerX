import type { RepositoryMode } from '../features/backend/repository'
import type { BackendErrorRow } from '../features/app/buildBackendErrorRows'

import BackendErrorBanner from './BackendErrorBanner'
import ImportTaskPanel, { type ImportTaskPanelProps } from './ImportTaskPanel'
import RuntimeWarningBanner from './RuntimeWarningBanner'

interface AppTopBannersProps {
  backendErrorRows: BackendErrorRow[]
  repositoryMode: RepositoryMode
  runtimeWarningVisible: boolean
  runtimeCapabilityWarnings: Array<{
    capability: string
    status: 'available' | 'degraded' | 'unavailable'
    note: string
  }>
  onDismissRuntimeWarning: () => void
  importTaskPanelProps: ImportTaskPanelProps
}

function AppTopBanners({
  backendErrorRows,
  repositoryMode,
  runtimeWarningVisible,
  runtimeCapabilityWarnings,
  onDismissRuntimeWarning,
  importTaskPanelProps,
}: AppTopBannersProps) {
  return (
    <>
      <BackendErrorBanner rows={backendErrorRows} repositoryMode={repositoryMode} />

      <RuntimeWarningBanner
        visible={runtimeWarningVisible}
        warnings={runtimeCapabilityWarnings}
        onDismiss={onDismissRuntimeWarning}
      />

      <ImportTaskPanel {...importTaskPanelProps} />
    </>
  )
}

export default AppTopBanners
