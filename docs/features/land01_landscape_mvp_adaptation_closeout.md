# LAND-01 收口记录：横屏 MVP 适配

**创建日期**：2026-06-25
**状态**：DONE
**分支**：`codex/landscape`
**文档更新前基线提交**：`497d758 feat: add landscape MVP adaptation mode`
**关联功能卡**：`docs/features/land01_landscape_mvp_adaptation_card.md`

## 收口结论

LAND-01 已按 `DONE` 收口。

Story 1-3 MVP 闭环现在已有显式 landscape adaptation mode，入口为：

```text
?orientation=landscape
```

可直接进入横屏关卡：

```text
?orientation=landscape&stage=story_001
?orientation=landscape&stage=story_002
?orientation=landscape&stage=story_003
```

当 URL 不包含 `?orientation=landscape` 时，原 portrait MVP 路径仍是默认路径。

## 已实现范围

- `StageLoader` 在 landscape mode 下应用顺时针 90 度 runtime transform。
- 原 Story 1-3 JSON 文件没有被覆盖。
- Landscape mode 在 `Renderer` 中使用专门的 viewport scale 路径。
- Landscape camera 沿用 portrait 规则：让玩家保持屏幕居中。
- 输入保持 screen-relative。
- Landscape touch input 在 `absDx === absDy` 时采用水平优先；portrait 保持原有垂直优先。
- Story progression 保持 `story_001 -> story_002 -> story_003 -> story_001`。

## 验证摘要

自动化和本地验证：

- 变更 runtime modules 通过 `node --check`。
- `git diff --check` 通过。
- Stage transform validation 确认转换后 metadata 合法，tile counts 不变。
- Headless Chrome 截图检查在 `1280x720` 下确认三个 direct landscape entries 的玩家位置居中。
- 额外 Story 1 post-movement screenshot 确认移动后玩家仍保持居中。

手动验证：

- 用户已完成桌面浏览器验收。
- GitHub Pages 部署已切换到发布后的 landscape branch 用于移动端测试。
- 用户已完成移动端浏览器验收。

## 转换证据

| Stage | Portrait Size | Landscape Size | Landscape Enter | Landscape Exit |
| --- | --- | --- | --- | --- |
| `story_001` | `17x30` | `30x17` | `(1, 12)` | `(28, 10)` |
| `story_002` | `21x22` | `22x21` | `(17, 11)` | `(1, 1)` |
| `story_003` | `24x17` | `17x24` | `(11, 4)` | `(15, 19)` |

## 截图证据

临时本地截图证据生成在 ignored workspace artifacts 下：

```text
tmp/landscape_screens/story_001.png
tmp/landscape_screens/story_002.png
tmp/landscape_screens/story_003.png
tmp/landscape_screens/story_001_after_moves.png
tmp/landscape_screens/metrics.json
tmp/landscape_screens/story_001_after_moves_metrics.json
```

这些文件是本地验证产物，不应提交。

`1280x720` headless screenshot checks 中观察到的玩家中心：

```text
centerX = 639.5
centerY = 359.5
```

## 已知限制

- LAND-01 不改变 PERF-01。性能状态仍是 `SKIPPED`，不是 PASS。
- LAND-01 不替代 portrait MVP freeze candidate 路径。
- Landscape HUD spacing 对本轮验证可接受，但未来 UI polish 仍可继续优化 safe-area spacing 和视觉平衡。
- 本 closeout 不新增关卡、新 tile 类型、新机制或完整 DebugPanel。
- LAND-01 仍使用 runtime rotation。后续当需要静态 landscape JSON review/export 时，TOOL-01 应提供可复现的 portrait-to-landscape stage JSON translator script。
- TOOL-01 应让 review/export derivative 名称保持明显派生特征，例如 `story_001_landscape`；如果后续正式推广 landscape runtime，则保留目录式命名，例如 `stages_landscape/story_001.json` 搭配 id `story_001`。

## 最终状态

- `LAND-01`：DONE
- Landscape adaptation mode：已通过当前分支验证并接受
- 原 Story 1-3 portrait MVP baseline：已保留
