export interface GifRuntimeConstructor {
  new (options: {
    workers: number
    quality: number
    width: number
    height: number
    workerScript: string
  }): {
    addFrame: (
      source: CanvasRenderingContext2D | HTMLCanvasElement,
      options: { copy: boolean; delay: number },
    ) => void
    on: (event: 'progress' | 'finished', callback: (value: number | Blob, maybeBlob?: Blob) => void) => void
    render: () => void
  }
}

declare global {
  interface Window {
    GIF?: GifRuntimeConstructor
  }
}

const GIF_JS_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.js'
const GIF_WORKER_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/gif.js/0.2.0/gif.worker.js'

let pendingGifRuntime: Promise<GifRuntimeConstructor> | null = null

function resolveRuntime(): GifRuntimeConstructor | null {
  if (typeof window === 'undefined') {
    return null
  }
  return window.GIF ?? null
}

function loadRuntimeScript(): Promise<GifRuntimeConstructor> {
  return new Promise((resolve, reject) => {
    const runtime = resolveRuntime()
    if (runtime) {
      resolve(runtime)
      return
    }

    const script = document.createElement('script')
    script.src = GIF_JS_CDN_URL
    script.async = true
    script.crossOrigin = 'anonymous'
    script.onload = () => {
      const nextRuntime = resolveRuntime()
      if (!nextRuntime) {
        reject(new Error('GIF 运行时加载失败'))
        return
      }
      resolve(nextRuntime)
    }
    script.onerror = () => {
      reject(new Error('GIF CDN 加载失败，请检查网络'))
    }
    document.head.appendChild(script)
  })
}

export async function ensureGifRuntime(): Promise<{ GIF: GifRuntimeConstructor; workerScript: string }> {
  const runtime = resolveRuntime()
  if (runtime) {
    return { GIF: runtime, workerScript: GIF_WORKER_CDN_URL }
  }

  if (!pendingGifRuntime) {
    pendingGifRuntime = loadRuntimeScript().finally(() => {
      pendingGifRuntime = null
    })
  }

  const loaded = await pendingGifRuntime
  return {
    GIF: loaded,
    workerScript: GIF_WORKER_CDN_URL,
  }
}
