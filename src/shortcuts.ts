export type ShortcutScope = "global" | "video";

export type ShortcutAction =
  | "imagePrev"
  | "imageNext"
  | "imageFirst"
  | "imageLast"
  | "packagePrev"
  | "packageNext"
  | "alignUp"
  | "alignDown"
  | "alignLeft"
  | "alignRight"
  | "autoplayToggle"
  | "autoplayInterval1"
  | "autoplayInterval2"
  | "autoplayInterval3"
  | "autoplayInterval4"
  | "autoplayInterval5"
  | "rating0"
  | "rating1"
  | "rating2"
  | "rating3"
  | "rating4"
  | "rating5"
  | "focusSwitch"
  | "enterFullscreen"
  | "fullscreenToggle"
  | "windowFullscreenToggle"
  | "videoPlayPause"
  | "videoPlaylistAdd"
  | "videoPlaylistRemove"
  | "manageOrganize"
  | "videoPrev"
  | "videoNext"
  | "videoSeekBackwardShort"
  | "videoSeekForwardShort"
  | "videoSeekBackwardLong"
  | "videoSeekForwardLong"
  | "videoSeekBackwardFrame"
  | "videoSeekForwardFrame"
  | "videoSpeedDown"
  | "videoSpeedUp"
  | "videoVolumeDown"
  | "videoVolumeUp"
  | "videoMute"
  | "videoSaveCover"
  | "videoSubtitleToggle"
  | "videoSubtitleOffsetUp"
  | "videoSubtitleOffsetDown"
  | "videoFitCycle"
  | "groupToggleFilter"
  | "groupJoin"
  | "groupRemove";

export interface ShortcutDefinition {
  action: ShortcutAction;
  scope: ShortcutScope;
  label: string;
}

