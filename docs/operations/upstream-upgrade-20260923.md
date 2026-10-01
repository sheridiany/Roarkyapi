# Roark 上游升级记录（2026-09-23）

## 范围与恢复点

- 上游：QuantumNous/new-api，检查时 `upstream/main` 为 `c76452d22`，最近发布标签 `v1.0.0-rc.40`。
- 本地升级前：`bc4a7a80a`；新合入上游提交 163 个。
- 工作分支：`codex/roark-upstream-20260923`。
- 升级前恢复分支：`codex/roark-before-upgrade-20260923`。
- 本次为本地合并和验收；尚未推送或部署到生产。原有未跟踪 `output/` 未加入提交。

## 保留与整合

Roark 名称、Logo、favicon、品牌素材、首页动效与布局、顶部导航、页脚、默认配色与圆角、原数据分析页、密钥页、使用日志、定价卡片及个人资料页的定制保留。`web/public` 与升级前无差异，主页仅合入错误提示处理。主题偏好采用上游存储修复，品牌主题仍固定。

继续保留 OpenAI / Anthropic / Gemini / xAI 的服务展示范围、邀请注册、Google 绑定、自用 Gemini 生图及长视频输入支持、Responses 提前结束和早期错误处理。新的 OAuth 状态与身份验证机制接入邀请流程；原密码表单调用新安全验证接口。

新增安全与访问、审计日志等上游能力。管理端模型元数据及价格编辑采用上游新定价接口和编辑控件，保留 Roark 服务过滤及现有抽屉外壳；模型列表补齐新价格查询和实际可见性筛选。新审计日志单独使用上游过滤控件，避免改动原使用日志控件。

## 验证

- `CGO_ENABLED=0 go test ./...`：全部通过（`/tmp/roark-go-final.log`）。
- `cd relaykit && GOWORK=off CGO_ENABLED=0 go build ./...`：通过，独立模块可构建。
- `bun run --cwd web typecheck`：通过。
- `bun run --cwd web build`：最终语言文案补齐后构建通过（`/tmp/roark-final-build3.log`）。
- `bun run --cwd web test`：178 个测试文件、2064 项测试全部通过（`/tmp/roark-vitest-acceptance.log`）。
- 本次变更涉及的 610 个 TS/JS 文件 oxlint 通过。全仓库 lint 存在未改文件的历史错误，未作为本次通过项。
- `bun run --cwd web i18n:sync`：通过；保留原定制译文，补齐新密码长度提示的七种语言。

### 数据库矩阵

真实数据库：SQLite 3.50.4（modernc.org/sqlite v1.40.1）、MySQL 8.4.11、PostgreSQL 16.15。

运行真实 MySQL/PostgreSQL 模型测试（以 `TEST_MYSQL_DSN`、`TEST_POSTGRES_DSN` 指向本机独立容器，`CGO_ENABLED=0 go test ./model`），结果通过，日志 `/tmp/roark-db-tests.log`。

另在 `v1.0.0-rc.40` 与合并后分别编译临时 `TestRoarkReleaseUpgrade` 夹具，执行完整 `InitDB` / `InitLogDB` / `migrateDB` / `migrateLOGDB`。三种引擎分别覆盖全新库和发布版库升级；主库与日志库分开，重复迁移两次，并在新进程中重复启动。种入中文用户、余额与已用额度、令牌及余额、品牌选项和历史日志，核对升级后值及行数，并验证用户名、令牌 key、选项 key 唯一性。全部通过。

执行形式：

```sh
CGO_ENABLED=0 go test -c ./model -o /tmp/roark-current-schema.test
# 在 v1.0.0-rc.40 工作树中编译同一夹具：
CGO_ENABLED=0 go test -c ./model -o /tmp/roark-release-schema.test
# 每个引擎通过 SQL_DSN / LOG_SQL_DSN，或 ROARK_SQLITE / ROARK_SQLITE_LOG 选择独立测试库：
ROARK_SEED=1 /tmp/roark-release-schema.test -test.run '^TestRoarkReleaseUpgrade$' -test.v
/tmp/roark-current-schema.test -test.run '^TestRoarkReleaseUpgrade$' -test.v
/tmp/roark-current-schema.test -test.run '^TestRoarkReleaseUpgrade$' -test.v
```

