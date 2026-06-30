/**
 * 侧边栏底部群组管理组件
 *
 * 提供下拉选单（全部/群组列表）+ 切换按钮（过滤开关）+ 添加/删除/加入-移除四个按钮。
 *
 * 设计要点：
 *  - 下拉选单只切换 focus 群组（selectedGroupId），不再立即过滤 sidebar 树
 *  - 过滤行为由独立的 groupFilterEnabled 开关控制：
 *      - 通过最左侧 `*` 按钮或快捷键 `*` 切换
 *      - 按钮显示 `F`（focus 过滤开启）或 `A`（显示全部）
 *  - 加入/移除合并为一个按钮，根据当前 focus 内容是否在 group 内切换 label
 *    - `+` / `-` 快捷键分别尝试加入/移除（已加入则 + 无效，已不存在则 - 无效）
 *  - audio 模式自动 disabled（业务规则）
 */

import { useEffect, useState } from "react";

import { useI18n } from "../i18n/useI18n";

export interface GroupFooterProps {
  groups: { id: string; name: string }[];
  selectedGroupId: string | null;
  /** 群组过滤开关：true 表示按 selectedGroupId 过滤 sidebar 树 */
  groupFilterEnabled: boolean;
  /** 当前聚焦内容是否已位于 selectedGroupId 群组中（决定 ± 按钮显示） */
  isCurrentInGroup: boolean;
  canJoin: boolean;
  canRemove: boolean;
  onSelectGroup: (id: string | null) => void;
  /** 切换 sidebar 树过滤开关（与下拉焦点独立） */
  onToggleGroupFilter: () => void;
  onAddGroup: (name: string) => void;
  onDeleteGroup: () => void;
  onJoinCurrentToGroup: () => void;
  onRemoveCurrentFromGroup: () => void;
}

export function GroupFooter({
  groups,
  selectedGroupId,
  groupFilterEnabled,
  isCurrentInGroup,
  canJoin,
  canRemove,
  onSelectGroup,
  onToggleGroupFilter,
  onAddGroup,
  onDeleteGroup,
  onJoinCurrentToGroup,
  onRemoveCurrentFromGroup,
}: GroupFooterProps) {
  const { t } = useI18n();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addName, setAddName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 切换群组时清掉 add 错误
  useEffect(() => {
    setAddError(null);
  }, [selectedGroupId]);

  const currentGroupName =
    groups.find((group) => group.id === selectedGroupId)?.name ?? "";

  const handleAddSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = addName.trim();
    if (!trimmed) {
      setAddError(t("ui.sidebar.group.emptyName"));
      return;
    }
    const isDuplicate = groups.some((group) => group.name === trimmed);
    if (isDuplicate) {
      setAddError(t("ui.sidebar.group.duplicateName", { name: trimmed }));
      return;
    }
    onAddGroup(trimmed);
    setAddName("");
    setAddError(null);
    setShowAddDialog(false);
  };

  const handleAddCancel = () => {
    setAddName("");
    setAddError(null);
    setShowAddDialog(false);
  };

  const handleDeleteConfirm = () => {
    onDeleteGroup();
    setShowDeleteConfirm(false);
  };

  // ± 按钮的 label：当前内容已在 group 中显示「移除」，否则显示「加入」
  const joinRemoveLabel = isCurrentInGroup
    ? t("ui.sidebar.group.remove")
    : t("ui.sidebar.group.join");
  // ± 按钮的 aria-label：包含快捷键提示
  const joinRemoveAriaLabel = isCurrentInGroup
    ? t("ui.sidebar.group.remove")
    : t("ui.sidebar.group.join");

  return (
    <div className="sidebar-group-footer" data-slot="fg-sidebar-footer">
      <select
        className="sidebar-group-select"
        value={selectedGroupId ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          onSelectGroup(value === "" ? null : value);
        }}
        aria-label={t("ui.sidebar.group.selectAriaLabel")}
      >
        <option value="">{t("ui.sidebar.group.all")}</option>
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>
      <div className="sidebar-group-actions mpx-btn-group">
        <button
          className="mpx-btn sidebar-group-btn"
          type="button"
          onClick={onToggleGroupFilter}
          data-tooltip-label={t("tip.group.toggleFilter")}
          aria-label={t("ui.sidebar.group.toggleFilter")}
          aria-pressed={groupFilterEnabled}
        >
          {/* F = Filter on (群组视图)；A = All (全部视图) */}
          {groupFilterEnabled ? "F" : "A"}
        </button>
        <button
          className="mpx-btn sidebar-group-btn"
          type="button"
          onClick={() => setShowAddDialog(true)}
          data-tooltip-label={t("tip.group.add")}
          aria-label={t("ui.sidebar.group.add")}
        >
          +
        </button>
        <button
          className="mpx-btn sidebar-group-btn"
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={!selectedGroupId}
          data-tooltip-label={t("tip.group.delete")}
          aria-label={t("ui.sidebar.group.delete")}
        >
          −
        </button>
        <button
          className={`mpx-btn sidebar-group-btn${
            isCurrentInGroup ? " is-in-group" : ""
          }`}
          type="button"
          onClick={
            isCurrentInGroup ? onRemoveCurrentFromGroup : onJoinCurrentToGroup
          }
          disabled={
            selectedGroupId == null ||
            (isCurrentInGroup ? !canRemove : !canJoin)
          }
          data-tooltip-label={t("tip.group.joinRemove")}
          aria-label={joinRemoveAriaLabel}
        >
          {joinRemoveLabel}
        </button>
      </div>

      {showAddDialog ? (
        <div
          className="sidebar-group-dialog-backdrop"
          onClick={handleAddCancel}
        >
          <form
            className="sidebar-group-dialog"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleAddSubmit}
          >
            <h3 className="sidebar-group-dialog-title">
              {t("ui.sidebar.group.addDialogTitle")}
            </h3>
            <input
              className="sidebar-group-dialog-input"
              type="text"
              value={addName}
              onChange={(event) => {
                setAddName(event.target.value);
                if (addError) {
                  setAddError(null);
                }
              }}
              autoFocus
              maxLength={64}
              placeholder={t("ui.sidebar.group.addDialogPlaceholder")}
            />
            {addError ? (
              <p className="sidebar-group-dialog-error" role="alert">
                {addError}
              </p>
            ) : null}
            <div className="sidebar-group-dialog-actions">
              <button
                className="mpx-btn"
                type="button"
                onClick={handleAddCancel}
              >
                {t("ui.common.cancel")}
              </button>
              <button className="mpx-btn" type="submit">
                {t("ui.common.confirm")}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div
          className="sidebar-group-dialog-backdrop"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="sidebar-group-dialog"
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <h3 className="sidebar-group-dialog-title">
              {t("ui.sidebar.group.deleteConfirmTitle")}
            </h3>
            <p className="sidebar-group-dialog-message">
              {t("ui.sidebar.group.deleteConfirmMessage", {
                name: currentGroupName,
              })}
            </p>
            <div className="sidebar-group-dialog-actions">
              <button
                className="mpx-btn"
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t("ui.common.cancel")}
              </button>
              <button
                className="mpx-btn"
                type="button"
                onClick={handleDeleteConfirm}
              >
                {t("ui.common.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default GroupFooter;