export type ShortcutMap = Record<ShortcutAction, string>;

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  { action: "imagePrev", scope: "global", label: "图片：上一张" },
  { action: "imageNext", scope: "global", label: "图片：下一张" },
  { action: "imageFirst", scope: "global", label: "图片：上一行" },
  { action: "imageLast", scope: "global", label: "图片：下一行" },
  { action: "packagePrev", scope: "global", label: "图片：上一个包" },
  { action: "packageNext", scope: "global", label: "图片：下一个包" },
  { action: "alignUp", scope: "global", label: "全屏：上对齐" },
  { action: "alignDown", scope: "global", label: "全屏：下对齐" },
  { action: "alignLeft", scope: "global", label: "全屏：左对齐" },
  { action: "alignRight", scope: "global", label: "全屏：右对齐" },
  { action: "autoplayToggle", scope: "global", label: "自动播放：开关" },
  { action: "autoplayInterval1", scope: "global", label: "自动播放：1 秒" },
  { action: "autoplayInterval2", scope: "global", label: "自动播放：2 秒" },
  { action: "autoplayInterval3", scope: "global", label: "自动播放：3 秒" },
  { action: "autoplayInterval4", scope: "global", label: "自动播放：5 秒" },
  { action: "autoplayInterval5", scope: "global", label: "自动播放：8 秒" },
  { action: "rating0", scope: "global", label: "评分：清空" },
  { action: "rating1", scope: "global", label: "评分：1 星" },
  { action: "rating2", scope: "global", label: "评分：2 星" },
  { action: "rating3", scope: "global", label: "评分：3 星" },
  { action: "rating4", scope: "global", label: "评分：4 星" },
  { action: "rating5", scope: "global", label: "评分：5 星" },
  { action: "focusSwitch", scope: "global", label: "焦点：Sidebar/Main 切换" },
  { action: "enterFullscreen", scope: "global", label: "全屏：进入" },
  { action: "fullscreenToggle", scope: "global", label: "全屏：切换" },
  {
    action: "windowFullscreenToggle",
    scope: "global",
    label: "窗口：全屏切换",
  },
  { action: "videoPlayPause", scope: "video", label: "视频：播放/暂停" },
  { action: "videoPlaylistAdd", scope: "video", label: "视频：加入播放列表" },
  {
    action: "videoPlaylistRemove",
    scope: "video",
    label: "视频：移出播放列表",
  },
  {
    action: "manageOrganize",
    scope: "global",
    label: "管理：整理（移动/分组）",
  },
  { action: "videoPrev", scope: "video", label: "视频：上一个" },
  { action: "videoNext", scope: "video", label: "视频：下一个" },
  {
    action: "videoSeekBackwardShort",
    scope: "video",
    label: "视频：后退 5 秒",
  },
  { action: "videoSeekForwardShort", scope: "video", label: "视频：前进 5 秒" },
  {
    action: "videoSeekBackwardLong",
    scope: "video",
    label: "视频：后退 30 秒",
  },
  { action: "videoSeekForwardLong", scope: "video", label: "视频：前进 30 秒" },
  { action: "videoSeekBackwardFrame", scope: "video", label: "视频：后退一帧" },
  { action: "videoSeekForwardFrame", scope: "video", label: "视频：前进一帧" },
  { action: "videoSpeedDown", scope: "video", label: "视频：减速" },
  { action: "videoSpeedUp", scope: "video", label: "视频：加速" },
  { action: "videoVolumeDown", scope: "video", label: "视频：音量-" },
  { action: "videoVolumeUp", scope: "video", label: "视频：音量+" },
  { action: "videoMute", scope: "video", label: "视频：静音切换" },
  { action: "videoSaveCover", scope: "video", label: "视频：保存封面" },
  { action: "videoSubtitleToggle", scope: "video", label: "视频：字幕开关" },
  { action: "videoSubtitleOffsetUp", scope: "video", label: "视频：字幕上移" },
  {
    action: "videoSubtitleOffsetDown",
    scope: "video",
    label: "视频：字幕下移",
  },
  { action: "videoFitCycle", scope: "video", label: "视频：画面适配模式轮换" },
  {
    action: "groupToggleFilter",
    scope: "global",
    label: "群组：切换左侧列表显示全部/当前群组",
  },
  { action: "groupJoin", scope: "global", label: "群组：加入当前群组" },
  { action: "groupRemove", scope: "global", label: "群组：从当前群组移除" },
];

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  imagePrev: "ArrowLeft",
  imageNext: "ArrowRight",
  imageFirst: "ArrowUp",
  imageLast: "ArrowDown",
  packagePrev: "Ctrl+ArrowLeft",
  packageNext: "Ctrl+ArrowRight",
  alignUp: "Alt+ArrowUp",
  alignDown: "Alt+ArrowDown",
  alignLeft: "Alt+ArrowLeft",
  alignRight: "Alt+ArrowRight",
  autoplayToggle: "KeyP",
  autoplayInterval1: "",
  autoplayInterval2: "",
  autoplayInterval3: "",
  autoplayInterval4: "",
  autoplayInterval5: "",
  rating0: "Digit0|Numpad0",
  rating1: "Digit1|Numpad1",
  rating2: "Digit2|Numpad2",
  rating3: "Digit3|Numpad3",
  rating4: "Digit4|Numpad4",
  rating5: "Digit5|Numpad5",
  focusSwitch: "Tab",
  enterFullscreen: "Enter",
  fullscreenToggle: "KeyF",
  windowFullscreenToggle: "Shift+KeyF",
  videoPlayPause: "Space",
  videoPlaylistAdd: "KeyA",
  videoPlaylistRemove: "KeyD",
  manageOrganize: "KeyM",
  videoPrev: "Ctrl+ArrowUp",
  videoNext: "Ctrl+ArrowDown",
  videoSeekBackwardShort: "ArrowLeft",
  videoSeekForwardShort: "ArrowRight",
  videoSeekBackwardLong: "Ctrl+ArrowLeft",
  videoSeekForwardLong: "Ctrl+ArrowRight",
  videoSeekBackwardFrame: "Alt+ArrowLeft",
  videoSeekForwardFrame: "Alt+ArrowRight",
  videoSpeedDown: "Ctrl+PageUp",
  videoSpeedUp: "Ctrl+PageDown",
  videoVolumeDown: "ArrowDown",
  videoVolumeUp: "ArrowUp",
  videoMute: "KeyM",
  videoSaveCover: "KeyC",
  videoSubtitleToggle: "KeyS",
  videoSubtitleOffsetUp: "Shift+ArrowUp",
  videoSubtitleOffsetDown: "Shift+ArrowDown",
  videoFitCycle: "Backslash",
  groupToggleFilter: "NumpadMultiply|Shift+Digit8",
  groupJoin: "NumpadAdd|Shift+Equal",
  groupRemove: "Minus|NumpadSubtract",
};

