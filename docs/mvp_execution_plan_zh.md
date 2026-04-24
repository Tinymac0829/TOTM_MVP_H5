# MVP 开发任务计划

## 使用规则

- 本文件是 MVP 的开发任务计划，用于跟踪执行、版本计划与更新日志。
- 原子化交付需求定义在 `docs/mvp_requirement_list_zh.md`。
- 每次开发或计划变更时，都要同步更新本文件。
- 必须同步的场景：
- 范围变更
- 基线冻结或解冻
- 版本开始或结束
- 排期变化
- 重大风险或阻塞
- 重大技术决策
- `主 TODO`、`版本计划`、`排期`、`更新日志` 四个部分必须保持一致。
- 每条任务都应引用需求清单中的一个或多个需求 ID。

## 状态标记

- `TODO` = 未开始
- `IN_PROGRESS` = 进行中
- `DONE` = 已完成
- `BLOCKED` = 被阻塞
- `FROZEN` = 已冻结

## 项目快照

- 项目：`TOTM_MVP_Dev`
- 平台：`H5`，安卓浏览器，`1080x1920` 竖屏
- 技术栈：单 `HTML + Canvas2D + 纯 JavaScript`，采用 ES Modules 多文件组织（`src/` 目录下按模块拆分，浏览器原生 `<script type="module">` 加载）
- 范围：`Story 1-3 + 核心手感`
- 交付顺序：`Story 1 -> Story 2 -> Story 3`
- 运行时基线：`fixed 0.02s (50Hz) + update(dt)`
- 美术基线：Canvas 纯色块占位，视觉细规格在实现过程中逐步收敛
- 命名规则：文件与文件夹仅允许英文命名

## 并行 Worktree 规则

- 本文档中的路径默认以 `REPO_ROOT` 为解析基准。
- `REPO_ROOT` 作为主工作区，只负责宏观讨论、版本管理与集中状态同步。
- 只有在多个开发 thread 需要并行写代码时，才引入专属 branch/worktree。
- 并行任务执行统一使用 `WORKTREE_ROOT` 下的 sibling Git worktree。
- 路径锚点约定：`WORKTREE_ROOT = ../TOTM_MVP_Dev_worktrees`。
- 默认映射规则：任务 ID -> 分支 `codex/<task-id-lower>` -> worktree 路径 `WORKTREE_ROOT/<TASK-ID>`。
- 不要手动复制出多个独立工作区副本；需要隔离时统一使用 Git branch/worktree。
- 一旦某任务存在专属 worktree，就不要再在主工作区里并行做该任务的功能开发。
- 每个任务 thread 都必须把 `session id`、分支、worktree 路径与状态同步到 `docs/worktree_registry_zh.md`。
- 单个任务 worktree 内允许采用三级 thread 分层：项目进度 thread、任务管理 thread、子功能 thread。
- 当一个任务准备拆成多个子功能 thread 时，建议先建立该任务自己的管理 thread。
- 多个子功能 thread 只有在“不并发写文件”时，才允许共用同一个任务 worktree/branch。
- 在共享任务 worktree 中，同一时刻只允许一个 writer thread 改文件或提交。
- 如果两个及以上子功能 thread 需要并行写文件，必须先拆成新的 branch/worktree，再开始编辑。
- 子功能 thread 在共享任务 worktree 中动手前，先重新读取最新文件并检查 `git status`。
- 中央 worktree 台账里的 `Session ID` 只记录任务管理 thread；子功能 thread 的 session 信息在该任务管理 thread 内部同步即可。
- 当任务被合并、冻结或放弃时，要同时更新台账和本执行计划的更新日志。

## 验收基线

- `FROZEN` 输入缓冲：`0.02s`
- `FROZEN` 玩家移动速度：`5.0 tiles/s`
- `FROZEN` 四向滑行直到受阻才停
- `FROZEN` 通过固定步长玩法循环保证跨设备手感一致
- `FROZEN` `Story 1-3` 每关都必须支持完整的开始 -> 失败/通关闭环
- `FROZEN` 通关后的关卡可以自由重复游玩
- `FROZEN` 失败后 `2s` 内可重开
- `FROZEN` MVP 中重开不消耗体力
- `FROZEN` `1080x1920` 下 UI 不得遮挡核心可玩区
- `FROZEN` 性能目标：中端安卓设备 `>=55 FPS`

