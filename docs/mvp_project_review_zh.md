# TOTM H5 MVP 项目复盘与后续开发交接

**创建日期**：2026-06-14
**适用基线**：Story 1-3 MVP freeze candidate
**适用对象**：后续开发者、项目接手者、新 Codex 线程、复盘阅读者

## 1. 总体结论

TOTM H5 MVP 当前可以视为功能闭环完成，并已进入 freeze candidate 状态。

当前版本已经完成：

- Story 1-3 三关主内容闭环。
- 核心四向滑行、撞墙停下、输入缓冲、触屏/键盘输入。
- Dot / Coin / Star 收集与 HUD 计数。
- Spikes 死亡、失败弹窗、失败后重开。
- 通关弹窗、下一关流转、Story 3 后循环回 Story 1。
- GitHub Pages 可访问与历史 Android 真机 smoke / Story 1-2 验收。
- QA-01、QA-02、QA-03、REL-01 文档化收口。

当前版本没有完成：

- 中端 Android 真机 FPS 专项测试。该项已按 H5 MVP 范围决策标记为 `PERF-01 = SKIPPED`，不作为本次 MVP freeze 阻塞项，但不能宣称性能验收 PASS。
- 完整 DebugPanel。当前仅实现 OPS-01 输入日志入口 `?debugInput=1`。
- 最终商业化 UI 视觉 polish。当前 HUD/UI 是 MVP 功能实现，不是最终美术稿。

一句话概括：**MVP 的玩法、关卡、状态流和文档收口已经完成；后续开发应以当前 freeze candidate 为基础，只在明确重开范围后新增功能。**

## 2. 当前版本范围

当前 MVP 范围是 `Story 1-3 + core feel`。

已包含的玩家可见体验：

- 进入页面后显示开始界面。
- 默认从 Story 1 开始。
- 支持通过 URL 参数直进 Story 1、Story 2、Story 3。
- 玩家按四向滑行，直到撞墙、到达 Exit 或触发 Spikes。
- 收集物经过时触发收集并更新 HUD。
- 到达 Exit 后显示通关弹窗。
- 触碰 Spikes 后显示失败弹窗。
- 失败后重开当前关。
- 通关后按 `story_001 -> story_002 -> story_003 -> story_001` 流转。

当前 MVP 不包含：

- Story 4 及后续关卡。
- 新瓦片类型、新机关、新敌人或新模式。
- 完整调试面板。
- 存档、账号、排行榜、音频、商业化广告等产品功能。
- 专门的性能优化任务或中端 Android FPS 实测闭环。

## 3. 运行与验证入口

本项目是纯静态 H5 项目，技术栈为单页面 `HTML + Canvas2D + ES Modules`，没有构建步骤。

本地运行建议：

```powershell
python -m http.server 8094 --bind 127.0.0.1
```

然后在浏览器打开：

```text
http://127.0.0.1:8094/
```

常用入口：

```text
http://127.0.0.1:8094/
http://127.0.0.1:8094/?stage=story_001
http://127.0.0.1:8094/?stage=story_002
http://127.0.0.1:8094/?stage=story_003
http://127.0.0.1:8094/?stage=eng04_death_validation
```

线上历史验收入口：

```text
https://tinymac0829.github.io/TOTM_MVP_H5/
https://tinymac0829.github.io/TOTM_MVP_H5/?stage=story_002
```

调试入口：

```text
?debugInput=1
```

`?debugInput=1` 只启用 OPS-01 输入日志，不代表完整 DebugPanel 已实现。

## 4. 关键代码地图

核心入口：

- `index.html`：页面入口，加载 Canvas 与 `src/main.js`。
- `src/main.js`：运行时总装配，负责 Canvas 初始化、HUD 点击、关卡加载、状态切换和主循环接线。

运行时基础：

- `src/GameLoop.js`：固定步长循环与渲染循环。
- `src/GameState.js`：状态机与关卡顺序流转。
- `src/StageLoader.js`：关卡 JSON 加载、校验、统计与缓存。
- `src/GridMap.js`：关卡网格数据访问。
- `src/TileType.js`：瓦片类型定义与 passable / collectible 规则。
- `src/CollisionSystem.js`：滑行路径碰撞与停止点判断。

