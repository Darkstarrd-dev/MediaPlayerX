import type { ComponentProps } from 'react'

import AppHeader from './AppHeader'
import AppTopBanners from './AppTopBanners'
import AppWorkspace from './AppWorkspace'
import DangerConfirmDialog from './DangerConfirmDialog'
import DragImportOverlay from './DragImportOverlay'
import E2eBenchSection from './E2eBenchSection'
import FullscreenLayer from './FullscreenLayer'
import ImportSourceInputs from './ImportSourceInputs'
import SettingsPanel from './SettingsPanel'
import VectorUniverseSection from './VectorUniverseSection'

interface AppShellProps {
  onDragEnterImport: ComponentProps<'div'>['onDragEnter']
  onDragLeaveImport: ComponentProps<'div'>['onDragLeave']
  onDragOverImport: ComponentProps<'div'>['onDragOver']
  onDropImport: ComponentProps<'div'>['onDrop']
  appHeaderProps: ComponentProps<typeof AppHeader>
  importSourceInputsProps: ComponentProps<typeof ImportSourceInputs>
  appTopBannersProps: ComponentProps<typeof AppTopBanners>
  appWorkspaceProps: ComponentProps<typeof AppWorkspace>
  fullscreenLayerProps: ComponentProps<typeof FullscreenLayer>
  vectorUniverseSectionProps: ComponentProps<typeof VectorUniverseSection>
  settingsPanelProps: ComponentProps<typeof SettingsPanel>
  manageDeleteDialogProps: ComponentProps<typeof DangerConfirmDialog>
  dragOverlayActive: boolean
  e2eBenchSectionProps: ComponentProps<typeof E2eBenchSection>
}

function AppShell({
  onDragEnterImport,
  onDragLeaveImport,
  onDragOverImport,
  onDropImport,
  appHeaderProps,
  importSourceInputsProps,
  appTopBannersProps,
  appWorkspaceProps,
  fullscreenLayerProps,
  vectorUniverseSectionProps,
  settingsPanelProps,
  manageDeleteDialogProps,
  dragOverlayActive,
  e2eBenchSectionProps,
}: AppShellProps) {
  return (
    <div className="app" onDragEnter={onDragEnterImport} onDragLeave={onDragLeaveImport} onDragOver={onDragOverImport} onDrop={onDropImport}>
      <AppHeader {...appHeaderProps} />
      <ImportSourceInputs {...importSourceInputsProps} />
      <AppTopBanners {...appTopBannersProps} />
      <AppWorkspace {...appWorkspaceProps} />
      <FullscreenLayer {...fullscreenLayerProps} />
      <VectorUniverseSection {...vectorUniverseSectionProps} />
      <SettingsPanel {...settingsPanelProps} />
      <DangerConfirmDialog {...manageDeleteDialogProps} />
      <DragImportOverlay active={dragOverlayActive} />
      <E2eBenchSection {...e2eBenchSectionProps} />
    </div>
  )
}

export default AppShell
