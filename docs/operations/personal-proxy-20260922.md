# Roark 个人订阅部署（2026-09-22）

## 当前服务器

- 当前 IP：`179.253.226.224`，用户明确提供；SSH 使用旧地址 `64.186.225.51` 的已知主机密钥校验通过，主机名 `mail.nitthiko.com`。
- 旧部署文档中的 `64.186.225.51` 是历史地址，不再作为当前连接目标。
- SSH 密钥仍为本机 `/Users/xuean/ssh/64.186.225.51 .pem`。本机现有代理会关闭普通 SSH 连接；使用 `ProxyCommand=/usr/bin/nc -4 -b en0 -G 10 %h %p`，保持用户现有 Clash 配置不变。
- 部署时 2 vCPU、3.6 GiB 内存，磁盘剩余 5.2 GiB。没有清理用户数据。

## 最终部署

用户明确要求独立个人使用，电脑和手机均使用 Clash。新服务完全不依赖面板、数据库或面板账号。

- 官方 Hysteria 2 `app/v2.12.3`，单独 systemd 服务 `roark-hi.service`，开机启用，监听 UDP 443；Nginx 原有 TCP 443 保持运行。
- 二进制 `/opt/roark-hi/hysteria`，SHA-256 `8c7a68a906998b747a0db87586e364f995fbfddb95693ae6e2fdb68a6e920d3e`，与 GitHub release digest 一致。
- 服务用户 `roark-proxy`；配置 `/etc/roark-hi/config.yaml`，独立随机密码，不复用旧面板认证。标准 BBR、自适应速率，未设置未经测量的 Brutal 带宽值，未限制为单 CPU 线程。
- TLS 使用 `roarkist.com` 有效证书，客户端严格校验，SNI 为该域名，实际节点连接 IP 为新 IP。
- `/etc/letsencrypt/renewal-hooks/deploy/roark-hi` 在该证书续期后复制证书并重启个人服务，已实际运行验证。
- `https://roarkist.com/hi?token=...` 由 Nginx 直接提供静态订阅 `/var/lib/roark-hi/subscription.yaml`。没有面板反向代理，独立随机访问密钥，响应禁止缓存，关闭此入口访问日志。
- 订阅包括一个 Hysteria 2 节点及国内/局域网直连规则，电脑和手机可共用。需要支持 Hysteria 2 的 Clash/Mihomo 内核。
- 完整链接只保存在服务器 `/etc/roark-hi/subscription-url.txt` 及本机 `/Users/xuean/Documents/Codex/2026-09-22/Roark-Clash/subscription-url.txt`，本机文件权限 0600。不得将链接或密码写入 Git。

## 实测

- 从公网下载实际订阅，Mihomo v1.19.29 配置校验通过。
- 本机独立 Mihomo 测试进程关闭 TUN、绑定 en0，不修改用户当前客户端配置。
- 通过节点访问 ipify，出口为 `179.253.226.224`；SOCKS UDP DNS 查询成功，返回 2 条记录。
- Cloudflare 25,000,000 字节单连接下载：3.409948 秒，7,331,490 B/s，即约 58.7 Mbps。
- 服务器临时本地 HTTP 测试源，经同一 Hysteria 2 隧道单连接下载 100,000,000 字节：7.783041 秒，12,848,448 B/s，即约 102.8 Mbps。此项测量客户端到节点链路，不等于所有目标站点速度。
- Cloudflare 100 MB 请求被测试站返回 403，未计为有效测速；因此用临时本地源测试持续传输，测试服务和文件已自动清理。
- 裸 `/hi`、无效密钥返回 404；官网与 API 状态入口返回 200。证书 hook 执行后服务保持 active/enabled。未进行整机重启或手机真机测试。

## 原有服务与恢复

开始时曾尝试复用旧订阅面板；用户否定该方案后已撤掉面板版 `/hi`，并用独立订阅替换本机链接文件。原面板节点地址从旧 IP 修正为新 IP，未修改原有 5 个账号、密码和额度。

用户确认“停用吧”后，旧面板 `subscription-panel@roark` 和旧节点 `roark-node` 已 stop/disable，状态均为 inactive/disabled；8098 与 20001–20005 的 TCP/UDP 监听已消失。旧面板网站改为返回 410，数据库及 5 个账号保留。新的 `roark-hi` 保持 active/enabled。

旧面板 Nginx 恢复点：`/var/backups/roark-old-panel-disabled-20260922-132702/go.roarkist.com.conf`。如用户要求恢复，先恢复该配置并通过 `nginx -t` 后 reload，再启用 `subscription-panel@roark` 与 `roark-node`。不要恢复到旧 IP。

独立部署恢复点：`/var/backups/roark-hi-standalone-20260922-132117/roarkist.com.conf`。撤回新入口时恢复该 Nginx 文件，先 `nginx -t` 再 reload，并 `systemctl disable --now roark-hi`；保留备份和原有业务数据。初次面板接入前备份位于 `/var/backups/roark-hi-20260922-131511/`，不要用该整库备份覆盖后续流量记录。

参考：[Hysteria 服务端配置](https://v2.hysteria.network/docs/advanced/Full-Server-Config/)、[Mihomo Hysteria 2 配置](https://wiki.metacubex.one/en/config/proxies/hysteria2/)。
