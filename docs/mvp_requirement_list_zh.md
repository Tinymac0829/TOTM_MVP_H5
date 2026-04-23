# MVP 需求清单

## 使用规则

- 本文件是从宏观 PRD 与 GDD 决策中提炼出的 MVP 原子化需求清单。
- 任何需求的新增、删除、冻结，都应先更新本文件，再更新执行计划。
- `docs/mvp_execution_plan_zh.md` 中的每条开发任务都应引用本文件中的一个或多个需求 ID。
- 本文件定义的是 `要交付什么`，执行计划定义的是 `怎么交付、何时交付`。

## 状态标记

- `TODO` = 已定义但尚未实现
- `IN_PROGRESS` = 正在实现或验证中
- `DONE` = 已完整交付并验证
- `BLOCKED` = 暂时无法推进
- `FROZEN` = 已决策并冻结

## 需求清单

| ID | Status | Category | Requirement | Acceptance / Notes |
|---|---|---|---|---|
| R-001 | FROZEN | Scope | MVP 范围限定为 `Story 1-3 + 核心手感`。 | 不包含 Arcade、元系统、商业化、远程配置和正式内容生产管线。 |
| R-002 | FROZEN | Platform | MVP 必须以 `H5` 形式运行在安卓浏览器中，基线分辨率为 `1080x1920` 竖屏。 | 布局与渲染以竖屏移动端优先。 |
| R-003 | FROZEN | Tech | MVP 技术栈固定为单 `HTML + Canvas2D + 纯 JavaScript`。 | MVP 基线不依赖外部框架。 |
| R-004 | FROZEN | Art | MVP 视觉使用 Canvas 绘制的纯色块占位方案。 | H5 详细视觉规格允许在开发中迭代收敛。 |
| R-005 | FROZEN | Runtime | 玩法运行模型固定为 `fixed 0.02s (50Hz) + update(dt)` 双循环。 | 固定步长负责核心玩法一致性，可变更新负责逐帧系统。 |
| R-006 | FROZEN | Input | 游戏必须同时支持触屏滑动与键盘输入。 | 两种输入路径都应汇聚到同一个玩法命令层。 |
| R-007 | FROZEN | Movement | 玩家移动规则为四向滑行，直到受阻才停。 | 一次移动会持续到撞墙、阻挡物或规则中断点。 |
| R-008 | FROZEN | Movement | 输入缓冲窗口固定为 `0.02s`。 | 若缓冲仍有效，则在当前滑行结束后立即执行。 |
| R-009 | FROZEN | Movement | 玩家移动速度基线为 `5.0 tiles/s`。 | 作为第一版可玩手感基准。 |
| R-010 | FROZEN | Data | MVP 关卡数据必须使用 JSON 兼容的网格格式。 | 每关必须可表示为二维瓦片数组加关卡元数据，例如出生点、出口、收集物和关卡标记。 |
| R-011 | FROZEN | Rules | MVP 必须明确冻结当前支持的瓦片与碰撞子集。 | 当前冻结子集为：`Empty`、`Wall`、`Enter`、`Exit`、`Dot`、`Coin`、`Star`、`Spikes`。新增瓦片必须先更新需求。 |
| R-012 | FROZEN | Flow | 所有纳入范围的 Story 关卡都必须支持完整的开始 -> 失败/通关闭环。 | 适用于 `Story 1`、`Story 2`、`Story 3`。 |
| R-013 | FROZEN | Flow | 已通关关卡必须支持自由重复游玩。 | 这是测试与手感迭代所必需的。 |
| R-014 | FROZEN | Flow | 失败后 `2s` 内必须可以重开。 | MVP 中不允许体力消耗或等价重试成本。 |
| R-015 | FROZEN | UI | `1080x1920` 下 UI 不得遮挡核心可玩区域。 | 玩法可读性优先于装饰性 UI。 |
| R-016 | FROZEN | Performance | 性能目标为中端安卓设备 `>=55 FPS`。 | 在 MVP 收口前必须完成性能验证。 |
| R-017 | FROZEN | Content | `Story 1` 必须完整可玩。 | 包含失败、通关、重开、重复游玩闭环。 |
| R-018 | FROZEN | Content | `Story 2` 必须完整可玩。 | 且不能回退 `Story 1` 体验。 |
| R-019 | FROZEN | Content | `Story 3` 必须完整可玩。 | 用于完成首组 MVP 内容闭环。 |
| R-020 | FROZEN | Deployment | MVP 必须可以通过 URL 在设备浏览器访问。 | 默认采用 GitHub Pages 作为跨设备访问方案。 |
| R-021 | FROZEN | Rules | 项目内文件与文件夹名称必须全英文。 | 允许字符范围受项目命名规则约束。 |
| R-022 | FROZEN | Scope Decision | Lava 不属于当前 `Story 1-3` MVP 验收必需项。 | 原版早期 Story 内容不依赖 Lava。相关数值仅作为后续范围参考。 |

## 来源说明

- 产品范围与交付边界来自本 thread 的宏观项目讨论。
- 运行时、移动、机关与数值基线来自前面已冻结的逆向资料与结论。
- 若需求发生变更，应先更新本文件，再更新执行计划，并在两边都记日志。

## 更新日志

| Date | Type | Summary | Impact |
|---|---|---|---|
| `2026-04-06` | `INIT` | 创建了 MVP 第一版原子化需求清单。 | 项目文档结构开始区分需求层与任务层。 |
| `2026-04-06` | `REFINE` | 补充了关卡数据、瓦片子集、部署与 Lava 范围决策需求。 | 需求边界与实际 MVP 实现路径更加一致。 |
