import type { z } from "zod";

import type * as Backend from "./backend.schemas";

type Infer<T extends z.ZodTypeAny> = z.infer<T>;

export type FeatureFilterDto = Infer<typeof Backend.featureFilterDtoSchema>;
export type MediaLocatorDto = Infer<typeof Backend.mediaLocatorDtoSchema>;
export type ImageItemDto = Infer<typeof Backend.imageItemDtoSchema>;
export type ImagePackageDto = Infer<typeof Backend.imagePackageDtoSchema>;
export type ImageSourceLiteDto = Infer<typeof Backend.imageSourceLiteDtoSchema>;
export type VideoItemDto = Infer<typeof Backend.videoItemDtoSchema>;
export type AudioItemDto = Infer<typeof Backend.audioItemDtoSchema>;
export type FocusedImageRefDto = Infer<typeof Backend.focusedImageRefDtoSchema>;
export type SidebarNodeDto = Infer<typeof Backend.sidebarNodeDtoSchema>;
export type LibrarySnapshotDto = Infer<typeof Backend.librarySnapshotDtoSchema>;
export type LibrarySnapshotLiteDto = Infer<
  typeof Backend.librarySnapshotLiteDtoSchema
>;
export type ReadImageSidebarTreeRequestDto = Infer<
  typeof Backend.readImageSidebarTreeRequestSchema
>;
export type ReadImageSidebarTreeResponseDto = Infer<
  typeof Backend.readImageSidebarTreeResponseSchema
>;
export type ReadImagePageRequestDto = Infer<
  typeof Backend.readImagePageRequestSchema
>;
export type ReadImagePageResponseDto = Infer<
  typeof Backend.readImagePageResponseSchema
>;
export type ReadImageMetadataRequestDto = Infer<
  typeof Backend.readImageMetadataRequestSchema
>;
export type ReadImageMetadataResponseDto = Infer<
  typeof Backend.readImageMetadataResponseSchema
>;
export type ResolveMediaResourceRequestDto = Infer<
  typeof Backend.resolveMediaResourceRequestSchema
>;
export type ResolveMediaResourceResponseDto = Infer<
  typeof Backend.resolveMediaResourceResponseSchema
>;
export type UpdatePerformanceConfigRequestDto = Infer<
  typeof Backend.updatePerformanceConfigRequestSchema
>;
export type UpdatePerformanceConfigResponseDto = Infer<
  typeof Backend.updatePerformanceConfigResponseSchema
>;
export type WritePackageGradeRequestDto = Infer<
  typeof Backend.writePackageGradeRequestSchema
>;
export type WritePackageGradeResponseDto = Infer<
  typeof Backend.writePackageGradeResponseSchema
>;
export type SetImageHiddenRequestDto = Infer<
  typeof Backend.setImageHiddenRequestSchema
>;
export type SetImageHiddenResponseDto = Infer<
  typeof Backend.setImageHiddenResponseSchema
>;
export type DeleteImageItemsRequestDto = Infer<
  typeof Backend.deleteImageItemsRequestSchema
>;
export type DeleteImageItemsResponseDto = Infer<
  typeof Backend.deleteImageItemsResponseSchema
>;
export type DeleteSidebarNodesRequestDto = Infer<
  typeof Backend.deleteSidebarNodesRequestSchema
>;
export type DeleteSidebarNodesResponseDto = Infer<
  typeof Backend.deleteSidebarNodesResponseSchema
>;
export type MoveSidebarNodesRequestDto = Infer<
  typeof Backend.moveSidebarNodesRequestSchema
>;
export type MoveSidebarNodesResponseDto = Infer<
  typeof Backend.moveSidebarNodesResponseSchema
>;
export type RenameSidebarNodeRequestDto = Infer<
  typeof Backend.renameSidebarNodeRequestSchema
>;
export type RenameSidebarNodeResponseDto = Infer<
  typeof Backend.renameSidebarNodeResponseSchema
>;
export type BatchRenameSidebarModeDto = Infer<
  typeof Backend.batchRenameSidebarModeSchema
>;
export type RenameSidebarNodesRequestDto = Infer<
  typeof Backend.renameSidebarNodesRequestSchema
>;
export type RenameSidebarNodesResponseDto = Infer<
  typeof Backend.renameSidebarNodesResponseSchema
