/**
 * Pure timeline math shared by the ruler, lanes, and scrub. Maps between
 * seconds and a lane's normalised [0,1] horizontal position, snaps edit times
 * to the keyframe grid, and builds adaptive ruler ticks. Framework-free
 * (architecture rule 4): the timeline UI reads from here, never the reverse.
 */

/** Keyframe edits snap to this grid, in seconds (the demo's 0.05s). */
export const SNAP_SECONDS = 0.05;

/** Clamp a time to the playable range [0, duration]. */
export function clampTime(time: number, duration: number): number {
  if (duration <= 0) return 0;
  return Math.max(0, Math.min(duration, time));
}

/** Round a time to the nearest `step` seconds (default: the keyframe grid). */
export function snapTime(time: number, step: number = SNAP_SECONDS): number {
  if (step <= 0) return time;
  const snapped = Math.round(time / step) * step;
  // Clean floating-point drift so stored times stay on a tidy grid.
  return Math.round(snapped * 1e6) / 1e6;
}

/** Position of `time` as a fraction [0,1] of the duration. */
export function timeToFraction(time: number, duration: number): number {
  if (duration <= 0) return 0;
  return clampTime(time, duration) / duration;
}

/** Inverse of `timeToFraction`: a [0,1] position back to seconds. */
export function fractionToTime(fraction: number, duration: number): number {
  if (duration <= 0) return 0;
  const clamped = Math.max(0, Math.min(1, fraction));
  return clamped * duration;
}

/** Spacing between ruler ticks, in seconds, scaled to the duration. */
export function tickStep(duration: number): number {
  if (duration <= 3) return 0.5;
  if (duration <= 6) return 1;
  return 2;
}

export interface Tick {
  readonly time: number;
  /** Position along the ruler as a fraction [0,1] of the duration. */
  readonly fraction: number;
  /** Seconds label on whole seconds, otherwise empty. */
  readonly label: string;
}

/** Build evenly spaced ruler ticks for `duration`, labelled on whole seconds. */
export function buildTicks(duration: number): readonly Tick[] {
  if (duration <= 0) return [];
  const step = tickStep(duration);
  const ticks: Tick[] = [];
  // Floor with an epsilon so float drift never adds a stray tick past the end.
  const count = Math.floor(duration / step + 1e-9);
  for (let i = 0; i <= count; i++) {
    const time = i * step;
    const isWhole = Math.abs(time - Math.round(time)) < 1e-9;
    ticks.push({ time, fraction: time / duration, label: isWhole ? `${Math.round(time)}s` : '' });
  }
  return ticks;
}
