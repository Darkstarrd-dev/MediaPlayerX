import { useOverflowMarquee } from "../useOverflowMarquee";

interface FullscreenMetaMarqueeProps {
  text: string;
}

export function FullscreenMetaMarquee({ text }: FullscreenMetaMarqueeProps) {
  const { hostRef, textRef, overflowing, marqueeStyle } =
    useOverflowMarquee<HTMLDivElement>({
      text,
      cssDurationVar: "--mpx-fullscreen-marquee-duration",
      secondsPerChar: 0.24,
    });

  return (
    <div
      className={`fullscreen-meta-marquee ${overflowing ? "is-overflow" : ""}`}
      ref={hostRef}
      style={marqueeStyle}
    >
      <span className="fullscreen-meta-marquee-item" ref={textRef}>
        {text}
      </span>
      {overflowing ? (
        <span aria-hidden="true" className="fullscreen-meta-marquee-item">
          {text}
        </span>
      ) : null}
    </div>
  );
}
