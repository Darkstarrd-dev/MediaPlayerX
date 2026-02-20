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
  const hasSysinfo =
    importTaskPanelProps.open || backendErrorRows.length > 0 || runtimeWarningVisible

  if (!hasSysinfo) {
    return null
  }

  return (
    <section className="fg-sysinfo" role="region" aria-label="system info">
      <BackendErrorBanner rows={backendErrorRows} repositoryMode={repositoryMode} />

      <RuntimeWarningBanner
        visible={runtimeWarningVisible}
        warnings={runtimeCapabilityWarnings}
        onDismiss={onDismissRuntimeWarning}
      />

      <ImportTaskPanel {...importTaskPanelProps} />
    </section>
  )
}

export default AppTopBanners
