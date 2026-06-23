<script setup lang="ts">
import { computed } from 'vue';
import styles from './Button.module.css';

// The one button. `variant` + modifiers pick the look; size and the --btn-*
// custom properties (set by the call site) pick the exact dimensions. Content —
// icon and/or label — comes through the default slot. Native attributes
// (title, data-*, aria-*, @click, …) fall through to the underlying <button>.
type ButtonVariant = 'solid' | 'ghost' | 'icon' | 'dashed';
type ButtonSize = 'sm' | 'md';

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Toggle state. Present (true/false) marks a toggle and reflects aria-pressed. */
    active?: boolean;
    /** Primary emphasis without toggle semantics (Copy, Render). */
    accent?: boolean;
    /** Full-width pill. */
    block?: boolean;
    /** Borderless icon (eye, remove). */
    plain?: boolean;
    /** Destructive hover colour. */
    danger?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    variant: 'ghost',
    size: 'md',
    active: undefined,
    accent: false,
    block: false,
    plain: false,
    danger: false,
    disabled: false,
    type: 'button',
  },
);

const isSquare = computed(() => props.variant === 'icon' || props.variant === 'solid');
const accented = computed(() => props.active === true || props.accent);

const classes = computed(() => [
  styles.btn,
  styles[props.variant],
  styles[props.size],
  isSquare.value ? styles.square : styles.pill,
  props.block ? styles.block : '',
  props.plain ? styles.plain : '',
  props.danger ? styles.danger : '',
  accented.value ? styles.accent : '',
]);
</script>

<template>
  <button
    :type="type"
    :class="classes"
    :data-variant="variant"
    :disabled="disabled"
    :aria-pressed="active"
  >
    <slot />
  </button>
</template>
