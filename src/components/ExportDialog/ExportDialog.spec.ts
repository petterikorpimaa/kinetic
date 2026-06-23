import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';
import ExportDialog from './ExportDialog.vue';
import { useDocumentStore } from '@/stores/document';
import { createEmptyDocument } from '@/types';
import type { AnimationDocument } from '@/types';

let pinia: Pinia;

function sceneWithOpacity(): AnimationDocument {
  return {
    ...createEmptyDocument('doc', 'scene.svg'),
    svgMarkup: '<svg viewBox="0 0 10 10"><circle data-anim-id="orb"/></svg>',
    elements: [
      {
        id: 'el',
        domRef: 'orb',
        tag: 'circle',
        label: 'Orb',
        transformOrigin: { x: 0, y: 0 },
        baseTransform: '',
        pathLength: 0,
      },
    ],
    tracks: [
      {
        id: 't',
        elementId: 'el',
        property: 'opacity',
        keyframes: [
          { id: 'k0', time: 0, value: 0, easing: [0, 0, 1, 1] },
          { id: 'k1', time: 1, value: 1, easing: [0, 0, 1, 1] },
        ],
      },
    ],
  };
}

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});

function mountDialog() {
  const store = useDocumentStore();
  store.loadDocument(sceneWithOpacity());
  return mount(ExportDialog, { global: { plugins: [pinia] } });
}

describe('ExportDialog', () => {
  it('shows CSS keyframes for the current document by default', () => {
    const wrapper = mountDialog();
    const code = wrapper.find('[data-testid="export-code"]').text();
    expect(code).toContain('@keyframes orb-opacity');
    expect(code).toContain('opacity: 0;');
  });

  it('switches to GSAP output', async () => {
    const wrapper = mountDialog();
    await wrapper.find('[data-testid="export-tab-gsap"]').trigger('click');
    const code = wrapper.find('[data-testid="export-code"]').text();
    expect(code).toContain('gsap.timeline({ repeat: -1 })');
  });

  it('switches to the inlined SVG markup', async () => {
    const wrapper = mountDialog();
    await wrapper.find('[data-testid="export-tab-svg"]').trigger('click');
    const code = wrapper.find('[data-testid="export-code"]').text();
    expect(code).toContain('<circle data-anim-id="orb"');
  });

  it('copies the code and shows feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const wrapper = mountDialog();
    await wrapper.find('[data-testid="export-copy"]').trigger('click');
    await nextTick();

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText.mock.calls[0]![0]).toContain('@keyframes orb-opacity');
    expect(wrapper.find('[data-testid="export-copy"]').text()).toContain('Copied');

    vi.unstubAllGlobals();
  });

  it('emits close when the backdrop is clicked', async () => {
    const wrapper = mountDialog();
    await wrapper.find('[data-testid="export-overlay"]').trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
