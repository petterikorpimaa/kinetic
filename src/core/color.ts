/**
 * Hex-colour helpers for the `fill` property: parsing, interpolation, and
 * input normalisation. Pure and framework-free.
 */

type Rgb = [number, number, number];

/** Brand teal, used when a colour can't be parsed. */
const FALLBACK_RGB: Rgb = [20, 184, 166];

function expandShorthand(body: string): string {
  if (body.length !== 3) return body;
  return body[0]! + body[0]! + body[1]! + body[1]! + body[2]! + body[2]!;
}

/** Parse `#rgb` or `#rrggbb` to an `[r, g, b]` triple; falls back on bad input. */
export function hexToRgb(hex: string): Rgb {
  const value = hex.trim();
  if (value[0] !== '#') return [...FALLBACK_RGB];
  const body = expandShorthand(value.slice(1));
  if (body.length !== 6) return [...FALLBACK_RGB];
  const parsed = Number.parseInt(body, 16);
  if (Number.isNaN(parsed)) return [...FALLBACK_RGB];
  return [(parsed >> 16) & 255, (parsed >> 8) & 255, parsed & 255];
}

/** Blend two hex colours channel-wise; `progress` is the eased 0–1 position. */
export function mixHexColor(from: string, to: string, progress: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const channel = (index: number): string => {
    const mixed = Math.round(a[index]! + (b[index]! - a[index]!) * progress);
    return mixed.toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Coerce free-typed input toward a valid lowercase hex string, or `null` when
 * it can't be made valid. Strips junk, prepends `#`, accepts 3- or 6-digit.
 */
export function normalizeHex(raw: string): string | null {
  let value = raw.trim().replace(/[^#0-9a-fA-F]/g, '');
  if (!value) return null;
  if (value[0] !== '#') value = `#${value}`;
  if (!HEX_PATTERN.test(value)) return null;
  return value.toLowerCase();
}

/** Perceived luminance (0–1) of a hex colour via the Rec. 601 luma weights. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** True when a colour is light enough that dark content reads better over it. */
export function isLightColor(hex: string): boolean {
  return luminance(hex) > 0.5;
}