const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift", "Meta"] as const;
const MODIFIER_SET = new Set<string>(MODIFIER_ORDER);

const MOUSE_BUTTON_TOKEN_BY_ID: Record<number, string> = {
  0: "MouseLeft",
  1: "MouseMiddle",
  2: "MouseRight",
  3: "MouseBack",
  4: "MouseForward",
};

function normalizeToken(raw: string): string {
  const token = raw.trim();
  if (!token) {
    return "";
  }

  const lower = token.toLowerCase();
  if (lower === "ctrl" || lower === "control") return "Ctrl";
  if (lower === "alt" || lower === "option") return "Alt";
  if (lower === "shift") return "Shift";
  if (lower === "meta" || lower === "cmd" || lower === "win") return "Meta";

  if (lower === "controlleft") return "ControlLeft";
  if (lower === "controlright") return "ControlRight";
  if (lower === "altleft") return "AltLeft";
  if (lower === "altright") return "AltRight";
  if (lower === "shiftleft") return "ShiftLeft";
  if (lower === "shiftright") return "ShiftRight";
  if (lower === "metaleft") return "MetaLeft";
  if (lower === "metaright") return "MetaRight";

  if (lower === "mouseleft" || lower === "leftmouse") return "MouseLeft";
  if (lower === "mouseright" || lower === "rightmouse") return "MouseRight";
  if (lower === "mousemiddle" || lower === "middlemouse") return "MouseMiddle";
  if (lower === "mouseback" || lower === "x1mouse") return "MouseBack";
  if (lower === "mouseforward" || lower === "x2mouse") return "MouseForward";
  if (lower === "wheelup" || lower === "scrollup" || lower === "mousewheelup")
    return "WheelUp";
  if (
    lower === "wheeldown" ||
    lower === "scrolldown" ||
    lower === "mousewheeldown"
  )
    return "WheelDown";

  if (lower === "left") return "ArrowLeft";
  if (lower === "right") return "ArrowRight";
  if (lower === "up") return "ArrowUp";
  if (lower === "down") return "ArrowDown";

  if (lower === "space" || lower === "spacebar") return "Space";
  if (lower === "pgup") return "PageUp";
  if (lower === "pgdown") return "PageDown";
  if (lower === "del") return "Delete";
  if (lower === "esc") return "Escape";

  if (/^key[a-z]$/i.test(token)) {
    return `Key${token.slice(3).toUpperCase()}`;
  }

  if (/^[a-z]$/i.test(token)) {
    return `Key${token.toUpperCase()}`;
  }

  if (/^digit[0-9]$/i.test(token)) {
    return `Digit${token.slice(5)}`;
  }

  if (/^[0-9]$/.test(token)) {
    return `Digit${token}`;
  }

  if (/^numpad[0-9]$/i.test(token)) {
    return `Numpad${token.slice(6)}`;
  }

  if (/^numpad[a-z]+$/i.test(token)) {
    // NumpadAdd / NumpadSubtract / NumpadMultiply / NumpadDecimal / NumpadEnter 等
    return `Numpad${token.slice(6, 7).toUpperCase()}${token.slice(7).toLowerCase()}`;
  }

  return token[0].toUpperCase() + token.slice(1);
}

function normalizeSingleCombo(rawCombo: string): string {
  const tokens = rawCombo
    .split("+")
    .map((part) => normalizeToken(part))
    .filter(Boolean);

  if (tokens.length === 0) {
    return "";
  }

  const modifiers: string[] = [];
  let key = "";
  for (const token of tokens) {
    if (MODIFIER_SET.has(token)) {
      modifiers.push(token);
    } else {
      key = token;
    }
  }

  if (!key) {
    return "";
  }

  modifiers.sort(
    (a, b) =>
      MODIFIER_ORDER.indexOf(a as (typeof MODIFIER_ORDER)[number]) -
      MODIFIER_ORDER.indexOf(b as (typeof MODIFIER_ORDER)[number]),
  );

  return [...modifiers, key].join("+");
}

export function normalizeShortcutBinding(rawBinding: string): string {
  return rawBinding
    .split("|")
    .map((combo) => normalizeSingleCombo(combo))
    .filter(Boolean)
    .join("|");
}

