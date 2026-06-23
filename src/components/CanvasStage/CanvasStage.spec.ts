import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import CanvasStage from './CanvasStage.vue';

let pinia: Pinia;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});

afterEach(() => {
  document.body.style.userSelect = '';
});

// `button` is read-only on a MouseEvent once constructed, so build it via the
// init dict rather than @vue/test-utils' trigger (which assigns properties after
// construction). A 'pointerdown'-typed MouseEvent still fires the listener.
function pointerdown(el: Element, button: number): void {
  el.dispatchEvent(
    new MouseEvent('pointerdown', { button, clientX: 10, clientY: 10, bubbles: true }),
  );
}

describe('CanvasStage pan', () => {
  // A pan starts on the empty canvas but its move/up listeners live on window, so
  // the drag can range over the surrounding panels. Suppressing text selection on
  // the body for the duration keeps that drag from sweeping a selection there.
  it('suppresses page text selection while panning and restores it on release', () => {
    const wrapper = mount(CanvasStage, { global: { plugins: [pinia] } });

    pointerdown(wrapper.find('[data-testid="canvas-viewport"]').element, 0);
    expect(document.body.style.userSelect).toBe('none');

    window.dispatchEvent(new Event('pointerup'));
    expect(document.body.style.userSelect).toBe('');
  });

  it('does not start a pan (or touch selection) for non-primary buttons', () => {
    const wrapper = mount(CanvasStage, { global: { plugins: [pinia] } });

    pointerdown(wrapper.find('[data-testid="canvas-viewport"]').element, 2);
    expect(document.body.style.userSelect).toBe('');
  });
});
