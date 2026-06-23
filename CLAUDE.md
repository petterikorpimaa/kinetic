# SVG Animator — Project Guide

Import an SVG, animate its elements on a keyframe timeline, export to CSS/GSAP.
Design & build plan: [docs/svg-animator-plan.md](docs/svg-animator-plan.md) — read it before changing architecture.

## Working Together

- **Ask, don't assume.** If intent, architecture, or requirements are unclear, ask before writing a single line — no silent assumptions. When running unattended with no way to ask, pick the most reasonable interpretation, proceed, and record the assumption so it can be reviewed.
- **Flag uncertainty explicitly.** If you're unsure, ask (see above). Where it helps, run a small, localised, low-risk experiment and bring the hypothesis and results back to discuss. Confidence without certainty does more damage than admitting a gap.
- **Suggest better ways.** Always open to a better approach — speak up, especially for changes with lasting impact over a quick tactical fix.

## Issue Tracking (Linear)

Work is tracked in Linear — team **SVG Animation Editor**, project **SVG Animator (Kinetic) v1** (mirrors [TASKS.md](TASKS.md)).

**Linear is the primary home for plans and tasks.** An issue must be self-contained: a developer who has never seen the project should know exactly what to do from the title and description alone.

- **Title** — simple but informative. State the outcome, not the mechanics.
- **Description** — everything needed to do the work: the goal, the expected behaviour, and how to tell it's done. Keep it tight; informative beats exhaustive.
- **No project file or folder references.** Don't point at paths, modules, or docs in the repo — describe the work in plain terms so the issue stays valid as the code moves. Linking **other Linear issues** is fine and encouraged for dependencies and context.

**Keep issue status in sync with reality — in real time, as you work.** Move each Linear issue through the workflow _at the moment the work happens_, one issue at a time:

