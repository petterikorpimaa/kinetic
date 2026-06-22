<script setup lang="ts">
import { ref, computed } from 'vue';
import { Menu, Upload, Code2, Undo2, Redo2, HardDrive, Trash2, Check } from '@lucide/vue';
import { useDocumentStore } from '@/stores/document';
import { usePersistenceStore } from '@/stores/persistence';
import { createEmptyDocument } from '@/types';

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
  <header class="topbar" data-testid="topbar">
    <div class="brand">
      <div class="brand__logo"><span class="brand__diamond" /></div>
      <div class="brand__text">
        <span class="brand__name">Kinetic</span>
        <span class="brand__sub">SVG Motion Studio</span>
      </div>
    </div>

    <div class="spacer" />

    <div
      v-if="savedLabel"
      class="saved"
      :class="{ 'saved--off': !persistence.available }"
      :title="savedTitle"
      data-testid="saved-indicator"
    >
      <span class="saved__dot" />
      <span>{{ savedLabel }}</span>
    </div>

    <div class="history">
      <button
        type="button"
        class="history__btn"
        title="Undo (⌘Z)"
        data-testid="undo"
        :disabled="!store.canUndo"
        @click="store.undo()"
      >
        <Undo2 :size="15" :stroke-width="1.6" />
      </button>
      <button
        type="button"
        class="history__btn"
        title="Redo (⌘⇧Z)"
        data-testid="redo"
        :disabled="!store.canRedo"
        @click="store.redo()"
      >
        <Redo2 :size="15" :stroke-width="1.6" />
      </button>
    </div>

    <div class="menu">
      <button
        type="button"
        class="menu__btn"
        :class="{ 'menu__btn--open': menuOpen }"
        data-testid="menu-button"
        @click="menuOpen = !menuOpen"
      >
        <Menu :size="15" :stroke-width="1.5" />
        <span>Menu</span>
      </button>
      <template v-if="menuOpen">
        <div class="menu__backdrop" @click="menuOpen = false" />
        <div class="menu__dropdown">
          <button
            type="button"
            class="menu__item"
            data-testid="menu-import"
            @click="choose('import')"
          >
            <Upload :size="15" :stroke-width="1.5" />
            Import SVG
          </button>
          <button
            type="button"
            class="menu__item"
            data-testid="menu-export"
            @click="choose('export')"
          >
            <Code2 :size="15" :stroke-width="1.5" />
            Export animation
          </button>

          <div class="menu__sep" />

          <button type="button" class="menu__item" data-testid="menu-storage" @click="toggleMode">
            <HardDrive :size="15" :stroke-width="1.5" />
            <span>Autosave: {{ persistence.mode === 'local' ? 'Local' : 'Session' }}</span>
            <Check
              v-if="persistence.mode === 'local'"
              :size="14"
              :stroke-width="2"
              class="menu__hint"
              data-testid="menu-storage-local"
            />
            <span v-else class="menu__hint menu__hint--text" data-testid="menu-storage-session"
              >tab only</span
            >
          </button>
          <button
            type="button"
            class="menu__item menu__item--danger"
            data-testid="menu-clear"
            @click="clearSaved"
          >
            <Trash2 :size="15" :stroke-width="1.5" />
            Clear saved work
          </button>
        </div>
      </template>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: var(--topbar-height);
  flex: none;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 14px;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(180deg, var(--topbar-grad-a), var(--topbar-grad-b));
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.brand__logo {
  width: 26px;
  height: 26px;
  flex: none;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--acc), var(--acc2));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px -2px var(--acc);
}

.brand__diamond {
  width: 9px;
  height: 9px;
  background: #0c0c11;
  border-radius: 2px;
  transform: rotate(45deg);
}

.brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.05;
  min-width: 0;
}

.brand__name {
  font-weight: 800;
  font-size: 15px;
  letter-spacing: -0.01em;
}

.brand__sub {
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--dim2);
  font-weight: 600;
  white-space: nowrap;
}

.spacer {
  flex: 1;
  min-width: 8px;
}

.saved {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
  font-size: 11px;
  font-weight: 600;
  color: var(--dim);
  user-select: none;
}

.saved__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--acc);
}

.saved--off {
  color: var(--danger);
}

.saved--off .saved__dot {
  background: var(--danger);
}

.history {
  display: flex;
  gap: 4px;
  flex: none;
}

.history__btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--elev);
  color: var(--dim);
  cursor: pointer;
}

.history__btn:hover:not(:disabled) {
  color: var(--txt);
  border-color: var(--dim2);
}

.history__btn:disabled {
  opacity: 0.4;
  cursor: default;
}

.menu {
  position: relative;
  flex: none;
}

.menu__btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 13px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--elev);
  color: var(--txt);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
}

.menu__btn:hover,
.menu__btn--open {
  border-color: var(--dim2);
}

.menu__backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
}

.menu__dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 41;
  width: 212px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 13px;
  padding: 6px;
  box-shadow: 0 22px 60px -16px #000;
}

.menu__item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 10px 11px;
  border-radius: 9px;
  border: none;
  background: none;
  color: var(--txt);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
}

.menu__item:hover {
  background: var(--elev);
}

.menu__sep {
  height: 1px;
  margin: 5px 4px;
  background: var(--line);
}

.menu__hint {
  margin-left: auto;
  color: var(--acc2);
}

.menu__hint--text {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--dim2);
}

.menu__item--danger:hover {
  color: var(--danger);
}
</style>
