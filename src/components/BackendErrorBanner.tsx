import type { RepositoryMode } from '../features/backend/repository'
import type { BackendErrorRow } from '../features/app/buildBackendErrorRows'

interface BackendErrorBannerProps {
  rows: BackendErrorRow[]
  repositoryMode: RepositoryMode
}

function BackendErrorBanner({ rows, repositoryMode }: BackendErrorBannerProps) {
  if (rows.length === 0) {
    return null
  }

  return (
    <section className="backend-error-banner sysinfo-card-shell" data-slot="fg-sysinfo-backend-error" role="status" aria-live="polite">
      <header>
        <strong>{`后端读取异常（${repositoryMode}）`}</strong>
      </header>
      <ul>
        {rows.map((row) => (
          <li key={row.key}>
            <span>{`${row.label}: ${row.message}`}</span>
            {row.onRetry ? (
              <button type="button" onClick={row.onRetry}>
                重试
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

export default BackendErrorBanner
