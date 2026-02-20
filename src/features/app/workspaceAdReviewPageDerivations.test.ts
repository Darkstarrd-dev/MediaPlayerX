import { describe, expect, it } from 'vitest'

import type { ManageAdReviewTaskDto } from '../../contracts/backend'
import type { FocusedImageRef, ImagePackage, SidebarNode } from '../../types'
import {
  resolveAdReviewPageDerivations,
  shouldGroupAdReviewByPackageRows,
} from './workspaceAdReviewPageDerivations'

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
  it('groups by package rows when ad-review view has no sidebar selection', () => {
    expect(shouldGroupAdReviewByPackageRows(true, null)).toBe(true)
  })

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
      thumbnailColumns: 4,
      adReviewGroupByPackageRows: false,
      adReviewPageIndex: 0,
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
      thumbnailColumns: 4,
      adReviewGroupByPackageRows: false,
      adReviewPageIndex: 0,
      normalizedPageIndexEffective: 0,
      visibleImageRefs: [],
      refsInPageEffective: [],
      pageStartEffective: 0,
      imageTotalPagesEffective: 1,
    })

    expect(result.visibleImageRefsForMain).toEqual([{ packageId: 'pkg-b', imageIndex: 0 }])
  })

  it('uses ad-review page index instead of package page index', () => {
    const packageById = new Map<string, ImagePackage>([
      ['pkg-a', createPackage('pkg-a', ['C:', 'Users', 'A', 'pkg-a.zip'], ['img-1', 'img-2', 'img-3', 'img-4'])],
    ])

    const orderedRootScopedImageRefs: FocusedImageRef[] = [
      { packageId: 'pkg-a', imageIndex: 0 },
      { packageId: 'pkg-a', imageIndex: 1 },
      { packageId: 'pkg-a', imageIndex: 2 },
      { packageId: 'pkg-a', imageIndex: 3 },
    ]

    const result = resolveAdReviewPageDerivations({
      adReviewResultsMode: true,
      orderedRootScopedImageRefs,
      packageByIdEffective: packageById,
      adReviewFocusTask: createReviewTask(['img-1', 'img-2', 'img-3', 'img-4']),
      selectedSidebarNode: null,
      pagedPageSize: 1,
      thumbnailColumns: 4,
      adReviewGroupByPackageRows: false,
      adReviewPageIndex: 3,
      normalizedPageIndexEffective: 0,
      visibleImageRefs: [],
      refsInPageEffective: [],
      pageStartEffective: 0,
      imageTotalPagesEffective: 1,
    })

    expect(result.normalizedPageIndexForMain).toBe(3)
    expect(result.imageTotalPagesForMain).toBe(4)
    expect(result.refsInPageBase).toEqual([{ packageId: 'pkg-a', imageIndex: 3 }])
  })

  it('computes page by grid slots when grouping rows by package', () => {
    const packageById = new Map<string, ImagePackage>([
      ['pkg-a', createPackage('pkg-a', ['C:', 'Users', 'A', 'pkg-a.zip'], ['img-1', 'img-2', 'img-3'])],
      ['pkg-b', createPackage('pkg-b', ['C:', 'Users', 'A', 'pkg-b.zip'], ['img-4', 'img-5', 'img-6', 'img-7', 'img-8'])],
    ])

    const orderedRootScopedImageRefs: FocusedImageRef[] = [
      { packageId: 'pkg-a', imageIndex: 0 },
      { packageId: 'pkg-a', imageIndex: 1 },
      { packageId: 'pkg-a', imageIndex: 2 },
      { packageId: 'pkg-b', imageIndex: 0 },
      { packageId: 'pkg-b', imageIndex: 1 },
      { packageId: 'pkg-b', imageIndex: 2 },
      { packageId: 'pkg-b', imageIndex: 3 },
      { packageId: 'pkg-b', imageIndex: 4 },
    ]

    const resultPage1 = resolveAdReviewPageDerivations({
      adReviewResultsMode: true,
      orderedRootScopedImageRefs,
      packageByIdEffective: packageById,
      adReviewFocusTask: createReviewTask(['img-1', 'img-2', 'img-3', 'img-4', 'img-5', 'img-6', 'img-7', 'img-8']),
      selectedSidebarNode: null,
      pagedPageSize: 8,
      thumbnailColumns: 4,
      adReviewGroupByPackageRows: true,
      adReviewPageIndex: 0,
      normalizedPageIndexEffective: 0,
      visibleImageRefs: [],
      refsInPageEffective: [],
      pageStartEffective: 0,
      imageTotalPagesEffective: 1,
    })

    expect(resultPage1.imageTotalPagesForMain).toBe(2)
    expect(resultPage1.refsInPageBase).toEqual([
      { packageId: 'pkg-a', imageIndex: 0 },
      { packageId: 'pkg-a', imageIndex: 1 },
      { packageId: 'pkg-a', imageIndex: 2 },
      { packageId: 'pkg-b', imageIndex: 0 },
      { packageId: 'pkg-b', imageIndex: 1 },
      { packageId: 'pkg-b', imageIndex: 2 },
      { packageId: 'pkg-b', imageIndex: 3 },
    ])

    const resultPage2 = resolveAdReviewPageDerivations({
      adReviewResultsMode: true,
      orderedRootScopedImageRefs,
      packageByIdEffective: packageById,
      adReviewFocusTask: createReviewTask(['img-1', 'img-2', 'img-3', 'img-4', 'img-5', 'img-6', 'img-7', 'img-8']),
      selectedSidebarNode: null,
      pagedPageSize: 8,
      thumbnailColumns: 4,
      adReviewGroupByPackageRows: true,
      adReviewPageIndex: 1,
      normalizedPageIndexEffective: 0,
      visibleImageRefs: [],
      refsInPageEffective: [],
      pageStartEffective: 0,
      imageTotalPagesEffective: 1,
    })

    expect(resultPage2.refsInPageBase).toEqual([
      { packageId: 'pkg-b', imageIndex: 4 },
    ])
  })

  it('keeps package row wrapping for 2/3/7 distribution on a 4x4 grid', () => {
    const packageById = new Map<string, ImagePackage>([
      ['pkg-a', createPackage('pkg-a', ['C:', 'Users', 'A', 'pkg-a.zip'], ['img-1', 'img-2'])],
      ['pkg-b', createPackage('pkg-b', ['C:', 'Users', 'A', 'pkg-b.zip'], ['img-3', 'img-4', 'img-5'])],
      ['pkg-c', createPackage('pkg-c', ['C:', 'Users', 'A', 'pkg-c.zip'], ['img-6', 'img-7', 'img-8', 'img-9', 'img-10', 'img-11', 'img-12'])],
    ])

    const orderedRootScopedImageRefs: FocusedImageRef[] = [
      { packageId: 'pkg-a', imageIndex: 0 },
      { packageId: 'pkg-a', imageIndex: 1 },
      { packageId: 'pkg-b', imageIndex: 0 },
      { packageId: 'pkg-b', imageIndex: 1 },
      { packageId: 'pkg-b', imageIndex: 2 },
      { packageId: 'pkg-c', imageIndex: 0 },
      { packageId: 'pkg-c', imageIndex: 1 },
      { packageId: 'pkg-c', imageIndex: 2 },
      { packageId: 'pkg-c', imageIndex: 3 },
      { packageId: 'pkg-c', imageIndex: 4 },
      { packageId: 'pkg-c', imageIndex: 5 },
      { packageId: 'pkg-c', imageIndex: 6 },
    ]

    const result = resolveAdReviewPageDerivations({
      adReviewResultsMode: true,
      orderedRootScopedImageRefs,
      packageByIdEffective: packageById,
      adReviewFocusTask: createReviewTask([
        'img-1',
        'img-2',
        'img-3',
        'img-4',
        'img-5',
        'img-6',
        'img-7',
        'img-8',
        'img-9',
        'img-10',
        'img-11',
        'img-12',
      ]),
      selectedSidebarNode: null,
      pagedPageSize: 16,
      thumbnailColumns: 4,
      adReviewGroupByPackageRows: true,
      adReviewPageIndex: 0,
      normalizedPageIndexEffective: 0,
      visibleImageRefs: [],
      refsInPageEffective: [],
      pageStartEffective: 0,
      imageTotalPagesEffective: 1,
    })

    expect(result.imageTotalPagesForMain).toBe(1)
    expect(result.refsInPageBase).toEqual(orderedRootScopedImageRefs)
  })
})