export function keyboardEventToCombo(event: KeyboardEvent): string {
  const code = normalizeToken(event.code || event.key);

  const base: string[] = [];
  if (event.ctrlKey && code !== "ControlLeft" && code !== "ControlRight")
    base.push("Ctrl");
  if (event.altKey && code !== "AltLeft" && code !== "AltRight")
    base.push("Alt");
  if (event.shiftKey && code !== "ShiftLeft" && code !== "ShiftRight")
    base.push("Shift");
  if (event.metaKey && code !== "MetaLeft" && code !== "MetaRight")
    base.push("Meta");

  return normalizeSingleCombo([...base, code].join("+"));
}

export function mouseButtonToToken(button: number): string {
  return MOUSE_BUTTON_TOKEN_BY_ID[button] ?? `MouseButton${button}`;
}

export function mouseEventToCombo(
  event: Pick<
    MouseEvent,
    "button" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey"
  >,
): string {
  const base: string[] = [];
  if (event.ctrlKey) base.push("Ctrl");
  if (event.altKey) base.push("Alt");
  if (event.shiftKey) base.push("Shift");
  if (event.metaKey) base.push("Meta");

  return normalizeSingleCombo(
    [...base, mouseButtonToToken(event.button)].join("+"),
  );
}

export function wheelEventToCombo(
  event: Pick<
    WheelEvent,
    "deltaY" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey"
  >,
): string {
  let wheelToken = "";
  if (event.deltaY < 0) {
    wheelToken = "WheelUp";
  } else if (event.deltaY > 0) {
    wheelToken = "WheelDown";
  }

  if (!wheelToken) {
    return "";
  }

  const base: string[] = [];
  if (event.ctrlKey) base.push("Ctrl");
  if (event.altKey) base.push("Alt");
  if (event.shiftKey) base.push("Shift");
  if (event.metaKey) base.push("Meta");

  return normalizeSingleCombo([...base, wheelToken].join("+"));
}

export function shortcutMatches(
  binding: string,
  event: KeyboardEvent,
): boolean {
  const normalized = normalizeShortcutBinding(binding);
  if (!normalized) {
    return false;
  }

  const combo = keyboardEventToCombo(event);
  return normalized.split("|").some((part) => part === combo);
}

export function shortcutMouseMatches(
  binding: string,
  event: Pick<
    MouseEvent,
    "button" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey"
  >,
): boolean {
  const normalized = normalizeShortcutBinding(binding);
  if (!normalized) {
    return false;
  }

  const combo = mouseEventToCombo(event);
  return normalized.split("|").some((part) => part === combo);
}

export function shortcutWheelMatches(
  binding: string,
  event: Pick<
    WheelEvent,
    "deltaY" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey"
  >,
): boolean {
  const normalized = normalizeShortcutBinding(binding);
  if (!normalized) {
    return false;
  }

  const combo = wheelEventToCombo(event);
  if (!combo) {
    return false;
  }

  return normalized.split("|").some((part) => part === combo);
}

export function appendShortcutBinding(
  existing: string,
  nextCombo: string,
): string {
  const normalizedExisting = normalizeShortcutBinding(existing);
  const normalizedNext = normalizeShortcutBinding(nextCombo);
  if (!normalizedNext) {
    return normalizedExisting;
  }

  const merged = new Set<string>();
  if (normalizedExisting) {
    for (const combo of normalizedExisting.split("|")) {
      merged.add(combo);
    }
  }

  for (const combo of normalizedNext.split("|")) {
    merged.add(combo);
  }

  return Array.from(merged).join("|");
}

export interface ShortcutConflict {
  scope: ShortcutScope;
  combo: string;
  actions: ShortcutAction[];
}

export function findShortcutConflicts(map: ShortcutMap): ShortcutConflict[] {
  const bucket = new Map<string, ShortcutAction[]>();

  for (const definition of SHORTCUT_DEFINITIONS) {
    const raw = normalizeShortcutBinding(map[definition.action]);
    if (!raw) {
      continue;
    }

    const combos = raw.split("|");
    for (const combo of combos) {
      const key = `${definition.scope}|${combo}`;
      const list = bucket.get(key) ?? [];
      list.push(definition.action);
      bucket.set(key, list);
    }
  }

  const conflicts: ShortcutConflict[] = [];
  for (const [key, actions] of bucket.entries()) {
    if (actions.length <= 1) {
      continue;
    }
    const [scope, combo] = key.split("|");
    conflicts.push({
      scope: scope as ShortcutScope,
      combo,
      actions,
    });
  }

  return conflicts;
}
