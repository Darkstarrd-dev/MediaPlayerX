import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

import type {
  DeleteImageItemsResponseDto,
  DeleteSidebarNodesResponseDto,
  MoveSidebarNodesResponseDto,
  RenameSidebarNodeResponseDto,
  RenameSidebarNodesRequestDto,
  RenameSidebarNodesResponseDto,
  RenameItemsRequestDto,
  RenameItemsResponseDto,
  SaveVideoCoverRequestDto,
  SaveVideoCoverResponseDto,
  SetImageHiddenResponseDto,
  WritePackageGradeRequestDto,
  WritePackageGradeResponseDto,
  WritePackageMetadataRequestDto,
  WritePackageMetadataResponseDto,
  WritePackageExternalMetadataRequestDto,
  WritePackageExternalMetadataResponseDto,
  WriteVideoMetadataRequestDto,
  WriteVideoMetadataResponseDto,
  WriteAudioMetadataRequestDto,
  WriteAudioMetadataResponseDto,
} from "../../contracts/backend";
import { useI18n } from "../../i18n/useI18n";
import { toErrorDetailWithCode } from "../shared/errorCode";
import type { MediaRepository } from "./repository";

const DEFAULT_WRITE_TIMEOUT_MS = 8_000;

interface UseWriteDataAccessParams {
  repository: MediaRepository;
  setGradeByPackage: Dispatch<SetStateAction<Record<string, number | null>>>;
  setVideoCoverById: Dispatch<SetStateAction<Record<string, string>>>;
  setVideoCoverImageById: Dispatch<
    SetStateAction<Record<string, string | null>>
  >;
}

interface SyncWriteRepository extends MediaRepository {
  writePackageGradeSync(
    request: WritePackageGradeRequestDto,
  ): WritePackageGradeResponseDto;
  writePackageMetadataSync?(
    request: WritePackageMetadataRequestDto,
  ): WritePackageMetadataResponseDto;
  writePackageExternalMetadataSync?(
    request: WritePackageExternalMetadataRequestDto,
  ): WritePackageExternalMetadataResponseDto;
  writeVideoMetadataSync?(
    request: WriteVideoMetadataRequestDto,
  ): WriteVideoMetadataResponseDto;
  writeAudioMetadataSync?(
    request: WriteAudioMetadataRequestDto,
  ): WriteAudioMetadataResponseDto;
  saveVideoCoverSync(
    request: SaveVideoCoverRequestDto,
  ): SaveVideoCoverResponseDto;
}

function isSyncWriteRepository(
  repository: MediaRepository,
): repository is SyncWriteRepository {
  return (
    "writePackageGradeSync" in repository &&
    typeof repository.writePackageGradeSync === "function" &&
    "saveVideoCoverSync" in repository &&
    typeof repository.saveVideoCoverSync === "function"
  );
}

