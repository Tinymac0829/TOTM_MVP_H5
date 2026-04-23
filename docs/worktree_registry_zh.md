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
| `ENG-01` | `codex/eng-01` | `WORKTREE_ROOT/ENG-01` | `TBD` | `READY` | `2026-04-23` | 已创建任务分支与 sibling worktree，等待 `ENG-01` 任务管理 thread 接管并回填 session id。 |

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




