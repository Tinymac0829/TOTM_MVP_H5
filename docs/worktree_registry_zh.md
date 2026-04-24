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
- `WORKTREE_ROOT` = 相对 `REPO_ROOT` 的 `../TOTM_MVP_Dev_worktrees`。
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
| `ENG-04` | `codex/eng-04` | `WORKTREE_ROOT/ENG-04` | `TBD` | `IN_PROGRESS` | `2026-04-24` | 核心移动主链路与最小 HUD/状态流桥接代码已接通，并通过 Node smoke；由于尚未完成浏览器内人工手感验收，当前保持 `IN_PROGRESS`，不能标记为 `DONE`。若后续验收触发事件时序或手感边界调整，`ENG-05` 可能需要联调，因此在 `ENG-04` 变为 `DONE` 前，理论上 `ENG-05` 也不能标记为 `DONE`。 |
| `ENG-05` | `codex/eng-05` | `WORKTREE_ROOT/ENG-05` | `TBD` | `READY` | `2026-04-24` | 已创建任务分支与 sibling worktree。当前会话只完成主工作区登记，不写代码，等待 `ENG-05` 任务管理 thread 接管并回填 session id。 |

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




