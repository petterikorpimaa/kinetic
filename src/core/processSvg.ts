import type { SceneElement } from '../types/element';
import type { ViewBox } from '../types/document';

/** Top-level SVG tags that become animatable layers. */
const ANIMATABLE_TAGS = [
  'circle',
  'rect',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'path',
  'g',
  'text',
  'image',
] as const;

const DEFAULT_VIEWBOX: ViewBox = { x: 0, y: 0, w: 480, h: 360 };

export interface ProcessedSvg {
  /** The cleaned `<svg>` outer HTML, with each layer tagged by `data-anim-id`. */
  readonly svgMarkup: string;
  readonly elements: readonly SceneElement[];
  readonly viewBox: ViewBox;
}

function parseViewBox(raw: string | null): ViewBox {
  if (!raw) return DEFAULT_VIEWBOX;
  const parts = raw
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return DEFAULT_VIEWBOX;
  const [x, y, w, h] = parts as [number, number, number, number];
  return { x, y, w, h };
}

function titleCase(tag: string): string {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

/**
 * A stable, safe `data-anim-id` derived from the SVG's own id (when present) or
 * a `tag-index` fallback. Constrained to `[A-Za-z0-9_-]` starting with a letter
 * or underscore, and made unique within the document. This is the single
 * guarantee the CSS/GSAP exporters rely on: ids are embedded into selectors and
 * generated code, so they must never carry quotes, braces, or other characters
 * that could break out of — or inject into — the exported artifact.
 */
function canonicalAnimId(rawId: string | null, fallback: string, used: Set<string>): string {
  let base = (rawId ?? '').replace(/[^A-Za-z0-9_-]/g, '-').replace(/^[^A-Za-z_]+/, '');
  if (base === '') base = fallback;
  let id = base;
  let suffix = 1;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

/** Strip active content before the markup is inlined: <script> and on* handlers. */
function sanitize(svg: SVGSVGElement): void {
  svg.querySelectorAll('script').forEach((node) => node.remove());
  for (const el of [svg, ...Array.from(svg.querySelectorAll('*'))]) {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.toLowerCase().startsWith('on')) el.removeAttribute(attr.name);
    }
  }
}

/**
 * Parse imported SVG markup into the editable model. Walks the top-level
 * children, keeps the animatable tags, assigns each a stable `data-anim-id`,
 * and derives a friendly label and `baseTransform`.
 *
 * Pure and framework-free — uses the platform `DOMParser` (provided by jsdom
 * in tests). Throws on input that is not a valid SVG (validate at boundaries).
 */
export function processSvg(raw: string): ProcessedSvg {
  const doc = new DOMParser().parseFromString(raw, 'image/svg+xml');
  if (doc.querySelector('parsererror') !== null) {
    throw new Error('Invalid SVG: could not be parsed.');
  }
  const svg = doc.querySelector('svg');
  if (svg === null) {
    throw new Error('Invalid SVG: no <svg> root element found.');
  }

  sanitize(svg);

  const whitelist = new Set<string>(ANIMATABLE_TAGS);
  const elements: SceneElement[] = [];
  const usedIds = new Set<string>();
  let index = 0;

  for (const child of Array.from(svg.children)) {
    const tag = child.tagName.toLowerCase();
    if (!whitelist.has(tag)) continue;

    const existingId = child.getAttribute('data-anim-id') ?? child.getAttribute('id');
    const animId = canonicalAnimId(existingId, `${tag}-${index}`, usedIds);
    child.setAttribute('data-anim-id', animId);
    child.setAttribute('id', animId);

    const label = child.getAttribute('data-name') ?? `${titleCase(tag)} ${index + 1}`;

    elements.push({
      id: animId,
      domRef: animId,
      tag,
      label,
      transformOrigin: { x: 0, y: 0 },
      baseTransform: child.getAttribute('transform') ?? '',
      pathLength: 0,
    });
    index += 1;
  }

  return {
    svgMarkup: svg.outerHTML,
    elements,
    viewBox: parseViewBox(svg.getAttribute('viewBox')),
  };
}
