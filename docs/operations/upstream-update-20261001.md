# Roark API 上游更新验收（2026-10-01）

## 范围与保留项

- 从个人分支 `1f79af7c6` 合并 `QuantumNous/new-api` 的 `upstream/main`：`56758edf9`，包含上游新增的 21 个提交；最新发布标签为 `v1.0.0-rc.41`（`2035a82ae`）。
- 保留个人首页、品牌资源、布局与样式、中文/英文双语言选择、人民币定价、邀请注册、图片生成和个人渠道行为。
- 保留更新前的 27 个未提交跟踪文件，原有未跟踪文件不纳入合并提交。原文件逐字节检查；语言文件按更新前修改的键值检查。
- 充值和日志组件使用个人实现，合入适用的翻译及筛选修复；渠道表保留服务可见性规则并加入上游刷新功能。
- 为邀请管理与图片 Playground 补齐访问令牌路由声明；邀请管理和 Playground 延续浏览器会话限制。匿名邀请验证和 OAuth 注册完成继续作为匿名入口。删除已由个人版本移除的排行榜路由声明。
- 保留 GPT-6 Sol/Luna 默认推理模式下的采样保护；上游测试中的 `none` 用例改为显式发送 `reasoning_effort=none`。
- 保留历史已删除的顶层 README 状态，不恢复到个人站点。

## 编译与回归

工作区使用原有锁定依赖，不升级前端包。

```sh
CGO_ENABLED=0 go test ./common ./controller ./middleware ./model ./service ./router ./relay/... ./pkg/... ./plugins/...
CGO_ENABLED=0 go test ./controller ./middleware ./router
CGO_ENABLED=0 go build -o /tmp/roarkapi-update-server .
cd relaykit && GOWORK=off CGO_ENABLED=0 go build ./...
GOWORK=off CGO_ENABLED=0 go test ./...
cd web && bun run typecheck
bun run build
bun run test --maxWorkers=2 --reporter=default --reporter=hanging-process
```

- 后端相关包、独立 relaykit 构建与测试、前端类型检查和构建通过。
- 原生 CGO 构建受本机 macOS SDK/链接器架构识别错误阻塞；使用项目支持的纯 Go SQLite 路径（`CGO_ENABLED=0`）验证。
- 72 个涉及变更的 TS/TSX 文件 lint 通过。全仓 lint 未通过；更新前存在的错误仍在，本次没有新增错误规则/文件组合，不为此次同步夹带全仓重构。
- 测试结果详情和迁移验收程序保存在 Git 公共目录内的 `roark-update-20261001/`。测试环境共享依赖目录造成的图标动态加载超时须用本地依赖目录复测，不能据此修改图标生产代码。

## 三种数据库实机验证

| 数据库 | 实际版本 | 新建及重复启动 | rc.41 升级 | 当前个人版本升级 |
| --- | --- | --- | --- | --- |
| SQLite | 3.50.4（Go 驱动） | 通过 | 通过 | 通过 |
| MySQL | 8.4.11 | 通过 | 通过 | 通过 |
| PostgreSQL | 16.15 | 通过 | 通过 | 通过 |

- 每个场景调用实际 `model.InitDB()`、`model.InitLogDB()`，连续启动两次，检查索引稳定性。
- 升级夹具检查用户中文名称、余额和已用额度，渠道名称和模型列表，API 令牌余额，自定义配置和消费日志不丢失。
- MySQL/PostgreSQL 使用独立日志数据库，重复迁移并检查日志数据和索引。SQLite 当前的 `local` 日志连接沿用同一 SQLite 文件。
- 在三种数据库中验证 `UserAccessToken.TokenHash` 唯一性，重复哈希写入必须失败。
- ORM/数据库驱动版本未更改，不涉及版本专属新语法。本次使用上述受支持版本，没有声称覆盖所有历史数据库版本。

临时容器只用于本任务，MySQL 设置 `utf8mb4`，所有端口仅绑定 localhost。DSN 不含持久密码。

```sh
docker run -d --name roark-update-mysql-20261001 -e MYSQL_ALLOW_EMPTY_PASSWORD=yes -p 127.0.0.1:23306:3306 mysql:8.4 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
docker run -d --name roark-update-pg-20261001 -e POSTGRES_HOST_AUTH_METHOD=trust -p 127.0.0.1:25432:5432 postgres:16-alpine
CGO_ENABLED=0 go build -o /tmp/roarkapi-migration-current /tmp/roarkapi-migration-check.go
TEST_MYSQL_DSN='root@tcp(127.0.0.1:23306)/roark_fresh?charset=utf8mb4&parseTime=true' TEST_POSTGRES_DSN='postgres://postgres@127.0.0.1:25432/roark_fresh?sslmode=disable' CGO_ENABLED=0 go test ./model -run 'TestMigrationSchemaStability|TestChannelSettings|TestRequestPolicy|TestPrefillGroup|TestTokenMigration|TestSystemTask' -count=1
```

迁移程序分别在 rc.41、更新前个人版本和合并版本构建。`CHECK_SEED=1` 创建代表性数据；`CHECK_VERIFY=1` 在更新后验证数据；`CHECK_UNIQUENESS=1` 检查令牌哈希约束。程序和实际执行日志一起留存供复核。

## 本地应用验收与边界

- 使用 ego-browser 独立任务空间，本地初始化账号并通过实际登录表单登录。
- 检查个人首页的品牌、模型卡片、控制台、会话与访问令牌界面、渠道刷新按钮。登录态 API 验证个人信息、令牌目录、渠道、邀请管理、审计接口返回业务成功。
- 浏览器截图调用超时；有 DOM 快照证据，没有完成像素截图检查。
- 未连接真实付费上游进行生成，未执行真实付款或生产业务；没有推送或部署。
- 原分支更新前的跟踪文件改动另存 Git stash；保留恢复点，不自动删除。