interface UseWriteDataAccessResult {
  pending: {
    grade: boolean;
    metadata: boolean;
    cover: boolean;
    manage: boolean;
  };
  errors: {
    grade: string | null;
    metadata: string | null;
    cover: string | null;
    manage: string | null;
  };
  clearGradeError: () => void;
  clearMetadataError: () => void;
  clearCoverError: () => void;
  clearManageError: () => void;
  writePackageGrade: (packageId: string, grade: number | null) => Promise<void>;
  setImageHidden: (
    imageIds: string[],
    hidden: boolean,
  ) => Promise<SetImageHiddenResponseDto>;
  deleteImageItems: (
    imageIds: string[],
  ) => Promise<DeleteImageItemsResponseDto>;
  deleteSidebarNodes: (
    nodeIds: string[],
    options?: {
      deleteFiles?: boolean
    },
  ) => Promise<DeleteSidebarNodesResponseDto>;
  pickDirectoryPath: (
    title?: string,
    defaultPath?: string,
  ) => Promise<string | null>;
  moveSidebarNodes: (
    nodeIds: string[],
    destinationDirectory: string,
    groupName?: string,
  ) => Promise<MoveSidebarNodesResponseDto>;
  renameSidebarNode: (
    nodeId: string,
    newName: string,
  ) => Promise<RenameSidebarNodeResponseDto>;
  renameSidebarNodes: (
    request: RenameSidebarNodesRequestDto,
  ) => Promise<RenameSidebarNodesResponseDto>;
  renameItems: (
    request: RenameItemsRequestDto,
  ) => Promise<RenameItemsResponseDto>;
  writePackageMetadata: (
    packageId: string,
    payload: {
      workTitle: string;
      seriesId: string;
      circle: string;
      author: string;
      tags: string[];
      syncWorkTitleToPackageName?: boolean;
    },
  ) => Promise<void>;
  writeVideoMetadata: (
    videoId: string,
    payload: {
      workTitle: string;
      workTitleJpn: string;
      seriesId: string;
      circle: string;
      circleJpn: string;
      author: string;
      authorJpn: string;
      tags: string[];
      grade?: number | null;
      syncFileNameToWorkTitle?: boolean;
    },
  ) => Promise<void>;
  writePackageExternalMetadata: (
    packageId: string,
    payload: {
      sourceSite: "nhentai" | "ehentai" | "others";
      sourceUrl: string;
      sourceRemoteId: string;
      sourceToken?: string;
      title?: string;
      titleJpn?: string;
      groupName?: string;
      groupNameJpn?: string;
      artist?: string;
      artistJpn?: string;
      posted?: string;
      rating?: string | null;
      favorited?: string | null;
      tags: Record<string, string>;
      rawJson: string;
      thumbUrl?: string;
    },
  ) => Promise<void>;
  writeAudioMetadata: (
    audioId: string,
    payload: {
      album?: string;
      author?: string;
      trackTitle?: string;
      seriesId?: string;
    },
  ) => Promise<void>;
  saveVideoCover: (
    videoId: string,
    timeSec: number,
    optimisticColor: string,
  ) => Promise<void>;
}

