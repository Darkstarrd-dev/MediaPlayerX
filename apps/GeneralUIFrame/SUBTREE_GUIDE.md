# GeneralUIFrame Subtree 使用说明

本文档说明 `apps/GeneralUIFrame` 作为子项目时，如何使用 `git subtree` 与独立仓库同步。

## 背景

- 主仓库：`MediaPlayerX`
- 子目录：`apps/GeneralUIFrame`
- 子仓库（独立远端）：`general-ui-frame`
- 目标：在同一工作区开发，同时可独立发布到 Cloudflare Pages

## 关键结论

1. 主仓库 `git push origin ...` **不会自动**把 `apps/GeneralUIFrame` 推到子仓库。
2. 推送到子仓库必须显式执行 `git subtree push --prefix=apps/GeneralUIFrame general-ui-frame <branch>`。
3. 从子仓库同步回主仓库必须显式执行 `git subtree pull --prefix=apps/GeneralUIFrame general-ui-frame <branch> --squash`。

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
3. 主仓库正常 `git push origin <branch>`。
4. 需要同步给独立仓库/Cloudflare 时，再执行 `git subtree push ...`。

## FAQ

### Q1: 我 `git push origin` 了，为什么子仓库没更新？

因为 `subtree` 不是自动双向镜像。主仓库 push 只会更新主仓库远端。

### Q2: 可以只在子仓库改，再回同步主仓库吗？

可以。改完后在主仓库执行 `git subtree pull --prefix=apps/GeneralUIFrame ... --squash` 即可。

### Q3: 什么时候需要 `split`？

日常不需要。`subtree push` 已包含导出逻辑。只有在做高级 CI 自动化时才考虑单独 `git subtree split`。

### Q4: 在另一台机器 `git pull` 主仓库后，子项目会自动更新到子仓库最新吗？

不会自动追子仓库最新。

- `git pull` 主仓库后，你会拿到主仓库里记录的 `apps/GeneralUIFrame` 版本。
- 若要额外同步子仓库最新，请再执行 `npm run subtree:pull:generaluiframe`。
