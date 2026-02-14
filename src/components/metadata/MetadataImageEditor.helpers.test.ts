import { describe, expect, it } from 'vitest'

import { buildParsedDraft } from './MetadataImageEditor.helpers'
import type { ImagePackage } from '../../types'

function createSource(treePath: string[]): ImagePackage {
  return {
    id: 'source-1',
    packageName: 'source-1',
    displayName: 'source-1',
    absolutePath: 'X:/music/album',
    treePath,
    workTitle: 'source-1',
    seriesId: '',
    circle: 'unknown',
    author: 'unknown',
    tags: [],
    images: [],
  }
}

describe('MetadataImageEditor helpers', () => {
  it('CD Booklet 图源默认来源站点为 others', () => {
    const source = createSource(['CD Booklet', 'X盘', 'music', 'album'])

    const draft = buildParsedDraft(source, '', '', '', '')

    expect(draft.sourceSite).toBe('others')
  })

  it('非 CD Booklet 图源默认来源站点为 nhentai', () => {
    const source = createSource(['X盘', 'gallery'])

    const draft = buildParsedDraft(source, '', '', '', '')

    expect(draft.sourceSite).toBe('nhentai')
  })
})
