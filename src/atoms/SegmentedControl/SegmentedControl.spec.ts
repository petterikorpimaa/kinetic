import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SegmentedControl from './SegmentedControl.vue';

const ITEMS = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
];

describe('SegmentedControl', () => {
  it('renders a tablist of segments', () => {
    const wrapper = mount(SegmentedControl, { props: { modelValue: 'a', items: ITEMS } });
    expect(wrapper.attributes('role')).toBe('tablist');
    expect(wrapper.findAll('[role="tab"]')).toHaveLength(2);
  });

  it('marks the selected segment via aria-selected, not a class', () => {
    const wrapper = mount(SegmentedControl, { props: { modelValue: 'b', items: ITEMS } });
    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[0]!.attributes('aria-selected')).toBe('false');
    expect(tabs[1]!.attributes('aria-selected')).toBe('true');
  });

  it('emits update:modelValue with the clicked id', async () => {
    const wrapper = mount(SegmentedControl, { props: { modelValue: 'a', items: ITEMS } });
    await wrapper.findAll('[role="tab"]')[1]!.trigger('click');
    expect(wrapper.emitted('update:modelValue')).toEqual([['b']]);
  });

  it('builds per-item testids from the prefix', () => {
    const wrapper = mount(SegmentedControl, {
      props: { modelValue: 'a', items: ITEMS, testidPrefix: 'export-tab-' },
    });
    expect(wrapper.find('[data-testid="export-tab-b"]').exists()).toBe(true);
  });
});
