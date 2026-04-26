# Worktree Registry

## Usage Rules

- This file is the central registry for task-to-branch-to-worktree mapping.
- Update this file whenever a task worktree is created, assigned, paused, resumed, merged, or removed.
- `REPO_ROOT` is reserved for macro planning, version management, and central progress sync.
- Active task implementation should run in sibling worktrees under `WORKTREE_ROOT`.
- Default branch pattern: `codex/<task-id-lower>`.
- Default worktree path pattern: `WORKTREE_ROOT/<TASK-ID>`.
- Every dedicated task thread must sync its `session id`, branch, path, and latest status here.
- The `Session ID` column stores the task-management thread session ID for that worktree, not every subtask thread ID.
- Subtask thread IDs under the same worktree should sync inside the task-management thread instead of this central registry.
- In a shared task worktree, only one subtask thread may write files or commit at a time.
- If subtask threads need parallel writes, split them into separate branches/worktrees first.
- If a new external worktree triggers Git `dubious ownership`, add that path to global Git `safe.directory` before using Git inside the task workspace.
- When a task closes, keep one final log entry before removing the worktree row or marking it archived.

## Path Anchor Conventions

- `REPO_ROOT` = the current repository root directory.
- Resolve `WORKTREE_ROOT` by taking `../TOTM_MVP_Dev_worktrees` relative to `REPO_ROOT`.
- `WORKTREE_ROOT` and `REPO_ROOT` are sibling directories; `WORKTREE_ROOT` is not inside `REPO_ROOT`.
- Unless noted otherwise, relative paths in versioned documents are resolved from `REPO_ROOT`.
- Before running commands, passing arguments to Git/Shell, or delivering local paths in chat, expand `REPO_ROOT` / `WORKTREE_ROOT` to the current machine's absolute paths.

## Workspace Roles

| Path | Role |
|---|---|
| `REPO_ROOT` | Master workspace for macro discussion, planning docs, version control baseline, and status coordination |
| `WORKTREE_ROOT` | Container root for isolated task execution worktrees |

## Active Worktrees

| Task ID | Branch | Worktree Path | Session ID | Status | Last Update | Notes |
|---|---|---|---|---|---|---|
| `PM-02` | `codex/pm-02` | `WORKTREE_ROOT/PM-02` | `019d62cd-a740-79c3-b420-88f6f37d2128` | `DONE` | `2026-04-21` | All technical design documents produced: PM-02 core runtime, ENG-02 stage format, ENG-03 input layer, ENG-04 movement feel, ENG-05 HUD state flow, debug panel spec. |
| `ENG-01` | `codex/eng-01` | `WORKTREE_ROOT/ENG-01` | `TBD` | `DONE` | `2026-04-23` | Task-management thread has taken ownership and completed the project skeleton: `index.html`, `src/main.js`, `src/GameLoop.js`, and `src/GameState.js`. Stable session ID is not available in this session, so `TBD` is retained. |
| `ENG-02` | `codex/eng-02` | `WORKTREE_ROOT/ENG-02` | `TBD` | `DONE` | `2026-04-23` | Runtime foundation completed in commit `b1b69b4`: `TileType`, `GridMap`, `StageLoader`, `Renderer + Camera`, and `story_001` JSON are wired, with Node smoke, HTTP access, and `1080x1920` device-emulation checks passed. |
| `ENG-03` | `codex/eng-03` | `WORKTREE_ROOT/ENG-03` | `TBD` | `DONE` | `2026-04-23` | Input foundation completed: `TouchInput`, `KeyboardInput`, and `InputManager` are wired into `main.js`, emitting unified direction commands in the `playing` state; stable session ID remains `TBD`. |
| `ENG-04` | `codex/eng-04` | `WORKTREE_ROOT/ENG-04` | `TBD` | `DONE` | `2026-04-26` | The core movement chain has completed real-browser manual validation: four-way sliding, wall stop, input buffering, step-synced collectible disappearance, Exit movement finish, Spikes death, and post-`stageClearPending` input lockout all passed; the early collectible-disappear issue was fixed and regressed successfully. |
| `ENG-05` | `codex/eng-05` | `WORKTREE_ROOT/ENG-05` | `TBD` | `DONE` | `2026-04-26` | The minimal gameplay UI completed real-browser joint validation with `ENG-04` inside `WORKTREE_ROOT/ENG-04`: start, loading, fail popup, clear popup, restart, replay fallback, HUD counts, button hit areas, and resize behavior all passed; `eng04_death_validation` remains as the local death-chain validation stage. |

## Update Log

