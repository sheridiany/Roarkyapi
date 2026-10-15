# Surfboard 独立订阅（2026-09-24）

- 用户授权新增 Surfboard 订阅，选择独立地址 `https://roarkist.com/sb`，保留 Clash `/hi` 原内容。
- 官方 Hysteria2 参数、Managed Config、select 分组与 IP 规则文档均已核对：https://github.com/getsurfboard/manual/tree/main/docs/profile-format （文档实际内容通过仓库 HEAD API 获取）。
- 复用现有 Hysteria2 节点、认证和证书，严格证书校验；无需新增进程或端口。配置文件 `/var/lib/roark-hi/surfboard.conf`，由 Nginx 精确 `/sb` 路由提供，禁缓存、不记录访问日志。
- 第一行 MANAGED-CONFIG 指向 `/sb`，每日更新；保留 405 条规则，MATCH 转为 FINAL；提供 Roark 手选分组，超时测试上限 10 秒。
- Nginx 备份 `/var/backups/roark-surfboard-20260924-013807/roarkist.com.conf`。首次验证因 reload 交接期间 404 自动恢复；第二次带有限重试发布成功。
- nginx -t 成功；源站 HTTPS 和公网 GET 均 200，内容 SHA256 一致：`4720113aaf090c74113178e3b571f44f3043a666cfcf07194b5ed5903c6b24b2`。原 `/hi` 内容逐字节一致。
- 未取得 Android Surfboard 真机，未宣称手机导入或连接已验收。客户端需为支持 Hysteria2 的版本。该订阅兼容不等于修复此前手机网络超时。
- 无服务器清理操作；不在 Git 中存储节点密码或实际订阅内容。
