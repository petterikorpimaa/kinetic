import type { AnimationDocument } from '../types/document';
import type { SceneElement } from '../types/element';
import type { AnyTrack, NumericTrack, ColorTrack } from '../types/track';
import type { CubicBezierEasing } from '../types/easing';
import { strokeDashOffset } from './animation';
import { unionKeyframeTimes } from './exportSampling';
import { filterValue } from './cssExport';
import { round3 as num } from './format';

/**
 * GSAP timeline serializer (framework-free). Emits runnable `gsap.timeline()`
 * code targeting the inlined SVG by `data-anim-id`.
 *
 * Unlike CSS, GSAP composes the transform sub-properties (x/y/scale/rotation)
 * independently, so each animates as its own tween with its own per-segment
 * ease — no merging or baking needed. `filter` is still a single property, so
 * filter tracks animate together as one composed value. Eases map to GSAP via
 * `CustomEase` (linear → `"none"`); times stay in seconds.
 */

const TIME_EPSILON = 1e-4;
const HEADER = [
  "import gsap from 'gsap';",
  "import { CustomEase } from 'gsap/CustomEase';",
  '',
  'gsap.registerPlugin(CustomEase);',
  '',
  'const tl = gsap.timeline({ repeat: -1 });',
].join('\n');
const EMPTY_MESSAGE = '// Nothing to export yet — add keyframes to an element.';

/** Transform property → GSAP tween property name. */
const TRANSFORM_GSAP: Record<string, string> = {
  x: 'x',
  y: 'y',
  scale: 'scale',
  rotation: 'rotation',
};
const TRANSFORM_ORDER = ['x', 'y', 'scale', 'rotation'] as const;
const FILTER_PROPS: ReadonlySet<string> = new Set([
  'blur',
  'brightness',
  'contrast',
  'saturate',
  'grayscale',
  'sepia',
  'invert',
  'hue',
  'shadowX',
  'shadowY',
  'shadowColor',
]);

/** Monotonic counter so each emitted `CustomEase.create` gets a unique name. */
interface EaseIds {
  next: number;
}

function isLinear(easing: CubicBezierEasing): boolean {
  return easing[0] === 0 && easing[1] === 0 && easing[2] === 1 && easing[3] === 1;
}

/** GSAP ease expression: `"none"` for linear, else a registered `CustomEase`. */
function easeExpr(easing: CubicBezierEasing, ids: EaseIds): string {
  if (isLinear(easing)) return "'none'";
  const id = `e${ids.next++}`;
  const path = `M0,0 C${num(easing[0])},${num(easing[1])} ${num(easing[2])},${num(easing[3])} 1,1`;
  return `CustomEase.create('${id}', '${path}')`;
}

function numberTrack(tracks: readonly AnyTrack[], property: string): NumericTrack | undefined {
  const track = tracks.find((t) => t.property === property);
  return track !== undefined && track.keyframes.length > 0 ? (track as NumericTrack) : undefined;
}

function colorTrack(tracks: readonly AnyTrack[], property: string): ColorTrack | undefined {
  const track = tracks.find((t) => t.property === property);
  return track !== undefined && track.keyframes.length > 0 ? (track as ColorTrack) : undefined;
}

interface ElementState {
  readonly target: string;
  readonly lines: string[];
  maxEnd: number;
  readonly ids: EaseIds;
}

/** Emit per-segment `.to()` tweens for one single-value property track. */
function emitTrack(
  state: ElementState,
  gsapProp: string,
  track: NumericTrack | ColorTrack,
  format: (value: string | number) => string,
): void {
  const keyframes = track.keyframes;
  for (let i = 0; i < keyframes.length - 1; i++) {
    const from = keyframes[i]!;
    const to = keyframes[i + 1]!;
    const segment = to.time - from.time;
    if (segment <= TIME_EPSILON) continue;
    state.lines.push(
      `tl.to('${state.target}', { ${gsapProp}: ${format(to.value)}, duration: ${num(segment)}, ease: ${easeExpr(from.easing, state.ids)} }, ${num(from.time)});`,
    );
    state.maxEnd = Math.max(state.maxEnd, to.time);
  }
}

/** Outgoing easing for a filter segment starting at `time` (first member that owns it). */
function filterSegmentEasing(members: readonly AnyTrack[], time: number): CubicBezierEasing {
  for (const track of members) {
    const index = track.keyframes.findIndex((k) => Math.abs(k.time - time) < TIME_EPSILON);
    if (index >= 0 && index < track.keyframes.length - 1) return track.keyframes[index]!.easing;
  }
  return [0, 0, 1, 1];
}

