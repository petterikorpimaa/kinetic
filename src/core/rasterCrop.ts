/**
 * Pure crop geometry + SVG viewBox rewriting for "fit content" raster export
 * (SVG-143). The browser-only bounds sampling (getBBox per frame) lives in
 * `src/render`; this module holds the framework-free math and string ops it uses.
 */

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** The smallest rect covering both inputs. */
export function unionRect(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.w, b.x + b.w);
  const bottom = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: right - x, h: bottom - y };
}

/** Grow a rect by `pad` on every side (covers stroke/filter bleed). */
export function padRect(rect: Rect, pad: number): Rect {
  return { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
}

/**
 * Rewrite the root `<svg>`'s viewBox + width/height to `rect` so a rasterizer
 * draws only that region. Touches just the opening tag, so child `width`/`height`
 * attributes are left alone. Returns the input unchanged if there's no `<svg>`.
 */
export function applyCropToSvg(svg: string, rect: Rect): string {
  const svgStart = svg.indexOf('<svg');
  if (svgStart === -1) return svg;
  const openEnd = svg.indexOf('>', svgStart);
  if (openEnd === -1) return svg;

  let tag = svg.slice(svgStart, openEnd);
  tag = setAttribute(tag, 'viewBox', `${num(rect.x)} ${num(rect.y)} ${num(rect.w)} ${num(rect.h)}`);
  tag = setAttribute(tag, 'width', num(rect.w));
  tag = setAttribute(tag, 'height', num(rect.h));
  return svg.slice(0, svgStart) + tag + svg.slice(openEnd);
}

function num(value: number): string {
  return String(Math.round(value * 1000) / 1000);
}

function setAttribute(tag: string, name: string, value: string): string {
  const pattern = new RegExp(`(\\s${name})="[^"]*"`);
  if (pattern.test(tag)) return tag.replace(pattern, `$1="${value}"`);
  return `${tag} ${name}="${value}"`;
}
