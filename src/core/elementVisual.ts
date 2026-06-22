import type { SceneElement } from '../types/element';
import type { AnyTrack, NumericTrack, ColorTrack, NumericProperty } from '../types/track';
import { sampleNumber, sampleColor, composeTransform, strokeDashOffset } from './animation';
import { scalarFilterCss, dropShadowCss, composeFilter, SCALAR_FILTERS } from './filters';
import { getPropertyDef } from './properties';

/**
 * The element's ORIGINAL attribute values, captured before animation. Used as
 * the fallback whenever a property has no track, so removing a track restores
 * the imported look instead of leaving the last animated value stuck on.
 */
export interface NodeBaseline {
  readonly transform: string | null;
  readonly opacity: string | null;
  readonly fill: string | null;
  readonly filter: string;
}

/**
 * The full visual state of one element at one instant. This is the single
 * computed description of "how the element looks at time t" — the live editor
 * preview (CanvasStage) and the raster frame renderer both derive it from here,
 * so neither can drift from the other (architecture rule 1).
 */
export interface ElementVisual {
  readonly transform: string | null;
  readonly opacity: string | null;
  readonly fill: string | null;
  readonly strokeDasharray: string;
  readonly strokeDashoffset: string;
  readonly filter: string;
}

const DEFAULT_FILL = '#14b8a6';

// A track's value kind is fixed by its property, so these casts are sound.
function numberTrack(tracks: readonly AnyTrack[], property: string): NumericTrack | undefined {
  return tracks.find((track) => track.property === property) as NumericTrack | undefined;
}
function colorTrack(tracks: readonly AnyTrack[], property: string): ColorTrack | undefined {
  return tracks.find((track) => track.property === property) as ColorTrack | undefined;
}

function numericDefault(property: NumericProperty): number {
  const def = getPropertyDef(property);
  return def !== undefined && def.kind === 'number' ? def.defaultValue : 0;
}

function transformAt(
  element: SceneElement,
  tracks: readonly AnyTrack[],
  time: number,
  base: NodeBaseline,
): string | null {
  const xTrack = numberTrack(tracks, 'x');
  const yTrack = numberTrack(tracks, 'y');
  const scaleTrack = numberTrack(tracks, 'scale');
  const rotationTrack = numberTrack(tracks, 'rotation');
  if (!xTrack && !yTrack && !scaleTrack && !rotationTrack) return base.transform;
  return composeTransform(element.transformOrigin, {
    x: sampleNumber(xTrack, time, 0),
    y: sampleNumber(yTrack, time, 0),
    scale: sampleNumber(scaleTrack, time, 1),
    rotation: sampleNumber(rotationTrack, time, 0),
  });
}

interface DashState {
  readonly strokeDasharray: string;
  readonly strokeDashoffset: string;
}

function drawAt(element: SceneElement, tracks: readonly AnyTrack[], time: number): DashState {
  const drawTrack = numberTrack(tracks, 'draw');
  if (!drawTrack) return { strokeDasharray: '', strokeDashoffset: '' };
  const length = element.pathLength || 0;
  return {
    strokeDasharray: String(length),
    strokeDashoffset: String(strokeDashOffset(length, sampleNumber(drawTrack, time, 100))),
  };
}

// Compose the `filter` from active scalar filters (canonical order) then
// drop-shadow, restoring the baseline filter when the element has none.
function filterAt(tracks: readonly AnyTrack[], time: number, base: NodeBaseline): string {
  const parts: string[] = [];
  for (const filter of SCALAR_FILTERS) {
    const track = numberTrack(tracks, filter);
    if (track !== undefined) {
      parts.push(scalarFilterCss(filter, sampleNumber(track, time, numericDefault(filter))));
    }
  }
  const shadowX = numberTrack(tracks, 'shadowX');
  const shadowY = numberTrack(tracks, 'shadowY');
  const shadowColor = colorTrack(tracks, 'shadowColor');
  if (shadowX !== undefined || shadowY !== undefined || shadowColor !== undefined) {
    parts.push(
      dropShadowCss(
        sampleNumber(shadowX, time, numericDefault('shadowX')),
        sampleNumber(shadowY, time, numericDefault('shadowY')),
        sampleColor(shadowColor, time, '#000000'),
      ),
    );
  }
  return parts.length > 0 ? composeFilter(parts) : base.filter;
}

/** The element's complete visual state at `time`, computed from its tracks. */
export function computeElementVisual(
  element: SceneElement,
  tracks: readonly AnyTrack[],
  time: number,
  base: NodeBaseline,
): ElementVisual {
  const opacityTrack = numberTrack(tracks, 'opacity');
  const fillTrack = colorTrack(tracks, 'fill');
  const dash = drawAt(element, tracks, time);
  return {
    transform: transformAt(element, tracks, time, base),
    opacity: opacityTrack ? String(sampleNumber(opacityTrack, time, 1)) : base.opacity,
    fill: fillTrack ? sampleColor(fillTrack, time, base.fill ?? DEFAULT_FILL) : base.fill,
    strokeDasharray: dash.strokeDasharray,
    strokeDashoffset: dash.strokeDashoffset,
    filter: filterAt(tracks, time, base),
  };
}

function setAttr(node: SVGGraphicsElement, name: string, value: string | null): void {
  if (value === null) node.removeAttribute(name);
  else node.setAttribute(name, value);
}

/** Write a computed visual onto an SVG node (live preview node or a clone). */
export function applyElementVisual(node: SVGGraphicsElement, visual: ElementVisual): void {
  setAttr(node, 'transform', visual.transform);
  setAttr(node, 'opacity', visual.opacity);
  setAttr(node, 'fill', visual.fill);
  node.style.strokeDasharray = visual.strokeDasharray;
  node.style.strokeDashoffset = visual.strokeDashoffset;
  node.style.filter = visual.filter;
}
