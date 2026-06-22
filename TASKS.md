# SVG Animator — Task Breakdown (Kinetic demo)

Derived from the design handoff `svg-animation-editor-tool-demo/project/Kinetic - SVG Motion.dc.html`
and the build plan in [docs/svg-animator-plan.md](docs/svg-animator-plan.md).

Structured for migration into Linear: each `##` **Epic** → a Linear Project (or parent issue);
each `- [ ]` line → an issue; indented lines → sub-issues.

**Legend** — `[label]` area · `(size)` XS/S/M/L/XL · `Pn` priority (P0 = core loop, P3 = deferred) · `Mn` target milestone.

**Milestones** (align with plan §6): `M0` Scaffold · `M1` Import & Render · `M2` Inspector & transforms · `M3` Timeline & keyframes · `M4` Easing & polish · `M5` Export · `M6` Undo/redo & extras.

---

## Scope decisions (resolved)

The demo extends the plan's v1 scope. Decisions made — the board reflects these:

- **Uniform `scale`** for v1 (not `scaleX`/`scaleY`). Plan data model updated to match. Per-axis scale → v2.
- **Fill + Stroke Draw stay in v1** — they carry the demo's signature look (orb color shift, ring draw-on). Sequenced _after_ the transform/opacity core loop (M3–M4), not deferred.
- **All nine filters ship in v1**, but they're one infra task + 8 trivial scalar entries (blur, brightness, contrast, saturate, grayscale, sepia, invert, hue) + one real drop-shadow task. Scheduled at **M4**, after the core loop is proven.
- **Correct CSS export is P0**, not an enhancement. Demo-parity export flattens easing to linear (stops only at keyframe times); for a tool whose pitch is "clean, usable CSS," export must match the editor. Adaptive **bezier-vs-baked** export (plan §5) is _the_ export. Demo-parity codegen is scaffolding toward it.
- **GSAP export** (plan, not in demo) stays in v1 as P2.
- **Undo/redo + autosave** (plan, not in demo) → M6. Undo/redo locked in Phase 0 as **Immer patches** (SVG-93); autosave expanded into serialization + restore + UX issues (SVG-95, SVG-105–107). See [docs/decisions.md](docs/decisions.md) DEC-3/DEC-4.
- **Easing is a cubic-bezier tuple** (the demo's draggable curve), not the plan's named `EasingName` union. Presets just write a `[x1,y1,x2,y2]`. No baked elastic/bounce in v1 — overshoot via control points. See [docs/decisions.md](docs/decisions.md) DEC-1/DEC-2.

**Sequencing:** M1–M3 core loop (import → select → transform/opacity → timeline/scrub → basic CSS export) · M3–M4 fill + draw · M4 filters + easing editor + polish · M5 correct export (+ GSAP) · M6 undo/redo + autosave.

---

## Epic 1 — Project scaffold & DX `[scaffold]` · `M0`

- [ ] **Scaffold Vite + Vue 3 (`<script setup>`) + TS (strict)** (S) `P0` — app boots, 3-pane shell renders.
- [ ] **Install core deps** (XS) `P0` — Pinia, GSAP, moveable, @vueuse/core.
- [ ] **Tooling: ESLint + Prettier, format/lint on save** (S) `P0` — `pnpm lint` / `pnpm typecheck` green.
- [ ] **Test runners: Vitest + Playwright** (S) `P0` — sample unit + e2e pass in CI.
- [ ] **`pnpm bootstrap` one-command setup** (S) `P1` — deps + Playwright browsers + git hooks.
- [ ] **README as living doc** (XS) `P1` — prerequisites, setup, test, common commands.
- [ ] **Define design tokens** (XS) `P1` — port the demo's CSS vars (`--bg`, `--panel`, `--acc` `#14b8a6`, etc.), Hanken Grotesk + JetBrains Mono.
- [ ] **EditorLayout shell** (S) `P0` — topbar / layers · canvas · inspector / timeline regions, collapsible side panels.

## Epic 2 — Core engine (`src/core`, framework-free, TDD) `[core]` · `M0`–`M3`

- [ ] **Data model types** (S) `P0` `M0` — `Keyframe`, `Track`, `SceneElement` (+ `baseTransform`), `AnimationDocument`, `EasingName` + export-mode map (plan §3).
- [ ] **`valueAt(track, t)` numeric interpolation** (M) `P0` `M0` — single source of truth; clamps before first / after last key; eased lerp between neighbours. _Test-first._
- [ ] **Cubic-bezier easing solver** (S) `P0` `M0` — Newton + bisection, memoised by `[x1,y1,x2,y2]` (demo `makeBezier`/`ease`).
- [ ] **Color interpolation** (S) `P0` `M2` — hex parse (#rgb/#rrggbb) + channel mix at eased `t`.
- [ ] **Transform composition** (S) `P0` `M2` — canonical `translate → rotate(about center) → scale`; consistent in editor + export.
- [ ] **Filter value model** (M) `P1` `M4` — per-filter css emitters (blur/brightness/contrast/saturate/grayscale/sepia/invert/hue) + drop-shadow with `{x,y,color}` params.
- [x] **Sampling utilities** (S) `P1` `M5` — collect keyframe times, value-at-time for export.

## Epic 3 — SVG import & processing `[import]` · `M1`

- [ ] **`processSVG` pipeline** (M) `P0` — DOMParser → `<svg>`, tag whitelist (circle/rect/ellipse/line/polyline/polygon/path/g/text/image), stable `data-anim-id`, friendly label, viewBox extraction.
- [ ] **Element metadata capture** (S) `P0` — bbox center (`getBBox`) and path length (`getTotalLength`) for transform origin + stroke draw.
- [ ] **Import overlay** (M) `P0` — modal: drag-drop zone, browse `.svg`, copy explaining shapes→layers.
- [ ] **File read → document** (S) `P0` — `FileReader`, reset tracks/selection/time, select first element.
- [ ] **Load sample animation** (S) `P1` — built-in sample SVG + preset tracks (the demo loader scene).
- [ ] **Import validation & errors** (S) `P1` — reject non-SVG, surface a friendly message (plan: validate at boundaries).

## Epic 4 — Canvas stage & rendering `[canvas]` · `M1`–`M2`

- [ ] **Inline SVG injection** (S) `P0` `M1` — inject markup, strip width/height, `preserveAspectRatio`, fit to stage.
- [ ] **`apply(t)` DOM sync** (M) `P0` `M2` — write transform/opacity/fill/draw/filter per element at time `t`; respects hidden + selection outline.
- [ ] **Click-to-select shape** (S) `P0` `M1` — pointerdown on shape selects layer; selection outline.
- [ ] **Click empty canvas to deselect** (XS) `P1` `M1`.
- [ ] **Zoom (wheel) + pan (drag)** (M) `P1` `M1` — clamp zoom 0.5–1.5; camera transform; distinguish click vs drag.
- [ ] **Reset view + zoom % indicator** (S) `P2` `M1` — shown only when view changed.
- [ ] **viewBox readout** (XS) `P2` `M1`.
- [ ] **Background pattern menu** (S) `P2` `M1` — Grid / Dots / Plain, pattern color adapts to luminance.
- [ ] **Background color picker + reset** (S) `P2` `M1`.
- [ ] **"Full SVG" debug toggle** (S) `P2` `M1` — render original SVG (no animation) to ease shape selection.

## Epic 5 — Layers panel `[layers]` · `M1`

- [ ] **Layer list** (S) `P0` — one row per top-level shape: tag icon, name, keyframe-presence dot.
- [ ] **Visibility toggle (eye)** (S) `P1` — per-layer hide/show; row dims when hidden.
- [ ] **Select from layer row** (XS) `P0` — syncs canvas + inspector selection.
- [ ] **Layer count + file name header** (XS) `P2`.
- [ ] **Collapse / expand rail** (S) `P2` — collapsed vertical rail with count.
- [ ] **Click panel background to clear selection** (XS) `P2`.

## Epic 6 — Inspector panel `[inspector]` · `M2`

- [ ] **Header** (XS) `P1` — selected name, "values at playhead" + time readout.
- [ ] **Empty state** (XS) `P1` — no-selection prompt.
- [ ] **Property rows — numeric** (M) `P0` — label, value input, change updates value at playhead; format per property.
- [ ] **Property rows — color** (S) `P1` — swatch + hex input with validation/normalisation.
- [ ] **Add-keyframe-at-playhead diamond** (S) `P0` — per row; highlights when a key exists at current time.
- [ ] **Remove property** (S) `P1` — `×` deletes track + clears its selected keys.
- [ ] **Expandable filter params** (M) `P1` — e.g. drop-shadow offset X/Y + color sub-fields.
- [ ] **Add-property menu (grouped)** (M) `P0` — Transform / Appearance / Filters; shows only inactive props; "All properties added" state; smart open up/down positioning.
- [ ] **Active-property count badge** (XS) `P2`.
- [ ] **Multi-select editing lockout** (S) `P2` — disable value inputs when >1 keyframe selected.

## Epic 7 — Timeline & keyframes `[timeline]` · `M3`

- [ ] **Transport controls** (M) `P0` — back-to-start, play/pause, loop toggle, current-time / duration readout.
- [ ] **Duration input** (S) `P1` — number 0.5–12s; clamps current time.
- [ ] **Ruler + adaptive ticks** (S) `P0` — tick step scales with duration; time labels.
- [ ] **Scrub playhead** (S) `P0` — click/drag ruler sets time; playhead line synced.
- [ ] **Track lanes per active property** (M) `P0` — label, keyframe count, add-keyframe button, lane background.
- [ ] **Keyframe diamonds: render + select** (M) `P0` — positioned by time; click selects; selected styling.
- [ ] **Keyframe drag to retime** (M) `P0` — snap to 0.05s, clamp to [0, duration], re-sort.
- [ ] **Additive / multi-select** (M) `P1` — shift/ctrl/meta toggles; drag moves the whole selection together.
- [ ] **Marquee box-selection** (M) `P1` — drag a box over diamonds; additive with modifier.
- [ ] **Scroll sync** (S) `P2` — horizontal keys scroll syncs ruler; vertical scroll for many lanes.
- [ ] **Empty state** (XS) `P1` — "select a shape to view tracks".

## Epic 8 — Easing editor `[easing]` · `M4`

- [ ] **Collapsible section + label** (XS) `P2` — shows preset name or "Custom".
- [ ] **Interactive bezier curve** (M) `P0` — 2 draggable control points, curve + handle lines, clamped (y −0.6…1.6 for overshoot).
- [ ] **Preset buttons** (S) `P1` — Linear, Ease, In, Out, In-Out, Back, Overshoot; active highlight.
- [ ] **`cubic-bezier(...)` readout** (XS) `P2`.
- [ ] **Apply to selection** (S) `P0` — writes ease to all selected keyframes.
- [ ] **Single / multi / none states** (S) `P1` — curve for one key, presets-only for many, prompt for none.

## Epic 9 — Playback engine `[playback]` · `M3`

- [ ] **rAF tick loop** (S) `P0` — advance time by clamped dt; apply at current time.
- [ ] **Play / pause / stop / loop semantics** (S) `P0` — restart from 0 when playing past end; loop wraps; stop resets to 0.
- [ ] **Scrub ↔ playback sync** (S) `P0` — scrubbing pauses-friendly; transient playhead state (plan §2: `shallowRef`).

## Epic 10 — Export `[export]` · `M5`

- [x] **Export modal** (S) `P0` — code panel, header copy. CSS/GSAP tabs, copy + download.
- [x] **CSS `@keyframes` codegen (demo parity)** (M) `P0` — per element: `transform-box: fill-box`, `transform-origin: center`, stops at keyframe times for transform/opacity/fill/draw/filters.
- [x] **CSS export easing fidelity (adaptive)** (L) `P0` — per-segment `cubic-bezier()` when channel tracks align; per-frame baking when they don't (DEC-8). _The real export._
- [x] **Copy to clipboard + feedback** (XS) `P0` — "Copy CSS" → "Copied ✓".
- [x] **GSAP code export** (M) `P2` — runnable `gsap.timeline()`, per-property tweens + `CustomEase` (plan §5).
- [x] **GIF/video render** (M) `P3` — raster export: pure `frameRender` bakes each frame's SVG from the shared engine, then rasterize → encode. GIF via `gifenc` (per-frame palette, loop), WebM via `MediaRecorder` (DEC-10).

## Epic 11 — Keyboard shortcuts `[playback]` · `M3`

- [ ] **Space = play/pause, ←/→ = nudge ±0.05s** (S) `P1` — ignore while typing in inputs.
- [ ] **Delete/Backspace = delete selected keyframes** (XS) `P1`.

## Epic 12 — State management `[state]` · `M0`–`M3`

- [x] **`useDocumentStore` (Pinia)** (M) `P0` — document model + actions: addKeyframe, putKeyframe, updateKeyframe, moveKeyframe, deleteKeyframe(s), addProp/removeProp, selectLayer, setDuration.
- [x] **Transient state tier** (S) `P0` — playhead time + live drag deltas in `shallowRef`/refs; commit to store on drag-end (plan §2).
- [x] **Undo/redo architecture** (M) `P0` `M0` — Immer patches (DEC-3). _Not in demo._
- [x] **Undo/redo UI + wiring** (M) `P2` `M6` — TopBar buttons + ⌘/Ctrl+Z shortcuts (DEC-9).
- [x] **Autosave to IndexedDB/localStorage** (S) `P2` `M6` — debounced localStorage autosave + restore-on-startup + (de)serialize w/ schema version + storage-choice/clear/last-saved UX (DEC-9). _Not in demo._

## Epic 13 — Topbar & menus `[canvas]` · `M1`

- [ ] **Branding/logo + title** (XS) `P2`.
- [ ] **Menu dropdown → Import / Export** (S) `P1` — with click-away backdrop.

## Epic 14 — Polish & micro-interactions `[polish]` · `M4`

- [ ] **Hover/active states across controls** (M) `P2` — buttons, rows, menus per demo styling.
- [ ] **Transitions & empty/loading states** (M) `P2` — the motion-design flex (plan §6 Phase 4).
- [ ] **Selection outline + keyframe-present dots polish** (S) `P2`.

## Epic 15 — Testing & QA `[testing]` · cross-cutting

- [x] **Unit: `valueAt`, easing solver, color mix, sampling** (M) `P0` — golden values.
- [x] **Unit: CSS serializer (golden file)** (M) `P1`.
- [x] **E2E: import → select → keyframe → scrub → export** (M) `P1` — Playwright happy path.
- [x] **Coverage ≥ 80%, weighted to core/serializers** (S) `P1` — vitest threshold + CI workflow (`.github/workflows/ci.yml`).

---

## Suggested label set for Linear

`area:scaffold` `area:core` `area:import` `area:canvas` `area:layers` `area:inspector` `area:timeline` `area:easing` `area:playback` `area:export` `area:state` `area:polish` `area:testing`
· `type:feature` `type:chore` `type:tech-debt`

---

## Importing into Linear

A ready-to-import board lives in [linear-import.csv](linear-import.csv) — 15 epics + 89 issues, kept in sync with this file.

1. Linear → **Settings → Import / Export → CSV** (or a team's **+ → Import issues**). Map columns by header; pick the target team in the wizard.
2. Columns: `Title, Description, Priority, Estimate, Labels, Parent`.
   - **Priority** maps P0→High, P1→Medium, P2→Low, P3→blank.
   - **Estimate** is Fibonacci points (XS=1, S=2, M=3, L=5, XL=8).
   - **Parent** is the epic title — Linear nests these as sub-issues. If your workspace ignores it, group by the `area:*` labels and convert each epic to a Project.
   - **Milestones** ride along as `milestone:Mn` labels; convert to real Linear milestones/cycles post-import if you want burndown.
3. Testing tasks are labelled `type:chore` (quality work, not product features) — swap to a `type:test` label if you'd rather track them separately.

Edit the CSV, not the board, while scope is still moving; re-import once it settles.
