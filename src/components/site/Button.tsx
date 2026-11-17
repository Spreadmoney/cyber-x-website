import { SiteLink as Link } from "@/components/site/SiteLink";
import type { ComponentProps, ReactNode } from "react";

/**
 * Buttons from the Figma parts (Button · Primary / Secondary, sizes L and S),
 * plus the two used on blue panels: white, and a white outline.
 */
export type ButtonVariant = "primary" | "secondary" | "soft" | "white" | "outline-light" | "danger";
export type ButtonSize = "L" | "S";

const BASE =
  "inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium leading-[1.2] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-[#0952e6] focus-visible:outline-accent",
  secondary: "border border-fg text-fg hover:bg-fg/5 focus-visible:outline-fg",
  // The second choice on newer pages: a blue tint instead of a black outline,
  // which Ayora found low fidelity (17 Nov 2026).
  soft: "bg-accent/10 text-accent hover:bg-accent/15 focus-visible:outline-accent",
  white: "bg-white text-fg hover:bg-white/90 focus-visible:outline-white",
  "outline-light":
    "border border-white/70 text-white hover:bg-white/10 focus-visible:outline-white",
  // Red stays red (Ayora, 15 Nov); this shade keeps white words readable (5:1).
  danger: "bg-error-text text-white hover:bg-[#b52d2c] focus-visible:outline-white",
};

const SIZES: Record<ButtonSize, string> = {
  L: "h-[52px] px-7 text-[17px]",
  S: "h-8 px-3.5 text-[13px]",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "L"): string {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]}`;
}

interface Common {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

/** A link that looks like a button. Addresses on other sites use a plain <a>. */
export function ButtonLink({
  href,
  variant,
  size,
  className = "",
  children,
  ...rest
}: Common & Omit<ComponentProps<"a">, "className" | "children"> & { href: string }) {
  const classes = `${buttonClass(variant, size)} ${className}`;
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} className={classes} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}

export function Button({
  variant,
  size,
  className = "",
  children,
  type = "button",
  ...rest
}: Common & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/** A text link with the › mark, such as "See everything Cyber X does ›". */
export function ArrowLink({
  href,
  children,
  tone = "accent",
  className = "",
}: {
  href: string;
  children: ReactNode;
  tone?: "accent" | "white";
  className?: string;
}) {
  const colour = tone === "white" ? "text-white" : "text-accent";
  return (
    <Link
      href={href}
      className={`text-[17px] leading-[1.2] font-medium ${colour} rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current ${className}`}
    >
      {children}
      <span aria-hidden="true">{"  ›"}</span>
    </Link>
  );
}
