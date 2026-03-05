import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ImportTaskPanel from './ImportTaskPanel'

describe('ImportTaskPanel', () => {
  it('以 overlay 大面板形态渲染', () => {
    const { container } = render(
      <ImportTaskPanel
        open={true}
        activeTaskCount={0}
        pendingArchiveCount={0}
        runningArchive={false}
        runningArchiveProgress={null}
        runningArchiveMessage={null}
        thumbnailRunningCount={0}
        thumbnailRunningProgress={null}
        thumbnailRunningMessage={null}
        enqueuePending={false}
        operationHint={null}
        taskError={null}
        tasks={[]}
        onClose={() => {}}
        onClearFinished={() => {}}
        onClearAll={() => {}}
        onClearOperationHint={() => {}}
        onClearError={() => {}}
        onRetryTask={() => {}}
        onRemoveTask={() => {}}
      />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    const overlay = container.querySelector('[data-slot="fg-import-task-ovl"]')
    const panel = container.querySelector('[data-slot="fg-import-task-root"]')
    expect(overlay).toHaveAttribute('data-overlay-close', 'import-task-panel')
    expect(panel).toHaveAttribute('data-overlay-close', 'import-task-panel')
  })
})
