# LAND-01 Closeout: Landscape MVP Adaptation

**Created**: 2026-06-25
**Status**: DONE
**Branch**: `codex/landscape`
**Baseline Commit Before Documentation Update**: `497d758 feat: add landscape MVP adaptation mode`
**Related Feature Card**: `docs/features/land01_landscape_mvp_adaptation_card.md`

## Closeout Conclusion

LAND-01 is closed as `DONE`.

The Story 1-3 MVP loop now has an explicit landscape adaptation mode behind:

```text
?orientation=landscape
```

Direct landscape stage entries are available:

```text
?orientation=landscape&stage=story_001
?orientation=landscape&stage=story_002
?orientation=landscape&stage=story_003
```

The original portrait MVP route remains the default when `?orientation=landscape` is not present.

## Implemented Scope

- `StageLoader` applies a clockwise 90-degree runtime transform in landscape mode.
- Original Story 1-3 JSON files are not overwritten.
- Landscape mode uses a dedicated viewport scale path in `Renderer`.
- Landscape camera follows the existing portrait rule: keep the player centered on screen.
- Input remains screen-relative.
- Story progression remains `story_001 -> story_002 -> story_003 -> story_001`.

## Validation Summary

Automated and local validation:

- Changed runtime modules passed `node --check`.
- `git diff --check` passed.
- Stage transform validation confirmed valid transformed metadata and unchanged tile counts.
- Headless Chrome screenshot checks at `1280x720` confirmed centered player position for all three direct landscape entries.
- Additional Story 1 post-movement screenshot confirmed the player remains centered after movement.

Manual validation:

- Desktop browser acceptance was completed by the user.
- GitHub Pages deployment was switched to the published landscape branch for mobile testing.
- Mobile browser acceptance was completed by the user.

## Transform Evidence

| Stage | Portrait Size | Landscape Size | Landscape Enter | Landscape Exit |
| --- | --- | --- | --- | --- |
| `story_001` | `17x30` | `30x17` | `(1, 12)` | `(28, 10)` |
| `story_002` | `21x22` | `22x21` | `(17, 11)` | `(1, 1)` |
| `story_003` | `24x17` | `17x24` | `(11, 4)` | `(15, 19)` |

## Screenshot Evidence

Temporary local screenshot evidence was generated under ignored workspace artifacts:

```text
tmp/landscape_screens/story_001.png
tmp/landscape_screens/story_002.png
tmp/landscape_screens/story_003.png
tmp/landscape_screens/story_001_after_moves.png
tmp/landscape_screens/metrics.json
tmp/landscape_screens/story_001_after_moves_metrics.json
```

These files are local-only validation artifacts and should not be committed.

Observed player center in the `1280x720` headless screenshot checks:

```text
centerX = 639.5
centerY = 359.5
```

## Known Limits

- LAND-01 does not change PERF-01. Performance remains `SKIPPED`, not PASS.
- LAND-01 does not replace the portrait MVP freeze candidate route.
- Landscape HUD spacing is acceptable for the completed validation pass, but future UI polish may still improve safe-area spacing and visual balance.
- This closeout does not add new stages, new tile types, new mechanics, or a full DebugPanel.

## Final Status

- `LAND-01`: DONE
- Landscape adaptation mode: accepted for the current branch validation pass
- Original Story 1-3 portrait MVP baseline: preserved