- **Start** an issue → set it to **In Progress** _before_ you touch its code, not after.
- **In Progress means right now.** Keep an issue in **In Progress** _only_ while you are actively working on that specific issue this moment. The instant you stop — pausing, switching to another issue, or ending the session — move it back to **To Do** (or to **Done** if it's finished and verified). The board must never show an "In Progress" issue that nobody is working on.
- **Finished** and verified → set it to **Done** _before_ you start the next issue.
- Blocked or handed back → set the matching status (e.g. **Todo**/**Backlog**, **Canceled**) so the board never lies.

**Never batch status updates at the end of a work session.** Working through several issues and only updating Linear once everything is done leaves the board wrong for the entire session — exactly the failure this rule exists to prevent. When you have a list of issues, the loop is: flip the one you're about to do to **In Progress** → do it → verify → mark it **Done** → only then move to the next. A glance at the board must always show what is actually being worked on at that instant.

## Stack

- **Vue 3** (`<script setup>`) + **TypeScript** (strict)
- **Vite** build / dev server
- **Pinia** document state, `shallowRef` for transient state
- **GSAP** — playback renderer + export target only, never the source of truth
- **moveable** (Daybrush) for canvas transform handles
- **@vueuse/core** for pointer/raf/keyboard utilities
- **Vitest** (unit) + **Playwright** (E2E)

## Architecture Rules (non-negotiable)

1. **One interpolation source of truth.** A pure `valueAt(track, t)` in `src/core/` computes every value. Editor preview, GSAP playback, and export sampling all read from it — never from each other.
2. **Two-tier state.** Document model (elements, keyframes, selection, duration) lives in Pinia and is reactive. Pointer-frequency values (scrub playhead, live drag deltas) use `shallowRef`/plain refs and commit back to the store on drag-end. Never put high-frequency values in deep reactivity.
3. **Undo/redo is designed in, not bolted on.** Store mutations are shaped for the chosen history model (command or snapshot/patch) from day one.
4. **Keep `src/core/` framework-free.** Interpolation, serializers, and the data model import nothing from Vue/GSAP/Pinia. This is the test target.

## Coding Standards

Extends the global rules. Project-specific:

### Naming

Intention-revealing names that state what a thing does and why it exists. Clarity over brevity — prefer `rect` to `r`, no cryptic abbreviations. Established idioms are fine where they're unambiguous: loop indices `i`/`j`, `ctx`, geometry `x`/`y`/`dx`/`dy`. The bar is clarity, not length.

Casing:

- **PascalCase** — types, interfaces, classes, Vue components.
- **camelCase** — functions, variables, methods.
- **SCREAMING_SNAKE_CASE** — module-level constants.

```ts
// bad
function proc(t, p) { ... }

// good
function valueAt(track: Track, timeSeconds: number): number { ... }
```

### Small, focused functions

One function, one job. That makes it trivial to name, test, and debug, and hides complexity behind a clear interface. Keep under ~50 lines; extract the moment a function grows a second responsibility or you reach for a comment to explain a block.

### Avoid cleverness

Prefer clear, standard, idiomatic solutions over clever tricks, obscure language features, or abstractions only the author understands. If a reviewer has to stop and decode it, rewrite it plainly.

### Ternaries

No nested or chained ternaries — one level only: `a ? b : c`. Use them only for short, single-condition value selection; never let one wrap a line.

```ts
// good
const label = el.name ?? defaultLabel(el);
const fill = selected ? activeColor : baseColor;

// bad — nested / chained / hard to scan
const c = a ? (b ? x : y) : d ? z : w;
const d = a ? b : c ? d : e;
```

For multiple branches use an early return, an `if/else`, a lookup map, or a small named helper instead.

### Comments

Simple and to the point. State what the code does or why a non-obvious choice was made — nothing else.

- No backstory, no changelog, no "we used to…", no TODO essays.
- Never embed variable values or example data in comments.
- No restating the code in prose.

```ts
// good
// Bake non-bezier easings to per-frame stops.
// Commit transient drag value once, on pointer-up.

// bad
// Loop over the keyframes array (which holds {time, value, easing})
// and interpolate — we tried GSAP first but it diverged so now...
```

### TypeScript

- `strict: true`. No `any` to dodge the checker — use `unknown` + narrowing at boundaries.
- Validate untrusted or imported data (SVG / pasted markup / API responses) before trusting it.

### Immutable data

Return new objects; never mutate shared or store state in place. The document is replaced wholesale on each commit — keep it that way.

### Dependencies

No new runtime dependency without a clear reason. Prefer the platform and the deps already in the [Stack](#stack); if something genuinely needs a new package, flag the need and the trade-off rather than adding it silently.

### Structure

- Many small focused files (200–400 lines typical, 800 max).
- One component per file; co-locate a component's `.spec.ts`.
- `src/core/` (pure logic) · `src/stores/` (Pinia) · `src/components/` · `src/types/`.

## Testing

- TDD the pure code first: `valueAt()`, CSS serializer, GSAP serializer, store actions. Golden-file tests for serializers.
- Playwright covers the happy path: import → select → keyframe → scrub → export.
- 80% coverage minimum, weighted toward `src/core/` and stores over UI chrome.

## DX

### Setup & onboarding

Fresh clone → running app in one command. A new developer must never hand-assemble the environment.

- Use **pnpm** (pinned via `"packageManager"` in `package.json` + Corepack — run `corepack enable` once).
- `pnpm bootstrap` does everything: installs deps, installs Playwright browsers, sets up git hooks. Clone + this command is the whole setup.
- No Docker for v1 — it's a static frontend app, so a script is lighter and faster. Revisit only if a backend appears.
- Strict `node_modules`: only declared dependencies are importable; never rely on phantom deps.

### Commands

- `pnpm dev` — Vite + HMR
- `pnpm build` / `pnpm preview`
- `pnpm test` — Vitest watch · `pnpm test:run` — CI mode · `pnpm test:e2e` — Playwright
- `pnpm lint` / `pnpm typecheck` — must pass before any commit
- Format on save (Prettier) and lint on save are expected; keep the build green at all times.

### README is a living document

Update `README.md` whenever a change affects setup or workflow. It must always cover:

- Prerequisites (Node version, pnpm via Corepack).
- Exact setup command(s).
- How to run tests (unit + E2E).
- Common commands (dev, build, lint, typecheck).
