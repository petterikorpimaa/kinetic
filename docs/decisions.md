# Architecture Decisions

Short ADR-style record of decisions that deviate from, or lock down, the build
plan ([docs/svg-animator-plan.md](svg-animator-plan.md)). Newest first.

## DEC-9 — Undo/redo wiring + localStorage autosave (M6)

**Decision.** M6 ships the undo/redo UI and autosave on top of the Phase-0
machinery (Immer patches, DEC-3).

- **Undo/redo (SVG-94)** wires the existing store `undo`/`redo`/`canUndo`/
  `canRedo` to TopBar buttons and global ⌘/Ctrl+Z (undo) · ⌘/Ctrl+Shift+Z /
  Ctrl+Y (redo) via `useHistoryKeyboard`. Shortcuts are ignored while a text
  field is focused (shared `isTypingTarget`) so native input undo still works.
- **Persistence (SVG-105/95/106/107)** is layered: `src/core/persistence.ts`
  is a pure, versioned `serializeDocument` / `deserializeEnvelope` —
  `{ schemaVersion, savedAt, document }`, full boundary validation (never trust
  stored data), and a `MIGRATIONS` hook (v0→v1 backfills `fps`).
  `usePersistenceStore` wraps **Web Storage** (`localStorage` default,
  `sessionStorage` optional), guarded against private-mode / quota with a probe.
  `useAutosave` restores the most-recent saved document on startup (falling back
  to the sample) and debounces a save (500 ms) on every document change; restore
  scans **both** storages and picks the newer `savedAt`, so a mode switch never
  loses work. TopBar carries the last-saved indicator, the storage-mode toggle,
  and "Clear saved work".

**Why.** The document is JSON-only (DEC-4) and history is serializable patches,
so persistence needs zero state reshaping. **localStorage over IndexedDB** for
v1: documents are small (markup + keyframes), the synchronous API keeps the
restore-before-first-paint path trivial, and there's no blob/large-binary need.
Revisit with IndexedDB only if documents grow large or we add asset embedding.

**Safe-id invariant (review follow-up, SVG-111).** `data-anim-id`/`domRef` is
embedded into exported CSS selectors and generated GSAP `.js`, so it must never
carry quotes/braces/etc. that could break out of or inject into the artifact.
It's constrained to `[A-Za-z0-9_-]` (letter/underscore leading) and made unique
at **both** trust boundaries: `processSvg` canonicalizes on import, and
`deserializeEnvelope` rejects any stored doc whose `domRef` is unsafe. So the
serializers can embed it directly without per-call escaping. Restore also
rejects non-positive `duration`/`fps` and caps `fps` (≤240) so corrupt stored
data can't produce `NaN%` / `0s` / OOM exports. `restore()` reads storage
directly (not via the write-probe) so a transient write failure can't discard
readable saved work.

## DEC-8 — Adaptive CSS export: clean per-segment cubic-bezier, else baked (M5)

**Decision.** The CSS serializer (`src/core/cssExport.ts`) groups each element's
tracks into five channels — `transform` (x/y/scale/rotation), `opacity`, `fill`,
`draw` (→ `stroke-dashoffset`), and `filter`. Single-property channels always
emit clean stops with per-stop `animation-timing-function: cubic-bezier(...)`
from each keyframe's outgoing easing. The two **merged** channels — `transform`
and `filter`, which CSS animates as one property — are emitted cleanly **only
when their member tracks are aligned** (identical keyframe times _and_ identical
eases per segment); otherwise the channel is **baked** per frame at the
document `fps` with `linear` stops. Constant (≤1-keyframe) channels become a
static declaration in the base rule, not a `@keyframes` block. Every value is
read through the same `sampleNumber`/`sampleColor` as the editor (architecture
rule 1), so export can't diverge from the canvas. Animations default to
`<dur>s linear infinite`.

Transform pivot is reproduced with `transform-box: fill-box; transform-origin:
center;` plus `transform: translate() rotate() scale()`. This is provably equal
to the editor's explicit `translate(o) rotate translate(-o) scale` matrix
(translations commute), so the editor attribute-transform and the exported CSS
property-transform render identically.

**GSAP export** (`src/core/gsapExport.ts`) needs no baking: GSAP composes the
transform sub-properties independently, so each animates as its own per-segment
tween with its own ease (`CustomEase`, or `"none"` for linear). Only `filter`
stays merged there too.

**Why.** A single `animation-timing-function` per stop cannot represent two
sub-properties easing differently across the same segment, so a naive
union-of-times emission would silently diverge from the editor. Baking is the
always-correct fallback; the clean path keeps the common case (one transform
property, or sub-tracks keyed together) compact — honouring the "clean, usable
CSS that matches the editor" pitch. **Supersedes** the demo-parity codegen
(SVG-84), which only flattened to linear stops. **Note:** with DEC-1 (all eases
are bezier) there are no elastic/bounce eases, so baking is triggered by track
_misalignment_, not by un-representable eases as the plan §5 originally framed.

## DEC-7 — Fit-to-width timeline; no horizontal scroll (Phase 3 / M3)

