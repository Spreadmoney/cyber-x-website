import "server-only";

import QRCode from "qrcode";

/**
 * A QR code, drawn on the server as an SVG made only of squares (no
 * scripts), so it can be placed straight into the page.
 */
export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0b0d12ff", light: "#ffffffff" },
  });
}
