# GeneralUIFrame Subtree 使用说明

本文档说明 `apps/GeneralUIFrame` 作为子项目时，如何使用 `git subtree` 与独立仓库同步。

## 背景

- 主仓库：`MediaPlayerX`
- 子目录：`apps/GeneralUIFrame`
- 子仓库（独立远端）：`general-ui-frame`
- 目标：在同一工作区开发，同时可独立发布到 Cloudflare Pages

## 关键结论

1. 主仓库已经接入自动同步工作流：`main` 分支推送且命中 `apps/GeneralUIFrame/**` 时，会自动同步到子仓库 `GeneralUIFrame/main`。
2. 日常开发默认只需要操作主仓库（`git pull` / `git commit` / `git push`）。
3. 只有在需要“从子仓库反向拉回主仓库”或“手动应急同步”时，才需要执行 `git subtree pull/push`。

## 自动同步（推荐）

工作流文件：`.github/workflows/sync-generaluiframe.yml`

触发条件：

- `push` 到主仓库 `main`
- 且本次提交包含 `apps/GeneralUIFrame/**` 变更
- 或手动触发 `workflow_dispatch`

必要配置：

在主仓库 GitHub Actions Secrets 中配置：

- `GENERAL_UI_FRAME_SYNC_TOKEN`

建议该 Token 具备最小权限：

- 对 `Darkstarrd-dev/GeneralUIFrame` 仓库的 `contents: write`

> 未配置该 Token 时，工作流会明确失败并提示配置步骤。

## 常用命令

以下命令都在主仓库根目录执行（即 `C:\opencode\MediaPlayer`）。

### 0) 固定脚本（推荐）

已在主仓库 `package.json` 提供固定脚本，适合在其他主机拉取后直接使用：

```bash
npm run subtree:setup:generaluiframe
npm run subtree:pull:generaluiframe
npm run subtree:push:generaluiframe
```

说明：

- `subtree:pull:generaluiframe` 会自动确保 remote 为 `general-ui-frame`，并执行 pull（`--squash`）。
- `subtree:push:generaluiframe` 会自动确保 remote 后再执行 push。
- 默认分支为 `main`。

### 1) 查看远端

```bash
git remote -v
```

预期同时看到：

- `origin`（主仓库）
- `general-ui-frame`（子仓库）

### 2) 将子目录推送到子仓库

```bash
git subtree push --prefix=apps/GeneralUIFrame general-ui-frame main
```

含义：把 `apps/GeneralUIFrame` 目录历史导出并推到 `general-ui-frame/main`。

### 3) 从子仓库拉回子目录

```bash
git subtree pull --prefix=apps/GeneralUIFrame general-ui-frame main --squash
```

含义：把子仓库 `main` 合并回主仓库对应目录，`--squash` 会压缩为一次合并提交。

### 4) 读取子项目历史（在主仓库里）

```bash
git log -- apps/GeneralUIFrame
```

### 5) 只查看子项目改动

```bash
git status -- apps/GeneralUIFrame
git diff -- apps/GeneralUIFrame
```

## 推荐工作流

1. 在主仓库里开发 `apps/GeneralUIFrame`。
2. 在主仓库提交（保留完整上下文）。
3. 正常 `git push origin main`。
4. 等待 GitHub Actions 自动同步到 `GeneralUIFrame` 子仓库。

## FAQ

### Q1: 我 `git push origin` 了，为什么子仓库没更新？

先检查两点：

1. 是否推送到 `main`（自动同步仅监听 `main`）
2. 本次提交是否包含 `apps/GeneralUIFrame/**` 变更

若都满足，请查看 Actions 中 `Sync GeneralUIFrame Subtree` 工作流日志。

### Q2: 可以只在子仓库改，再回同步主仓库吗？

可以。改完后在主仓库执行 `git subtree pull --prefix=apps/GeneralUIFrame ... --squash` 即可。

### Q3: 什么时候需要 `split`？

日常不需要。`subtree push` 已包含导出逻辑。只有在做高级 CI 自动化时才考虑单独 `git subtree split`。

### Q4: 在另一台机器上要不要额外做 subtree 同步？

默认不需要。

- 常规协作只要 `git pull` 主仓库即可。
- 只在“子仓库被直接修改过”的特殊场景，才需要额外 `npm run subtree:pull:generaluiframe`。