>;
export type RenameItemTargetDto = Infer<typeof Backend.renameItemTargetSchema>;
export type RenameItemsModeDto = Infer<typeof Backend.renameItemsModeSchema>;
export type RenameItemsRequestDto = Infer<
  typeof Backend.renameItemsRequestSchema
>;
export type RenameItemsResponseDto = Infer<
  typeof Backend.renameItemsResponseSchema
>;
export type ManageAdReviewSelectionScopeDto = Infer<
  typeof Backend.manageAdReviewSelectionScopeSchema
>;
export type ManageReviewModeDto = Infer<typeof Backend.manageReviewModeSchema>;
export type ManageAdReviewDecisionSourceDto = Infer<
  typeof Backend.manageAdReviewDecisionSourceSchema
>;
export type ManageAdReviewImageSourceDto = Infer<
  typeof Backend.manageAdReviewImageSourceSchema
>;
export type ManageAdReviewTaskStatusDto = Infer<
  typeof Backend.manageAdReviewTaskStatusSchema
>;
export type ManageAdReviewExecutionModeDto = Infer<
  typeof Backend.manageAdReviewExecutionModeSchema
>;
export type ManageAdReviewAllStrategyDto = Infer<
  typeof Backend.manageAdReviewAllStrategySchema
>;
export type ManageAdReviewHeadTailStrategyDto = Infer<
  typeof Backend.manageAdReviewHeadTailStrategySchema
>;
export type ManageAdReviewStrategyDto = Infer<
  typeof Backend.manageAdReviewStrategySchema
>;
export type ManageAdReviewTaskExecutionDto = Infer<
  typeof Backend.manageAdReviewTaskExecutionSchema
>;
export type ManageAdReviewPerformanceResultDto = Infer<
  typeof Backend.manageAdReviewPerformanceResultSchema
>;
export type ManageAdReviewSourceDistributionDto = Infer<
  typeof Backend.manageAdReviewSourceDistributionSchema
>;
export type ManageAdReviewTaskAuditDto = Infer<
  typeof Backend.manageAdReviewTaskAuditSchema
>;
export type ManageAdReviewCandidateDto = Infer<
  typeof Backend.manageAdReviewCandidateSchema
>;
export type ManageAdReviewTaskDto = Infer<
  typeof Backend.manageAdReviewTaskSchema
>;
export type ManageCoverReviewDecisionSourceDto =
  ManageAdReviewDecisionSourceDto;
export type ManageCoverReviewImageSourceDto = ManageAdReviewImageSourceDto;
export type ManageCoverReviewTaskStatusDto = ManageAdReviewTaskStatusDto;
export type ManageCoverReviewStrategyDto = ManageAdReviewStrategyDto;
export type ManageCoverReviewTaskExecutionDto = ManageAdReviewTaskExecutionDto;
export type ManageCoverReviewSourceDistributionDto =
  ManageAdReviewSourceDistributionDto;
export type ManageCoverReviewTaskAuditDto = ManageAdReviewTaskAuditDto;
export type ManageCoverReviewCandidateDto = ManageAdReviewCandidateDto;
export type StartManageAdReviewRequestDto = Infer<
  typeof Backend.startManageAdReviewRequestSchema
>;
export type StartManageAdReviewResponseDto = Infer<
  typeof Backend.startManageAdReviewResponseSchema
>;
export type ReadManageAdReviewTaskRequestDto = Infer<
  typeof Backend.readManageAdReviewTaskRequestSchema
>;
export type ReadManageAdReviewTaskResponseDto = Infer<
  typeof Backend.readManageAdReviewTaskResponseSchema
>;
export type PauseManageAdReviewTaskRequestDto = Infer<
  typeof Backend.pauseManageAdReviewTaskRequestSchema
>;
export type PauseManageAdReviewTaskResponseDto = Infer<
  typeof Backend.pauseManageAdReviewTaskResponseSchema
>;
export type TestAdReviewVisionModelRequestDto = Infer<
  typeof Backend.testAdReviewVisionModelRequestSchema
>;
export type TestAdReviewVisionModelResponseDto = Infer<
  typeof Backend.testAdReviewVisionModelResponseSchema
>;
export type ConfirmManageAdReviewDeleteRequestDto = Infer<
  typeof Backend.confirmManageAdReviewDeleteRequestSchema
