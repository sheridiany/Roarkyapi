# GPT Image 2.5 接入准备与实测（2026-09-09）

## 官方型号和计费

ChatGPT Images 2.5 对应两个 API 模型：

- `gpt-image-2.5-flare`：侧重快速、高质量日常生图。
- `gpt-image-2.5-sunburst`：侧重更高精度的生成和编辑。

两款接受文本和图片输入、输出图片，可直接使用 Images API，也可作为 Responses API 的 image generation 工具型号。质量参数支持 `low`、`medium`、`high`、`xhigh`、`max`、`auto`。

官方标准 Token 单价相同，单位为美元 / 百万 Token：

| 类别 | 输入 | 缓存输入 | 输出 |
| --- | ---: | ---: | ---: |
| 文本 | 5 | 1.25 | 不计文本输出 |
| 图片 | 8 | 2 | 30 |

这不是每张图片的固定价格。官方说明 GPT Image 2 的成本计算器不能估计 2.5 的 Token 消耗。用户已确认两款沿用现有 GPT Image 2 的销售价：基础价每张 $0.248，Codex 组倍率 0.5，实际每张 $0.124。保留现有 GPT Image 2 的管理员价格。

来源：

- https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
- https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst
- https://developers.openai.com/api/docs/pricing
- https://openai.com/index/introducing-chatgpt-images-2-5/

## 真实上游测试

对生产已启用的三个 OpenAI 渠道，直接使用该渠道现有凭证调用 `/v1/images/generations`。每个新模型均请求 `n=1`、`size=1024x1024`、`quality=low`；提示为白底、蓝圆位于橙色方块上方。没有使用旧模型映射或别名替代新模型。

| 渠道 | Flare | Sunburst | GPT Image 2 对照 |
| --- | --- | --- | --- |
| 1 · i7dc | 402：API Key 未绑定 image/codex 分组 | 同左 | 未重复测试 |
| 2 · apikey.fun | 404：该分组没有支持此模型的账号 | 同左 | 23.1 秒返回一张图片；输入 21、图片输出 2058 Token |
| 9 · tgjqr | 复测生成成功，20.4 秒 | 复测生成成功，17.5 秒 | 初次 502，复测新型号已恢复 |

apikey.fun 的两款新模型错误为：`Model "gpt-image-2.5-..." is not supported by any configured account in this group`。后续复测 tgjqr 两款型号均返回有效图片，但响应模型都是 `gpt-image-2-codex`。请求型号未在本网关映射或替换；供应商内部是否调用真实 2.5 无法由该响应确认。现有生产渠道均为供应商 API Key 接入，OAuth 账号池位于上游；本网关没有单独配置 type 57 的 OAuth 渠道。

模型列表不是调用成功的证据：apikey.fun 的列表未返回 image 型号，但 GPT Image 2 真实调用成功；tgjqr 的列表返回 GPT Image 2，真实调用却失败。

服务端实测记录保留于：

- `/opt/roarkapi/backups/image25-probe-20260909-003454/results.json`（复测成功）
- `/opt/roarkapi/backups/image25-probe-20260909-001256/results.json`
- `/opt/roarkapi/backups/image25-control-20260909-001400/results.json`
- `/opt/roarkapi/backups/image25-control-20260909-001436/results.json`

两款型号的 multipart `/v1/images/edits` 复测也均返回图片，输入 1552 Token（图片 1521、文本 31），图片输出 515 Token；响应仍标为 `gpt-image-2-codex`。编辑结果分别保留在 `/opt/roarkapi/backups/gpt-image-2.5-flare-edit-check.png` 与 `/opt/roarkapi/backups/gpt-image-2.5-sunburst-edit-check.png`。

## 已准备与未完成

本地已在 OpenAI 渠道默认型号列表加入两个准确 ID，并修正其端点分类，避免把图片专用模型同时标为文本 Chat Completions。图片生成计数与请求校验复用现有链路。

验证：`go test ./common ./relay/channel/openai ./relay/helper` 通过。扩展已有测试，确认两个新型号只被归入图片端点。

本地首页 ChatGPT 卡片已加入两款型号，保留 GPT Image 2。首页测试、类型检查、涉及文件 lint、生产构建及 Linux 后端构建通过，浏览器确认两个型号可见；缩小 OpenAI 卡片的型号行距后，桌面及 390px 手机宽度下，8 个型号均位于标题和底部标签之间，无纵向重叠。Flare 编辑图片人工检查通过：蓝圆变绿，橙色方块保留。

## 已上线与验收

用户确认每张 $0.124 并授权上线后，发布 `roark-20260909-image25`，二进制 SHA-256：`cfe8f8a168db8995b17eeb54ca1dc738189784859a2a20db1daa27cee7e75aa7`。校验 230 个当前静态资源，并保留旧版资源及注册页面脚本。

仅渠道 9 新增两款型号，启用 Codex 组；通过管理 API 合并管理员固定价格和模型元数据，保留其他设置。模型生成、编辑端点均已进入模型元数据和定价接口，`/v1/models` 确认返回两个准确型号。

发布后经本网关 `/v1/images/generations` 分别请求两款，均返回有效图片。消费日志 1923（Flare）与 1924（Sunburst）各扣 62000 quota，即 $0.124；测试令牌累计用量 124000，剩余 126000，与初始 250000 一致。测试令牌已删除，临时管理员凭证已恢复。上游响应仍标为 `gpt-image-2-codex`，不据此宣称其底层型号身份已验证。

真实公网首页浏览器确认：ChatGPT 卡片保留 GPT Image 2，并展示 GPT Image 2.5 Flare 与 GPT Image 2.5 Sunburst。后台模型元数据与价格通过生产 API 验证；未声称登录后的定价页面已经人工视觉验收。编辑验证为前述上游直接调用，并非本次发布后网关编辑端到端验收。

图片证据位于 `/opt/roarkapi/backups/image25-acceptance-20260909-005304-gpt-image-2.5-flare.png` 与同目录 `image25-acceptance-20260909-005304-gpt-image-2.5-sunburst.png`。

恢复点：`/opt/roarkapi/backups/compose.pre-image25.yml`、`pre-image25-release.db`、`pre-image-price-20260909-005304.db`。恢复应用时保留静态资源；已有业务写入后禁止直接覆盖数据库，配置恢复应只还原此次新增型号及其价格/元数据。
