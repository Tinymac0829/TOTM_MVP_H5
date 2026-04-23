# Worktree Registry

## Usage Rules

- This file is the central registry for task-to-branch-to-worktree mapping.
- Update this file whenever a task worktree is created, assigned, paused, resumed, merged, or removed.
- `E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev` is reserved for macro planning, version management, and central progress sync.
- Active task implementation should run in sibling worktrees under `E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev_worktrees`.
- Default branch pattern: `codex/<task-id-lower>`.
- Default worktree path pattern: `E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev_worktrees\<TASK-ID>`.
- Every dedicated task thread must sync its `session id`, branch, path, and latest status here.
- The `Session ID` column stores the task-management thread session ID for that worktree, not every subtask thread ID.
- Subtask thread IDs under the same worktree should sync inside the task-management thread instead of this central registry.
- In a shared task worktree, only one subtask thread may write files or commit at a time.
- If subtask threads need parallel writes, split them into separate branches/worktrees first.
- If a new external worktree triggers Git `dubious ownership`, add that path to global Git `safe.directory` before using Git inside the task workspace.
- When a task closes, keep one final log entry before removing the worktree row or marking it archived.

## Workspace Roles

| Path | Role |
|---|---|
| `E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev` | Master workspace for macro discussion, planning docs, version control baseline, and status coordination |
| `E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev_worktrees` | Container root for isolated task execution worktrees |

## Active Worktrees

| Task ID | Branch | Worktree Path | Session ID | Status | Last Update | Notes |
|---|---|---|---|---|---|---|
| `PM-02` | `codex/pm-02` | `E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev_worktrees\PM-02` | `019d62cd-a740-79c3-b420-88f6f37d2128` | `DONE` | `2026-04-21` | All technical design documents produced: PM-02 core runtime, ENG-02 stage format, ENG-03 input layer, ENG-04 movement feel, ENG-05 HUD state flow, debug panel spec. |

## Update Log

| Date | Type | Summary | Impact |
|---|---|---|---|
| `2026-04-06` | `INIT` | Established the sibling worktree container strategy and created the first task worktree for `PM-02`. | Parallel development can start with isolated branches and centralized status tracking. |
| `2026-04-06` | `SAFE_GIT` | Registered `E:/GameDev/H5/Project/TOTM_MVP/TOTM_MVP_Dev_worktrees/PM-02` in global Git `safe.directory`. | Dedicated task threads can run Git inside the external worktree without ownership errors. |
| `2026-04-06` | `STATUS` | Marked PM-02 as IN_PROGRESS in the central registry. | Task-state tracking now matches the execution plan. |
| `2026-04-06` | `SESSION` | Synced the task-management thread session ID `019d62cd-a740-79c3-b420-88f6f37d2128` for `PM-02`. | The central registry can now directly track the management session for this task. |
| `2026-04-06` | `THREAD_MODEL` | Clarified that the central registry stores task-management thread IDs only. | Subtask threads can now stay lightweight without polluting the cross-task registry. |
| `2026-04-21` | `STATUS` | PM-02 marked DONE; all technical design documents produced. | PM-02 worktree can be archived or reused. |



