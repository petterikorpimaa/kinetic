import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ColorField from './ColorField.vue';

describe('ColorField', () => {
  it('renders a label wrapping a native colour input', () => {
    const wrapper = mount(ColorField, { props: { modelValue: '#ffffff' } });
    expect(wrapper.element.tagName).toBe('LABEL');
    expect(wrapper.find('input[type="color"]').exists()).toBe(true);
  });

  it('reflects the value on data-color and the picker', () => {
    const wrapper = mount(ColorField, { props: { modelValue: '#123456' } });
    expect(wrapper.attributes('data-color')).toBe('#123456');
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('#123456');
  });

  it('omits the hex readout by default', () => {
    const wrapper = mount(ColorField, { props: { modelValue: '#ffffff' } });
    expect(wrapper.text()).toBe('');
  });

  it('shows a hex readout when showHex is set', () => {
    const wrapper = mount(ColorField, { props: { modelValue: '#abcdef', showHex: true } });
    expect(wrapper.text()).toContain('#abcdef');
  });

  it('emits a normalised hex on input', async () => {
    const wrapper = mount(ColorField, { props: { modelValue: '#000000' } });
    await wrapper.find('input').setValue('#ff0000');
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['#ff0000']);
  });

  it('disables the picker when disabled', () => {
    const wrapper = mount(ColorField, { props: { modelValue: '#ffffff', disabled: true } });
    expect(wrapper.find('input').attributes('disabled')).toBeDefined();
  });
});
