import { describe, it, expect } from 'vitest';
import { clampPanelHeight, maxPanelHeight, MIN_PANEL_HEIGHT } from './useVerticalResize';

describe('clampPanelHeight', () => {
  it('keeps a value within the min and the 60%-of-viewport max', () => {
    expect(clampPanelHeight(300, 1000)).toBe(300);
  });

  it('floors at the minimum height', () => {
    expect(clampPanelHeight(10, 1000)).toBe(MIN_PANEL_HEIGHT);
  });

  it('caps at 60% of the viewport', () => {
    expect(clampPanelHeight(900, 1000)).toBe(maxPanelHeight(1000));
    expect(maxPanelHeight(1000)).toBe(600);
  });
});
