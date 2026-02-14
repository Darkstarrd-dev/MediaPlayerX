import type { FocusedImageRef, ImagePackage } from '../types'

export interface ThumbnailGridSession {
  key: string
  refs: FocusedImageRef[]
  imageIds: string[]
}

const IS_TEST_MODE = import.meta.env.MODE === 'test'

export function resolveImageIdForRef(packageById: Map<string, ImagePackage>, ref: FocusedImageRef): string | null {
  const image = packageById.get(ref.packageId)?.images[ref.imageIndex]
  return image?.id ?? null
}

export function buildThumbnailGridSession(params: {
  refsInPage: FocusedImageRef[]
  packageById: Map<string, ImagePackage>
  actualCellWidth: number
  actualMediaHeight: number
  thumbnailColumns: number
  thumbnailGap: number
}): ThumbnailGridSession | null {
  if (params.refsInPage.length === 0) {
    return null
  }

  const imageIds: string[] = []
  for (const ref of params.refsInPage) {
    const imageId = resolveImageIdForRef(params.packageById, ref)
    if (!imageId) {
      continue
    }
    imageIds.push(imageId)
  }

  if (imageIds.length === 0) {
    return null
  }

  return {
    key: [
      params.actualCellWidth,
      params.actualMediaHeight,
      params.thumbnailColumns,
      params.thumbnailGap,
      imageIds.join(','),
    ].join('|'),
    refs: params.refsInPage,
    imageIds,
  }
}

export function collectSessionImageUrls(session: ThumbnailGridSession, imageUrlById: Record<string, string>): Record<string, string> | null {
  const next: Record<string, string> = {}
  for (const imageId of session.imageIds) {
    const url = imageUrlById[imageId]
    if (!url) {
      return null
    }
    next[imageId] = url
  }
  return next
}

export function isEqualRecord(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  if (leftKeys.length !== rightKeys.length) {
    return false
  }

  for (const key of leftKeys) {
    if (left[key] !== right[key]) {
      return false
    }
  }

  return true
}

function preloadImageUrl(url: string): Promise<void> {
  if (IS_TEST_MODE) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const image = new Image()
    let settled = false

    const finish = () => {
      if (settled) {
        return
      }
      settled = true
      image.onload = null
      image.onerror = null
      resolve()
    }

    const timeout = window.setTimeout(() => {
      finish()
    }, 1_200)

    const finishWithCleanup = () => {
      window.clearTimeout(timeout)
      finish()
    }

    image.onload = finishWithCleanup
    image.onerror = finishWithCleanup
    image.decoding = 'async'
    image.src = url

    if (typeof image.decode === 'function') {
      void image
        .decode()
        .then(() => {
          finishWithCleanup()
        })
        .catch(() => {
          if (image.complete) {
            finishWithCleanup()
          }
        })
      return
    }

    if (image.complete) {
      finishWithCleanup()
    }
  })
}

export async function preloadSessionImageUrls(urlByImageId: Record<string, string>): Promise<void> {
  const uniqueUrls = Array.from(new Set(Object.values(urlByImageId).filter(Boolean)))
  if (uniqueUrls.length === 0) {
    return
  }

  await Promise.all(uniqueUrls.map((url) => preloadImageUrl(url)))
}
