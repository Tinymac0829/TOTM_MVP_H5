# Thread 协作指南

## 目的

- 本文档定义项目级 thread、任务级 thread、子功能 thread 之间的协作关系。
- 它用于统一进度同步、任务拆解与工作区纪律，避免 thread 数量增加后管理失控。
- 本文档中的路径默认以 `REPO_ROOT` 为解析基准。
- `WORKTREE_ROOT` 的解析规则：相对于 `REPO_ROOT` 取 `../TOTM_MVP_Dev_worktrees`。
- `WORKTREE_ROOT` 与 `REPO_ROOT` 是同级目录，不在 `REPO_ROOT` 内部。

## Thread 分层

### 项目进度管理 Thread

- Workspace: `REPO_ROOT`
- Branch: `master`
- 用途：项目范围、版本计划、进度同步、session id 回填、风险与阻塞同步、跨任务协调。
- 这个 thread 不承担具体功能实现细节。

### 任务管理 Thread

- Workspace: `WORKTREE_ROOT/<TASK-ID>`
- Branch: `codex/<task-id-lower>`
- 用途：管理单个任务，维护该任务的子功能拆解、收集子 thread 进度，并作为该任务的主同步面。
- 中央 worktree 台账里的 `Session ID` 默认记录的就是这个任务管理 thread 的 session id。

### 子功能 Thread

- 默认使用父任务的同一个 worktree。
- 默认使用父任务的同一个 branch。
- 用途：只完成该任务下的一个具体切片。
- 子功能 thread 的 session id 默认不进入中央 worktree 台账，而是在对应的任务管理 thread 内部维护。

## 操作规则

- 整个仓库只保留一个项目进度管理 thread。
- 当一个任务准备拆成多个子功能 thread 时，先建立该任务自己的管理 thread。
- 一个任务管理 thread 可以协调多个子功能 thread。
- 多个子功能 thread 只有在“不并发写文件”时，才允许共用同一个任务 worktree。
- 在共享任务 worktree 模式下，同一时刻只允许一个 writer thread 改文件或提交。
- 子功能 thread 在共享任务 worktree 中动手前，先重新读取最新文件并检查 `git status`。
- 如果需要真正并行写文件，必须先拆成新的 branch/worktree，再开始编辑。
- 不要手动复制出临时仓库副本来代替 branch/worktree。

## 推荐模式

### 小任务

- 一个任务 thread 就够了。
- 不需要额外拆子功能 thread。

### 中等任务

- 一个任务管理 thread。
- 一个或多个子功能 thread，但同一时刻只允许一个 writer thread。

### 大任务并行

- 一个任务管理 thread。
- 多个子功能 thread。
- 如果多个子功能 thread 必须并行写文件，就把它们提升成独立 branch/worktree。

## 同步规则

- 项目级决策同步回项目进度管理 thread。
- 任务级进度同步回对应的任务管理 thread。
- 任务管理 thread 负责把自己的 session id、branch、worktree 路径和状态同步到 `docs/worktree_registry_zh.md`。
- 子功能 thread 默认不直接写中央 worktree 台账。

## PM-02 示例

- 项目进度管理 thread：停留在 `REPO_ROOT` 的 `master`。
- PM-02 管理 thread：停留在 `WORKTREE_ROOT/PM-02` 的 `codex/pm-02`。
- PM-02 子功能 thread：如果不并发写文件，也继续停留在 `WORKTREE_ROOT/PM-02` 的 `codex/pm-02`。
- 如果 PM-02 将来需要真正并行写文件，再额外创建新的 branch/worktree 隔离。
