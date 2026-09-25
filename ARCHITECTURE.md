# Vim Speed Trainer: Architecture and Build Plan

## Goal

Build a static Vim speed trainer inspired by Monkeytype and Aimlabs. Players transform a starting
document into a target as quickly as possible using Vim controls.

The MVP has no accounts or backend, but its core engine must support future ranked leaderboards and
real-time versus matches.

## Product scope

### Test (`/`)

The homepage opens directly into a ready challenge—no landing page, login, or onboarding gate.

- Focus the editor on load.
- Show the target document in a read-only side-by-side panel throughout the attempt.
- Start timing on the first document-changing input.
- Finish automatically when the document matches the target.
- Show time, keystrokes, personal best, retry, and next challenge.
- Store completed runs locally.
- Do not show hints during an attempt.

Whether navigation should also start the timer is an open playtesting decision. The MVP default is
the first document mutation.

### Practice (`/practice`)

Practice is a separate menu destination.

- Browse scenarios by skill, language, difficulty, and pack.
- Repeat a selected scenario at `/practice/:id`.
- Show the target in a read-only side-by-side panel and allow reset, hints, and suggested solutions.
- Keep Practice results separate from Test personal bests.

### MVP boundaries

Include built-in packs, exact-text completion, deterministic variants, JSON import, local history,
personal bests, and editor settings.

Exclude accounts, cloud sync, public publishing, global leaderboards, matchmaking, code execution,
and server-side anti-cheat.

## Technology

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- CodeMirror 6 + `@replit/codemirror-vim`
- React Router
- Zod for scenario validation
- IndexedDB for imported content and runs
- `localStorage` for small preferences
- Vitest, React Testing Library, and Playwright

## Architecture

```text
React UI and routes
├── Test, Practice, History, Settings
├── Game engine (plain TypeScript)
│   ├── Session state machine
│   ├── Scenario generation
│   ├── Completion evaluation
│   └── Metrics and scoring
├── EditorAdapter
│   └── CodeMirror + Vim
├── PersistenceAdapter
│   └── IndexedDB
└── Future service adapters
    ├── Auth and ranked results
    └── Matchmaking and realtime transport
```

The game engine must not import React, CodeMirror, or IndexedDB. CodeMirror owns live document
state; React should not copy the document into state on every keypress.

```text
src/
├── app/                 # router, shell, providers
├── components/ui/       # shadcn/ui
├── features/            # test, practice, history, settings
├── core/                # game, scenarios, scoring, telemetry
├── editor/              # adapter and CodeMirror implementation
├── persistence/         # adapter and IndexedDB implementation
├── scenarios/           # bundled JSON packs
└── test/
```

## Core design

### Session lifecycle

```text
loading → ready → active → completed
                    ├── reset → ready
                    └── abandon → abandoned
```

Use `performance.now()` through an injectable clock for elapsed time. Store wall-clock timestamps
only for history display.

### Editor boundary

```ts
interface EditorAdapter {
  loadDocument(input: EditorDocument): void
  getDocument(): string
  focus(): void
  reset(): void
  setReadOnly(value: boolean): void
  onDocumentChange(listener: ChangeListener): Unsubscribe
  onVimEvent(listener: VimEventListener): Unsubscribe
}
```

The adapter should expose document and mode changes, cursor data, Vim commands when available, and
paste detection where feasible.

### Completion and metrics

Implement exact matching first. Only normalize line endings or trailing whitespace when configured.
Never execute imported code.

Record elapsed time, keystrokes, observable Vim commands, undo/reset counts, mode durations, paste
indicators, focus changes, scenario version, and seed.

Personal bests rank by successful completion, lowest time, then fewest keystrokes. Avoid a composite
efficiency score until real usage data exists.

## Scenario JSON

Every file must have a `schemaVersion`. Validate imports with Zod and show errors with actionable
JSON paths.

