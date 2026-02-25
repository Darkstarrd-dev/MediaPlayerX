import { useOverflowMarquee } from "./useOverflowMarquee";

interface ToolbarTitleMarqueeProps {
  text: string;
  className?: string;
}

export function ToolbarTitleMarquee({
  text,
  className = "main-toolbar-title",
}: ToolbarTitleMarqueeProps) {
  const { hostRef, textRef, overflowing, marqueeStyle } =
    useOverflowMarquee<HTMLSpanElement>({
      text,
      cssDurationVar: "--mpx-main-toolbar-marquee-duration",
      secondsPerChar: 0.22,
    });

  return (
    <strong className={className} title={text}>
      <span
        className={`main-toolbar-title-marquee ${overflowing ? "is-overflow" : ""}`}
        ref={hostRef}
        style={marqueeStyle}
      >
        <span className="main-toolbar-title-marquee-item" ref={textRef}>
          {text}
        </span>
        {overflowing ? (
          <span aria-hidden="true" className="main-toolbar-title-marquee-item">
            {text}
          </span>
        ) : null}
      </span>
    </strong>
  );
}
