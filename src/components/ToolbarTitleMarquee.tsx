import { useOverflowMarquee } from "./useOverflowMarquee";

interface ToolbarTitleMarqueeProps {
  text: string;
  className?: string;
}

export function ToolbarTitleMarquee({
  text,
  className = "main-header-title",
}: ToolbarTitleMarqueeProps) {
  const { hostRef, textRef, overflowing, marqueeStyle } =
    useOverflowMarquee<HTMLSpanElement>({
      text,
      cssDurationVar: "--mpx-main-header-marquee-duration",
      secondsPerChar: 0.22,
    });

  return (
    <strong className={className} data-tooltip-label={text}>
      <span
        className={`main-header-title-marquee ${overflowing ? "is-overflow" : ""}`}
        ref={hostRef}
        style={marqueeStyle}
      >
        <span className="main-header-title-marquee-item" ref={textRef}>
          {text}
        </span>
        {overflowing ? (
          <span aria-hidden="true" className="main-header-title-marquee-item">
            {text}
          </span>
        ) : null}
      </span>
    </strong>
  );
}