## 主 TODO

| ID | Status | Requirement IDs | Item | Done When |
|---|---|---|---|---|
| PM-01 | DONE | `R-021` | 完成初始 Git 基线提交 | 当前规则与脚本已经作为仓库基线提交 |
| PM-02 | DONE | `R-001,R-002,R-003,R-005,R-006,R-007,R-008,R-009,R-010,R-011,R-012,R-013,R-014,R-015,R-020` | 产出首版技术设计文档 | 运行时循环、网格格式、状态流、输入、碰撞子集、关卡格式、HUD、调试方案与部署路径均有文档说明 |
| ENG-01 | DONE | `R-002,R-003,R-004` | 创建可运行的项目骨架 | `index.html` + `src/` ES Modules 目录结构就位，Canvas 初始化、GameLoop、GameState 可运行，空白 Canvas 以 60fps 刷新 |
| ENG-02 | DONE | `R-005,R-010,R-015` | 搭建运行时基础层 | TileType、GridMap、StageLoader、Renderer + Camera 已接通，能加载 JSON 关卡并渲染瓦片画面 |
| ENG-03 | DONE | `R-006,R-008` | 实现输入基础层 | 触屏滑动与键盘输入统一走同一输入层，并可在 `playing` 状态下输出标准化方向命令 |
| ENG-04 | IN_PROGRESS | `R-007,R-008,R-009,R-011` | 实现核心移动手感 | 滑到受阻才停、撞墙停下、当前支持瓦片碰撞与输入缓冲手感正确，并完成浏览器内人工手感验收后方可标记 `DONE` |
| ENG-05 | IN_PROGRESS | `R-012,R-013,R-015` | 实现最小玩法 UI | 开始、失败、通关、重开、重复游玩流程可见且可用；在 `ENG-04` 验收完成并标记 `DONE` 前，理论上不得标记 `DONE` |
| LVL-01 | TODO | `R-010,R-011,R-012,R-017` | 接入 `Story 1` | 关卡可完整游玩并进入失败/通关 |
| QA-01 | TODO | `R-006,R-007,R-008,R-009,R-017` | 完成 `Story 1` 手感验证 | 基线设备上输入到响应延迟低于 `50ms`、四向识别测试正确、且 `20ms` 缓冲窗口内输入可生效 |
| OPS-01 | TODO | `R-020` | 配置 GitHub Pages 部署 | 当前可玩构建可通过 URL 在多设备浏览器访问 |
| LVL-02 | TODO | `R-010,R-011,R-012,R-018` | 接入 `Story 2` | 关卡可完整游玩，且不回退 `Story 1` 体验 |
| QA-02 | TODO | `R-017,R-018` | 完成 `Story 1-2` 回归检查 | 两关共享的手感与状态流保持一致 |
| LVL-03 | TODO | `R-010,R-011,R-012,R-019` | 接入 `Story 3` | 关卡可完整游玩，并完成第一组 MVP 关卡闭环 |
| QA-03 | TODO | `R-017,R-018,R-019` | 完成 `Story 1-3` 回归检查 | 三关均可重复游玩且稳定 |
| PERF-01 | TODO | `R-016` | 完成安卓性能检查 | 中端安卓浏览器接近目标帧率 |
| REL-01 | TODO | `R-001,R-016,R-017,R-018,R-019,R-020` | 准备 MVP 冻结候选版 | `v0.3.1` 只包含修复，不再新增范围 |

## 延后范围说明

| ID | Status | Requirement IDs | Item | Notes |
|---|---|---|---|---|
| FUT-01 | FROZEN | `R-022` | 当前 Story `1-3` 交付路径不实现 Lava | 只有当范围扩展到更后面的内容时才重新讨论。 |

## 版本计划

