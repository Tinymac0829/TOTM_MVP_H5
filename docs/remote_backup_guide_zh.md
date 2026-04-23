# 远程备份说明

更新日期：2026-04-23

## 目的

本文档用于记录 TOTM MVP H5 仓库当前的远程备份仓库信息，以及最小可重复的推送流程。

## 当前远程仓库

- Remote 名称：`origin`
- HTTPS 地址：`https://github.com/Tinymac0829/TOTM_MVP_H5.git`

## 当前已推送分支

- `master`
- `codex/pm-02`

## 当前本地跟踪关系

- `master` -> `origin/master`
- `codex/pm-02` -> `origin/codex/pm-02`

## 最小备份流程

### 推送主分支

```powershell
git -C E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev push
```

### 首次推送新的任务分支

```powershell
git -C E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev push -u origin <branch-name>
```

### 查看远程配置

```powershell
git -C E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev remote -v
```

### 查看本地分支跟踪关系

```powershell
git -C E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev branch -vv
```

## 建议规则

1. 主工作区的基线文档、规则文档和计划文档优先在 `master` 提交并推送。
2. 任务 worktree 的任务分支在需要远程备份时单独推送，不要强制和 `master` 绑定发布节奏。
3. 在任务分支合并或冻结前，至少做一次远程推送，确保外部备份存在。
4. 推送前先确认 `git status` 干净，避免把未审阅的临时文件一起备份出去。

## 当前仓库路径

- 主仓库：`E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev`
- 当前任务 worktree：`E:\GameDev\H5\Project\TOTM_MVP\TOTM_MVP_Dev_worktrees\PM-02`
