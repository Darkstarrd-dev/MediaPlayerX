import { describe, expect, it } from 'vitest'

import type { SidebarNode } from '../../types'
import { computeRenameDialogParams } from './renameDialogLogic'

function makeNode(overrides: Partial<SidebarNode>): SidebarNode {
  return {
    id: 'node',
    label: 'node',
    kind: 'folder',
    children: [],
    packageId: undefined,
    videoId: undefined,
    audioId: undefined,
    imageSourceId: undefined,
    coverSourceId: undefined,
    coverImageId: undefined,
    imageNodeType: 'folder',
    directImageCount: 0,
    descendantPackageCount: 0,
    descendantImageCount: 0,
    descendantNodeCount: 0,
    pathKey: 'X',
    ...overrides,
  }
}

const emptyVideos: { id: string; fileName: string }[] = []
const emptyPackages = new Map<string, { absolutePath: string }>()

describe('computeRenameDialogParams', () => {
  describe('管理模式', () => {
    it('批量选中含 folder 时应剔除 folder 节点，仅保留 package/video 级节点', () => {
      const folderNode = makeNode({ id: 'folder:X/收藏', pathKey: 'X/收藏' })
      const packageNode = makeNode({
        id: 'package:X/收藏/a.zip',
        kind: 'package',
        packageId: 'pkg-a',
        imageNodeType: 'package',
        pathKey: 'X/收藏/a.zip',
      })
      const directoryNode = makeNode({
        id: 'package:X/收藏/图包目录',
        kind: 'package',
        imageSourceId: 'dir-a',
        imageNodeType: 'directory',
        pathKey: 'X/收藏/图包目录',
      })

      const nodeById = new Map<string, SidebarNode>([
        [folderNode.id, folderNode],
        [packageNode.id, packageNode],
        [directoryNode.id, directoryNode],
      ])

      const result = computeRenameDialogParams({
        manageMode: true,
        sidebarCheckedNodeIds: [folderNode.id, packageNode.id, directoryNode.id],
        imageCheckedIds: [],
        sidebarNodeById: nodeById,
        selectedSidebarNodeId: null,
        videosForSidebar: emptyVideos,
        packageByIdEffective: emptyPackages,
      })

      expect(result).not.toBeNull()
      expect(result!.renameMode).toBe('replace')
      expect(result!.targetNodeIds).toEqual([packageNode.id, directoryNode.id])
      expect(result!.targetNodeId).toBeNull()
    })

    it('视频模式批量选中含 folder 时应剔除 folder 节点，仅保留 video 节点', () => {
      const folderNode = makeNode({ id: 'folder:V/合集', pathKey: 'V/合集' })
      const videoNode = makeNode({
        id: 'video:V/合集/a.mp4',
        kind: 'video',
        videoId: 'video-a',
        pathKey: 'V/合集/a.mp4',
      })
      const nodeById = new Map<string, SidebarNode>([
        [folderNode.id, folderNode],
        [videoNode.id, videoNode],
      ])

      const result = computeRenameDialogParams({
        manageMode: true,
        sidebarCheckedNodeIds: [folderNode.id, videoNode.id],
        imageCheckedIds: [],
        sidebarNodeById: nodeById,
        selectedSidebarNodeId: null,
        videosForSidebar: [{ id: 'video-a', fileName: 'a.mp4' }],
        packageByIdEffective: emptyPackages,
      })

      expect(result).not.toBeNull()
      // 仅 1 个非 folder 节点，且无 image → single 模式
      expect(result!.renameMode).toBe('single')
      expect(result!.targetNodeIds).toEqual([videoNode.id])
      expect(result!.targetNodeId).toBe(videoNode.id)
      expect(result!.draft).toBe('a')
    })

    it('非 folder 的单选状态触发单文件面板', () => {
      const packageNode = makeNode({
        id: 'package:X/a.zip',
        kind: 'package',
        packageId: 'pkg-a',
        pathKey: 'X/a.zip',
      })
      const nodeById = new Map<string, SidebarNode>([[packageNode.id, packageNode]])

      const result = computeRenameDialogParams({
        manageMode: true,
        sidebarCheckedNodeIds: [packageNode.id],
        imageCheckedIds: [],
        sidebarNodeById: nodeById,
        selectedSidebarNodeId: packageNode.id,
        videosForSidebar: emptyVideos,
        packageByIdEffective: new Map([['pkg-a', { absolutePath: 'X/a.zip' }]]),
      })

      expect(result).not.toBeNull()
      expect(result!.renameMode).toBe('single')
      expect(result!.targetNodeId).toBe(packageNode.id)
      expect(result!.draft).toBe('a')
    })

    it('有 imageCheckedIds 时走批量面板', () => {
      const packageNode = makeNode({
        id: 'package:X/a.zip',
        kind: 'package',
        packageId: 'pkg-a',
        pathKey: 'X/a.zip',
      })
      const nodeById = new Map<string, SidebarNode>([[packageNode.id, packageNode]])

      const result = computeRenameDialogParams({
        manageMode: true,
        sidebarCheckedNodeIds: [packageNode.id],
        imageCheckedIds: ['img-1', 'img-2'],
        sidebarNodeById: nodeById,
        selectedSidebarNodeId: null,
        videosForSidebar: emptyVideos,
        packageByIdEffective: emptyPackages,
      })

      expect(result).not.toBeNull()
      expect(result!.renameMode).toBe('replace')
      expect(result!.targetImageIds).toEqual(['img-1', 'img-2'])
    })

    it('仅选中 folder 无其他有效对象时返回 null', () => {
      const folderNode = makeNode({ id: 'folder:X/收藏', pathKey: 'X/收藏' })
      const nodeById = new Map<string, SidebarNode>([[folderNode.id, folderNode]])

      const result = computeRenameDialogParams({
        manageMode: true,
        sidebarCheckedNodeIds: [folderNode.id],
        imageCheckedIds: [],
        sidebarNodeById: nodeById,
        selectedSidebarNodeId: folderNode.id,
        videosForSidebar: emptyVideos,
        packageByIdEffective: emptyPackages,
      })

      expect(result).toBeNull()
    })

    it('无任何选中项时返回 null', () => {
      const result = computeRenameDialogParams({
        manageMode: true,
        sidebarCheckedNodeIds: [],
        imageCheckedIds: [],
        sidebarNodeById: new Map(),
        selectedSidebarNodeId: null,
        videosForSidebar: emptyVideos,
        packageByIdEffective: emptyPackages,
      })

      expect(result).toBeNull()
    })
  })

  describe('非管理模式', () => {
    it('基于焦点节点触发单文件重命名', () => {
      const videoNode = makeNode({
        id: 'video:V/a.mp4',
        kind: 'video',
        videoId: 'video-a',
        label: 'a.mp4',
        pathKey: 'V/a.mp4',
      })
      const nodeById = new Map<string, SidebarNode>([[videoNode.id, videoNode]])

      const result = computeRenameDialogParams({
        manageMode: false,
        sidebarCheckedNodeIds: [],
        imageCheckedIds: [],
        sidebarNodeById: nodeById,
        selectedSidebarNodeId: videoNode.id,
        videosForSidebar: [{ id: 'video-a', fileName: 'a.mp4' }],
        packageByIdEffective: emptyPackages,
      })

      expect(result).not.toBeNull()
      expect(result!.renameMode).toBe('single')
      expect(result!.targetNodeId).toBe(videoNode.id)
      expect(result!.draft).toBe('a')
    })

    it('无焦点节点时返回 null', () => {
      const result = computeRenameDialogParams({
        manageMode: false,
        sidebarCheckedNodeIds: [],
        imageCheckedIds: [],
        sidebarNodeById: new Map(),
        selectedSidebarNodeId: null,
        videosForSidebar: emptyVideos,
        packageByIdEffective: emptyPackages,
      })

      expect(result).toBeNull()
    })

    it('焦点 folder 节点也应走单文件面板（非管理模式）', () => {
      const folderNode = makeNode({ id: 'folder:X/收藏', label: '收藏', pathKey: 'X/收藏' })
      const nodeById = new Map<string, SidebarNode>([[folderNode.id, folderNode]])

      const result = computeRenameDialogParams({
        manageMode: false,
        sidebarCheckedNodeIds: [],
        imageCheckedIds: [],
        sidebarNodeById: nodeById,
        selectedSidebarNodeId: folderNode.id,
        videosForSidebar: emptyVideos,
        packageByIdEffective: emptyPackages,
      })

      expect(result).not.toBeNull()
      expect(result!.renameMode).toBe('single')
      expect(result!.targetNodeId).toBe(folderNode.id)
      expect(result!.draft).toBe('收藏')
    })
  })
})
