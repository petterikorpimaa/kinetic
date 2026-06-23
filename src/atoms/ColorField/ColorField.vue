<script setup lang="ts">
import { computed } from 'vue';
import { normalizeHex } from '@/core/color';
import styles from './ColorField.module.css';

// A swatch that opens the native colour picker and emits a normalised hex
// through v-model. Two presentations: a plain colour chip (the label's own
// background is the colour) or, with showHex, a chip + hex readout meant to sit
// inside a caller-styled container. Exact dimensions come from --swatch-*
// custom properties; the caller decides whether to pair it with a transparent
// toggle. The picker is hidden and activated by clicking the label.
const props = withDefaults(
  defineProps<{
    modelValue: string;
    /** Render the colour chip alongside an uppercase hex readout. */
    showHex?: boolean;
    disabled?: boolean;
  }>(),
  {
    showHex: false,
    disabled: false,
  },
);

const emit = defineEmits<{ 'update:modelValue': [hex: string] }>();

const chipStyle = computed(() => (props.showHex ? undefined : { background: props.modelValue }));

function onPick(event: Event): void {
  const raw = (event.target as HTMLInputElement).value;
  emit('update:modelValue', normalizeHex(raw) ?? raw);
}
</script>

<template>
  <label
    :class="[showHex ? styles.withHex : styles.chip, disabled ? styles.disabled : '']"
    :style="chipStyle"
    :data-color="modelValue"
  >
    <span v-if="showHex" :class="styles.swatch" :style="{ background: modelValue }" />
    <span v-if="showHex" :class="styles.hex">{{ modelValue }}</span>
    <input
      type="color"
      :value="modelValue"
      :class="styles.picker"
      :disabled="disabled"
      @input="onPick"
    />
  </label>
</template>
