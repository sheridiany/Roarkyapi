# Gemini 视频输入排查与调用（2026-09-08）

## 实测结论

排查时线上版本 `roark-20260908-model-distribution`，渠道 8（Gemini · 12ai）。三个模型 `gemini-3.5-flash-lite`、`gemini-3.7-flash`、`gemini-3.8-flash` 均通过完整 MP4 视频输入测试。

样本为 6 秒 MP4，三段画面依次显示橙底 ZEBRA 742、紫底 KITE 193、青底 MANGO 586；带音轨版本说出 “The secret password is silver comet 918”。提示词不包含这些答案。三个模型均正确识别画面顺序、数字和颜色，并转写语音口令。本轮未覆盖长视频、大文件或独立图片输入。

| 调用形式 | 本轮结果 |
| --- | --- |
| `/v1/chat/completions`，`video_url` 为 data URL 字符串 | 三模型视频、语音识别成功 |
| `/v1/chat/completions`，`video_url` 为 `{url: ...}` 对象 | 旧版静默丢失视频；已于 `roark-20260908-video-input` 修复，三模型视频和音频复测通过 |
| `/v1beta/models/{model}:generateContent`，`inlineData` | 3.5 Lite 视频识别成功；另对上游原生接口验证三模型全部成功 |
| `fileData` | 网关 DTO 支持 camelCase 结构，远程文件调用尚未实测 |
| `/v1/files` | 网关尚未实现。分发中间件可能先报缺少模型名，补 model 不会使上传接口可用 |

## 根因与用量

`Message.ParseContent` 只接受字符串形式的 `video_url`，对象形式被丢弃。复现时，相同提示词和 MP4：对象形式只发送文字，输入 52 Token，模型回答 `NO_VIDEO`；字符串形式输入 448 Token，正确识别三段画面。带语音的完整 MP4 输入为 610 Token。

上游 `usageMetadata` 只给汇总 Token，不给 `promptTokensDetails`。现有兼容转换把缺少细分的输入总量填入 `text_tokens`，所以成功读取视频和语音时，`audio_tokens`、`image_tokens` 仍为 0。不能据此判断视频是否被读取；也不能从总量凭空拆出音视频 Token。

本网关 `model_mapping` 为 `{}`，三个模型 ID 原样传给 `https://cdn.12ai.org`。上游响应未提供 `modelVersion`；只能确认本网关未改名，无法独立证明供应商内部不存在额外映射。

## 可运行示例

使用 [gemini-video.py](../examples/gemini-video.py)，只依赖 Python 标准库。准备可用的 Roark API Key，并选择允许 Gemini 模型的分组。

```sh
export ROARK_API_KEY='你的 Roark API Key'
python3 docs/examples/gemini-video.py /path/to/video.mp4 --model gemini-3.8-flash
```

其他两模型仅替换 `--model`。使用 Gemini 原生请求：

```sh
python3 docs/examples/gemini-video.py /path/to/video.mp4 --model gemini-3.5-flash-lite --protocol gemini
```

`ROARK_BASE_URL` 默认为 `https://api.roarkist.com`（不带 `/v1`）。示例限制 MP4 原文件不超过 14 MiB，控制 base64 膨胀后的请求大小；这只是该示例的保守限制，不代表模型的完整视频规格。无需调用 `/v1/files`。

## 复核证据

用户报告的三个请求均匹配生产日志，经过 OpenAI Compatible → Google Gemini 转换、渠道 8；日志输入量为 64、109、109 Token。日志不保存原始请求体，因此无法确认原请求具体用了哪个字段。对象格式丢视频问题由独立复现与现网对照测试确认。

带语音 MP4 成功请求：

- 3.5 Lite：`chatcmpl-202609080703208409674618268d9d6kS9RfwxG`
- 3.7：`chatcmpl-202609080703246327473078268d9d6W3rHtIxB`
- 3.8：`chatcmpl-202609080703280875632518268d9d6BYQNdneN`

临时诊断 API Key 已删除，临时管理员凭证已还原。兼容补丁验证：`go test ./service ./relay/channel/gemini ./relay/helper`；`cd relaykit && GOWORK=off go build ./... && GOWORK=off go test ./dto ./relayconvert/...`。

Google 官方原生视频输入文档：https://ai.google.dev/gemini-api/docs/generate-content/video-understanding


## 修复发布验收

2026-09-08 已发布 `roark-20260908-video-input`，代码提交 `e9acf2783`，二进制 SHA-256：`3495507b1cf4fad69fd87037ef41f538dc21ed090d5580041a39c4b32e7bbf15`。

发布后使用对象形式 `video_url: {"url": "data:video/mp4;base64,..."}`，向生产网关发送同一份带语音 MP4。三个模型均正确识别 742、193、586 的画面顺序、颜色，以及音轨中的 silver comet 918 口令：

- 3.5 Lite：`chatcmpl-202609080710596214773008268d9d6Pc4Yx00u`
- 3.7：`chatcmpl-202609080711017496735158268d9d6cgBNKctJ`
- 3.8：`chatcmpl-202609080711048104275248268d9d6Qdd1C1SD`

临时复测 Key 已删除。新版本状态、公网入口静态资源摘要、历史注册脚本可访问性均已验证；邀请注册设置保持开启。恢复点为生产 `backups/compose.pre-video-input.yml`、旧版二进制 `releases/roark-20260908-model-distribution`，并保留 `backups/pre-video-input-release.db`。回退应用不得直接覆盖发生新业务写入后的数据库。

此补丁只修复视频字段兼容，不实现 `/v1/files`，也不伪造供应商未提供的分模态用量。
