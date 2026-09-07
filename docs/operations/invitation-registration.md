# 邀请注册

管理员在 `/registration-invitations` 生成邀请码，每批 1–50 个，有效期 1–30 天（默认 7 天）。可复制邀请码或完整邀请链接，由管理员自行发给受邀人。系统不自动发送邀请邮件。

每个邀请码只能注册一个账号。新邀请码为 10 位大写字母与数字，保证两类字符同时出现。完整邀请码仅生成时显示一次，数据库仅保存 SHA-256 摘要和前 4 位；此前发出的 64 位邀请码继续有效。列表可查看使用状态、到期时间和注册用户 ID，并作废未使用的邀请。链接通过 URL fragment 携带邀请码，注册页填写后立即移除地址中的邀请码。

生产站点设置 `InvitationOnlyEnabled=true`、`RegisterEnabled=true`。邮箱验证、人机验证继续由原设置控制。已有第三方绑定用户仍可直接登录。注册页先验证邀请码，再选择 Google 或邮箱注册；新用户从 Google 登录进入时，授权返回后可补填邀请码完成注册，无需重复授权或设置本站密码。管理员直接创建用户的既有权限保留。

注册事务将邀请码占用和用户创建一并提交；重复、并发、过期和作废邀请均不能再次注册，用户创建失败会回滚邀请码占用。

## 验证（2026-09-07）

- SQLite 3.50.4、MySQL 8.4.11、PostgreSQL 15.19 真实实例：缺失/无效/过期/作废/已用邀请码拒绝；失败事务回滚；两次并发仅一次成功；邮箱验证与邀请码同时成立才注册成功；第三方登录不能新建用户，既有绑定仍可登录。
- 三库分别验证全新数据库与从已发布 `roark-20260906-stream-errors` 创建的代表性数据库升级。每种场景新版本启动两次，核对用户余额、请求数、API 密钥、消费日志、已有索引保持不变，新邀请码摘要唯一约束生效，重复启动索引不变。MySQL/PostgreSQL 同时覆盖独立日志库；SQLite 按项目当前配置使用共享库。
- 后端命令：`go test ./controller ./model ./router -count=1`。
- MySQL 命令：`INVITATION_TEST_MYSQL_DSN='root:invite-test-local@tcp(127.0.0.1:53316)/invitation_test?charset=utf8mb4&parseTime=True&loc=Local' go test ./controller -run '^TestRegistrationInvitationLifecycle$' -count=1`。
- PostgreSQL 命令：`INVITATION_TEST_POSTGRES_DSN='host=127.0.0.1 port=55436 user=postgres password=invite-test-local dbname=invitation_test sslmode=disable' go test ./controller -run '^TestRegistrationInvitationLifecycle$' -count=1`。以上凭据仅属于临时本地验证容器。
- 升级命令：`python3 /tmp/roark-invite-matrix-indexes.py`，脚本使用 Docker 分别启动旧/新真实发布二进制，结果 `/tmp/roark-invite-matrix-indexes-result.log`。
- 前端：`NODE_OPTIONS=--no-experimental-webstorage bun run test src/features/auth/__tests__/gateway-auth-layout.test.tsx`（3 项通过）；`NODE_OPTIONS=--no-experimental-webstorage bun run test src/features/registration-invitations/__tests__/invitation-management.test.tsx`（复制链接/邀请码及作废结果 1 项通过）、`bun run typecheck`、涉及文件 `bunx oxlint`、`bun run build` 均通过。Node 的 webstorage 开关用于避免本机 Node 与 jsdom 的全局 localStorage 冲突。
- 本地真实页面：管理员生成邀请 → 邀请链接自动填码并清除地址 fragment → 新用户注册 → 登录成功。实际 HTTP 验证管理接口匿名 401、普通用户 403、管理员可生成与作废、注册拒绝缺失/作废/已使用邀请码，注册用户 ID 与邀请码使用记录一致。
- 本地页面验收关闭邮箱验证；启用邮箱验证的成功/失败组合由三库后端测试覆盖。生产邮箱投递及 Turnstile 不做绕过测试。

## 发布与恢复

发布版本 `roark-20260907-invitation`。发布前保存当前 SQLite 数据库和 Compose；新表为增量迁移。若恢复旧版本，必须先关闭公开注册，旧版本不识别邀请限制。发布后有业务写入时只回退二进制，不用旧数据库覆盖新数据。

生产验证：发布包 SHA-256 `9c64c53e766c8082b22167872f8b4514a44e1e2d55a1bf5ac27e9e1a778cb383`。线上管理页面正常，管理员生成/脱敏列表/作废成功，匿名管理请求 401。`InvitationOnlyEnabled`、`RegisterEnabled`、邮箱验证和 Turnstile 均为 true；临时管理员 PAT 已清除，SQLite quick_check 为 ok。现有渠道 9、10 保持启用。备份位于生产 `/opt/roarkapi/backups/pre-invitation-release.db` 和 `compose.pre-invitation.yml`。验收邀请已作废，没有创建生产测试用户。


## Google / OAuth 邀请注册更新（2026-09-07）

