import type { UseAppWorkspacePropsParams } from './useAppWorkspaceProps.types'

type StartImageConvertTaskPayload = Parameters<UseAppWorkspacePropsParams['backendWrite']['startImageConvertTask']>[0]
type StartImageConvertTaskInput = Omit<StartImageConvertTaskPayload, 'node_ids'>

interface CreateWorkspaceImageMainSectionHandlersParams {
  canManageImageConvert: boolean
  selectedConvertibleSidebarNodeIds: string[]
  backendWrite: UseAppWorkspacePropsParams['backendWrite']
  requestManageGroup: UseAppWorkspacePropsParams['requestManageGroup']
  requestManageMove: UseAppWorkspacePropsParams['requestManageMove']
  runManageHideAction: UseAppWorkspacePropsParams['runManageHideAction']
  manageAdReview: UseAppWorkspacePropsParams['manageAdReview']
  setAdReviewPanelOpen: UseAppWorkspacePropsParams['setAdReviewPanelOpen']
  setAdReviewFocusTaskId: UseAppWorkspacePropsParams['setAdReviewFocusTaskId']
  setAdReviewPageIndex: UseAppWorkspacePropsParams['setAdReviewPageIndex']
  setSelectedSidebarNodeId: UseAppWorkspacePropsParams['setSelectedSidebarNodeId']
  setSelectedPackageId: UseAppWorkspacePropsParams['setSelectedPackageId']
  setImageFocus: UseAppWorkspacePropsParams['setImageFocus']
  normalImageSourceNodeIdMap: UseAppWorkspacePropsParams['normalImageSourceNodeIdMap']
  orderedRootScopedImageRefs: UseAppWorkspacePropsParams['orderedRootScopedImageRefs']
  packageByIdEffective: UseAppWorkspacePropsParams['packageByIdEffective']
  clearAllSelections: UseAppWorkspacePropsParams['clearAllSelections']
  thumbnailScaleLevelCount: number
  appSettings: UseAppWorkspacePropsParams['appSettings']
  setImageConvertScale: UseAppWorkspacePropsParams['setImageConvertScale']
  setImageConvertLongestEdgePx: UseAppWorkspacePropsParams['setImageConvertLongestEdgePx']
  setImageConvertAdjustProfile: UseAppWorkspacePropsParams['setImageConvertAdjustProfile']
  setImageConvertFormat: UseAppWorkspacePropsParams['setImageConvertFormat']
  setImageConvertQuality: UseAppWorkspacePropsParams['setImageConvertQuality']
  imageConvertScale: UseAppWorkspacePropsParams['imageConvertScale']
  imageConvertLongestEdgePx: UseAppWorkspacePropsParams['imageConvertLongestEdgePx']
  imageConvertAdjustProfile: UseAppWorkspacePropsParams['imageConvertAdjustProfile']
  imageConvertFormat: UseAppWorkspacePropsParams['imageConvertFormat']
  imageConvertQuality: UseAppWorkspacePropsParams['imageConvertQuality']
  setImageConvertPreviewScale: UseAppWorkspacePropsParams['setImageConvertPreviewScale']
  setImageConvertPreviewLongestEdgePx: UseAppWorkspacePropsParams['setImageConvertPreviewLongestEdgePx']
  setImageConvertPreviewAdjustProfile: UseAppWorkspacePropsParams['setImageConvertPreviewAdjustProfile']
  setImageConvertPreviewFormat: UseAppWorkspacePropsParams['setImageConvertPreviewFormat']
  setImageConvertPreviewQuality: UseAppWorkspacePropsParams['setImageConvertPreviewQuality']
  setImageConvertPreviewMode: UseAppWorkspacePropsParams['setImageConvertPreviewMode']
  imageConvertPreviewScale: UseAppWorkspacePropsParams['imageConvertPreviewScale']
  imageConvertPreviewLongestEdgePx: UseAppWorkspacePropsParams['imageConvertPreviewLongestEdgePx']
  imageConvertPreviewAdjustProfile: UseAppWorkspacePropsParams['imageConvertPreviewAdjustProfile']
  imageConvertPreviewFormat: UseAppWorkspacePropsParams['imageConvertPreviewFormat']
  imageConvertPreviewQuality: UseAppWorkspacePropsParams['imageConvertPreviewQuality']
  setFullscreenActiveWithAutoStop: UseAppWorkspacePropsParams['setFullscreenActiveWithAutoStop']
  imageSidebarNodeIdsForWheel: string[]
  imageSidebarNodeIndexByIdForWheel: Map<string, number>
  selectedSidebarNodeId: UseAppWorkspacePropsParams['selectedSidebarNodeId']
  effectiveSidebarNodeById: UseAppWorkspacePropsParams['sidebarNodeById']
}

