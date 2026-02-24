import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import AppTopBanners from './AppTopBanners'

const importTaskPanelProps = {
  open: true,
  activeTaskCount: 0,
  pendingArchiveCount: 0,
  runningArchive: false,
  runningArchiveProgress: null,
  runningArchiveMessage: null,
  thumbnailRunningCount: 0,
  thumbnailRunningProgress: null,
  thumbnailRunningMessage: null,
  enqueuePending: false,
  taskError: null,
  tasks: [],
  onClose: () => {},
  onClearFinished: () => {},
  onClearAll: () => {},
  onClearError: () => {},
  onRetryTask: () => {},
  onRemoveTask: () => {},
}

describe('AppTopBanners', () => {
  it('双侧折叠时与 main 使用同一收敛宽度', () => {
    render(
      <AppTopBanners
        backendErrorRows={[]}
        repositoryMode="real"
        runtimeWarningVisible={false}
        runtimeCapabilityWarnings={[]}
        onDismissRuntimeWarning={() => {}}
        importTaskPanelProps={importTaskPanelProps}
        dualCollapsed={true}
        layoutConvergedInsetPx={80}
      />,
    )

    const section = screen.getByRole('region', { name: 'system info' })
    expect(section).toBeInTheDocument()
    expect(section).toHaveStyle({ width: '100%' })
    expect(section).toHaveStyle({ marginInline: 'auto' })
    expect(section).toHaveStyle({
      maxWidth:
        'calc(100% - 80px - (var(--mpx-slot-bg-app-workspace-padding, var(--mpx-layout-padding)) * 2))',
    })
  })
})
