<script setup lang="ts">
import styles from './MenuItem.module.css';

// The full-width, left-aligned icon+label row shared by every dropdown menu.
// Padding, radius, font size, gap and hover colour come from --menuitem-*
// custom properties; the icon and label go in the default slot. Native attrs
// (data-*, @click) fall through to the underlying <button>.
//
// `disabled` is presentational: it dims the row and sets aria-disabled, but
// keeps the element hoverable (no native `disabled`) so a `title` tooltip still
// shows. Consumers guard the action when an item is disabled.
withDefaults(defineProps<{ danger?: boolean; disabled?: boolean }>(), {
  danger: false,
  disabled: false,
});
</script>

<template>
  <button
    type="button"
    :class="[styles.item, danger ? styles.danger : '', disabled ? styles.disabled : '']"
    :aria-disabled="disabled || undefined"
  >
    <slot />
  </button>
</template>
