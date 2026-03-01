# 音频增强模式长稳测试执行与记录模板（v1）

Last updated: 2026-02-28

## 1. 适用范围

- 用于 `mpv` 增强模式与转码能力在 P3 收口阶段的长稳验收。
- 覆盖自动化质量门禁、异常恢复与熔断、60 分钟长时播放、转码并发治理验证。

## 2. 前置条件

- 使用 Windows 非管理员终端启动（避免 UAC 导致拖拽/权限行为异常）。
- 当前分支已同步到待验收提交。
- 准备样本：
  - 音频样本 >= 100 首（建议混合 `mp3/flac/wav/ape/opus` 等）。
  - CUE 样本 >= 2 组（单文件 CUE 1 组、多文件 CUE 1 组）。

## 3. 执行总流程

1. 执行自动化质量门禁。
2. 启动桌面端并确认增强模式可播放。
3. 执行“连续异常退出”测试，验证自动拉起与熔断。
4. 执行 >= 60 分钟长稳播放并记录每 10 分钟检查点。
5. 分别验证并发 `1` 和 `2` 的 100 首转码行为。
6. 回填记录模板并给出最终通过结论。

## 4. 详细步骤与操作

### 4.1 自动化质量门禁

```bash
npm run quality:ci
npm run build:electron
```

回填：命令通过/失败、失败摘要、耗时。

### 4.2 启动与基础冒烟

```bash
npm run dev:desktop
```

操作检查项：

- 设置中切换到增强模式（`mpv`）。
- 播放任一音频并确认有声。
- 验证基础控制：播放/暂停、seek、音量。

回填：是否全部通过，若失败记录触发路径。

### 4.3 连续异常退出测试（自动拉起 + 熔断）

在独立 PowerShell 执行以下脚本（建议播放中执行）：

```powershell
for ($i=1; $i -le 4; $i++) {
  $p = Get-CimInstance Win32_Process |
    Where-Object { $_.Name -eq "mpv.exe" -and $_.CommandLine -match "mpx-mpv-" } |
    Select-Object -First 1

  if ($null -eq $p) {
    Write-Host "未找到 mpv 进程，停止测试"
    break
  }

  Stop-Process -Id $p.ProcessId -Force
  Write-Host "第 $i 次结束 mpv，PID=$($p.ProcessId)，时间=$(Get-Date -Format 'HH:mm:ss')"
  Start-Sleep -Seconds 2
}
```

预期：

- 前几次（窗口阈值内）应自动拉起并恢复。
- 超阈值后应触发熔断并回退兼容模式，出现冷却提示。
- 冷却结束后可再次切回增强模式并正常播放。

回填：每次 kill 时间点、恢复耗时、是否熔断、提示文案准确性。

### 4.4 长稳播放（>= 60 分钟）

执行要求：

- 连续播放 >= 60 分钟。
- 每 10 分钟执行一次交互动作：`seek`、切歌、暂停/恢复（可穿插切设备和独占开关）。

回填：每个检查点是否异常（静音、卡死、进度冻结、需人工恢复）。

### 4.5 转码并发验证（1 / 2）

#### A. PowerShell 设置并发（推荐）

并发 = 1：

```powershell
$env:MPX_AUDIO_TRANSCODE_CONCURRENCY = "1"
npm run dev:desktop
```

并发 = 2：

```powershell
$env:MPX_AUDIO_TRANSCODE_CONCURRENCY = "2"
npm run dev:desktop
```

清理环境变量（恢复默认）：

```powershell
Remove-Item Env:MPX_AUDIO_TRANSCODE_CONCURRENCY -ErrorAction SilentlyContinue
Remove-Item Env:MEDIA_PLAYERX_AUDIO_TRANSCODE_CONCURRENCY -ErrorAction SilentlyContinue
```

#### B. CMD 设置并发（可选）

```bat
set MPX_AUDIO_TRANSCODE_CONCURRENCY=1
npm run dev:desktop
```

```bat
set MPX_AUDIO_TRANSCODE_CONCURRENCY=2
npm run dev:desktop
```

执行检查项：

- 各跑一轮 100 首转码。
- 覆盖取消、失败重试、输出目录策略（默认目录/库外目录提示）。
- 记录 UI 交互是否明显卡顿。

回填：总耗时、成功/失败数、取消和重试结果、UI 体感。

## 5. 回填模板（复制即用）

```markdown
# 音频增强模式长稳测试记录（P3）

## 1) 基本信息
- 测试日期：
- 测试人：
- 分支：
- 提交哈希（HEAD）：
- 系统版本（Windows）：
- CPU / 内存：
- 音频设备：
- mpv 路径：
- ffmpeg/ffprobe 路径：

## 2) 自动化门禁
- npm run quality:ci：通过 / 失败
- npm run build:electron：通过 / 失败
- 失败摘要（如有）：

## 3) 连续异常退出（熔断）
| 次数 | kill 时间 | 是否自动恢复 | 恢复耗时(s) | 是否触发熔断 | 提示文案是否正确 | 备注 |
|---|---|---|---:|---|---|---|
| 1 |  |  |  |  |  |  |
| 2 |  |  |  |  |  |  |
| 3 |  |  |  |  |  |  |
| 4 |  |  |  |  |  |  |

- 冷却后能否切回增强模式：是 / 否
- 冷却后首次播放是否正常：是 / 否

## 4) 长稳播放（>=60 分钟）
- 开始时间：
- 结束时间：
- 总时长（分钟）：
- 播放列表规模（首）：

| 时间点 | 操作（seek/切歌/暂停恢复/切设备/独占） | 结果（成功/失败） | 是否异常（静音/卡死/进度冻结） | 备注 |
|---|---|---|---|---|
| T+10m |  |  |  |  |
| T+20m |  |  |  |  |
| T+30m |  |  |  |  |
| T+40m |  |  |  |  |
| T+50m |  |  |  |  |
| T+60m |  |  |  |  |

- 异常总次数：
- 是否需要手动恢复：
- 结论：通过 / 不通过

## 5) 转码压力（100 首）
### 并发=1
- 总耗时：
- 成功数：
- 失败数：
- 取消是否生效：是 / 否
- 重试是否生效：是 / 否
- UI 卡顿体感：无 / 轻微 / 明显

### 并发=2
- 总耗时：
- 成功数：
- 失败数：
- 取消是否生效：是 / 否
- 重试是否生效：是 / 否
- UI 卡顿体感：无 / 轻微 / 明显

## 6) 最终结论
- P3 长稳验收：通过 / 不通过
- 阻塞问题列表（如有）：
1.
2.
3.

- 后续建议：
1.
2.
```

## 6. 通过判定建议

- 自动化门禁全绿（`quality:ci` + `build:electron`）。
- 连续异常退出场景满足“自动恢复 + 熔断 + 冷却后可恢复”。
- 60 分钟长稳播放期间无阻断级故障（卡死、持续静音、进度冻结）。
- 并发 `1/2` 转码均可完成，取消/重试生效，UI 无明显不可接受卡顿。