| Version | Status | Task IDs | Goal | Exit Criteria |
|---|---|---|---|---|
| `v0.0.1` | DONE | `PM-01` | 仓库基线 | Git 已初始化，规则与脚本已提交 |
| `v0.1.0` | DONE | `PM-02, ENG-01, ENG-02, ENG-03` | 设计 + 基础层 | 技术设计文档存在，关卡数据路径已定义，可运行框架已存在。PM-02、ENG-01、ENG-02、ENG-03 已完成 |
| `v0.1.1` | IN_PROGRESS | `ENG-04, ENG-05, LVL-01, QA-01, OPS-01` | 核心手感 + `Story 1` + URL 访问 | `Story 1` 可玩，手感基线通过，并且构建已可通过 URL 访问 |
| `v0.2.0` | TODO | `LVL-02, QA-02` | `Story 2` | `Story 1-2` 均可游玩并完成回归检查 |
| `v0.3.0` | TODO | `LVL-03, QA-03` | `Story 3` | `Story 1-3` 全部可游玩且可重复体验 |
| `v0.3.1` | TODO | `PERF-01, REL-01` | 稳定收口 | 只修复问题，不再扩范围 |

## 排期

| Window | Version | Focus |
|---|---|---|
| `2026-04-06` | `v0.0.1` | Git 基线提交 |
| `2026-04-06` 到 `2026-04-21` | `v0.1.0`（设计阶段） | 技术设计文档（PM-02 已完成） |
| `2026-04-22` 到 `2026-04-25` | `v0.1.0`（编码阶段） | 项目骨架（ENG-01）、运行时基础层（ENG-02）、输入层（ENG-03） |
| `2026-04-26` 到 `2026-04-30` | `v0.1.1` | 核心移动手感（ENG-04）、最小玩法 UI（ENG-05）、`Story 1` 接入（LVL-01）、手感验证（QA-01）、部署（OPS-01） |
| `2026-05-01` 到 `2026-05-03` | `v0.2.0` | `Story 2` 接入（LVL-02）、回归检查（QA-02） |
| `2026-05-04` 到 `2026-05-06` | `v0.3.0` | `Story 3` 接入（LVL-03）、回归检查（QA-03） |
| `2026-05-07` 到 `2026-05-09` | `v0.3.1` | 性能检查（PERF-01）、冻结候选版（REL-01） |

## 未决项

- `NON_BLOCKING` H5 详细美术规格继续采用“实现驱动”的方式收敛。
- `REFERENCE_ONLY` Lava 数值仍保留文档参考，但不属于当前 Story `1-3` 交付范围。

## 更新日志

