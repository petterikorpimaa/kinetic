import { describe, it, expect } from 'vitest';
import { buildSampleTracks, SAMPLE_SELECTED_ELEMENT_ID, SAMPLE_DURATION } from './sampleAnimation';
import { valueAt } from './valueAt';
import type { NumericTrack } from '@/types/track';

const DURATION = SAMPLE_DURATION;
const RING_IDS = ['inner', 'middle', 'outer'] as const;
const RING_PROPS = ['draw', 'rotation', 'scale', 'opacity', 'blur'] as const;

function track(elementId: string, property: string): NumericTrack {
  const found = buildSampleTracks().find(
    (candidate) => candidate.elementId === elementId && candidate.property === property,
  );
  if (found === undefined) throw new Error(`missing ${elementId}.${property}`);
  return found as NumericTrack;
}

describe('buildSampleTracks', () => {
  it('gives each ring a draw, rotation, scale, opacity and blur track', () => {
    const tracks = buildSampleTracks();
    for (const id of RING_IDS) {
      const props = tracks.filter((t) => t.elementId === id).map((t) => t.property);
      expect(props).toEqual([...RING_PROPS]);
    }
    expect(tracks).toHaveLength(RING_IDS.length * RING_PROPS.length);
  });

  it('spins each ring a half-turn during the draw-on', () => {
    for (const id of RING_IDS) {
      const rotation = track(id, 'rotation');
      expect(rotation.keyframes.map((k) => k.value)).toEqual([0, 180]);
      expect(rotation.keyframes[0]!.time).toBe(0);
    }
  });

  it('draws every ring fully on, from 0% to 100%', () => {
    for (const id of RING_IDS) {
      const draw = track(id, 'draw');
      expect(draw.keyframes.map((k) => k.value)).toEqual([0, 100]);
    }
  });

  it('pulses the rings in order, from the inside out', () => {
    const starts = RING_IDS.map((id) => track(id, 'opacity').keyframes[0]!.time);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    expect(new Set(starts).size).toBe(RING_IDS.length); // strictly staggered
  });

  it('fades every ring out by the end of its pulse', () => {
    for (const id of RING_IDS) {
      expect(track(id, 'opacity').keyframes.at(-1)!.value).toBe(0);
    }
  });

  it('loops seamlessly — every ring is invisible at both ends of the timeline', () => {
    for (const id of RING_IDS) {
      // Undrawn at the start (stroke fully hidden)…
      expect(valueAt(track(id, 'draw'), 0)).toBe(0);
      // …and fully faded at the end, so the reset across the loop seam is unseen.
      expect(valueAt(track(id, 'opacity'), DURATION)).toBe(0);
    }
  });

  it('keeps every keyframe within the loop and sorted by ascending time', () => {
    for (const t of buildSampleTracks()) {
      const times = t.keyframes.map((k) => k.time);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
      expect(Math.min(...times)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...times)).toBeLessThanOrEqual(DURATION);
    }
  });

  it('selects an element that actually has a track', () => {
    expect(buildSampleTracks().map((t) => t.elementId)).toContain(SAMPLE_SELECTED_ELEMENT_ID);
  });
});
