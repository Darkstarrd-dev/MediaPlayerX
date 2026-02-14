type BackendApi = NonNullable<Window['mediaPlayerBackend']>

export function requireBackend(): BackendApi {
  const api = window.mediaPlayerBackend
  if (!api) {
    throw new Error('真实后端通道不可用：window.mediaPlayerBackend 未注入')
  }

  return api
}

export function requireBackendMethod<K extends keyof BackendApi>(methodName: K): NonNullable<BackendApi[K]> {
  const method = window.mediaPlayerBackend?.[methodName]
  if (!method) {
    throw new Error(`真实后端通道不可用：${String(methodName)} 未注入`)
  }

  return method as NonNullable<BackendApi[K]>
}
