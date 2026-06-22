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
  <div class="add-menu__backdrop" @click="emit('close')" />
  <div class="add-menu" data-testid="add-property-menu">
    <p v-if="allAdded" class="add-menu__empty">All properties added.</p>
    <div v-for="entry in groups" v-else :key="entry.group" class="add-menu__group">
      <div class="add-menu__title">{{ entry.group }}</div>
      <button
        v-for="item in entry.items"
        :key="item.key"
        type="button"
        class="add-menu__item"
        :data-testid="`add-prop-${item.key}`"
        @click="add(item)"
      >
        {{ item.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.add-menu__backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
}

.add-menu {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  z-index: 21;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 11px;
  padding: 6px;
  box-shadow: 0 18px 50px -14px #000;
  max-height: 320px;
  overflow-y: auto;
}

.add-menu__empty {
  margin: 0;
  padding: 14px;
  text-align: center;
  color: var(--dim2);
  font-size: 11.5px;
}

.add-menu__group + .add-menu__group {
  margin-top: 4px;
}

.add-menu__title {
  padding: 6px 9px 3px;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--dim2);
  font-weight: 700;
}

.add-menu__item {
  display: block;
  width: 100%;
  padding: 8px 9px;
  border-radius: 7px;
  border: none;
  background: none;
  color: var(--txt);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.add-menu__item:hover {
  background: var(--panel2);
}
</style>