玩家与输入：

- `src/PlayerController.js`：玩家移动、输入缓冲、收集、死亡、通关触发。
- `src/InputManager.js`：统一读取触屏与键盘输入。
- `src/TouchInput.js`：移动端触屏滑动，含 active touch 绑定和 `debugInput` 日志。
- `src/KeyboardInput.js`：方向键输入。

渲染与 UI：

- `src/Renderer.js`：Canvas2D 关卡与玩家渲染。
- `src/HUD.js`：菜单、loading、HUD 计数、失败弹窗、通关弹窗、按钮命中。
- `src/CoordinateSystem.js`：tile/world 坐标换算。

关卡数据：

- `stages/story_001.json`
- `stages/story_002.json`
- `stages/story_003.json`
- `stages/eng04_death_validation.json`

辅助工具：

- `tools/stage_tile_editor.html`：关卡 tile 编辑与 review HTML 导出工具。
- `tools/format_stage_json.mjs`：关卡 JSON 格式化与轻量统计工具。

## 5. 关卡与状态流

当前正式关卡顺序：

```text
story_001 -> story_002 -> story_003 -> story_001
```

相关事实：

- `StageLoader.STAGE_ORDER` 是 `story_001 -> story_002 -> story_003`。
- `GameState.getNextStageId()` 当前按 `story_001 -> story_002 -> story_003 -> story_001` 循环。
- `src/main.js` 允许加载 `story_001`、`story_002`、`story_003` 和 `eng04_death_validation`。

需要特别注意的历史差异：

- QA-02 / LVL-02 的 2026-06-05 验收发生在 Story 3 接入前。
- 当时 Story 2 通关后 fallback 回 Story 1 是正确历史行为。
- 当前 Story 3 已接入，Story 2 通关后应进入 Story 3。
- 当前 Story 3 通关后循环回 Story 1。

## 6. 关卡数据基线

Story 1：

- 文件：`stages/story_001.json`
- 尺寸：`17x30`
- Enter：`(12, 28)`
- Exit：`(10, 1)`
- Dot：`71`
- Coin：`4`
- Star：`3`
- Spikes：`0`

Story 2：

- 文件：`stages/story_002.json`
- 尺寸：`21x22`
- Enter：`(11, 4)`
- Exit：`(1, 20)`
- Dot：`64`
- Coin：`3`
- Star：`3`
- Spikes：`10`

Story 3：

- 文件：`stages/story_003.json`
- 尺寸：`24x17`
- Enter：`(4, 5)`
- Exit：`(19, 1)`
- Dot：`77`
- Coin：`3`
- Star：`3`
- Spikes：`5`

## 7. 验收与证据索引

主要收口证据：

- `docs/features/qa01_story1_feel_validation_closeout.md`
  - QA-01：Story 1 手感、输入缓冲、主链路证据。
- `docs/features/qa02_story1_2_regression_closeout.md`
  - QA-02：Story 1-2 Android 真机 GitHub Pages 回归证据索引。
- `docs/features/qa03_story1_3_regression_closeout.md`
  - QA-03：Story 1-3 本地浏览器自动化回归证据。
- `docs/features/rel01_mvp_freeze_candidate_closeout.md`
  - REL-01：MVP freeze candidate 与 PERF-01 跳过决策。
- `docs/features/lvl02_story2_card.md`
  - LVL-02：Story 2 接入与 2026-06-05 最终验收记录。
- `docs/features/lvl03_story3_card.md`
  - LVL-03：Story 3 接入、验证与 QA-03 状态。
- `docs/features/ops01_github_pages_deployment_plan.md`
  - OPS-01：GitHub Pages、Android smoke、输入问题收口历史。
- `docs/mvp_execution_plan.md`
- `docs/mvp_execution_plan_zh.md`
  - 当前任务、版本、排期与更新日志。
