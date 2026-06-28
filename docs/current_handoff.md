# TOTM MVP Current Handoff

**Date**: 2026-06-28
**Workspace**: `E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev`
**Branch**: `codex/landscape`
**Latest stable baseline before this handoff update**: `4ebd468 tools: add raw stage export filename`

## Current State

- MVP freeze candidate remains established for the original portrait route.
- Story 1-3 are integrated and run in the current MVP loop.
- `QA-01`, `QA-02`, and `QA-03` are `DONE`.
- `PERF-01` is `SKIPPED`; this is not a performance PASS.
- `REL-01` is `DONE`.
- `v0.3.1` is `DONE`.
- `LAND-01`, `TOOL-01`, and `LAND-02` are `DONE` on branch `codex/landscape`.
- Full DebugPanel remains not implemented; only the OPS-01 `?debugInput=1` input log exists in `src/TouchInput.js`.

## Current Runtime Flow

- Default startup without URL parameters enters the portrait menu for Story 1.
- Direct portrait stage startup is available with `?stage=story_001`, `?stage=story_002`, and `?stage=story_003`.
- Direct landscape stage startup is available with:

```text
?orientation=landscape&stage=story_001
?orientation=landscape&stage=story_002
?orientation=landscape&stage=story_003
```

- `src/main.js` allows these stage ids:
  - `story_001`
  - `story_002`
  - `story_003`
  - `eng04_death_validation`
- `StageLoader.STAGE_ORDER` is `story_001 -> story_002 -> story_003`.
- `GameState.getNextStageId()` cycles `story_001 -> story_002 -> story_003 -> story_001`.

## LAND-02 Static Landscape Runtime

Runtime stage data is now split by orientation:

- Portrait loads `stages/story_*.json`.
- Landscape loads `stages_landscape/story_*.json`.
- Runtime stage ids remain formal ids such as `story_001`, `story_002`, `story_003`.
- `StageLoader` no longer applies runtime rotation to formal static landscape JSON.
- Static landscape data currently exists for Story 1-3:
  - `stages_landscape/story_001.json`
  - `stages_landscape/story_002.json`
  - `stages_landscape/story_003.json`

## Landscape Stage JSON Toolchain

TOOL-01 is documented through one consolidated technical entry:

```text
docs/tech/landscape_stage_json_toolchain_tech.md
```

Compatibility redirect notes remain at:

```text
docs/tech/convert_stage_json_landscape_tech.md
docs/tech/landscape_stage_builder_tech.md
```

Toolchain files:

- `tools/convert_stage_json_landscape.mjs`: CLI translator and automation/regression entry.
- `tools/landscape_stage_builder.html`: Browser Builder for manual single-stage generation and downloads.

Important naming rules:

- CLI default remains review/export derivative id: `<sourceId>_landscape`.
- CLI formal runtime mode uses `--id story_###`.
- Browser Builder default uses the user-confirmed formal id, for example `story_004`.
- Browser Builder custom/variant output uses `transform: "custom_pipeline"` with a `transforms` array and downloads `${stageId}_custom_transform.json` by default.

## Touch Input Baseline

- Touch input remains screen-relative; no direction remapping is applied.
- Portrait keeps vertical-priority tie-break when `absDx === absDy`.
- Landscape keeps horizontal-priority tie-break when `absDx === absDy`.
- Valid-DPI swipe threshold remains `dpi * 0.16`.
- Invalid-DPI fallback threshold now uses Canvas short side `0.03`, not Canvas width `0.03`.
- `SWIPE_TIME_SECONDS = 1.0` and active touch identity binding remain unchanged.
- Landscape diagonal axis-intent risk is documented but not implemented:

```text
docs/tech/landscape_touch_axis_intent_note.md
```

The axis-intent note records the 30°-60° diagonal thumb-swipe risk and possible future approaches such as dominance ratio or a short intent window. Current behavior is unchanged.

## Validation Baseline

LAND-02 validation already recorded:

- `node --check src/StageLoader.js` passed.
- `node --check src/main.js` passed.
- `node --check tools/convert_stage_json_landscape.mjs` passed.
- `git diff --check` passed.
- Story 1-3 `stages_landscape/story_*.json` id, dimensions, Enter/Exit, meta, and required tile counts passed.
- Node fake-fetch runtime checks confirmed portrait loads `stages/` and landscape loads `stages_landscape/` without double rotation.

Recent local validation for input/toolchain documentation updates:

- `node --check src/TouchInput.js` passed.
- `git diff --check` passed.
- Targeted Node threshold check confirmed invalid-DPI fallback uses the short side and valid-DPI path remains `dpi * 0.16`.
- Browser Builder script syntax and transform logic checks passed during custom pipeline implementation.

Browser/mobile validation still recommended before final human closeout:

- phone browser portrait smoke.
- phone browser landscape direct entries for Story 1-3.
- Stage Tile Editor export naming in a real browser download flow.
- Browser Builder custom pipeline download flow in a real browser.

## Stable References

- `docs/features/land02_static_landscape_stage_runtime_card.md`
- `docs/features/tool01_landscape_stage_json_translator_card.md`
- `docs/tech/landscape_stage_json_toolchain_tech.md`
- `docs/tech/eng03_input_foundation_tech.md`
- `docs/tech/landscape_touch_axis_intent_note.md`
- `docs/mvp_execution_plan.md`
- `docs/mvp_execution_plan_zh.md`
- `docs/worktree_registry.md`
- `docs/worktree_registry_zh.md`

## Do Not Change Without Explicit Approval

- Do not alter `PERF-01 = SKIPPED`.
- Do not rewrite the original portrait MVP freeze candidate conclusion.
- Do not overwrite `stages/story_*.json`.
- Do not introduce `_landscape` as a formal runtime stage id.
- Do not apply custom axis-intent or touch dominance changes without separate real-device validation and approval.