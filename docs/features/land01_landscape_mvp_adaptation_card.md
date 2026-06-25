# LAND-01 Feature Card: Landscape MVP Adaptation

**Document Type**: L1 feature card / adaptation experiment card
**Task ID**: LAND-01
**Created**: 2026-06-25
**Status**: DRAFT
**Baseline**: Story 1-3 MVP freeze candidate after REL-01
**Scope Type**: Post-freeze experimental adaptation

## Background

The current H5 MVP has reached a freeze candidate state. Story 1-3 are playable as a complete loop, QA-01, QA-02, QA-03, and REL-01 are closed, and PERF-01 is explicitly marked as `SKIPPED`.

LAND-01 is a new post-freeze experiment. Its purpose is to evaluate whether the existing MVP gameplay can be adapted into a landscape-oriented version without changing the validated portrait MVP baseline.

This task must not rewrite the REL-01 closeout conclusion. The existing Story 1-3 portrait implementation remains the current MVP freeze candidate unless a later task explicitly changes the release scope.

## Goal

Create and validate a landscape adaptation path for the existing Story 1-3 MVP gameplay.

The target experience is:

- the player can enter a landscape version of the MVP loop;
- Story 1, Story 2, and Story 3 can load in landscape mode;
- the four-direction slide gameplay remains readable and playable;
- collection, death, restart, clear popup, and next-stage flow remain functional;
- the adaptation can be evaluated without overwriting the existing portrait stage data or historical QA evidence.

## Non-Goals

LAND-01 does not include:

- adding Story 4 or any new stage content;
- adding new tile types, enemies, movement rules, or puzzle mechanics;
- replacing the existing portrait MVP route;
- claiming that PERF-01 has passed;
- implementing the full DebugPanel;
- final commercial UI polish;
- audio, account, save, leaderboard, monetization, or settings features.

## Scope

Included:

- a landscape stage-orientation strategy for Story 1-3;
- a landscape viewport, scale, and camera-follow strategy;
- minimum HUD and input checks needed for landscape playability;
- regression criteria to confirm that the existing portrait MVP behavior is not accidentally broken;
- documentation of risks and validation requirements before treating the adaptation as shippable.

Excluded:

- destructive edits to the existing `stages/story_001.json`, `stages/story_002.json`, and `stages/story_003.json`;
- broad UI redesign;
- broad performance optimization;
- changing the meaning of QA-01, QA-02, QA-03, REL-01, or PERF-01.

## Stage Orientation Strategy

The landscape adaptation should not directly overwrite the validated portrait stage JSON files.

Preferred options:

1. Runtime transform
   - Load the original `story_*.json` files.
   - Apply a 90-degree transform in the stage-loading or adaptation layer.
   - Keep the original source data unchanged.

2. Generated landscape derivatives
   - Generate separate landscape stage files such as `story_001_landscape`.
   - Keep the generation process reproducible.
   - Treat generated files as derived data, not as replacements for the original MVP baseline.

The first implementation should prefer runtime transform unless there is a concrete reason to persist separate landscape JSON files.

### Rotation Mapping

If the adaptation uses clockwise rotation:

```text
newWidth = oldHeight
newHeight = oldWidth
newX = oldHeight - 1 - oldZ
newZ = oldX
```

If the adaptation uses counter-clockwise rotation:

```text
newWidth = oldHeight
newHeight = oldWidth
newX = oldZ
newZ = oldWidth - 1 - oldX
```

The implementation must apply the same transform to:

- `width` and `height`;
- `enter`;
- `exit`;
- every row and column in `tiles`;
- all collectible, hazard, wall, and empty tiles through their transformed grid positions.

The initial design recommendation is clockwise rotation, but the final direction should be confirmed through quick playability review before being treated as accepted.

## Camera And Viewport Strategy

Landscape mode should not simply fit the entire rotated stage into the screen if that makes tiles too small to read or touch comfortably.

The recommended camera goals are:

- keep tile readability above a minimum practical size;
- allow the landscape viewport to show more horizontal context than portrait mode;
- preserve local navigation clarity around the player;
- avoid shrinking large stages only to display the full map at once;
- keep camera motion stable enough that repeated slide movements feel predictable.

Recommended first-pass behavior:

- compute a landscape-specific tile scale from viewport height first;
- cap scale so that HUD and safe-area margins do not overlap the playfield;
- follow the player with a horizontal and vertical dead zone;
- clamp camera bounds to the transformed stage bounds;
- avoid abrupt camera snaps except on stage start, restart, or direct stage load.

The camera should be treated as an adaptation layer. Core movement, collision, collection, death, and clear rules should remain unchanged.

## Input And HUD Strategy

Input should remain screen-relative:

- swipe right means move right on the visible landscape map;
- swipe left means move left on the visible landscape map;
- swipe up and down remain visually consistent with the displayed map orientation.

