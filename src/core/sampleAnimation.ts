import type { AnyTrack, NumericTrack } from '@/types/track';
import type { CubicBezierEasing } from '@/types/easing';

// Constant easings: a steady spin and a smooth ease-in-out pulse. Shared
// references are safe here — like the store's DEFAULT_EASING, easing is never
// mutated in place (setEasingForSelection copies before assigning).
const LINEAR: CubicBezierEasing = [0, 0, 1, 1];
const SMOOTH: CubicBezierEasing = [0.42, 0, 0.58, 1];

/**
 * Element selected when the sample loads. The timeline shows the selected
 * element's tracks, so this points at one that actually has a track — otherwise
 * the seeded animation wouldn't be visible on first load.
 */
export const SAMPLE_SELECTED_ELEMENT_ID = 'orb';

/**
 * The example "loader" animation seeded with the bundled sample SVG (SVG-155):
 * the ring spins a full turn, the orb breathes (scale pulse), and the play icon
 * pulses its opacity — so the timeline isn't empty on first load and pressing
 * play shows motion immediately. Every track starts and ends on the same value,
 * so the loop is seamless and the first (static) frame looks like the plain logo.
 *
 * These are ordinary tracks — no special-casing: fully editable, removable,
 * undoable and exportable. Element ids match processSvg's output for the sample
 * (data-anim-id: ring / orb / play).
 */
export function buildSampleTracks(): AnyTrack[] {
  const tracks: NumericTrack[] = [
    {
      id: 'sample-ring-rotation',
      elementId: 'ring',
      property: 'rotation',
      keyframes: [
        { id: 'sample-ring-rotation-0', time: 0, value: 0, easing: LINEAR },
        { id: 'sample-ring-rotation-1', time: 3, value: 360, easing: LINEAR },
      ],
    },
    {
      id: 'sample-orb-scale',
      elementId: 'orb',
      property: 'scale',
      keyframes: [
        { id: 'sample-orb-scale-0', time: 0, value: 1, easing: SMOOTH },
        { id: 'sample-orb-scale-1', time: 1.5, value: 1.12, easing: SMOOTH },
        { id: 'sample-orb-scale-2', time: 3, value: 1, easing: SMOOTH },
      ],
    },
    {
      id: 'sample-play-opacity',
      elementId: 'play',
      property: 'opacity',
      keyframes: [
        { id: 'sample-play-opacity-0', time: 0, value: 1, easing: SMOOTH },
        { id: 'sample-play-opacity-1', time: 1.5, value: 0.5, easing: SMOOTH },
        { id: 'sample-play-opacity-2', time: 3, value: 1, easing: SMOOTH },
      ],
    },
  ];
  return tracks;
}
