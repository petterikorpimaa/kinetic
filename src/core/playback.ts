/**
 * Pure playback advance: given the current time and the elapsed delta, where is
 * the playhead next, and is playback still running? Looping wraps to the start;
 * non-looping stops at the end. The rAF loop and the playback store both read
 * from this one function, so editor playback stays consistent with scrubbing
 * and the same samplers that export will use (architecture rule 1/4).
 */

export interface PlaybackState {
  readonly time: number;
  readonly playing: boolean;
}

/**
 * Advance the playhead by `deltaSeconds`.
 * - Within range: move forward, keep playing.
 * - At/past the end, looping: wrap back into [0, duration), keep playing.
 * - At/past the end, not looping: clamp to the end and stop.
 *
 * Modulo wrapping tolerates a large delta from a stalled frame.
 */
export function advancePlayhead(
  currentTime: number,
  deltaSeconds: number,
  duration: number,
  loop: boolean,
): PlaybackState {
  if (duration <= 0) return { time: 0, playing: false };
  const next = currentTime + deltaSeconds;
  if (next < duration) return { time: Math.max(0, next), playing: true };
  if (loop) return { time: next % duration, playing: true };
  return { time: duration, playing: false };
}
