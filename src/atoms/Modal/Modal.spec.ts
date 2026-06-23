import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import Modal from './Modal.vue';

describe('Modal', () => {
  it('renders a titled dialog panel with the body slot', () => {
    const wrapper = mount(Modal, {
      props: { title: 'Export animation', dialogTestid: 'export-dialog' },
      slots: { default: '<p class="body">hello</p>' },
    });
    const panel = wrapper.get('[role="dialog"]');
    expect(panel.attributes('aria-modal')).toBe('true');
    expect(panel.attributes('aria-label')).toBe('Export animation');
    expect(panel.attributes('data-testid')).toBe('export-dialog');
    expect(wrapper.find('.body').text()).toBe('hello');
    expect(wrapper.text()).toContain('Export animation');
  });

  it('renders the subtitle slot', () => {
    const wrapper = mount(Modal, { props: { title: 'T' }, slots: { subtitle: '<p>sub</p>' } });
    expect(wrapper.text()).toContain('sub');
  });

  it('emits close when the backdrop is clicked', async () => {
    const wrapper = mount(Modal, { props: { title: 'T' } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('does not emit close when the panel is clicked', async () => {
    const wrapper = mount(Modal, { props: { title: 'T' } });
    await wrapper.get('[role="dialog"]').trigger('click');
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('emits close on Escape', async () => {
    const wrapper = mount(Modal, { props: { title: 'T' } });
    await wrapper.trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('emits close from the close button', async () => {
    const wrapper = mount(Modal, { props: { title: 'T' } });
    await wrapper.get('[title="Close"]').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });
});
