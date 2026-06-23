<script setup lang="ts">
import { computed } from 'vue';
import {
  PROPERTY_GROUPS,
  propertiesInGroup,
  DROP_SHADOW_MEMBERS,
  DROP_SHADOW_LABEL,
  type PropertyGroup,
} from '@/core/properties';
import type { AnimatableProperty } from '@/types/track';
import { useDocumentStore } from '@/stores/document';
import styles from './AddPropertyMenu.module.css';

// Grouped add-property menu (M2, Epic 6): Transform / Appearance / Filters,
// showing only inactive properties. Drop-shadow's three tracks (X/Y/colour)
// collapse into a single "Drop Shadow" entry that adds them together (SVG-59).
const props = defineProps<{ elementId: string; activeKeys: readonly AnimatableProperty[] }>();
const emit = defineEmits<{ close: [] }>();

const store = useDocumentStore();

interface MenuEntry {
  readonly key: string;
  readonly label: string;
  readonly members?: readonly AnimatableProperty[];
}

const SHADOW_MEMBERS: readonly string[] = DROP_SHADOW_MEMBERS;

function entriesForGroup(group: PropertyGroup): MenuEntry[] {
  const entries: MenuEntry[] = [];
  for (const def of propertiesInGroup(group)) {
    if (SHADOW_MEMBERS.includes(def.key)) continue; // surfaced via the composite below
    if (!props.activeKeys.includes(def.key)) entries.push({ key: def.key, label: def.label });
  }
  if (group === 'Filters' && !DROP_SHADOW_MEMBERS.every((m) => props.activeKeys.includes(m))) {
    entries.push({ key: 'dropShadow', label: DROP_SHADOW_LABEL, members: DROP_SHADOW_MEMBERS });
  }
  return entries;
}

const groups = computed(() =>
  PROPERTY_GROUPS.map((group) => ({ group, items: entriesForGroup(group) })).filter(
    (entry) => entry.items.length > 0,
  ),
);

const allAdded = computed(() => groups.value.length === 0);

function add(entry: MenuEntry): void {
  const members = entry.members ?? [entry.key as AnimatableProperty];
  for (const property of members) {
    if (!props.activeKeys.includes(property)) store.addProperty(props.elementId, property);
  }
  emit('close');
}
</script>

<template>
  <div :class="styles.backdrop" @click="emit('close')" />
  <div :class="styles.menu" data-testid="add-property-menu">
    <p v-if="allAdded" :class="styles.empty">All properties added.</p>
    <div v-for="entry in groups" v-else :key="entry.group" :class="styles.group">
      <div :class="styles.title">{{ entry.group }}</div>
      <button
        v-for="item in entry.items"
        :key="item.key"
        type="button"
        :class="styles.item"
        :data-testid="`add-prop-${item.key}`"
        @click="add(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>
