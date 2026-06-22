import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import RasterExportPanel from './RasterExportPanel.vue';
import { useDocumentStore } from '@/stores/document';
import { createEmptyDocument } from '@/types';
import type { AnimationDocument } from '@/types';

let pinia: Pinia;

function sceneWithElement(): AnimationDocument {
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
  };
}

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});

function mountPanel(format: 'gif' | 'video', doc: AnimationDocument) {
  const store = useDocumentStore();
  store.loadDocument(doc);
  return mount(RasterExportPanel, { props: { format }, global: { plugins: [pinia] } });
}

describe('RasterExportPanel', () => {
  it('prompts to import when the document has no elements', () => {
    const wrapper = mountPanel('gif', createEmptyDocument('doc', 'empty.svg'));
    expect(wrapper.find('[data-testid="raster-panel"]').text()).toContain('Import an SVG');
    expect(wrapper.find('[data-testid="raster-render"]').exists()).toBe(false);
  });

  it('shows render controls for a GIF, including the loop toggle', () => {
    const wrapper = mountPanel('gif', sceneWithElement());
    expect(wrapper.find('[data-testid="raster-render"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="raster-scale"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="raster-fps"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Loop forever');
  });

  it('blocks the video format when WebM recording is unsupported (jsdom)', () => {
    const wrapper = mountPanel('video', sceneWithElement());
    expect(wrapper.find('[data-testid="raster-panel"]').text()).toContain('not supported');
    expect(wrapper.find('[data-testid="raster-render"]').exists()).toBe(false);
  });
});