- `docs/worktree_registry.md`
- `docs/worktree_registry_zh.md`
  - 跨任务 registry 与状态历史。
- `docs/current_handoff.md`
  - 当前稳定 tracked handoff。

关键状态：

- `QA-01`：DONE
- `QA-02`：DONE
- `QA-03`：DONE
- `PERF-01`：SKIPPED
- `REL-01`：DONE
- `v0.3.1`：DONE

## 8. 已知限制

性能：

- `PERF-01` 已按 H5 MVP 范围决策跳过。
- 没有执行中端 Android 真机 FPS 专项测试。
- 不应对外声称 `>=55 FPS` 性能验收通过。
- `R-016` 仍保留原性能目标记录，但在本次 MVP freeze 中被豁免为非阻塞要求。

调试：

- 完整 DebugPanel 未实现。
- 当前仅有 `?debugInput=1` 输入日志。
- 不应假设存在 F1-F8 调试面板功能。

验证覆盖：

- QA-02 是 Android 真机 GitHub Pages 验收，但只覆盖 Story 1-2。
- QA-03 覆盖 Story 1-3，但环境是本地浏览器自动化，不是新一轮 Android 真机全三关人工验收。
- Story 2 / Story 3 的 QA-03 自动通关路线不要求 100% 收集，只验证可加载、可开始、可通关、可死亡重开和状态流稳定。

产品与美术：

- 当前 UI/HUD 是 MVP 功能实现，不是最终视觉稿。
- 没有音频、动画 polish、存档、关卡选择、设置、账号或商业化功能。

## 9. 后续开发建议

后续开发应先确认目标属于哪一类：

- bug fix
- 文档修正
- 部署或兼容性修复
- 性能专项
- 新功能或新关卡

如果是 bug fix：

- 先复现并记录影响范围。
- 优先检查是否影响 Story 1-3 已冻结主链路。
- 修复后至少回归相关 Story 的加载、失败、通关和 HUD 状态。

如果是新功能或新关卡：

- 先更新需求清单。
- 再更新执行计划。
- 再补功能卡或技术设计。
- 最后才进入代码实现。

如果是性能专项：

- 不要把当前 `PERF-01 = SKIPPED` 改写成 PASS。
- 可以新建独立性能任务，例如重新打开 `R-016` 或创建新的 PERF 任务。
- 需要定义设备、浏览器、采样方式、目标帧率、可接受波动和记录方式。

如果是新增 Story：

- 先确认是否重开 MVP 之后的新版本范围。
- 使用 `tools/stage_tile_editor.html` 辅助制作和 review。
- 使用 `tools/format_stage_json.mjs` 格式化 JSON。
- 更新 `StageLoader.STAGE_ORDER`、`GameState` 顺序和 `src/main.js` 可加载关卡集合。
- 新增对应功能卡和 QA closeout。

## 10. 接手者快速检查清单

开始新工作前建议先执行：

```powershell
git status --short --branch
git log -1 --oneline
```

建议先阅读：

```text
handoff.local.md
docs/current_handoff.md
docs/features/rel01_mvp_freeze_candidate_closeout.md
docs/mvp_execution_plan_zh.md
docs/features/qa03_story1_3_regression_closeout.md
```

若要本地跑起来：

```powershell
python -m http.server 8094 --bind 127.0.0.1
```

然后打开：

```text
http://127.0.0.1:8094/
```

最小 smoke 建议：

- 默认入口启动 Story 1。
- Story 1 通关进入 Story 2。
- `?stage=story_002` 直进 Story 2。
- `?stage=story_003` 直进 Story 3。
- Story 2 或 Story 3 触碰 Spikes 后可以失败重开。

## 11. 最终说明

当前仓库不是一个“所有长期产品项都完成”的状态，而是一个明确边界内的 H5 MVP freeze candidate：

- Story 1-3 可玩闭环成立。
- 主要 QA 证据齐全。
- 性能专项被明确跳过。
- 后续新增范围必须重新走需求和文档流程。

这份复盘文档用于帮助后续开发者快速理解项目现状、证据来源、冻结边界和继续开发的正确入口。
