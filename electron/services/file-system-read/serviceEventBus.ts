type ServiceEventListener<TPayload> = (payload: TPayload) => void

export class ServiceEventBus<TEvents extends Record<string, unknown>> {
  private listenersByEvent = new Map<keyof TEvents, Set<ServiceEventListener<unknown>>>()

  on<TKey extends keyof TEvents>(eventName: TKey, listener: ServiceEventListener<TEvents[TKey]>): () => void {
    const listeners = this.listenersByEvent.get(eventName) ?? new Set<ServiceEventListener<unknown>>()
    listeners.add(listener as ServiceEventListener<unknown>)
    this.listenersByEvent.set(eventName, listeners)

    return () => {
      const current = this.listenersByEvent.get(eventName)
      if (!current) {
        return
      }

      current.delete(listener as ServiceEventListener<unknown>)
      if (current.size === 0) {
        this.listenersByEvent.delete(eventName)
      }
    }
  }

  emit<TKey extends keyof TEvents>(eventName: TKey, payload: TEvents[TKey]): void {
    const listeners = this.listenersByEvent.get(eventName)
    if (!listeners || listeners.size === 0) {
      return
    }

    for (const listener of listeners) {
      try {
        ;(listener as ServiceEventListener<TEvents[TKey]>)(payload)
      } catch {
        // ignore listener failures
      }
    }
  }

  clear(): void {
    this.listenersByEvent.clear()
  }
}
