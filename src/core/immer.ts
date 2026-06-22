import { enablePatches } from 'immer';

// Patches power the undo/redo history (see ./history.ts). Enable the plugin
// once, here, and re-export the patch-aware helpers so every consumer shares
// this setup.
enablePatches();

export { produce, produceWithPatches, applyPatches } from 'immer';
export type { Patch, Draft } from 'immer';
