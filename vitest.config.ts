import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config';

// vite.config exports a function (base is command-conditional for GitHub Pages),
// so resolve it to a plain config for merging. The command/mode don't matter for
// tests; we only need the shared `@` alias.
const resolvedViteConfig =
  typeof viteConfig === 'function' ? viteConfig({ command: 'serve', mode: 'test' }) : viteConfig;

// Unit/component tests. E2E lives in ./e2e and is run by Playwright, not Vitest.
export default mergeConfig(
  resolvedViteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      globals: false,
      root: fileURLToPath(new URL('./', import.meta.url)),
      exclude: [...configDefaults.exclude, 'e2e/**'],
      coverage: {
        provider: 'v8',
        // Coverage is weighted toward the pure model/serializer code, where
        // bugs hide — not UI chrome. Broaden as stores/serializers land.
        include: ['src/core/**/*.ts'],
        exclude: ['**/*.spec.ts'],
        reportsDirectory: './coverage',
        thresholds: { lines: 80, functions: 80, statements: 80, branches: 80 },
      },
    },
  }),
);