证据：`/tmp/roark-migration-matrix.log`、`/tmp/roark-migration-matrix-rest.log`。临时夹具已从项目移除。没有使用生产数据；这些验证不等于生产备份恢复演练，也未验证 MySQL 5.7 / PostgreSQL 9.6 的最低版本。

### 测试取舍和浏览器边界

没有删除升级前已有测试。没有采用上游替换 Roark 的密钥/日志/用户额度/概览布局，对应 11 个本次上游新增 UI 测试文件未引入：users/quota-display；keys/api-key-listing、api-addresses；usage-logs/mobile-card、mobile-filter、group-filter、log-type-filter、detail-preview、quota-adjustment、billing-source-visibility；dashboard/overview/setup-guide。它们针对未采用的控件与布局；现有 Roark 回归保留。新安全、审计、定价与后台逻辑测试保留；其他断言按保留的紧凑布局、固定品牌主题和服务范围调整。

在独立本地空库启动新后端（3189）与前端（3188），用临时账户验证首页、登录、数据分析、个人资料、安全与访问、API 密钥及真实创建一条测试密钥（列表回显和成功提示）。Ego 浏览器语义快照正常；截图调用两次超时，未完成像素级截图对比。没有进行真实上游计费调用。

## 生产切换前

生产写入前先备份数据库、环境配置和静态资源，记录原镜像及 release 路径；按 `frontend-assets.md` 保留旧静态资源，避免已有浏览器引用旧 chunk 失败。升级涉及认证与数据库迁移，应安排短暂切换窗口。若需回退，应结合数据库备份恢复，不能只回退镜像并假设新结构完全向后兼容。个人订阅 `/hi`、独立代理服务及已停用面板不在此次升级范围内。

## 生产发布验收（用户确认上线后）

- 已发布到 `179.253.226.224`；公网 `https://api.roarkist.com/api/status` 返回 `roark-20260923-upstream-8724ef287`，Roark API 品牌名称保留。
- 发布二进制：`/opt/roarkapi/releases/roark-20260923-upstream`；SHA-256 `bb568b99c3a1a9e0d5510da131aa27f91554b60b65d81e454e0c56aad611873f`。
- 恢复点：`/opt/roarkapi/backups/upstream-20260923-102924/`，包含在线快照 `before.db`、停机切换前最新快照 `immediately-before.db`、原 Compose、环境配置、Nginx 配置、旧静态资源归档及原容器信息。原发布二进制仍保留。
- 先用生产数据库副本在断网容器中完成迁移，逐项比对原有列和值：13 个用户、63 个令牌、11 个渠道、51 个渠道能力、49 项配置、8 个模型资料、4 个厂商、17 条邀请码及 17921 条历史日志一致，数据库完整性通过。候选容器与副本已清理。
- 上传后校验 1763 个静态文件，无同名内容冲突；合并到 `/var/www/roarkapi/static`，保留全部旧文件，再切换容器。升级前已打开的登录页在升级后正常进入邀请码注册页；全新入口也验证通过，未出现旧 chunk 丢失。
- 切换后再次比对生产渠道、配置、模型、厂商和邀请数据均未变化；数据库完整性正常，容器重启计数为 0。
- 公网用仅允许 `gemini-3.1-flash-lite-image`、30000 quota、五分钟有效期的临时令牌验证模型列表与 Images API，7.73 秒返回 353181 字节图片；消费日志 `17922`，只产生一笔 30000 quota（$0.06）消费，令牌剩余额度 0、已用 30000。临时令牌已禁用、过期及软删除，没有改动原有令牌。
- 验收结果：备份目录内 `candidate-verification.json`、`deployed-status.json`、`upstream-live-check.json`；图片 SHA-256 `4e6fe977b35b880769ac8bf0dfcae9ffd6ad29f044f31f69fa15273c05b39960`。
- `/hi` 返回 200，`roark-hi` 服务保持 active；独立订阅服务和旧面板状态未改动。
- 生产管理员登录未完成：服务器原部署凭据与当前密码哈希不匹配，已停止尝试，没有重置密码；本地隔离环境登录验收通过，不能代替生产管理员登录验收。浏览器仅完成公开品牌、登录和邀请注册流程检查，不声称完成所有后台页面的生产视觉复验。
- 上传时长连接中断，已改用分块传输并在解压后重新验证完整二进制和静态文件；不完整上传、分块及展开临时目录已清理。Git 远端同步不在本次发布完成项内。
