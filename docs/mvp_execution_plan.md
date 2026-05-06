# MVP Development Task Plan

## Usage Rules

- This file is the development task plan for the MVP. It tracks execution, version planning, and update logging.
- Atomic delivery requirements are defined in `docs/mvp_requirement_list.md`.
- Update this file on every development or planning change.
- Mandatory sync events:
- scope changes
- baseline freeze or unfreeze
- version start or finish
- schedule changes
- major risks or blockers
- major technical decisions
- Keep the `Master TODO`, `Version Plan`, `Schedule`, and `Update Log` in sync.
- Every task row should reference one or more requirement IDs from the requirement list.

## Status Legend

- `TODO` = not started
- `IN_PROGRESS` = currently active
- `DONE` = completed
- `BLOCKED` = cannot proceed yet
- `FROZEN` = decided and locked

## Project Snapshot

- Project: `TOTM_MVP_Dev`
- Platform: `H5`, Android browser, `1080x1920` portrait
- Stack: single `HTML + Canvas2D + pure JavaScript`, using ES Modules multi-file organization (`src/` directory with per-module files, loaded via native `<script type="module">`)
- Scope: `Story 1-3 + core feel`
- Delivery order: `Story 1 -> Story 2 -> Story 3`
- Runtime baseline: `fixed 0.02s (50Hz) + update(dt)`
- Art baseline: placeholder color blocks via Canvas, detailed visual spec evolves during implementation
- Naming rule: English-only file and folder names

## Parallel Worktree Rules

- Paths in this document are resolved from `REPO_ROOT` by default.
- `REPO_ROOT` is the master workspace for macro planning, version management, and central status sync.
- Only introduce dedicated branches/worktrees when multiple development threads need to write code in parallel.
- Parallel task execution should use sibling Git worktrees under `WORKTREE_ROOT`.
- Resolve `WORKTREE_ROOT` by taking `../TOTM_MVP_Dev_worktrees` relative to `REPO_ROOT`.
- `WORKTREE_ROOT` and `REPO_ROOT` are sibling directories; `WORKTREE_ROOT` is not inside `REPO_ROOT`.
- Default mapping: task ID -> branch `codex/<task-id-lower>` -> worktree path `WORKTREE_ROOT/<TASK-ID>`.
- Do not manually duplicate the repository into multiple independent workspace copies; use Git branches/worktrees for isolation instead.
- Do not run parallel feature development directly in the master workspace when a dedicated task worktree exists.
- Every task thread must sync its `session id`, branch, worktree path, and status in `docs/worktree_registry.md`.
- Optional thread layering inside one task worktree: one project-progress thread, one task-management thread, and multiple subtask threads.
- Create a dedicated task-management thread when one task will be split across multiple subtask threads.
- Multiple subtask threads may share one task worktree/branch only when they do not write files concurrently.
- In a shared task worktree, allow only one writer thread to edit files or commit at a time.
- If two or more subtask threads need to write in parallel, split them into separate branches/worktrees before editing.
- Before a subtask thread edits in a shared task worktree, refresh context from the latest files and `git status` first.
- The central worktree registry tracks the task-management thread session ID for each worktree; subtask thread IDs should sync inside that task-management thread.
- When a task is merged, frozen, or abandoned, update both the registry and the execution-plan update log.

## Acceptance Baseline

- `FROZEN` Input buffer: `0.1s`
- `FROZEN` Player movement source baseline: `_runSpeed = 5.0 world units/s`, `TileSize = 0.12 world units/tile`; implementation primary units are World movement coordinates, while about `41.67 tiles/s` is only a derived display/validation value
- `FROZEN` Four-direction slide until blocked
- `FROZEN` Cross-device feel consistency via fixed-step gameplay loop
- `FROZEN` `Story 1-3` each supports full start -> fail/clear loop
- `FROZEN` Cleared stages can be replayed freely
- `FROZEN` Restart available within `2s`
- `FROZEN` No stamina cost on restart in MVP
- `FROZEN` UI must not cover the core play area in `1080x1920`
- `FROZEN` Target performance: `>=55 FPS` on mid-range Android devices

## Master TODO