>;
export type ConfirmManageAdReviewDeleteResponseDto = Infer<
  typeof Backend.confirmManageAdReviewDeleteResponseSchema
>;
export type ManageCoverReviewTaskDto = Infer<
  typeof Backend.manageCoverReviewTaskSchema
>;
export type StartManageCoverReviewRequestDto = Infer<
  typeof Backend.startManageCoverReviewRequestSchema
>;
export type StartManageCoverReviewResponseDto = Infer<
  typeof Backend.startManageCoverReviewResponseSchema
>;
export type ReadManageCoverReviewTaskRequestDto = Infer<
  typeof Backend.readManageCoverReviewTaskRequestSchema
>;
export type ReadManageCoverReviewTaskResponseDto = Infer<
  typeof Backend.readManageCoverReviewTaskResponseSchema
>;
export type PauseManageCoverReviewTaskRequestDto = Infer<
  typeof Backend.pauseManageCoverReviewTaskRequestSchema
>;
export type PauseManageCoverReviewTaskResponseDto = Infer<
  typeof Backend.pauseManageCoverReviewTaskResponseSchema
>;
export type ConfirmManageCoverReviewHideRequestDto = Infer<
  typeof Backend.confirmManageCoverReviewHideRequestSchema
>;
export type ConfirmManageCoverReviewHideResponseDto = Infer<
  typeof Backend.confirmManageCoverReviewHideResponseSchema
>;
export type ManageSubtitleCleanupTaskStatusDto = Infer<
  typeof Backend.manageSubtitleCleanupTaskStatusSchema
>;
export type ManageSubtitleCleanupStageDto = Infer<
  typeof Backend.manageSubtitleCleanupStageSchema
>;
export type ManageSubtitleCleanupTaskDto = Infer<
  typeof Backend.manageSubtitleCleanupTaskSchema
>;
export type StartManageSubtitleCleanupRequestDto = Infer<
  typeof Backend.startManageSubtitleCleanupRequestSchema
>;
export type StartManageSubtitleCleanupResponseDto = Infer<
  typeof Backend.startManageSubtitleCleanupResponseSchema
>;
export type ReadManageSubtitleCleanupTaskRequestDto = Infer<
  typeof Backend.readManageSubtitleCleanupTaskRequestSchema
>;
export type ReadManageSubtitleCleanupTaskResponseDto = Infer<
  typeof Backend.readManageSubtitleCleanupTaskResponseSchema
>;
export type RunManageSubtitleCleanupRequestDto = Infer<
  typeof Backend.runManageSubtitleCleanupRequestSchema
>;
export type RunManageSubtitleCleanupResponseDto = Infer<
  typeof Backend.runManageSubtitleCleanupResponseSchema
>;
export type SaveManageSubtitleCleanupRequestDto = Infer<
  typeof Backend.saveManageSubtitleCleanupRequestSchema
>;
export type SaveManageSubtitleCleanupResponseDto = Infer<
  typeof Backend.saveManageSubtitleCleanupResponseSchema
>;
export type ImageConvertTaskStatusDto = Infer<
  typeof Backend.imageConvertTaskStatusSchema
>;
export type ImageConvertFormatDto = Infer<
  typeof Backend.imageConvertFormatSchema
>;
export type ImageConvertAdjustModeDto = Infer<
  typeof Backend.imageConvertAdjustModeSchema
>;
export type ImageConvertAdjustProfile = Infer<
  typeof Backend.imageConvertAdjustProfileSchema
>;
export type ImageConvertTaskDto = Infer<typeof Backend.imageConvertTaskSchema>;
export type StartImageConvertTaskRequestDto = Infer<
  typeof Backend.startImageConvertTaskRequestSchema
>;
export type StartImageConvertTaskResponseDto = Infer<
  typeof Backend.startImageConvertTaskResponseSchema
>;
export type ReadImageConvertTaskRequestDto = Infer<
  typeof Backend.readImageConvertTaskRequestSchema
>;
export type ReadImageConvertTaskResponseDto = Infer<
  typeof Backend.readImageConvertTaskResponseSchema
>;
export type CancelImageConvertTaskRequestDto = Infer<
  typeof Backend.cancelImageConvertTaskRequestSchema
>;
export type CancelImageConvertTaskResponseDto = Infer<
  typeof Backend.cancelImageConvertTaskResponseSchema
