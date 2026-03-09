import { act, fireEvent } from "@testing-library/react";
import { vi } from "vitest";

import { resetUiStoreState } from "../store/useUiStore";

export async function flushUiUpdates(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

export async function click(
  target: Element | Window,
  init?: MouseEventInit,
): Promise<void> {
  fireEvent.click(target as Element, init);
  await flushUiUpdates();
}

export async function keyDown(
  target: Element | Window,
  init: KeyboardEventInit,
): Promise<void> {
  fireEvent.keyDown(target as Element, init);
  await flushUiUpdates();
}

export async function mouseDown(
  target: Element | Window,
  init?: MouseEventInit,
): Promise<void> {
  fireEvent.mouseDown(target as Element, init);
  await flushUiUpdates();
}

export async function wheel(
  target: Element | Window,
  init?: WheelEventInit,
): Promise<void> {
  fireEvent.wheel(target as Element, init);
  await flushUiUpdates();
}

export async function pointerDown(
  target: Element | Window,
  init?: PointerEventInit,
): Promise<void> {
  fireEvent.pointerDown(target as Element, init);
  await flushUiUpdates();
}

export async function pointerUp(
  target: Element | Window,
  init?: PointerEventInit,
): Promise<void> {
  fireEvent.pointerUp(target as Element, init);
  await flushUiUpdates();
}

export function resetAppTestEnvironment(): void {
  vi.restoreAllMocks();
  resetUiStoreState();
  window.mediaPlayerBackend = undefined;
  window.localStorage.clear();
  window.sessionStorage.clear();
}
