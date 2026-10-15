# Clash / Surfboard WARP 出站（2026-09-26）

用户要求配置服务器端 WARP 出口，通过更新现有 Clash 订阅使用，意图用于 Muse 注册；不保证目标网站接受该出口。

- 安装 Cloudflare 官方 RHEL 9 仓库 cloudflare-warp，保留 GPG 验证，关闭弱依赖自动安装。warp-svc 开机启动；消费者注册；mode proxy，127.0.0.1:40000。未设置服务器全局 WARP 路由。
- Hysteria `/etc/roark-hi/config.yaml` 唯一 outbound 为 socks5 127.0.0.1:40000，无 direct 回退；默认所有经节点的 TCP 流量走 WARP。服务 restart 成功。
- SOCKS5 UDP ASSOCIATE 实测返回 050700（命令不支持），因此 Clash 节点 udp=false、Surfboard udp-relay=false。Hysteria 入站传输仍为 QUIC/UDP，不等于更换为 TCP 入站。依赖 UDP 的应用功能可能受限。
- `/hi`、`/sb` 节点统一重命名为 Roark WARP，分组引用同步更新，现有国内直连规则保留。仅代理节点的出站经过 WARP；DIRECT 规则仍从客户端直连。
- 备份：`/var/backups/roark-warp-20260926-104425`，含 config.yaml、subscription.yaml、surfboard.conf。恢复这些文件后重启 roark-hi 可回到旧节点行为；WARP 可独立断开/停用。备份含凭据，不进入 Git。
- 独立 Mihomo 客户端 127.0.0.1:19892、关闭 TUN、绑定 en0：经真实 Hysteria 隧道访问 Cloudflare trace，warp=on，地区 US、colo LAX；出口为 Cloudflare IPv6，已不再是 VPS 原生地址。Google HTTPS 测试 204，约 0.37 秒。
- 服务器自身直接 trace 为 warp=off，默认路由仍经 eth0 原网关；API status success=true，版本 roark-20260923-images；warp-svc/roark-hi 均 enabled。
- 公网 curl 下载 `/hi`、`/sb` 成功，内容含 Roark WARP 及正确 UDP 标志。独立测试客户端已停止，临时凭据副本已删除。
- 官方客户端及依赖安装后磁盘约 93%，余 2.8GB；历史发布文件仍未删除。此前清理建议需要另行执行。

参考：
- https://developers.cloudflare.com/warp-client/warp-modes/#local-proxy
- https://pkg.cloudflareclient.com/
- https://v2.hysteria.network/docs/advanced/Full-Server-Config/#outbounds
