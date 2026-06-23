import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Chip from './Chip.vue';

describe('Chip', () => {
  it('renders a button of type "button" with slot content', () => {
    const wrapper = mount(Chip, { slots: { default: 'easeOut' } });
    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.attributes('type')).toBe('button');
    expect(wrapper.text()).toBe('easeOut');
  });

  it('reflects the toggle state through aria-pressed', () => {
    expect(mount(Chip, { props: { active: true } }).attributes('aria-pressed')).toBe('true');
    expect(mount(Chip, { props: { active: false } }).attributes('aria-pressed')).toBe('false');
  });

  it('forwards clicks and data attributes', async () => {
    const onClick = vi.fn();
    const wrapper = mount(Chip, { attrs: { onClick, 'data-testid': 'easing-preset-easeOut' } });
    expect(wrapper.attributes('data-testid')).toBe('easing-preset-easeOut');
    await wrapper.trigger('click');
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
