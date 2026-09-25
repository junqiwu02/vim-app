# AGENTS.md

## Project overview

Vimtype is a static, local-first Vim speed trainer. Players transform a starting document into an
exact target using CodeMirror 6 with Vim bindings. The product has no backend or accounts; runs,
imported scenarios, and preferences remain in the browser.

Read `ARCHITECTURE.md` before making substantial changes. It defines the product scope, data
contracts, and future compatibility requirements.

## Stack

- React 18, TypeScript, and Vite
- React Router
- CodeMirror 6 and `@replit/codemirror-vim`
- Tailwind CSS and shadcn/ui source-owned components in `src/components/ui/`
- Zod for scenario validation
- IndexedDB for runs and imported scenarios
- `localStorage` for small preferences
- Vitest and React Testing Library

## Commands

```bash
npm install
npm run dev
npm test
npm run lint
npm run format
npm run format:check
npm run build
```

ESLint checks code quality and Prettier enforces repository formatting with a 100-column target.
`npm run lint` runs both ESLint and Prettier's formatting check; use `npm run format` to fix
formatting automatically.

Before handing off a change, run `npm test`, `npm run lint`, and `npm run build`. A production build
may report the existing large-chunk warning from CodeMirror; treat new warnings or build failures as
regressions.

## Architecture boundaries

- Keep `src/core/` framework-independent. It must not import React, CodeMirror, IndexedDB, or
  browser UI modules.
- Keep CodeMirror-specific behavior behind the editor boundary in `src/editor/`.
- Keep persistence behind `src/persistence/`. UI components should not open IndexedDB directly.
- CodeMirror owns the live document. Do not mirror the document into React state on every edit.
- Keep the session lifecycle explicit: `loading → ready → active → completed`, with reset returning
  to `ready` and abandon moving to `abandoned`. Do not allow completion or result persistence to
  fire more than once.
- Use the injectable clock in the session engine. Do not replace elapsed-time measurement with
  `Date.now()`.
- Store wall-clock timestamps only for history display.
- Keep editor document, mode, cursor, Vim-command, paste, and undo observations behind the editor
  adapter rather than reaching into CodeMirror from feature components.
- Preserve static deployment and SPA route fallback behavior, including direct loads of nested
  routes.
- Do not add backend, authentication, matchmaking, or cloud-sync placeholders unless the product
  scope changes explicitly.

## Product invariants

- `/` opens directly into a focused, playable Test challenge.
- The target remains clearly visible in a read-only side-by-side panel during Test and Practice
  attempts.
- Test timing starts on the first document mutation, not on page load or navigation.
- Completion is exact-text matching, subject only to the scenario's declared normalization rules.
- Built-in completion ignores empty and whitespace-only lines, but every character on nonblank lines
  remains exact unless another normalization rule says otherwise.
- Completion fires once and freezes the result.
- `:w` continues after completion, `:e` resets the current attempt, and `:n` abandons it for a
  random different Test scenario when alternatives exist.
- Test attempts never show hints or suggested solutions.
- Practice lives under `/practice` and may reveal targets, hints, and suggested solutions.
- Practice results and Test personal bests remain separate.
- Personal bests sort by successful completion, then lowest time, then fewest keystrokes.
- Completed runs retain the scenario content version and seed needed to compare or reproduce them.
- Do not introduce a composite efficiency score without a product decision backed by real usage
  data.
- Imported code is untrusted text. Never execute it or render it as HTML.
- Built-in scenarios must remain playable if browser persistence fails.
- The same scenario content version and seed must resolve deterministically. Do not use
  `Math.random()` for scenario generation.

## Scenario changes

- Require `schemaVersion` on imported scenario and scenario-pack payloads.
- Validate all imported scenarios with Zod and return errors with actionable JSON paths.
- Keep scenario IDs stable.
- Increment `contentVersion` whenever a scenario change affects run comparability.
- Keep built-in `startText` and `targetText` newline-terminated.
- Lines and columns are zero-based.
- Keep the import sequence explicit: parse, validate, check duplicate IDs, preview conflicts, then
  persist. Make conflicts explicit to the user before replacing data.
- Build deterministic variants from authored finite choices and a seed; the same scenario content
  version and seed must always resolve to the same content.
- Every built-in scenario should have a reachable target and a verified suggested solution when one
  is provided.

## UI and accessibility

- Preserve automatic editor focus and keyboard-first operation.
- Preserve the unfocused-editor blur and focus prompt. Clicking it or pressing a plain key outside
  interactive controls should restore editor focus; do not hijack Tab or modifier shortcuts.
- Do not intercept keys in a way that breaks Vim motions, operators, counts, registers, undo,
  repeat, search, or visual mode.
- Keep essential controls reachable without a pointer and provide accessible labels for icon-only
  controls.
- Maintain usable layouts at phone and desktop widths.
- Render user-provided scenario content as text only.
- Follow the existing visual language in `src/styles.css` and reuse components from
  `src/components/ui/` before adding new primitives.
- Use shadcn/ui for standard controls such as buttons, badges, inputs, selects, and switches.
  Customize the source-owned components to preserve Vimtype's visual language instead of introducing
  parallel ad-hoc controls.

## Persistence and privacy

- Runs and imported scenarios belong in IndexedDB.
- Small editor preferences belong in `localStorage`.
- Keep migrations versioned and non-destructive.
- Keep run, scenario, pack, personal-best, and import/export storage operations behind the
  persistence adapter.
- Storage failures must degrade to an in-memory experience rather than blocking play; bundled
  scenarios must remain available even when persistence cannot initialize or write.
- Do not introduce analytics, remote fonts containing user data, or network transmission of runs
  without an explicit product decision.

## Testing priorities

Add or update tests when changing:

- Scenario schemas, versions, normalization, or deterministic generation
- Session transitions, timing through a fake/injectable clock, completion, and reset behavior
- Personal-best ordering or persistence migrations
- Vim adapter behavior and keyboard handling
- Import validation, duplicate handling, refresh persistence, or storage fallback
- Route-level flows such as immediate Test play, retry, next challenge, and direct Practice routes

Prefer focused core tests for framework-independent behavior. For regressions crossing the editor
boundary, add an integration test that reproduces the actual Vim command sequence.

## Repository hygiene

- Do not commit `node_modules/`, `dist/`, generated TypeScript build metadata, or local environment
  files.
- Preserve unrelated user changes and untracked files.
- Avoid editing generated output; change source files and rebuild instead.
- Keep dependencies minimal. Explain any new runtime dependency and check the lockfile for known
  advisories.
