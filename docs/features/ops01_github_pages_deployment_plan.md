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

## 2026-05-02 Android 第二轮验收记录

| 字段 | 内容 |
|---|---|
| 验收日期 | `2026-05-02` |
| Pages URL | `https://tinymac0829.github.io/TOTM_MVP_H5/` |
| 提交版本 | `fix: align mobile HUD taps and swipe gestures for OPS-01` |
| 桌面浏览器 | Chrome |
| 移动设备 / 浏览器 | Xiaomi 13 Ultra / Android 16 Xiaomi HyperOS 3.0.4.0 / Chrome 147.0.7727.49 |
| 设备物理分辨率 | `3200x1440` WQHD 竖屏 |
| 静态资源加载 | `PASS`：直接访问 `src/TouchInput.js` 可见 `resolveSwipeThreshold`、`NORMAL_DPI_FACTOR`、`INVALID_DPI_WIDTH_FACTOR` |
| 桌面 smoke | `PASS` |
| 开始按钮命中 | `FAIL`：点击蓝色视觉按钮中心、上半部、下半部与边缘内侧仍不能稳定命中，需要点击按钮视觉区域上方 |
| 通关按钮命中 | `FAIL`：通关后“重复游玩”按钮同样需要点击视觉按钮上方 |
| 移动端滑动阈值 | `BLOCKED`：阈值已明显短于上一轮且接近竞品，但当前 camera / viewport 显示比例异常可能影响体感，暂不继续调参 |
| 不离屏连续滑动 | `PASS`：手指不离屏连续多次方向滑动已实现，表现与竞品一致 |
| 角色移动与页面稳定 | `PASS`：角色按方向移动，页面不滚动、不缩放、不丢 Canvas 焦点 |
| 收集/HUD 或通关 smoke | `PASS` |
| 截图证据 | Android 页面截图覆盖开始界面、游玩中、通关弹窗；竞品截图覆盖 Story 模式相机参考 |
| 总体结论 | `FAIL`：OPS-01 仍不能收口；下一轮先统一移动端 viewport / canvas / HUD 坐标口径，并按 Story/Lava 相机规则修正 Renderer。 |

### Android 第二轮根因判断

- 第一轮“点击开始游戏完全无响应”可能同时包含两个问题：移动端 touch 未接入 HUD action，以及 HUD 视觉按钮与命中区域存在垂直偏移；`5a057c9` 的 `touchend` 接入方向保留，不直接回滚。
- `6bbc4e4` 已将 HUD touch 坐标从缩放换算改为 `client - rect`，但第二轮仍复现偏上命中，说明根因不只是单个 hit-test 公式。
- 当前更高概率根因是移动端 `100vh`、`window.innerHeight`、canvas backing size、HUD viewport 与 Renderer viewport 的尺寸口径不一致。
- 竞品逆向确认 Story/Lava 模式是 `clamp(dt * 10, 0, 1)` Lerp 跟随玩家，且无地图边界 clamp；当前 Renderer 使用地图边界 clamp，会导致角色在地图边缘贴近屏幕边缘并暴露 viewport/camera 适配问题。
- `cameraLerpSpeed` 不是全局相机跟随速度，而是 Arcade/Boss 开局的 `0 -> 1` 渐变参数；当前 Story MVP 不应引入 Arcade/Boss 的二次曲线、X 对齐动画或 Y 偏移规则。

### Android 第二轮后续修复边界

下一轮代码修复建议只处理以下内容：

- 统一移动端 viewport / canvas 尺寸口径，优先使用 `window.visualViewport`，fallback 到 `window.innerWidth / innerHeight`。
- 确保 canvas CSS 尺寸、backing store 尺寸、HUD 渲染坐标和 HUD 命中坐标使用同一套 viewport。
- Story 模式 Renderer 相机改为按玩家中心 `Lerp(dt * 10)` 跟随，不做地图边界 clamp，允许地图边缘显示背景留白。
- 修复后重新验收 HUD 按钮命中、移动端 camera 画面、滑动阈值体感和主链路 smoke。

下一轮暂不处理：

- Arcade/Boss 相机规则。
- Story 2 / Story 3 验收。
- 最终 HUD 视觉稿与 safe-area 精修；如统一 viewport 后顶部 HUD 仍有问题，再单独开批。

## 后续收口动作

线上 smoke 通过后，同步更新：

- `docs/features/ops01_github_pages_deployment_plan.md`：填入验收记录并将状态改为 `DONE`。
- `docs/mvp_execution_plan.md`：将 OPS-01 标记为 `DONE`，并视情况将 `v0.1.1` 标记为 `DONE`。
- `docs/mvp_execution_plan_zh.md`：同步中文执行计划。
- `docs/worktree_registry.md` 与 `docs/worktree_registry_zh.md`：追加 OPS-01 主分支收口日志。
