import { describe, expect, it } from 'vitest'

import { buildImageSidebarTree } from './mockData'
import type { ImagePackage } from './types'

function makeDirectory(params: { id: string; absolutePath: string; treePath: string[] }): ImagePackage {
  return {
    id: params.id,
    packageName: `[DIR] ${params.id}`,
    displayName: params.id,
    absolutePath: params.absolutePath,
    treePath: params.treePath,
    workTitle: '',
    circle: '',
    author: '',
    tags: [],
    images: [],
  }
}

describe('buildImageSidebarTree', () => {
  it('keeps CD Booklet root at the end', () => {
    const directories: ImagePackage[] = [
      makeDirectory({ id: 'dir-a', absolutePath: 'D:/images/AAA/album-a', treePath: ['AAA', 'album-a'] }),
      makeDirectory({ id: 'dir-booklet', absolutePath: 'D:/images/CD Booklet/album-b', treePath: ['CD Booklet', 'album-b'] }),
      makeDirectory({ id: 'dir-b', absolutePath: 'D:/images/BBB/album-c', treePath: ['BBB', 'album-c'] }),
    ]

    const roots = buildImageSidebarTree([], directories)

    expect(roots.map((node) => node.pathKey)).toEqual(['AAA', 'BBB', 'CD Booklet'])
  })
})
