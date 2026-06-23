import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Production is served from a GitHub Pages project site
  // (https://petterikorpimaa.github.io/kinetic/); dev/E2E stay at the root.
  base: command === 'build' ? '/kinetic/' : '/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}));
