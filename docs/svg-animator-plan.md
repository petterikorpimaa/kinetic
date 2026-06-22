# SVG Animator — Project Design & Build Plan

A focused, beautifully-crafted tool for importing existing SVGs, animating their elements on a timeline, and exporting the result. Built to showcase visual/motion design alongside development, UX, and DX skill.

> **Scope philosophy:** Ship a polished v1 of the _core loop_ (import → select → keyframe → scrub → export CSS), then extend. Don't try to beat SVGator or Lottie/After Effects — frame this as a focused, well-crafted take on the core experience.

---

## 1. Goals & Non-Goals

### Goals

- Import an existing SVG and make its elements individually selectable.
- Animate element **transform** (x, y, scale, rotate) and **opacity** via a keyframe timeline.
- Scrub and play back animations smoothly.
- Export to clean, usable **CSS `@keyframes`** and **GSAP code**.
- Demonstrate craft: a custom timeline UI, satisfying micro-interactions, tasteful motion.

### Non-Goals (v1)

- No path morphing, no color/stroke-dashoffset animation (deferred to v2).
- No Lottie/GIF/video export (deferred).
- No multi-user collaboration, no accounts, no backend persistence (local-only).
- No mobile-first layout — desktop editor experience is the target.

---

## 2. Tech Stack

| Layer                | Choice                                                        | Rationale                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework            | **Vue 3** + `<script setup>` + **TypeScript**                 | TS is essential for the timeline/keyframe data model.                                                                                                                                             |
| Build tool           | **Vite**                                                      | Instant HMR, Vue default, strong DX.                                                                                                                                                              |
| Interpolation        | **Own pure functions**                                        | `valueAt(track, t)` is the single source of truth for values. ~30 lines, trivially unit-testable, used by both editor preview and export sampling (see §3).                                       |
| Animation engine     | **GSAP**                                                      | `timeline()` maps 1:1 onto an editor's needs (sequencing, scrubbing via `progress()`, per-element targeting). Used as a _playback renderer_ and an _export target_ — **not** the source of truth. |
| SVG import           | Native **DOMParser**                                          | Parse SVG string, inline into DOM so each element is selectable/animatable.                                                                                                                       |
| Manipulation handles | **moveable** (Daybrush) + optional **interactjs**             | Professional drag/resize/rotate handles out of the box.                                                                                                                                           |
| State                | **Pinia** (document model) + `shallowRef` for transient state | Pinia for structured document; keep high-frequency state (scrubber drag) out of deep reactivity.                                                                                                  |
| Derived values       | Vue **`computed`**                                            | Natural fit for "interpolated value at current playhead time."                                                                                                                                    |
| Utilities            | **@vueuse/core**                                              | Pointer events, raf, keyboard shortcuts, etc.                                                                                                                                                     |
| Timeline UI          | **Custom-built**                                              | The signature showcase component.                                                                                                                                                                 |

> **Engine alternative considered — Theatre.js.** `@theatre/core` ships a serializable keyframe/sequence model that overlaps much of our data model. Rejected for v1 because the custom timeline _is_ the showcase, so we want minimal opinionated machinery beneath it — but keeping GSAP a thin renderer/export target (below) means swapping is cheap if that calculus changes.
>
> **GSAP licensing:** since the Webflow acquisition (GSAP 3.13+), the full toolset — including the formerly Club-only **MorphSVG** and **DrawSVG** — is free for commercial use. This de-risks the v2 morphing / line-drawing stretch goals at zero cost.

### Key architectural rules (learned the hard way)

**1. Split state into two tiers:**

- **Document state (Pinia, reactive):** elements, keyframes, selection, timeline duration.
- **Transient state (`shallowRef` / plain refs):** playhead position during scrub-drag, live drag deltas on canvas. These fire at pointer-move frequency and must NOT trigger deep reactive re-renders. Write committed values back to the document store on drag-end.

