import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MockMediaRepository } from "../backend/repository/mockRepository";
import { MEDIA_GROUPS_STATE_KEY, useGroupState } from "./useGroupState";
import { DEFAULT_MEDIA_GROUPS_DATA, type GroupDefinition } from "./types";

/**
 * 创建一个 MockRepository + 内存存储，用于在测试中直接控制 readAppState / writeAppState。
 *
 * 之所以绕开 repository.system 的私有方法（TypeScript 不允许跨类访问 private），
 * 是因为 MockMediaRepository 自身只暴露 readAppState/writeAppState 入口；
 * 我们在 repository 层级直接覆盖（Monkey-patch）这两个方法，从而拦截所有调用。
 */
function createRepository(): {
  repository: MockMediaRepository;
  stateByKey: Map<string, string>;
} {
  const stateByKey = new Map<string, string>();
  const repository = new MockMediaRepository();
  // 保存原方法以便恢复（这里不必要，但保留语义清晰）
  const originalReadAppState = repository.readAppState?.bind(repository);
  const originalWriteAppState = repository.writeAppState?.bind(repository);
  // 覆盖 repository 上的方法（public），保留 this 上下文
  repository.readAppState = vi.fn(async (request) => {
    const fallback = request.fallback_json ?? "null";
    const stored = stateByKey.get(request.state_key);
    return { state_json: stored ?? fallback };
  });
  repository.writeAppState = vi.fn(async (request) => {
    stateByKey.set(request.state_key, request.state_json);
    if (originalWriteAppState) {
      return originalWriteAppState(request);
    }
    return { updated_at_ms: Date.now() };
  });
  void originalReadAppState;
  return { repository, stateByKey };
}

