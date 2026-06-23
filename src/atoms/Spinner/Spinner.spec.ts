import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Spinner from './Spinner.vue';

describe('Spinner', () => {
  it('renders a status svg', () => {
    const wrapper = mount(Spinner);
    const svg = wrapper.find('svg');
    expect(svg.exists()).toBe(true);
    expect(svg.attributes('role')).toBe('status');
  });

  it('applies the size', () => {
    const wrapper = mount(Spinner, { props: { size: 30 } });
    expect(wrapper.find('svg').attributes('width')).toBe('30');
  });

  it('sets aria-label only when a label is given', () => {
    expect(mount(Spinner).find('svg').attributes('aria-label')).toBeUndefined();
    expect(
      mount(Spinner, { props: { label: 'Rendering' } })
        .find('svg')
        .attributes('aria-label'),
    ).toBe('Rendering');
  });
});
