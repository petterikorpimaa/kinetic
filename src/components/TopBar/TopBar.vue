<script setup lang="ts">
import { ref, computed } from 'vue';
import { Menu, Upload, Code2, Undo2, Redo2, HardDrive, Trash2, Check } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { usePersistenceStore } from '@/stores/persistence';
import { createEmptyDocument } from '@/types';
import Button from '@/atoms/Button/Button.vue';
import Popover from '@/atoms/Popover/Popover.vue';
import MenuItem from '@/atoms/MenuItem/MenuItem.vue';
import SectionLabel from '@/atoms/SectionLabel/SectionLabel.vue';
import styles from './TopBar.module.css';

const emit = defineEmits<{ import: []; export: [] }>();
const store = useDocumentStore();
const persistence = usePersistenceStore();
const menuOpen = ref(false);

const savedLabel = computed(() => {
  if (!persistence.available) return 'Not saved';
  return persistence.lastSavedAt === null ? '' : 'Saved';
});
const savedTitle = computed(() => {
  if (!persistence.available) return 'Autosave unavailable (private mode or storage full)';
  if (persistence.lastSavedAt === null) return '';
  return `Last saved ${new Date(persistence.lastSavedAt).toLocaleTimeString()}`;
});

function choose(action: 'import' | 'export'): void {
  menuOpen.value = false;
  if (action === 'import') emit('import');
  else emit('export');
}

function toggleMode(): void {
  persistence.setMode(persistence.mode === 'local' ? 'session' : 'local');
}

function clearSaved(): void {
  menuOpen.value = false;
  if (!window.confirm('Clear saved work and reset the editor? This cannot be undone.')) return;
  persistence.clear();
  store.loadDocument(createEmptyDocument(crypto.randomUUID()));
}
</script>

<template>
  <header :class="styles.topbar" data-testid="topbar">
    <div :class="styles.brand">
      <div :class="styles.logo"><span :class="styles.diamond" /></div>
      <div :class="styles.text">
        <span :class="styles.name">Kinetic</span>
        <SectionLabel :class="styles.sub">SVG Motion Studio</SectionLabel>
      </div>
    </div>

    <div :class="styles.spacer" />

    <div
      v-if="savedLabel"
      :class="[styles.saved, !persistence.available ? styles.off : '']"
      :title="savedTitle"
      data-testid="saved-indicator"
    >
      <span :class="styles.dot" />
      <span>{{ savedLabel }}</span>
    </div>

    <div :class="styles.history">
      <Button
        variant="icon"
        :class="styles.historyBtn"
        title="Undo (⌘Z)"
        data-testid="undo"
        :disabled="!store.canUndo"
        @click="store.undo()"
      >
        <Undo2 :size="15" :stroke-width="1.6" />
      </Button>
      <Button
        variant="icon"
        :class="styles.historyBtn"
        title="Redo (⌘⇧Z)"
        data-testid="redo"
        :disabled="!store.canRedo"
        @click="store.redo()"
      >
        <Redo2 :size="15" :stroke-width="1.6" />
      </Button>
    </div>

    <div :class="styles.menu">
      <Button
        variant="ghost"
        :class="styles.menuBtn"
        :style="{ '--btn-bd': menuOpen ? 'var(--dim2)' : '' }"
        data-testid="menu-button"
        :aria-expanded="menuOpen"
        @click="menuOpen = !menuOpen"
      >
        <Menu :size="15" :stroke-width="1.5" />
        <span>Menu</span>
      </Button>
      <Popover :open="menuOpen" @update:open="menuOpen = $event">
        <div :class="styles.dropdown">
          <MenuItem data-testid="menu-import" @click="choose('import')">
            <Upload :size="15" :stroke-width="1.5" />
            Import SVG
          </MenuItem>
          <MenuItem data-testid="menu-export" @click="choose('export')">
            <Code2 :size="15" :stroke-width="1.5" />
            Export animation
          </MenuItem>

          <div :class="styles.sep" />

          <MenuItem data-testid="menu-storage" @click="toggleMode">
            <HardDrive :size="15" :stroke-width="1.5" />
            <span>Autosave: {{ persistence.mode === 'local' ? 'Local' : 'Session' }}</span>
            <Check
              v-if="persistence.mode === 'local'"
              :size="14"
              :stroke-width="2"
              :class="styles.hint"
              data-testid="menu-storage-local"
            />
            <span v-else :class="[styles.hint, styles.hintText]" data-testid="menu-storage-session"
              >tab only</span
            >
          </MenuItem>
          <MenuItem danger data-testid="menu-clear" @click="clearSaved">
            <Trash2 :size="15" :stroke-width="1.5" />
            Clear saved work
          </MenuItem>
        </div>
      </Popover>
    </div>
  </header>
</template>
