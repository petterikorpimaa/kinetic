# SVG Animator

Import an SVG, animate its elements on a keyframe timeline, and export to clean
CSS `@keyframes`, runnable GSAP code, or the tagged SVG markup. A focused,
craft-forward take on the core import → select → keyframe → scrub → export loop,
with undo/redo and autosave.

See the design & build plan in [`docs/svg-animator-plan.md`](docs/svg-animator-plan.md)
and the task breakdown in [`TASKS.md`](TASKS.md).

## Prerequisites

- **Node** `^20.19.0 || >=22.12.0`
- **pnpm** via **Corepack** (bundled with Node). Enable it once:

  ```bash
  corepack enable
  ```

  The pinned pnpm version comes from the `packageManager` field in `package.json`.

## Setup

Fresh clone → running app in one command:

```bash
pnpm bootstrap
```

This installs dependencies, installs the Playwright browsers, and sets up the
git hooks. Then start the dev server:

```bash
pnpm dev
```

> `pnpm bootstrap` is the whole setup — no hand-assembling the environment.

## Commands

| Command              | What it does                                    |
| -------------------- | ----------------------------------------------- |
| `pnpm dev`           | Vite dev server with HMR                        |
| `pnpm build`         | Type-check (`vue-tsc`) and build for production |
| `pnpm preview`       | Preview the production build                    |
| `pnpm test`          | Unit tests (Vitest) in watch mode               |
| `pnpm test:run`      | Unit tests once (CI mode)                       |
| `pnpm test:coverage` | Unit tests with coverage                        |
| `pnpm test:e2e`      | End-to-end tests (Playwright)                   |
| `pnpm lint`          | ESLint (auto-fix)                               |
| `pnpm typecheck`     | Type-check without emitting                     |
| `pnpm format`        | Format with Prettier                            |

`pnpm lint` and `pnpm typecheck` must pass before any commit. Format-on-save and
lint-on-save are configured for VS Code (`.vscode/settings.json`); a pre-commit
hook runs lint-staged.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:
type-check → lint → unit tests with the **80% coverage gate** (`pnpm test:coverage`,
weighted to `src/core/`) → build → Playwright E2E. The Playwright HTML report is
uploaded as a build artifact.

## Testing

- **Unit (Vitest):** the pure core — interpolation (`valueAt`), the cubic-bezier
  easing solver, presets, undo/redo history, the CSS/GSAP serializers
  (golden-file output), and document persistence (round-trip + migration) —
  plus store actions. Coverage is weighted toward `src/core/` (80% threshold).

  ```bash
  pnpm test:run
  pnpm test:coverage
  ```

- **E2E (Playwright):** the happy path — import → select → keyframe → scrub →
  play → export (copy the generated CSS/GSAP) — plus undo/redo and autosave
  surviving a reload. Requires the browsers from `pnpm bootstrap` (or
  `pnpm exec playwright install`).

  ```bash
  pnpm test:e2e
  ```

## Project structure

```
src/
├── core/         # framework-free logic — the test target
│   ├── easing.ts        # cubic-bezier solver (Newton + bisection, memoised)
│   ├── valueAt.ts       # interpolation: the single source of truth
│   ├── timeline.ts      # time↔fraction mapping, grid snapping, ruler ticks
│   ├── playback.ts      # pure playhead advance (loop wrap / stop-at-end)
│   ├── easingCurve.ts   # bezier-editor geometry (clamp, viewBox map, path)
│   ├── filters.ts       # CSS filter emitters + drop-shadow + compose
│   ├── presets.ts       # named easing presets
│   ├── cssExport.ts     # CSS @keyframes serializer (adaptive: clean / baked)
│   ├── gsapExport.ts    # gsap.timeline() serializer (per-property tweens)
│   ├── exportSampling.ts# union times, channel alignment, frame baking
│   ├── persistence.ts   # autosave (de)serialize + schema version + validation
│   ├── history.ts       # undo/redo via Immer patches
│   └── immer.ts         # shared Immer setup
├── composables/  # Vue glue: rAF playback loop, keyboard shortcuts, autosave
├── types/        # data model (Keyframe, Track, SceneElement, AnimationDocument)
├── stores/       # Pinia document + transient playback + persistence stores
├── components/   # Vue UI (EditorLayout + panes)
└── assets/       # design tokens + base styles (ported from the Kinetic demo)
```

### Architecture rules

1. **One interpolation source of truth** — `valueAt(track, t)` in `src/core/`.
   Editor preview, playback, and export all read from it.
2. **Two-tier state** — the document model lives in Pinia (a `shallowRef`,
   replaced wholesale and immutable); pointer-frequency values stay out of deep
   reactivity.
3. **Undo/redo is designed in** — store mutations produce Immer patches recorded
   to a history stack; the UI (TopBar buttons + ⌘Z) and localStorage autosave
   build on the same serializable patches/document.
4. **`src/core/` is framework-free** — no Vue/GSAP/Pinia imports; it is the unit
   test target.
