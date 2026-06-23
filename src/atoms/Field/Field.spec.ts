import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Field from './Field.vue';

describe('Field', () => {
  it('renders a text input by default and reflects it on data-field', () => {
    const wrapper = mount(Field);
    expect(wrapper.element.tagName).toBe('INPUT');
    expect(wrapper.attributes('type')).toBe('text');
    expect(wrapper.attributes('data-field')).toBe('text');
  });

  it('renders a number input', () => {
    const wrapper = mount(Field, { props: { type: 'number' } });
    expect(wrapper.element.tagName).toBe('INPUT');
    expect(wrapper.attributes('type')).toBe('number');
  });

  it('renders a select with slotted options', () => {
    const wrapper = mount(Field, {
      props: { type: 'select' },
      slots: { default: '<option value="1">1×</option><option value="2">2×</option>' },
    });
    expect(wrapper.element.tagName).toBe('SELECT');
    expect(wrapper.findAll('option')).toHaveLength(2);
  });

  it('falls native attributes and value through to the element', () => {
    const wrapper = mount(Field, {
      attrs: { 'data-testid': 'duration-input', min: '0.5', max: '12', step: '0.5', value: '3' },
    });
    expect(wrapper.attributes('data-testid')).toBe('duration-input');
    expect(wrapper.attributes('min')).toBe('0.5');
    expect((wrapper.element as HTMLInputElement).value).toBe('3');
  });

  it('forwards change events from native listeners', async () => {
    const onChange = vi.fn();
    const wrapper = mount(Field, { attrs: { onChange } });
    await wrapper.trigger('change');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('disables the control when disabled', () => {
    expect(mount(Field, { props: { disabled: true } }).attributes('disabled')).toBeDefined();
  });

  it('disables the control when locked', () => {
    expect(mount(Field, { props: { locked: true } }).attributes('disabled')).toBeDefined();
  });

  it('is enabled by default', () => {
    expect(mount(Field).attributes('disabled')).toBeUndefined();
  });

  it('merges a call-site class with the base class', () => {
    const wrapper = mount(Field, { attrs: { class: 'myField' } });
    expect(wrapper.classes()).toContain('myField');
  });
});