```json
{
  "schemaVersion": 1,
  "type": "scenario",
  "id": "javascript.extract-variable.001",
  "contentVersion": "1.0.0",
  "title": "Extract repeated expression",
  "description": "Replace the repeated expression with a local variable.",
  "difficulty": "medium",
  "tags": ["javascript", "change"],
  "language": "javascript",
  "startText": "function total(items) {\n  return items.length * 10 + items.length;\n}\n",
  "targetText": "function total(items) {\n  const count = items.length;\n  return count * 10 + count;\n}\n",
  "cursor": { "line": 1, "column": 2 },
  "editor": { "tabSize": 2, "insertSpaces": true },
  "rules": { "allowClipboard": false },
  "validation": {
    "type": "exact",
    "normalizeLineEndings": true,
    "ignoreTrailingWhitespace": false,
    "ignoreBlankLines": true
  },
  "reference": {
    "parKeystrokes": 28,
    "suggestedSolution": "Optional command sequence"
  }
}
```

Lines and columns are zero-based. IDs remain stable; increment `contentVersion` when a change
affects run comparability. Built-in start and target documents are newline-terminated. When
`ignoreBlankLines` is enabled, empty and whitespace-only lines do not affect exact-match completion;
all content on nonblank lines remains exact.

Packs wrap scenarios:

```json
{
  "schemaVersion": 1,
  "type": "scenario-pack",
  "id": "community.javascript-basics",
  "contentVersion": "1.0.0",
  "name": "JavaScript Basics",
  "author": "Example Author",
  "scenarios": []
}
```

Import flow: parse, validate, check duplicate IDs, preview conflicts, then save. Treat imported text
as untrusted and never render it as HTML.

Random variants should use authored finite choices and a seeded generator. The same scenario version
and seed must always resolve identically; do not use `Math.random()` in scenario resolution.

## Persistence

Keep IndexedDB behind an adapter that handles scenarios, packs, runs, personal bests, and data
export/import. Use versioned migrations. If storage fails, built-in scenarios must remain playable
in memory.

## Future ranked and versus modes

Local results are unverified. A ranked server must issue the scenario version, seed, rules, and
signed attempt token, then validate the final state and event log.

```ts
interface RunResult {
  runId: string
  mode: 'test' | 'practice'
  scenarioId: string
  scenarioContentVersion: string
  seed: string
  startedAt: string
  elapsedMs: number
  completed: boolean
  finalDocumentHash: string
  metrics: RunMetrics
  events?: ReplayEvent[]
  clientVersion: string
}
```

Versus mode reuses the same engine: the server gives both players the same scenario and seed,
receives throttled progress, validates completion, and declares the winner. Do not build backend
placeholders during the MVP beyond narrow repository interfaces.

## Testing priorities

- Scenario validation, versions, and deterministic generation.
- Completion normalization, session transitions, and fake-clock timing.
- Personal-best ordering and persistence migrations.
- Vim motions, operators, counts, text objects, visual mode, registers, undo, repeat, and search.
- Homepage immediate play, completion, retry, and next via keyboard.
- Import errors, refresh persistence, storage fallback, and direct route loading.

## Implementation phases

### 1. Foundation

Initialize the stack, routes, linting, tests, and source structure. `/` is Test and `/practice` is
separate. Verify the static production build and SPA route fallback.

### 2. Editor spike

Integrate CodeMirror/Vim behind `EditorAdapter`, expose mode and telemetry, and test supported Vim
behavior. Document limitations before building substantial UI; Vim fidelity is the main technical
risk.

### 3. Scenarios

Implement Zod schemas, exact validation, deterministic generation, and 10–20 handcrafted scenarios.
Give every built-in scenario a verified solution and completion test.

### 4. Test homepage

Implement the session engine and make `/` immediately playable. Add timing, automatic completion,
results, retry, next, errors, and in-memory fallback. Completion must fire once and freeze the
result.

### 5. Practice

Add scenario browsing and `/practice/:id`, including reset, reveal, hints, repetition, and filters.
Keep Practice metrics separate from Test records.

### 6. Persistence and import

Add IndexedDB migrations, history, personal bests, JSON import with conflict preview, pack deletion,
and data export/import. Bad files or unavailable storage must not prevent play.

### 7. Release polish

Finalize keyboard focus, accessibility, responsive layout, themes, loading, error states, CI, and
static deployment. Verify cold-load Test usability and direct route refreshes.

### 8. Validate before backend work

Use playtesting to refine scenario length, difficulty, timer behavior, scoring, and missing Vim
features. Later phases add accounts, server-validated rankings, and then versus matchmaking.

## MVP definition of done

A visitor can open `/`, immediately complete a timed Vim challenge, view the result, and start
another. They can separately practice selected skills, import validated JSON scenarios, and retain
local content and records—all from a static deployment without an account or backend.
