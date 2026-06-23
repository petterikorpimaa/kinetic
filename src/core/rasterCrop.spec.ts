import { describe, it, expect } from 'vitest';
import { unionRect, padRect, applyCropToSvg } from './rasterCrop';

describe('unionRect', () => {
  it('covers both rects', () => {
    expect(unionRect({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toEqual({
      x: 0,
      y: 0,
      w: 15,
      h: 15,
    });
  });

  it('handles a rect fully inside another', () => {
    expect(unionRect({ x: 0, y: 0, w: 20, h: 20 }, { x: 5, y: 5, w: 2, h: 2 })).toEqual({
      x: 0,
      y: 0,
      w: 20,
      h: 20,
    });
  });

  it('handles negative coordinates (content off the static bounds)', () => {
    expect(unionRect({ x: 0, y: 0, w: 10, h: 10 }, { x: -5, y: -5, w: 5, h: 5 })).toEqual({
      x: -5,
      y: -5,
      w: 15,
      h: 15,
    });
  });
});

describe('padRect', () => {
  it('grows the rect on every side', () => {
    expect(padRect({ x: 10, y: 10, w: 20, h: 20 }, 2)).toEqual({ x: 8, y: 8, w: 24, h: 24 });
  });
});

describe('applyCropToSvg', () => {
  const FRAME =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 360" width="480" height="360"><rect width="50" height="50"/></svg>';

  it('rewrites the root viewBox and width/height to the crop rect', () => {
    const out = applyCropToSvg(FRAME, { x: 100, y: 80, w: 120, h: 90 });
    expect(out).toContain('viewBox="100 80 120 90"');
    expect(out).toContain('width="120"');
    expect(out).toContain('height="90"');
  });

  it('leaves child width/height untouched', () => {
    const out = applyCropToSvg(FRAME, { x: 0, y: 0, w: 120, h: 90 });
    expect(out).toContain('<rect width="50" height="50"/>'); // child unchanged
  });

  it('returns the input unchanged when there is no <svg>', () => {
    expect(applyCropToSvg('<div/>', { x: 0, y: 0, w: 1, h: 1 })).toBe('<div/>');
  });

  it('adds the attributes when the root tag lacks them', () => {
    const out = applyCropToSvg('<svg xmlns="x"><rect/></svg>', { x: 1, y: 2, w: 3, h: 4 });
    expect(out).toContain('viewBox="1 2 3 4"');
    expect(out).toContain('width="3"');
    expect(out).toContain('height="4"');
  });
});
