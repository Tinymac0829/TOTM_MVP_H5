# Worktree 台账

## 使用规则

- 本文件是任务 ID、分支与 worktree 路径的集中登记台账。
- 任何任务 worktree 的创建、分配、暂停、恢复、合并、移除，都必须同步更新本文件。
- `REPO_ROOT` 保留给宏观讨论、版本管理与总进度同步使用。
- 具体任务实现统一放在 `WORKTREE_ROOT` 下的 sibling worktree 中进行。
- 默认分支命名规则：`codex/<task-id-lower>`。
- 默认 worktree 路径规则：`WORKTREE_ROOT/<TASK-ID>`。
- 每个专属任务 thread 都必须在这里登记 `session id`、分支、路径和最新状态。
- 中央 worktree 台账里的 `Session ID` 只记录任务管理 thread，不记录每个子功能 thread。
- 同一 worktree 下的子功能 thread session 信息，统一在对应的任务管理 thread 内部维护。
- 在共享任务 worktree 中，同一时刻只允许一个子功能 thread 改文件或提交。
- 如果子功能 thread 需要并行写文件，必须先拆成新的 branch/worktree。
- 如果新的外部 worktree 触发 Git `dubious ownership`，要先把该路径加入全局 Git `safe.directory`，再在任务工作区里执行 Git 命令。
- 任务结束时，至少保留一条最终日志，再移除工作树记录或改成归档状态。

## 路径锚点约定

- `REPO_ROOT` = 当前仓库根目录。
- `WORKTREE_ROOT` 的解析规则：相对于 `REPO_ROOT` 取 `../TOTM_MVP_Dev_worktrees`。
- `WORKTREE_ROOT` 与 `REPO_ROOT` 是同级目录，不在 `REPO_ROOT` 内部。
- 除非特别说明，版本化文档中的相对路径一律以 `REPO_ROOT` 为解析基准。
- 实际执行命令时，应先将 `REPO_ROOT` / `WORKTREE_ROOT` 展开为当前机器上的绝对路径，再传给 Git、Shell 或聊天交付。

## 工作区角色

| Path | 角色 |
|---|---|
| `REPO_ROOT` | 主工作区：宏观讨论、规划文档、版本基线、状态协调 |
| `WORKTREE_ROOT` | 隔离任务执行 worktree 的容器根目录 |

## 当前 Worktree

| Task ID | Branch | Worktree Path | Session ID | Status | Last Update | Notes |
|---|---|---|---|---|---|---|
| `PM-02` | `codex/pm-02` | `WORKTREE_ROOT/PM-02` | `019d62cd-a740-79c3-b420-88f6f37d2128` | `DONE` | `2026-04-21` | 技术设计文档任务已全部完成，产出文档：PM-02 核心运行时、ENG-02 关卡格式、ENG-03 输入层、ENG-04 移动手感、ENG-05 HUD 状态流、调试面板方案。 |
| `ENG-01` | `codex/eng-01` | `WORKTREE_ROOT/ENG-01` | `TBD` | `DONE` | `2026-04-23` | 任务管理 thread 已接管并完成项目骨架：`index.html`、`src/main.js`、`src/GameLoop.js`、`src/GameState.js`。当前会话无法读取稳定 session id，暂保留 `TBD`。 |
| `ENG-02` | `codex/eng-02` | `WORKTREE_ROOT/ENG-02` | `TBD` | `DONE` | `2026-04-23` | 运行时基础层已完成并提交 `b1b69b4`：`TileType`、`GridMap`、`StageLoader`、`Renderer + Camera` 与 `story_001` JSON 已接通，并通过 Node smoke、HTTP 访问和 `1080x1920` 设备模拟验证。 |
| `ENG-03` | `codex/eng-03` | `WORKTREE_ROOT/ENG-03` | `TBD` | `DONE` | `2026-04-23` | 输入基础层已完成：`TouchInput`、`KeyboardInput`、`InputManager` 已接入 `main.js`，在 `playing` 状态下统一输出方向命令；稳定 session id 暂记为 `TBD`。 |
| `ENG-04` | `codex/eng-04` | `WORKTREE_ROOT/ENG-04` | `TBD` | `DONE` | `2026-05-01` | `R-009` 三层坐标域实现和 `R-008` `0.1s/100ms` 输入缓冲已由 `2026-05-01` ENG-04 × ENG-05 真实浏览器联合回归正式收口。`CoordinateSystem`、`PlayerController`、`Renderer`、模块缓存 query、快速连续滑动、死亡/通关行为、点击/缩放对齐和缓存版本确认均已在加载 `eng04_input_buffer_v1` 时通过。 |
| `ENG-05` | `codex/eng-05` | `WORKTREE_ROOT/ENG-05` | `TBD` | `DONE` | `2026-05-01` | 最小玩法 UI 与 ENG-04 集成链路已由 `2026-05-01` 真实浏览器回归正式收口。world-units 运动、Renderer 坐标适配、短距离过冲处理、`100ms` 输入缓冲、失败/通关弹窗、输入屏蔽、按钮可用时机、HUD 同步、点击/缩放和重复游玩 fallback 均复测为 `PASS`。 |