describe("useGroupState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * 等待异步加载完成（readAppState 走 microtask 队列）。
   * 在 fake timers 下需要推进 microtask；这里用 setTimeout(0) + fake 推进。
   */
  async function waitForLoaded(result: { current: { isLoading: boolean } }) {
    for (let i = 0; i < 50; i += 1) {
      if (!result.current.isLoading) {
        return;
      }
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
    }
  }

  it("初始加载时返回空数据并完成 isLoading 状态机", async () => {
    const { repository } = createRepository();

    const { result } = renderHook(() =>
      useGroupState({ mediaRepository: repository }),
    );

    // 第一次渲染时 isLoading 仍为 true，groups / memberships 为空
    expect(result.current.isLoading).toBe(true);
    expect(result.current.groups).toEqual([]);
    expect(result.current.memberships).toEqual([]);

    await waitForLoaded(result);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.groups).toEqual([]);
    expect(result.current.memberships).toEqual([]);
  });

  it("首次加载从持久化数据恢复", async () => {
    const { repository, stateByKey } = createRepository();
    const persistedGroups: GroupDefinition[] = [
      {
        id: "g-1",
        name: "已存群组",
        createdAtMs: 1700000000000,
      },
    ];
    stateByKey.set(
      MEDIA_GROUPS_STATE_KEY,
      JSON.stringify({
        groups: persistedGroups,
        memberships: [
          {
            groupId: "g-1",
            mediaId: "pkg-1",
            mediaType: "package",
            addedAtMs: 1700000001000,
          },
        ],
      }),
    );

    const { result } = renderHook(() =>
      useGroupState({ mediaRepository: repository }),
    );

    await waitForLoaded(result);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.groups).toEqual(persistedGroups);
    expect(result.current.memberships).toEqual([
      {
        groupId: "g-1",
        mediaId: "pkg-1",
        mediaType: "package",
        addedAtMs: 1700000001000,
      },
    ]);
  });

  it("addGroup 添加新群组并写入持久化（防抖 300ms）", async () => {
    const { repository, stateByKey } = createRepository();

    const { result } = renderHook(() =>
      useGroupState({ mediaRepository: repository }),
    );

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    let newGroup: GroupDefinition | null = null;
    await act(async () => {
      newGroup = result.current.addGroup("新群组");
    });
    expect(newGroup).not.toBeNull();
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0]?.name).toBe("新群组");

    // 立即检查持久化尚未写入（防抖）
    expect(stateByKey.has(MEDIA_GROUPS_STATE_KEY)).toBe(false);

    // 推进 300ms 触发防抖落盘
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(stateByKey.has(MEDIA_GROUPS_STATE_KEY)).toBe(true);
    const persisted = JSON.parse(
      stateByKey.get(MEDIA_GROUPS_STATE_KEY) ?? "{}",
    );
    expect(persisted.groups).toHaveLength(1);
    expect(persisted.groups[0]?.name).toBe("新群组");
  });

  it("addGroup 重名时返回 null 且不修改状态", async () => {
    const { repository } = createRepository();
    const { result } = renderHook(() =>
      useGroupState({ mediaRepository: repository }),
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    await act(async () => {
      result.current.addGroup("唯一名");
    });
    const sizeAfterFirst = result.current.groups.length;
    let dupResult: GroupDefinition | null = {} as GroupDefinition;
    await act(async () => {
      dupResult = result.current.addGroup("唯一名");
    });
    expect(dupResult).toBeNull();
    expect(result.current.groups.length).toBe(sizeAfterFirst);
  });

  it("addGroup 空名 / 仅空白名返回 null", async () => {
    const { repository } = createRepository();
    const { result } = renderHook(() =>
      useGroupState({ mediaRepository: repository }),
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    let r1: GroupDefinition | null = {} as GroupDefinition;
    let r2: GroupDefinition | null = {} as GroupDefinition;
    await act(async () => {
      r1 = result.current.addGroup("");
    });
    await act(async () => {
      r2 = result.current.addGroup("   ");
    });
    expect(r1).toBeNull();
    expect(r2).toBeNull();
    expect(result.current.groups).toEqual([]);
  });

  it("addToGroup 加入媒体并静默忽略重复加入", async () => {
    const { repository } = createRepository();
    const { result } = renderHook(() =>
      useGroupState({ mediaRepository: repository }),
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    let group: GroupDefinition | null = null;
    await act(async () => {
      group = result.current.addGroup("我的群组");
    });
    const groupId = group!.id;

    await act(async () => {
      result.current.addToGroup(groupId, "pkg-1", "package");
    });
    expect(result.current.memberships).toHaveLength(1);

    // 重复加入应保持单条
    await act(async () => {
      result.current.addToGroup(groupId, "pkg-1", "package");
    });
    expect(result.current.memberships).toHaveLength(1);

    // 不同 mediaId 正常累加
    await act(async () => {
      result.current.addToGroup(groupId, "vid-1", "video");
    });
    expect(result.current.memberships).toHaveLength(2);
  });

  it("removeFromGroup 只删除匹配项", async () => {
    const { repository } = createRepository();
    const { result } = renderHook(() =>
      useGroupState({ mediaRepository: repository }),
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    let group: GroupDefinition | null = null;
    await act(async () => {
      group = result.current.addGroup("测试");
    });
    const groupId = group!.id;
    await act(async () => {
      result.current.addToGroup(groupId, "pkg-1", "package");
    });
    await act(async () => {
      result.current.addToGroup(groupId, "pkg-2", "package");
    });
    expect(result.current.memberships).toHaveLength(2);

    await act(async () => {
      result.current.removeFromGroup(groupId, "pkg-1");
    });
    expect(result.current.memberships).toEqual([
      expect.objectContaining({ mediaId: "pkg-2" }),
    ]);
  });

  it("deleteGroup 同步清理 memberships 并落盘", async () => {
    const { repository, stateByKey } = createRepository();
    const { result } = renderHook(() =>
      useGroupState({ mediaRepository: repository }),
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    let group: GroupDefinition | null = null;
    await act(async () => {
      group = result.current.addGroup("待删");
    });
    await act(async () => {
      result.current.addToGroup(group!.id, "pkg-1", "package");
    });
    expect(result.current.memberships).toHaveLength(1);

    await act(async () => {
      result.current.deleteGroup(group!.id);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(result.current.groups).toEqual([]);
    expect(result.current.memberships).toEqual([]);

    const persisted = JSON.parse(
      stateByKey.get(MEDIA_GROUPS_STATE_KEY) ?? "{}",
    );
    expect(persisted.groups).toEqual([]);
    expect(persisted.memberships).toEqual([]);
  });

  it("getGroupMemberIds 返回 groupId 对应的成员 ID 集合", async () => {
    const { repository } = createRepository();
    const { result } = renderHook(() =>
      useGroupState({ mediaRepository: repository }),
    );
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    let g1: GroupDefinition | null = null;
    let g2: GroupDefinition | null = null;
    await act(async () => {
      g1 = result.current.addGroup("A");
    });
    await act(async () => {
      g2 = result.current.addGroup("B");
    });
    await act(async () => {
      result.current.addToGroup(g1!.id, "pkg-1", "package");
    });
    await act(async () => {
      result.current.addToGroup(g1!.id, "vid-1", "video");
    });
    await act(async () => {
      result.current.addToGroup(g2!.id, "pkg-2", "package");
    });

    const g1Members = result.current.getGroupMemberIds(g1!.id);
    expect(g1Members).toEqual(new Set(["pkg-1", "vid-1"]));
    const g2Members = result.current.getGroupMemberIds(g2!.id);
    expect(g2Members).toEqual(new Set(["pkg-2"]));
    // null / 空串 返回空 Set
    expect(result.current.getGroupMemberIds(null).size).toBe(0);
    expect(result.current.getGroupMemberIds("").size).toBe(0);
    expect(result.current.getGroupMemberIds("not-exists").size).toBe(0);
  });

  it("parsePersistedGroups 解析失败时回退到默认值", async () => {
    const { repository, stateByKey } = createRepository();
    // 写入非法 JSON
    stateByKey.set(MEDIA_GROUPS_STATE_KEY, "{ not json");

    const { result } = renderHook(() =>
      useGroupState({ mediaRepository: repository }),
    );
    await waitForLoaded(result);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.groups).toEqual(DEFAULT_MEDIA_GROUPS_DATA.groups);
    expect(result.current.memberships).toEqual(
      DEFAULT_MEDIA_GROUPS_DATA.memberships,
    );
  });
});
