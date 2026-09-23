# Roark 客户体验修复与价格页整理（2026-09-23）

## 变更

- Codex 渠道通过既有 Chat → Responses 桥接支持模型测试；上游强制 SSE，客户端仍可选流式或完整 JSON。过滤 Codex 不支持的 top_p。Codex SSE 未携带标准 Content-Type 时仍按事件流处理。
- Google 等无密码账户在个人资料中首次设密不要求旧密码，保留安全证明验证；成功后更新账户状态并切换到修改密码模式。
- 模型测试识别 message 事件中的错误、未收到 DONE 的断流、已关闭连接的错误事件；主动取消和正常结束不误报。非流式保留上游具体错误及其请求编号。沿用现有后端重试策略，不增加自动重放。
- 套餐入口增加 personal.plans 配置项；生产无套餐时隐藏该入口，原 personal.security=false 保留。
- 首页跟随界面语言；补齐密码显示、忘记密码、弹窗关闭和错误引导中文。扩展手机按钮点击区域，阻止弹窗横向溢出。
- 价格页采用厂商筛选 + 单分组下拉 + 厂商表格。长上下文档位默认折叠，支持展开。移动端横向滚动，模型列固定。
- 售价继续使用原计费函数及分组倍率。划线价明确标注本站基础价，**不是官方价**，不虚构官方折扣。保留每张图计费、5 分钟/1 小时缓存及所有长上下文档位。

## 验证

- 前端 5 个受影响测试文件，37 项通过；覆盖首次设密安全证明、提交参数与状态切换，SSE 错误/中断/取消，厂商及分组筛选、价格展开、倍率、空元数据及失败重试。
- `bun run typecheck`、修改文件 oxlint（包含忽略目录）、oxfmt、`bun run build` 通过。
- `CGO_ENABLED=0 go test ./relay ./service ./relay/channel/codex ./relay/channel/openai -count=1` 通过。
- 先复现红色回归，再修复：旧密码必填、SSE 故障吞错、Codex 路由、top_p、不规范 SSE Content-Type。
- Ego 独立空间 14：1440 桌面与 390 手机，中文首页/登录/忘记密码、价格页筛选/展开、固定模型列、横向滚动检查。价格页使用隔离本地登录与服务器快照；没有改动任何真实客户登录状态。
- 无数据库结构、驱动或 ORM 改动；无业务依赖变更。

## 发布

目标版本：`roark-20260923-experience`。
目标二进制 SHA-256：`55dde736703e89634d44b0cddf1ef72a9e267641ab11ca51fef54f1b06bdbd5a`。

发布前使用服务器隔离 SQLite 副本测试真实上游；副本删除 refresh_token 防止轮换生产凭据。静态资源合并保留旧哈希文件。已发布至 https://api.roarkist.com 。

- 恢复点：`/opt/roarkapi/backups/experience-20260923-123754`，包含旧 compose、环境配置和停机后 SQLite 快照；指针 `/opt/roarkapi/experience-current-backup`。
- 候选真实上游：`codex/gpt-6-sol` 流式和非流式均完整返回 `41`。
- 生产公网：`codex/gpt-6-luna` 两种模式均完整返回 `41`，均命中渠道 12；2 条消费日志，总 quota=2，余额与日志一致。验证令牌已禁用、过期并软删除。
- 公网 status 确认为新版本；SidebarModulesAdmin 保留 security=false 并增加 plans=false。
- 恢复旧二进制时，恢复备份 compose 后重建 app；配置回滚只将 SidebarModulesAdmin 恢复为备份值，避免覆盖发布后新增客户数据。旧静态资源保留。
- 登录后完整 Google OAuth 弹窗由组件/API 边界回归覆盖，未用真实客户账号修改密码。生产价格页仍要求登录。
- 恢复套餐入口：在创建可用套餐后，将 SidebarModulesAdmin.personal.plans 设为 true；当前隐藏状态是站点配置，不是自动套餐检测。
