import type { CSSProperties } from "react";

import { Icon } from "@/components/site/Icon";
import type { CoverIcon, CoverKind } from "@/lib/content/topics";

/**
 * A post's cover (Figma COVER): the blue, deep or pale print with a glass
 * object holding the post's icon, and a small glass disc. Drawn in CSS, no
 * images. Decoration only: the title beside it says what the post is.
 */
const BACKGROUND: Record<CoverKind, string> = {
  blue: "bg-[linear-gradient(150deg,#0b3fad,#0a5cff_55%,#2b72ff)]",
  deep: "bg-[linear-gradient(150deg,#06195c,#0b3fad_55%,#1e66ff)]",
  paper: "bg-[linear-gradient(150deg,#d6e2fa,#e6edfb_55%,#f5f7fc)]",
};

/** [phone, desktop] sizes in px, from the Figma covers. */
const SIZES = {
  card: { box: "h-[180px] lg:h-[200px]", h: [180, 200], glass: [79, 88] },
  feature: { box: "h-[200px] lg:h-auto lg:min-h-[380px]", h: [200, 380], glass: [88, 167] },
  article: { box: "h-[200px] lg:h-[440px]", h: [200, 440], glass: [88, 194] },
  thumb: { box: "h-[72px] w-[88px] lg:h-[104px] lg:w-[160px]", h: [72, 104], glass: [32, 46] },
} as const;

export type CoverSize = keyof typeof SIZES;

function Spark({ className }: { className: string }) {
  return (
    <svg viewBox="9.5 9.5 21 21" aria-hidden="true" className={className}>
      <path
        d="M20 9.5L22.2274 17.7726L30.5 20L22.2274 22.2274L20 30.5L17.7726 22.2274L9.5 20L17.7726 17.7726L20 9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Cover({
  kind,
  icon,
  video,
  size,
  className = "",
}: {
  kind: CoverKind;
  icon: CoverIcon;
  video?: string;
  size: CoverSize;
  className?: string;
}) {
  const dark = kind !== "paper";
  const { box, h, glass } = SIZES[size];
  const px = (value: number) => `${Math.round(value)}px`;
  const vars = {
    "--g": px(glass[0]),
    "--G": px(glass[1]),
    "--gr": px(glass[0] * 0.3),
    "--GR": px(glass[1] * 0.3),
    "--i": px(glass[0] * 0.42),
    "--I": px(glass[1] * 0.42),
    "--d": px(Math.max(glass[0] * 0.38, 14)),
    "--D": px(Math.max(glass[1] * 0.38, 14)),
    "--dx": px(glass[0] * 0.36),
    "--DX": px(glass[1] * 0.36),
    "--dy": px(Math.max(h[0] / 2 - glass[0] * 0.8, 6)),
    "--DY": px(Math.max(h[1] / 2 - glass[1] * 0.8, 6)),
    "--r": px(Math.max(h[0] * 1.7, 300)),
    "--R": px(Math.max(h[1] * 1.7, 300)),
  } as CSSProperties;
  const glassLook = dark
    ? "border-white/50 bg-white/14 backdrop-blur-[3px]"
    : "border-white/95 bg-white/78 backdrop-blur-md";
  const shadow = "shadow-[0_12px_32px_rgb(10_23_77/0.18)]";

  return (
    <div
      aria-hidden="true"
      className={`relative isolate flex shrink-0 items-center justify-center overflow-hidden ${BACKGROUND[kind]} ${box} ${className}`}
      style={vars}
    >
      <div
        className={`rosette -z-10 ${dark ? "bg-white opacity-20" : "bg-accent opacity-30"} size-(--r) lg:size-(--R)`}
        style={{ left: "72%", top: "50%", translate: "-50% -50%" }}
      />
      <span
        className={`flex size-(--g) items-center justify-center rounded-(--gr) border lg:size-(--G) lg:rounded-(--GR) ${glassLook} ${shadow}`}
      >
        {icon === "spark" ? (
          <Spark className={`size-(--i) lg:size-(--I) ${dark ? "text-white" : "text-accent"}`} />
        ) : (
          <Icon
            name={icon}
            className={`size-(--i) lg:size-(--I) ${dark ? "brightness-0 invert" : ""}`}
          />
        )}
      </span>
      <span
        className={`absolute top-(--dy) left-[calc(50%+var(--dx))] size-(--d) rounded-full border lg:top-(--DY) lg:left-[calc(50%+var(--DX))] lg:size-(--D) ${glassLook} ${shadow}`}
      />
      {video ? (
        <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-[#0b0d12]/60 py-1.5 pr-2.5 pl-2 text-[13px] leading-[1.4] text-white">
          <span className="size-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-white" />
          {video}
        </span>
      ) : null}
    </div>
  );
}