The implementation should avoid remapping player intent back to the original portrait coordinate frame after rotation. The stage itself should be transformed, and input should operate against the visible transformed world.

HUD requirements for LAND-01 are intentionally minimal:

- counters remain visible and do not cover critical playfield content;
- failure and clear popups remain usable in landscape;
- start/menu state remains usable;
- `?debugInput=1` behavior is not broken;
- no full DebugPanel is required.

## Proposed Entry Point

The first implementation should expose landscape mode behind an explicit switch, for example:

```text
?orientation=landscape
```

Direct stage entry should remain available:

```text
?orientation=landscape&stage=story_001
?orientation=landscape&stage=story_002
?orientation=landscape&stage=story_003
```

If a different parameter name is chosen during implementation, update this card before code work starts.

Portrait mode should remain the default unless the project explicitly decides to promote landscape mode.

## Suggested Implementation Order

1. Add or document the landscape mode decision and URL entry behavior.
2. Implement a stage transform path without editing the original stage JSON files.
3. Validate transformed metadata for Story 1-3:
   - transformed dimensions;
   - transformed Enter and Exit;
   - unchanged tile counts for Dot, Coin, Star, Spikes, Enter, and Exit.
4. Implement landscape scale and camera follow rules.
5. Verify HUD and popup usability in landscape.
6. Run a small portrait smoke check to confirm the original MVP route still works.
7. Only after the above checks pass, decide whether landscape data should remain runtime-only or become generated derivative files.

## Acceptance Criteria

LAND-01 can be considered functionally accepted only when all required checks below pass.

Landscape stage loading:

- [ ] `?orientation=landscape&stage=story_001` loads Story 1 in landscape mode.
- [ ] `?orientation=landscape&stage=story_002` loads Story 2 in landscape mode.
- [ ] `?orientation=landscape&stage=story_003` loads Story 3 in landscape mode.
- [ ] transformed Enter and Exit positions are valid and reachable.
- [ ] transformed tile counts match the original source stage counts.

Landscape gameplay:

- [ ] player movement remains four-directional and screen-relative.
- [ ] collision stopping behavior remains consistent with the transformed grid.
- [ ] Dot, Coin, and Star collection updates HUD counters.
- [ ] Spikes death triggers the failure popup where applicable.
- [ ] failure restart resets the current landscape stage.
- [ ] reaching Exit triggers the clear popup.
- [ ] Story flow remains `story_001 -> story_002 -> story_003 -> story_001`.

Landscape view and UI:

- [ ] tile size remains readable on the target landscape viewport.
- [ ] camera follow keeps the player visible and avoids excessive snapping.
- [ ] HUD counters do not cover critical playfield information.
- [ ] failure and clear popup buttons remain clickable or tappable.
- [ ] `?debugInput=1` still enables input logging.

Portrait regression:

- [ ] default entry without `?orientation=landscape` still starts the existing portrait MVP path.
- [ ] portrait direct stage entries for Story 1-3 still load.
- [ ] no original `stages/story_*.json` file is destructively rewritten.

## Validation Plan

Minimum validation should include:

- local browser smoke test for default portrait entry;
- local browser smoke test for each landscape direct stage entry;
- transformed stage metadata check for dimensions, Enter, Exit, and tile counts;
- one clear path through each landscape Story if feasible;
- one Spikes death and restart path in Story 2 or Story 3;
- browser console check for page-level script errors.

Optional validation:

- Android landscape manual smoke test;
- GitHub Pages landscape smoke test after deployment;
- side-by-side screenshot review of portrait and transformed landscape routes;
- camera tuning review across desktop and mobile landscape viewport sizes.

## Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Rotating a slide maze preserves topology but changes player perception | Routes may feel less readable even if technically valid | Require manual playability review after transform |
| Fit-to-screen scaling can make tiles too small | Mobile landscape play may become hard to read or control | Use minimum tile size and camera follow instead of full-map fit |
| HUD may cover important playfield areas | Player may miss hazards, exits, or collectibles | Reserve safe playfield bounds and test popups in landscape |
| Landscape work may accidentally overwrite MVP baseline | Historical QA evidence becomes harder to interpret | Keep original stage JSON untouched and gate landscape behind an explicit switch |
| PERF-01 could be misrepresented | Skipped performance scope may be confused with a new pass | Keep PERF-01 as `SKIPPED`; create a separate performance task if needed |

## Documentation Notes

- LAND-01 is a new post-freeze adaptation experiment.
- It does not change QA-01, QA-02, QA-03, REL-01, or PERF-01 status.
- If implementation begins, update the execution plan or registry according to the active project workflow before code changes.
- If the adaptation is later promoted beyond an experiment, create a closeout document with exact validation evidence.
