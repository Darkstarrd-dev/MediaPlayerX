import { protocol } from 'electron'

import { MEDIA_PROTOCOL_SCHEME } from './channels'
import { FileSystemMediaReadService } from './fileSystemReadService'
import { isRuntimeDiagnosticsVerboseEnabled, logRuntimeDiagnostic, serializeUnknownError } from './runtimeDiagnostics'

export function registerMediaProtocolHandler(ensureService: () => FileSystemMediaReadService): void {
  let protocolReadFailureCount = 0

  protocol.handle(MEDIA_PROTOCOL_SCHEME, async (request) => {
    const buildCorsHeaders = (headersInit: Record<string, string>): Record<string, string> => {
      const headers = {
        ...headersInit,
      }
      const requestOrigin = request.headers.get('origin')
      headers['access-control-allow-origin'] = requestOrigin ?? '*'
      headers['access-control-expose-headers'] = 'accept-ranges, content-length, content-range, content-type'
      if (requestOrigin) {
        headers.vary = 'Origin'
      }
      return headers
    }

    const requestUrl = new URL(request.url)
    const token = decodeURIComponent(requestUrl.pathname.replace(/^\//, ''))
    if (!token) {
      return new Response('invalid media token', {
        status: 400,
        headers: buildCorsHeaders({ 'content-type': 'text/plain; charset=utf-8' }),
      })
    }

    try {
      const payload = await ensureService().readMediaResourceByTokenStream(token, request.headers.get('range'), request.signal)
      return new Response(payload.body, {
        status: payload.status,
        headers: buildCorsHeaders(payload.headers),
      })
    } catch (error) {
      protocolReadFailureCount += 1
      if (isRuntimeDiagnosticsVerboseEnabled() || protocolReadFailureCount <= 10 || protocolReadFailureCount % 50 === 0) {
        logRuntimeDiagnostic(
          'media-protocol-read-failed',
          {
            count: protocolReadFailureCount,
            tokenPrefix: token.slice(0, 8),
            hasRangeHeader: Boolean(request.headers.get('range')),
            error: serializeUnknownError(error),
          },
          'warn',
        )
      }
      return new Response('media not found', {
        status: 404,
        headers: buildCorsHeaders({ 'content-type': 'text/plain; charset=utf-8' }),
      })
    }
  })
}
