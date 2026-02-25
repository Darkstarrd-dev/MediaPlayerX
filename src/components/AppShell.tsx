import type { ComponentProps } from 'react'

import AppHeader from './AppHeader'
import AdReviewDeleteOverlay from './AdReviewDeleteOverlay'
import AppTopBanners from './AppTopBanners'
import AppWorkspace from './AppWorkspace'
import ButtonHelpOverlay from './ButtonHelpOverlay'
import DangerConfirmDialog from './DangerConfirmDialog'
import DragImportOverlay from './DragImportOverlay'
import E2eBenchSection from './E2eBenchSection'
import FullscreenLayer from './FullscreenLayer'
import GroupNameDialog from './GroupNameDialog'
import HelpPanel from './HelpPanel'
import ImportSourceInputs from './ImportSourceInputs'
import SidebarRenameDialog from './SidebarRenameDialog'
import SettingsPanel from './SettingsPanel'
import ThemeParameterPanel from './ThemeParameterPanel'
import TooltipLayer from './TooltipLayer'

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
  helpPanelProps: ComponentProps<typeof HelpPanel>
  settingsPanelProps: ComponentProps<typeof SettingsPanel>
  themeParameterPanelProps: ComponentProps<typeof ThemeParameterPanel>
  manageDeleteDialogProps: ComponentProps<typeof DangerConfirmDialog>
  manageGroupDialogProps: ComponentProps<typeof GroupNameDialog>
  sidebarRenameDialogProps: ComponentProps<typeof SidebarRenameDialog>
  dragOverlayActive: boolean
  helpOverlayActive: boolean
  adReviewDeleteOverlayProps: ComponentProps<typeof AdReviewDeleteOverlay>
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
  helpPanelProps,
  settingsPanelProps,
  themeParameterPanelProps,
  manageDeleteDialogProps,
  manageGroupDialogProps,
  sidebarRenameDialogProps,
  dragOverlayActive,
  helpOverlayActive,
  adReviewDeleteOverlayProps,
  e2eBenchSectionProps,
}: AppShellProps) {
  return (
    <div
      className="app"
      data-slot="bg-app-root"
      onDragEnter={onDragEnterImport}
      onDragLeave={onDragLeaveImport}
      onDragOver={onDragOverImport}
      onDrop={onDropImport}
    >
      <AppHeader {...appHeaderProps} />
      <ImportSourceInputs {...importSourceInputsProps} />
      <AppTopBanners {...appTopBannersProps} />
      <AppWorkspace {...appWorkspaceProps} />
      <FullscreenLayer {...fullscreenLayerProps} />
      <HelpPanel {...helpPanelProps} />
      <SettingsPanel {...settingsPanelProps} />
      <ThemeParameterPanel {...themeParameterPanelProps} />
      <DangerConfirmDialog {...manageDeleteDialogProps} />
      <GroupNameDialog {...manageGroupDialogProps} />
      <SidebarRenameDialog {...sidebarRenameDialogProps} />
      <DragImportOverlay active={dragOverlayActive} />
      <ButtonHelpOverlay active={helpOverlayActive} />
      <TooltipLayer suspended={helpOverlayActive || !appHeaderProps.tooltipEnabled} />
      <AdReviewDeleteOverlay {...adReviewDeleteOverlayProps} />
      <E2eBenchSection {...e2eBenchSectionProps} />
    </div>
  )
}

export default AppShell
