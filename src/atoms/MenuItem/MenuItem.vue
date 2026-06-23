<script setup lang="ts">
import styles from './MenuItem.module.css';

// The full-width, left-aligned icon+label row shared by every dropdown menu.
// Padding, radius, font size, gap and hover colour come from --menuitem-*
// custom properties; the icon and label go in the default slot. Native attrs
// (data-*, @click) fall through to the underlying <button>.
withDefaults(defineProps<{ danger?: boolean }>(), { danger: false });
</script>

<template>
  <button type="button" :class="[styles.item, danger ? styles.danger : '']">
    <slot />
  </button>
</template>
