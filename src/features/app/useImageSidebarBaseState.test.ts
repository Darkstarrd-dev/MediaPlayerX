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

  it('压缩根路径后仍将 CD Booklet 分支放到末尾', () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        id: 'folder:CD Booklet',
        label: 'CD Booklet',
        kind: 'folder',
        pathKey: 'CD Booklet',
        imageNodeType: 'folder',
        children: [
          {
            id: 'folder:CD Booklet/Vol.1',
            label: 'Vol.1',
            kind: 'folder',
            pathKey: 'CD Booklet/Vol.1',
            imageNodeType: 'folder',
            children: [
              {
                id: 'package:CD Booklet/Vol.1/pkg-a',
                label: 'pkg-a',
                kind: 'package',
                pathKey: 'CD Booklet/Vol.1/pkg-a',
                imageNodeType: 'package',
                packageId: 'pkg-a',
                imageSourceId: 'pkg-a',
                directImageCount: 1,
                children: [],
              },
            ],
          },
        ],
      },
      {
        id: 'folder:D:',
        label: 'D:',
        kind: 'folder',
        pathKey: 'D:',
        imageNodeType: 'folder',
        children: [
          {
            id: 'folder:D:/Gallery',
            label: 'Gallery',
            kind: 'folder',
            pathKey: 'D:/Gallery',
            imageNodeType: 'folder',
            children: [
              {
                id: 'package:D:/Gallery/pkg-b',
                label: 'pkg-b',
                kind: 'package',
                pathKey: 'D:/Gallery/pkg-b',
                imageNodeType: 'package',
                packageId: 'pkg-b',
                imageSourceId: 'pkg-b',
                directImageCount: 1,
                children: [],
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

    const pathKeys = result.current.imageTreeForSidebarNormal.map((node) => node.pathKey)
    expect(pathKeys[0]).toBe('D:/Gallery')
    expect(pathKeys[1]).toBe('CD Booklet/Vol.1')
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
    expect(root?.label).toBe('C:/Users/Houpy/Desktop/20260215')
    expect(root?.pathKey).toBe('C:/Users/Houpy/Desktop/20260215')
    expect(root?.children).toHaveLength(1)
    expect(root?.children[0]?.pathKey).toBe('C:/Users/Houpy/Desktop/20260215/demo.zip')
  })

  it('指针目录显示完整路径并优先展示直属图包', () => {
    const imageTreeRaw: SidebarNode[] = [
      {
        id: 'folder:D:',
        label: 'D:',
        kind: 'folder',
        pathKey: 'D:',
        imageNodeType: 'folder',
        children: [
          {
            id: 'folder:D:/Gallery',
            label: 'Gallery',
            kind: 'folder',
            pathKey: 'D:/Gallery',
            imageNodeType: 'folder',
            children: [
              {
                id: 'package:D:/Gallery/1.zip',
                label: '1.zip',
                kind: 'package',
                pathKey: 'D:/Gallery/1.zip',
                imageNodeType: 'package',
                packageId: 'pkg-1',
                imageSourceId: 'pkg-1',
                directImageCount: 1,
                children: [],
              },
              {
                id: 'package:D:/Gallery/A.zip',
                label: 'A.zip',
                kind: 'package',
                pathKey: 'D:/Gallery/A.zip',
                imageNodeType: 'package',
                packageId: 'pkg-a',
                imageSourceId: 'pkg-a',
                directImageCount: 1,
                children: [],
              },
              {
                id: 'folder:D:/Gallery/cool',
                label: 'cool',
                kind: 'folder',
                pathKey: 'D:/Gallery/cool',
                imageNodeType: 'folder',
                children: [
                  {
                    id: 'package:D:/Gallery/cool/2.zip',
                    label: '2.zip',
                    kind: 'package',
                    pathKey: 'D:/Gallery/cool/2.zip',
                    imageNodeType: 'package',
                    packageId: 'pkg-2',
                    imageSourceId: 'pkg-2',
                    directImageCount: 1,
                    children: [],
                  },
                  {
                    id: 'folder:D:/Gallery/cool/cooler',
                    label: 'cooler',
                    kind: 'folder',
                    pathKey: 'D:/Gallery/cool/cooler',
                    imageNodeType: 'folder',
                    children: [
                      {
                        id: 'package:D:/Gallery/cool/cooler/3.zip',
                        label: '3.zip',
                        kind: 'package',
                        pathKey: 'D:/Gallery/cool/cooler/3.zip',
                        imageNodeType: 'package',
                        packageId: 'pkg-3',
                        imageSourceId: 'pkg-3',
                        directImageCount: 1,
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
    ]

    const { result } = renderHook(() =>
      useImageSidebarBaseState({
        imageTreeRaw,
        imageRootNode: null,
      }),
    )

    const root = result.current.imageTreeForSidebarNormal[0]
    expect(root?.label).toBe('D:/Gallery')
    expect(root?.children.map((node) => node.label)).toEqual([
      '1.zip',
      'A.zip',
      'D:/Gallery/cool',
    ])
    expect(root?.children[2]?.children.map((node) => node.label)).toEqual([
      '2.zip',
      'D:/Gallery/cool/cooler',
    ])
  })
})
