import type { XlsxRuntimeLike } from './types'

const XLSX_CDN_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'

declare global {
  interface Window {
    XLSX?: XlsxRuntimeLike
  }
}

let xlsxRuntimePromise: Promise<XlsxRuntimeLike> | null = null

function resolveExistingRuntime(): XlsxRuntimeLike | null {
  if (typeof window === 'undefined') {
    return null
  }
  return window.XLSX ?? null
}

function appendXlsxScript(): Promise<XlsxRuntimeLike> {
  return new Promise((resolve, reject) => {
    const existingRuntime = resolveExistingRuntime()
    if (existingRuntime) {
      resolve(existingRuntime)
      return
    }

    const script = document.createElement('script')
    script.src = XLSX_CDN_URL
    script.async = true
    script.crossOrigin = 'anonymous'

    script.onload = () => {
      const runtime = resolveExistingRuntime()
      if (!runtime) {
        reject(new Error('XLSX CDN 已加载，但未找到运行时对象'))
        return
      }
      resolve(runtime)
    }

    script.onerror = () => {
      reject(new Error('XLSX CDN 加载失败，请检查网络或 CDN 可用性'))
    }

    document.head.appendChild(script)
  })
}

export async function ensureXlsxRuntime(): Promise<XlsxRuntimeLike> {
  const runtime = resolveExistingRuntime()
  if (runtime) {
    return runtime
  }

  if (!xlsxRuntimePromise) {
    xlsxRuntimePromise = appendXlsxScript().finally(() => {
      xlsxRuntimePromise = null
    })
  }

  return xlsxRuntimePromise
}
