# Kinetic: SVG Motion Studio

Animate SVGs on a keyframe timeline in the browser, then export production-ready
motion: clean CSS `@keyframes`, runnable GSAP code, a tagged SVG, or a rendered
GIF / WebM. No accounts, no backend; everything runs client-side.

**▶ Live demo: https://petterikorpimaa.github.io/kinetic/**

> The demo boots with a sample animation playing. Pick a layer, scrub the
> timeline, tweak a keyframe, then open **Export** to copy the generated code.

## What it is

Kinetic is a focused motion editor for the loop that actually matters:
**import → select → keyframe → scrub → export**. Drop in an SVG and every shape
becomes an animatable layer; nested groups parse into a collapsible tree. Animate
transform, opacity, colour, stroke draw-on and CSS filters on a keyframe timeline
with a cubic-bezier easing editor, then export the result however you need it.

It is also a study in keeping a real-time editor honest: a single interpolation
function feeds the live preview, playback, and every exporter, so what you see is
exactly what you ship.

## Highlights

- **Import any SVG.** Nested `<g>` groups parse into a selectable, collapsible
  **layer tree**; `defs` / clip-paths are preserved. Drag layers to reorder or
  re-nest them.
- **Animate** position, scale (uniform and per-axis), rotation, skew, opacity,
  fill, stroke colour/width, stroke **draw-on**, and CSS filters (blur,
  brightness, contrast, drop-shadow, and more). Each shape only offers the
  properties it can actually use.
- **Keyframe timeline.** Scrub, play, multi-select and drag keyframes to retime
  them, with a draggable **cubic-bezier easing editor** and named presets.
- **Undo / redo and autosave.** Every edit is undoable (⌘Z), and your work is
  restored automatically on reload.
- **Export five ways:** CSS `@keyframes`, a GSAP timeline, the tagged SVG markup,
  an animated **GIF**, or a **WebM** video (with an optional fit-to-content crop
  so the output frames the motion tightly).

## How it works

The interesting engineering lives in a small, framework-free core:

- **One interpolation source of truth.** A pure `valueAt(track, t)` in
  `src/core/` computes every animated value. The editor preview, GSAP playback,
  and all exporters sample the _same_ function, so the preview, the GIF, and the
  exported CSS can never drift apart.
- **Two-tier reactive state.** The document (elements, keyframes, selection)
  lives in a Pinia `shallowRef` that is replaced wholesale and immutably on each
  edit. Pointer-frequency values such as the scrub playhead and live drag deltas
  stay in plain refs and commit back to the store only on release, avoiding
  deep-reactivity re-render storms.
- **Undo/redo designed in, not bolted on.** Store mutations produce
  [Immer](https://immerjs.github.io/immer/) patches recorded to a history stack;
  those same JSON-serializable patches and document power the localStorage
  autosave with zero reshaping.
- **Adaptive export.** CSS export emits a clean per-segment `cubic-bezier()` when
  a property's tracks align, and falls back to per-frame baking when they do not.
  The raster pipeline renders one static SVG per frame from the same engine, then
  rasterizes to a canvas for GIF (streaming palette via `gifenc`) or WebM (native
  `MediaRecorder`).
- **`src/core/` imports nothing from Vue/GSAP/Pinia.** It is pure TypeScript and
  the primary unit-test target.

## Tech stack

- **Vue 3** (`<script setup>`) + **TypeScript** (strict)
- **Vite** build / dev server
- **Pinia** for document state
- **GSAP** as a playback renderer and export target (never the source of truth)
- **Immer** for patch-based history, **gifenc** for GIF encoding
- **Vitest** (unit) + **Playwright** (E2E)

## Getting started

**Prerequisites**

- **Node** `^20.19.0 || >=22.12.0`
- **pnpm** via **Corepack** (bundled with Node). Enable it once:

  ```bash
  corepack enable
  ```

  The pinned pnpm version comes from the `packageManager` field in `package.json`.

**Setup.** Fresh clone to running app in one command:

```bash
pnpm bootstrap   # installs deps + Playwright browsers + git hooks
pnpm dev         # Vite dev server with HMR at http://localhost:5173
```

`pnpm bootstrap` is the whole setup. There is no hand-assembling the environment.

### Commands

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

## Testing

- **Unit (Vitest)** covers the pure core: interpolation (`valueAt`), the
  cubic-bezier easing solver, the CSS/GSAP serializers (golden-file output),
  document persistence (round-trip + migration), the layer-tree / reorder logic,
  and store actions. Coverage is weighted toward `src/core/` (80% threshold).
- **E2E (Playwright)** covers the happy path: import → select → keyframe → scrub
  → play → export, plus nested-group import, drag-to-nest, undo/redo and autosave
  surviving a reload. The raster (GIF/WebM) pipeline is exercised here because it
  needs a real browser.

```bash
pnpm test:run        # unit, once
pnpm test:e2e        # end-to-end
```

## Deployment (GitHub Pages)

The app is a static client-side build, deployed to GitHub Pages by
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on every push to
`main`. The build sets Vite's `base` to `/kinetic/` to match the project-site URL.

To deploy a fork to your own Pages:

1. In the repo, open **Settings → Pages → Build and deployment → Source** and
   select **GitHub Actions**.
2. Update `base` in [`vite.config.ts`](vite.config.ts) to `/<your-repo-name>/`.
3. Push to `main`; the workflow builds and publishes automatically.

## Project structure

```
src/
├── core/         # framework-free logic, the test target
│   ├── valueAt.ts         # interpolation: the single source of truth
│   ├── easing.ts          # cubic-bezier solver (Newton + bisection, memoised)
│   ├── timeline.ts        # time/fraction mapping, grid snapping, ruler ticks
│   ├── playback.ts        # pure playhead advance (loop wrap / stop-at-end)
│   ├── shapeProperties.ts # which animatable properties each shape type supports
│   ├── layerTree.ts       # derive the collapsible layer tree from parentId links
│   ├── reorderLayers.ts   # drag-reorder / re-nest (moves the SVG node + model)
│   ├── filters.ts         # CSS filter emitters + drop-shadow + compose
│   ├── cssExport.ts       # CSS @keyframes serializer (adaptive: clean / baked)
│   ├── gsapExport.ts      # gsap.timeline() serializer (per-property tweens)
│   ├── elementVisual.ts   # one element's baked visual at time t (preview + raster)
│   ├── frameRender.ts     # static SVG per frame, sampled from the same engine
│   ├── rasterCrop.ts      # fit-to-content crop geometry for raster export
│   ├── persistence.ts     # autosave (de)serialize + schema version + validation
│   └── history.ts         # undo/redo via Immer patches
├── render/       # browser-only raster export: rasterize then GIF (gifenc) / WebM
├── composables/  # Vue glue: rAF playback loop, keyboard shortcuts, autosave
├── types/        # data model (Keyframe, Track, SceneElement, AnimationDocument)
├── stores/       # Pinia document + transient playback + persistence stores
├── atoms/        # reusable UI primitives (Button, Field, Modal, Popover, ...)
├── components/   # Vue UI: one folder per component (.vue + .module.css + .spec.ts)
└── assets/       # design tokens + base styles
```

## License

MIT. See [`LICENSE`](LICENSE).
