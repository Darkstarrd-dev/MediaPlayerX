import {
  type SetImageHiddenRequestDto,
  type SetImageHiddenResponseDto,
  type DeleteImageItemsRequestDto,
  type DeleteImageItemsResponseDto,
  type DeleteSidebarNodesRequestDto,
  type DeleteSidebarNodesResponseDto,
  type MoveSidebarNodesRequestDto,
  type MoveSidebarNodesResponseDto,
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
}
