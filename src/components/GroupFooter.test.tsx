import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../i18n/I18nProvider";
import { GroupFooter } from "./GroupFooter";

const noopGroups: { id: string; name: string }[] = [];

function renderFooter(
  overrides: Partial<React.ComponentProps<typeof GroupFooter>> = {},
) {
  const onSelectGroup = vi.fn();
  const onAddGroup = vi.fn();
  const onDeleteGroup = vi.fn();
  const onJoinCurrentToGroup = vi.fn();
  const onRemoveCurrentFromGroup = vi.fn();
  const onToggleGroupFilter = vi.fn();
  const utils = render(
    <I18nProvider>
      <GroupFooter
        groups={noopGroups}
        selectedGroupId={null}
        groupFilterEnabled={false}
        isCurrentInGroup={false}
        canJoin={false}
        canRemove={false}
        onSelectGroup={onSelectGroup}
        onToggleGroupFilter={onToggleGroupFilter}
        onAddGroup={onAddGroup}
        onDeleteGroup={onDeleteGroup}
        onJoinCurrentToGroup={onJoinCurrentToGroup}
        onRemoveCurrentFromGroup={onRemoveCurrentFromGroup}
        {...overrides}
      />
    </I18nProvider>,
  );
  return {
    ...utils,
    onSelectGroup,
    onAddGroup,
    onDeleteGroup,
    onJoinCurrentToGroup,
    onRemoveCurrentFromGroup,
    onToggleGroupFilter,
  };
}

