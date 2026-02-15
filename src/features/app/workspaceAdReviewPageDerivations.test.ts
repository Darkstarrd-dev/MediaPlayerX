import { describe, expect, it } from 'vitest'

import type { ManageAdReviewTaskDto } from '../../contracts/backend'
import type { FocusedImageRef, ImagePackage, SidebarNode } from '../../types'
import { resolveAdReviewPageDerivations } from './workspaceAdReviewPageDerivations'

function createPackage(id: string, treePath: string[], imageIds: string[]): ImagePackage {
  return {
    id,
    packageName: `${id}.zip`,
    displayName: id,
    absolutePath: treePath.join('/'),
    treePath,
    workTitle: id,
    seriesId: '',
    circle: '',
    author: '',
    tags: [],
    images: imageIds.map((imageId, index) => ({
      id: imageId,
      ordinal: index + 1,
      width: 100,
      height: 100,
      sizeKb: 10,
      cluster: 0,
      color: '#000000',
      mediaLocator: {
        kind: 'filesystem',
        absolutePath: `${treePath.join('/')}/${imageId}.jpg`,
        extension: '.jpg',
        mediaType: 'image',
        mimeType: 'image/jpeg',
      },
    })),
  }
}

function createReviewTask(candidateImageIds: string[]): ManageAdReviewTaskDto {
  const now = Date.now()
  return {
    task_id: 'task-1',
    status: 'running',
    progress: 0.5,
    total_count: candidateImageIds.length,
    reviewed_count: Math.max(1, candidateImageIds.length),
    suspected_count: candidateImageIds.length,
    failed_count: 0,
    known_hash_hits: 0,
    llm_calls: candidateImageIds.length,
    scope_image_ids: candidateImageIds,
    image_source_by_id: Object.fromEntries(candidateImageIds.map((imageId) => [imageId, 'llm'] as const)),
    execution: {
      strategy: { mode: 'all' },
      max_concurrency: 4,
    },
    audit: {
      source_distribution: {
        known_hash: 0,
        llm_suspected: candidateImageIds.length,
        llm_clean: 0,
        llm_failed: 0,
        strategy_skipped: 0,
      },
      llm_hit_rate: 1,
      overall_hit_rate: 1,
    },
    message: 'running',
    error_detail: null,
    candidates: candidateImageIds.map((imageId, index) => ({
      image_id: imageId,
      package_id: imageId === 'img-3' ? 'pkg-c' : imageId === 'img-2' ? 'pkg-b' : 'pkg-a',
      package_name: 'pkg.zip',
      display_name: 'pkg',
      ordinal: index + 1,
      file_name: `${imageId}.jpg`,
      reason: 'suspected',
      source: 'llm',
      hash: `hash-${imageId}`,
    })),
    created_at_ms: now,
    updated_at_ms: now,
  }
}

describe('resolveAdReviewPageDerivations', () => {
  it('treats folder node by kind when imageNodeType is missing', () => {
    const packageById = new Map<string, ImagePackage>([
      ['pkg-a', createPackage('pkg-a', ['C:', 'Users', 'A', 'pkg-a.zip'], ['img-1'])],
      ['pkg-b', createPackage('pkg-b', ['C:', 'Users', 'A', 'pkg-b.zip'], ['img-2'])],
      ['pkg-c', createPackage('pkg-c', ['D:', 'Other', 'pkg-c.zip'], ['img-3'])],
    ])

    const orderedRootScopedImageRefs: FocusedImageRef[] = [
      { packageId: 'pkg-a', imageIndex: 0 },
      { packageId: 'pkg-b', imageIndex: 0 },
      { packageId: 'pkg-c', imageIndex: 0 },
    ]

    const selectedSidebarNode: SidebarNode = {
      id: 'folder:C:/Users/A',
      label: 'Users/A',
      kind: 'folder',
      children: [],
      pathKey: 'C:/Users/A',
    }

    const result = resolveAdReviewPageDerivations({
      adReviewResultsMode: true,
      orderedRootScopedImageRefs,
      packageByIdEffective: packageById,
      adReviewFocusTask: createReviewTask(['img-1', 'img-2', 'img-3']),
      selectedSidebarNode,
      pagedPageSize: 20,
      normalizedPageIndexEffective: 0,
      visibleImageRefs: [],
      refsInPageEffective: [],
      pageStartEffective: 0,
      imageTotalPagesEffective: 1,
    })

    expect(result.visibleImageRefsForMain).toEqual([
      { packageId: 'pkg-a', imageIndex: 0 },
      { packageId: 'pkg-b', imageIndex: 0 },
    ])
  })

  it('keeps package-node filtering to selected package only', () => {
    const packageById = new Map<string, ImagePackage>([
      ['pkg-a', createPackage('pkg-a', ['C:', 'Users', 'A', 'pkg-a.zip'], ['img-1'])],
      ['pkg-b', createPackage('pkg-b', ['C:', 'Users', 'A', 'pkg-b.zip'], ['img-2'])],
    ])

    const orderedRootScopedImageRefs: FocusedImageRef[] = [
      { packageId: 'pkg-a', imageIndex: 0 },
      { packageId: 'pkg-b', imageIndex: 0 },
    ]

    const selectedSidebarNode: SidebarNode = {
      id: 'package:C:/Users/A/pkg-b.zip',
      label: 'pkg-b',
      kind: 'package',
      imageNodeType: 'package',
      imageSourceId: 'pkg-b',
      packageId: 'pkg-b',
      children: [],
      pathKey: 'C:/Users/A/pkg-b.zip',
    }

    const result = resolveAdReviewPageDerivations({
      adReviewResultsMode: true,
      orderedRootScopedImageRefs,
      packageByIdEffective: packageById,
      adReviewFocusTask: createReviewTask(['img-1', 'img-2']),
      selectedSidebarNode,
      pagedPageSize: 20,
      normalizedPageIndexEffective: 0,
      visibleImageRefs: [],
      refsInPageEffective: [],
      pageStartEffective: 0,
      imageTotalPagesEffective: 1,
    })

    expect(result.visibleImageRefsForMain).toEqual([{ packageId: 'pkg-b', imageIndex: 0 }])
  })
})