>;
export type AudioTranscodeTaskStatusDto = Infer<
  typeof Backend.audioTranscodeTaskStatusSchema
>;
export type AudioTranscodePresetDto = Infer<
  typeof Backend.audioTranscodePresetSchema
>;
export type AudioTranscodePresetCapabilityReasonDto = Infer<
  typeof Backend.audioTranscodePresetCapabilityReasonSchema
>;
export type AudioTranscodePresetCapabilityDto = Infer<
  typeof Backend.audioTranscodePresetCapabilitySchema
>;
export type AudioTranscodeMetadataModeDto = Infer<
  typeof Backend.audioTranscodeMetadataModeSchema
>;
export type AudioTranscodeSampleRateDto = Infer<
  typeof Backend.audioTranscodeSampleRateSchema
>;
export type AudioTranscodeChannelsDto = Infer<
  typeof Backend.audioTranscodeChannelsSchema
>;
export type AudioTranscodeWavBitDepthDto = Infer<
  typeof Backend.audioTranscodeWavBitDepthSchema
>;
export type AudioTranscodeParamsDto = Infer<
  typeof Backend.audioTranscodeParamsSchema
>;
export type ReadAudioTranscodeCapabilitiesResponseDto = Infer<
  typeof Backend.readAudioTranscodeCapabilitiesResponseSchema
>;
export type AudioTranscodeTaskDto = Infer<
  typeof Backend.audioTranscodeTaskSchema
>;
export type StartAudioTranscodeTaskRequestDto = Infer<
  typeof Backend.startAudioTranscodeTaskRequestSchema
>;
export type StartAudioTranscodeTaskResponseDto = Infer<
  typeof Backend.startAudioTranscodeTaskResponseSchema
>;
export type ReadAudioTranscodeTaskRequestDto = Infer<
  typeof Backend.readAudioTranscodeTaskRequestSchema
>;
export type ReadAudioTranscodeTaskResponseDto = Infer<
  typeof Backend.readAudioTranscodeTaskResponseSchema
>;
export type CancelAudioTranscodeTaskRequestDto = Infer<
  typeof Backend.cancelAudioTranscodeTaskRequestSchema
>;
export type CancelAudioTranscodeTaskResponseDto = Infer<
  typeof Backend.cancelAudioTranscodeTaskResponseSchema
>;
export type VideoTranscodeTaskStatusDto = Infer<
  typeof Backend.videoTranscodeTaskStatusSchema
>;
export type VideoTranscodeContainerDto = Infer<
  typeof Backend.videoTranscodeContainerSchema
>;
export type VideoTranscodeVideoCodecDto = Infer<
  typeof Backend.videoTranscodeVideoCodecSchema
>;
export type VideoTranscodeAudioModeDto = Infer<
  typeof Backend.videoTranscodeAudioModeSchema
>;
export type VideoTranscodeQualityModeDto = Infer<
  typeof Backend.videoTranscodeQualityModeSchema
>;
export type VideoTranscodePresetDto = Infer<
  typeof Backend.videoTranscodePresetSchema
>;
export type VideoTranscodeCapabilityReasonDto = Infer<
  typeof Backend.videoTranscodeCapabilityReasonSchema
>;
export type VideoTranscodeContainerCapabilityDto = Infer<
  typeof Backend.videoTranscodeContainerCapabilitySchema
>;
export type VideoTranscodeCodecCapabilityDto = Infer<
  typeof Backend.videoTranscodeCodecCapabilitySchema
>;
export type VideoTranscodeParamsDto = Infer<
  typeof Backend.videoTranscodeParamsSchema
>;
export type VideoTranscodeTaskDto = Infer<
  typeof Backend.videoTranscodeTaskSchema
>;
export type StartVideoTranscodeTaskRequestDto = Infer<
  typeof Backend.startVideoTranscodeTaskRequestSchema
>;
export type StartVideoTranscodeTaskResponseDto = Infer<
  typeof Backend.startVideoTranscodeTaskResponseSchema
>;
export type ReadVideoTranscodeTaskRequestDto = Infer<
  typeof Backend.readVideoTranscodeTaskRequestSchema
>;
export type ReadVideoTranscodeTaskResponseDto = Infer<
  typeof Backend.readVideoTranscodeTaskResponseSchema
