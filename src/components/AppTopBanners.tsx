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
  dualCollapsed?: boolean
  layoutConvergedInsetPx?: number
}

function AppTopBanners({
  backendErrorRows,
  repositoryMode,
  runtimeWarningVisible,
  runtimeCapabilityWarnings,
  onDismissRuntimeWarning,
  importTaskPanelProps,
  dualCollapsed = false,
  layoutConvergedInsetPx = 0,
}: AppTopBannersProps) {
  const hasSysinfo =
    importTaskPanelProps.open || backendErrorRows.length > 0 || runtimeWarningVisible

  if (!hasSysinfo) {
    return null
  }

  return (
    <section
      className="fg-sysinfo"
      data-slot="fg-sysinfo-root"
      role="region"
      aria-label="system info"
      style={
        dualCollapsed
          ? {
              width: '100%',
              maxWidth: `calc(100% - ${layoutConvergedInsetPx}px - (var(--mpx-slot-bg-app-workspace-padding, var(--mpx-layout-padding)) * 2))`,
              marginInline: 'auto',
            }
          : undefined
      }
    >
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