## 更新日志

| Date | Type | Summary | Impact |
|---|---|---|---|
| `2026-04-06` | `INIT` | 建立 sibling worktree 容器策略，并创建 `WORKTREE_ROOT/PM-02` 的首个任务 worktree。 | 并行开发现在可以在隔离分支和集中台账下启动。 |
| `2026-04-06` | `SAFE_GIT` | 已将 `WORKTREE_ROOT/PM-02` 解析后的本机绝对路径登记到全局 Git `safe.directory`。 | 专属任务 thread 现在可以在该外部 worktree 内直接运行 Git，而不会触发所有权报错。 |
| `2026-04-06` | `STATUS` | 已在集中台账中将 PM-02 标记为 IN_PROGRESS。 | 任务状态跟踪现已与执行计划保持一致。 |
| `2026-04-06` | `SESSION` | 已为 `PM-02` 回填任务管理 thread 的 session id `019d62cd-a740-79c3-b420-88f6f37d2128`。 | 中央台账现在可以直接追踪该任务的管理会话。 |
| `2026-04-06` | `THREAD_MODEL` | 明确了中央台账只记录任务管理 thread，而不是每个子功能 thread。 | 子功能 thread 现在可以在任务层内部管理，不会把跨任务台账刷乱。 |
| `2026-04-21` | `STATUS` | PM-02 标记为 DONE，全部技术设计文档已产出。 | PM-02 worktree 可归档或复用。 |
| `2026-04-23` | `WORKTREE` | 已创建 `ENG-01` 的任务分支 `codex/eng-01` 与 sibling worktree `WORKTREE_ROOT/ENG-01`，并登记到中央台账。 | 下一个任务现在有独立执行环境，后续可在该 worktree 下启动任务管理 thread。 |
| `2026-04-23` | `STATUS` | `ENG-01` 已完成项目骨架并通过本地 HTTP 与 Node smoke 验证。 | `WORKTREE_ROOT/ENG-01` 可进入提交/合并收口流程，后续基础层任务可基于该骨架继续。 |
| `2026-04-23` | `WORKTREE` | 已创建 `ENG-02` 的任务分支 `codex/eng-02` 与 sibling worktree `WORKTREE_ROOT/ENG-02`，并登记到中央台账。 | 运行时基础层任务现在已有独立执行环境，后续可在该 worktree 下启动任务管理 thread。 |
| `2026-04-23` | `STATUS` | `ENG-02` 已完成运行时基础层并提交 `b1b69b4`。 | `WORKTREE_ROOT/ENG-02` 可进入合并/归档收口流程，`v0.1.0` 剩余编码项为 ENG-03 输入层。 |
| `2026-04-23` | `WORKTREE` | 已创建 `ENG-03` 的任务分支 `codex/eng-03` 与 sibling worktree `WORKTREE_ROOT/ENG-03`，并登记到中央台账。 | 输入基础层任务现在已有独立执行环境，后续可在专属任务管理 thread 中启动实现。 |
| `2026-04-23` | `STATUS` | `ENG-03` 已完成输入基础层实现并通过 Node smoke 验证。 | `WORKTREE_ROOT/ENG-03` 已具备统一输入命令层，`v0.1.0` 的基础层编码项现已完成。 |
| `2026-04-24` | `WORKTREE` | 已创建 `ENG-04` 的任务分支 `codex/eng-04` 与 sibling worktree `WORKTREE_ROOT/ENG-04`，并登记到中央台账。 | 核心移动手感任务现在已有独立执行环境，后续可在专属任务管理 thread 中启动实现。 |
| `2026-04-24` | `STATUS` | `ENG-04` 已完成核心移动主链路与 `ENG-05` 最小 HUD/状态流桥接代码，并通过 Node smoke；但浏览器内人工手感验收尚未完成，因此当前维持 `IN_PROGRESS`。 | 在 `ENG-04` 验收并标记 `DONE` 前，`ENG-05` 只能视为具备启动边界，不能标记 `DONE`；若 `ENG-04` 后续调整，`ENG-05` 可能需要联调。 |
| `2026-04-24` | `WORKTREE` | 已创建 `ENG-05` 的任务分支 `codex/eng-05` 与 sibling worktree `WORKTREE_ROOT/ENG-05`，并登记到中央台账。 | 最小玩法 UI 任务现在已有独立执行环境，后续可在专属任务管理 thread 中启动实现。 |
| `2026-04-24` | `STATUS` | `ENG-05` 已从 `READY` 切换为 `IN_PROGRESS`：当前 worktree 已完成 HUD 正式状态流第一轮实现，包括 `menu/loading/fail/complete` 覆盖层、开始按钮进入 `story_001`、失败重开、以及在仅接入 `story_001` 时通关后回退到重复游玩；已通过浏览器桩 smoke 验证主链路。 | `WORKTREE_ROOT/ENG-05` 现在已进入实际开发阶段，但在 `ENG-04` 收口前仍需保留联调空间，暂不能宣告最终完成。 |
| `2026-04-24` | `DOC` | 已在 `WORKTREE_ROOT/ENG-05/docs/features/` 下新增 `ENG-04 × ENG-05` 联合验收功能卡、短版执行清单与真实浏览器联调记录模板，并补齐三份文档之间的相对路径引用。 | `ENG-05` 的任务管理 thread 现在已具备完整的联调执行材料，后续浏览器联调和问题记录可以直接在当前 worktree 内闭环进行。 |
| `2026-04-26` | `VALIDATION` | `ENG-04 × ENG-05` 已在 `WORKTREE_ROOT/ENG-04` 完成真实浏览器联合验收，并在当时将 `ENG-04`、`ENG-05` 标记为 `DONE`。 | 该结论为历史记录；已被 `2026-04-27` runspeed 基线重开覆盖。 |
| `2026-04-27` | `BASELINE` | 当时新版逆向报告确认实际移动速度应为 `8.0 tiles/s`，前一轮实现误把 `_runSpeed = 5.0` base 值当作实际速度。 | 该结论已被 `2026-04-28` 记录覆盖；保留为历史记录。 |
| `2026-04-28` | `BASELINE` | 逆向报告与人工逐帧验证重新确认：`_runSpeed = 5.0 world units/s`，单格尺寸 `0.12 world units/tile`，当前 tile-grid 代码应使用约 `41.67 tiles/s`，`_gameStageScale = 1.6` 不参与玩家 tile 位移速度换算。 | 该基线仍为当前权威口径，并已由 `2026-05-01` ENG-04 代码与验收记录完成实现和回归。 |
| `2026-04-29` | `DESIGN` | ENG-04 采用三层坐标域严谨化方案，并要求新增统一坐标模块、改 `PlayerController` world 坐标字段、在 `PlayerController` 内处理固定步长过冲、让 `Renderer` 适配 `worldX/worldZ`。 | 该设计方向已由 `2026-05-01` 实现与真实浏览器回归记录覆盖；当前剩余状态是任务收口确认，不是代码回改。 |
| `2026-04-30` | `BASELINE` | ENG-04 修正 `R-008` 输入缓冲窗口为 `0.1s/100ms`，并明确缓冲倒计时走 `update(dt)`、玩家位移仍走 `fixedUpdate`；空间定位采用 C 方案，只新增 center API，不切换现有 origin 主坐标语义。 | 该基线已由 `2026-05-01` 代码与真实浏览器回归记录完成实现和复验。 |
| `2026-05-01` | `CODE` | 已完成 ENG-04 当前基线代码批次：新增 `CoordinateSystem` half-tile 与 center API 且保留 origin 语义；将输入缓冲倒计时迁移到 `PlayerController.update(deltaTime)`；玩家位移继续走 `fixedUpdate`；模块缓存 query 更新为 `eng04_input_buffer_v1`。 | 移动、收集、死亡、通关、缓冲过期/覆盖和连锁转向语义的自动语法与行为校验均已通过。 |
| `2026-05-01` | `VALIDATION` | 真实浏览器回归已通过：`story_001` 主链路、快速连续滑动与 AHK 边界测试、`eng04_death_validation`、弹窗输入屏蔽、点击/缩放对齐和缓存版本确认均为 `PASS`。 | `ENG-04 × ENG-05` 集成基线已在 R-009 坐标域与 R-008 输入缓冲变更后重新验证；两个测试入口均确认加载 `eng04_input_buffer_v1`。 |
| `2026-05-01` | `STATUS` | 基于已归档的联合真实浏览器回归结果，正式将 `ENG-04` 与 `ENG-05` 标记为 `DONE`。 | 当时任务台账已与主分支基线同步；`LVL-01` 在执行计划中收口，`QA-01` 留给后续独立收口。 |
| `2026-05-01` | `QA` | 已在 `docs/features/` 下新增主分支 QA-01 文档化收口记录，并在执行计划中将 QA-01 标记为 `DONE`。 | 本次没有创建 QA-01 专属 worktree；收口依据为既有真实浏览器回归证据、输入路径代码核查与 ENG-03 时序预算。 |
| `2026-05-06` | `OPS` | OPS-01 已完成主分支收口：GitHub Pages 可玩 URL、桌面 smoke、Android 真机按钮命中、普通滑动、连续不离屏滑动、多触点干扰、长按后再滑与主链路 smoke 均通过。 | OPS-01 现标记为 `DONE`；最终移动端输入基线为 `0.03 / 0.16` 距离阈值、`SWIPE_TIME_SECONDS = 1.0` 时间窗口和 `activeTouchId` 主触点 ID 跟踪。 |




