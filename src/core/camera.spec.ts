import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CAMERA,
  ZOOM_MIN,
  ZOOM_MAX,
  zoomByWheel,
  panBy,
  isViewChanged,
  zoomPercent,
} from './camera';

describe('camera', () => {
  it('starts at the identity view', () => {
    expect(DEFAULT_CAMERA).toEqual({ zoom: 1, panX: 0, panY: 0 });
    expect(isViewChanged(DEFAULT_CAMERA)).toBe(false);
  });

  it('zooms in on wheel-up and out on wheel-down', () => {
    const zoomedIn = zoomByWheel(DEFAULT_CAMERA, -100);
    const zoomedOut = zoomByWheel(DEFAULT_CAMERA, 100);
    expect(zoomedIn.zoom).toBeGreaterThan(1);
    expect(zoomedOut.zoom).toBeLessThan(1);
  });

  it('clamps zoom to the allowed range', () => {
    let camera = DEFAULT_CAMERA;
    for (let i = 0; i < 100; i += 1) camera = zoomByWheel(camera, -100);
    expect(camera.zoom).toBe(ZOOM_MAX);

    camera = DEFAULT_CAMERA;
    for (let i = 0; i < 100; i += 1) camera = zoomByWheel(camera, 100);
    expect(camera.zoom).toBe(ZOOM_MIN);
  });

  it('leaves pan untouched when zooming', () => {
    const panned = { zoom: 1, panX: 30, panY: -20 };
    expect(zoomByWheel(panned, -100).panX).toBe(30);
    expect(zoomByWheel(panned, -100).panY).toBe(-20);
  });

  it('offsets pan from a base camera', () => {
    const base = { zoom: 1.2, panX: 10, panY: 5 };
    expect(panBy(base, 15, -8)).toEqual({ zoom: 1.2, panX: 25, panY: -3 });
  });

  it('reports a changed view after zoom or pan', () => {
    expect(isViewChanged(zoomByWheel(DEFAULT_CAMERA, -100))).toBe(true);
    expect(isViewChanged(panBy(DEFAULT_CAMERA, 5, 0))).toBe(true);
  });

  it('renders zoom as a whole-number percentage', () => {
    expect(zoomPercent(DEFAULT_CAMERA)).toBe(100);
    expect(zoomPercent({ zoom: 1.5, panX: 0, panY: 0 })).toBe(150);
    expect(zoomPercent({ zoom: 0.5, panX: 0, panY: 0 })).toBe(50);
  });

  it('does not mutate its input', () => {
    const frozen = Object.freeze({ zoom: 1, panX: 0, panY: 0 });
    expect(() => zoomByWheel(frozen, -100)).not.toThrow();
    expect(() => panBy(frozen, 5, 5)).not.toThrow();
  });
});
