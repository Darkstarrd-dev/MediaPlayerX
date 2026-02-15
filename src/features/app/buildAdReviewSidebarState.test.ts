import { describe, expect, it } from 'vitest'

import type { ManageAdReviewTaskDto } from '../../contracts/backend'
import type { ImagePackage } from '../../types'
import { buildAdReviewSidebarState } from './buildAdReviewSidebarState'

function findNodeByPackageId(nodes: ReturnType<typeof buildAdReviewSidebarState>, packageId: string) {
  const stack = [...nodes]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!node) {
      continue
    }
    if (node.packageId === packageId) {
      return node
    }
    stack.push(...node.children)
  }
  return null
}

function createPackage(id: string, treePath: string[], displayName: string): ImagePackage {
  return {
    id,
    packageName: `${id}.zip`,
    displayName,
    absolutePath: treePath.join('/'),
    treePath,
    workTitle: displayName,
    seriesId: '',
    circle: '',
    author: '',
    tags: [],
    mockGrade: undefined,
    images: [],
  }
}

function createReviewTask(): ManageAdReviewTaskDto {
  const now = Date.now()
  return {
    task_id: 'task-1',
    status: 'review',
    progress: 1,
    total_count: 3,
    reviewed_count: 3,
    suspected_count: 3,
    failed_count: 0,
    known_hash_hits: 0,
    llm_calls: 3,
    scope_image_ids: ['img-1', 'img-2', 'img-3'],
    image_source_by_id: {
      'img-1': 'llm',
      'img-2': 'llm',
      'img-3': 'llm',
    },
    execution: {
      strategy: { mode: 'all' },
      max_concurrency: 4,
    },
    audit: {
      source_distribution: {
        known_hash: 0,
        llm_suspected: 3,
        llm_clean: 0,
        llm_failed: 0,
        strategy_skipped: 0,
      },
      llm_hit_rate: 1,
      overall_hit_rate: 1,
    },
    message: '审核完成',
    error_detail: null,
    candidates: [
      {
        image_id: 'img-1',
        package_id: 'pkg-a',
        package_name: 'pkg-a.zip',
        display_name: 'pkg-a',
        ordinal: 1,
        file_name: '001.jpg',
        reason: 'suspected',
        source: 'llm',
        hash: 'hash-1',
      },
      {
        image_id: 'img-2',
        package_id: 'pkg-a',
        package_name: 'pkg-a.zip',
        display_name: 'pkg-a',
        ordinal: 2,
        file_name: '002.jpg',
        reason: 'suspected',
        source: 'llm',
        hash: 'hash-2',
      },
      {
        image_id: 'img-3',
        package_id: 'pkg-b',
        package_name: 'pkg-b.zip',
        display_name: 'pkg-b',
        ordinal: 1,
        file_name: '001.jpg',
        reason: 'suspected',
        source: 'llm',
        hash: 'hash-3',
      },
    ],
    created_at_ms: now,
    updated_at_ms: now,
  }
}

describe('buildAdReviewSidebarState', () => {
  it('aggregates suspected counts to parent folder nodes', () => {
    const packageById = new Map<string, ImagePackage>([
      ['pkg-a', createPackage('pkg-a', ['C:', 'Users', 'A', 'pkg-a.zip'], 'pkg-a')],
      ['pkg-b', createPackage('pkg-b', ['C:', 'Users', 'A', 'pkg-b.zip'], 'pkg-b')],
    ])

    const nodes = buildAdReviewSidebarState({
      focusTask: createReviewTask(),
      packageById,
    })

    const drive = nodes.find((node) => node.pathKey === 'C:')
    expect(drive?.descendantImageCount).toBe(3)
    expect(drive?.descendantNodeCount).toBe(3)
    expect(drive?.imageNodeType).toBe('folder')

    const compactFolder = drive?.children.find((node) => node.label === 'Users/A')
    expect(compactFolder).toBeTruthy()
    expect(compactFolder?.imageNodeType).toBe('folder')
    expect(compactFolder?.descendantNodeCount).toBe(3)

    const pkgA = findNodeByPackageId(nodes, 'pkg-a')
    const pkgB = findNodeByPackageId(nodes, 'pkg-b')
    expect(pkgA?.directImageCount).toBe(2)
    expect(pkgA?.imageNodeType).toBe('package')
    expect(pkgB?.directImageCount).toBe(1)
    expect(pkgB?.imageNodeType).toBe('package')
  })

  it('returns empty list when focus task has no candidates', () => {
    const task = createReviewTask()
    task.status = 'paused'
    task.candidates = []

    const nodes = buildAdReviewSidebarState({
      focusTask: task,
      packageById: new Map(),
    })

    expect(nodes).toEqual([])
  })
})