/** Build the GSAP statements for one element, or null when it has no animation. */
function emitElement(
  element: SceneElement,
  tracks: readonly AnyTrack[],
  ids: EaseIds,
): ElementState | null {
  const state: ElementState = {
    target: `[data-anim-id="${element.domRef}"]`,
    lines: [],
    maxEnd: 0,
    ids,
  };
  const initial: string[] = [];

  const transformTracks = TRANSFORM_ORDER.map((p) => numberTrack(tracks, p)).filter(
    (t): t is NumericTrack => t !== undefined,
  );
  if (transformTracks.length > 0) {
    initial.push("transformOrigin: '50% 50%'");
    for (const track of transformTracks)
      initial.push(`${TRANSFORM_GSAP[track.property]}: ${num(track.keyframes[0]!.value)}`);
  }

  const opacity = numberTrack(tracks, 'opacity');
  if (opacity !== undefined) initial.push(`opacity: ${num(opacity.keyframes[0]!.value)}`);

  const fill = colorTrack(tracks, 'fill');
  if (fill !== undefined) initial.push(`fill: '${fill.keyframes[0]!.value}'`);

  const draw = numberTrack(tracks, 'draw');
  const length = element.pathLength || 0;
  if (draw !== undefined) {
    initial.push(`strokeDasharray: ${num(length)}`);
    initial.push(`strokeDashoffset: ${num(strokeDashOffset(length, draw.keyframes[0]!.value))}`);
  }

  const filterMembers = tracks.filter(
    (t) => FILTER_PROPS.has(t.property) && t.keyframes.length > 0,
  );
  const filterTimes = filterMembers.length > 0 ? unionKeyframeTimes(filterMembers) : [];
  if (filterMembers.length > 0)
    initial.push(`filter: '${filterValue(filterMembers, filterTimes[0]!)}'`);

  if (initial.length === 0) return null;
  state.lines.push(`tl.set('${state.target}', { ${initial.join(', ')} }, 0);`);

  for (const track of transformTracks)
    emitTrack(state, TRANSFORM_GSAP[track.property]!, track, (v) => num(v as number));
  if (opacity !== undefined) emitTrack(state, 'opacity', opacity, (v) => num(v as number));
  if (fill !== undefined) emitTrack(state, 'fill', fill, (v) => `'${v}'`);
  if (draw !== undefined)
    emitTrack(state, 'strokeDashoffset', draw, (v) => num(strokeDashOffset(length, v as number)));

  // `filter` is one CSS property, so it animates as a single tween per segment
  // with one ease. When filter sub-tracks are misaligned (different times/eases)
  // this can differ slightly from the editor's per-frame composition — GSAP has
  // no per-frame bake here, unlike the CSS exporter (DEC-8).
  for (let i = 0; i < filterTimes.length - 1; i++) {
    const from = filterTimes[i]!;
    const to = filterTimes[i + 1]!;
    const segment = to - from;
    if (segment <= TIME_EPSILON) continue;
    state.lines.push(
      `tl.to('${state.target}', { filter: '${filterValue(filterMembers, to)}', duration: ${num(segment)}, ease: ${easeExpr(filterSegmentEasing(filterMembers, from), state.ids)} }, ${num(from)});`,
    );
    state.maxEnd = Math.max(state.maxEnd, to);
  }

  // A lone keyframe (or all-constant tracks) produces only the initial .set.
  return state.lines.length > 0 ? state : null;
}

/** Serialize the whole document to runnable GSAP timeline code. */
export function exportGsap(doc: AnimationDocument): string {
  const ids: EaseIds = { next: 0 };
  const lines: string[] = [];
  let maxEnd = 0;
  for (const element of doc.elements) {
    const tracks = doc.tracks.filter((track) => track.elementId === element.id);
    if (tracks.length === 0) continue;
    const state = emitElement(element, tracks, ids);
    if (state === null) continue;
    lines.push(...state.lines);
    maxEnd = Math.max(maxEnd, state.maxEnd);
  }
  if (lines.length === 0) return EMPTY_MESSAGE;
  // Pad the loop to the document duration so it repeats on the editor's clock.
  if (maxEnd < doc.duration - TIME_EPSILON) {
    lines.push(`tl.to({}, { duration: ${num(doc.duration - maxEnd)} });`);
  }
  return `${HEADER}\n\n${lines.join('\n')}\n`;
}
