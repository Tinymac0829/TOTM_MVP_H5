# QA-01 收口记录：Story 1 手感验证

**文档类型**：QA 收口记录  
**任务 ID**：QA-01  
**创建日期**：2026-05-01  
**状态**：DONE（文档化收口）  
**关联范围**：`story_001`、ENG-03 输入层、ENG-04 核心移动手感、ENG-05 HUD 状态流  
**覆盖需求**：R-006、R-007、R-008、R-009、R-017

---

## 收口结论

QA-01 可基于现有 `2026-05-01` 真实浏览器回归、输入链路代码核查和 ENG-03 技术预算推导标记为 `DONE`。

本次收口不新增完整人工验收轮次，也不声称已完成高速摄像机或基线设备逐帧实测。`<50ms` 输入响应指标的依据是代码路径与时序预算：触摸/键盘事件派发约 `8ms`，下一帧输入采集约 `16ms`，固定步长消费最多 `20ms`，端到端最坏预算约 `44ms`。

## 证据矩阵

| QA-01 验收项 | 结论 | 证据 |
|---|---|---|
| 输入到响应延迟低于 `50ms` | `PASS_BY_ENGINEERING_BUDGET` | `docs/tech/eng03_input_foundation_tech.md` 记录端到端最坏预算约 `44ms`；`src/TouchInput.js` 在 `touchmove` 阶段识别方向，`src/InputManager.js` 每帧采集，`src/main.js` 在 `fixedUpdate` 中消费方向。 |
| 四向识别测试正确 | `PASS` | `docs/features/eng04_eng05_browser_validation_log_template.md` 的 `2026-05-01` 回归记录确认 `story_001` 主链路与滑行手感主链路 `PASS`，四向滑行正常且滑到受阻才停。 |
| `100ms` 缓冲窗口内输入可生效 | `PASS` | `2026-05-01` 回归记录确认 100ms 输入缓冲 `PASS`，快速连续滑动体感正常，AHK 毫秒级边界测试无问题；缓冲有效、过期和单缓冲覆盖语义均已复验。 |
| `story_001` 主链路无阻断回退 | `PASS` | `story_001` 启动、滑行、收集、HUD、通关、重复游玩、点击/缩放与缓存版本确认均已在 ENG-04 × ENG-05 真实浏览器联合回归中通过。 |

## 已核查实现路径

- `src/TouchInput.js`：在 `touchmove` 阶段根据归一化位移判定 `up/down/left/right`，不等待 `touchend`。
- `src/KeyboardInput.js`：在 `keydown` 阶段记录待消费方向。
- `src/InputManager.js`：在启用状态下每帧读取 touch/keyboard 方向，并通过 `consumeDirection()` 暴露给玩法循环。
- `src/main.js`：仅在 `playing` 状态下消费输入，并将方向传入 `PlayerController.fixedUpdate()`。
- `src/PlayerController.js`：默认 `bufferDuration = 0.1`，缓冲倒计时在 `update(deltaTime)` 中递减，缓冲消费在移动停下后的固定步长路径中完成。
- `index.html` 与 `src/main.js`：当前入口已使用 `eng04_input_buffer_v1` 模块缓存版本。

## 限制与后续建议

- 未执行高速摄像机或基线设备逐帧测量；如后续发布前需要硬件实测证据，应新增独立 QA 轮次，而不是修改本次文档化收口结论。
- QA-01 仅关闭 `Story 1` 当前主链路手感验证，不覆盖 `Story 2`、`Story 3` 的后续回归。
- 若后续改动输入采集顺序、固定步长策略、`PlayerController` 缓冲语义、速度口径或 HUD 弹窗输入屏蔽边界，需要重新评估 QA-01 相关风险。

## 收口引用

- `docs/features/eng04_eng05_browser_validation_log_template.md`，9.14 `2026-05-01` 输入缓冲与坐标域真实浏览器回归记录。
- `docs/features/eng04_eng05_joint_acceptance_checklist.md`，`2026-05-01` 联合回归补充记录。
- `docs/tech/eng03_input_foundation_tech.md`，第 12 节性能要求与 `44ms` 输入链路预算。
- `docs/design/eng04_core_movement_design.md`，第 1.6 节手感验收与第 2.9 节测试策略。
