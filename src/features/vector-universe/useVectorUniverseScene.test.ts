import { describe, expect, it } from 'vitest'

import type { ImagePackage } from '../../types'
import {
  buildVectorUniverseNodesByScope,
} from './useVectorUniverseScene'

function createPackage(id: string, imageCount: number): ImagePackage {
  return {
    id,
    packageName: id,
    displayName: id,
    absolutePath: `Z:/mock/${id}`,
    treePath: ['db', id],
    workTitle: 'mock-work',
    circle: 'mock-circle',
    author: 'mock-author',
    tags: ['tag-a', 'tag-b'],
    images: Array.from({ length: imageCount }, (_, index) => ({
      id: `${id}-${index}`,
      ordinal: index + 1,
      width: 1280,
      height: 720,
      sizeKb: 100,
      cluster: 0,
      color: '#4B88DA',
      mediaLocator: {
        kind: 'filesystem',
        absolutePath: `Z:/mock/${id}/img_${index + 1}.jpg`,
        extension: '.jpg',
        mediaType: 'image',
        mimeType: 'image/jpeg',
      },
    })),
  }
}

describe('buildVectorUniverseNodesByScope', () => {
  it('未指定 scopeRefs 时包含全部图片', () => {
    const packages = [createPackage('pkg-a', 2), createPackage('pkg-b', 3)]
    const nodes = buildVectorUniverseNodesByScope(packages)
    expect(nodes).toHaveLength(5)
  })

  it('指定 scopeRefs 时仅生成 scope 内图片', () => {
    const packages = [createPackage('pkg-a', 2), createPackage('pkg-b', 3)]
    const nodes = buildVectorUniverseNodesByScope(packages, [
      { packageId: 'pkg-a', imageIndex: 1 },
      { packageId: 'pkg-b', imageIndex: 2 },
      { packageId: 'pkg-b', imageIndex: 2 },
      { packageId: 'missing', imageIndex: 0 },
    ])

    expect(nodes.map((node) => node.id)).toEqual(['pkg-a:1', 'pkg-b:2'])
  })

  it('提供 originRef 时以该图片为坐标原点', () => {
    const packages = [createPackage('pkg-a', 2), createPackage('pkg-b', 2)]
    const nodes = buildVectorUniverseNodesByScope(
      packages,
      [
        { packageId: 'pkg-a', imageIndex: 0 },
        { packageId: 'pkg-b', imageIndex: 1 },
      ],
      { packageId: 'pkg-a', imageIndex: 0 },
    )

    const originNode = nodes.find((node) => node.id === 'pkg-a:0')
    expect(originNode?.position).toEqual([0, 0, 0])
  })
})
