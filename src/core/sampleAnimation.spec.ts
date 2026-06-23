import { describe, it, expect } from 'vitest';
import { buildSampleTracks, SAMPLE_SELECTED_ELEMENT_ID } from './sampleAnimation';

describe('buildSampleTracks', () => {
  it('animates the ring, orb and play with transform + opacity', () => {
    const tracks = buildSampleTracks();
    expect(tracks.map((track) => `${track.elementId}.${track.property}`)).toEqual([
      'ring.rotation',
      'orb.scale',
      'play.opacity',
    ]);
  });

  it('spins the ring a full turn across the default 3s duration', () => {
    const ring = buildSampleTracks().find((track) => track.elementId === 'ring')!;
    expect(ring.keyframes.map((keyframe) => keyframe.value)).toEqual([0, 360]);
    expect(ring.keyframes[0]!.time).toBe(0);
    expect(ring.keyframes.at(-1)!.time).toBe(3);
  });

  it('loops seamlessly — every track ends where it visually started', () => {
    for (const track of buildSampleTracks()) {
      const first = track.keyframes[0]!.value as number;
      const last = track.keyframes.at(-1)!.value as number;
      const delta = Math.abs(last - first);
      // Rotation is seamless at a full turn (360°); other tracks return to value.
      const seamless = track.property === 'rotation' ? delta % 360 === 0 : delta === 0;
      expect(seamless).toBe(true);
    }
  });

  it('keeps each track sorted by ascending time', () => {
    for (const track of buildSampleTracks()) {
      const times = track.keyframes.map((keyframe) => keyframe.time);
      expect([...times].sort((a, b) => a - b)).toEqual(times);
    }
  });

  it('selects an element that actually has a track', () => {
    expect(buildSampleTracks().map((track) => track.elementId)).toContain(
      SAMPLE_SELECTED_ELEMENT_ID,
    );
  });
});
