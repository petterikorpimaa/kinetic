import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ProgressBar from './ProgressBar.vue';

describe('ProgressBar', () => {
  it('exposes the progressbar role and aria values', () => {
    const wrapper = mount(ProgressBar, { props: { value: 40 } });
    expect(wrapper.attributes('role')).toBe('progressbar');
    expect(wrapper.attributes('aria-valuenow')).toBe('40');
    expect(wrapper.attributes('aria-valuemin')).toBe('0');
    expect(wrapper.attributes('aria-valuemax')).toBe('100');
  });

  it('drives the fill width from value', () => {
    const wrapper = mount(ProgressBar, { props: { value: 25 } });
    expect(wrapper.find('span').attributes('style')).toContain('width: 25%');
  });

  it('clamps out-of-range values', () => {
    expect(
      mount(ProgressBar, { props: { value: 150 } })
        .find('span')
        .attributes('style'),
    ).toContain('width: 100%');
    expect(
      mount(ProgressBar, { props: { value: -10 } })
        .find('span')
        .attributes('style'),
    ).toContain('width: 0%');
  });

  it('supports a custom max', () => {
    const wrapper = mount(ProgressBar, { props: { value: 5, max: 10 } });
    expect(wrapper.find('span').attributes('style')).toContain('width: 50%');
    expect(wrapper.attributes('aria-valuemax')).toBe('10');
  });
});
