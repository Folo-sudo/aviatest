# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**AviaTest** (package: `next_psycho`) — a Next.js 16 / React 19 site offering free psychotechnical practice tests for French pilot selection exams (PSY0, PSY1 Cadets Air France, ENAC EPL). Deployed at `aviatest.fr`. UI and content are in French.

## Commands

**Do not run `npm` commands (install, build, dev, start, lint) locally.** The user relies exclusively on Vercel for builds and previews. Validate changes by pushing to `master` and letting Vercel build; do not invoke npm scripts in this environment.

The repo is connected to Vercel with **auto-deploy on every push to `master`** (production). There is no staging branch.

Reference (for reading only, do NOT execute):
```
next dev     # local dev (run by Vercel only)
next build   # build (run by Vercel only)
next start   # serve production build
eslint       # lint
```

No test runner is configured.

## Workflow rules (standing instructions — do not ask again)

- **Never run `npm install`, `npm run ...`, `next ...`, or any build/dev command locally.** Builds happen on Vercel.
- **Auto-push to `master` after any change.** Whenever code, config, or docs change, commit and `git push origin master` immediately — no confirmation needed. Vercel will pick up the push and deploy.
- **Full autonomy granted.** The user has authorized acting on their behalf: edit any file, create/delete files, refactor, install deps (by editing `package.json` only — Vercel handles the install), push to `master`. No need to ask permission for routine changes.
- Commit messages: short, conventional style, in the repo's existing tone. No Claude co-author trailer unless the user asks for it.
- If a change is risky or destructive (history rewrite, force-push, secret rotation, deleting whole directories), pause and ask first — the blanket authorization above does not cover destructive ops.

## Architecture

### Exercise registry (single source of truth)

`src/lib/data/exercises.ts` is the **central registry**. It exports:

- `EXERCISES: ExerciseConfig[]` — every exercise with id, slug, SEO metadata, `types[]`, `competitions[]`, `difficulty`, `iconName`, `ready` flag, etc.
- `COMPETITIONS` — the three concours (psy0, psy1, enac-epl).
- `EXERCISE_TYPES` — cognitive category metadata (attention, spatiale, numerique, verbal, memorisation, psychomoteur, intellectuel, anglais) with colors.
- Lookup helpers: `getExerciseBySlug`, `getCompetitionBySlug`, `getExercisesByCompetition`, `getDifficultyLabel`, etc.

**When adding a new exercise**, you must update `EXERCISES` in this file AND wire the component into the dynamic import map in `src/app/exercices/[slug]/ExerciseClient.tsx` (and `src/app/telephone/[slug]/MobileExerciseClient.tsx` if a mobile variant exists). Routing/SEO/sitemap/listing all read from the registry.

### Routing (App Router, two parallel routes per exercise)

- `src/app/exercices/[slug]/` — **SEO-canonical French route**. Uses `generateStaticParams` + `generateMetadata` per exercise; renders `ExerciseClient` which dynamically imports the correct test component by slug (all client-only, `ssr: false`). Structured data (JSON-LD) is emitted here.
- `src/app/exercises/<id>/page.tsx` — **direct/legacy routes** (English folder names), thin wrappers around the same components. Kept in parallel with `/exercices/` — changes to a test usually need no route edits, but new tests sometimes get both.
- `src/app/telephone/[slug]/` — mobile-specific variants for exercises that have one (calcul mental 1/2/3, fiche angles, fiche calcul, glossaire angles). Separate component tree under `src/components/exercises/mobile/`.
- `src/app/concours/[slug]/` — per-competition landing pages listing the exercises attached to each concours.
- `src/app/robots.ts`, `src/app/sitemap.ts` — generated from the registry.

The special case `m-back` is served at `/exercices/m-back` and reads `n` from query params to share one component between M2-Back and M3-Back.

### Test components

`src/components/exercises/*.tsx` — one component per exercise. They are all client components, imported dynamically with `ssr: false`. Each is self-contained (state, timer, scoring, result UI). They typically accept an optional `{ n?: number }` prop (used by `MBackTest`).

Shared primitives in `src/lib/core/`:
- `PerformanceTracker.ts` — **localStorage-backed** performance persistence. Keys are namespaced per pseudo: `aviatest-perf:{pseudo}:{exerciseId}`. Exposes `getPseudo`/`setPseudo`/`listPseudos`, `recordEntry`, `getStats` (best/worst/avg, rolling averages). Max 200 entries per exercise.
- `Scorer.ts` — in-memory score/streak tracker with grade labels.
- `Timer.ts` — countdown / stopwatch helper.
- `CanvasUI.ts` — shared canvas drawing utilities.

`src/app/progression/page.tsx` reads `PerformanceTracker` to show per-user stats; `src/components/PerformanceChart.tsx` renders history charts.

### UI stack

- **shadcn/ui** (New York style, neutral base, CSS variables) under `src/components/ui/`. Config in `components.json`. Path alias `@/*` → `src/*`. Utility `cn()` in `src/lib/utils.ts`.
- **Tailwind CSS v4** via `@tailwindcss/postcss` (no `tailwind.config.*` — tokens live in `src/app/globals.css`).
- **lucide-react** icons. Exercise configs carry `iconName: string`; the home page maps it to a component via a local `iconMap`. When adding an exercise with a new icon, extend `iconMap` in `src/app/page.tsx`.
- **three.js** for 3D exercises (mental rotation).
- Design palette for the landing page / chrome: cream/beige warm tones (`#fbfaf9` bg, `#37322f` text) — inlined as a `homeStyles` object in `src/app/page.tsx`.
- Fonts (Geist, Geist Mono, Playfair Display) loaded via `next/font/google` in `src/app/layout.tsx`.

### SEO

- Per-exercise metadata and JSON-LD are generated from the registry via helpers in `src/lib/seo/structured-data.ts`. `StructuredData` component in `src/components/seo/` emits the `<script type="application/ld+json">` tags.
- `NEXT_PUBLIC_BASE_URL` overrides the canonical origin; defaults to `https://aviatest.fr`.
- Root `layout.tsx` emits Website + Organization structured data globally.

### Build-time obfuscation

`next.config.ts` injects `webpack-obfuscator` **only for production client bundles** (`!dev && !isServer`). It enables `debugProtection`, `selfDefending`, `disableConsoleOutput`, dead-code injection, and string array rotation. This makes prod client bundles hard to read and disables `console.*`. Dev builds are untouched — debug in dev.

## Content/UX conventions

- All user-facing strings are French. Source comments and identifiers are French-adjacent but unaccented (e.g. `memorisation`, `numerique`, `raisonnement` without diacritics — preserve this style when editing).
- When introducing a new test, prefer keeping the heavy exercise logic inside the component (as existing tests do) rather than over-abstracting into `lib/` — only promote to `lib/core/` when genuinely shared.
- Exercise details and spec docs, when they exist, live under `docs/exercises/` (see `docs/exercises/quadrilogie-angles.md`).
