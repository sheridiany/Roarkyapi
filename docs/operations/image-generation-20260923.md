# 生图接入验收（2026-09-23）

状态：已发布 `roark-20260923-images`。用户确认采用“模型基础价 × 分组倍率”；既有管理员价格全部保留。

## 已验证的上游模型

| 来源 | 模型 |
| --- | --- |
| 个人 GPT OAuth，渠道 12 | `gpt-image-2`、`gpt-image-2.5-flare`、`gpt-image-2.5-sunburst` |
| 现有 Gemini 上游，渠道 8 | `gemini-3.1-flash-lite-image`、`gemini-3.1-flash-image`、`gemini-3.1-flash-image-preview`、`gemini-3-pro-image`、`gemini-3-pro-image-preview` |
| 现有 Grok API 上游，渠道 10 | `grok-imagine`、`grok-imagine-image`、`grok-imagine-image-2.0`、`grok-imagine-image-quality` |

12 个请求均曾实际返回 PNG/JPEG。GPT 将请求模型原样传入 image_generation 工具，使用 gpt-6-sol 编排；上游响应没有提供可独立核验的内部图像模型版本。Grok 使用现有上游 API，未发现可直接接入的个人 Grok 账号。

排除：`grok-imagine-1` 返回 503（无可用媒体账号）；`gemini-2.5-flash-image` 返回 400（thinking level 不支持）。未启用已禁用的旧渠道。

## 实现与限制

- GPT Images 请求转换为 Codex Responses 图像工具，收集 output_item.done 图片并等待 response.completed，再返回 Images JSON；处理失败、提前结束、空图片、重复图片，禁止失败后自动重试。
- 新增登录用户 `/pg/images/generations`，沿用分组授权、请求校验与计费；修复误用聊天 DTO 解析 image response_format 的问题。
- 模型测试识别图像模型，支持文本生图、预览和下载。GPT 当前限定单张、非流式、base64 输出；图像编辑未接通。
- 图片不保存到本地聊天历史，页面提示下载保存；保存轻量占位符，避免 base64 被历史截断后显示乱码。
- 首页补充 Grok 图像模型；候选模型定价接口列出全部 12 个。既有品牌与先前自定义分组下拉样式保留。

## 验证记录

- 后端 common、codex、controller 等相关测试通过；最终回归 `CGO_ENABLED=0 go test ./controller -run TestPlayground -count=1` 通过。
- 前端相关 Vitest 19 项通过，类型检查、变更文件 lint、生产构建及 diff 空白检查通过。
- Ego 任务空间 20：桌面预览及实际下载、390px 手机显示、历史占位符刷新恢复验证通过，无页面水平溢出。界面验收使用真实生成图片回放，真实 API 验收另在服务器隔离候选实例执行。
- 第一轮隔离网关：4 个 Grok、5 个 Gemini 成功，各一笔消费；3 个 GPT 当时遇到 SSE 终态不含图片的问题，均未扣费，已修复。第二轮 3 个 GPT 全部生成成功。
- 候选数据库由在线备份创建，测试账号/令牌/会话仅存在于副本；移除副本 OAuth refresh_token，避免刷新生产令牌。使用独立端口、独立签名密钥，测试后删除实例和副本。无数据库模式或迁移变更。
- 服务器证据目录：`/opt/roarkapi/backups/image-probe-20260923/`。候选二进制 SHA256：`33cf36b6520ae15ea8d9b7e1bbb8af122a0f14ba47749d9563ba0ed53a7bbabb`。

## 定价确认与发布

用户后续明确选择沿用站内“模型基础价 × 分组倍率”规则。Grok 基础价按张分别为 Image 0.02、Image 2.0 0.04、Imagine/Quality 0.05，乘现有 0.7 分组倍率后，在当前充值规则下对应人民币 0.014、0.028、0.035。该配置沿用站内计价单位，并非把采购美元成本换算成人民币；不代表毛利保证。已合并渠道 10/12 模型列表和 4 个 Grok 模型元数据，未覆盖任何既有模型价格。Gemini 渠道及 `/hi` 未改动。

## 最终候选复测结果

- 12 个模型均出现在候选 `/api/pricing`，固定按张计费。
- Flare、Sunburst 成功，各消费 62,000 quota，总计 124,000；令牌余额变化与消费日志一致。
- GPT Image 2 此次上游返回生成失败，网关返回 502，未产生消费；此前两轮已经成功出图。因此最终整组脚本因该次上游失败退出 1，不能声明全部复测无异常。
- 普通用户 `/pg/images/generations` 实际返回有效 Grok 图片；无权分组返回 403。
- 候选实例及数据库已在 finally 清理，生产服务未切换。

## 生产验收

- 版本：`roark-20260923-images`；备份 `/opt/roarkapi/backups/images-20260923-151405`。发布前保存数据库在线备份与 compose、受影响配置快照。失败回退仅恢复配置与二进制，不覆盖用户余额或使用记录。
- 1,763 个静态文件校验通过；渠道 8/10/12 的 12 个图像模型均有启用的路由能力。
- 线上 Grok Image 实际返回 JPEG，5.6 秒，扣费 7,000 quota（当前规则 ¥0.014）；GPT Image 2.5 Flare 返回 PNG，22.7 秒，扣费 62,000 quota（¥0.124）。两次消费日志、令牌扣减均一致。临时测试令牌已删除。
- 生产定价接口继续要求登录，未为验收降低访问限制。页面交互与手机验收沿用同构建候选结果；未冒用生产用户会话。
- 公开站点命令行请求被边缘访问规则返回 403；Ego 独立任务空间 21 正常打开生产首页，确认新 12 个生图模型可见，未修改边缘访问规则。任务空间已关闭。