| Date | Type | Summary | Impact |
|---|---|---|---|
| `2026-04-06` | `INIT` | Established the sibling worktree container strategy and created the first task worktree at `WORKTREE_ROOT/PM-02`. | Parallel development can start with isolated branches and centralized status tracking. |
| `2026-04-06` | `SAFE_GIT` | Registered the resolved absolute path for `WORKTREE_ROOT/PM-02` in global Git `safe.directory`. | Dedicated task threads can run Git inside the external worktree without ownership errors. |
| `2026-04-06` | `STATUS` | Marked PM-02 as IN_PROGRESS in the central registry. | Task-state tracking now matches the execution plan. |
| `2026-04-06` | `SESSION` | Synced the task-management thread session ID `019d62cd-a740-79c3-b420-88f6f37d2128` for `PM-02`. | The central registry can now directly track the management session for this task. |
| `2026-04-06` | `THREAD_MODEL` | Clarified that the central registry stores task-management thread IDs only. | Subtask threads can now stay lightweight without polluting the cross-task registry. |
| `2026-04-21` | `STATUS` | PM-02 marked DONE; all technical design documents produced. | PM-02 worktree can be archived or reused. |
| `2026-04-23` | `WORKTREE` | Created the `ENG-01` task branch `codex/eng-01` and sibling worktree `WORKTREE_ROOT/ENG-01`, then registered them in the central registry. | The next task now has an isolated execution environment and can start in its own task-management thread. |
| `2026-04-23` | `STATUS` | `ENG-01` completed the project skeleton and passed local HTTP plus Node smoke verification. | `WORKTREE_ROOT/ENG-01` can enter commit/merge closure, and later foundation tasks can continue from this skeleton. |
| `2026-04-23` | `WORKTREE` | Registered the existing `ENG-02` task branch `codex/eng-02` and sibling worktree `WORKTREE_ROOT/ENG-02` in the central registry. | The runtime-foundation task now has an isolated execution environment and can start in its own task-management thread. |
| `2026-04-23` | `STATUS` | `ENG-02` completed the runtime foundation and committed `b1b69b4`. | `WORKTREE_ROOT/ENG-02` can enter merge/archive closure; the remaining `v0.1.0` coding item is ENG-03 input foundation. |
| `2026-04-23` | `WORKTREE` | Created the `ENG-03` task branch `codex/eng-03` and sibling worktree `WORKTREE_ROOT/ENG-03`, then registered them in the central registry. | The input-foundation task now has an isolated execution environment and can start in its own task-management thread. |
| `2026-04-23` | `STATUS` | `ENG-03` completed the input-foundation implementation and passed Node smoke verification. | `WORKTREE_ROOT/ENG-03` now has the unified input-command layer, and the `v0.1.0` foundation coding scope is complete. |
| `2026-04-24` | `WORKTREE` | Created the `ENG-04` task branch `codex/eng-04` and sibling worktree `WORKTREE_ROOT/ENG-04`, then registered them in the central registry. | The core-movement-feel task now has an isolated execution environment and can start in its own task-management thread. |
| `2026-04-24` | `STATUS` | `ENG-04` completed the core movement chain and the minimal `ENG-05` HUD/state-flow bridge in code and passed Node smoke, but browser feel validation is still pending so the task remains `IN_PROGRESS`. | `ENG-05` currently has a startup boundary only and must not be marked `DONE` before `ENG-04` is validated; later `ENG-04` adjustments may require `ENG-05` integration follow-up. |
| `2026-04-24` | `WORKTREE` | Created the `ENG-05` task branch `codex/eng-05` and sibling worktree `WORKTREE_ROOT/ENG-05`, then registered them in the central registry. | The minimal-playable-UI task now has an isolated execution environment and can start in its own task-management thread. |
| `2026-04-24` | `STATUS` | `ENG-05` moved from `READY` to `IN_PROGRESS`: the current worktree has completed the first formal HUD/state-flow implementation pass, including `menu/loading/fail/complete` overlays, the start button entering `story_001`, fail restart, and replay fallback when only `story_001` is integrated; the main path has passed browser-stub smoke validation. | `WORKTREE_ROOT/ENG-05` is now in active development, but still needs integration slack before final closure because `ENG-04` has not been fully validated yet. |
| `2026-04-24` | `DOC` | Added the `ENG-04 × ENG-05` joint acceptance card, short execution checklist, and real-browser validation log template under `WORKTREE_ROOT/ENG-05/docs/features/`, then added relative-path links among the three documents. | The `ENG-05` task-management thread now has a complete local document set for integration runs, issue tracking, and closure preparation inside the current worktree. |
| `2026-04-26` | `VALIDATION` | `ENG-04 × ENG-05` completed real-browser joint validation in `WORKTREE_ROOT/ENG-04`, and both `ENG-04` and `ENG-05` were marked `DONE`. | The default `story_001` path and the `eng04_death_validation` death-validation path both passed; later LVL-01/QA-01 closure can proceed, but browser regressions should force-refresh or use an incognito window to avoid ES Module cache false positives. |