>;
export type CancelVideoTranscodeTaskRequestDto = Infer<
  typeof Backend.cancelVideoTranscodeTaskRequestSchema
>;
export type CancelVideoTranscodeTaskResponseDto = Infer<
  typeof Backend.cancelVideoTranscodeTaskResponseSchema
>;
export type ReadVideoTranscodeCapabilitiesResponseDto = Infer<
  typeof Backend.readVideoTranscodeCapabilitiesResponseSchema
>;
export type EstimateVideoTranscodeOutputSizeRequestDto = Infer<
  typeof Backend.estimateVideoTranscodeOutputSizeRequestSchema
>;
export type EstimateVideoTranscodeOutputSizeResponseDto = Infer<
  typeof Backend.estimateVideoTranscodeOutputSizeResponseSchema
>;
export type EstimateVideoTranscodeMethodDto = Infer<
  typeof Backend.estimateVideoTranscodeMethodSchema
>;
export type EstimateVideoTranscodeConfidenceDto = Infer<
  typeof Backend.estimateVideoTranscodeConfidenceSchema
>;
export type EstimateVideoTranscodeRangeDto = Infer<
  typeof Backend.estimateVideoTranscodeRangeSchema
>;
export type WritePackageMetadataRequestDto = Infer<
  typeof Backend.writePackageMetadataRequestSchema
>;
export type WritePackageMetadataResponseDto = Infer<
  typeof Backend.writePackageMetadataResponseSchema
>;
export type WritePackageExternalMetadataRequestDto = Infer<
  typeof Backend.writePackageExternalMetadataRequestSchema
>;
export type WritePackageExternalMetadataResponseDto = Infer<
  typeof Backend.writePackageExternalMetadataResponseSchema
>;
export type SearchExternalMetadataRequestDto = Infer<
  typeof Backend.searchExternalMetadataRequestSchema
>;
export type ExternalAuthProviderDto = Infer<
  typeof Backend.externalAuthProviderSchema
>;
export type ExternalAuthStatusRequestDto = Infer<
  typeof Backend.externalAuthStatusRequestSchema
>;
export type ExternalAuthStatusResponseDto = Infer<
  typeof Backend.externalAuthStatusResponseSchema
>;
export type ExternalAuthConnectRequestDto = Infer<
  typeof Backend.externalAuthConnectRequestSchema
>;
export type ExternalAuthConnectResponseDto = Infer<
  typeof Backend.externalAuthConnectResponseSchema
>;
export type ExternalAuthDisconnectRequestDto = Infer<
  typeof Backend.externalAuthDisconnectRequestSchema
>;
export type ExternalAuthDisconnectResponseDto = Infer<
  typeof Backend.externalAuthDisconnectResponseSchema
>;
export type ExternalMetadataResultItemDto = Infer<
  typeof Backend.externalMetadataResultItemSchema
>;
export type SearchExternalMetadataDebugStepDto = Infer<
  typeof Backend.searchExternalMetadataDebugStepSchema
>;
export type SearchExternalMetadataDebugDto = Infer<
  typeof Backend.searchExternalMetadataDebugSchema
>;
export type SearchExternalMetadataResponseDto = Infer<
  typeof Backend.searchExternalMetadataResponseSchema
>;
export type WriteVideoMetadataRequestDto = Infer<
  typeof Backend.writeVideoMetadataRequestSchema
>;
export type WriteVideoMetadataResponseDto = Infer<
  typeof Backend.writeVideoMetadataResponseSchema
>;
export type WriteAudioMetadataRequestDto = Infer<
  typeof Backend.writeAudioMetadataRequestSchema
>;
export type WriteAudioMetadataResponseDto = Infer<
  typeof Backend.writeAudioMetadataResponseSchema
>;
export type SaveVideoCoverRequestDto = Infer<
  typeof Backend.saveVideoCoverRequestSchema
>;
export type SaveVideoCoverResponseDto = Infer<
  typeof Backend.saveVideoCoverResponseSchema
>;
export type ReadPlaylistResponseDto = Infer<
  typeof Backend.readPlaylistResponseSchema
>;
export type SubtitleFormatDto = Infer<typeof Backend.subtitleFormatDtoSchema>;
export type SubtitleSourceDto = Infer<typeof Backend.subtitleSourceDtoSchema>;
export type ListVideoSubtitlesRequestDto = Infer<
  typeof Backend.listVideoSubtitlesRequestSchema
