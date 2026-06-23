import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Popover from './Popover.vue';

describe('Popover', () => {
  it('renders nothing when closed', () => {
    const wrapper = mount(Popover, {
      props: { open: false },
      slots: { default: '<div class="panel">x</div>' },
    });
    expect(wrapper.find('.panel').exists()).toBe(false);
  });

  it('renders the panel slot and a backdrop when open', () => {
    const wrapper = mount(Popover, {
      props: { open: true },
      slots: { default: '<div class="panel">x</div>' },
    });
    expect(wrapper.find('.panel').exists()).toBe(true);
    expect(wrapper.findAll('div')).toHaveLength(2);
  });

  it('emits update:open=false when the backdrop is clicked', async () => {
    const wrapper = mount(Popover, {
      props: { open: true },
      slots: { default: '<div class="panel" />' },
    });
    await wrapper.findAll('div')[0]!.trigger('click');
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
  });

  it('positions the backdrop with the given z-index', () => {
    const wrapper = mount(Popover, {
      props: { open: true, backdropZ: 20 },
      slots: { default: '<div class="panel" />' },
    });
    expect(wrapper.findAll('div')[0]!.attributes('style')).toContain('z-index: 20');
  });

  it('emits update:open=false on Escape while open', () => {
    const wrapper = mount(Popover, {
      props: { open: true },
      slots: { default: '<div class="panel" />' },
    });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.emitted('update:open')).toEqual([[false]]);
    wrapper.unmount();
  });

  it('does not listen for Escape when closed', () => {
    const wrapper = mount(Popover, { props: { open: false }, slots: { default: '<div />' } });
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.emitted('update:open')).toBeUndefined();
    wrapper.unmount();
  });
});
