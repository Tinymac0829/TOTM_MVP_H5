# TOTM MVP Current Handoff

**Date**: 2026-06-14
**Workspace**: `E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev`
**Branch**: `master`
**Latest stable baseline before this handoff update**: `6e63460 docs: sync formatter validation registry baseline`

## Current State

- `OPS-01` is closed.
- `v0.1.1` is `DONE`.
- `LVL-02` is `DONE`.
- `QA-02` is `DONE`.
- `v0.2.0` is `DONE`.
- `LVL-03` is `DONE`.
- `QA-03` is `DONE`.
- `v0.3.0` is `DONE`.
- Story 1-3 are integrated and run in the current MVP loop.
- Full DebugPanel remains not implemented; only the OPS-01 `?debugInput=1` input log exists in `src/TouchInput.js`.

## Current Runtime Flow

- `src/main.js` allows these stage ids:
  - `story_001`
  - `story_002`
  - `story_003`
  - `eng04_death_validation`
- `StageLoader.STAGE_ORDER` is `story_001 -> story_002 -> story_003`.
- `GameState.getNextStageId()` cycles `story_001 -> story_002 -> story_003 -> story_001`.
- Default startup without URL parameters enters the menu for Story 1.
- Direct stage startup is available with `?stage=story_001`, `?stage=story_002`, and `?stage=story_003`.

## QA-03 Closeout

QA-03 was closed on 2026-06-14 by `docs/features/qa03_story1_3_regression_closeout.md`.

Validation environment:

- Local temporary HTTP server rooted at the repository root.
- System Microsoft Edge headless browser driven through Playwright.
- Supporting stage-data validation through local module imports.
- This pass did not rerun Android-device or GitHub Pages manual validation.

Passed:

- Default entry starts Story 1 after menu start.
- Story 1-3 direct entries load and start their target stages.
- Story 1 clear loads Story 2.
- Story 2 clear loads Story 3.
- Story 3 clear loops back to Story 1.
- Story 2 and Story 3 Spikes death paths trigger fail popup and restart the current stage.
- Three successful clear routes emitted collection events.
- Page-level regression observed no game script errors.

## Story Data Baseline

`stages/story_001.json`:

- size: `17x30`
- Enter: `(12, 28)`
- Exit: `(10, 1)`
- Dot: `71`
- Coin: `4`
- Star: `3`
- Spikes: `0`

`stages/story_002.json`:

- size: `21x22`
- Enter: `(11, 4)`
- Exit: `(1, 20)`
- Dot: `64`
- Coin: `3`
- Star: `3`
- Spikes: `10`

`stages/story_003.json`:

- size: `24x17`
- Enter: `(4, 5)`
- Exit: `(19, 1)`
- Dot: `77`
- Coin: `3`
- Star: `3`
- Spikes: `5`

## Closeout Documents

- `docs/features/qa03_story1_3_regression_closeout.md`
- `docs/features/lvl03_story3_card.md`
- `docs/mvp_execution_plan.md`
- `docs/mvp_execution_plan_zh.md`
- `docs/worktree_registry.md`
- `docs/worktree_registry_zh.md`

## Known Limits

- QA-03 was a local browser automation closeout, not a fresh Android-device or GitHub Pages manual replay.
- Story 2 and Story 3 full-collection completion was not required for QA-03; the pass targeted stage load/start/fail/clear/progression stability across Story 1-3.
- `tools/stage_tile_editor.html` and `tools/format_stage_json.mjs` remain tracked support tools for stage authoring and formatting.
- `handoff.local.md`, `lessons.md`, and `tmp/` are local-only ignored files and should not be committed.

## Next Major Action

- Treat `v0.3.0` as closed after the QA-03 documentation commit.
- If a new milestone begins, start from the current `master` baseline and verify whether new feature documentation exists before code changes.
- Use `docs/features/qa03_story1_3_regression_closeout.md` as the QA-03 evidence record.
