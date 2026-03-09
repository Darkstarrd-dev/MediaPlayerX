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

  it('渲染错误、提示、审核提醒与哈希日志事件块', () => {
    render(
      <ImportTaskPanel
        open={true}
        activeTaskCount={1}
        pendingArchiveCount={2}
        runningArchive={false}
        runningArchiveProgress={null}
        runningArchiveMessage={null}
        thumbnailRunningCount={0}
        thumbnailRunningProgress={null}
        thumbnailRunningMessage={null}
        enqueuePending={false}
        operationHint="hint message"
        taskError="error message"
        tasks={[]}
        pendingReviewNoticeVisible
        pendingReviewTaskCount={3}
        pendingReviewImageCount={12}
        hashReviewLogs={[
          {
            id: 'hash-1',
            compared_count: 12,
            hit_count: 4,
            deleted_count: 3,
            failed_count: 1,
            created_at_ms: 1,
          },
        ]}
        onOpenAdReviewFromPendingNotice={() => {}}
        onDismissPendingReviewNotice={() => {}}
        onRemoveHashReviewLog={() => {}}
        onClose={() => {}}
        onClearFinished={() => {}}
        onClearAll={() => {}}
        onClearOperationHint={() => {}}
        onClearError={() => {}}
        onRetryTask={() => {}}
        onRemoveTask={() => {}}
      />,
    )

    expect(screen.getByText('error message')).toBeInTheDocument()
    expect(screen.getByText('hint message')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="fg-import-task-error"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="fg-import-task-hint"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="fg-import-task-review-notice"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="fg-import-task-hash-log-list"]')).not.toBeNull()
  })
})
