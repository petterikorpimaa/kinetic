import type { AnimationDocument } from '../types/document';
import { createFrameRenderer } from '../core/frameRender';
import { unionRect, type Rect } from '../core/rasterCrop';

/**
 * Browser-only: measure the union bounding box of the animated content across a
 * set of sampled times, for fit-content raster export (SVG-143). Each frame is
 * rendered through the shared engine (`createFrameRenderer`), injected into an
 * offscreen-but-laid-out host, and measured with `getBBox` (geometry bounds in
 * viewBox units). Returns null when nothing renders on any frame.
 *
 * Not unit-tested — jsdom returns zero-size bboxes; covered by the export E2E.
 */
export function measureContentBounds(
  doc: AnimationDocument,
  times: readonly number[],
  hiddenIds?: ReadonlySet<string>,
): Rect | null {
  const renderer = createFrameRenderer(doc, { hiddenIds });
  const host = document.createElement('div');
  // Off-screen but still laid out, so getBBox returns real geometry.
  host.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden;';
  document.body.appendChild(host);

  let union: Rect | null = null;
  try {
    for (const time of times) {
      host.innerHTML = renderer.renderAt(time);
      const svg = host.querySelector('svg');
      if (svg === null) continue;
      const box = (svg as SVGSVGElement).getBBox();
      if (box.width === 0 && box.height === 0) continue;
      const rect: Rect = { x: box.x, y: box.y, w: box.width, h: box.height };
      union = union === null ? rect : unionRect(union, rect);
    }
  } finally {
    host.remove();
  }
  return union;
}
