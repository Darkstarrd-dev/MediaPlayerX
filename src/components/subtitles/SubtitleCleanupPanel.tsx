import { useEffect, useMemo, useState } from 'react'

import { MainUiIcon } from '../MainUiIcon'
import { useI18n } from '../../i18n/useI18n'
import type {
  ManageSubtitleCleanupTaskDto,
  ReadManageSubtitleCleanupTaskResponseDto,
  RunManageSubtitleCleanupResponseDto,
  SaveManageSubtitleCleanupResponseDto,
  StartManageSubtitleCleanupResponseDto,
} from '../../contracts/backend'

interface SubtitleCleanupPanelProps {
  open: boolean
  videoId: string | null
  videoLabel: string
  llmEndpoint: string
  llmModel: string
  llmPrompt: string
  startSubtitleCleanup?: (request: {
    video_id: string
  }) => Promise<StartManageSubtitleCleanupResponseDto>
  readSubtitleCleanupTask?: (request: { task_id: string }) => Promise<ReadManageSubtitleCleanupTaskResponseDto>
  runSubtitleCleanup?: (request: {
    task_id: string
    llm_endpoint: string
    llm_model: string
    llm_prompt?: string
  }) => Promise<RunManageSubtitleCleanupResponseDto>
  saveSubtitleCleanup?: (request: {
    task_id: string
    cleaned_subtitle_text: string
  }) => Promise<SaveManageSubtitleCleanupResponseDto>
  onSaved: () => void
  onClose: () => void
  onLlmEndpointChange: (value: string) => void
  onLlmModelChange: (value: string) => void
}

