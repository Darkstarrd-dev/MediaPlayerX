type BackendApi = NonNullable<Window['mediaPlayerBackend']>

export function requireBackend(): BackendApi {
  const api = window.mediaPlayerBackend
  if (!api) {
    throw new Error('backend_channel_unavailable:mediaPlayerBackend_not_injected')
  }

  return api
}

export function requireBackendMethod<K extends keyof BackendApi>(methodName: K): NonNullable<BackendApi[K]> {
  const method = window.mediaPlayerBackend?.[methodName]
  if (!method) {
    throw new Error(`backend_method_unavailable:${String(methodName)}`)
  }

  return method as NonNullable<BackendApi[K]>
}