export function createWorkspaceImageMainSectionHandlers(
  params: CreateWorkspaceImageMainSectionHandlersParams,
) {
  const onManageGroup = () => {
    void params.requestManageGroup()
  }

  const onManageMove = () => {
    void params.requestManageMove()
  }

  const onStartImageConvertTask = async (request: StartImageConvertTaskInput) => {
    if (!params.canManageImageConvert) {
      return
    }
    const normalizedNodeIds = Array.from(
      new Set(
        params.selectedConvertibleSidebarNodeIds
          .map((nodeId) => nodeId.trim())
          .filter(Boolean),
      ),
    )
    if (normalizedNodeIds.length === 0) {
      return
    }

    return await params.backendWrite.startImageConvertTask({
      ...request,
      node_ids: normalizedNodeIds,
    })
  }

  const onManageHide = () => {
    void params.runManageHideAction(true)
  }

  const onManageUnhide = () => {
    void params.runManageHideAction(false)
  }

  const onToggleAdReviewPanel = () => {
    if (params.manageAdReview.deletePending) {
      return
    }
    params.setAdReviewPanelOpen((value) => !value)
  }

  const onStartAdReview = (options?: { skipReviewedNodes?: boolean }) => {
    void (async () => {
      const startedTask = await params.manageAdReview.startManageAdReview(options)
      if (!startedTask) {
        return
      }
      params.setAdReviewFocusTaskId(startedTask.task_id)
      params.setAdReviewPageIndex(0)
      params.setSelectedSidebarNodeId(null)
    })()
  }

  const onPauseAdReview = () => {
    void params.manageAdReview.pauseManageAdReview()
  }

  const onRemoveAdReviewTask = (taskId: string) => {
    void params.manageAdReview.removeTask(taskId)
  }

  const onDeleteSelectedAdReviewCandidates = () => {
    void (async () => {
      const result = await params.manageAdReview.confirmDeleteSelectedCandidates()
      if (!result.ok) {
        return
      }

      params.setAdReviewFocusTaskId(null)
      params.setAdReviewPageIndex(0)

      if (result.firstHitPackageId) {
        const targetNodeId = params.normalImageSourceNodeIdMap.get(result.firstHitPackageId)
        if (targetNodeId) {
          params.setSelectedSidebarNodeId(targetNodeId)
        }
        params.setSelectedPackageId(result.firstHitPackageId)
      }

      if (result.firstHitImageId) {
        const focusRef = params.orderedRootScopedImageRefs.find((ref) => {
          const imageId =
            params.packageByIdEffective.get(ref.packageId)?.images[ref.imageIndex]
              ?.id ?? null
          return imageId === result.firstHitImageId
        })
        if (focusRef) {
          params.setImageFocus(focusRef.packageId, focusRef.imageIndex)
        }
      }
    })()
  }

  const onThumbnailScaleLevelChange = (level: number) => {
    const targetLevel = Math.max(
      1,
      Math.min(params.thumbnailScaleLevelCount, Math.round(level)),
    )
    const nextNormalizedScale = Math.max(
      1,
      Math.min(
        params.thumbnailScaleLevelCount,
        params.thumbnailScaleLevelCount - targetLevel + 1,
      ),
    )

    if (nextNormalizedScale === params.appSettings.thumbnailScale) {
      return
    }

    params.appSettings.updateSettings({ thumbnailScale: nextNormalizedScale })
  }

  const onImageConvertScaleChange = (value: number) => {
    params.setImageConvertScale(Math.max(0.1, Math.min(1, Number(value.toFixed(1)))))
  }

  const onImageConvertLongestEdgePxChange = (value: number | null) => {
    if (value == null || !Number.isFinite(value)) {
      params.setImageConvertLongestEdgePx(null)
      return
    }
    params.setImageConvertLongestEdgePx(Math.max(1, Math.min(16384, Math.round(value))))
  }

  const onImageConvertFormatChange = (
    value: UseAppWorkspacePropsParams['imageConvertFormat'],
  ) => {
    params.setImageConvertFormat(value)
  }

  const onImageConvertQualityChange = (value: number) => {
    params.setImageConvertQuality(Math.max(10, Math.min(100, Math.round(value))))
  }

  const onOpenImageConvertPreview = () => {
    if (!params.canManageImageConvert) {
      return
    }
    params.setImageConvertPreviewScale(params.imageConvertScale)
    params.setImageConvertPreviewLongestEdgePx(params.imageConvertLongestEdgePx)
    params.setImageConvertPreviewAdjustProfile(params.imageConvertAdjustProfile)
    params.setImageConvertPreviewFormat(params.imageConvertFormat)
    params.setImageConvertPreviewQuality(params.imageConvertQuality)
    params.setImageConvertPreviewMode(true)
    params.setFullscreenActiveWithAutoStop(true)
  }

  const onConfirmImageConvertPreview = () => {
    params.setImageConvertScale(params.imageConvertPreviewScale)
    params.setImageConvertLongestEdgePx(params.imageConvertPreviewLongestEdgePx)
    params.setImageConvertAdjustProfile(params.imageConvertPreviewAdjustProfile)
    params.setImageConvertFormat(params.imageConvertPreviewFormat)
    params.setImageConvertQuality(params.imageConvertPreviewQuality)
    params.setImageConvertPreviewMode(false)
    params.setFullscreenActiveWithAutoStop(false)
  }

  const onCancelImageConvertPreview = () => {
    params.setImageConvertPreviewScale(params.imageConvertScale)
    params.setImageConvertPreviewLongestEdgePx(params.imageConvertLongestEdgePx)
    params.setImageConvertPreviewAdjustProfile(params.imageConvertAdjustProfile)
    params.setImageConvertPreviewFormat(params.imageConvertFormat)
    params.setImageConvertPreviewQuality(params.imageConvertQuality)
    params.setImageConvertPreviewMode(false)
    params.setFullscreenActiveWithAutoStop(false)
  }

  const onSelectNodeBrowseItem = (nodeId: string, imageSourceId?: string) => {
    params.setSelectedSidebarNodeId(nodeId)
    if (imageSourceId) {
      params.setSelectedPackageId(imageSourceId)
    }
  }

  const onThumbnailWheelSwitchSidebarNode = (direction: 'next' | 'prev') => {
    if (params.imageSidebarNodeIdsForWheel.length === 0) {
      return
    }

    const currentNodeId =
      params.selectedSidebarNodeId
      && params.imageSidebarNodeIndexByIdForWheel.has(params.selectedSidebarNodeId)
        ? params.selectedSidebarNodeId
        : params.imageSidebarNodeIdsForWheel[0]
    const currentIndex = params.imageSidebarNodeIndexByIdForWheel.get(currentNodeId)
    if (currentIndex === undefined) {
      return
    }

    const nextIndex = Math.max(
      0,
      Math.min(
        params.imageSidebarNodeIdsForWheel.length - 1,
        currentIndex + (direction === 'next' ? 1 : -1),
      ),
    )
    const nextNodeId = params.imageSidebarNodeIdsForWheel[nextIndex]
    if (!nextNodeId || nextNodeId === params.selectedSidebarNodeId) {
      return
    }

    params.setSelectedSidebarNodeId(nextNodeId)

    const nextNode = params.effectiveSidebarNodeById.get(nextNodeId)
    if (nextNode?.imageSourceId) {
      params.setSelectedPackageId(nextNode.imageSourceId)
    }
  }

  return {
    onManageGroup,
    onManageMove,
    onStartImageConvertTask,
    onManageHide,
    onManageUnhide,
    onToggleAdReviewPanel,
    onStartAdReview,
    onPauseAdReview,
    onRemoveAdReviewTask,
    onDeleteSelectedAdReviewCandidates,
    onThumbnailScaleLevelChange,
    onImageConvertScaleChange,
    onImageConvertLongestEdgePxChange,
    onImageConvertFormatChange,
    onImageConvertQualityChange,
    onOpenImageConvertPreview,
    onConfirmImageConvertPreview,
    onCancelImageConvertPreview,
    onSelectNodeBrowseItem,
    onThumbnailWheelSwitchSidebarNode,
    onClearManageSelection: params.clearAllSelections,
    onDismissAdReviewTask: params.manageAdReview.dismissTask,
  }
}
