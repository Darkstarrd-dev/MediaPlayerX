# 远程同步安全流程（防覆盖）

> 目的：在保留本目录离仓备份的前提下，将工作区安全对齐到远程最新进度。

## 1. 离仓备份

先把整个目录复制到项目外：

- `docs/ref/ad-review-data/`

建议额外保留压缩包副本。

## 2. 远程对齐（覆盖工作区）

将 `<branch>` 替换为目标分支（例如 `main`）：

```bash
git fetch origin
git switch <branch>
git reset --hard origin/<branch>
git clean -fd
```

说明：

- `reset --hard` 会覆盖已跟踪文件到远程状态。
- `clean -fd` 会删除未跟踪文件和目录。

## 3. 恢复资料目录

把外部备份的 `ad-review-data` 目录复制回：

- `docs/ref/ad-review-data/`

## 4. 恢复后启动顺序

1. `docs/ref/ad-review-data/START_HERE.md`
2. `docs/ref/ad-review-data/RECOVERED_PROGRESS_AND_REIMPLEMENTATION_GUIDE.md`
3. 关键结果：
   - `results/unified-review-head-tail-test/run-2026-03-03T14-01-55-370Z/raw.json`
   - `results/unified-review-head-tail-test/run-2026-03-03T14-01-55-370Z/head3-direct-prompt-repeat5.json`
