import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import EmptyState from './EmptyState.vue';

describe('EmptyState', () => {
  it('renders centred message text from the default slot', () => {
    const wrapper = mount(EmptyState, { slots: { default: 'Nothing here yet' } });
    expect(wrapper.element.tagName).toBe('DIV');
    expect(wrapper.text()).toBe('Nothing here yet');
  });

  it('renders an icon slot alongside the message', () => {
    const wrapper = mount(EmptyState, {
      slots: { icon: '<svg class="ic" />', default: 'No shape selected' },
    });
    expect(wrapper.find('.ic').exists()).toBe(true);
    expect(wrapper.text()).toContain('No shape selected');
  });

  it('omits the icon slot when not provided', () => {
    const wrapper = mount(EmptyState, { slots: { default: 'x' } });
    expect(wrapper.find('svg').exists()).toBe(false);
  });

  it('merges a call-site class and forwards data attributes', () => {
    const wrapper = mount(EmptyState, {
      attrs: { class: 'note', 'data-testid': 'timeline-empty' },
    });
    expect(wrapper.classes()).toContain('note');
    expect(wrapper.attributes('data-testid')).toBe('timeline-empty');
  });

  it('adds the bordered modifier when requested', () => {
    const plain = mount(EmptyState).classes().length;
    const bordered = mount(EmptyState, { props: { bordered: true } }).classes().length;
    expect(bordered).toBeGreaterThan(plain);
  });
});
