// Copied from Codebase (src/components/brand/Wordmark.tsx) by `npm run sync:shared`. Change it there, then sync. Never edit it here.

import type { SVGProps } from "react";

/**
 * The Cyber X wordmark, traced from the approved logo artwork.
 *
 * Never retype the name in a font and never redraw the X: this component is
 * the only way the logo appears in the app. The lower-right leg of the X is
 * the only blue part.
 */
const INK_PATH =
  "M 118.0 102.1 L 50.0 102.1 L 42.0 101.5 L 30.0 98.1 L 19.3 92.0 L 10.7 84.0 L 5.8 77.0 L 1.9 68.0 L -0.2 59.0 L -0.5 48.0 L 0.7 39.0 L 3.7 30.0 L 8.7 21.0 L 17.0 12.0 L 24.0 6.7 L 32.0 2.8 L 43.0 -0.2 L 128.0 -0.3 L 119.4 17.0 L 118.0 18.1 L 50.0 18.2 L 45.0 18.7 L 39.0 20.7 L 31.1 26.0 L 26.0 31.2 L 21.6 40.0 L 19.8 49.0 L 20.7 60.0 L 22.9 66.0 L 25.8 71.0 L 32.0 77.2 L 37.0 80.2 L 43.0 82.4 L 50.0 83.4 L 127.0 83.7 L 119.2 101.0 Z M 225.0 102.1 L 206.0 102.1 L 205.0 101.0 L 204.5 59.0 L 147.0 -0.3 L 172.0 -0.6 L 174.0 0.0 L 216.0 43.5 L 262.0 -0.4 L 287.0 -0.5 L 289.5 0.0 L 225.9 60.0 L 225.9 101.0 Z M 400.0 102.1 L 318.0 102.1 L 313.0 101.5 L 313.0 -0.2 L 402.0 -0.3 L 409.0 1.6 L 413.0 3.7 L 417.7 7.0 L 421.4 11.0 L 424.4 15.0 L 427.1 22.0 L 427.5 33.0 L 424.3 43.0 L 418.2 51.0 L 424.4 57.0 L 427.3 62.0 L 429.3 71.0 L 428.4 80.0 L 425.2 87.0 L 418.0 95.2 L 409.0 100.4 Z M 566.0 18.2 L 456.0 18.1 L 455.4 17.0 L 455.5 0.0 L 458.0 -0.5 L 566.0 -0.5 L 567.1 1.0 L 567.2 17.0 Z M 719.0 102.0 L 694.0 101.8 L 663.0 66.5 L 662.0 65.7 L 659.0 65.7 L 615.0 65.7 L 614.4 67.0 L 614.0 101.6 L 597.0 102.0 L 595.0 101.3 L 595.0 47.8 L 681.0 47.2 L 686.0 45.3 L 690.0 42.0 L 693.1 36.0 L 693.4 32.0 L 692.4 27.0 L 690.0 23.0 L 686.0 19.8 L 683.0 18.6 L 595.4 18.0 L 594.7 17.0 L 594.8 0.0 L 599.0 -0.5 L 685.0 -0.5 L 694.0 1.8 L 700.7 6.0 L 707.1 13.0 L 711.4 22.0 L 712.7 30.0 L 712.2 40.0 L 709.3 48.0 L 703.2 56.0 L 698.0 60.3 L 687.6 65.0 L 719.5 101.0 Z M 784.0 102.0 L 756.0 102.0 L 810.5 52.0 L 761.0 5.3 L 756.0 -0.3 L 784.0 -0.3 L 835.0 47.8 L 838.7 52.0 Z M 847.0 47.4 L 833.4 35.0 L 833.7 34.0 L 871.0 -0.0 L 880.0 -0.6 L 899.4 0.0 Z M 399.0 83.0 L 402.0 82.4 L 405.0 80.6 L 408.1 77.0 L 409.2 74.0 L 409.4 70.0 L 408.2 66.0 L 404.0 61.6 L 398.0 60.3 L 340.0 60.2 L 338.9 59.0 L 339.0 43.0 L 341.0 42.4 L 396.0 42.3 L 401.0 41.4 L 406.4 37.0 L 408.4 32.0 L 408.1 26.0 L 404.8 21.0 L 401.0 18.6 L 397.0 18.1 L 333.0 18.1 L 331.1 19.0 L 331.0 80.0 L 331.8 83.0 Z M 566.0 60.2 L 456.0 60.2 L 455.5 43.0 L 458.0 42.4 L 566.0 42.4 L 567.0 43.0 L 567.1 47.0 L 566.9 59.0 Z M 566.0 102.1 L 456.0 102.0 L 455.5 84.0 L 458.0 83.4 L 566.0 83.4 L 567.2 84.0 L 567.3 96.0 L 567.2 101.0 Z";

const BLUE_LEG_PATH =
  "M 894.0 102.2 L 866.0 102.2 L 831.7 70.0 L 847.0 56.7 L 888.0 94.8 L 894.2 101.0 L 894.6 102.0 Z";

type WordmarkProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "children"> & {
  /** Rendered width in CSS pixels. Height follows the artwork's proportions. */
  width?: number;
};

export function Wordmark({ width = 240, ...props }: WordmarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-1 -1 902 105"
      width={width}
      height={(width * 105) / 902}
      role="img"
      aria-label="Cyber X"
      {...props}
    >
      <path fill="#0B0D12" fillRule="evenodd" d={INK_PATH} />
      <path fill="#0A5CFF" fillRule="evenodd" d={BLUE_LEG_PATH} />
    </svg>
  );
}
