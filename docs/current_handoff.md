# TOTM MVP Current Handoff

**Date**: 2026-06-25
**Workspace**: `D:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev`
**Branch**: `codex/landscape`
**Latest stable baseline before this handoff update**: `497d758 feat: add landscape MVP adaptation mode`

## Current State

- MVP freeze candidate remains established for the original portrait route.
- Story 1-3 are integrated and run in the current MVP loop.
- `QA-01`, `QA-02`, and `QA-03` are `DONE`.
- `PERF-01` is `SKIPPED`; this is not a performance PASS.
- `REL-01` is `DONE`.
- `v0.3.1` is `DONE`.
- `LAND-01` is `DONE` as a post-freeze landscape adaptation experiment on branch `codex/landscape`.
- Full DebugPanel remains not implemented; only the OPS-01 `?debugInput=1` input log exists in `src/TouchInput.js`.

## Current Runtime Flow

- Default startup without URL parameters enters the portrait menu for Story 1.
- `src/main.js` allows these stage ids:
  - `story_001`
  - `story_002`
  - `story_003`
  - `eng04_death_validation`
- `StageLoader.STAGE_ORDER` is `story_001 -> story_002 -> story_003`.
- `GameState.getNextStageId()` cycles `story_001 -> story_002 -> story_003 -> story_001`.
- Direct portrait stage startup is available with `?stage=story_001`, `?stage=story_002`, and `?stage=story_003`.

## LAND-01 Landscape Mode

Landscape mode is enabled with:

```text
?orientation=landscape
```

Direct landscape stage entries:

```text
?orientation=landscape&stage=story_001
?orientation=landscape&stage=story_002
?orientation=landscape&stage=story_003
```

Implemented behavior:

- `StageLoader` applies a clockwise 90-degree runtime transform in landscape mode.
- Original `stages/story_001.json`, `stages/story_002.json`, and `stages/story_003.json` remain unchanged.
- `Renderer` uses a landscape-specific viewport scale path.
- Landscape camera keeps the player centered using the same focus rule as portrait mode.
- Input remains screen-relative; no direction remapping is applied.
- Landscape touch input uses horizontal-priority axis tie-break when `absDx === absDy`; portrait keeps the original vertical-priority tie-break.
- Story progression remains `story_001 -> story_002 -> story_003 -> story_001`.

LAND-01 validation:

- Changed runtime modules passed `node --check`.
- `git diff --check` passed.
- Stage transform validation confirmed valid transformed metadata and unchanged tile counts.
- Headless Chrome screenshot checks at `1280x720` confirmed centered player position for all three landscape direct entries.
- Additional Story 1 post-movement screenshot confirmed the player remains centered after movement.
- Desktop browser manual acceptance was completed by the user.
- Mobile browser manual acceptance was completed by the user after GitHub Pages deployment from the published landscape branch.

## Landscape Transform Baseline

| Stage | Portrait Size | Landscape Size | Landscape Enter | Landscape Exit |
| --- | --- | --- | --- | --- |
| `story_001` | `17x30` | `30x17` | `(1, 12)` | `(28, 10)` |
| `story_002` | `21x22` | `22x21` | `(17, 11)` | `(1, 1)` |
| `story_003` | `24x17` | `17x24` | `(11, 4)` | `(15, 19)` |

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

- `docs/features/land01_landscape_mvp_adaptation_card.md`
- `docs/features/land01_landscape_mvp_adaptation_closeout.md`
- `docs/features/rel01_mvp_freeze_candidate_closeout.md`
- `docs/features/qa03_story1_3_regression_closeout.md`
- `docs/features/qa02_story1_2_regression_closeout.md`
- `docs/features/qa01_story1_feel_validation_closeout.md`
- `docs/features/lvl03_story3_card.md`
- `docs/mvp_execution_plan.md`
- `docs/mvp_execution_plan_zh.md`
- `docs/worktree_registry.md`
- `docs/worktree_registry_zh.md`

## Known Limits

- LAND-01 does not change PERF-01. The dedicated mid-range Android FPS pass was not run and must not be represented as passed.
- LAND-01 does not replace the original portrait MVP freeze candidate route.
- Landscape HUD spacing is acceptable for the completed validation pass, but future polish may still improve safe-area spacing and visual balance.
- QA-03 was a local browser automation closeout, not a fresh Android-device or GitHub Pages manual replay.
- Story 2 and Story 3 full-collection completion was not required for QA-03; the pass targeted stage load/start/fail/clear/progression stability across Story 1-3.
- `tools/stage_tile_editor.html` and `tools/format_stage_json.mjs` remain tracked support tools for stage authoring and formatting.
- `handoff.local.md`, `lessons.md`, and `tmp/` are local-only ignored files and should not be committed.
- LAND-01 screenshot artifacts under `tmp/landscape_screens/` are local-only validation artifacts and should not be committed.
- LAND-01 still uses runtime rotation; a future support tool should add a reproducible portrait-to-landscape stage JSON translator script if static landscape JSON review/export becomes needed.

## Next Major Action

- Commit and push the documentation sync for LAND-01 closeout.
- Keep the original portrait MVP freeze candidate status unchanged unless scope is explicitly reopened.
- If further landscape work continues, treat it as a follow-up task focused on bug fixes, HUD safe-area polish, deployment compatibility, or explicitly approved new scope.
- Track a follow-up support-tool task for portrait-to-landscape stage JSON translation before committing to static landscape stage files.
- If GitHub Pages source is temporarily switched to `codex/landscape` for mobile validation, switch it back according to the intended release branch policy after testing.