describe("GroupFooter", () => {
  it("默认渲染下拉选单（全部）+ 4 个按钮：toggle/+/−/±；删除/± disabled", () => {
    const { onSelectGroup } = renderFooter();
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect((select as HTMLSelectElement).value).toBe("");

    const toggleButton = screen.getByRole("button", { name: /切换显示/ });
    const addButton = screen.getByRole("button", { name: /添加群组/ });
    const deleteButton = screen.getByRole("button", { name: /删除群组/ });
    // 默认 selectedGroupId=null，± 按钮显示「加入」并 disabled
    const joinRemoveButton = screen.getByRole("button", { name: /^加入$/ });
    expect(toggleButton).not.toBeDisabled();
    expect(addButton).not.toBeDisabled();
    expect(deleteButton).toBeDisabled();
    expect(joinRemoveButton).toBeDisabled();
    expect(onSelectGroup).not.toHaveBeenCalled();
  });

  it("toggle 按钮显示 A（全部视图），groupFilterEnabled=true 时显示 F（群组视图）", () => {
    const { rerender } = renderFooter({ groupFilterEnabled: false });
    expect(screen.getByRole("button", { name: /切换显示/ })).toHaveTextContent(
      "A",
    );

    rerender(
      <I18nProvider>
        <GroupFooter
          groups={noopGroups}
          selectedGroupId={null}
          groupFilterEnabled={true}
          isCurrentInGroup={false}
          canJoin={false}
          canRemove={false}
          onSelectGroup={vi.fn()}
          onToggleGroupFilter={vi.fn()}
          onAddGroup={vi.fn()}
          onDeleteGroup={vi.fn()}
          onJoinCurrentToGroup={vi.fn()}
          onRemoveCurrentFromGroup={vi.fn()}
        />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: /切换显示/ })).toHaveTextContent(
      "F",
    );
  });

  it("点击 toggle 按钮触发 onToggleGroupFilter", () => {
    const { onToggleGroupFilter } = renderFooter();
    fireEvent.click(screen.getByRole("button", { name: /切换显示/ }));
    expect(onToggleGroupFilter).toHaveBeenCalledTimes(1);
  });

  it("选择群组后下拉值变化，删除按钮启用", () => {
    const groups = [
      { id: "g-1", name: "我的收藏" },
      { id: "g-2", name: "待整理" },
    ];
    renderFooter({ groups, selectedGroupId: "g-1" });
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("g-1");
    const deleteButton = screen.getByRole("button", { name: /删除群组/ });
    expect(deleteButton).not.toBeDisabled();
  });

  it("切换下拉选单触发 onSelectGroup（空字符串 -> null）", () => {
    const groups = [{ id: "g-1", name: "我的收藏" }];
    const { onSelectGroup } = renderFooter({
      groups,
      selectedGroupId: "g-1",
    });
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "" } });
    expect(onSelectGroup).toHaveBeenCalledWith(null);
    fireEvent.change(select, { target: { value: "g-1" } });
    expect(onSelectGroup).toHaveBeenCalledWith("g-1");
  });

  it("canJoin=true + isCurrentInGroup=false 时 ± 按钮显示「加入」并启用", () => {
    renderFooter({
      selectedGroupId: "g-1",
      canJoin: true,
      canRemove: false,
      isCurrentInGroup: false,
    });
    const button = screen.getByRole("button", { name: /^加入$/ });
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent("加入");
  });

  it("canRemove=true + isCurrentInGroup=true 时 ± 按钮显示「移除」并启用", () => {
    renderFooter({
      selectedGroupId: "g-1",
      canJoin: false,
      canRemove: true,
      isCurrentInGroup: true,
    });
    const button = screen.getByRole("button", { name: /^移除$/ });
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent("移除");
  });

  it("点击 ± 按钮：isCurrentInGroup=false 时触发 onJoinCurrentToGroup", () => {
    const { onJoinCurrentToGroup, onRemoveCurrentFromGroup } = renderFooter({
      selectedGroupId: "g-1",
      canJoin: true,
      canRemove: false,
      isCurrentInGroup: false,
    });
    fireEvent.click(screen.getByRole("button", { name: /^加入$/ }));
    expect(onJoinCurrentToGroup).toHaveBeenCalledTimes(1);
    expect(onRemoveCurrentFromGroup).not.toHaveBeenCalled();
  });

  it("点击 ± 按钮：isCurrentInGroup=true 时触发 onRemoveCurrentFromGroup", () => {
    const { onJoinCurrentToGroup, onRemoveCurrentFromGroup } = renderFooter({
      selectedGroupId: "g-1",
      canJoin: false,
      canRemove: true,
      isCurrentInGroup: true,
    });
    fireEvent.click(screen.getByRole("button", { name: /^移除$/ }));
    expect(onRemoveCurrentFromGroup).toHaveBeenCalledTimes(1);
    expect(onJoinCurrentToGroup).not.toHaveBeenCalled();
  });

  it("点击 + 弹出添加对话框，提交合法名触发 onAddGroup", () => {
    const { onAddGroup } = renderFooter();
    fireEvent.click(screen.getByRole("button", { name: /添加群组/ }));

    // 弹出对话框：标题与输入框
    expect(
      screen.getByRole("heading", { name: /新建群组/ }),
    ).toBeInTheDocument();
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "新群组" } });
    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onAddGroup).toHaveBeenCalledWith("新群组");
  });

  it("添加对话框：空名 / 空白名提示错误且不触发 onAddGroup", () => {
    const { onAddGroup } = renderFooter();
    fireEvent.click(screen.getByRole("button", { name: /添加群组/ }));
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onAddGroup).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("添加对话框：重名提示错误且不触发 onAddGroup", () => {
    const groups = [{ id: "g-1", name: "我的收藏" }];
    const { onAddGroup } = renderFooter({ groups });
    fireEvent.click(screen.getByRole("button", { name: /添加群组/ }));
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "我的收藏" } });
    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onAddGroup).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toMatch(/已存在/);
  });

  it("点击 - 弹出删除确认对话框，确认后触发 onDeleteGroup", () => {
    const groups = [{ id: "g-1", name: "我的收藏" }];
    const { onDeleteGroup } = renderFooter({
      groups,
      selectedGroupId: "g-1",
    });
    fireEvent.click(screen.getByRole("button", { name: /删除群组/ }));
    expect(
      screen.getByRole("heading", { name: /确认删除/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/我的收藏/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /确定/ }));
    expect(onDeleteGroup).toHaveBeenCalledTimes(1);
  });
});
