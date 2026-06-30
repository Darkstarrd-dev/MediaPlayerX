/**
 * 侧边栏底部群组管理组件
 *
 * 提供下拉选单（全部/群组列表）+ 添加/删除/加入/移除四个按钮。
 * 设计要点：
 *  - "全部" 对应 selectedGroupId === null；此时加入/移除/删除 disabled
 *  - 添加群组使用内联对话框，重名/空名由 useGroupState 校验
 *  - 删除群组需要二次确认
 *  - 重名/空名等错误用本地错误状态提示，不通过 alert
 */

import { useEffect, useState } from "react";

import { useI18n } from "../i18n/useI18n";

export interface GroupFooterProps {
  groups: { id: string; name: string }[];
  selectedGroupId: string | null;
  canJoin: boolean;
  canRemove: boolean;
  onSelectGroup: (id: string | null) => void;
  onAddGroup: (name: string) => void;
  onDeleteGroup: () => void;
  onJoinCurrentToGroup: () => void;
  onRemoveCurrentFromGroup: () => void;
}

export function GroupFooter({
  groups,
  selectedGroupId,
  canJoin,
  canRemove,
  onSelectGroup,
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
          className="mpx-btn sidebar-group-btn"
          type="button"
          onClick={onJoinCurrentToGroup}
          disabled={!canJoin}
          data-tooltip-label={t("tip.group.join")}
          aria-label={t("ui.sidebar.group.join")}
        >
          {t("ui.sidebar.group.join")}
        </button>
        <button
          className="mpx-btn sidebar-group-btn"
          type="button"
          onClick={onRemoveCurrentFromGroup}
          disabled={!canRemove}
          data-tooltip-label={t("tip.group.remove")}
          aria-label={t("ui.sidebar.group.remove")}
        >
          {t("ui.sidebar.group.remove")}
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
