# MVP Requirement List

## Usage Rules

- This file is the atomic MVP requirement list derived from macro PRD and GDD decisions.
- Add, remove, or freeze requirements here before changing the execution plan.
- Every development task in `docs/mvp_execution_plan.md` should reference one or more requirement IDs from this file.
- This file defines `what must be delivered`; the execution plan defines `how and when it will be delivered`.

## Status Legend

- `TODO` = defined but not yet implemented
- `IN_PROGRESS` = partially implemented or under active validation
- `DONE` = fully delivered and verified
- `BLOCKED` = cannot move forward yet
- `FROZEN` = decided and locked

## Requirement List

| ID | Status | Category | Requirement | Acceptance / Notes |
|---|---|---|---|---|
| R-001 | FROZEN | Scope | MVP scope is limited to `Story 1-3 + core feel`. | No Arcade, meta systems, monetization, remote config, or final content pipeline in MVP scope. |
| R-002 | FROZEN | Platform | The MVP must run as `H5` in Android browser at `1080x1920` portrait baseline. | Layout and rendering target portrait mobile first. |
| R-003 | FROZEN | Tech | The MVP implementation stack is single `HTML + Canvas2D + pure JavaScript`. | No framework dependency is required for MVP baseline. |
| R-004 | FROZEN | Art | MVP visuals use placeholder color blocks drawn with Canvas. | Detailed H5 visual spec is implementation-driven during development. |
| R-005 | FROZEN | Runtime | Gameplay runs on `fixed 0.02s (50Hz) + update(dt)` dual-loop model. | Fixed loop handles core gameplay consistency; variable update handles frame-based systems. |
| R-006 | FROZEN | Input | The game must support both touch swipe and keyboard input. | Both paths should resolve into the same gameplay command layer. |
| R-007 | FROZEN | Movement | Player movement is four-direction slide-until-blocked. | A move continues until wall, blocker, or rule-driven interrupt stops it. |
| R-008 | FROZEN | Movement | Input buffer window is `0.02s`. | Buffered direction executes immediately after the current slide ends if still valid. |
| R-009 | FROZEN | Movement | Player move speed baseline is `5.0 tiles/s`. | Treated as the first playable feel anchor. |
| R-010 | FROZEN | Data | MVP stage data must use a JSON-compatible grid format. | Each stage must be representable as a 2D tile array plus stage metadata such as enter, exit, collectibles, and stage flags. |
| R-011 | FROZEN | Rules | MVP must explicitly freeze the supported tile and collision subset. | Current frozen subset: `Empty`, `Wall`, `Enter`, `Exit`, `Dot`, `Coin`, `Star`, `Spikes`. Additional tile types require requirement update first. |
| R-012 | FROZEN | Flow | Each included story stage must support full start -> fail/clear loop. | Applies to `Story 1`, `Story 2`, and `Story 3`. |
| R-013 | FROZEN | Flow | Cleared stages must be replayable freely. | Replay is required for testing and feel iteration. |
| R-014 | FROZEN | Flow | Restart must be available within `2s` after failure. | No stamina cost or equivalent retry tax in MVP. |
| R-015 | FROZEN | UI | UI must not cover the core playable area in `1080x1920`. | Gameplay readability takes priority over decoration. |
| R-016 | FROZEN | Performance | Target performance is `>=55 FPS` on mid-range Android devices. | Performance pass is required before MVP stabilization. |
| R-017 | FROZEN | Content | `Story 1` must be fully playable. | Includes fail, clear, restart, and replay loop. |
| R-018 | FROZEN | Content | `Story 2` must be fully playable. | Must not regress `Story 1` behavior. |
| R-019 | FROZEN | Content | `Story 3` must be fully playable. | Must close the first MVP content set. |
| R-020 | FROZEN | Deployment | MVP must be reachable by URL in device browsers. | GitHub Pages is the default delivery target for cross-device testing. |
| R-021 | FROZEN | Rules | File and folder names inside the project must use English-only names. | Allowed characters remain constrained by project naming rule. |
| R-022 | FROZEN | Scope Decision | Lava is not required for current `Story 1-3` MVP acceptance. | Original early story content does not depend on Lava. Lava values remain reference data for later scope only. |

## Source Notes

- Product and scope constraints come from the macro project discussion in this thread.
- Runtime, movement, trap, and value baselines come from the reverse-engineering reports already frozen in discussion.
- If a requirement changes, update this file first, then update the execution plan and log both changes.

## Update Log

| Date | Type | Summary | Impact |
|---|---|---|---|
| `2026-04-06` | `INIT` | Created the first atomic requirement list for the MVP. | The project structure now separates requirement layer from task layer. |
| `2026-04-06` | `REFINE` | Added level-data, tile-subset, deployment, and Lava scope-decision requirements. | Requirements now match the MVP implementation boundary more closely. |
