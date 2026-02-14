import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { SidebarNode } from '../../types'
import { useImageSidebarBaseState } from './useImageSidebarBaseState'

function makeRootNode(pathKey: string): SidebarNode {
  return {
    id: `folder:${pathKey}`,
    label: pathKey,
    kind: 'folder',
    children: [],
    pathKey,
  }
}

describe('useImageSidebarBaseState', () => {
  it('moves CD Booklet root to the end', () => {
    const imageTreeRaw = [
      makeRootNode('CD Booklet'),
      makeRootNode('D:'),
      makeRootNode('X:'),
    ]

    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode: null,
      }),
    )

    expect(result.current.imageTreeForSidebarNormal.map((node) => node.pathKey)).toEqual(['D:', 'X:', 'CD Booklet'])
  })
})
