# Roark 上游同步记录（2026-10-14，任务 t1）

本记录对应 `garden/9306132627c34618` 上的本地合并提交；未推送，未修改或合入用户 main，未部署。代码合并与可用环境下的检查已完成，但三数据库迁移矩阵和原生 CGO 验证受阻，不能据此认定完整验收通过。

## 合并范围

- 第一父提交：`3b4b5a8a72350f4a08482361b2168172e6498397`。
- 上游：执行 `git fetch upstream --prune` 后的 `upstream/main`，`718a4e7f9751c5bf1958747cd0c2c895e2b937d4`，新增 85 个上游提交。
- 使用 `git merge --no-ff upstream/main`，保留双亲合并提交，没有 rebase 或 squash。
- 初始冲突 36 个文件：后端/规范/后端语言文件 11 个，前端 25 个（含 7 个 JSON 语言文件与 5 个 modify/delete 冲突）。参考 `e9fac8829`、`a1da3e11e` 和既往升级记录处理。

## 保留与采纳

| 范围 | 处理与核对 |
| --- | --- |
| 品牌与主题 | 保留 Roark 默认 Public Sans、主题色、品牌错误页、紧凑密钥/日志布局。恢复自动合并引入的浏览器默认字体变更。`config-drawer.tsx` 维持删除。品牌错误页吸收路由 chunk 加载失败只重载一次的修复。 |
| 定价 | 首页人民币价格、官方美元划线价和先折算美元再算折扣的口径保留，首页定价文件没有改动。模型卡片吸收缓存读取价格显示；保留本地卡片布局和价格格式化。 |
| 邀请与 OAuth | 保留邀请码校验/消费事务、OAuth 待补全流程、Google verified email、匿名补全与管理员邀请路由。适配上游 `common.Message` 错误接口；本地邀请提示保留后端三语言翻译。验证邮件保留 Roark HTML，密码重置邮件吸收上游语言选择。 |
| 图像持久化 | Playground 图像请求路由、Gemini inline 图片处理、生成图像存储路径保留。拒绝上游每次访问清除旧全局存储、改为账户后缀 key 的整套变更，避免旧会话/图像丢失。对应测试改为验证旧历史加载、保存与显式清理。既有浏览器本地存储仍不按账户隔离。 |
| 图像计费 | 拒绝上游失败/未完成/取消终态仍累计已完成图像工具次数的变更；恢复 `Reset`、`IsNonBillableResponsesStatus`，流式及非流式均保持失败终态图像次数为 0，断流无终态仍保留已交付图像。保留 Roark 终态立即结束与早期错误处理。 |
| Codex 与用量 | Codex adaptor 无改动，输入缓存/图片及输出图片/推理明细映射保持。采纳 tokenkit、供应商工具用量解析、Gemini grounding 查询计数和函数调用输出估算；Responses 转 Chat 的已交付文本失败结算采用上游修复，并保留本地平面 error 处理。 |
| 日志与其他 | 将 Roark API-only/资金来源过滤合入上游 `LogFilter`，列表、统计、导出保留过滤语义；接入日志导出、任务动态价格详情、存储日志文案翻译。保留内嵌支付二维码流程，未采纳输出支付参数到日志的冲突行。保留本地已删除的旧日志/额度布局测试及 affiliate hook 的删除状态。 |
| 国际化 | 七语言文件以上游为底，通过 `add-missing-keys.mjs` 保留各语言 232–238 个本地新增/修改值，再执行 `bun run i18n:sync`；七语言均无缺键。临时脚本已移除。 |

## 本次实际验证

| 检查 | 结果 |
| --- | --- |
| 冲突标记扫描及 `git diff --check` | 无冲突标记、无空白错误；unmerged index 为空。 |
| `go build ./...` / `go test ./...` 默认 CGO | 失败：本机 clang/SDK 链接器不识别 MacOSX27.0 的 `arm64e.x1-macos`，报 `tapi error: malformed file`。没有改动全局工具链来绕过。 |
| `CGO_ENABLED=0 go build ./...`、`CGO_ENABLED=0 go test ./...` | 最终全量通过，使用项目支持的纯 Go SQLite 路径。 |
| `cd relaykit && GOWORK=off go build ./... && GOWORK=off go test ./...` | 通过。 |
| `cd tokenkit && GOWORK=off go build ./...` | 通过。 |
| `cd web && bun install`、`bun run typecheck`、`bun run build` | 通过；最终构建在品牌字体恢复和所有 TS 合并适配后重跑通过。 |
| 变更 TS/JS 文件 oxlint | 121 个文件检查无 error；保留上游 `column-helpers.tsx` 一个 self-closing warning。 |
| 前端全量测试 | 首轮 203 文件、2246 用例，201 文件/2241 用例通过；2 文件的 5 个失败均为日期控件可访问名称与 Roark 不一致。修正测试查询名称后，两个失败文件连同原日期回归和首页定价共 4 文件/20 用例全部通过，没有声称首轮全量退出成功。 |
| 前端专项 | 品牌主题、错误页、定价、认证、Playground 图像/存储共 25 文件/278 用例通过；密钥、日志、模型和原日期控件回归共 32 文件/459 用例通过。 |

具体业务证据：

- `TestRegistrationInvitationLifecycle` 通过：无效/缺失/过期/撤销/复用邀请码拒绝、并发只消费一次、失败插入回滚、验证邮件注册、OAuth 补全与 flow 复用/过期等路径（本次 SQLite）。
- `TestCodexImageUsageBilling` 通过：固定表达式夹具中，有缓存/图像明细结算 110 quota，省略明细时 120；不是线上定价。Codex 图像失败不写成功响应的测试通过。
- `TestResponsesUsageAccumulatorTerminalAccounting`、`TestOaiResponsesHandlerIncompleteStatusCommitsZeroImageGeneration`、`TestOaiResponsesStreamHandlerDiscardsImageOutputOnIncomplete` 通过，保护失败终态零图像计费；Responses/Gemini 相关专项均通过。
- `TestPlaygroundImagesUsesImageValidationBeforeBilling` 及前端 `image-generation.test.tsx` 通过，覆盖图像请求校验和持久化内容。
- `gateway-models.test.tsx` 通过：官方折扣随分组变化、充值成本先折算美元、管理员表达式覆盖、输入/输出折扣范围；`theme-preferences.test.tsx` 与品牌错误页回归通过。
- `model/user_log_filter_test.go` 适配新签名后通过，列表和汇总的资金来源/API-only 筛选保持一致。

## 未完成的验收与限制

- 上游引入 `Token.AllowUserQuotaQuery` 字段等数据库行为变化，必须补跑 SQLite/MySQL/PostgreSQL 的新库、最近发布版升级、重复启动及独立日志库矩阵。本机 Docker socket `/Users/xuean/.orbstack/run/docker.sock` 不存在，PATH 中也没有 MySQL/PostgreSQL 服务端；本次仅运行测试内的 SQLite，不能认定三数据库兼容或迁移验收完成。未连接任何生产数据库。
- 原生 CGO 构建/测试仍受上述 SDK 链接错误影响；纯 Go 通过不等同于原生 CGO 通过。
- 未运行浏览器像素验收、真实付费图像/Codex 请求、支付或生产部署。业务证据来自实际自动化测试与代码核对。
- 并行助手未能启动（缺少 anthropic 凭据），已关闭；由主会话完成冲突处理和最终差异检查，没有自动多模型审查通过的声明。