**Decision.** The timeline maps the whole duration to 100% of the lane width:
keyframes and the playhead are positioned by `timeToFraction` (a [0,1] of the
duration), not by a pixels-per-second zoom. There is therefore no horizontal
scroll. Many lanes scroll **vertically** (`.tracks__body` is `overflow-y: auto`)
with the ruler header pinned above and the playhead drawn over both. This
resolves SVG-72: the "vertical scroll for many lanes" requirement is met; the
"horizontal keys-scroll syncs ruler" half is moot when nothing scrolls
horizontally.

**Why.** v1 durations are 0.5–12s and fit a single viewport-width comfortably,
matching the Kinetic demo. Fraction-based layout also keeps the ruler, lanes,
and playhead aligned for free (one constant `--lane-col-width` offset) and keeps
`src/core/timeline.ts` zoom-free. **Revisit** if a zoomable timeline is wanted:
add a transient zoom + scrollLeft (kept out of the document model per DEC-4),
sync `.tracks__head` and `.tracks__body` scroll, and switch positioning to
pixels-per-second.

## DEC-6 — One interpolation routine for every value (Phase 2)

**Decision.** `interpolateKeyframes(keyframes, t, lerp)` in `src/core/interpolate.ts`
is the sole eased-interpolation walk (clamp ends, ease by the left keyframe,
blend with `lerp`). `valueAt` (numeric) and `sampleColor` (hex via `mixHexColor`)
both delegate to it. Tolerant samplers `sampleNumber` / `sampleColor` in
`src/core/animation.ts` fall back to a default when a track is empty/absent;
strict `valueAt` still throws on empty (export/playback never sample an empty
track).

**Why.** Architecture rule 1 — one source of truth for values, so colour eases
exactly like numbers and the editor/export can't diverge.

## DEC-5 — An active property is a track, possibly with zero keyframes (Phase 2)

**Decision.** Adding a property in the Inspector creates a `Track` in
`document.tracks` with an empty `keyframes` array; removing it deletes the track.
The first value edit or add-keyframe upserts the first keyframe (snap window
`0.04s`). "Active properties for an element" = its tracks. This unifies the
demo's separate `activeProps` map and `tracks` map into our one list.

**Why.** One structure to render and one undoable mutation per action
(add/remove property, set value all go through `commit`). The playhead lives in
a new transient `usePlaybackStore` (`currentTime`, plan §158); the canvas
`apply(t)` in `CanvasStage.vue` writes each element's sampled
transform/opacity/fill/draw at `currentTime`, restoring a captured per-node
baseline when a property is removed or "Full SVG" is on. Filters group is
deferred to M4 (registry-driven, so it appears in the add-menu automatically
once filter defs are registered).

## DEC-4 — Document model is fully JSON-serializable (Phase 0)

**Decision.** `AnimationDocument` and everything it holds is plain JSON data —
no DOM nodes (elements reference the SVG by a `domRef` / `data-anim-id` string),
no class instances, no functions. Transient pointer-frequency state (scrub
playhead, live drag deltas) is deliberately kept out of the model.

**Why.** Enables autosave/persistence (SVG-95, SVG-105–107) to serialize the
document and undo/redo to use serializable Immer patches with zero reshaping.

## DEC-3 — Undo/redo via Immer patches (Phase 0)

**Decision.** Snapshot/patch history. Each committed store mutation runs
`produceWithPatches`, producing forward (`redo`) + inverse (`undo`) patches that
are pushed onto a history stack. Implemented in `src/core/history.ts` (pure) and
`src/stores/document.ts` `commit()`. UI lands in M6.

**Why.** Pairs with the immutability rule, low memory, and patches are plain
JSON so they double as the basis for persistence. Chosen over command objects
(more boilerplate) and full snapshots (more memory). Recorded on Linear SVG-93.

## DEC-2 — A keyframe owns its OUTGOING segment's easing (Phase 0)

**Decision.** When interpolating between keyframes A → B, the segment is eased
by **A**'s easing (the left/leaving keyframe). The final keyframe's easing is
unused.

**Why.** Matches CSS `animation-timing-function`, which is declared on the start
keyframe of a segment — so the editor and the CSS export stay in agreement. Also
matches the demo's `valNum`. **Deviates from** the plan §3 comment, which said
easing belonged to the _entering_ keyframe; the type doc in
`src/types/keyframe.ts` reflects the corrected convention.

## DEC-1 — Easing is a cubic-bezier tuple, not a named union (Phase 0)

**Decision.** `Keyframe.easing` is a `CubicBezierEasing = [x1, y1, x2, y2]`
tuple (the demo's draggable curve editor model). Named presets (Linear, Ease,
In, Out, In-Out, Back, Overshoot) simply write one of these tuples — see
`src/core/presets.ts`. `y` may exceed [0,1] for overshoot.

**Why.** The user chose the demo's freeform curve editor over the plan's fixed
`EasingName` union. Every curve is directly expressible as CSS `cubic-bezier()`,
which keeps the export path simple. **Deviates from** the plan §3 `EasingName` +
`EASING_EXPORT` (bezier-vs-baked) model.

**Consequence — no baked eases in v1.** True `elastic` / `bounce` (GSAP eases
that a single cubic-bezier can't represent) are out of scope; overshoot is
achieved with control points outside [0,1]. If elastic/bounce is wanted later,
revisit by extending the easing type to a discriminated union and reinstating
the plan's adaptive bezier-vs-baked CSS export.
