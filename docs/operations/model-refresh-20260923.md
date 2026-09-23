# 2026-09-23 定价展示与模型更新

## 更新内容

首页同一模型的上下文档位共用一个模型名称单元格，保留所有档位价格、缓存价格、分组倍率和 Roark 视觉样式。模型数量仍按唯一模型计算。

新增内置标准价格（USD / 百万 token），管理员显式价格优先，不写入旧倍率表：

| 模型 | 输入 / 输出 | 缓存读取 / 写入 | 长上下文 |
|---|---|---|---|
| GPT-6 Sol | 2 / 10 | 0.2 / 2.5 | 超过 272000 输入 token：输入及缓存 ×2，输出 ×1.5 |
| GPT-6 Luna | 0.1 / 0.5 | 0.01 / 0.125 | 同上 |
| Claude Opus 5.5 | 4 / 20 | 0.2 / 5（5m）、8（1h） | 1M 窗口内无长上下文加价 |
| Grok 4.7 | 2 / 6 | 0.5 / — | 达到 200000 输入 token：全部价格 ×2 |

官方依据（2026-09-23 核对）：[Sol](https://developers.openai.com/api/docs/models/gpt-6-sol)、[Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)、[GPT-6 参数规则](https://developers.openai.com/api/docs/guides/latest-model)、[Claude 定价](https://platform.claude.com/docs/en/about-claude/pricing)、[Grok 4.7](https://docs.x.ai/developers/models/grok-4.7.md)。这些是基础价格，站点展示及扣费继续乘现有分组倍率。

GPT-6 Sol/Luna 的 Chat Completions 兼容处理识别 developer role 和 max_completion_tokens；仅显式 reasoning_effort=none 时保留采样参数，未知模型不继承限制。生产模型资料优先展示已验证的 Responses 端点。

## 上游与生产配置

- 渠道 9（Codex）：新增 gpt-6-sol、gpt-6-luna。模型列表尚未列出这两个 ID，但直接 Responses 请求均返回对应 ID 和正确算术结果。
- 渠道 3（ClaudeMax）：新增 claude-opus-5-5，Messages 实测返回文本。
- 渠道 10（Grok）：新增 grok-4.7，Chat Completions 返回 grok-4.7-build。
- 请求 gpt-5.6-luna 时渠道 9 返回 grok-4.7，未启用该模型，移除首页原有的可用性展示。未删除现有渠道中的其他模型。
- 上游返回的模型名只能证明接口行为，不能独立证明第三方内部真实路由。
- 此次上架四个文本/推理模型；Grok 新媒体模型仅发现于上游列表，未完成媒体端点和计费验收，不列为已接入。

## 验证与部署

- 首页 3 个测试文件、9 项测试通过，包含每模型只显示一次、各档价格保留及更新后的模型展示。
- 前端 typecheck、涉及文件 oxlint/oxfmt、生产构建通过。
- CGO_ENABLED=0 go test ./setting/billing_setting ./relay/channel/openai ./relay/channel/claude ./relay/channel/xai 通过（xai 无测试文件）。
- GOWORK=off CGO_ENABLED=0 go -C relaykit test ./dto 和独立 build ./... 通过。
- 计费回归覆盖 GPT 272000/272001、Grok 199999/200000 边界、缓存归一化、Claude 两种缓存写入时长及 900K 无加价。
- 使用生产数据库副本在断网容器验证四个新模型的 pricing API 均返回非空表达式。仅副本临时开放 pricing，生产认证设置未改。
- 生产版本 roark-20260923-models；二进制 SHA-256 fc7962d061fb6a9600dea8be6d73dbcd6059d4ddc252ff5cf981e976456bc210。
- 恢复点 /opt/roarkapi/backups/models-20260923-115000，含切换前数据库、Compose、环境文件和候选定价结果。旧二进制及旧静态资源保留，1763 个新静态文件校验无同名冲突后合并。
- 数据库变动为三个已有渠道的 models 字段、新增四条 abilities 和四条模型资料；没有 schema、驱动或迁移代码改动。
- 公网四模型均对 `17 + 24` 返回 `41`，分别新增消费日志 17923–17926。按实际输入、输出、缓存 token 与原有倍率独立复算，quota 为 564、66、137、385，总计 1152（$0.002304）；各一次扣费，无重复扣费。四枚短期限定模型的验收令牌均已禁用、过期并软删除。
- 首次验收脚本在成功校验回答后，查询日志误用了 channel 列（实际为 channel_id）；随后直接核对原消费日志和令牌余额，没有重复发起收费请求。证据 live-check-reconciled.json。
- 原有 options、vendors、registration_invitations 逐行一致，SQLite 完整性正常；管理员登录与登录后价格表的生产视觉检查仍未完成，价格展示已通过组件回归和候选后端数据验收。
