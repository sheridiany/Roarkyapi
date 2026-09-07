# 发布时保留前端静态资源

2026-09-07 注册页出现 500，实际是浏览器仍运行上一版入口脚本，切换注册页时请求 `8622.36b68f732e.js`。新二进制仅包含 `8622.7633844bf0.js`，缺失脚本落入 SPA 回退，收到 HTTP 200 HTML，浏览器报 `Unexpected token '<'` 和 `ChunkLoadError`。

## 线上修复

Nginx `/static/` 优先读取 `/var/www/roarkapi/static/`，不存在的资源转发到当前应用。已保留前一版缺失的 6 个脚本和当前版本 195 个静态资源，文件名包含内容摘要，允许不同版本共存。应用和数据库未回退。

配置文件：`/etc/nginx/conf.d/api.roarkist.com.conf`。修改前备份：`/opt/roarkapi/backups/nginx.pre-static-retention.conf`。

## 后续发布必须执行

完成前端构建后，将 `web/dist/static/` 合并上传到 `/var/www/roarkapi/static/`，再切换应用二进制。必须保留旧文件，禁止删除旧资源或清空目录。生产未安装 rsync，可在已配置生产 SSH 连接的环境执行：

```sh
tar -czf /tmp/roark-static.tar.gz -C web/dist static
scp /tmp/roark-static.tar.gz root@64.186.225.51:/opt/roarkapi/releases/
ssh root@64.186.225.51 'tar --skip-old-files -xzf /opt/roarkapi/releases/roark-static.tar.gz -C /var/www/roarkapi'
```

不要覆盖同名而内容不同的资源。至少保留最近两版和过去 30 天的资源；清理须同时核对线上访问记录，不能随二进制替换而删除旧资源。

验收需覆盖：发布前打开登录页，发布后点击注册，邀请码输入框仍能显示；全新访客直接访问 `/sign-up`，可见当前 10 位邀请码入口。只测试新打开的页面不足以覆盖此问题。已经落入错误页的用户需刷新一次，才能退出当前错误边界并加载最新版本。


## Roark 错误页面验收（2026-09-07）

发布 `roark-20260907-error-pages`，SHA-256 `5f60f81b1980f2c23ca98b4dd6a00633c43025f23b1014e90d135767c80db73e`。401、403、404、429、500、502、503、504 共用 404 的 Roark 太空背景、像素数字、导航与页脚；全局路由异常同样使用该布局。移除上游 GitHub 反馈入口，按状态提供登录、返回和刷新操作。页内加载失败提示也移除旧模板措辞。

验证：10 项错误页回归（包含真实路由加载异常）、5 项邀请注册页面测试通过；类型检查、涉及文件 lint、生产构建通过。浏览器逐页检查八个公网入口；500 桌面与 390px 移动端视觉验收通过，刷新操作有效。部署前校验全部 230 个当前静态文件，保留前两版注册脚本，部署后公网仍返回正确 JavaScript。注册、仅邀请注册、邮箱验证及 Turnstile 设置保持开启。

恢复点：`/opt/roarkapi/backups/compose.pre-error-pages.yml`、`pre-error-pages-release.db`。恢复应用时保留静态资源目录；发生业务写入后不要用旧数据库覆盖线上数据。