>;
export type ListVideoSubtitlesResponseDto = Infer<
  typeof Backend.listVideoSubtitlesResponseSchema
>;
export type PrepareSubtitleTrackRequestDto = Infer<
  typeof Backend.prepareSubtitleTrackRequestSchema
>;
export type PrepareSubtitleTrackResponseDto = Infer<
  typeof Backend.prepareSubtitleTrackResponseSchema
>;
export type WritePlaylistRequestDto = Infer<
  typeof Backend.writePlaylistRequestSchema
>;
export type WritePlaylistResponseDto = Infer<
  typeof Backend.writePlaylistResponseSchema
>;
export type ImportTaskStatusDto = Infer<typeof Backend.importTaskStatusSchema>;
export type ImportTaskSourceDto = Infer<typeof Backend.importTaskSourceSchema>;
export type ImportTaskDto = Infer<typeof Backend.importTaskDtoSchema>;
export type EnqueueImportTaskRequestDto = Infer<
  typeof Backend.enqueueImportTaskRequestSchema
>;
export type EnqueueImportTaskResponseDto = Infer<
  typeof Backend.enqueueImportTaskResponseSchema
>;
export type ReadImportTasksResponseDto = Infer<
  typeof Backend.readImportTasksResponseSchema
>;
export type RetryImportTaskRequestDto = Infer<
  typeof Backend.retryImportTaskRequestSchema
>;
export type RetryImportTaskResponseDto = Infer<
  typeof Backend.retryImportTaskResponseSchema
>;
export type PickImportPathsRequestDto = Infer<
  typeof Backend.pickImportPathsRequestSchema
>;
export type PickImportPathsResponseDto = Infer<
  typeof Backend.pickImportPathsResponseSchema
>;
export type FileDialogFilterDto = Infer<typeof Backend.fileDialogFilterSchema>;
export type PickFilePathRequestDto = Infer<
  typeof Backend.pickFilePathRequestSchema
>;
export type PickFilePathResponseDto = Infer<
  typeof Backend.pickFilePathResponseSchema
>;
export type PickDirectoryPathRequestDto = Infer<
  typeof Backend.pickDirectoryPathRequestSchema
>;
export type PickDirectoryPathResponseDto = Infer<
  typeof Backend.pickDirectoryPathResponseSchema
>;
export type ReadClipboardImportPathsResponseDto = Infer<
  typeof Backend.readClipboardImportPathsResponseSchema
>;
export type ClearDatabaseResponseDto = Infer<
  typeof Backend.clearDatabaseResponseSchema
>;
export type ReadArchiveLoadStatusResponseDto = Infer<
  typeof Backend.readArchiveLoadStatusResponseSchema
>;
export type ReadAppStateRequestDto = Infer<
  typeof Backend.readAppStateRequestSchema
>;
export type ReadAppStateResponseDto = Infer<
  typeof Backend.readAppStateResponseSchema
>;
export type WriteAppStateRequestDto = Infer<
  typeof Backend.writeAppStateRequestSchema
>;
export type WriteAppStateResponseDto = Infer<
  typeof Backend.writeAppStateResponseSchema
>;
export type OpenExternalUrlRequestDto = Infer<
  typeof Backend.openExternalUrlRequestSchema
>;
export type OpenExternalUrlResponseDto = Infer<
  typeof Backend.openExternalUrlResponseSchema
>;
export type SubtitleEngineProviderDto = Infer<
  typeof Backend.subtitleEngineProviderSchema
>;
export type SubtitleEngineSourceDto = Infer<
  typeof Backend.subtitleEngineSourceSchema
>;
export type ReadSubtitleEngineStatusResponseDto = Infer<
  typeof Backend.readSubtitleEngineStatusResponseSchema
>;
export type SubtitleRemoteModelArtifactDto = Infer<
  typeof Backend.subtitleRemoteModelArtifactSchema
>;
export type SubtitleRemoteModelDto = Infer<
  typeof Backend.subtitleRemoteModelSchema
>;
export type ListSubtitleRemoteModelsResponseDto = Infer<
  typeof Backend.listSubtitleRemoteModelsResponseSchema
>;
export type SubtitleLocalModelDto = Infer<
  typeof Backend.subtitleLocalModelSchema