**2. One interpolation source of truth.** A pure `valueAt(track, t)` function computes every value. The editor preview, GSAP playback, and the export sampler all read from it — never from each other. Avoids the classic "editor looks different from the scrubbed frame looks different from the CSS export" divergence.

**3. Design undo/redo in Phase 0, ship the UI in Phase 6.** Retrofitting a history stack onto store mutations later is painful. Decide the mechanism now — command objects or snapshot/patch-based (Immer patches pair well with the immutability rule). Phase 6 then becomes wiring, not surgery.

---

## 3. Data Model

The data model makes or breaks this project. Define it first.

```ts
// Easing is constrained to what we can both PLAY and EXPORT.
// `mode` drives the CSS exporter: 'bezier' → a single cubic-bezier();
// 'baked' → sample per-frame (elastic/bounce/back can't be one bezier).
type EasingName =
  | 'linear'
  | 'power1.inOut'
  | 'power2.inOut'
  | 'power3.inOut'
  | 'power1.out'
  | 'power2.out'
  | 'power3.out'
  | 'back.out'
  | 'elastic.out'
  | 'bounce.out';

const EASING_EXPORT: Record<EasingName, 'bezier' | 'baked'> = {
  linear: 'bezier',
  'power1.inOut': 'bezier',
  'power2.inOut': 'bezier',
  'power3.inOut': 'bezier',
  'power1.out': 'bezier',
  'power2.out': 'bezier',
  'power3.out': 'bezier',
  'back.out': 'baked',
  'elastic.out': 'baked',
  'bounce.out': 'baked',
};

// A single animatable property keyframe
interface Keyframe {
  id: string;
  time: number; // SECONDS — model is seconds-only; convert to ms only at GSAP boundaries
  value: number; // interpolated numeric value
  easing: EasingName; // easing of the segment ENTERING this keyframe (from the previous one)
}

// A track animates ONE property of ONE element
type AnimatableProperty = 'x' | 'y' | 'scale' | 'rotation' | 'opacity'; // uniform scale for v1; per-axis → v2

interface Track {
  id: string;
  elementId: string;
  property: AnimatableProperty;
  keyframes: Keyframe[]; // sorted by time
}

// An imported SVG element exposed for editing
interface SceneElement {
  id: string; // stable id assigned on import
  domRef: string; // data-attr to find it in the inlined SVG
  label: string; // human-friendly name (tag + index, editable)
  transformOrigin: { x: number; y: number };
  baseTransform: string; // the element's ORIGINAL transform at import; animation layers on top of this
}

// The whole document
interface AnimationDocument {
  id: string;
  name: string;
  duration: number; // total timeline length, seconds
  fps: number; // for export sampling, default 60
  svgViewBox: { x: number; y: number; w: number; h: number };
  elements: SceneElement[];
  tracks: Track[];
  selectedElementId: string | null;
}
```

### Interpolation (single source of truth)

A pure function — `valueAt(track, t): number` — interpolates between the surrounding keyframes using the entering keyframe's easing. **This is the one source of truth** for every value in the app:

- **Editor preview / scrub:** read `valueAt()` directly via `computed`.
- **Playback:** GSAP plays for convenience, but its tweens are built to match `valueAt()` (or, for `baked` eases, fed sampled values) so playback never diverges from the scrub.
- **Export:** the CSS/GSAP serializers sample `valueAt()` — same numbers everywhere.

Keep `valueAt()` framework-free and unit-tested; it's the cheapest place to prevent the most confusing bugs.

---

## 4. Architecture & Components

