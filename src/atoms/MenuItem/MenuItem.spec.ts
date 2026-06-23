import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MenuItem from './MenuItem.vue';

describe('MenuItem', () => {
  it('renders a full-width button of type "button" with slot content', () => {
    const wrapper = mount(MenuItem, { slots: { default: 'Import SVG' } });
    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.attributes('type')).toBe('button');
    expect(wrapper.text()).toBe('Import SVG');
  });

  it('forwards clicks and native attributes', async () => {
    const onClick = vi.fn();
    const wrapper = mount(MenuItem, { attrs: { onClick, 'data-testid': 'menu-import' } });
    expect(wrapper.attributes('data-testid')).toBe('menu-import');
    await wrapper.trigger('click');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('merges a call-site class with the base class', () => {
    const wrapper = mount(MenuItem, { attrs: { class: 'extra' } });
    expect(wrapper.classes()).toContain('extra');
  });

  it('accepts the danger modifier', () => {
    const wrapper = mount(MenuItem, { props: { danger: true } });
    expect(wrapper.element.tagName).toBe('BUTTON');
  });
});
