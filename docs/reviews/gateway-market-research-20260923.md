> 范围更新：用户明确不需要接入向导；文中的向导仅保留为外部产品研究记录，不纳入 Roark 实施计划。个人 GPT / Grok 生图接入列入优先核查，结论见 roark-optimization-20260923.md。

# Roark API 中转站：外部产品研究

研究日期：2026-09-23。范围：OpenRouter、LiteLLM、Cloudflare AI Gateway 官方文档。以下是对 Roark 的产品建议，不代表这些功能在本站缺失；是否已实现、是否启用，应结合当前代码和生产配置核实。未修改代码、配置或生产数据。

建议优先顺序：接入成功率 → 故障可解释性 → 花费可预期性 → 精细化路由。无需为此更换现有网关。

| 优先级 | 建议与验收标准 | 预期收益 | 实施成本 |
| --- | --- | --- | --- |
| P0 | **接入向导**：选择客户端和模型后，给出准确的 Base URL、模型 ID、协议和复制配置；一次测试直接显示成功或可操作的错误。先覆盖站内实际支持的 Codex、Claude Code、OpenAI SDK，不把不同协议写成同一套配置。 | 减少客户首次调用失败和客服询问。 | 低至中，主要是内容与已知配置组合验证。 |
| P0 | **模型能力目录**：价格旁列出本站实测的文本/图片输入、生图输出、工具调用、结构化输出、上下文、最大输出及可用接口。支持按能力筛选；缺数据标“待验证”。 | 用户不用反复付费试错；减少“能选模型但不能调用”的问题。 | 中，需要维护元数据及少量协议验收用例。 |
| P0 | **故障自动恢复有边界**：同模型不同渠道优先恢复；按错误类型决定重试，设总时间预算、次数、退避和冷却。流已输出后不悄悄重放。跨模型回退需用户明确启用，并回传实际模型和费用。 | 降低暂时性失败，同时避免漫长等待、重复输出和不可解释扣费。 | 中至高，涉及路由、流状态和账务验证。 |
| P0 | **给用户看自己的故障详情**：使用日志增加请求 ID、错误类别、是否重试、实际模型、首字耗时、总耗时与费用状态。另设简洁状态页，展示近期真实请求可用率、延迟和事件说明；请求少时标样本不足。 | 出问题时客户知道是否要换模型、是否扣费、如何报障。 | 中；尽量复用已有日志。 |
| P1 | **花费控制**：API Key 可设每日/月度预算、模型白名单和并发上限；按 50%/80%/100% 发站内通知。实时剩余额度与充值到账状态一致。 | 防止泄漏或循环调用烧余额，增强充值信心。 | 中；若已有令牌额度先补周期预算和通知，避免重写计费。 |
| P1 | **成功率统计独立于消费统计**：按客户请求计一次，认证失败、限流、上游失败都进入分母；另统计内部重试次数。流中断单列，不能仅凭 HTTP 200 认定成功。 | 避免后台“成功率很好”但客户频繁失败；让优化效果可衡量。 | 中，需要核查现有埋点和指标口径。 |
| P1 | **缓存收益透明**：日志拆出缓存写入、命中 token、实际节省金额；多轮同会话优先保持同渠道，渠道故障可切换。先做上游提示词缓存，跨用户共享完整回答缓存默认关闭。 | 编程用户多轮调用更便宜、首字更快，客户能验证折扣。 | 中；会话路由与缓存计费边界需验证。 |
| P2 | **速度/价格策略**：只有积累足够真实数据、同模型有多个可用渠道后，再开放“均衡/速度优先/价格优先”，附价格上限。比较 P50/P95 首字耗时与成功率，不能用“极速”名称代替测量。 | 服务差异可解释，避免单纯靠低价竞争。 | 高；先补指标，后做路由策略。 |

## 依据及适用边界

1. OpenRouter 快速接入文档提供 HTTP、SDK 和请求构建入口，明确 Base URL、模型 ID 和流式用法。Roark 可借鉴其让客户从配置直接走到首个成功请求的路径。[官方 Quickstart](https://openrouter.ai/docs/quickstart)

2. OpenRouter 的 Models API 返回输入/输出模态、上下文、价格和 `supported_parameters`，也提供能力筛选。Roark 应展示本站渠道实际可用能力；厂商模型支持不等于中转渠道支持。[官方 Models API](https://openrouter.ai/docs/api/api-reference/models/list-all-models-and-their-properties)

3. Cloudflare 提供超时、重试次数、延迟和退避配置；LiteLLM 有冷却、回退、超时和按异常类型设置重试的能力。上述“流已输出不重放、设总时限”是本报告对 Roark 的可靠性建议，不是声称这两家所有模式都如此实现。[Cloudflare Request handling](https://developers.cloudflare.com/ai-gateway/configuration/request-handling/)、[LiteLLM Router](https://docs.litellm.ai/docs/routing)

4. OpenRouter 把多模型按顺序回退与同模型多提供商路由区分开。Roark 也应区分“同模型换渠道”与“换模型”，后者影响质量、价格和用户预期。[Model Fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks)

5. Cloudflare 的分析包含请求、token、成本、错误及缓存命中，可按时间筛选。这可作为状态透明和用量分析的基础；公开状态页及样本不足提示是本报告建议，不是对该文档页面功能的复述。[官方 Analytics](https://developers.cloudflare.com/ai-gateway/observability/analytics/)

6. LiteLLM 的预算支持个人、团队、成员等维度，也有并发请求预留预算机制。文档明确持久数据库是预算执行前提，不能只有界面配置没有实际拦截。Roark 已有预扣/结算机制，应在此基础上核查预算承诺。[Budgets, Rate Limits](https://docs.litellm.ai/docs/proxy/users)

7. LiteLLM 的 Endpoint Activity 将入口请求计数与花费记录拆开：鉴权拒绝、限流和上游错误进入失败计数；一个入口请求不会因内部回退而被重复统计。Roark 的成功率应采用同样清晰的口径，另处理 HTTP 200 后流中断。[Endpoint Activity](https://docs.litellm.ai/docs/proxy/endpoint_activity)

8. OpenRouter 文档说明提示词缓存可结合粘性路由，使同会话尽量命中同一提供商，并暴露缓存读写使用量；提供商不可用时仍可切换。[Prompt Caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching)

9. OpenRouter 提供价格、吞吐、延迟排序和价格上限，延迟/吞吐偏好不是保证。Roark 可借鉴选择逻辑，但必须先有自己的真实测量和足够渠道，不能照搬其速度承诺。[Provider Routing](https://openrouter.ai/docs/guides/routing/provider-selection)

## 不建议现在做

不优先堆模型数量、自动更换为陌生模型、全站缓存生成答案、为普通用户重新放回管理员审计日志。先把现有模型接入、故障说明、计费明细做完整，再评估增加产品复杂度的收益。