```
App.vue
├── EditorLayout.vue            // 3-pane: canvas | timeline | inspector
│
├── CanvasStage.vue             // renders inlined SVG + interaction overlay
│   ├── SvgRenderer.vue         // injects parsed SVG, tags elements with ids
│   ├── SelectionOverlay.vue    // bounding boxes, hover states
│   └── TransformHandles.vue    // wraps `moveable` for drag/scale/rotate
│
├── Timeline.vue                // THE showcase component
│   ├── TimelineRuler.vue       // time ticks, labels
│   ├── Playhead.vue            // draggable scrubber (transient state)
│   ├── TrackRow.vue            // one row per track
│   │   └── KeyframeDiamond.vue // draggable keyframe markers
│   └── TimelineControls.vue    // play/pause/loop, duration, fps
│
├── Inspector.vue               // selected element's properties + easing pickers
│   ├── PropertyRow.vue
│   └── EasingPicker.vue
│
├── Toolbar.vue                 // import, export, undo/redo
│
└── ImportDialog.vue / ExportDialog.vue
```

### Stores (Pinia)

- `useDocumentStore` — the `AnimationDocument`, plus actions: `addKeyframe`, `moveKeyframe`, `deleteKeyframe`, `selectElement`, `setDuration`, etc.
- `usePlaybackStore` — `isPlaying`, `currentTime` (consider keeping `currentTime` as a `shallowRef` updated via rAF, not a deep reactive field).
- `useHistoryStore` — undo/redo (command stack or snapshot-based).

---

## 5. Core Flows

### Import

1. User selects/drops an `.svg` file (or pastes markup).
2. `DOMParser` → validate it's SVG → extract `viewBox`.
3. Walk the tree; assign each animatable element a stable `id` (data attribute) and a friendly `label`.
4. Inline the SVG into `SvgRenderer`. Populate `elements` in the store.

### Animate

1. Select an element on canvas → it appears in the Inspector and gets timeline tracks.
2. Move playhead to a time, change a property (drag handle, or edit in Inspector) → creates/updates a keyframe at that time.
3. Keyframe diamonds appear on the timeline; drag to retime, click to select, pick easing.

### Preview / Scrub

1. Build (or rebuild) a GSAP timeline from the tracks.
2. Play → `timeline.play()`; scrub → `timeline.progress(t / duration)`.
3. Playhead position syncs with `currentTime` (transient).

### Export

1. Serialize tracks by sampling `valueAt()` (§3) — never a second interpolation path.
2. **CSS (adaptive):** generate `@keyframes` blocks + the animation shorthand per element.
   - Segment easing is `bezier` (linear / `power*` / custom curves) → emit **2 stops + `animation-timing-function: cubic-bezier(...)`**.
   - Segment easing is `baked` (elastic / bounce / back overshoot — not representable as one cubic-bezier) → **sample per frame** and emit many stops with `linear` between them. Bake only these segments; a 3 s property at 60 fps is ~180 stops, so don't bake what you don't have to.
   - Emit `transform-box: fill-box;` + `transform-origin` so CSS transforms behave predictably on SVG elements (see §8).
3. **GSAP:** serialize the timeline to runnable `gsap.timeline()` code.
4. Show in a copyable code panel + download button.

---

## 6. Build Phases

### Phase 0 — Scaffold (DX foundation)

- Vite + Vue 3 + TS project, ESLint/Prettier, Pinia, GSAP installed.
- Set up the test runner (Vitest) + Playwright; CI runs both.
- Basic 3-pane `EditorLayout` shell with placeholder panes.
- Define the data model types from §3, including `EasingName` + its export-mode map.
- **Write `valueAt()` first, test-driven** — it's pure and underpins everything.
- **Decide two things now** (cheap now, painful later): (a) animate via **CSS transforms** with `transform-box: fill-box` + `transform-origin`; (b) the **undo/redo architecture** (command vs snapshot/patch), even though its UI lands in Phase 6.

### Phase 1 — Import & Render

- Import dialog, DOMParser pipeline, element id tagging.
- `SvgRenderer` inlines SVG; clicking an element selects it (`SelectionOverlay`).

### Phase 2 — Inspector & manual transforms

