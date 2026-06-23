import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import { nextTick } from 'vue';
import ImportDialog from './ImportDialog.vue';
import { useDocumentStore } from '@/stores/document';

let pinia: Pinia;

beforeEach(() => {
  pinia = createPinia();
  setActivePinia(pinia);
});

function mountDialog() {
  return mount(ImportDialog, { global: { plugins: [pinia] } });
}

const VALID = '<svg viewBox="0 0 10 10"><circle id="dot" r="5"/></svg>';

describe('ImportDialog — preview + editable code (SVG-139)', () => {
  it('starts on the chooser, not the preview', () => {
    const wrapper = mountDialog();
    expect(wrapper.find('[data-testid="load-sample"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="import-preview"]').exists()).toBe(false);
  });

  it('the code block is collapsed by default when staging markup', async () => {
    const wrapper = mountDialog();
    await wrapper.find('[data-testid="import-edit"]').trigger('click');
    // Entering via "edit markup" opens the editor; a file drop would leave it collapsed.
    expect(wrapper.find('[data-testid="import-preview"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="import-code"]').exists()).toBe(true);
  });

  it('renders a preview and enables Import for valid markup; edits update it live', async () => {
    const wrapper = mountDialog();
    await wrapper.find('[data-testid="import-edit"]').trigger('click');
    await wrapper.find('[data-testid="import-code"]').setValue(VALID);
    await nextTick();

    expect(wrapper.find('[data-testid="import-preview"] svg').exists()).toBe(true);
    expect(wrapper.find('[data-testid="import-error"]').exists()).toBe(false);
    const importBtn = wrapper.find('[data-testid="import-confirm"]');
    expect(importBtn.attributes('disabled')).toBeUndefined();
  });

  it('surfaces a validation error and disables Import for unparseable markup', async () => {
    const wrapper = mountDialog();
    await wrapper.find('[data-testid="import-edit"]').trigger('click');
    await wrapper.find('[data-testid="import-code"]').setValue('<not-an-svg>');
    await nextTick();

    expect(wrapper.find('[data-testid="import-error"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="import-preview"] svg').exists()).toBe(false);
    expect(wrapper.find('[data-testid="import-confirm"]').attributes('disabled')).toBeDefined();
  });

  it('imports the edited markup into the store and closes', async () => {
    const store = useDocumentStore();
    const wrapper = mountDialog();
    await wrapper.find('[data-testid="import-edit"]').trigger('click');
    await wrapper.find('[data-testid="import-code"]').setValue(VALID);
    await nextTick();
    await wrapper.find('[data-testid="import-confirm"]').trigger('click');

    expect(store.document.elements.map((element) => element.id)).toEqual(['dot']);
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('toggles the code editor open and closed', async () => {
    const wrapper = mountDialog();
    await wrapper.find('[data-testid="import-edit"]').trigger('click'); // opens editor
    await wrapper.find('[data-testid="import-code-toggle"]').trigger('click'); // collapse
    expect(wrapper.find('[data-testid="import-code"]').exists()).toBe(false);
    await wrapper.find('[data-testid="import-code-toggle"]').trigger('click'); // expand
    expect(wrapper.find('[data-testid="import-code"]').exists()).toBe(true);
  });
});