>;
export type ListSubtitleLocalModelsRequestDto = Infer<
  typeof Backend.listSubtitleLocalModelsRequestSchema
>;
export type ListSubtitleLocalModelsResponseDto = Infer<
  typeof Backend.listSubtitleLocalModelsResponseSchema
>;
export type SubtitleModelDownloadStatusDto = Infer<
  typeof Backend.subtitleModelDownloadStatusSchema
>;
export type SubtitleModelDownloadTaskDto = Infer<
  typeof Backend.subtitleModelDownloadTaskSchema
>;
export type StartSubtitleModelDownloadRequestDto = Infer<
  typeof Backend.startSubtitleModelDownloadRequestSchema
>;
export type StartSubtitleModelDownloadResponseDto = Infer<
  typeof Backend.startSubtitleModelDownloadResponseSchema
>;
export type CancelSubtitleModelDownloadRequestDto = Infer<
  typeof Backend.cancelSubtitleModelDownloadRequestSchema
>;
export type CancelSubtitleModelDownloadResponseDto = Infer<
  typeof Backend.cancelSubtitleModelDownloadResponseSchema
>;
export type ReadSubtitleModelDownloadsResponseDto = Infer<
  typeof Backend.readSubtitleModelDownloadsResponseSchema
>;
export type ClearSubtitleLocalModelRequestDto = Infer<
  typeof Backend.clearSubtitleLocalModelRequestSchema
>;
export type ClearSubtitleLocalModelResponseDto = Infer<
  typeof Backend.clearSubtitleLocalModelResponseSchema
>;
export type SubtitleSessionProviderPreferenceDto = Infer<
  typeof Backend.subtitleSessionProviderPreferenceSchema
>;
export type SubtitleSessionProviderDto = Infer<
  typeof Backend.subtitleSessionProviderSchema
>;
export type SubtitleCueDto = Infer<typeof Backend.subtitleCueSchema>;
export type SubtitleSessionEventDto = Infer<
  typeof Backend.subtitleSessionEventSchema
>;
export type StartSubtitleSessionRequestDto = Infer<
  typeof Backend.startSubtitleSessionRequestSchema
>;
export type StartSubtitleSessionResponseDto = Infer<
  typeof Backend.startSubtitleSessionResponseSchema
>;
export type StopSubtitleSessionRequestDto = Infer<
  typeof Backend.stopSubtitleSessionRequestSchema
>;
export type StopSubtitleSessionResponseDto = Infer<
  typeof Backend.stopSubtitleSessionResponseSchema
>;
export type ResetSubtitleSessionRequestDto = Infer<
  typeof Backend.resetSubtitleSessionRequestSchema
>;
export type ResetSubtitleSessionResponseDto = Infer<
  typeof Backend.resetSubtitleSessionResponseSchema
>;
export type FlushSubtitleSessionResponseDto = Infer<
  typeof Backend.flushSubtitleSessionResponseSchema
>;
export type PushSubtitleAudioRequestDto = Infer<
  typeof Backend.pushSubtitleAudioRequestSchema
>;
export type PushSubtitleAudioResponseDto = Infer<
  typeof Backend.pushSubtitleAudioResponseSchema
>;
export type StartSubtitlePersistenceRequestDto = Infer<
  typeof Backend.startSubtitlePersistenceRequestSchema
>;
export type StartSubtitlePersistenceResponseDto = Infer<
  typeof Backend.startSubtitlePersistenceResponseSchema
>;
export type AppendSubtitlePersistenceRequestDto = Infer<
  typeof Backend.appendSubtitlePersistenceRequestSchema
>;
export type AppendSubtitlePersistenceResponseDto = Infer<
  typeof Backend.appendSubtitlePersistenceResponseSchema
>;
export type ReadSubtitlePersistenceWindowRequestDto = Infer<
  typeof Backend.readSubtitlePersistenceWindowRequestSchema
>;
export type ReadSubtitlePersistenceWindowResponseDto = Infer<
  typeof Backend.readSubtitlePersistenceWindowResponseSchema
>;
export type RuntimeCapabilityStatusDto = Infer<
  typeof Backend.runtimeCapabilityStatusSchema
>;
export type RuntimeCapabilityMatrixItemDto = Infer<
  typeof Backend.runtimeCapabilityMatrixItemSchema
>;
export type ReadRuntimeCapabilitiesResponseDto = Infer<
  typeof Backend.readRuntimeCapabilitiesResponseSchema
