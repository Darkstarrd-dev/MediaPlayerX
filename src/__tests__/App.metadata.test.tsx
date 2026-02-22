import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";
import type { LibrarySnapshotDto } from "../contracts/backend";
import { MockMediaRepository } from "../features/backend/repository/mockRepository";
import { resetUiStoreState } from "../store/useUiStore";

describe("MediaPlayer 虚拟 UI - metadata", () => {
  const uiLongTestTimeoutMs = 25_000;

  const getMetadataManageModeButton = () =>
    screen.getByRole("button", {
      name: /切换到元数据模式|切换到图像模式|元数据管理/,
    });

  const ensureVideoInfoTab = async () => {
    const backToInfoButton = screen.queryByRole("button", {
      name: "视频信息",
    });
    if (backToInfoButton) {
      await click(backToInfoButton);
    }
  };

  const flushUiUpdates = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  const click = async (target: Element | Window, init?: MouseEventInit) => {
    fireEvent.click(target as Element, init);
    await flushUiUpdates();
  };

  const keyDown = async (target: Element | Window, init: KeyboardEventInit) => {
    fireEvent.keyDown(target as Element, init);
    await flushUiUpdates();
  };

  const mouseDown = async (target: Element | Window, init?: MouseEventInit) => {
    fireEvent.mouseDown(target as Element, init);
    await flushUiUpdates();
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetUiStoreState();
    window.mediaPlayerBackend = undefined;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it(
    "元数据管理使用主工具栏承载同步名称与获取元数据动作",
    async () => {
      render(<App />);

      await click(getMetadataManageModeButton());

      expect(
        screen.getByRole("button", { name: "同步名称" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "获取元数据" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "自动生成标签" })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "视觉模型生成标签" }),
      ).toBeNull();
      expect(screen.queryByRole("button", { name: "生成嵌入向量" })).toBeNull();
      expect(screen.queryByRole("button", { name: "保存" })).toBeNull();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "获取元数据弹窗展示双源结果列与分源请求响应预览",
    async () => {
      render(<App />);

      await click(getMetadataManageModeButton());
      await click(screen.getByRole("button", { name: "获取元数据" }));

      const searchExternalMetadata = vi.fn(
        async (request: { source?: "nhentai" | "ehentai" }) => {
          if (request.source === "ehentai") {
            return {
              items: [
                {
                  source: "ehentai" as const,
                  id: "1919810",
                  title: "[Circle] mock-eh-title",
                  title_original: null,
                  cover: null,
                  url: "https://example.com/eh/1919810",
                  token: "token1919810",
                  tags: ["parody:original"],
                  pages: 1,
                  posted: null,
                  rating: null,
                  favorited: null,
                  raw: { source: "ehentai", mock: true },
                },
              ],
              debug: {
                source: "ehentai" as const,
                started_at_ms: 1,
                finished_at_ms: 2,
                success: true,
                result_count: 1,
                steps: [
                  {
                    at_ms: 1,
                    stage: "ehentai.search-page.request",
                    message: "开始请求",
                    request: { url: "https://e-hentai.org/" },
                  },
                ],
              },
            };
          }

          return {
            items: [
              {
                source: "nhentai" as const,
                id: "114514",
                title: "mock-nh-title",
                title_original: null,
                cover: null,
                url: "https://example.com/nh/114514",
                token: "",
                tags: ["language:chinese"],
                pages: 1,
                posted: null,
                rating: null,
                favorited: null,
                raw: { source: "nhentai", mock: true },
              },
            ],
            debug: {
              source: "nhentai" as const,
              started_at_ms: 1,
              finished_at_ms: 2,
              success: true,
              result_count: 1,
              steps: [
                {
                  at_ms: 1,
                  stage: "nhentai.gallery.request",
                  message: "开始请求",
                  request: { url: "https://nhentai.net/api/gallery/114514" },
                },
              ],
            },
          };
        },
      );

      window.mediaPlayerBackend = {
        searchExternalMetadata,
      } as unknown as typeof window.mediaPlayerBackend;

      const dialog = screen.getByRole("dialog", { name: "获取元数据" });
      const scope = within(dialog);

      expect(
        dialog.querySelectorAll(".metadata-fetch-source-column").length,
      ).toBe(2);

      await click(scope.getByRole("button", { name: "检索" }));

      await waitFor(() => {
        expect(searchExternalMetadata).toHaveBeenCalledTimes(2);
      });

      const calledSources = searchExternalMetadata.mock.calls.map(
        (call) => call[0]?.source,
      );
      expect(calledSources).toEqual(
        expect.arrayContaining(["nhentai", "ehentai"]),
      );

      const nhColumn = dialog.querySelector(
        '[data-source="nhentai"]',
      ) as HTMLElement | null;
      const ehColumn = dialog.querySelector(
        '[data-source="ehentai"]',
      ) as HTMLElement | null;
      expect(nhColumn).not.toBeNull();
      expect(ehColumn).not.toBeNull();

      await waitFor(() => {
        const nhScope = within(nhColumn as HTMLElement);
        const ehScope = within(ehColumn as HTMLElement);
        const nhRequest = nhScope.getByLabelText(
          "Request Body",
        ) as HTMLTextAreaElement;
        const nhResponse = nhScope.getByLabelText(
          "Response Body",
        ) as HTMLTextAreaElement;
        const nhDebug = nhScope.getByLabelText(
          "Debug Trace",
        ) as HTMLTextAreaElement;
        const ehRequest = ehScope.getByLabelText(
          "Request Body",
        ) as HTMLTextAreaElement;
        const ehResponse = ehScope.getByLabelText(
          "Response Body",
        ) as HTMLTextAreaElement;
        const ehDebug = ehScope.getByLabelText(
          "Debug Trace",
        ) as HTMLTextAreaElement;

        expect(nhRequest.value).toContain('"source": "nhentai"');
        expect(nhResponse.value).toContain('"source": "nhentai"');
        expect(nhDebug.value).toContain('"nhentai.gallery.request"');
        expect(ehRequest.value).toContain('"source": "ehentai"');
        expect(ehResponse.value).toContain('"source": "ehentai"');
        expect(ehDebug.value).toContain('"ehentai.search-page.request"');
      });

      await keyDown(window, { key: "Escape", code: "Escape" });
      await waitFor(() => {
        expect(screen.queryByRole("dialog", { name: "获取元数据" })).toBeNull();
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "获取元数据支持按来源过滤、回车检索并可解析 ehentai 结果",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "设置" }));
      await click(screen.getByRole("button", { name: "数据库设置" }));
      fireEvent.change(screen.getByLabelText("E-Hentai Cookies"), {
        target: { value: "ipb_member_id=123; ipb_pass_hash=abc" },
      });
      await click(screen.getByRole("button", { name: "关闭" }));

      await click(getMetadataManageModeButton());
      await click(screen.getByRole("button", { name: "获取元数据" }));

      const searchExternalMetadata = vi.fn(async () => ({
        items: [
          {
            source: "ehentai" as const,
            id: "1919810",
            title: "[Circle] mock-eh-title",
            title_original: "[サークル] mock-eh-title-jpn",
            cover: null,
            url: "https://e-hentai.org/g/1919810/mocktoken/",
            token: "mocktoken",
            tags: ["parody:original", "female:big breasts"],
            pages: 12,
            posted: "1700000000",
            rating: "4.8",
            favorited: null,
            raw: {
              gid: "1919810",
              token: "mocktoken",
              title: "[Circle] mock-eh-title",
              title_jpn: "[サークル] mock-eh-title-jpn",
            },
          },
        ],
        debug: {
          source: "ehentai" as const,
          started_at_ms: 1,
          finished_at_ms: 2,
          success: true,
          result_count: 1,
          steps: [
            {
              at_ms: 1,
              stage: "ehentai.gdata.response",
              message: "请求成功",
              response: { status: 200 },
            },
          ],
        },
      }));

      window.mediaPlayerBackend = {
        searchExternalMetadata,
      } as unknown as typeof window.mediaPlayerBackend;

      const dialog = screen.getByRole("dialog", { name: "获取元数据" });
      const scope = within(dialog);

      await click(scope.getByRole("button", { name: "EH" }));

      const idInput = scope.getByLabelText("检索ID") as HTMLInputElement;
      fireEvent.change(idInput, { target: { value: "1919810" } });
      await keyDown(idInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(searchExternalMetadata).toHaveBeenCalledTimes(1);
      });

      expect(searchExternalMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          source: "ehentai",
          input_id: "1919810",
          ehentai_cookies: "ipb_member_id=123; ipb_pass_hash=abc",
        }),
      );

      const nhColumn = dialog.querySelector(
        '[data-source="nhentai"]',
      ) as HTMLElement | null;
      const ehColumn = dialog.querySelector(
        '[data-source="ehentai"]',
      ) as HTMLElement | null;
      expect(nhColumn).not.toBeNull();
      expect(ehColumn).not.toBeNull();

      await waitFor(() => {
        const nhScope = within(nhColumn as HTMLElement);
        const ehScope = within(ehColumn as HTMLElement);
        const nhRequest = nhScope.getByLabelText(
          "Request Body",
        ) as HTMLTextAreaElement;
        const nhResponse = nhScope.getByLabelText(
          "Response Body",
        ) as HTMLTextAreaElement;
        const nhDebug = nhScope.getByLabelText(
          "Debug Trace",
        ) as HTMLTextAreaElement;
        const ehRequest = ehScope.getByLabelText(
          "Request Body",
        ) as HTMLTextAreaElement;
        const ehResponse = ehScope.getByLabelText(
          "Response Body",
        ) as HTMLTextAreaElement;
        const ehDebug = ehScope.getByLabelText(
          "Debug Trace",
        ) as HTMLTextAreaElement;

        expect(nhRequest.value).toBe("");
        expect(nhResponse.value).toBe("");
        expect(nhDebug.value).toBe("");
        expect(ehRequest.value).toContain('"source": "ehentai"');
        expect(ehResponse.value).toContain('"source": "ehentai"');
        expect(ehDebug.value).toContain('"ehentai.gdata.response"');
      });

      await click(
        within(ehColumn as HTMLElement).getByRole("button", { name: "解析" }),
      );

      await waitFor(() => {
        const parsed = within(ehColumn as HTMLElement).getByLabelText(
          "Parsed",
        ) as HTMLTextAreaElement;
        expect(parsed.value).toContain('"site": "ehentai"');
      });

      await waitFor(() => {
        expect(
          within(ehColumn as HTMLElement).queryByLabelText("Request Body"),
        ).toBeNull();
        expect(
          within(ehColumn as HTMLElement).queryByLabelText("Response Body"),
        ).toBeNull();
      });

      await click(
        within(ehColumn as HTMLElement).getByRole("button", {
          name: /Request Body/,
        }),
      );
      await waitFor(() => {
        expect(
          within(ehColumn as HTMLElement).getByLabelText("Request Body"),
        ).toBeInTheDocument();
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "元数据面板标题可折叠，并可恢复展开",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "元数据面板" }));
      expect(
        screen.getByRole("button", { name: "展开元数据面板" }),
      ).toBeInTheDocument();

      await click(screen.getByRole("button", { name: "展开元数据面板" }));
      expect(
        screen.getByRole("button", { name: "元数据面板" }),
      ).toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "进入元数据管理时自动退出原图显示并回到元数据编辑视图",
    async () => {
      render(<App />);

      const firstThumbButton = screen
        .getByText("幻旅系列 001 #1")
        .closest("button");
      expect(firstThumbButton).not.toBeNull();
      await click(firstThumbButton as HTMLButtonElement);

      await waitFor(() => {
        expect(document.querySelector(".metadata-image-real")).not.toBeNull();
      });

      await click(getMetadataManageModeButton());

      await waitFor(() => {
        expect(document.querySelector(".metadata-image-real")).toBeNull();
        expect(
          screen.getByRole("group", { name: "图包评分" }),
        ).toBeInTheDocument();
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "原图显示阶段不再渲染旧版分辨率色块占位",
    async () => {
      render(<App />);

      const firstThumbButton = screen
        .getByText("幻旅系列 001 #1")
        .closest("button");
      expect(firstThumbButton).not.toBeNull();
      await click(firstThumbButton as HTMLButtonElement);

      await waitFor(() => {
        expect(document.querySelector(".metadata-image-real")).not.toBeNull();
        expect(document.querySelector(".metadata-image-media")).toBeNull();
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "原图说明仅显示文件名/分辨率/大小三行，不重复图包标题",
    async () => {
      render(<App />);

      const firstThumbButton = screen
        .getByText("幻旅系列 001 #1")
        .closest("button");
      expect(firstThumbButton).not.toBeNull();
      await click(firstThumbButton as HTMLButtonElement);

      await waitFor(() => {
        const caption = document.querySelector(
          ".metadata-image-caption",
        ) as HTMLElement | null;
        expect(caption).not.toBeNull();
        const lines = caption?.querySelectorAll("span") ?? [];
        expect(lines).toHaveLength(3);
        expect(lines[0]?.textContent ?? "").toContain("img_0001.jpg");
        expect(lines[1]?.textContent ?? "").toBe("920 x 920");
        expect(lines[2]?.textContent ?? "").toBe("180KB");
        expect(caption?.querySelector("strong")).toBeNull();
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "退出原图显示后元数据面板恢复常规布局，不保持 focus 容器样式",
    async () => {
      render(<App />);

      const firstThumbButton = screen
        .getByText("幻旅系列 001 #1")
        .closest("button");
      expect(firstThumbButton).not.toBeNull();
      await click(firstThumbButton as HTMLButtonElement);

      await waitFor(() => {
        expect(
          document.querySelector(".metadata-content-focus"),
        ).not.toBeNull();
      });

      await click(screen.getByRole("button", { name: "切换到元数据显示" }));

      await waitFor(() => {
        expect(document.querySelector(".metadata-content-focus")).toBeNull();
        expect(document.querySelector(".metadata-rating-group")).not.toBeNull();
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "元数据评分支持清空到空星，并可继续点击设星",
    async () => {
      render(<App />);
      await click(getMetadataManageModeButton());

      const ratingGroup = screen.getByRole("group", { name: "图包评分" });
      const readStars = () =>
        within(ratingGroup)
          .getAllByRole("button")
          .map((button) => button.textContent);

      await click(screen.getByRole("button", { name: "图包评分 2 星" }));
      expect(readStars()).toEqual(["×", "★", "★", "☆", "☆", "☆"]);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "图包评分 2 星" }),
        ).not.toBeDisabled();
      });

      await mouseDown(screen.getByRole("button", { name: "清空评分" }), {
        button: 0,
      });
      expect(readStars()).toEqual(["×", "☆", "☆", "☆", "☆", "☆"]);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "图包评分 2 星" }),
        ).not.toBeDisabled();
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "图片模式只读元数据评分可用并可写入",
    async () => {
      const writePackageGradeSpy = vi.spyOn(
        MockMediaRepository.prototype,
        "writePackageGradeSync",
      );
      render(<App />);

      const ratingGroup = screen.getByRole("group", { name: "图包评分" });
      const ratingThreeStar = within(ratingGroup).getByRole("button", {
        name: "图包评分 3 星",
      }) as HTMLButtonElement;
      expect(ratingThreeStar.disabled).toBe(false);

      await click(ratingThreeStar);
      expect(writePackageGradeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          grade: 3,
        }),
      );

      await waitFor(() => {
        expect(ratingThreeStar.disabled).toBe(false);
      });

      await mouseDown(screen.getByRole("button", { name: "清空评分" }), {
        button: 0,
      });
      await waitFor(() => {
        expect(writePackageGradeSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            grade: null,
          }),
        );
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "视频模式元数据默认只读，包含评分与操作区",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "视频模式" }));
      await ensureVideoInfoTab();

      expect(screen.getByLabelText("文件名")).toBeInTheDocument();
      expect(screen.getByText("作品名")).toBeInTheDocument();
      expect(screen.getByText("社团")).toBeInTheDocument();
      expect(screen.getByText("作者")).toBeInTheDocument();
      expect(
        document.querySelectorAll(
          ".metadata-localized-field .metadata-localized-value.is-clickable",
        ).length,
      ).toBeGreaterThanOrEqual(3);
      expect(screen.getByText(/标签|Tags/)).toBeInTheDocument();
      expect(
        screen.getByRole("group", { name: "视频评分" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "视频评分 无评分" }),
      ).toBeDisabled();
      expect(screen.queryByRole("button", { name: "保存" })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "同步文件名到作品名" }),
      ).toBeNull();
      expect(document.querySelector(".metadata-video-stats")).toBeNull();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "视频信息字段回车会触发 writeVideoMetadata 调用",
    async () => {
      const writeVideoMetadataSpy = vi.spyOn(
        MockMediaRepository.prototype,
        "writeVideoMetadataSync",
      );
      render(<App />);

      await click(screen.getByRole("button", { name: "视频模式" }));
      await click(getMetadataManageModeButton());
      await ensureVideoInfoTab();

      const workTitleInput = screen.getByLabelText(
        "英文标题",
      ) as HTMLInputElement;
      fireEvent.change(workTitleInput, { target: { value: "新的视频作品名" } });
      await keyDown(workTitleInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(writeVideoMetadataSpy).toHaveBeenCalled();
        expect(writeVideoMetadataSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            work_title: "新的视频作品名",
          }),
        );
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "系列ID匹配时支持动画版/漫画版双向跳转",
    async () => {
      render(<App />);

      const jumpToAnimation = screen.getByRole("button", { name: "动画版" });
      const imageToolbarActions = jumpToAnimation.closest(".toolbar-actions");
      expect(imageToolbarActions?.firstElementChild).toBe(jumpToAnimation);
      expect(jumpToAnimation).toBeEnabled();
      await click(jumpToAnimation);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "漫画版" }),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByRole("button", { name: "检索结果" }),
      ).toBeInTheDocument();
      expect(
        screen.queryAllByRole("button", { name: "scene_motion.mp4" }),
      ).toHaveLength(0);
      expect(
        screen.queryAllByRole("button", { name: "teaser_city.mp4" }).length,
      ).toBeGreaterThan(0);

      await waitFor(() => {
        const toolbarTitle =
          document.querySelector(".main-toolbar-title.is-video")?.textContent ??
          "";
        expect(toolbarTitle).toContain("teaser_city");
      });

      const jumpToManga = screen.getByRole("button", { name: "漫画版" });
      const videoToolbarActions = jumpToManga.closest(".toolbar-actions");
      expect(videoToolbarActions?.firstElementChild).toBe(jumpToManga);
      expect(jumpToManga).toBeEnabled();
      await click(jumpToManga);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "动画版" }),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByRole("button", { name: "检索结果" }),
      ).toBeInTheDocument();
      expect(
        screen.queryAllByRole("button", { name: "forest_pack.zip" }),
      ).toHaveLength(0);

      await waitFor(() => {
        const toolbarTitle =
          document.querySelector(".main-toolbar-title")?.textContent ?? "";
        expect(toolbarTitle).toContain("幻旅系列 001");
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "未配置系列ID的条目不显示动画版/漫画版跳转按钮",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "forest_pack.zip" }));

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: "动画版" })).toBeNull();
      });

      await click(screen.getByRole("button", { name: "视频模式" }));
      await click(
        screen.getAllByRole("button", { name: "scene_motion.mp4" })[0],
      );

      await waitFor(() => {
        expect(screen.queryByRole("button", { name: "漫画版" })).toBeNull();
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "音乐模式支持按系列ID跳转到动画版/漫画版",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "音乐模式" }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "漫画版" }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "动画版" }),
        ).toBeInTheDocument();
      });

      await click(screen.getByRole("button", { name: "动画版" }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "漫画版" }),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByRole("button", { name: "检索结果" }),
      ).toBeInTheDocument();

      await click(screen.getByRole("button", { name: "漫画版" }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "动画版" }),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByRole("button", { name: "检索结果" }),
      ).toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "非元数据管理模式下打开封面/打开Booklet可用，并可从非 CD Booklet 树定位",
    async () => {
      const originalGetInitialLibrarySnapshot =
        MockMediaRepository.prototype.getInitialLibrarySnapshot;
      vi.spyOn(
        MockMediaRepository.prototype,
        "getInitialLibrarySnapshot",
      ).mockImplementation(function (
        this: MockMediaRepository,
      ): LibrarySnapshotDto {
        const snapshot = originalGetInitialLibrarySnapshot.call(this);
        const templateDirectory = snapshot.image_directories[0];
        if (!templateDirectory) {
          return snapshot;
        }

        const fallbackBookletDirectory: LibrarySnapshotDto["image_directories"][number] =
          {
            ...templateDirectory,
            id: "dir-music-booklet-fallback",
            package_name: "[DIR] Orbit Booklet",
            display_name: "Orbit Booklet",
            absolute_path: "X:/音乐/Orbit/booklet",
            tree_path: ["X盘", "音乐", "Orbit", "booklet"],
            images: templateDirectory.images
              .slice(0, 2)
              .map(
                (
                  image,
                  index,
                ): LibrarySnapshotDto["image_directories"][number]["images"][number] => ({
                  ...image,
                  id: `dir-music-booklet-fallback-img-${index + 1}`,
                }),
              ),
          };

        return {
          ...snapshot,
          image_directories: [
            ...snapshot.image_directories,
            fallbackBookletDirectory,
          ],
        };
      });

      render(<App />);
      await click(screen.getByRole("button", { name: "音乐模式" }));

      const openCoverButton = await screen.findByRole("button", {
        name: "打开封面",
      });
      const openBookletButton = screen.getByRole("button", {
        name: /打开Booklet|小册版/,
      });

      expect(openCoverButton).toBeEnabled();
      expect(openBookletButton).toBeEnabled();

      await click(openBookletButton);

      await waitFor(() => {
        const imageModeButton = screen.getByRole("button", {
          name: "图片模式",
        }) as HTMLButtonElement;
        expect(imageModeButton.classList.contains("is-active")).toBe(true);
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "元数据管理支持写入图片与视频系列ID",
    async () => {
      const writePackageMetadataSpy = vi.spyOn(
        MockMediaRepository.prototype,
        "writePackageMetadataSync",
      );
      const writeVideoMetadataSpy = vi.spyOn(
        MockMediaRepository.prototype,
        "writeVideoMetadataSync",
      );
      render(<App />);

      await click(getMetadataManageModeButton());

      const imageSeriesLabel = await screen.findByText("系列ID");
      const imageSeriesInput = imageSeriesLabel
        .closest("label")
        ?.querySelector("input") as HTMLInputElement;
      expect(imageSeriesInput).toBeInTheDocument();
      fireEvent.change(imageSeriesInput, {
        target: { value: "series-image-001" },
      });
      await keyDown(imageSeriesInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(writePackageMetadataSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            series_id: "series-image-001",
          }),
        );
      });

      await click(screen.getByRole("button", { name: "视频模式" }));
      await ensureVideoInfoTab();

      const videoSeriesLabel = await screen.findByText("系列ID");
      const videoSeriesInput = videoSeriesLabel
        .closest("label")
        ?.querySelector("input") as HTMLInputElement;
      expect(videoSeriesInput).toBeInTheDocument();
      fireEvent.change(videoSeriesInput, {
        target: { value: "series-video-001" },
      });
      await keyDown(videoSeriesInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(writeVideoMetadataSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            series_id: "series-video-001",
          }),
        );
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "视频评分可点击并写入 grade",
    async () => {
      const writeVideoMetadataSpy = vi.spyOn(
        MockMediaRepository.prototype,
        "writeVideoMetadataSync",
      );
      render(<App />);

      await click(screen.getByRole("button", { name: "视频模式" }));
      await click(getMetadataManageModeButton());
      await ensureVideoInfoTab();
      await click(screen.getByRole("button", { name: "视频评分 5 星" }));

      await waitFor(() => {
        expect(writeVideoMetadataSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            grade: 5,
          }),
        );
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "默认只读元数据作品名标题复制当前值，点击值不触发切换",
    async () => {
      const writeText = vi.fn(async () => undefined);
      Object.defineProperty(window.navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });

      render(<App />);

      const workTitleField = screen
        .getAllByText("作品名")
        .find((node) =>
          node.classList.contains("metadata-field-name"),
        ) as HTMLElement;
      const workTitleLabel = workTitleField.closest("label") as HTMLElement;
      const workTitleValue = workTitleLabel.querySelector(
        ".metadata-localized-value",
      ) as HTMLElement;
      const workTitleLangButton = within(workTitleLabel).getByRole(
        "button",
      ) as HTMLButtonElement;
      const beforeLang = workTitleLangButton.textContent;
      const beforeValue = workTitleValue.textContent?.trim() ?? "";

      await click(workTitleField);

      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(beforeValue);
      });

      await click(workTitleValue);

      expect(
        (within(workTitleLabel).getByRole("button") as HTMLButtonElement)
          .textContent,
      ).toBe(beforeLang);
      expect(workTitleValue.textContent?.trim() ?? "").toBe(beforeValue);
      expect(screen.queryByRole("button", { name: "检索结果" })).toBeNull();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "默认只读元数据作者与社团标题点击复制当前值",
    async () => {
      const writeText = vi.fn(async () => undefined);
      Object.defineProperty(window.navigator, "clipboard", {
        value: { writeText },
        configurable: true,
      });

      render(<App />);

      const authorFieldName = screen
        .getAllByText("作者")
        .find((node) =>
          node.classList.contains("metadata-field-name"),
        ) as HTMLElement;
      const authorLabel = authorFieldName.closest("label") as HTMLElement;
      const authorValue = authorLabel.querySelector(
        ".metadata-localized-value",
      ) as HTMLElement;
      await click(authorFieldName);

      const circleFieldName = screen
        .getAllByText("社团")
        .find((node) =>
          node.classList.contains("metadata-field-name"),
        ) as HTMLElement;
      const circleLabel = circleFieldName.closest("label") as HTMLElement;
      const circleValue = circleLabel.querySelector(
        ".metadata-localized-value",
      ) as HTMLElement;
      await click(circleFieldName);

      await waitFor(() => {
        expect(writeText).toHaveBeenNthCalledWith(
          1,
          authorValue.textContent?.trim() ?? "",
        );
        expect(writeText).toHaveBeenNthCalledWith(
          2,
          circleValue.textContent?.trim() ?? "",
        );
      });
    },
    uiLongTestTimeoutMs,
  );

  it(
    "默认只读元数据点击作者值可静默触发检索并通过返回按钮清空",
    async () => {
      render(<App />);

      const authorFieldName = screen
        .getAllByText("作者")
        .find((node) =>
          node.classList.contains("metadata-field-name"),
        ) as HTMLElement;
      const authorLabel = authorFieldName.closest("label") as HTMLElement;
      const authorValue = authorLabel.querySelector(
        ".metadata-localized-value.is-clickable",
      ) as HTMLElement;
      await click(authorValue);

      expect(
        screen.queryByRole("group", { name: "search-mode-switch" }),
      ).toBeNull();
      expect(
        screen.getByRole("button", { name: "检索结果" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "设为根" })).toBeNull();

      await click(screen.getByRole("button", { name: "返回" }));
      expect(screen.queryByRole("button", { name: "检索结果" })).toBeNull();
      expect(screen.queryByRole("button", { name: "返回" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "设为根" }),
      ).toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "默认只读元数据点击社团值可静默触发检索并通过返回按钮清空",
    async () => {
      render(<App />);

      const circleFieldName = screen
        .getAllByText("社团")
        .find((node) =>
          node.classList.contains("metadata-field-name"),
        ) as HTMLElement;
      const circleLabel = circleFieldName.closest("label") as HTMLElement;
      const circleValue = circleLabel.querySelector(
        ".metadata-localized-value.is-clickable",
      ) as HTMLElement;
      await click(circleValue);

      expect(
        screen.queryByRole("group", { name: "search-mode-switch" }),
      ).toBeNull();
      expect(
        screen.getByRole("button", { name: "检索结果" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "设为根" })).toBeNull();

      await click(screen.getByRole("button", { name: "返回" }));
      expect(screen.queryByRole("button", { name: "检索结果" })).toBeNull();
      expect(screen.queryByRole("button", { name: "返回" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "设为根" }),
      ).toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "视频模式只读元数据点击社团可静默触发检索并通过返回按钮清空",
    async () => {
      render(<App />);

      await click(screen.getByRole("button", { name: "视频模式" }));

      const circleLabel = screen
        .getByText("社团")
        .closest("label") as HTMLElement;
      const circleValue = circleLabel.querySelector(
        ".metadata-localized-value.is-clickable",
      ) as HTMLElement;
      await click(circleValue);

      expect(
        screen.queryByRole("group", { name: "search-mode-switch" }),
      ).toBeNull();
      expect(
        screen.getByRole("button", { name: "检索结果" }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "返回" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "设为根" })).toBeNull();

      await click(screen.getByRole("button", { name: "返回" }));
      expect(screen.queryByRole("button", { name: "检索结果" })).toBeNull();
      expect(screen.queryByRole("button", { name: "返回" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "设为根" }),
      ).toBeInTheDocument();
    },
    uiLongTestTimeoutMs,
  );

  it(
    "元数据管理支持按字段回车批量写入，不覆盖未提交字段",
    async () => {
      const writePackageMetadataSpy = vi.spyOn(
        MockMediaRepository.prototype,
        "writePackageMetadataSync",
      );
      render(<App />);

      await click(getMetadataManageModeButton());

      await waitFor(() => {
        expect(
          document.querySelectorAll(".sidebar-row.is-manage .sidebar-label")
            .length,
        ).toBeGreaterThan(0);
      });

      await click(
        document.querySelector(
          ".sidebar-row.is-manage .sidebar-label",
        ) as HTMLButtonElement,
      );
      const circleInput = screen.getByLabelText(
        "英文社团名",
      ) as HTMLInputElement;
      fireEvent.change(circleInput, { target: { value: "批量社团更名" } });
      await keyDown(circleInput, { key: "Enter", code: "Enter" });

      await waitFor(() => {
        expect(writePackageMetadataSpy).toHaveBeenCalled();
      });

      const payloads = writePackageMetadataSpy.mock.calls.map(
        (call) => call[0],
      );
      expect(
        payloads.every((payload) => payload.circle === "批量社团更名"),
      ).toBe(true);
      expect(
        new Set(payloads.map((payload) => payload.package_id)).size,
      ).toBeGreaterThan(1);
      expect(
        new Set(payloads.map((payload) => payload.author)).size,
      ).toBeGreaterThan(1);
    },
    uiLongTestTimeoutMs,
  );

  it(
    "元数据管理面板已移除自动标签与嵌入按钮，仅保留同步名称",
    async () => {
      render(<App />);

      await click(getMetadataManageModeButton());

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "同步名称" }),
        ).toBeInTheDocument();
      });

      expect(screen.queryByRole("button", { name: "自动生成标签" })).toBeNull();
      expect(
        screen.queryByRole("button", { name: "视觉模型生成标签" }),
      ).toBeNull();
      expect(screen.queryByRole("button", { name: "生成嵌入向量" })).toBeNull();
    },
    uiLongTestTimeoutMs,
  );
});