function SubtitleCleanupPanel({
  open,
  videoId,
  videoLabel,
  llmEndpoint,
  llmModel,
  llmPrompt,
  startSubtitleCleanup,
  readSubtitleCleanupTask,
  runSubtitleCleanup,
  saveSubtitleCleanup,
  onSaved,
  onClose,
  onLlmEndpointChange,
  onLlmModelChange,
}: SubtitleCleanupPanelProps) {
  const { t } = useI18n()
  const [task, setTask] = useState<ManageSubtitleCleanupTaskDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [cleanedDraft, setCleanedDraft] = useState('')
  const [rawCollapsed, setRawCollapsed] = useState(false)
  const [cleanCollapsed, setCleanCollapsed] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    setTask(null)
    setError(null)
    setPending(false)
    setCleanedDraft('')
    setRawCollapsed(false)
    setCleanCollapsed(false)
  }, [open, videoId])

  useEffect(() => {
    if (!task) {
      return
    }
    setCleanedDraft(task.cleaned_subtitle_text)
  }, [task])

  useEffect(() => {
    if (!open || !task || task.status !== 'running' || !readSubtitleCleanupTask) {
      return
    }
    const timer = window.setInterval(() => {
      void readSubtitleCleanupTask({ task_id: task.task_id })
        .then((response) => {
          if (!response.task) {
            return
          }
          setTask(response.task)
        })
        .catch(() => undefined)
    }, 600)
    return () => {
      window.clearInterval(timer)
    }
  }, [open, readSubtitleCleanupTask, task])

  const canLoadRaw = Boolean(videoId && !pending && task?.status !== 'running')
  const canRunCleanup = Boolean(
    task &&
      task.raw_stage === 'ready' &&
      task.raw_subtitle_text.trim().length > 0 &&
      task.cleanup_stage !== 'running' &&
      llmEndpoint.trim() &&
      llmModel.trim() &&
      !pending,
  )
  const canSave = Boolean(task && task.status !== 'running' && cleanedDraft.trim().length > 0 && !pending)
  const taskStatusText = useMemo(() => {
    if (!task) {
      return t('ui.media.subtitleCleanupIdle')
    }
    if (task.raw_stage === 'running') {
      return t('ui.media.subtitleCleanupRawRunning')
    }
    if (task.cleanup_stage === 'running') {
      return t('ui.media.subtitleCleanupRunning')
    }
    if (task.status === 'failed') {
      return t('ui.media.subtitleCleanupFailed')
    }
    if (task.raw_stage === 'ready' && task.cleanup_stage !== 'ready') {
      return t('ui.media.subtitleCleanupRawReady')
    }
    return t('ui.media.subtitleCleanupReady')
  }, [task, t])

  if (!open) {
    return null
  }

  const startCleanup = async () => {
    if (!videoId) {
      return
    }
    if (!startSubtitleCleanup) {
      setError(t('ui.media.subtitleCleanupUnsupported'))
      return
    }
    setPending(true)
    setError(null)
    try {
      const response = await startSubtitleCleanup({
        video_id: videoId,
      })
      setTask(response.task)
      setCleanedDraft(response.task.cleaned_subtitle_text)
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : String(startError))
    } finally {
      setPending(false)
    }
  }

  const runCleanup = async () => {
    if (!task) {
      return
    }
    if (!runSubtitleCleanup) {
      setError(t('ui.media.subtitleCleanupUnsupported'))
      return
    }
    setPending(true)
    setError(null)
    try {
      const response = await runSubtitleCleanup({
        task_id: task.task_id,
        llm_endpoint: llmEndpoint.trim(),
        llm_model: llmModel.trim(),
        llm_prompt: llmPrompt,
      })
      setTask(response.task)
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : String(runError))
    } finally {
      setPending(false)
    }
  }

  const saveCleanup = async () => {
    if (!task) {
      return
    }
    if (!saveSubtitleCleanup) {
      setError(t('ui.media.subtitleCleanupUnsupported'))
      return
    }
    setPending(true)
    setError(null)
    try {
      const response = await saveSubtitleCleanup({
        task_id: task.task_id,
        cleaned_subtitle_text: cleanedDraft,
      })
      setTask(response.task)
      onSaved()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="settings-mask" data-slot="fg-main-header-manage-subtitle-cleanup-ovl" role="dialog" aria-modal="true" aria-label={t('a11y.media.subtitleCleanupDialog')} data-overlay-close="subtitle-cleanup-panel">
      <section className="settings-panel metadata-fetch-panel" data-slot="fg-main-header-manage-subtitle-cleanup-panel" data-overlay-close="subtitle-cleanup-panel">
        <header className="settings-head metadata-fetch-head">
          <span className="settings-head-spacer" />
          <h2>{t('ui.media.subtitleCleanupTitle')}</h2>
          <button className="feature-action-btn main-icon-square-btn" type="button" aria-label={t('a11y.common.close')} data-tooltip-label={t('tip.common.close')} onClick={onClose}>
            <MainUiIcon name="close" />
          </button>
        </header>

        <div className="metadata-fetch-shell settings-block mpx-scrollbar-hidden">
          <p className="settings-placeholder">{t('ui.media.subtitleCleanupTarget', { label: videoLabel || '-' })}</p>
          <label>
            {t('ui.settings.subtitleCleanupLlmEndpoint')}
            <input type="text" value={llmEndpoint} onChange={(event) => onLlmEndpointChange(event.target.value)} />
          </label>
          <label>
            {t('ui.settings.subtitleCleanupLlmModel')}
            <input type="text" value={llmModel} onChange={(event) => onLlmModelChange(event.target.value)} />
          </label>

          <div className="settings-test-row">
            <button className="feature-action-btn" type="button" disabled={!canLoadRaw} onClick={() => void startCleanup()}>
              {pending ? t('ui.common.loading') : t('ui.media.subtitleCleanupStart')}
            </button>
            <button className="feature-action-btn" type="button" disabled={!canRunCleanup} onClick={() => void runCleanup()}>
              {t('ui.media.subtitleCleanupRun')}
            </button>
            <button className="feature-action-btn" type="button" disabled={!canSave} onClick={() => void saveCleanup()}>
              {t('ui.media.subtitleCleanupSave')}
            </button>
            <span className="settings-placeholder">{taskStatusText}</span>
          </div>

          {task?.message ? <p className="settings-placeholder">{task.message}</p> : null}
          {task?.error_detail ? <p className="settings-danger-text">{task.error_detail}</p> : null}
          {error ? <p className="settings-danger-text">{error}</p> : null}

          <section className="metadata-fetch-preview-card" data-slot="fg-main-header-manage-subtitle-cleanup-raw-preview-panel">
            <button type="button" className="metadata-fetch-preview-toggle" onClick={() => setRawCollapsed((value) => !value)}>
              <span>{t('ui.media.subtitleCleanupRaw')}</span>
              <span className="metadata-fetch-preview-state" aria-hidden="true">
                <MainUiIcon name={rawCollapsed ? 'expand' : 'collapse'} />
              </span>
            </button>
            {!rawCollapsed ? <textarea readOnly value={task?.raw_subtitle_text ?? ''} /> : null}
          </section>

          <section className="metadata-fetch-preview-card" data-slot="fg-main-header-manage-subtitle-cleanup-clean-preview-panel">
            <button type="button" className="metadata-fetch-preview-toggle" onClick={() => setCleanCollapsed((value) => !value)}>
              <span>{t('ui.media.subtitleCleanupCleaned')}</span>
              <span className="metadata-fetch-preview-state" aria-hidden="true">
                <MainUiIcon name={cleanCollapsed ? 'expand' : 'collapse'} />
              </span>
            </button>
            {!cleanCollapsed ? <textarea value={cleanedDraft} onChange={(event) => setCleanedDraft(event.target.value)} /> : null}
          </section>
        </div>
      </section>
    </div>
  )
}

export default SubtitleCleanupPanel
