# Gemini 生图接入与长视频请求（2026-09-15）

## 范围与生产边界

工作分支 `codex/gemini-image-video`；未修改生产渠道、价格或发布。原始视频未提供，不能声称长视频问题已端到端修复。当前生产 Nginx 读取/发送超时均为 600 秒，关闭响应缓冲；SSE 心跳默认关闭。

## 视频证据与处理

- 2026-09-14 23:47:49（北京时间），`Codex-Full-Video-Commercial-Visuals/1.0` 客户端的请求在 Nginx 记录为 499，响应大小 0。
- 23:48:09 的应用日志 8621：Gemini 3.8 Flash 请求的 inlineData 视频 55,783,699 字节超过上游 31,457,280 字节（30MiB）限制。两条记录尚无共同 Request ID，不能直接认定为同一个请求。
- Cloudflare 官方 524 文档说明默认读取超时 125 秒。我们 Nginx 的 600 秒配置不会覆盖它；客户端流式请求也需要在等待上游阶段获得心跳。
- 候选配置开启 `general_setting.ping_interval_enabled=true`、`general_setting.ping_interval_seconds=15`。回归测试阻塞上游响应头，验证客户端先收到 `: PING`，然后才允许上游返回，证明心跳不是仅在已有输出后才启动。
- 心跳仅覆盖支持它的流式路径，不能承诺修复非流式长请求、上游自身的 CDN 超时或大于 30MiB 的 inlineData。需要原视频及原客户端复测；不得自动抽帧、删音轨、截短视频，或把压缩后的分析称为原始输入验收。

参考：https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/

## 上游逐型号实测

现有渠道 8：12ai，`https://cdn.12ai.org`；从其 `/v1/models` 取得 6 个 Gemini 图片型号，分别调用原生 `generateContent`，要求 TEXT、IMAGE 输出。

| 型号 | 上游直接实测 | 公开基础价/次 | 拟 Gemini 组售价（1.2 倍） |
| --- | --- | ---: | ---: |
| gemini-3.1-flash-lite-image | 5.3 秒，返回图片 | $0.05 | $0.06 |
| gemini-3.1-flash-image | 7.9 秒，返回图片 | $0.13 | $0.156 |
| gemini-3.1-flash-image-preview | 8.5 秒，返回图片 | $0.13 | $0.156 |
| gemini-3-pro-image | 17.6 秒，返回图片 | $0.25 | $0.30 |
| gemini-3-pro-image-preview | 36.1 秒，返回图片 | $0.25 | $0.30 |
| gemini-2.5-flash-image | 400：Thinking level is not supported；省略、null、thinkingBudget=0 均失败 | $0.06 | 暂不启用 |

价格来自上游 `/api/pricing` 的 `quota_type=1`、`model_price`，不是 Google 官方 Token 价格，也不是已验证的该账号最终采购成本；上游另有分组和型号倍率。未得到用户销售价答复时，仅准备上述方案，生产写入前确认。

响应不含 modelVersion；只确认指定型号通过供应商返回图片，不独立证明其底层模型身份。尤其 Pro 返回的输出 Token 数很少，不能用普通文本 Token 价格替代供应商按次成本。

## 代码修复

- 图片专用 Gemini 型号进入图片能力分类，同时保留原生 Gemini、OpenAI Chat 端点。
- `/v1/images/generations` 转换为 `generateContent`，传入 prompt、图片比例及支持的尺寸；响应图片转换为 `data[].b64_json`，保留原生用量账本。
- `n>1`、Images API 流式、URL 响应格式及误用普通 Gemini 文本型号，在校验阶段拒绝。空图片响应不返回成功或进入正常结算。
- 图片编辑继续使用 Gemini 原生图片输入，不广告未实现的 `/v1/images/edits`。
- 首页加入 5 个可用型号，原有文本型号保留；手机宽度允许长名称换行。模型管理、价格目录、详情使用同一份模型元数据和管理员价格，不另建重复价目表。

官方协议参考：https://ai.google.dev/gemini-api/docs/image-generation

## 验证与发布要求

生图回归首先在原适配器上复现 `only imagen models are supported`，修改后通过。后端 common、relay/helper、relay/channel/gemini、relay/channel 测试通过；首页与定价 65 项测试通过；类型检查、涉及文件 lint、生产构建通过。桌面及 390px 手机宽度验证 8 个 Gemini 条目不与标题/底部重叠，名称不溢出。

候选服务器在 `127.0.0.1:3017`，独立容器与独立 SQLite，不共用生产数据库、Redis或后台任务。其临时管理凭证、测试令牌不得输出或保留；测试完成后停止候选容器。上线前备份配置，只合并新增型号和价格；保留显式管理员覆盖与旧静态资源。

## 隔离网关验收结果

候选网关 `/v1/images/generations` 的 5 个型号均返回可解码图片，每次只有一笔成功消费记录。

| 型号 | 耗时 | 图片字节 | quota | Gemini 组美元金额 |
| --- | ---: | ---: | ---: | ---: |
| gemini-3.1-flash-lite-image | 5.0 秒 | 469386 | 30000 | 0.06 |
| gemini-3.1-flash-image | 11.1 秒 | 501858 | 78000 | 0.156 |
| gemini-3.1-flash-image-preview | 11.2 秒 | 561861 | 78000 | 0.156 |
| gemini-3-pro-image | 30.0 秒 | 596251 | 150000 | 0.30 |
| gemini-3-pro-image-preview | 80.2 秒 | 64147 | 150000 | 0.30 |

价格页使用候选 API 数据验证，5 个型号均按张显示上述售价。模型管理页的 5 行均显示 Google、Gemini 分组和 image-generation/gemini/openai 端点。管理页使用候选数据库导出响应及本地身份桩，不替代上线后的真实登录验收；截图超时，表格 DOM 内容核对通过。

候选容器已停止，渠道密钥、临时管理凭证和令牌已清除。脱敏结果保留在服务器 `/opt/roarkapi/gemini-candidate/results.json` 和本地 `/tmp/gemini-candidate-results.json`。最终 Linux amd64 构建为 `/tmp/roark-gemini-final`。

## 待应用配置与恢复

- 渠道 8 保留原有 3 个文本型号、分组和参数覆盖，只追加通过的 5 个生图型号。
- 合并 ModelPrice 基础价：Lite 0.05、两个 Flash 0.13、两个 Pro 0.25；5 个型号的 billing_setting.billing_mode 设为 ratio，Gemini 倍率保留 1.2。执行前重新读取配置，保留显式同名管理员覆盖。
- 元信息使用 Google 供应商、Gemini 图标、精确匹配，关闭官方同步覆盖；端点为 Images generations、Gemini generateContent 和 OpenAI chat completions。
- 开启流式心跳，间隔 15 秒；非流式长视频和超限内嵌文件仍需单独处理。
- 发布前在线备份 SQLite，保存渠道、相关 options 和元信息原值，以及 compose、二进制锚点；保留旧静态资源。
- 回退应用和本次修改的配置，不能用旧数据库覆盖发布后的用户、消费和余额数据。
- 上线后核对公网版本、模型列表、价格、真实出图和消费记录；原视频待补充后复测。