>;
export type RuntimeMediaCapabilityHintDto = Infer<
  typeof Backend.runtimeMediaCapabilityHintSchema
>;
export type AudioEngineModeDto = Infer<typeof Backend.audioEngineModeSchema>;
export type AudioGaplessModeDto = Infer<typeof Backend.audioGaplessModeSchema>;
export type AudioReplayGainModeDto = Infer<
  typeof Backend.audioReplayGainModeSchema
>;
export type AudioOutputDeviceDto = Infer<
  typeof Backend.audioOutputDeviceSchema
>;
export type ReadAudioEngineStateResponseDto = Infer<
  typeof Backend.readAudioEngineStateResponseSchema
>;
export type SetAudioEngineModeRequestDto = Infer<
  typeof Backend.setAudioEngineModeRequestSchema
>;
export type SetAudioEngineModeResponseDto = Infer<
  typeof Backend.setAudioEngineModeResponseSchema
>;
export type VerifyAudioEngineMpvBinRequestDto = Infer<
  typeof Backend.verifyAudioEngineMpvBinRequestSchema
>;
export type VerifyAudioEngineMpvBinResponseDto = Infer<
  typeof Backend.verifyAudioEngineMpvBinResponseSchema
>;
export type VerifyAudioTranscodeFfmpegBinRequestDto = Infer<
  typeof Backend.verifyAudioTranscodeFfmpegBinRequestSchema
>;
export type VerifyAudioTranscodeFfmpegBinResponseDto = Infer<
  typeof Backend.verifyAudioTranscodeFfmpegBinResponseSchema
>;
export type ListAudioOutputDevicesResponseDto = Infer<
  typeof Backend.listAudioOutputDevicesResponseSchema
>;
export type SetAudioOutputDeviceRequestDto = Infer<
  typeof Backend.setAudioOutputDeviceRequestSchema
>;
export type SetAudioOutputDeviceResponseDto = Infer<
  typeof Backend.setAudioOutputDeviceResponseSchema
>;
export type SetAudioExclusiveRequestDto = Infer<
  typeof Backend.setAudioExclusiveRequestSchema
>;
export type SetAudioExclusiveResponseDto = Infer<
  typeof Backend.setAudioExclusiveResponseSchema
>;
export type SetAudioGaplessModeRequestDto = Infer<
  typeof Backend.setAudioGaplessModeRequestSchema
>;
export type SetAudioGaplessModeResponseDto = Infer<
  typeof Backend.setAudioGaplessModeResponseSchema
>;
export type SetAudioReplayGainModeRequestDto = Infer<
  typeof Backend.setAudioReplayGainModeRequestSchema
>;
export type SetAudioReplayGainModeResponseDto = Infer<
  typeof Backend.setAudioReplayGainModeResponseSchema
>;
export type AudioEngineActionResponseDto = Infer<
  typeof Backend.audioEngineActionResponseSchema
>;
export type ReadAudioEnginePlaybackStatusResponseDto = Infer<
  typeof Backend.readAudioEnginePlaybackStatusResponseSchema
>;
export type ReadAudioEngineAnalysisFrameResponseDto = Infer<
  typeof Backend.readAudioEngineAnalysisFrameResponseSchema
>;
export type AudioEngineLoadTrackRequestDto = Infer<
  typeof Backend.audioEngineLoadTrackRequestSchema
>;
export type AudioEngineSetPausedRequestDto = Infer<
  typeof Backend.audioEngineSetPausedRequestSchema
>;
export type AudioEngineSeekToRequestDto = Infer<
  typeof Backend.audioEngineSeekToRequestSchema
>;
export type AudioEngineSetVolumeRequestDto = Infer<
  typeof Backend.audioEngineSetVolumeRequestSchema
>;
export type ReadRuntimeInfoResponseDto = Infer<
  typeof Backend.readRuntimeInfoResponseSchema
>;
export type SetRuntimeStoragePathsRequestDto = Infer<
  typeof Backend.setRuntimeStoragePathsRequestSchema
>;
export type SetRuntimeStoragePathsResponseDto = Infer<
  typeof Backend.setRuntimeStoragePathsResponseSchema
>;
export type MediaAccessAuditResponseDto = Infer<
  typeof Backend.mediaAccessAuditResponseSchema
>;
