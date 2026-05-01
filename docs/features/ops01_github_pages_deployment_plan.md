# OPS-01 计划：GitHub Pages 部署与 URL 可玩性验收

**文档类型**：OPS 计划与验收清单  
**任务 ID**：OPS-01  
**创建日期**：2026-05-01  
**状态**：TODO  
**关联需求**：R-020  
**目标平台**：GitHub Pages、移动端设备浏览器、桌面浏览器

---

## 目标

OPS-01 的目标是让当前 MVP 构建可以通过公开 URL 在设备浏览器访问，并确认线上环境仍保留最小可玩性。

本任务不是完整玩法回归，也不重复 QA-01 的手感指标验收。OPS-01 只验证部署后的可访问性、资源加载和最小移动端可玩 smoke，确保线上 URL 不是只能打开空壳页面。

## 当前前置事实

- 项目是纯静态结构：`index.html`、`src/`、`stages/`。
- `index.html` 使用相对模块路径：`./src/main.js?v=eng04_input_buffer_v1`。
- 关卡数据通过相对路径加载，符合 GitHub Pages repo 子路径部署要求。
- 移动端触屏输入已在 `src/TouchInput.js` 中实现：`touchstart` / `touchmove` 监听、`preventDefault()`、主轴方向判定。
- `index.html` 已设置 `body { touch-action: none; }` 与 `overflow: hidden`，用于避免移动端滑动触发页面滚动或缩放。

## 范围

**包含**：
- GitHub Pages 静态访问路径确认。
- 线上 URL 打开开始界面。
- JS module、`stages/story_001.json` 与关键静态资源正常加载。
- 桌面浏览器最小 smoke。
- 移动端浏览器最小可玩 smoke。
- 移动端滑动操作确认：滑动方向应决定角色移动方向。
- 缓存版本确认：线上入口应加载 `eng04_input_buffer_v1`。

**不包含**：
- QA-01 的 `<50ms` 响应指标复测。
- AHK 毫秒级边界测试。
- Story 2 / Story 3 验收。
- Android 性能专项。
- 正式发布、域名绑定、CDN、版本号策略或运营发布流程。

## 推荐部署口径

- 默认使用 GitHub Pages。
- 发布源建议使用 `master` 分支根目录，除非仓库设置已有其他 Pages 策略。
- 线上 URL 格式预计为 `https://<user-or-org>.github.io/<repo>/`。
- 若仓库名或 Pages 配置不同，以 GitHub Pages 实际提供的 URL 为准。

## 最小验收清单

| 验收项 | 期望结果 | 是否阻塞 OPS-01 |
|---|---|---|
| Pages URL 可访问 | 打开 URL 后显示 `TOTM MVP` 开始界面 | 是 |
| 静态资源加载 | `index.html`、JS modules、`stages/story_001.json` 无 404 | 是 |
| 缓存版本 | 页面加载 `eng04_input_buffer_v1` 入口版本 | 是 |
| 开始链路 | 点击“开始游戏”后进入 `story_001` | 是 |
| 桌面 smoke | 键盘方向键或 WASD 可驱动角色移动 | 是 |
| 移动端滑动 | 上/下/左/右滑动可驱动角色按方向移动 | 是 |
| 页面滚动/缩放 | 移动端滑动时页面不滚动、不缩放、不丢 Canvas 焦点 | 是 |
| 玩法 smoke | 至少确认一次收集/HUD 更新，或通关/重复游玩链路 | 是 |
| 异常观察 | 无明显白屏、旧缓存、模块加载错误或关卡加载失败 | 是 |

## 手工验收步骤

### 桌面浏览器

1. 打开 GitHub Pages URL。
2. 确认开始界面显示。
3. 打开浏览器 DevTools，确认无关键 404 或 module 加载错误。
4. 点击“开始游戏”。
5. 使用方向键或 WASD 触发角色移动。
6. 收集至少一个 Dot / Coin / Star，确认 HUD 变化，或移动到 Exit 触发通关弹窗。

