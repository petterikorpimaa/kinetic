import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SectionLabel from './SectionLabel.vue';

describe('SectionLabel', () => {
  it('renders slot text in a span', () => {
    const wrapper = mount(SectionLabel, { slots: { default: 'Layers' } });
    expect(wrapper.element.tagName).toBe('SPAN');
    expect(wrapper.text()).toBe('Layers');
  });

  it('merges a call-site class with the base class', () => {
    const wrapper = mount(SectionLabel, { attrs: { class: 'sub' }, slots: { default: 'x' } });
    expect(wrapper.classes()).toContain('sub');
  });
});
