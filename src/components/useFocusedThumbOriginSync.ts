import { useCallback, useEffect, useRef } from "react";

import type { FocusedImageRef } from "../types";

interface UseFocusedThumbOriginSyncOptions {
  gridRef: React.RefObject<HTMLDivElement | null>;
  focusedRef: FocusedImageRef | null;
  nodeBrowseMode: boolean;
  showNamesOnly: boolean;
  isTestMode: boolean;
}

export function useFocusedThumbOriginSync({
  gridRef,
  focusedRef,
  nodeBrowseMode,
  showNamesOnly,
  isTestMode,
}: UseFocusedThumbOriginSyncOptions): {
  markThumbInputMouse: () => void;
  scrollFocusedThumbIntoView: (target: EventTarget | null) => void;
  scheduleFocusedThumbOriginSync: () => void;
} {
  const thumbOriginRafRef = useRef<number | null>(null);
  const lastOriginElRef = useRef<HTMLElement | null>(null);

  const markThumbInputMouse = useCallback(() => {
    document.documentElement.dataset.mpxThumbInput = "mouse";
  }, []);

  const scrollFocusedThumbIntoView = useCallback(
    (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) {
        return;
      }
      const thumbCard = target.closest(".thumb-card");
      if (!(thumbCard instanceof HTMLElement)) {
        return;
      }
      if (typeof thumbCard.scrollIntoView === "function") {
        thumbCard.scrollIntoView({
          block: "nearest",
          inline: "nearest",
          behavior: "auto",
        });
      }
    },
    [],
  );

  const syncFocusedThumbTransformOrigin = useCallback(() => {
    const container = gridRef.current;
    if (!container) {
      return;
    }

    const focusedThumb = container.querySelector(".thumb-card.is-focused");
    if (!(focusedThumb instanceof HTMLElement)) {
      if (lastOriginElRef.current) {
        lastOriginElRef.current.style.removeProperty("--mpx-thumb-origin-x");
        lastOriginElRef.current.style.removeProperty("--mpx-thumb-origin-y");
        lastOriginElRef.current = null;
      }
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const rect = focusedThumb.getBoundingClientRect();
    const scale = 1.1;
    const halo = 22;
    const needX = (rect.width * (scale - 1)) / 2 + halo;
    const needY = (rect.height * (scale - 1)) / 2 + halo;

    const leftSpace = rect.left - containerRect.left;
    const rightSpace = containerRect.right - rect.right;
    const topSpace = rect.top - containerRect.top;
    const bottomSpace = containerRect.bottom - rect.bottom;

    let originX = "50%";
    if (leftSpace < needX && rightSpace >= needX) {
      originX = "0%";
    } else if (rightSpace < needX && leftSpace >= needX) {
      originX = "100%";
    } else if (leftSpace < needX && rightSpace < needX) {
      originX = leftSpace >= rightSpace ? "100%" : "0%";
    }

    let originY = "50%";
    if (topSpace < needY && bottomSpace >= needY) {
      originY = "0%";
    } else if (bottomSpace < needY && topSpace >= needY) {
      originY = "100%";
    } else if (topSpace < needY && bottomSpace < needY) {
      originY = topSpace >= bottomSpace ? "100%" : "0%";
    }

    focusedThumb.style.setProperty("--mpx-thumb-origin-x", originX);
    focusedThumb.style.setProperty("--mpx-thumb-origin-y", originY);

    if (lastOriginElRef.current && lastOriginElRef.current !== focusedThumb) {
      lastOriginElRef.current.style.removeProperty("--mpx-thumb-origin-x");
      lastOriginElRef.current.style.removeProperty("--mpx-thumb-origin-y");
    }
    lastOriginElRef.current = focusedThumb;
  }, [gridRef]);

  const scheduleFocusedThumbOriginSync = useCallback(() => {
    if (thumbOriginRafRef.current != null) {
      return;
    }
    thumbOriginRafRef.current = window.requestAnimationFrame(() => {
      thumbOriginRafRef.current = null;
      syncFocusedThumbTransformOrigin();
    });
  }, [syncFocusedThumbTransformOrigin]);

  useEffect(() => {
    if (document.documentElement.dataset.mpxThumbInput !== "keyboard") {
      return;
    }

    const container = gridRef.current;
    if (!container) {
      return;
    }

    if (
      !(
        container.querySelector(".thumb-card.is-focused") instanceof HTMLElement
      )
    ) {
      return;
    }
    scheduleFocusedThumbOriginSync();
  }, [
    focusedRef?.packageId,
    focusedRef?.imageIndex,
    gridRef,
    scheduleFocusedThumbOriginSync,
  ]);

  useEffect(() => {
    if (isTestMode) {
      return;
    }

    const container = gridRef.current;
    const handle = () => scheduleFocusedThumbOriginSync();
    if (container) {
      container.addEventListener("scroll", handle, { passive: true });
    }
    window.addEventListener("resize", handle);

    scheduleFocusedThumbOriginSync();
    return () => {
      if (container) {
        container.removeEventListener("scroll", handle);
      }
      window.removeEventListener("resize", handle);
      if (thumbOriginRafRef.current != null) {
        window.cancelAnimationFrame(thumbOriginRafRef.current);
        thumbOriginRafRef.current = null;
      }
    };
  }, [
    nodeBrowseMode,
    showNamesOnly,
    gridRef,
    scheduleFocusedThumbOriginSync,
    isTestMode,
  ]);

  useEffect(() => {
    if (isTestMode) {
      return;
    }
    scheduleFocusedThumbOriginSync();
  }, [
    focusedRef?.packageId,
    focusedRef?.imageIndex,
    scheduleFocusedThumbOriginSync,
    isTestMode,
  ]);

  return {
    markThumbInputMouse,
    scrollFocusedThumbIntoView,
    scheduleFocusedThumbOriginSync,
  };
}