| Date | Type | Summary | Impact |
|---|---|---|---|
| `2026-04-06` | `INIT` | 基于前期宏观讨论创建了 MVP 执行计划。 | 建立了第一版计划基线。 |
| `2026-04-06` | `BASELINE` | 冻结了宏观范围、运行时模型、命名规则与验收基线。 | MVP 可以进入执行阶段。 |
| `2026-04-06` | `ENV` | 已初始化 Git 并启用项目 hook 路径。 | 版本管理已就绪，在当时首个提交仍待完成。 |
| `2026-04-06` | `DOC` | 新增了中文镜像版 MVP 执行计划。 | 规划文档将以中英文双版本维护。 |
| `2026-04-06` | `STRUCTURE` | 新增需求清单，并让任务引用需求 ID。 | 文档结构已对齐为 需求 -> 任务 分层。 |
| `2026-04-06` | `REFINE` | 补充了关卡数据、瓦片子集、部署、版本边界与 QA 指标。 | 任务计划与当前 MVP 边界更加一致。 |
| `2026-04-06` | `GIT` | 完成了初始 Git 基线提交 `0b34495`。 | `PM-01` 与 `v0.0.1` 已完成。 |
| `2026-04-06` | `WORKTREE` | 采用 sibling worktree 策略，并初始化了 `PM-02` 任务的首个 worktree 基线。 | 并行任务 thread 现在有统一的隔离执行方式和集中同步入口。 |
| `2026-04-06` | `STATUS` | 已将 PM-02 调整为 IN_PROGRESS，并把 0.1.0 切换到执行中。 | 技术设计文档赛道已成为当前的宏观执行重点。 |
| `2026-04-06` | `THREAD_MODEL` | 增补了 项目进度 / 任务管理 / 子功能 thread 的协作分层模型。 | 后续任务 thread 可以扩展，但不会平白增加不必要的分支和 worktree。 |
| `2026-04-21` | `TECH_DECISION` | 项目快照补充 ES Modules 多文件代码组织方案；ENG-01、ENG-02 的 Done When 与 PM-02 2.8.2 实现阶段对齐。 | 代码组织决策已从 PM-02 同步到执行计划，任务验收标准更具体。 |
| `2026-04-21` | `STATUS` | PM-02 标记为 DONE（全部技术设计文档已产出）；排期从 4/21 起重新拉，v0.1.0 拆分为设计阶段（已完成）和编码阶段（4/22-4/25），整体预计 5/9 收口。 | 项目从设计阶段正式进入编码阶段，排期与实际进度对齐。 |
| `2026-04-23` | `WORKTREE` | 已创建 `ENG-01` 的任务分支 `codex/eng-01` 与 sibling worktree，并同步到中央台账。 | 下一个编码任务现在已有独立执行环境，可在专属 worktree 中启动任务管理 thread。 |
| `2026-04-23` | `DOC_RULE` | 基线文档中的工作区路径已从机器绝对路径切换为 `REPO_ROOT` / `WORKTREE_ROOT` 锚点规范，并同步更新相关镜像与模板文档。 | 跨设备同步时不再依赖固定盘符，路径文档维护成本降低。 |
| `2026-04-23` | `CODE` | `ENG-01` 项目骨架已完成：新增 `index.html`、`src/main.js`、`src/GameLoop.js`、`src/GameState.js`，并通过本地 HTTP 与 Node smoke 验证。 | `v0.1.0` 的可运行框架已存在，后续可继续接入 ENG-02 运行时基础层与 ENG-03 输入层。 |
| `2026-04-23` | `CODE` | `ENG-02` 运行时基础层已完成并提交 `b1b69b4`：新增 `TileType`、`GridMap`、`StageLoader`、`Renderer` 与 `stages/story_001.json`，入口已加载并渲染 `story_001`。 | `v0.1.0` 已具备 JSON 关卡加载与瓦片渲染链路，后续可继续接入 ENG-03 输入层。 |
| `2026-04-23` | `CODE` | `ENG-03` 输入基础层已完成：新增 `TouchInput`、`KeyboardInput`、`InputManager`，并在 `main.js` 中接入 `playing` 状态启停与方向命令控制台输出；已通过 Node smoke 验证。 | `v0.1.0` 的基础层现已闭环完成，后续可继续进入 ENG-04 核心移动手感实现。 |
| `2026-04-24` | `STATUS` | `ENG-04` 已完成核心移动主链路与 `ENG-05` 最小 HUD/状态流桥接代码，并通过 Node smoke；由于浏览器内人工手感验收尚未完成，因此当前维持 `IN_PROGRESS`，不能标记 `DONE`。 | `v0.1.1` 已切换到执行中；`ENG-05` 当前仅具备启动边界，在 `ENG-04` 验收并标记 `DONE` 前，理论上不能标记 `DONE`。 |
| `2026-04-24` | `RISK` | 若后续浏览器人工验收发现 `ENG-04` 仍需调整事件时序、移动手感或状态边界，则 `ENG-05` 可能需要联调。 | 后续 UI/状态流开发需以 `ENG-04` 验收收口结果为准，避免过早冻结交互边界。 |
| `2026-04-24` | `CODE` | `ENG-05` 已从过渡桥接层推进到正式实现阶段：`HUD.js` 新增 `menu/loading/fail/complete` 状态覆盖层、按 `1080x1920` 设计尺寸缩放的布局与点击区域、以及失败/通关按钮动作映射；`main.js` 已接入开始界面、Story 1 启动链路、失败重开、通关后在当前仅接入 `story_001` 时的重复游玩 fallback，并通过浏览器桩 smoke 验证。 | `ENG-05` 已从 `TODO` 切换到 `IN_PROGRESS`，当前最小玩法 UI 已具备开始→游玩→通关/失败→重开/重复游玩的主链路；后续仍需结合真实浏览器手工验证与 `ENG-04` 联调收口。 |
| `2026-04-24` | `DOC` | 已为 `ENG-04 × ENG-05` 联调新增 3 份配套文档：`docs/features/eng04_eng05_joint_acceptance_card.md`、`docs/features/eng04_eng05_joint_acceptance_checklist.md`、`docs/features/eng04_eng05_browser_validation_log_template.md`，并补齐三者之间的相对路径互链。 | 后续真实浏览器联调、现场勾选与问题记录现在已有统一模板，`ENG-04` 与 `ENG-05` 的联合验收口径更容易保持一致。 |








