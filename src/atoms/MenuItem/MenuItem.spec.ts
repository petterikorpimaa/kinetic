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

  it('reflects disabled via aria-disabled and keeps the title tooltip hoverable', () => {
    const wrapper = mount(MenuItem, {
      props: { disabled: true },
      attrs: { title: 'Not available' },
    });
    // aria-disabled (not the native disabled attribute) so hover still shows the tooltip.
    expect(wrapper.attributes('aria-disabled')).toBe('true');
    expect(wrapper.attributes('disabled')).toBeUndefined();
    expect(wrapper.attributes('title')).toBe('Not available');
  });

  it('is not aria-disabled by default', () => {
    const wrapper = mount(MenuItem);
    expect(wrapper.attributes('aria-disabled')).toBeUndefined();
  });
});
