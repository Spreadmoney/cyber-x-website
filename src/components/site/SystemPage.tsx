import type { ReactNode } from "react";

import { Panel } from "./Panel";
import { BELOW_MENU, SlimFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * The frame of the three system pages (Figma "Page not found", "Something
 * went wrong", "Maintenance"): menu bar, one paper panel with the message on
 * the left and a glass card on the right, and the slim footer.
 */
export function SystemPage({
  status,
  title,
  text,
  actions,
  card,
}: {
  status: ReactNode;
  title: string;
  text: ReactNode;
  actions?: ReactNode;
  card: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main id="main" className={`flex-1 ${BELOW_MENU}`}>
        <Panel
          tone="paper"
          labelledBy="system-title"
          rosette={{ size: 520, x: -73, y: 441 }}
          rosetteDesktop={{ size: 900, x: -230, y: -260, from: "right" }}
        >
          <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-6 px-5 pt-8 pb-7 lg:flex-row lg:items-center lg:justify-between lg:gap-16 lg:px-10 lg:py-[72px]">
            <div className="flex max-w-[560px] flex-col items-start gap-3 lg:gap-5">
              {status}
              <h1
                id="system-title"
                className="text-[44px] leading-[1.18] font-medium tracking-[-0.44px] lg:text-[56px] lg:leading-[1.1] lg:tracking-[-0.56px]"
              >
                {title}
              </h1>
              <div className="text-muted-fg text-[17px] leading-[1.5] lg:text-[19px]">{text}</div>
              {actions ? (
                <div className="flex w-full flex-col gap-3 pt-2 lg:w-auto lg:flex-row">
                  {actions}
                </div>
              ) : null}
            </div>
            <div className="shadow-glass-soft flex w-full flex-col gap-4 rounded-[24px] border border-white/95 bg-white/78 p-5 lg:w-[440px] lg:shrink-0 lg:p-7">
              {card}
            </div>
          </div>
        </Panel>
      </main>
      <SlimFooter />
    </>
  );
}

/** A row in the glass card: a title and a line under it. */
export function CardItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 border-t border-[rgb(10_19_56/0.1)] py-4">
      <h3 className="text-[17px] leading-[1.2] font-medium">{title}</h3>
      <p className="text-muted-fg text-[15px] leading-[1.5]">{children}</p>
    </div>
  );
}
