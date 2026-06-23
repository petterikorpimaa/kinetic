import type { AnimationDocument } from '../types/document';
import type { AnyTrack } from '../types/track';
import type { SceneElement } from '../types/element';
import { computeElementVisual, applyElementVisual, type NodeBaseline } from './elementVisual';

/**
 * Renders a document to static SVG markup at any time, by baking each element's
 * computed visual (via `computeElementVisual`) onto a parsed copy of the inlined
 * SVG. This is the raster export's source of truth — it samples the SAME
 * interpolation path as the live editor, so a rendered GIF/video frame matches
 * what the canvas shows (architecture rule 1).
 *
 * Pure and framework-free: parses once with the platform `DOMParser` (jsdom in
 * tests) and reuses the node refs across frames.
 */
export interface FrameRenderer {
  /** Base pixel width (the document viewBox width). */
  readonly width: number;
  /** Base pixel height (the document viewBox height). */
  readonly height: number;
  /** Static SVG markup with every element's values baked at `time`. */
  renderAt(time: number): string;
}

export interface FrameRenderOptions {
  /** Element ids to omit from the frame, matching the editor's per-layer hide. */
  readonly hiddenIds?: ReadonlySet<string>;
}

interface RenderTarget {
  readonly element: SceneElement;
  readonly node: SVGGraphicsElement;
  readonly tracks: readonly AnyTrack[];
  readonly baseline: NodeBaseline;
}

function baselineOf(node: SVGGraphicsElement): NodeBaseline {
  return {
    transform: node.getAttribute('transform'),
    opacity: node.getAttribute('opacity'),
    fill: node.getAttribute('fill'),
    stroke: node.getAttribute('stroke'),
    strokeWidth: node.getAttribute('stroke-width'),
    filter: node.style.filter,
  };
}

export function createFrameRenderer(
  doc: AnimationDocument,
  options: FrameRenderOptions = {},
): FrameRenderer {
  const parsed = new DOMParser().parseFromString(doc.svgMarkup, 'image/svg+xml');
  const svg = parsed.querySelector('svg');
  if (svg === null) {
    throw new Error('Cannot render frames: the document has no <svg> root.');
  }

  const width = doc.viewBox.w;
  const height = doc.viewBox.h;
  // Give the root explicit pixel dimensions so a rasterizer gets a known size.
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const hidden = options.hiddenIds ?? new Set<string>();
  const targets: RenderTarget[] = [];
  for (const element of doc.elements) {
    const node = svg.querySelector<SVGGraphicsElement>(`[data-anim-id="${element.domRef}"]`);
    if (node === null) continue;
    if (hidden.has(element.id)) {
      node.style.display = 'none';
      continue;
    }
    targets.push({
      element,
      node,
      tracks: doc.tracks.filter((track) => track.elementId === element.id),
      baseline: baselineOf(node),
    });
  }

  function renderAt(time: number): string {
    for (const target of targets) {
      applyElementVisual(
        target.node,
        computeElementVisual(target.element, target.tracks, time, target.baseline),
      );
    }
    return svg!.outerHTML;
  }

  return { width, height, renderAt };
}