| ID | Status | Requirement IDs | Item | Done When |
|---|---|---|---|---|
| PM-01 | DONE | `R-021` | Create the initial Git baseline commit | Current rules and scripts are committed as repository baseline |
| PM-02 | DONE | `R-001,R-002,R-003,R-005,R-006,R-007,R-008,R-009,R-010,R-011,R-012,R-013,R-014,R-015,R-020` | Write the first technical design document | Runtime loop, grid format, state flow, input, collision subset, level format, HUD, debug plan, and deployment path are documented |
| ENG-01 | DONE | `R-002,R-003,R-004` | Create the runnable project skeleton | `index.html` + `src/` ES Modules directory structure in place, Canvas init, GameLoop, GameState running, blank Canvas refreshing at 60fps |
| ENG-02 | DONE | `R-005,R-010,R-015` | Implement the runtime foundation | TileType, GridMap, StageLoader, Renderer + Camera wired, can load JSON stage and render tile visuals |
| ENG-03 | DONE | `R-006,R-008` | Implement input foundation | Touch swipe and keyboard input both work through one input layer, emitting standardized direction commands in the `playing` state |
| ENG-04 | DONE | `R-007,R-008,R-009,R-011` | Implement core movement feel | `R-009` three-coordinate-domain movement and `R-008` `0.1s/100ms` input buffering are complete and formally closed by the `2026-05-01` ENG-04 × ENG-05 joint real-browser regression; both tested pages loaded `eng04_input_buffer_v1`, with result `PASS` |
| ENG-05 | DONE | `R-012,R-013,R-015` | Implement minimal gameplay UI | HUD/state flow passed the `2026-05-01` joint real-browser regression. Buttons, popups, HUD sync, input lockout, click/resize timing, and replay fallback were all rechecked as `PASS` |
| LVL-01 | DONE | `R-010,R-011,R-012,R-017` | Integrate `Story 1` | The `story_001` main path was completed in the `2026-05-01` ENG-04 × ENG-05 real-browser regression: startup, sliding, collection/HUD, clear, replay, click/resize, and cache-version confirmation |
| QA-01 | DONE | `R-006,R-007,R-008,R-009,R-017` | Finish `Story 1` feel validation | Closed by `docs/features/qa01_story1_feel_validation_closeout.md`: four-direction sliding and `100ms` buffering passed `2026-05-01` real-browser regression; `<50ms` response is closed by input-path code review and the documented `44ms` engineering budget, not by high-speed-camera measurement |
| OPS-01 | DONE | `R-020` | Set up GitHub Pages deployment | GitHub Pages URL opens the current playable build; desktop and Android-device smoke passed; mobile touch swipe, continuous no-lift swiping, multi-touch interference, long-hold-then-swipe, and the main smoke path are all validated as `PASS`; final input baseline is `0.03 / 0.16` distance thresholds, `SWIPE_TIME_SECONDS = 1.0`, and `activeTouchId` primary-touch tracking |
| LVL-02 | TODO | `R-010,R-011,R-012,R-018` | Integrate `Story 2` | Stage is fully playable and does not regress `Story 1` |
| QA-02 | TODO | `R-017,R-018` | Finish `Story 1-2` regression pass | Shared feel and state flow stay consistent across both stages |
| LVL-03 | TODO | `R-010,R-011,R-012,R-019` | Integrate `Story 3` | Stage is fully playable and closes the first MVP stage set |
| QA-03 | TODO | `R-017,R-018,R-019` | Finish `Story 1-3` regression pass | All three stages are replayable and stable |
| PERF-01 | TODO | `R-016` | Run Android performance pass | Mid-range Android browser stays near target FPS |
| REL-01 | TODO | `R-001,R-016,R-017,R-018,R-019,R-020` | Prepare MVP freeze candidate | `v0.3.1` contains fixes only and no scope expansion |

## Deferred Scope Notes

| ID | Status | Requirement IDs | Item | Notes |
|---|---|---|---|---|
| FUT-01 | FROZEN | `R-022` | Keep Lava implementation out of the current Story `1-3` delivery path | Revisit only if scope expands beyond current MVP. |

## Version Plan

