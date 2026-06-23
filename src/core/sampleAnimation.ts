import type { AnyTrack, NumericTrack } from '@/types/track';
import type { CubicBezierEasing } from '@/types/easing';

// Easings mirror the named presets in `presets.ts` (Out / In / In-Out / Back).
// Shared references are safe — easing is never mutated in place
// (setEasingForSelection copies before assigning).
const EASE_OUT: CubicBezierEasing = [0, 0, 0.58, 1];
const EASE_IN: CubicBezierEasing = [0.42, 0, 1, 1];
const EASE_IN_OUT: CubicBezierEasing = [0.42, 0, 0.58, 1];
const EASE_BACK: CubicBezierEasing = [0.34, 1.56, 0.64, 1];

// Pulse magnitudes, shared by every ring.
const SCALE_PEAK = 1.3;
const BLUR_PEAK = 8; // px — the soft teal bloom (drop-shadow has no blur radius).
const SPIN = 180; // degrees of half-turn during the draw-on.

/** Length of the seamless loop in seconds — also the document duration. */
export const SAMPLE_DURATION = 2;

/**
 * Element selected when the sample loads. The timeline shows the selected
 * element's tracks, so this points at the inner ring — the first to animate and
 * the one carrying the richest set of tracks.
 */
export const SAMPLE_SELECTED_ELEMENT_ID = 'inner';

/**
 * Timing for one ring, in seconds, within the {@link SAMPLE_DURATION} loop. The
 * draw-on and half-turn run from t=0; the scale/blur/fade pulse runs from
 * `pulseStart` to the end. Rings stagger from the inside out so the motion
 * ripples outward.
 */
interface RingTiming {
  readonly id: string;
  readonly drawEnd: number;
  readonly spinEnd: number;
  readonly pulseStart: number;
}

const RINGS: readonly RingTiming[] = [
  { id: 'inner', drawEnd: 0.5, spinEnd: 0.5, pulseStart: 0.85 },
  { id: 'middle', drawEnd: 0.75, spinEnd: 0.65, pulseStart: 1.0 },
  { id: 'outer', drawEnd: 1.0, spinEnd: 0.9, pulseStart: 1.15 },
];

function ringTracks(ring: RingTiming): NumericTrack[] {
  const { id, drawEnd, spinEnd, pulseStart } = ring;
  const end = SAMPLE_DURATION;
  return [
    // Stroke draws on clockwise, then holds full until the loop resets.
    {
      id: `sample-${id}-draw`,
      elementId: id,
      property: 'draw',
      keyframes: [
        { id: `sample-${id}-draw-0`, time: 0, value: 0, easing: EASE_OUT },
        { id: `sample-${id}-draw-1`, time: drawEnd, value: 100, easing: EASE_OUT },
      ],
    },
    // …spinning a half-turn as it draws.
    {
      id: `sample-${id}-rotation`,
      elementId: id,
      property: 'rotation',
      keyframes: [
        { id: `sample-${id}-rotation-0`, time: 0, value: 0, easing: EASE_IN },
        { id: `sample-${id}-rotation-1`, time: spinEnd, value: SPIN, easing: EASE_IN },
      ],
    },
    // Pulse: scale up a touch (with a hint of overshoot)…
    {
      id: `sample-${id}-scale`,
      elementId: id,
      property: 'scale',
      keyframes: [
        { id: `sample-${id}-scale-0`, time: pulseStart, value: 1, easing: EASE_BACK },
        { id: `sample-${id}-scale-1`, time: end, value: SCALE_PEAK, easing: EASE_BACK },
      ],
    },
    // …while fading out. It stays invisible until the loop restarts.
    {
      id: `sample-${id}-opacity`,
      elementId: id,
      property: 'opacity',
      keyframes: [
        { id: `sample-${id}-opacity-0`, time: pulseStart, value: 1, easing: EASE_IN_OUT },
        { id: `sample-${id}-opacity-1`, time: end, value: 0, easing: EASE_IN_OUT },
      ],
    },
    // …blooming into a soft teal glow as it goes.
    {
      id: `sample-${id}-blur`,
      elementId: id,
      property: 'blur',
      keyframes: [
        { id: `sample-${id}-blur-0`, time: pulseStart, value: 0, easing: EASE_OUT },
        { id: `sample-${id}-blur-1`, time: end, value: BLUR_PEAK, easing: EASE_OUT },
      ],
    },
  ];
}

/**
 * The example "loader" animation seeded with the bundled sample SVG: the three
 * rings draw on clockwise from the inside out — each spinning a half-turn as it
 * draws — then pulse in the same order (scale up + teal bloom + fade to nothing)
 * over a {@link SAMPLE_DURATION}s loop.
 *
 * The loop is seamless without every track returning to its start value: at both
 * ends of the timeline each ring is invisible — undrawn at t=0 (draw clamps to 0
 * before its draw window) and fully faded at the end (opacity holds at 0 after
 * its pulse) — so the instant reset across the loop seam is never seen.
 *
 * These are ordinary tracks — no special-casing: fully editable, removable,
 * undoable and exportable. Element ids match processSvg's output for the sample
 * (data-anim-id: inner / middle / outer).
 */
export function buildSampleTracks(): AnyTrack[] {
  return RINGS.flatMap(ringTracks);
}