- `moveable` handles for drag/scale/rotate on the selected element.
- Inspector shows live property values; editing updates the element.
- (Still static — no keyframes yet.)

### Phase 3 — Timeline & keyframes (the heart)

- Build `Timeline` with ruler, draggable playhead, track rows.
- Setting a property at a playhead time writes a keyframe.
- Keyframe diamonds: drag to retime, select, delete.
- Wire GSAP timeline build + scrub + play/pause/loop.

### Phase 4 — Easing & polish

- `EasingPicker` (visual easing curves), per-keyframe easing.
- Micro-interactions, transitions, empty/loading states — _the motion-design flex._

### Phase 5 — Export

- CSS `@keyframes` generator + GSAP code generator.
- Copyable code panel + file download.

### Phase 6 — Undo/redo & nice-to-haves

- History store (wire up the architecture chosen in Phase 0).
- Keyboard shortcuts (space = play, del = delete keyframe, etc.).
- Element rename, duplicate, layer reordering.
- **Autosave** the document to IndexedDB/localStorage so a refresh doesn't nuke work — a few lines, high demo value. Pull earlier if convenient.

> **v1 done = Phases 0–5.** Phase 6 is polish that elevates the DX story.

### Testing strategy (cross-cutting)

- **Unit (TDD):** `valueAt()` interpolation, the CSS serializer, the GSAP serializer, and document-store actions — all pure/near-pure and where bugs hide. Golden-file tests for the serializers.
- **E2E (Playwright):** the happy path — import → select → keyframe → scrub → export.
- Target the repo's 80% coverage bar, weighted toward the model/serializer code rather than UI chrome.

---

## 7. Stretch Goals (v2+)

- Color & `stroke-dashoffset` animation (line-drawing effects).
- Path **morphing** (GSAP MorphSVG).
- **Lottie JSON** export.
- **GIF/video** export via `MediaRecorder` / `gif.js`.
- Onion-skinning, motion paths, grouping/parenting of elements.
- Local persistence (IndexedDB) and shareable project files.

---

## 8. Risks & Watch-outs

- **Easing fidelity (export):** complex GSAP eases (`elastic`, `bounce`, `back` overshoot) can't be a single CSS `cubic-bezier()`. Handle via the adaptive bezier-vs-baked export (§5); `EasingName` carries its export mode.
- **Transform origin & box:** SVG transform-origin is fiddly. Decision (Phase 0): CSS transforms + `transform-box: fill-box` + explicit `transform-origin`, applied identically in editor, GSAP, and export.
- **Base transforms:** imported elements may already carry a `transform`. Capture it as `baseTransform` and layer animation on top, or art jumps on first edit.
- **Transform composition order:** x/y/scale/rotation are separate tracks but compose into one matrix. Fix a canonical order (translate → rotate → scale) and emit it consistently in CSS so it matches GSAP.
- **Re-render storms** during scrub/drag — enforce the transient-state rule (§2).
- **Coordinate systems** — screen pixels vs SVG viewBox units; the overlay must map between them on zoom/pan.
- **GSAP timeline rebuilds** — rebuilding on every edit can be costly; debounce or patch incrementally.
- **Scope creep** — resist adding v2 features before the core loop is genuinely polished.

---

## 9. First Tasks for Claude Code

1. Scaffold the Vite + Vue 3 + TS project with Pinia and GSAP; add Vitest + Playwright; set up the 3-pane layout shell.
2. Implement the data model types from §3 in `src/types/` (including `EasingName` + export-mode map).
3. Write `valueAt(track, t)` test-first in `src/core/` — the interpolation source of truth.
4. Build the SVG import pipeline (DOMParser → element tagging → capture `baseTransform` → inline render → click-to-select).
5. Stand up the Pinia document store with the core keyframe actions, designed for the chosen undo/redo model.
6. Then proceed phase by phase per §6.

Start with Phase 0 and 1; get import + select working end to end before touching the timeline.