- 发布版本：`roark-20260907-oauth-invitation`。
- 注册页先调用 `POST /api/registration-invitations/verify`；成功后开放 Google 和邮箱注册方式。邀请链接自动填入、验证，并清除地址 fragment；更换邀请码会回到验证步骤。Google 按钮继续遵守协议勾选及页面人机验证状态。
- `POST /api/oauth/state` 接收邀请码并重新验证，服务端 OAuth state 仅保存邀请码内部 ID。预验证不消耗邀请码，也不把完整邀请码发给 Google。
- Google 回调的新用户有预验证邀请码时直接完成注册；没有邀请码、或邀请码在授权期间失效时，返回 `invitation_required` 和 10 分钟有效的一次性完成凭证。前端留在补填页面；凭证仅驻留页面内存，不写 URL 或 localStorage。
- `POST /api/oauth/registration/complete` 完成账号创建。授权凭证消费、邀请码消费、用户创建和 OAuth 绑定共用事务，任一失败均回滚。过期授权返回 HTTP 410，页面提示重新登录。已绑定用户登录不消费邀请码；不会按相同邮箱自动绑定已有账号。
- Google 新用户需提供 `email_verified=true` 的邮箱。线上 Google 使用 `https://openidconnect.googleapis.com/v1/userinfo`，身份字段为 `sub`，授权范围维持 `openid email profile`。依据：[Google OpenID Connect API 参考](https://developers.google.com/identity/openid-connect/reference)。没有修改生产 Google 客户端凭据、授权范围或人机验证设置。

### 本次验收

- SQLite 3.50.4、MySQL 8.4.11、PostgreSQL 15.19 真实实例：注册与绑定原子提交、授权重放拒绝、绑定失败回滚、无效邀请码更正重试、授权过期、Google 未验证邮箱拒绝、取消授权不耗码、两个 OAuth 身份抢同一码仅一个成功。沿用上文三库测试命令；本次无数据库表结构变更。
- `go test ./controller ./model ./oauth ./router -count=1` 通过；前端 `NODE_OPTIONS=--no-experimental-webstorage bun run test src/features/auth/__tests__/gateway-auth-layout.test.tsx src/features/auth/lib/__tests__/oauth-callback-mode.test.ts` 共 15 项通过；typecheck、涉及文件 lint、生产构建通过。
- 本地真实 UI + 独立 OAuth 模拟服务（`/tmp/roark-oauth-mock.py`）：邀请码验证 → 授权跳转 → 回调 → 注册并进入账户；Google 登录入口 → 新身份授权 → 补填邀请码 → 错码提示 → 正确邀请码 → 注册并进入账户。数据库核对两个账号各有一个绑定，邀请码使用用户 ID 一致。
- `/tmp/roark-oauth-http-check.py` 验证既有 Google 用户登录不消耗备用邀请码、过期授权返回 410 且不创建账号/消耗邀请码。
- Google 完整授权验收使用隔离模拟服务，没有代替真实用户完成生产 Google 授权或创建生产用户。

发布前备份：生产 `/opt/roarkapi/backups/pre-oauth-invitation-release.db`、`compose.pre-oauth-invitation.yml`。可回退至上一版 `roark-20260907-invitation`，该版本仍强制邀请注册，但 Google 新用户注册会回到拒绝状态；已有用户可继续登录。勿用旧数据库覆盖发布后的业务数据。

本次生产发布 SHA-256：`3bbbf567159a9ea9360f614075533c18c06287c841266de7c04e80609354e6dd`。线上预验证通过、Google state 只保存邀请内部 ID、无效邀请码不能创建 Google state、取消授权不消耗邀请码均已验证。验收邀请码已作废，临时管理员 PAT 已清除。公网版本和仅邀请注册、邮箱验证、Turnstile 设置均已核验，SQLite quick_check 为 ok。


## 10 位邀请码更新（2026-09-07）

新生成邀请码固定为 10 位大写字母与数字，使用安全随机数生成；短码输入兼容小写。旧 64 位邀请码仍可用于邮箱和 Google 注册，无数据库结构变化。新记录仅展示前 4 位。

验证：`go test ./controller ./model ./oauth ./router -count=1` 通过；上述 MySQL 8.4.11、PostgreSQL 15.19 命令及默认 SQLite 3.50.4 均通过，覆盖短码格式、小写输入、旧码注册、一次性消费和 Google 注册事务。前端邀请注册、邀请码管理和 OAuth 回调共 16 项测试、类型检查、涉及文件 lint 和生产构建通过。全项目 lint 有其他文件的既有错误，不属于本次修改。

已发布 `roark-20260907-short-invitation`，SHA-256 `4b3c9e4ea91a9f3cdc9d8017bf5fd33b85e1b9623e3caa38c4263954133eff8f`。线上真实生成的 10 位码、大写字母与数字组合、小写输入预验证、Google state 和取消后邀请码仍有效均通过，验收码已作废。发布前备份为 `/opt/roarkapi/backups/pre-short-invitation-release.db` 与 `compose.pre-short-invitation.yml`。
