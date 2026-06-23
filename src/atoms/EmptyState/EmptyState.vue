<script setup lang="ts">
import styles from './EmptyState.module.css';

// The "nothing here yet" message shared by empty panels and hints: centred text
// with an optional icon slot and an optional dashed border (`bordered`). Size,
// colour and padding come from --empty-* custom properties; the call site owns
// its own layout (margins, height, flex fill) on the same element.
withDefaults(defineProps<{ bordered?: boolean }>(), { bordered: false });
</script>

<template>
  <div :class="[styles.empty, bordered ? styles.bordered : '']">
    <slot name="icon" />
    <slot />
  </div>
</template>