### 移动端浏览器

1. 在真实移动设备浏览器打开 GitHub Pages URL。
2. 确认开始界面显示，页面适配竖屏。
3. 点击“开始游戏”进入 `story_001`。
4. 分别执行上、下、左、右滑动。
5. 确认角色按滑动方向移动，并且滑动时页面不滚动、不缩放。
6. 至少完成一次收集/HUD 更新，或触发通关/重复游玩 smoke。

## 收口标准

OPS-01 只有在以下条件同时满足时才能标记为 `DONE`：

- GitHub Pages URL 已确认。
- 桌面浏览器 smoke 为 `PASS`。
- 移动端浏览器 smoke 为 `PASS`。
- 移动端滑动驱动角色移动已确认。
- 静态资源加载、关卡 JSON、模块缓存版本均无阻塞问题。
- 若发现 P0/P1 部署问题，必须先修复并复验后再收口。

## 验收记录模板

| 字段 | 内容 |
|---|---|
| 验收日期 |  |
| Pages URL |  |
| 提交版本 |  |
| 桌面浏览器 |  |
| 移动设备 / 浏览器 |  |
| 静态资源加载 | `PASS / FAIL / BLOCKED` |
| 桌面 smoke | `PASS / FAIL / BLOCKED` |
| 移动端滑动 smoke | `PASS / FAIL / BLOCKED` |
| 收集/HUD 或通关 smoke | `PASS / FAIL / BLOCKED` |
| 缓存版本确认 |  |
| 发现问题 |  |
| 总体结论 | `PASS / FAIL / BLOCKED` |

## 2026-05-01 Android 第一轮验收记录

| 字段 | 内容 |
|---|---|
| 验收日期 | `2026-05-01` |
| Pages URL | `https://tinymac0829.github.io/TOTM_MVP_H5/` |
| 提交版本 | 已推送的 OPS-01 移动端启动修复版本 |
| 桌面浏览器 | Chrome |
| 移动设备 / 浏览器 | Android / Chrome |
| 静态资源加载 | `PASS`：无 404 或控制台错误 |
| 桌面 smoke | `PASS` |
| 移动端滑动 smoke | `FAIL` |
| 收集/HUD 或通关 smoke | `PASS` |
| 缓存版本确认 | 页面可打开，后续复测仍需继续确认线上入口加载待修复版本 |
| 发现问题 | Android Chrome 上 HUD 按钮触摸命中区域相对视觉按钮偏上；移动端滑动阈值偏长；手指不离屏时无法连续完成多次方向滑动；另观察到镜头边缘和 HUD 顶部适配问题，暂缓到后续批次讨论。 |
| 总体结论 | `FAIL`：OPS-01 暂不能收口，先修复 HUD 触摸命中和移动端滑动输入手感，再执行第二轮 Android 复测。 |

### Android 第一轮修复范围

本批次只处理以下两项：

- HUD 按钮触摸命中区域需与视觉按钮对齐。
- 移动端滑动输入需参考竞品 `8.5` 节的 DPI 自适应阈值、主轴方向判定和不离屏连续滑动手势。

以下问题暂不在本批次处理，待竞品方案继续调研后再讨论：

- 地图边缘镜头留白 / 居中策略。
- 移动端 HUD 顶部 safe-area / 视口适配。

## 后续收口动作

线上 smoke 通过后，同步更新：

- `docs/features/ops01_github_pages_deployment_plan.md`：填入验收记录并将状态改为 `DONE`。
- `docs/mvp_execution_plan.md`：将 OPS-01 标记为 `DONE`，并视情况将 `v0.1.1` 标记为 `DONE`。
- `docs/mvp_execution_plan_zh.md`：同步中文执行计划。
- `docs/worktree_registry.md` 与 `docs/worktree_registry_zh.md`：追加 OPS-01 主分支收口日志。
