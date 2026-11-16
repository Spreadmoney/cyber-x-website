import type { CSSProperties } from "react";
import { preload } from "react-dom";

/** The security print, drawn through a CSS mask (globals.css, .rosette). */
export const ROSETTE = "/print/rosette.png";

/**
 * The print behind a panel, cover or film slot. It also asks for the
 * picture as the page starts: a CSS mask is found only once the styles have
 * loaded, and on the blog the print is the largest thing on the first
 * screen, so it arrived last (3.1 s on a slow phone). Masks are fetched in
 * CORS mode, so the early copy is too, or it would be fetched twice.
 */
export function RosetteMark({ className, style }: { className: string; style?: CSSProperties }) {
  preload(ROSETTE, { as: "image", crossOrigin: "anonymous" });
  return <div aria-hidden="true" className={`rosette -z-10 ${className}`} style={style} />;
}
