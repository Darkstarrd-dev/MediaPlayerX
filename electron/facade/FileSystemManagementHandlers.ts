import {
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type DeleteSidebarNodesRequestDto,
  type DeleteSidebarNodesResponseDto,
  type MoveSidebarNodesRequestDto,
  type MoveSidebarNodesResponseDto,
  type RenameSidebarNodeRequestDto,
  type RenameSidebarNodeResponseDto,
  type RenameSidebarNodesRequestDto,
  type RenameSidebarNodesResponseDto,
  type RenameItemsRequestDto,
  type RenameItemsResponseDto,
  type StartManageAdReviewRequestDto,
  type StartManageAdReviewResponseDto,
  type ReadManageAdReviewTaskRequestDto,
  type ReadManageAdReviewTaskResponseDto,
  type PauseManageAdReviewTaskRequestDto,
  type PauseManageAdReviewTaskResponseDto,
  type TestAdReviewVisionModelRequestDto,
  type TestAdReviewVisionModelResponseDto,
  type ConfirmManageAdReviewDeleteRequestDto,
  type ConfirmManageAdReviewDeleteResponseDto,
  type StartManageCoverReviewRequestDto,
  type StartManageCoverReviewResponseDto,
  type ReadManageCoverReviewTaskRequestDto,
  type ReadManageCoverReviewTaskResponseDto,
  type PauseManageCoverReviewTaskRequestDto,
  type PauseManageCoverReviewTaskResponseDto,
  type ConfirmManageCoverReviewHideRequestDto,
  type ConfirmManageCoverReviewHideResponseDto,
  type StartManageSubtitleCleanupRequestDto,
  type StartManageSubtitleCleanupResponseDto,
  type ReadManageSubtitleCleanupTaskRequestDto,
  type ReadManageSubtitleCleanupTaskResponseDto,
  type RunManageSubtitleCleanupRequestDto,
  type RunManageSubtitleCleanupResponseDto,
  type SaveManageSubtitleCleanupRequestDto,
  type SaveManageSubtitleCleanupResponseDto,
} from '../../src/contracts/backend'
import { FileSystemFacadeContext } from './types'

export class FileSystemManagementHandlers {
  constructor(private context: FileSystemFacadeContext) {}

  async setImageHidden(
    request: SetImageHiddenRequestDto,
  ): Promise<SetImageHiddenResponseDto> {
    return this.context.managementMutationService.setImageHidden(request)
  }

  async deleteImageItems(
    request: DeleteImageItemsRequestDto,
  ): Promise<DeleteImageItemsResponseDto> {
    return this.context.managementMutationService.deleteImageItems(request)
  }

  async deleteSidebarNodes(
    request: DeleteSidebarNodesRequestDto,
  ): Promise<DeleteSidebarNodesResponseDto> {
    return this.context.managementMutationService.deleteSidebarNodes(request)
  }

  async moveSidebarNodes(
    request: MoveSidebarNodesRequestDto,
  ): Promise<MoveSidebarNodesResponseDto> {
    return this.context.managementMutationService.moveSidebarNodes(request)
  }

  async renameSidebarNode(
    request: RenameSidebarNodeRequestDto,
  ): Promise<RenameSidebarNodeResponseDto> {
    return this.context.managementMutationService.renameSidebarNode(request)
  }

  async renameSidebarNodes(
    request: RenameSidebarNodesRequestDto,
  ): Promise<RenameSidebarNodesResponseDto> {
    return this.context.managementMutationService.renameSidebarNodes(request)
  }

  async renameItems(
    request: RenameItemsRequestDto,
  ): Promise<RenameItemsResponseDto> {
    return this.context.managementMutationService.renameItems(request)
  }

  async startManageAdReview(
    request: StartManageAdReviewRequestDto,
  ): Promise<StartManageAdReviewResponseDto> {
    return this.context.manageAdReviewService.startManageAdReview(request)
  }

  async readManageAdReviewTask(
    request: ReadManageAdReviewTaskRequestDto,
  ): Promise<ReadManageAdReviewTaskResponseDto> {
    return this.context.manageAdReviewService.readManageAdReviewTask(request)
  }

  async pauseManageAdReviewTask(
    request: PauseManageAdReviewTaskRequestDto,
  ): Promise<PauseManageAdReviewTaskResponseDto> {
    return this.context.manageAdReviewService.pauseManageAdReviewTask(request)
  }

  async testAdReviewVisionModel(
    request: TestAdReviewVisionModelRequestDto,
  ): Promise<TestAdReviewVisionModelResponseDto> {
    return this.context.manageAdReviewService.testAdReviewVisionModel(request)
  }

  async confirmManageAdReviewDelete(
    request: ConfirmManageAdReviewDeleteRequestDto,
  ): Promise<ConfirmManageAdReviewDeleteResponseDto> {
    return this.context.manageAdReviewService.confirmManageAdReviewDelete(request)
  }

  async startManageCoverReview(
    request: StartManageCoverReviewRequestDto,
  ): Promise<StartManageCoverReviewResponseDto> {
    return this.context.manageCoverReviewService.startManageCoverReview(request)
  }

  async readManageCoverReviewTask(
    request: ReadManageCoverReviewTaskRequestDto,
  ): Promise<ReadManageCoverReviewTaskResponseDto> {
    return this.context.manageCoverReviewService.readManageCoverReviewTask(request)
  }

  async pauseManageCoverReviewTask(
    request: PauseManageCoverReviewTaskRequestDto,
  ): Promise<PauseManageCoverReviewTaskResponseDto> {
    return this.context.manageCoverReviewService.pauseManageCoverReviewTask(request)
  }

  async confirmManageCoverReviewHide(
    request: ConfirmManageCoverReviewHideRequestDto,
  ): Promise<ConfirmManageCoverReviewHideResponseDto> {
    return this.context.manageCoverReviewService.confirmManageCoverReviewHide(request)
  }

  async startManageSubtitleCleanup(
    request: StartManageSubtitleCleanupRequestDto,
  ): Promise<StartManageSubtitleCleanupResponseDto> {
    return this.context.libraryReadWriteService.startManageSubtitleCleanup(request)
  }

  async readManageSubtitleCleanupTask(
    request: ReadManageSubtitleCleanupTaskRequestDto,
  ): Promise<ReadManageSubtitleCleanupTaskResponseDto> {
    return this.context.libraryReadWriteService.readManageSubtitleCleanupTask(request)
  }

  async runManageSubtitleCleanup(
    request: RunManageSubtitleCleanupRequestDto,
  ): Promise<RunManageSubtitleCleanupResponseDto> {
    return this.context.libraryReadWriteService.runManageSubtitleCleanup(request)
  }

  async saveManageSubtitleCleanup(
    request: SaveManageSubtitleCleanupRequestDto,
  ): Promise<SaveManageSubtitleCleanupResponseDto> {
    return this.context.libraryReadWriteService.saveManageSubtitleCleanup(request)
  }
}
