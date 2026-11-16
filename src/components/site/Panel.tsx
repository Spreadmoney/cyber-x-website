import type { CSSProperties, ReactNode } from "react";

/**
 * A print panel (Figma "Print panel · blue / paper"): a rounded band with
 * the security print rosette behind its content. Panels sit 8 px in from
 * the screen edge on phones and 24 px on desktop.
 */
export interface RosettePlace {
  /** Size in px. */
  size: number;
  /** Distance from the panel's left (or right) edge, and from its top, in px. */
  x: number;
  y: number;
  from?: "left" | "right";
}

export function Panel({
  tone,
  rosette,
  rosetteDesktop,
  rosetteOpacity,
  rosetteAt,
  className = "",
  innerClassName = "",
  children,
  as: Tag = "section",
  labelledBy,
}: {
  tone: "blue" | "blue-reverse" | "paper";
  rosette?: RosettePlace;
  rosetteDesktop?: RosettePlace;
  /** 0.2 on blue panels by default, 0.18 on paper. */
  rosetteOpacity?: number;
  /** Instead of exact places: the rosette's centre as a share of the panel's width and height (Figma FIN). */
  rosetteAt?: [number, number];
  className?: string;
  innerClassName?: string;
  children: ReactNode;
  as?: "section" | "div";
  labelledBy?: string;
}) {
  const blue = tone !== "paper";
  const opacity = rosetteOpacity ?? (blue ? 0.2 : 0.18);
  const place = (prefix: string, r?: RosettePlace) =>
    r
      ? {
          [`--${prefix}s`]: `${r.size}px`,
          [`--${prefix}l`]: r.from === "right" ? "auto" : `${r.x}px`,
          [`--${prefix}r`]: r.from === "right" ? `${r.x}px` : "auto",
          [`--${prefix}t`]: `${r.y}px`,
        }
      : {};
  const at = (prefix: string, size: number) =>
    rosetteAt
      ? {
          [`--${prefix}s`]: `${size}px`,
          [`--${prefix}l`]: `calc(${rosetteAt[0] * 100}% - ${size / 2}px)`,
          [`--${prefix}r`]: "auto",
          [`--${prefix}t`]: `calc(${rosetteAt[1] * 100}% - ${size / 2}px)`,
        }
      : {};
  const showRosette = Boolean(rosette || rosetteAt);
  const style = {
    ...place("m", rosette),
    ...place("d", rosetteDesktop ?? rosette),
    ...at("m", 520),
    ...at("d", 900),
    opacity,
  } as CSSProperties;

  return (
    <Tag className={`p-2 lg:p-6 ${className}`} aria-labelledby={labelledBy}>
      <div
        className={`panel-${tone} relative isolate overflow-hidden rounded-[28px] lg:rounded-[40px] ${innerClassName}`}
      >
        {showRosette ? (
          <div
            aria-hidden="true"
            className={`rosette -z-10 ${blue ? "bg-white" : "bg-accent"} top-(--mt) right-(--mr) left-(--ml) size-(--ms) lg:top-(--dt) lg:right-(--dr) lg:left-(--dl) lg:size-(--ds)`}
            style={style}
          />
        ) : null}
        {children}
      </div>
    </Tag>
  );
}

/** The 1080 px content column used inside panels and plain sections. */
export const WRAP = "mx-auto w-full max-w-[1160px] px-5 lg:px-10";

/** A pill label above a heading (Figma "Tag"). */
export function Tag({ tone, children }: { tone: "paper" | "blue"; children: ReactNode }) {
  const colours = tone === "blue" ? "bg-white/14 text-white" : "bg-tag text-deep";
  return (
    <span
      className={`inline-flex rounded-full px-3.5 py-1.5 text-[13px] leading-[1.2] font-medium ${colours}`}
    >
      {children}
    </span>
  );
}
