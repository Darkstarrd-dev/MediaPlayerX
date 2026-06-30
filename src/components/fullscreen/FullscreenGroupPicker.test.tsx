import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../../i18n/I18nProvider";
import type { GroupDefinition } from "../../features/group";
import { FullscreenGroupPicker } from "./FullscreenGroupPicker";

const groups: GroupDefinition[] = [
  { id: "g-1", name: "我的收藏", createdAtMs: 0 },
  { id: "g-2", name: "待整理", createdAtMs: 0 },
];

function renderPicker(
  overrides: Partial<React.ComponentProps<typeof FullscreenGroupPicker>> = {},
) {
  const onClose = vi.fn();
  const onAddToGroup = vi.fn();
  const onCreateAndAdd = vi.fn();
  const utils = render(
    <I18nProvider>
      <FullscreenGroupPicker
        open={true}
        groups={groups}
        currentMedia={{ mediaId: "pkg-1", mediaType: "package" }}
        onClose={onClose}
        onAddToGroup={onAddToGroup}
        onCreateAndAdd={onCreateAndAdd}
        {...overrides}
      />
    </I18nProvider>,
  );
  return {
    ...utils,
    onClose,
    onAddToGroup,
    onCreateAndAdd,
  };
}

describe("FullscreenGroupPicker", () => {
  it("open=false 时不渲染", () => {
    render(
      <I18nProvider>
        <FullscreenGroupPicker
          open={false}
          groups={groups}
          currentMedia={{ mediaId: "pkg-1", mediaType: "package" }}
          onClose={vi.fn()}
          onAddToGroup={vi.fn()}
          onCreateAndAdd={vi.fn()}
        />
      </I18nProvider>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("渲染标题 + 群组列表 + 自定义项", () => {
    renderPicker();
    expect(
      screen.getByRole("heading", { name: /加入群组/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "我的收藏" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "待整理" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /自定义/ })).toBeInTheDocument();
  });

  it("默认高亮第一项", () => {
    renderPicker();
    const first = screen.getByRole("option", { name: "我的收藏" });
    expect(first).toHaveAttribute("aria-selected", "true");
  });

  it("ArrowDown/ArrowUp 切换高亮", () => {
    renderPicker();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "待整理" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: /自定义/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.keyDown(window, { key: "ArrowUp" });
    expect(screen.getByRole("option", { name: "待整理" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("Enter 选中已有群组触发 onAddToGroup 并关闭", () => {
    const { onAddToGroup, onClose } = renderPicker();
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onAddToGroup).toHaveBeenCalledWith("g-1", {
      mediaId: "pkg-1",
      mediaType: "package",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Esc 关闭选单", () => {
    const { onClose } = renderPicker();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("点击背景关闭选单", () => {
    const { onClose } = renderPicker();
    const backdrop = document.querySelector(
      ".fullscreen-group-picker-backdrop",
    );
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("选中「自定义」按 Enter 进入输入模式", () => {
    renderPicker();
    // 移到 custom 项
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toBeInTheDocument();
  });

  it("自定义输入：空名提示错误且不触发 onCreateAndAdd", () => {
    const { onCreateAndAdd } = renderPicker();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onCreateAndAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("自定义输入：重名提示错误且不触发 onCreateAndAdd", () => {
    const { onCreateAndAdd } = renderPicker();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "我的收藏" } });
    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onCreateAndAdd).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/已存在/);
  });

  it("自定义输入：合法名触发 onCreateAndAdd 并关闭", () => {
    const { onCreateAndAdd, onClose } = renderPicker();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "新分组" } });
    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onCreateAndAdd).toHaveBeenCalledWith("新分组", {
      mediaId: "pkg-1",
      mediaType: "package",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("自定义输入：Esc 退出输入模式回到列表", () => {
    renderPicker();
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "ArrowDown" });
    fireEvent.keyDown(window, { key: "Enter" });
    // 处于 custom 模式
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("currentMedia=null 时按 Enter 直接关闭（不触发添加）", () => {
    const { onAddToGroup, onClose } = renderPicker({
      currentMedia: null,
    });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(onAddToGroup).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("点击列表项直接触发 onAddToGroup", () => {
    const { onAddToGroup, onClose } = renderPicker();
    fireEvent.click(screen.getByRole("option", { name: "待整理" }));
    expect(onAddToGroup).toHaveBeenCalledWith("g-2", {
      mediaId: "pkg-1",
      mediaType: "package",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
