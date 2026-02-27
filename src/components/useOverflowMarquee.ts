import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

interface UseOverflowMarqueeOptions {
  text: string;
  cssDurationVar: string;
  secondsPerChar: number;
}

export function useOverflowMarquee<TElement extends HTMLElement>(
  options: UseOverflowMarqueeOptions,
): {
  hostRef: RefObject<TElement | null>;
  textRef: RefObject<HTMLSpanElement | null>;
  overflowing: boolean;
  marqueeStyle: CSSProperties;
} {
  const { text, cssDurationVar, secondsPerChar } = options;
  const hostRef = useRef<TElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const hostElement = hostRef.current;
    const textElement = textRef.current;
    if (!hostElement || !textElement) {
      return;
    }

    const updateOverflowState = () => {
      const nextOverflowing = textElement.scrollWidth > hostElement.clientWidth;
      setOverflowing((previous) =>
        previous === nextOverflowing ? previous : nextOverflowing,
      );
    };

    updateOverflowState();
    window.addEventListener("resize", updateOverflowState);

    const resizeObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => updateOverflowState())
        : null;
    if (resizeObserver) {
      resizeObserver.observe(hostElement);
      resizeObserver.observe(textElement);
    }

    return () => {
      window.removeEventListener("resize", updateOverflowState);
      resizeObserver?.disconnect();
    };
  }, [text]);

  const marqueeStyle = useMemo(
    () =>
      ({
        [cssDurationVar]: `${Math.max(8, Math.min(30, Math.round(text.length * secondsPerChar)))}s`,
      }) as CSSProperties,
    [cssDurationVar, secondsPerChar, text.length],
  );

  return {
    hostRef,
    textRef,
    overflowing,
    marqueeStyle,
  };
}
