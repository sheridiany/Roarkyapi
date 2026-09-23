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
