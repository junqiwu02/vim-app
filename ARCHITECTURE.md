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
- Replace the editing workspace on completion with results and side-by-side replays of the player's
  attempt and the verified suggested solution.
- Show time, keystrokes, personal best, retry, random, and next challenge with the replay results.
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

### Post-completion replay results

Completion replaces the editable-document/target workspace; it must not appear as a modal layered
over the completed editor. Keep the run heading and compact result metrics, then use the same
two-column visual language as the editing workspace:

- **Your replay** starts at the scenario's original document and cursor and shows the frozen state
  after each recorded input.
- **Suggested replay** starts from that same state and shows the result of each authored suggested
  input. It is revealed only after completion in Test mode. If an imported scenario has no verified
  replay, show an explicit unavailable state rather than attempting to interpret display text.
- Put each replay's complete key sequence directly below its viewer. Distinguish executed, current,
  and remaining keys without relying on color alone. Wrap eagerly after semantic boundaries such as
  `<Esc>` and `<Enter>`, otherwise wrap at the available width. Limit the viewport to three key rows
  and automatically scroll it up or down to keep the current key visible.
- A single comparison step drives both panels. At step zero both show the original state; advancing
  applies one input to each replay. When one sequence is shorter, hold its final frame while the
  other continues. Show `step / total` for each side.
- Use `h` and `l` for previous and next, with Left and Right Arrow aliases. Also provide labeled
  Previous and Next buttons for discoverability, touch, and assistive technology. Ignore replay
  shortcuts when an interactive control has focus or a modifier is held.
- Move the completion label, personal-best status, elapsed time, and total keystrokes into a result
  summary above the replay grid. Put retry, random, and next-drill actions below it. Preserve the
  post-completion `:e`, `:n`, and `:w` commands even though the live editor is unmounted. A
  result-level command buffer takes precedence over replay shortcuts after `:` is entered.
- On completion, move focus to a labeled results region and announce completion once. The replay
  viewers themselves are read-only and removed from the tab order.

Replay is a rendering of recorded editor observations, not a second game session. Define plain,
framework-independent data contracts in `src/core/`, while all key normalization, Vim handling,
cursor extraction, and suggested-key execution remain in `src/editor/`:

```ts
type ReplayKey = string // one normalized key, such as "d", " ", "<Esc>", or "<Enter>"

interface ReplayFrame {
  key?: ReplayKey // absent for the initial frame
  document: string
  selection: { anchor: number; head: number }
  mode: string
}

interface AttemptReplay {
  frames: ReplayFrame[] // frame zero is always the authored initial state
}
```

Capture a frame after each handled editor input, including non-mutating Vim inputs such as an
operator prefix or mode change. Store document snapshots initially: drills are deliberately small,
and snapshots avoid replay drift across CodeMirror/Vim upgrades. Paste and composition must produce
explicit normalized events and a resulting snapshot; never reconstruct user replay by executing
untrusted text.

The existing `reference.suggestedSolution` remains human-readable display text. Add an optional
structured `reference.suggestedKeystrokes: ReplayKey[]` for deterministic playback. Array entries
are individual keys, so literal spaces are distinct from named keys and visual separators. Validate
the field through the scenario Zod schema. Every bundled sequence must be executed through the real
Vim editor adapter in a test and must reach the scenario target; imported scenarios without this
field remain playable.

Treat imported suggested keys as untrusted input. Bound the sequence length and token length in the
schema, accept only normalized keyboard tokens, and run them in an isolated replay adapter with no
application callbacks or external side effects. Show the suggested replay only if isolated playback
reaches the target under the scenario's declared normalization rules.

Keep the current-attempt replay in memory for the first version. Do not migrate IndexedDB or add
replay data to `RunResult` until history replay is a product requirement. If replay persistence is
added later, make `events` optional, version the event format, and preserve the scenario content
version, seed, and initial cursor needed for deterministic display.

Implementation order:

1. Add replay contracts and structured suggested keystrokes, migrate bundled solutions, and verify
   each authored sequence against its target through the actual Vim adapter.
2. Extend the editor boundary with one post-input replay callback that freezes the normalized key,
   document, selection, and mode together. Make this recorder the source of truth for the displayed
   and saved keystroke count so completion cannot omit its final key.
3. Add a read-only replay viewer in `src/editor/` and a results/replay feature component that owns
   the shared step index and keyboard controls. Do not put CodeMirror state into the session engine.
4. Replace the completed workspace in `RunExperience`, relocate the existing result content and
   actions, and retain result-level handling for `:e`, `:n`, and `:w` after `VimEditor` unmounts.
5. Add responsive behavior: two columns at desktop widths and stacked panels on narrow screens, with
   the shared controls and key strips remaining visible and usable.
6. Cover recorder ordering, the completion key, undo/paste/mode-only inputs, solution verification,
   synchronized stepping, shortcut exclusions, missing-solution fallback, focus, route actions, and
   mobile layout before removing the old result card styles.

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
    "suggestedSolution": "Optional display command sequence"
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
- Replay capture ordering, deterministic suggested playback, synchronized stepping, focus, and
  keyboard/touch controls on the completion results.
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
replay results, retry, next, errors, and in-memory fallback. Completion must fire once and freeze
the result and its attempt replay.

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
