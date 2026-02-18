# Windows 发布签名实施说明

Last updated: 2026-02-18

## 目标

- 统一 Windows 安装包发布流程，支持“未签名调试包”和“签名发布包”两条链路。
- 在 CI 中通过参数开关控制是否签名，避免本地脚本分叉。

## 本地命令

```bash
# 未签名（默认）
npm run desktop:pack:unsigned

# 签名（需要证书环境变量）
npm run desktop:pack:signed
```

说明：

- `desktop:pack:signed` 会先执行签名环境校验（`scripts/verify-signing-env.mjs`）。
- 签名构建通过 `MPX_WINDOWS_SIGN=1` 打开 `electron-builder.config.cjs` 中的 `forceCodeSigning`。

## 证书环境变量

至少提供下面两类变量（支持 `WIN_*` 或通用 `CSC_*`）：

- 证书内容：`WIN_CSC_LINK` 或 `CSC_LINK`
- 证书密码：`WIN_CSC_KEY_PASSWORD` 或 `CSC_KEY_PASSWORD`

## GitHub Actions 工作流

- 文件：`.github/workflows/windows-release.yml`
- 触发：`workflow_dispatch`
- 输入参数：`signed`（布尔）

行为：

- `signed=false`：产出未签名安装包。
- `signed=true`：注入仓库 Secrets 进行签名打包。

建议仓库 Secrets：

- `WIN_CSC_LINK`
- `WIN_CSC_KEY_PASSWORD`

可兼容保留：

- `CSC_LINK`
- `CSC_KEY_PASSWORD`

## 发布门禁建议

- 对外正式 Release 使用签名产物。
- 未签名产物仅用于内测或开发验证。
- GitHub Release 描述中应明确产物类型（signed/unsigned）并附 SHA256。