| Version | Status | Task IDs | Goal | Exit Criteria |
|---|---|---|---|---|
| `v0.0.1` | DONE | `PM-01` | Repository baseline | Git initialized, rules/scripts committed |
| `v0.1.0` | DONE | `PM-02, ENG-01, ENG-02, ENG-03` | Design + foundation | Technical design doc exists, stage-data path is defined, and runnable framework exists. PM-02, ENG-01, ENG-02, and ENG-03 are complete |
| `v0.1.1` | DONE | `ENG-04, ENG-05, LVL-01, QA-01, OPS-01` | Core feel + `Story 1` + URL access | ENG-04, ENG-05, LVL-01, QA-01, and OPS-01 are all closed; the `Story 1` main path, online URL access, desktop smoke, and Android input smoke are `PASS` |
| `v0.2.0` | TODO | `LVL-02, QA-02` | `Story 2` | `Story 1-2` both playable and regression checked |
| `v0.3.0` | TODO | `LVL-03, QA-03` | `Story 3` | `Story 1-3` all playable and replayable |
| `v0.3.1` | TODO | `PERF-01, REL-01` | Stabilization | Fixes only, no new feature scope |

## Schedule

| Window | Version | Focus |
|---|---|---|
| `2026-04-06` | `v0.0.1` | Git baseline commit |
| `2026-04-06` to `2026-04-21` | `v0.1.0` (design phase) | Technical design documents (PM-02 complete) |
| `2026-04-22` to `2026-04-25` | `v0.1.0` (coding phase) | Project skeleton (ENG-01), runtime foundation (ENG-02), input layer (ENG-03) |
| `2026-04-26` to `2026-05-01` | `v0.1.1` | Core movement feel (ENG-04), minimal gameplay UI (ENG-05), `Story 1` integration (LVL-01), feel validation (QA-01), deployment (OPS-01), and R-008/R-009 regression closeout |
| `2026-05-02` to `2026-05-03` | `v0.2.0` | `Story 2` integration (LVL-02), regression pass (QA-02) |
| `2026-05-04` to `2026-05-06` | `v0.3.0` | `Story 3` integration (LVL-03), regression pass (QA-03) |
| `2026-05-07` to `2026-05-09` | `v0.3.1` | Performance pass (PERF-01), freeze candidate (REL-01) |

## Open Items

- `NON_BLOCKING` Detailed H5 art spec remains implementation-driven by design.
- `REFERENCE_ONLY` Lava values remain documented but are not part of current Story `1-3` delivery scope.

## Update Log

