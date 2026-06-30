/**
 * 全屏模式群组选单
 *
 * 行为：
 *  - 列出所有已建群组
 *  - ↑↓ 键导航，Enter 确认，Esc 取消
 *  - 末尾「自定义」项：选中后展开输入框，输入新群组名
 *  - 确认后将当前浏览内容加入选中群组
 *
 * 数据流：
 *  - 受控：父组件通过 `open` / `onClose` 控制显示
 *  - 自包含：内部维护选中索引、是否在自定义输入模式、输入草稿
 *
 * 业务规则：
 *  - currentMedia 携带 mediaType，决定 addToGroup 的 type 参数
 *  - 自定义群组：先 addGroup 再 addToGroup
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useI18n } from "../../i18n/useI18n";
import type { GroupDefinition, GroupMediaType } from "../../features/group";

export interface FullscreenGroupPickerCurrentMedia {
  mediaId: string;
  mediaType: GroupMediaType;
}

export interface FullscreenGroupPickerProps {
  open: boolean;
  groups: GroupDefinition[];
  currentMedia: FullscreenGroupPickerCurrentMedia | null;
  onClose: () => void;
  /** 已有群组被选中时触发（addToGroup） */
  onAddToGroup: (
    groupId: string,
    media: FullscreenGroupPickerCurrentMedia,
  ) => void;
  /** 自定义群组被确认时触发（先 addGroup，再 addToGroup，返回新 group） */
  onCreateAndAdd: (
    name: string,
    media: FullscreenGroupPickerCurrentMedia,
  ) => void;
}

interface CustomEntry {
  kind: "custom";
  index: number;
}

type Entry =
  { kind: "group"; group: GroupDefinition; index: number } | CustomEntry;

const CUSTOM_LABEL_KEY = "ui.fullscreen.groupPickerCustom";

export function FullscreenGroupPicker({
  open,
  groups,
  currentMedia,
  onClose,
  onAddToGroup,
  onCreateAndAdd,
}: FullscreenGroupPickerProps) {
  const { t } = useI18n();
  const [highlight, setHighlight] = useState(0);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = groups.map((group, index) => ({
      kind: "group" as const,
      group,
      index,
    }));
    list.push({ kind: "custom", index: list.length });
    return list;
  }, [groups]);

  // 打开/关闭时重置状态
  useEffect(() => {
    if (open) {
      setHighlight(0);
      setCustomMode(false);
      setCustomName("");
      setCustomError(null);
    }
  }, [open]);

  // 进入自定义模式时聚焦输入框
  useEffect(() => {
    if (customMode) {
      // 微任务聚焦，避免 React commit 期间 ref 还未挂载
      queueMicrotask(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [customMode]);

  const handleConfirm = useCallback(() => {
    if (!currentMedia) {
      onClose();
      return;
    }
    const entry = entries[highlight];
    if (!entry) {
      onClose();
      return;
    }
    if (entry.kind === "group") {
      onAddToGroup(entry.group.id, currentMedia);
      onClose();
      return;
    }
    // entry.kind === "custom"
    setCustomMode(true);
  }, [entries, highlight, currentMedia, onAddToGroup, onClose]);

  const handleCustomSubmit = useCallback(
    (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!currentMedia) {
        onClose();
        return;
      }
      const trimmed = customName.trim();
      if (!trimmed) {
        setCustomError(t("ui.sidebar.group.emptyName"));
        return;
      }
      const isDuplicate = groups.some((group) => group.name === trimmed);
      if (isDuplicate) {
        setCustomError(t("ui.sidebar.group.duplicateName", { name: trimmed }));
        return;
      }
      onCreateAndAdd(trimmed, currentMedia);
      onClose();
    },
    [customName, groups, currentMedia, onCreateAndAdd, onClose, t],
  );

  const handleCustomCancel = useCallback(() => {
    setCustomMode(false);
    setCustomName("");
    setCustomError(null);
  }, []);

  // 键盘事件：自定义模式下由 input 自己处理；列表模式下拦截
  useEffect(() => {
    if (!open) return;
    if (customMode) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        setHighlight((prev) => Math.min(prev + 1, entries.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        setHighlight((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        handleConfirm();
        return;
      }
    };
    window.addEventListener("keydown", handleKey, true);
    return () => window.removeEventListener("keydown", handleKey, true);
  }, [open, customMode, entries.length, handleConfirm, onClose]);

  if (!open) return null;

  return (
    <div
      className="fullscreen-group-picker-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="fullscreen-group-picker"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("ui.fullscreen.groupPickerTitle")}
      >
        <h3 className="fullscreen-group-picker-title">
          {t("ui.fullscreen.groupPickerTitle")}
        </h3>
        {entries.length === 1 ? (
          // 只有 custom 一项时也算合法，但提示无群组
          <p className="fullscreen-group-picker-empty">
            {t("ui.fullscreen.groupPickerEmpty")}
          </p>
        ) : null}
        <ul className="fullscreen-group-picker-list" role="listbox">
          {groups.map((group, index) => {
            const isHighlighted = highlight === index;
            return (
              <li
                key={group.id}
                className={`fullscreen-group-picker-item${
                  isHighlighted ? " is-highlighted" : ""
                }`}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => {
                  if (currentMedia) {
                    onAddToGroup(group.id, currentMedia);
                    onClose();
                  }
                }}
              >
                {group.name}
              </li>
            );
          })}
          <li
            className={`fullscreen-group-picker-item fullscreen-group-picker-item-custom${
              highlight === entries.length - 1 ? " is-highlighted" : ""
            }`}
            role="option"
            aria-selected={highlight === entries.length - 1}
            onMouseEnter={() => setHighlight(entries.length - 1)}
            onClick={() => setCustomMode(true)}
          >
            {t(CUSTOM_LABEL_KEY)}
          </li>
        </ul>
        {customMode ? (
          <form
            className="fullscreen-group-picker-custom-form"
            onSubmit={handleCustomSubmit}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                handleCustomCancel();
              }
            }}
          >
            <input
              ref={inputRef}
              className="fullscreen-group-picker-custom-input"
              type="text"
              value={customName}
              maxLength={64}
              placeholder={t("ui.fullscreen.groupPickerPlaceholder")}
              onChange={(event) => {
                setCustomName(event.target.value);
                if (customError) setCustomError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleCustomSubmit();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  handleCustomCancel();
                }
              }}
            />
            {customError ? (
              <p className="fullscreen-group-picker-error" role="alert">
                {customError}
              </p>
            ) : null}
            <div className="fullscreen-group-picker-custom-actions">
              <button
                className="mpx-btn"
                type="button"
                onClick={handleCustomCancel}
              >
                {t("ui.common.cancel")}
              </button>
              <button className="mpx-btn" type="submit">
                {t("ui.common.confirm")}
              </button>
            </div>
          </form>
        ) : null}
        {!customMode ? (
          <p className="fullscreen-group-picker-hint">
            {t("ui.fullscreen.groupPickerHint")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default FullscreenGroupPicker;
