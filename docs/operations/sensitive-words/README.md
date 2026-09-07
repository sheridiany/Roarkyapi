# Roark API 请求关键词过滤词库

2026-09-06：从下列公开词库筛选、去重得到 278 条，用于后台 `SensitiveWords`（每行一词）。这是低误杀的初始配置，不是全量词库。

## 来源与许可

- [Konsheng/Sensitive-lexicon](https://github.com/konsheng/Sensitive-lexicon/tree/d967c30b053fa40b06c5a0dddf0be493f2dfae46)：MIT；采用色情类型、色情词库、涉枪涉爆、广告类型、其他词库、暴恐词库中经筛选的条目。许可原文见 LICENSE-konsheng。
- [fwwdn/sensitive-stop-words](https://github.com/fwwdn/sensitive-stop-words/tree/a7d06bb1c321e669943b6841570d9da6dad8ce2b)：Apache-2.0；参考色情类、涉枪涉爆违法信息关键词，与前一来源合并去重。许可原文见 LICENSE-fwwdn。
- 同时查阅 [houbb/sensitive-word-data](https://github.com/houbb/sensitive-word-data) 的分类方案；未直接导入其完整词库。

## 筛选范围

保留明确色情、直接辱骂、枪支弹药爆炸物的交易短语与制作短语，及部分违法交易、考试作弊短语。排除单字、短英文缩写、普通商业/开发词、疾病/药品/解剖学单词、人物与政治新闻词、停用词和整批网址。

现有引擎对整段请求（包括客户端传入的历史消息）做小写化后的子串匹配，没有语义判断；含词引用和讨论也可能被拦截。不要把“网络”“代理”“兼职”“QQ”“SM”“AV”等宽泛词直接加入。

## 验证与恢复

实际 Go 匹配器验证：10 条开发、商业、医疗、新闻等普通文本通过；“出售手枪”“色情网站”“卧槽”命中。生产配置通过原生选项 API 保存，保留原选项备份，并保留用户已有自定义条目；只移除默认占位词 `test_sensitive`。

敏感词命中响应使用 HTTP 400，提示 `request contains blocked keywords`，并在预扣费和上游调用之前终止。

SHA-256（blocked.txt）：`97ed78c12a8a00538eae4e3fa874edc14d246656b22685653b17fd097c0c520b`。
