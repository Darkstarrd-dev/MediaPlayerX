import {
  resolveMusicBookletPreviewRootNodeId,
  resolveMusicBookletState,
} from "./workspaceMusicBooklet";
import {
  createMusicBookletBindingActions,
  createWorkspaceJumpActions,
} from "./workspaceJumpActions";
import { normalizeSeriesId, pickFirstBySeriesId } from "./workspaceSharedUtils";
import type { UseAppWorkspacePropsParams } from "./useAppWorkspaceProps.types";

interface BuildWorkspaceJumpContextParams {
  metadataManageMode: UseAppWorkspacePropsParams["metadataManageMode"];
  metadataImagePackageEffective: UseAppWorkspacePropsParams["metadataImagePackageEffective"];
  focusedVideoEffective: UseAppWorkspacePropsParams["focusedVideoEffective"];
  focusedAudio: UseAppWorkspacePropsParams["focusedAudio"];
  musicBookletImageSources: UseAppWorkspacePropsParams["musicBookletImageSources"];
  musicBookletBindings: UseAppWorkspacePropsParams["musicBookletBindings"];
  normalImageSourceNodeIdMap: UseAppWorkspacePropsParams["normalImageSourceNodeIdMap"];
  selectedAudioId: UseAppWorkspacePropsParams["selectedAudioId"];
  selectedPackageId: UseAppWorkspacePropsParams["selectedPackageId"];
  packageByIdEffective: UseAppWorkspacePropsParams["packageByIdEffective"];
  videoByIdEffective: UseAppWorkspacePropsParams["videoByIdEffective"];
  audioByIdEffective: UseAppWorkspacePropsParams["audioByIdEffective"];
  applyQuickFeatureSearch: UseAppWorkspacePropsParams["applyQuickFeatureSearch"];
  updateSettings: UseAppWorkspacePropsParams["appSettings"]["updateSettings"];
  setMetadataTab: UseAppWorkspacePropsParams["setMetadataTab"];
  setSelectedPackageId: UseAppWorkspacePropsParams["setSelectedPackageId"];
  setSelectedAudioId: UseAppWorkspacePropsParams["setSelectedAudioId"];
  selectVideoFromBrowser: UseAppWorkspacePropsParams["selectVideoFromBrowser"];
}

export function buildWorkspaceJumpContext({
  metadataManageMode,
  metadataImagePackageEffective,
  focusedVideoEffective,
  focusedAudio,
  musicBookletImageSources,
  musicBookletBindings,
  normalImageSourceNodeIdMap,
  selectedAudioId,
  selectedPackageId,
  packageByIdEffective,
  videoByIdEffective,
  audioByIdEffective,
  applyQuickFeatureSearch,
  updateSettings,
  setMetadataTab,
  setSelectedPackageId,
  setSelectedAudioId,
  selectVideoFromBrowser,
}: BuildWorkspaceJumpContextParams) {
  const imageSeriesId = normalizeSeriesId(
    metadataImagePackageEffective?.seriesId ?? null,
  );
  const videoSeriesId = normalizeSeriesId(
    focusedVideoEffective?.seriesId ?? null,
  );
  const audioSeriesId = normalizeSeriesId(focusedAudio?.seriesId ?? null);

  const jumpTargetVideo = pickFirstBySeriesId(
    videoByIdEffective.values(),
    imageSeriesId,
  );
  const jumpTargetAudioFromImage = pickFirstBySeriesId(
    audioByIdEffective.values(),
    imageSeriesId,
  );
  const jumpTargetImage = pickFirstBySeriesId(
    packageByIdEffective.values(),
    videoSeriesId,
  );
  const jumpTargetAudioFromVideo = pickFirstBySeriesId(
    audioByIdEffective.values(),
    videoSeriesId,
  );
  const jumpTargetImageFromAudio = pickFirstBySeriesId(
    packageByIdEffective.values(),
    audioSeriesId,
  );
  const jumpTargetVideoFromAudio = pickFirstBySeriesId(
    videoByIdEffective.values(),
    audioSeriesId,
  );

  const musicBookletState = resolveMusicBookletState({
    focusedAudio,
    imageSources: musicBookletImageSources,
    musicImportDirectories: musicBookletBindings.musicImportDirectories,
    bindingsByAlbumRoot: musicBookletBindings.bindingsByAlbumRoot,
  });

  const openMusicCoverSourceId = metadataManageMode
    ? musicBookletState.effectiveCoverSourceId
    : (musicBookletState.effectiveCoverSourceId ??
      musicBookletState.autoCoverSourceId);
  const openMusicBookletSourceId = metadataManageMode
    ? (musicBookletState.effectiveBookletSourceId ??
      musicBookletState.effectiveCoverSourceId)
    : (musicBookletState.effectiveBookletSourceId ??
      musicBookletState.effectiveCoverSourceId ??
      musicBookletState.autoBookletSourceId ??
      musicBookletState.autoCoverSourceId);
  const musicBookletPreviewRootNodeId = resolveMusicBookletPreviewRootNodeId({
    candidateSourceIds: musicBookletState.candidates.map(
      (candidate) => candidate.sourceId,
    ),
    imageSourceNodeIdMap: normalImageSourceNodeIdMap,
  });
  const returnMusicAudioId =
    focusedAudio?.id ??
    (selectedAudioId && audioByIdEffective.has(selectedAudioId)
      ? selectedAudioId
      : null);
  const currentImageSourceId =
    metadataImagePackageEffective?.id ?? selectedPackageId;
  const imageInMusicBookletOrCoverSource = Boolean(
    currentImageSourceId &&
    (currentImageSourceId === openMusicCoverSourceId ||
      currentImageSourceId === openMusicBookletSourceId),
  );

  const jumpActions = createWorkspaceJumpActions({
    applyQuickFeatureSearch,
    updateSettings,
    setMetadataTab,
    setSelectedPackageId,
    setSelectedAudioId,
    selectVideoFromBrowser,
    jumpTargetVideoId: jumpTargetVideo?.id ?? null,
    jumpTargetImageId: jumpTargetImage?.id ?? null,
    jumpTargetAudioFromImageId: jumpTargetAudioFromImage?.id ?? null,
    jumpTargetAudioFromVideoId: jumpTargetAudioFromVideo?.id ?? null,
    jumpTargetImageFromAudioId: jumpTargetImageFromAudio?.id ?? null,
    jumpTargetVideoFromAudioId: jumpTargetVideoFromAudio?.id ?? null,
    returnMusicAudioId,
    imageSeriesId,
    videoSeriesId,
    audioSeriesId,
    openMusicCoverSourceId,
    openMusicBookletSourceId,
    musicBookletPreviewRootNodeId,
  });

  const musicBookletBindingActions = createMusicBookletBindingActions({
    albumRootPath: musicBookletState.albumRootPath,
    bindingsByAlbumRoot: musicBookletBindings.bindingsByAlbumRoot,
    resetBindingOverride: musicBookletBindings.resetBindingOverride,
    setBindingOverride: musicBookletBindings.setBindingOverride,
  });

  return {
    musicBookletState,
    openMusicCoverSourceId,
    openMusicBookletSourceId,
    returnMusicAudioId,
    imageInMusicBookletOrCoverSource,
    jumpTargetVideo,
    jumpTargetImage,
    jumpTargetAudioFromImage,
    jumpTargetAudioFromVideo,
    jumpTargetImageFromAudio,
    jumpTargetVideoFromAudio,
    ...jumpActions,
    ...musicBookletBindingActions,
  };
}
