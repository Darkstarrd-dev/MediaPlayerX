import { describe, expect, it } from 'vitest'

import type { ImagePackageDto } from '../src/contracts/backend'
import { buildImageSidebarTree } from './fileSystemSidebarTree'

function makeDirectory(params: { id: string; treePath: string[] }): ImagePackageDto {
  return {
    id: params.id,
    package_name: `[DIR] ${params.id}`,
    display_name: params.id,
    absolute_path: `D:/${params.treePath.join('/')}`,
    tree_path: params.treePath,
    work_title: '',
    series_id: '',
    circle: '',
    author: '',
    tags: [],
    grade: 0,
    external_metadata: null,
    source_cover: null,
    images: [],
  } as ImagePackageDto
}

describe('buildImageSidebarTree', () => {
  it('keeps CD Booklet root at the end', () => {
    const directories = [
      makeDirectory({ id: 'dir-booklet', treePath: ['CD Booklet', 'Album B'] }),
      makeDirectory({ id: 'dir-x', treePath: ['X:', 'Album X'] }),
      makeDirectory({ id: 'dir-d', treePath: ['D:', 'Album D'] }),
    ]

    const tree = buildImageSidebarTree([], directories)

    expect(tree.map((node) => node.path_key)).toEqual(['D:', 'X:', 'CD Booklet'])
  })
})
