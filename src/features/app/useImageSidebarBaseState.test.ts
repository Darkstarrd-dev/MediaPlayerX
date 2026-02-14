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

  it('compacts single-branch folder chain into one path node', () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        id: 'folder:C:',
        label: 'C:',
        kind: 'folder',
        pathKey: 'C:',
        imageNodeType: 'folder',
        children: [
          {
            id: 'folder:C:/Users',
            label: 'Users',
            kind: 'folder',
            pathKey: 'C:/Users',
            imageNodeType: 'folder',
            children: [
              {
                id: 'folder:C:/Users/Houpy',
                label: 'Houpy',
                kind: 'folder',
                pathKey: 'C:/Users/Houpy',
                imageNodeType: 'folder',
                children: [
                  {
                    id: 'folder:C:/Users/Houpy/Desktop',
                    label: 'Desktop',
                    kind: 'folder',
                    pathKey: 'C:/Users/Houpy/Desktop',
                    imageNodeType: 'folder',
                    children: [
                      {
                        id: 'folder:C:/Users/Houpy/Desktop/20260215',
                        label: '20260215',
                        kind: 'folder',
                        pathKey: 'C:/Users/Houpy/Desktop/20260215',
                        imageNodeType: 'folder',
                        children: [
                          {
                            id: 'package:C:/Users/Houpy/Desktop/20260215/demo.zip',
                            label: 'demo.zip',
                            kind: 'package',
                            pathKey: 'C:/Users/Houpy/Desktop/20260215/demo.zip',
                            imageNodeType: 'package',
                            packageId: 'pkg-demo',
                            imageSourceId: 'pkg-demo',
                            directImageCount: 4,
                            children: [],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]

    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode: null,
      }),
    )

    const root = result.current.imageTreeForSidebarNormal[0]
    expect(root?.label).toBe('C:')
    expect(root?.children).toHaveLength(1)
    expect(root?.children[0]?.label).toBe('Users/Houpy/Desktop/20260215')
    expect(root?.children[0]?.pathKey).toBe('C:/Users/Houpy/Desktop/20260215')
    expect(root?.children[0]?.children[0]?.pathKey).toBe('C:/Users/Houpy/Desktop/20260215/demo.zip')
  })
})