| Date | Type | Summary | Impact |
|---|---|---|---|
| `2026-04-06` | `INIT` | Created the MVP execution plan from the macro planning discussion. | Established the first planning baseline. |
| `2026-04-06` | `BASELINE` | Frozen macro scope, runtime model, naming rule, and acceptance baseline. | MVP can enter execution. |
| `2026-04-06` | `ENV` | Initialized Git and enabled project hook path. | Version management is ready; initial commit was pending at that point. |
| `2026-04-06` | `DOC` | Added a Chinese mirror version of the MVP execution plan. | Planning docs are now maintained in both EN and ZH. |
| `2026-04-06` | `STRUCTURE` | Added the requirement list and linked tasks to requirement IDs. | The document structure now matches requirement -> task separation. |
| `2026-04-06` | `REFINE` | Added level-data, tile subset, deployment, version-boundary, and QA metric refinements. | Task plan now matches the current MVP implementation boundary more closely. |
| `2026-04-06` | `GIT` | Completed the initial Git baseline commit `0b34495`. | `PM-01` and `v0.0.1` are now done. |
| `2026-04-06` | `WORKTREE` | Adopted the sibling worktree strategy and initialized the `PM-02` task worktree baseline. | Parallel task threads now have an isolated execution model and a central sync path. |
| `2026-04-06` | `STATUS` | Set PM-02 to IN_PROGRESS and moved 0.1.0 into active execution. | The technical-design track is now the current macro execution focus. |
| `2026-04-06` | `THREAD_MODEL` | Added the project-progress / task-management / subtask-thread collaboration model. | Future task threads can scale without introducing unnecessary branches or worktrees. |
| `2026-04-21` | `TECH_DECISION` | Added ES Modules multi-file code organization to project snapshot; updated ENG-01/ENG-02 Done When to align with PM-02 2.8.2 implementation phases. | Code organization decision synced from PM-02 to execution plan; task acceptance criteria are now more specific. |
| `2026-04-21` | `STATUS` | PM-02 marked DONE (all technical design documents produced); schedule re-baselined from 4/21, v0.1.0 split into design phase (complete) and coding phase (4/22-4/25), overall target close 5/9. | Project transitions from design phase to coding phase; schedule aligned with actual progress. |
| `2026-04-23` | `WORKTREE` | Created the `ENG-01` task branch `codex/eng-01` and its sibling worktree, then synced the result to the central registry. | The next coding task now has an isolated execution environment and can start in its dedicated task-management thread. |
| `2026-04-23` | `DOC_RULE` | Migrated workspace-path references in the baseline docs from machine-specific absolute paths to the `REPO_ROOT` / `WORKTREE_ROOT` anchor convention, and synced the related mirrors and templates. | Cross-device sync no longer depends on fixed drive letters, reducing path-maintenance overhead in versioned docs. |
| `2026-04-23` | `CODE` | Completed the `ENG-01` project skeleton: added `index.html`, `src/main.js`, `src/GameLoop.js`, and `src/GameState.js`, then passed local HTTP and Node smoke verification. | The runnable framework for `v0.1.0` now exists; ENG-02 runtime foundation and ENG-03 input foundation can be connected next. |
| `2026-04-23` | `CODE` | Completed the `ENG-02` runtime foundation in commit `b1b69b4`: added `TileType`, `GridMap`, `StageLoader`, `Renderer`, and `stages/story_001.json`, then wired startup loading and rendering for `story_001`. | `v0.1.0` now has the JSON stage-loading and tile-rendering chain; ENG-03 input foundation remains next. |
| `2026-04-23` | `CODE` | Completed the `ENG-03` input foundation: added `TouchInput`, `KeyboardInput`, and `InputManager`, then wired `main.js` to start and stop them by `playing` state while emitting direction commands to the console; Node smoke verification passed. | The `v0.1.0` foundation layer is now closed, and core movement feel work can proceed in ENG-04. |
| `2026-04-24` | `STATUS` | `ENG-04` completed the core movement chain and the minimal `ENG-05` HUD/state-flow bridge in code and passed Node smoke, but browser feel validation is still pending so the task remains `IN_PROGRESS` instead of `DONE`. | `v0.1.1` is now active; `ENG-05` currently has a startup boundary only and must not be marked `DONE` before `ENG-04` is validated and closed. |
| `2026-04-24` | `RISK` | If later browser feel validation requires changes to `ENG-04` timing, movement feel, or state boundaries, `ENG-05` may require integration follow-up. | UI/state-flow work should stay aligned to the final `ENG-04` validation outcome instead of freezing its interaction boundary too early. |
| `2026-04-24` | `CODE` | `ENG-05` has moved from the transition bridge into formal implementation: `HUD.js` now includes `menu/loading/fail/complete` overlay states, layout and hit areas scaled from the `1080x1920` design baseline, and fail/clear button action mapping; `main.js` now wires the start screen, the `Story 1` startup path, fail restart, and the replay fallback when only `story_001` is currently integrated, with browser-stub smoke verification passing. | `ENG-05` has moved from `TODO` to `IN_PROGRESS`. The minimal gameplay UI now has the main start -> play -> clear/fail -> restart/replay loop in code, but still requires real-browser manual validation and final integration with `ENG-04`. |
| `2026-04-24` | `DOC` | Added three supporting documents for `ENG-04 × ENG-05` integration validation: `docs/features/eng04_eng05_joint_acceptance_card.md`, `docs/features/eng04_eng05_joint_acceptance_checklist.md`, and `docs/features/eng04_eng05_browser_validation_log_template.md`, then added relative-path cross-links among them. | Real-browser integration runs, on-site checklist execution, and issue logging now have a unified document set, making it easier to keep the combined `ENG-04` / `ENG-05` acceptance criteria aligned. |
| `2026-04-26` | `VALIDATION` | `ENG-04 × ENG-05` completed real-browser joint validation: `story_001` startup, sliding, collection/HUD, clear, replay, and click/resize checks passed; the local `eng04_death_validation` stage passed Spikes death, fail popup, restart recovery, input lockout, and click/resize checks. | The conclusion at the time was that `ENG-04` and `ENG-05` could be marked `DONE`; this conclusion is superseded by the `2026-04-27` runspeed baseline reopen record. |
| `2026-04-27` | `BASELINE` | Corrected `R-009` from the then-current reverse report: `_runSpeed = 5.0` is the base value and is multiplied by `_gameStageScale = 1.6`, yielding `8.0 tiles/s` effective movement. | This conclusion is superseded by the `2026-04-28` frame-check and reverse-validation record; retained as history only. |
| `2026-04-28` | `BASELINE` | Corrected `R-009` again: `_runSpeed = 5.0` is measured in `world units/s`, `TileSize = 0.12 world units/tile`, and the current tile-grid implementation should use about `41.67 tiles/s`; `_gameStageScale = 1.6` does not participate in player tile displacement conversion. | Supersedes the `8.0 tiles/s` code-correction direction; the corrected baseline is now implemented and regressed by the `2026-05-01` ENG-04 code/validation records. |
| `2026-04-29` | `DESIGN` | Upgraded `ENG-04` runspeed correction from a minimal derived-speed patch to a stricter coordinate-domain design: Tile topology remains authoritative for stages/collision/events, World movement coordinates become the primary player displacement/speed units, and Screen/Design pixels remain rendering/HUD-only. | The design direction is now represented by the `2026-05-01` implementation and real-browser regression records; remaining status is task closeout, not code correction. |
| `2026-04-30` | `BASELINE` | Corrected `R-008` input buffering: reverse verification confirms `_nextSwipeTimeout = 0.1f`, or 100ms; the previous `0.02s/20ms` value was an incorrect inherited record. | ENG-04, ENG-03, PM-02, and joint validation docs now use the 100ms window; rapid chaining, expiry, and overwrite semantics were rechecked in the `2026-05-01` regression. |
| `2026-05-01` | `CODE` | Completed the ENG-04 baseline implementation pass: `CoordinateSystem` now exposes half-tile/center APIs while keeping `tileToWorld()` origin semantics, `PlayerController` uses a 100ms buffer with countdown in `update(deltaTime)`, `fixedUpdate()` remains responsible for displacement, and module cache queries now use `eng04_input_buffer_v1`. | Automated syntax and behavior checks passed for coordinate APIs, input-buffer validity/expiry/overwrite, movement, collection, death, clear, and chained-turn behavior. |
| `2026-05-01` | `VALIDATION` | Completed real-browser regression for `story_001`, rapid chained sliding with AHK boundary testing, `eng04_death_validation`, popup input lockout, click/resize alignment, and cache-version confirmation. | The R-008/R-009 code pass is validated in browser; both tested pages loaded `eng04_input_buffer_v1` and the recorded result is `PASS`. |
| `2026-05-01` | `STATUS` | Formally closed ENG-04, ENG-05, and LVL-01 as `DONE` based on the archived ENG-04 × ENG-05 joint real-browser regression results. | The `story_001` main path entered the master-branch baseline; QA-01 was left for a separate follow-up closeout at that point. |
| `2026-05-01` | `QA` | Closed QA-01 with `docs/features/qa01_story1_feel_validation_closeout.md`: real-browser regression covers four-direction sliding and `100ms` buffering; input-path review and ENG-03 timing budget cover the `<50ms` response target at about `44ms` worst case. | QA-01 is now `DONE`; the closeout explicitly notes that no high-speed-camera or baseline-device frame measurement was added in this pass. |
| `2026-05-06` | `OPS` | Closed OPS-01: the GitHub Pages playable URL, desktop smoke, Android-device button hit testing, ordinary swiping, continuous no-lift swiping, multi-touch interference, long-hold-then-swipe, and the main smoke path all passed. | OPS-01 is marked `DONE`, and `v0.1.1` is marked `DONE`; the final mobile input baseline uses the competitor-original `0.03 / 0.16` distance thresholds, `SWIPE_TIME_SECONDS = 1.0`, and `activeTouchId` primary-touch tracking. |