export function useWriteDataAccess({
  repository,
  setGradeByPackage,
  setVideoCoverById,
  setVideoCoverImageById,
}: UseWriteDataAccessParams): UseWriteDataAccessResult {
  const { t } = useI18n();
  const isSynchronousTestMode =
    import.meta.env.MODE === "test" && isSyncWriteRepository(repository);

  const [gradePending, setGradePending] = useState(false);
  const [metadataPending, setMetadataPending] = useState(false);
  const [coverPending, setCoverPending] = useState(false);
  const [managePending, setManagePending] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);

  const writePackageGrade = useCallback(
    async (packageId: string, grade: number | null) => {
      let previousGrade: number | null = null;
      setGradeByPackage((previous) => {
        previousGrade = previous[packageId] ?? null;
        return {
          ...previous,
          [packageId]: grade,
        };
      });

      setGradePending(true);
      setGradeError(null);

      try {
        const request: WritePackageGradeRequestDto = {
          package_id: packageId,
          grade,
        };
        const response = isSynchronousTestMode
          ? repository.writePackageGradeSync(request)
          : await repository.writePackageGrade(request, {
              timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
            });

        setGradeByPackage((previous) => ({
          ...previous,
          [packageId]: response.grade,
        }));
      } catch (error: unknown) {
        setGradeByPackage((previous) => ({
          ...previous,
          [packageId]: previousGrade,
        }));
        setGradeError(toErrorDetailWithCode(error, t));
      } finally {
        setGradePending(false);
      }
    },
    [isSynchronousTestMode, repository, setGradeByPackage, t],
  );

  const saveVideoCover = useCallback(
    async (videoId: string, timeSec: number, optimisticColor: string) => {
      let previousColor: string | null = null;
      let previousCoverImagePath: string | null = null;
      setVideoCoverById((previous) => {
        previousColor = previous[videoId] ?? null;
        return {
          ...previous,
          [videoId]: optimisticColor,
        };
      });
      setVideoCoverImageById((previous) => {
        previousCoverImagePath = previous[videoId] ?? null;
        return previous;
      });

      setCoverPending(true);
      setCoverError(null);

      try {
        const request: SaveVideoCoverRequestDto = {
          video_id: videoId,
          time_sec: Math.max(0, timeSec),
          fallback_color: optimisticColor,
        };
        const response = isSynchronousTestMode
          ? repository.saveVideoCoverSync(request)
          : await repository.saveVideoCover(request, {
              timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
            });

        setVideoCoverById((previous) => ({
          ...previous,
          [videoId]: response.cover_color,
        }));
        setVideoCoverImageById((previous) => ({
          ...previous,
          [videoId]: response.cover_image_path,
        }));
      } catch (error: unknown) {
        setVideoCoverById((previous) => ({
          ...previous,
          [videoId]: previousColor ?? optimisticColor,
        }));
        setVideoCoverImageById((previous) => ({
          ...previous,
          [videoId]: previousCoverImagePath,
        }));
        setCoverError(toErrorDetailWithCode(error, t));
      } finally {
        setCoverPending(false);
      }
    },
    [
      isSynchronousTestMode,
      repository,
      setVideoCoverById,
      setVideoCoverImageById,
      t,
    ],
  );

  const writePackageMetadata = useCallback(
    async (
      packageId: string,
      payload: {
        workTitle: string;
        seriesId: string;
        circle: string;
        author: string;
        tags: string[];
        syncWorkTitleToPackageName?: boolean;
      },
    ) => {
      if (!repository.writePackageMetadata) {
        setMetadataError(t("ui.metadata.backendWriteUnsupported"));
        return;
      }

      setMetadataPending(true);
      setMetadataError(null);

      try {
        const request: WritePackageMetadataRequestDto = {
          package_id: packageId,
          work_title: payload.workTitle,
          series_id: payload.seriesId,
          circle: payload.circle,
          author: payload.author,
          tags: payload.tags,
          sync_work_title_to_package_name: payload.syncWorkTitleToPackageName,
        };

        if (isSynchronousTestMode) {
          const writer = repository.writePackageMetadataSync;
          if (!writer) {
            setMetadataError(t("ui.metadata.backendWriteUnsupported"));
            return;
          }
          writer(request);
          return;
        }

        await repository.writePackageMetadata(request, {
          timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
        });
      } catch (error: unknown) {
        setMetadataError(toErrorDetailWithCode(error, t));
      } finally {
        setMetadataPending(false);
      }
    },
    [isSynchronousTestMode, repository, t],
  );

  const writeVideoMetadata = useCallback(
    async (
      videoId: string,
      payload: {
        workTitle: string;
        workTitleJpn: string;
        seriesId: string;
        circle: string;
        circleJpn: string;
        author: string;
        authorJpn: string;
        tags: string[];
        grade?: number | null;
        syncFileNameToWorkTitle?: boolean;
      },
    ) => {
      if (!repository.writeVideoMetadata) {
        setMetadataError(t("ui.metadata.backendVideoWriteUnsupported"));
        return;
      }

      setMetadataPending(true);
      setMetadataError(null);

      try {
        const request: WriteVideoMetadataRequestDto = {
          video_id: videoId,
          work_title: payload.workTitle,
          work_title_jpn: payload.workTitleJpn,
          series_id: payload.seriesId,
          circle: payload.circle,
          circle_jpn: payload.circleJpn,
          author: payload.author,
          author_jpn: payload.authorJpn,
          tags: payload.tags,
          grade: payload.grade,
          sync_file_name_to_work_title: payload.syncFileNameToWorkTitle,
        };

        if (isSynchronousTestMode) {
          const writer = repository.writeVideoMetadataSync;
          if (!writer) {
            setMetadataError(t("ui.metadata.backendVideoWriteUnsupported"));
            return;
          }
          writer(request);
          return;
        }

        await repository.writeVideoMetadata(request, {
          timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
        });
      } catch (error: unknown) {
        setMetadataError(toErrorDetailWithCode(error, t));
      } finally {
        setMetadataPending(false);
      }
    },
    [isSynchronousTestMode, repository, t],
  );

  const writeAudioMetadata = useCallback(
    async (
      audioId: string,
      payload: {
        album?: string;
        author?: string;
        trackTitle?: string;
        seriesId?: string;
      },
    ) => {
      if (!repository.writeAudioMetadata) {
        setMetadataError(t("ui.metadata.backendAudioWriteUnsupported"));
        return;
      }

      setMetadataPending(true);
      setMetadataError(null);

      try {
        const request: WriteAudioMetadataRequestDto = {
          audio_id: audioId,
          album: payload.album,
          author: payload.author,
          track_title: payload.trackTitle,
          series_id: payload.seriesId,
        };

        if (isSynchronousTestMode) {
          const writer = repository.writeAudioMetadataSync;
          if (!writer) {
            setMetadataError(t("ui.metadata.backendAudioWriteUnsupported"));
            return;
          }
          writer(request);
          return;
        }

        await repository.writeAudioMetadata(request, {
          timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
        });
      } catch (error: unknown) {
        setMetadataError(toErrorDetailWithCode(error, t));
      } finally {
        setMetadataPending(false);
      }
    },
    [isSynchronousTestMode, repository, t],
  );

  const writePackageExternalMetadata = useCallback(
    async (
      packageId: string,
      payload: {
        sourceSite: "nhentai" | "ehentai" | "others";
        sourceUrl: string;
        sourceRemoteId: string;
        sourceToken?: string;
        title?: string;
        titleJpn?: string;
        groupName?: string;
        groupNameJpn?: string;
        artist?: string;
        artistJpn?: string;
        posted?: string;
        rating?: string | null;
        favorited?: string | null;
        tags: Record<string, string>;
        rawJson: string;
        thumbUrl?: string;
      },
    ) => {
      if (!repository.writePackageExternalMetadata) {
        setMetadataError(t("ui.metadata.backendExternalWriteUnsupported"));
        return;
      }

      setMetadataPending(true);
      setMetadataError(null);

      try {
        const request: WritePackageExternalMetadataRequestDto = {
          package_id: packageId,
          source_site: payload.sourceSite,
          source_url: payload.sourceUrl,
          source_remote_id: payload.sourceRemoteId,
          source_token: payload.sourceToken,
          title: payload.title,
          title_jpn: payload.titleJpn,
          group_name: payload.groupName,
          group_name_jpn: payload.groupNameJpn,
          artist: payload.artist,
          artist_jpn: payload.artistJpn,
          posted: payload.posted,
          rating: payload.rating,
          favorited: payload.favorited,
          tags: payload.tags,
          raw_json: payload.rawJson,
          thumb_url: payload.thumbUrl,
        };

        if (isSynchronousTestMode) {
          const writer = repository.writePackageExternalMetadataSync;
          if (!writer) {
            setMetadataError(t("ui.metadata.backendExternalWriteUnsupported"));
            return;
          }
          writer(request);
          return;
        }

        await repository.writePackageExternalMetadata(request, {
          timeoutMs: 15_000,
        });
      } catch (error: unknown) {
        setMetadataError(toErrorDetailWithCode(error, t));
      } finally {
        setMetadataPending(false);
      }
    },
    [isSynchronousTestMode, repository, t],
  );

  const setImageHidden = useCallback(
    async (
      imageIds: string[],
      hidden: boolean,
    ): Promise<SetImageHiddenResponseDto> => {
      if (!repository.setImageHidden) {
        throw new Error("manage_hidden_unsupported");
      }

      const normalizedIds = Array.from(
        new Set(imageIds.map((id) => id.trim()).filter(Boolean)),
      );
      if (normalizedIds.length === 0) {
        throw new Error("manage_hidden_empty_selection");
      }

      setManagePending(true);
      setManageError(null);

      try {
        const response = await repository.setImageHidden(
          {
            image_ids: normalizedIds,
            hidden,
          },
          {
            timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
          },
        );
        return response;
      } catch (error: unknown) {
        const message = toErrorDetailWithCode(error, t);
        setManageError(message);
        throw error instanceof Error ? error : new Error(String(error));
      } finally {
        setManagePending(false);
      }
    },
    [repository, t],
  );

  const deleteImageItems = useCallback(
    async (imageIds: string[]): Promise<DeleteImageItemsResponseDto> => {
      if (!repository.deleteImageItems) {
        throw new Error("manage_delete_images_unsupported");
      }

      const normalizedIds = Array.from(
        new Set(imageIds.map((id) => id.trim()).filter(Boolean)),
      );
      if (normalizedIds.length === 0) {
        throw new Error("manage_delete_images_empty_selection");
      }

      setManagePending(true);
      setManageError(null);

      try {
        const response = await repository.deleteImageItems(
          {
            image_ids: normalizedIds,
          },
          {
            timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
          },
        );
        return response;
      } catch (error: unknown) {
        const message = toErrorDetailWithCode(error, t);
        setManageError(message);
        throw error instanceof Error ? error : new Error(String(error));
      } finally {
        setManagePending(false);
      }
    },
    [repository, t],
  );

  const deleteSidebarNodes = useCallback(
    async (
      nodeIds: string[],
      options?: {
        deleteFiles?: boolean
      },
    ): Promise<DeleteSidebarNodesResponseDto> => {
      if (!repository.deleteSidebarNodes) {
        throw new Error("manage_delete_nodes_unsupported");
      }

      const normalizedIds = Array.from(
        new Set(nodeIds.map((id) => id.trim()).filter(Boolean)),
      );
      if (normalizedIds.length === 0) {
        throw new Error("manage_delete_nodes_empty_selection");
      }

      setManagePending(true);
      setManageError(null);

      try {
        const response = await repository.deleteSidebarNodes(
          {
            node_ids: normalizedIds,
            delete_files: options?.deleteFiles,
          },
          {
            timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
          },
        );
        return response;
      } catch (error: unknown) {
        const message = toErrorDetailWithCode(error, t);
        setManageError(message);
        throw error instanceof Error ? error : new Error(String(error));
      } finally {
        setManagePending(false);
      }
    },
    [repository, t],
  );

  const pickDirectoryPath = useCallback(
    async (title?: string, defaultPath?: string): Promise<string | null> => {
      if (!repository.pickDirectoryPath) {
        throw new Error("manage_pick_directory_unsupported");
      }

      const response = await repository.pickDirectoryPath({
        title,
        default_path: defaultPath,
      });

      if (response.canceled || !response.path) {
        return null;
      }

      return response.path;
    },
    [repository],
  );

  const moveSidebarNodes = useCallback(
    async (
      nodeIds: string[],
      destinationDirectory: string,
      groupName?: string,
    ): Promise<MoveSidebarNodesResponseDto> => {
      if (!repository.moveSidebarNodes) {
        throw new Error("manage_move_nodes_unsupported");
      }

      const normalizedNodeIds = Array.from(
        new Set(nodeIds.map((id) => id.trim()).filter(Boolean)),
      );
      if (normalizedNodeIds.length === 0) {
        throw new Error("manage_move_nodes_empty_selection");
      }

      const normalizedDestinationDirectory = destinationDirectory.trim();
      if (!normalizedDestinationDirectory) {
        throw new Error("manage_move_nodes_empty_destination");
      }

      const normalizedGroupName = groupName?.trim() || undefined;

      setManagePending(true);
      setManageError(null);

      try {
        const response = await repository.moveSidebarNodes(
          {
            node_ids: normalizedNodeIds,
            destination_directory: normalizedDestinationDirectory,
            group_name: normalizedGroupName,
          },
          {
            timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
          },
        );
        return response;
      } catch (error: unknown) {
        const message = toErrorDetailWithCode(error, t);
        setManageError(message);
        throw error instanceof Error ? error : new Error(String(error));
      } finally {
        setManagePending(false);
      }
    },
    [repository, t],
  );

  const renameSidebarNode = useCallback(
    async (
      nodeId: string,
      newName: string,
    ): Promise<RenameSidebarNodeResponseDto> => {
      if (!repository.renameSidebarNode) {
        throw new Error("manage_rename_node_unsupported");
      }

      const normalizedNodeId = nodeId.trim();
      if (!normalizedNodeId) {
        throw new Error("manage_rename_node_empty_selection");
      }

      const normalizedNewName = newName.trim();
      if (!normalizedNewName) {
        throw new Error("manage_rename_node_empty_name");
      }

      setManagePending(true);
      setManageError(null);

      try {
        const response = await repository.renameSidebarNode(
          {
            node_id: normalizedNodeId,
            new_name: normalizedNewName,
          },
          {
            timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
          },
        );
        return response;
      } catch (error: unknown) {
        const message = toErrorDetailWithCode(error, t);
        setManageError(message);
        throw error instanceof Error ? error : new Error(String(error));
      } finally {
        setManagePending(false);
      }
    },
    [repository, t],
  );

  const renameSidebarNodes = useCallback(
    async (
      request: RenameSidebarNodesRequestDto,
    ): Promise<RenameSidebarNodesResponseDto> => {
      if (!repository.renameSidebarNodes) {
        throw new Error("manage_rename_nodes_unsupported");
      }

      const normalizedNodeIds = Array.from(
        new Set(request.node_ids.map((id) => id.trim()).filter(Boolean)),
      );
      if (normalizedNodeIds.length === 0) {
        throw new Error("manage_rename_nodes_empty_selection");
      }

      setManagePending(true);
      setManageError(null);

      try {
        return await repository.renameSidebarNodes(
          {
            ...request,
            node_ids: normalizedNodeIds,
          },
          {
            timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
          },
        );
      } catch (error: unknown) {
        const message = toErrorDetailWithCode(error, t);
        setManageError(message);
        throw error instanceof Error ? error : new Error(String(error));
      } finally {
        setManagePending(false);
      }
    },
    [repository, t],
  );

  const renameItems = useCallback(
    async (
      request: RenameItemsRequestDto,
    ): Promise<RenameItemsResponseDto> => {
      if (!repository.renameItems) {
        throw new Error("manage_rename_items_unsupported");
      }

      setManagePending(true);
      setManageError(null);

      try {
        return await repository.renameItems(request, {
          timeoutMs: DEFAULT_WRITE_TIMEOUT_MS,
        });
      } catch (error: unknown) {
        const message = toErrorDetailWithCode(error, t);
        setManageError(message);
        throw error instanceof Error ? error : new Error(String(error));
      } finally {
        setManagePending(false);
      }
    },
    [repository, t],
  );

  return {
    pending: {
      grade: gradePending,
      metadata: metadataPending,
      cover: coverPending,
      manage: managePending,
    },
    errors: {
      grade: gradeError,
      metadata: metadataError,
      cover: coverError,
      manage: manageError,
    },
    clearGradeError: () => setGradeError(null),
    clearMetadataError: () => setMetadataError(null),
    clearCoverError: () => setCoverError(null),
    clearManageError: () => setManageError(null),
    writePackageGrade,
    setImageHidden,
    deleteImageItems,
    deleteSidebarNodes,
    pickDirectoryPath,
    moveSidebarNodes,
    renameSidebarNode,
    renameSidebarNodes,
    renameItems,
    writePackageMetadata,
    writePackageExternalMetadata,
    writeVideoMetadata,
    writeAudioMetadata,
    saveVideoCover,
  };
}

export type WriteDataAccessResult = ReturnType<typeof useWriteDataAccess>;
