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
- `WORKTREE_ROOT` = `../TOTM_MVP_Dev_worktrees` relative to `REPO_ROOT`.
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
| `ENG-01` | `codex/eng-01` | `WORKTREE_ROOT/ENG-01` | `TBD` | `READY` | `2026-04-23` | Task branch and sibling worktree created; waiting for the `ENG-01` task-management thread to take ownership and sync its session ID. |

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



