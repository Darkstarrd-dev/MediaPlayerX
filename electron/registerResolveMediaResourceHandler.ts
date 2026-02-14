import { ipcMain } from 'electron'

import { resolveMediaResourceRequestSchema, resolveMediaResourceResponseSchema } from '../src/contracts/backend'
import { BACKEND_CHANNELS } from './channels'
import { MediaAccessError } from './fileSystemMediaAccessGuard'
import { FileSystemMediaReadService } from './fileSystemReadService'
import { isRuntimeDiagnosticsVerboseEnabled, logRuntimeDiagnostic, serializeUnknownError } from './runtimeDiagnostics'

const MEDIA_ACCESS_FALLBACK_URL = 'data:application/octet-stream;base64,'
const MEDIA_ACCESS_FALLBACK_TTL_MS = 60_000

export function registerResolveMediaResourceHandler(ensureService: () => FileSystemMediaReadService): void {
  let resolveMediaResourceCount = 0
  let resolveMediaResourceFailureCount = 0

  ipcMain.handle(BACKEND_CHANNELS.resolveMediaResource, async (_event, payload: unknown) => {
    const request = resolveMediaResourceRequestSchema.parse(payload)
    resolveMediaResourceCount += 1
    try {
      const response = await ensureService().resolveMediaResource(request)
      if (isRuntimeDiagnosticsVerboseEnabled() && resolveMediaResourceCount % 200 === 0) {
        const audit = await ensureService().readMediaAccessAudit()
        logRuntimeDiagnostic('resolve-media-resource-audit', {
          requestCount: resolveMediaResourceCount,
          failureCount: resolveMediaResourceFailureCount,
          audit,
        })
      }
      return resolveMediaResourceResponseSchema.parse(response)
    } catch (error) {
      if (!(error instanceof MediaAccessError)) {
        resolveMediaResourceFailureCount += 1
        if (
          isRuntimeDiagnosticsVerboseEnabled() ||
          resolveMediaResourceFailureCount <= 10 ||
          resolveMediaResourceFailureCount % 50 === 0
        ) {
          logRuntimeDiagnostic(
            'resolve-media-resource-error',
            {
              requestCount: resolveMediaResourceCount,
              failureCount: resolveMediaResourceFailureCount,
              locatorKind: request.locator.kind,
              preferredVariant: request.preferred_variant,
              error: serializeUnknownError(error),
            },
            'warn',
          )
        }
        throw error
      }

      console.warn('resolveMediaResource fallback', {
        reason: error.reason,
      })

      return resolveMediaResourceResponseSchema.parse({
        resource_url: MEDIA_ACCESS_FALLBACK_URL,
        mime_type: 'application/octet-stream',
        expires_at_ms: Date.now() + MEDIA_ACCESS_FALLBACK_TTL_MS,
      })
    }
  })
}
