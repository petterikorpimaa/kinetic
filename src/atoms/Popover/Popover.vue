<script setup lang="ts">
import { watch, onBeforeUnmount } from 'vue';
import styles from './Popover.module.css';

// The floating-menu behaviour shared by every dropdown: while open it renders a
// full-screen backdrop (click-away to close) beneath the panel slot and listens
// for Escape. It owns no positioning — the consumer keeps its own anchored panel
// element as the slot, so each menu's exact placement is unchanged. v-model:open.
const props = withDefaults(defineProps<{ open?: boolean; backdropZ?: number }>(), {
  open: false,
  backdropZ: 40,
});

const emit = defineEmits<{ 'update:open': [value: boolean] }>();

defineOptions({ inheritAttrs: false });

function close(): void {
  emit('update:open', false);
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close();
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) document.addEventListener('keydown', onKeydown);
    else document.removeEventListener('keydown', onKeydown);
  },
  { immediate: true },
);

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <template v-if="open">
    <div :class="styles.backdrop" :style="{ zIndex: backdropZ }" @click="close" />
    <slot />
  </template>
</template>
