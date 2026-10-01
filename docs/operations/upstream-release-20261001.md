# Roark API 生产发布验收（2026-10-01）

## Git 与构建

- PR：Roarkai/RoarkAPI #1。
- 构建源：`e9fac8829dc8e55e87620ff42e5806e47e5d3364`；合并提交 `7a5fc0777e65380771bbd731013066ff826b3a7a`，其 Git tree 与构建源一致。
- 版本：`roark-20261001-upstream-e9fac8829`。
- 二进制 SHA-256：`941455fc521060b0681fc01372be07f7c5847d89b73ab84d63aef47aac4e5184`。
- 在独立 worktree 构建，使用原锁定依赖；生产包包含同次构建的前端资源。
- 远端前端 CI 全量通过：187 个文件、2162 个用例。后端首次运行的并发账号删除测试遇到 SQLite 锁冲突；单例本地复测通过，同一提交远端后端重跑通过，主模块与 relaykit 的 vet、构建及全量测试通过；没有跳过失败用例。

## 生产副本与恢复点

- 服务器：`179.253.226.224`；服务：`roarkapi`，监听 localhost `3016`，站点 `https://api.roarkist.com`。
- 备份：`/opt/roarkapi/backups/upstream-20261001-123244/`，包含在线数据库快照、切换前停机快照、原 Compose/环境/Nginx、容器信息、旧静态资源及原版本路径和校验值。
- 原版本：`roark-20260923-images`，原二进制仍保留。恢复仅切换原 Compose 和二进制，保留当前业务数据库；不得用旧快照覆盖发布后的交易。
- 生产数据库副本在断网候选容器中重复启动两次；数据库完整性正常，旧模式条目 232 项全部保留，新模式共 237 项。
- 副本内 14 个用户、73 个令牌、10 个渠道、55 个能力、50 个配置、22 个模型资料、4 个厂商、18 条邀请码及 19168 条历史日志的原有列和值保持一致。审计、会话、认证流程、系统实例/锁及性能指标等运行时表不作为业务行不变断言。
- 1763 个静态文件逐一核验，旧资源不删除、同名文件内容冲突即中止。

## 执行命令与证据

```sh
VITE_REACT_APP_VERSION=roark-20261001-upstream-e9fac8829 DISABLE_ESLINT_PLUGIN=true bun run --cwd /tmp/roarkapi-release-20261001/web build
# 在独立构建 worktree 中执行：
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags '-s -w -X github.com/QuantumNous/new-api/common.Version=roark-20261001-upstream-e9fac8829' -o /tmp/roarkapi-release-20261001/roarkapi .
# 通过已校验主机密钥的 SSH，在服务器依次运行：
python3 prepare.py
python3 stage.py
python3 candidate.py
python3 deploy.py
```

实际部署脚本和本地执行日志位于 Git 公共目录内 `roark-release-20261001/`；服务器备份目录包含候选和部署结果 JSON。三种数据库开发验证版本、命令及结果见 `upstream-update-20261001.md`。

## 生产验收结果

- 公网浏览器 `/api/status` 返回 `roark-20261001-upstream-e9fac8829`，品牌为 Roark API；服务器 `deployed.sha` 为合并提交 `7a5fc0777e65380771bbd731013066ff826b3a7a`，挂载二进制路径和 SHA-256 一致。
- 首次切换后，配置等值检查将上游新增 `LegacyAccessTokenRetireAt` 误判为异常，触发自动回退。核对旧配置无删除、无值变化后，改为检查全部旧条目保留并重新发布。首次切换前快照仍保留，重试另存 `immediately-before-retry-1790858685.db`，未用旧库覆盖业务数据。
- 最终容器运行正常，重启计数为 0；SQLite 完整性正常。原渠道、路由能力、模型、厂商及邀请配置保留；配置项由 50 增至 51，仅新增上述兼容配置。
- Ego 独立任务空间：发布前打开的登录页在发布后进入邀请码注册页，未出现旧 chunk 丢失；新访客直接打开 `/sign-up` 也显示邀请输入框。Roark 品牌、模型列表和页面布局保留，桌面无水平溢出；空间已关闭。
- 使用绑定模型所在显式分组、仅允许一个已启用模型、1 quota、主机 Docker 网桥 IP、五分钟有效期的临时 API 令牌验证 `/v1/models`，HTTP 200 且返回预期模型，未消费 quota。令牌随后禁用、过期及软删除，再请求返回 401。先前使用 127.0.0.1 白名单的夹具被容器侧 IP 检查返回 403，这些临时令牌也均已撤销；未放宽原有令牌权限。
- 匿名邀请管理接口 `/api/registration-invitations/` 返回 401。`roark-backup.timer` 与 `roark-hi` 保持 active，`/hi` 的 HTTPS 请求返回 200；Nginx 配置未改动。
- 候选容器、数据库副本、上传分块和静态 staging 已清理。备份、前后版本二进制及旧静态资源均保留。代理诊断草稿、评审草稿和 output 资源未加入提交。
- 本轮没有调用付费模型进行生图/聊天，没有复验充值到账或生产管理员后台登录；没有重置账号密码。页面为 DOM 验收，没有新增像素截图验收。

证据：服务器备份目录中的 `candidate-verification.json`、`deployed-verification.json`、`authenticated-models-check.json`、`access-boundary-check.json`；本地 Git 公共目录中的 CI 日志和 `browser-acceptance.json`。发布后另提交此验收文档；该文档提交不改变已发布程序。
