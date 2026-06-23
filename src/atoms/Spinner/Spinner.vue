<script setup lang="ts">
import { Loader } from '@lucide/vue';
import styles from './Spinner.module.css';

// A spinning loading indicator: the lucide Loader with the rotation keyframes
// owned by this atom's module. `size` sets the icon size; pass a `label` for an
// accessible name. Colour comes from --spinner-fg.
withDefaults(defineProps<{ size?: number; label?: string }>(), { size: 22, label: '' });
</script>

<template>
  <Loader
    :class="styles.spin"
    :size="size"
    :stroke-width="1.6"
    role="status"
    :aria-label="label || undefined"
  />
</template>
