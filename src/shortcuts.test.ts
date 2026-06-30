import { describe, expect, it } from "vitest";

import {
  DEFAULT_SHORTCUTS,
  normalizeShortcutBinding,
  keyboardEventToCombo,
  shortcutMatches,
  shortcutWheelMatches,
  wheelEventToCombo,
} from "./shortcuts";

describe("shortcuts wheel bindings", () => {
  it("normalizes wheel tokens with modifiers", () => {
    expect(normalizeShortcutBinding("wheelup|ctrl+wheeldown")).toBe(
      "WheelUp|Ctrl+WheelDown",
    );
  });

  it("converts wheel events to wheel combos", () => {
    expect(
      wheelEventToCombo({
        deltaY: -120,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      }),
    ).toBe("WheelUp");

    expect(
      wheelEventToCombo({
        deltaY: 12,
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      }),
    ).toBe("Ctrl+WheelDown");
  });

  it("matches wheel bindings against wheel events", () => {
    expect(
      shortcutWheelMatches("WheelDown|Ctrl+WheelUp", {
        deltaY: 90,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      }),
    ).toBe(true);

    expect(
      shortcutWheelMatches("WheelDown|Ctrl+WheelUp", {
        deltaY: -90,
        ctrlKey: true,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      }),
    ).toBe(true);

    expect(
      shortcutWheelMatches("WheelDown", {
        deltaY: -90,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      }),
    ).toBe(false);
  });
});

describe("shortcuts group actions", () => {
  it("DEFAULT_SHORTCUTS 包含 groupToggleFilter / groupJoin / groupRemove", () => {
    expect(DEFAULT_SHORTCUTS.groupToggleFilter).toBe(
      "NumpadMultiply|Shift+Digit8",
    );
    expect(DEFAULT_SHORTCUTS.groupJoin).toBe("NumpadAdd|Shift+Equal");
    expect(DEFAULT_SHORTCUTS.groupRemove).toBe("Minus|NumpadSubtract");
  });

  it("NumpadMultiply 转换为 * combo", () => {
    expect(
      keyboardEventToCombo({
        code: "NumpadMultiply",
        key: "*",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe("NumpadMultiply");
  });

  it("Shift+Digit8 转换为 * combo（主键盘）", () => {
    expect(
      keyboardEventToCombo({
        code: "Digit8",
        key: "*",
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe("Shift+Digit8");
  });

  it("NumpadAdd 转换为 + combo（小键盘）", () => {
    expect(
      keyboardEventToCombo({
        code: "NumpadAdd",
        key: "+",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe("NumpadAdd");
  });

  it("Shift+Equal 转换为 + combo（主键盘）", () => {
    expect(
      keyboardEventToCombo({
        code: "Equal",
        key: "+",
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe("Shift+Equal");
  });

  it("Minus 转换为 - combo（主键盘）", () => {
    expect(
      keyboardEventToCombo({
        code: "Minus",
        key: "-",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe("Minus");
  });

  it("NumpadSubtract 转换为 - combo（小键盘）", () => {
    expect(
      keyboardEventToCombo({
        code: "NumpadSubtract",
        key: "-",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe("NumpadSubtract");
  });

  it("shortcutMatches 支持主键盘 + 小键盘双绑（groupJoin）", () => {
    const binding = DEFAULT_SHORTCUTS.groupJoin;
    // 小键盘 +
    expect(
      shortcutMatches(binding, {
        code: "NumpadAdd",
        key: "+",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe(true);
    // 主键盘 Shift+=
    expect(
      shortcutMatches(binding, {
        code: "Equal",
        key: "+",
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe(true);
  });

  it("shortcutMatches 支持主键盘 + 小键盘双绑（groupRemove）", () => {
    const binding = DEFAULT_SHORTCUTS.groupRemove;
    expect(
      shortcutMatches(binding, {
        code: "Minus",
        key: "-",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe(true);
    expect(
      shortcutMatches(binding, {
        code: "NumpadSubtract",
        key: "-",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe(true);
  });

  it("shortcutMatches 支持 * 键（groupToggleFilter）", () => {
    const binding = DEFAULT_SHORTCUTS.groupToggleFilter;
    expect(
      shortcutMatches(binding, {
        code: "NumpadMultiply",
        key: "*",
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe(true);
    expect(
      shortcutMatches(binding, {
        code: "Digit8",
        key: "*",
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
        metaKey: false,
      } as KeyboardEvent),
    ).toBe(true);
  });

  it("normalizeShortcutBinding 归一化 group 系快捷键", () => {
    expect(normalizeShortcutBinding("numpadadd|shift+equal")).toBe(
      "NumpadAdd|Shift+Equal",
    );
    expect(normalizeShortcutBinding("minus|numpadsubtract")).toBe(
      "Minus|NumpadSubtract",
    );
    expect(normalizeShortcutBinding("numpadmultiply|shift+digit8")).toBe(
      "NumpadMultiply|Shift+Digit8",
    );
  });
});
