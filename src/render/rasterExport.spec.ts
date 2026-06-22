import { describe, it, expect } from 'vitest';
import type { AnimationDocument } from '../types/document';
import { planRasterExport, MIN_FPS, MAX_FPS, MAX_SCALE, MIN_SCALE } from './rasterExport';

function doc(overrides: Partial<AnimationDocument> = {}): AnimationDocument {
  return {
    id: 'd',
    name: 'test',
    duration: 2,
    fps: 30,
    viewBox: { x: 0, y: 0, w: 200, h: 100 },
    svgMarkup: '<svg viewBox="0 0 200 100"></svg>',
    elements: [],
    tracks: [],
    selectedElementId: null,
    ...overrides,
  };
}

describe('planRasterExport', () => {
  it('defaults fps to the document fps and scale to 1', () => {
    const plan = planRasterExport(doc(), {});
    expect(plan.fps).toBe(30);
    expect(plan.scale).toBe(1);
    expect(plan.width).toBe(200);
    expect(plan.height).toBe(100);
  });

  it('scales the output dimensions and rounds to whole pixels', () => {
    const plan = planRasterExport(doc(), { scale: 2 });
    expect(plan.width).toBe(400);
    expect(plan.height).toBe(200);
  });

  it('builds an inclusive frame grid (duration * fps + 1 frames)', () => {
    const plan = planRasterExport(doc({ duration: 2 }), { fps: 10 });
    expect(plan.frameCount).toBe(21);
    expect(plan.times[0]).toBe(0);
    expect(plan.times[plan.times.length - 1]).toBe(2);
  });

  it('clamps fps and scale into their valid ranges', () => {
    const high = planRasterExport(doc(), { fps: 999, scale: 99 });
    expect(high.fps).toBe(MAX_FPS);
    expect(high.scale).toBe(MAX_SCALE);

    const low = planRasterExport(doc(), { fps: 0, scale: 0.01 });
    expect(low.fps).toBe(MIN_FPS);
    expect(low.scale).toBe(MIN_SCALE);
  });
});
