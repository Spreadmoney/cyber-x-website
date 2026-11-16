import type { ReactNode } from "react";

import { Icon, Seal } from "./Icon";

/**
 * The hero object (Figma "Glass object · X"): a glass X whose lower-right
 * leg is tinted blue, as in the logo, with three glass chips around it. The
 * chips are sample values that show what a payment looks like; the whole
 * drawing is decoration, so screen readers skip it.
 */
const BAR =
  "absolute top-1/2 left-1/2 w-[72.9px] rounded-[36.45px] border-[1.5px] border-white/60 shadow-bar";

function Chip({
  icon,
  title,
  sub,
  className,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  className: string;
}) {
  return (
    <div
      className={`shadow-chip absolute flex items-center gap-2.5 rounded-full border border-white/95 bg-white/80 py-2 pr-4 pl-2 whitespace-nowrap ${className}`}
    >
      {icon}
      <div className="flex flex-col text-[13px]">
        <span className="text-fg leading-[1.2] font-medium">{title}</span>
        <span className="text-muted-fg leading-[1.4]">{sub}</span>
      </div>
    </div>
  );
}

export function GlassX() {
  return (
    <div
      aria-hidden="true"
      className="relative h-[300px] w-[334px] shrink-0 lg:h-[440px] lg:w-[480px]"
    >
      <div className="absolute inset-0 lg:scale-[1.44]">
        <div
          className={`${BAR} h-[270px] -translate-1/2 -rotate-40 bg-linear-to-b from-white/16 to-white/6`}
        />
        <div
          className={`${BAR} h-[135px] translate-x-[calc(-50%+43.4px)] translate-y-[calc(-50%+51.7px)] -rotate-40 bg-linear-to-b from-[rgb(184_219_255/0.19)] to-white/19`}
        />
        <div
          className={`${BAR} h-[270px] -translate-1/2 rotate-40 bg-linear-to-b from-white/16 to-white/6`}
        />
      </div>
      <Chip
        className="top-1 left-0 lg:top-6"
        icon={<Seal />}
        title="Kemi Fabrics"
        sub="Verified seller"
      />
      <Chip
        className="top-[126px] left-[155px] lg:top-[196px] lg:left-[301px]"
        icon={
          <span className="bg-ok-bg flex size-8 shrink-0 items-center justify-center rounded-2xl">
            <Icon name="check" />
          </span>
        }
        title="₦18,500.00"
        sub="Held until it arrives"
      />
      <Chip
        className="top-[248px] left-2 lg:top-[364px] lg:left-6"
        icon={<Icon name="askx-32" />}
        title="X"
        sub="Rent is due in 5 days"
      />
    </div>
  );
}
