import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Button from './Button.vue';

describe('Button', () => {
  it('renders a native button of type "button" by default', () => {
    const wrapper = mount(Button);
    expect(wrapper.element.tagName).toBe('BUTTON');
    expect(wrapper.attributes('type')).toBe('button');
  });

  it('respects a custom type', () => {
    const wrapper = mount(Button, { props: { type: 'submit' } });
    expect(wrapper.attributes('type')).toBe('submit');
  });

  it('defaults to the ghost variant and reflects it on data-variant', () => {
    expect(mount(Button).attributes('data-variant')).toBe('ghost');
    expect(mount(Button, { props: { variant: 'icon' } }).attributes('data-variant')).toBe('icon');
  });

  it('renders default slot content', () => {
    const wrapper = mount(Button, { slots: { default: 'Render GIF' } });
    expect(wrapper.text()).toBe('Render GIF');
  });

  it('forwards clicks from native listeners', async () => {
    const onClick = vi.fn();
    const wrapper = mount(Button, { attrs: { onClick } });
    await wrapper.trigger('click');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('falls native attributes through to the button (testid, title)', () => {
    const wrapper = mount(Button, { attrs: { 'data-testid': 'export-copy', title: 'Copy' } });
    expect(wrapper.attributes('data-testid')).toBe('export-copy');
    expect(wrapper.attributes('title')).toBe('Copy');
  });

  it('reflects the disabled prop and blocks clicks when disabled', async () => {
    const onClick = vi.fn();
    const wrapper = mount(Button, { props: { disabled: true }, attrs: { onClick } });
    expect(wrapper.attributes('disabled')).toBeDefined();
    await wrapper.trigger('click');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('omits aria-pressed unless used as a toggle', () => {
    expect(mount(Button).attributes('aria-pressed')).toBeUndefined();
    expect(mount(Button, { props: { accent: true } }).attributes('aria-pressed')).toBeUndefined();
  });

  it('reflects toggle state through aria-pressed in both directions', () => {
    expect(mount(Button, { props: { active: true } }).attributes('aria-pressed')).toBe('true');
    expect(mount(Button, { props: { active: false } }).attributes('aria-pressed')).toBe('false');
  });
});
