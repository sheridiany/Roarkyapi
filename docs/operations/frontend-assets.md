# 发布时保留前端静态资源

2026-09-07 注册页出现 500，实际是浏览器仍运行上一版入口脚本，切换注册页时请求 `8622.36b68f732e.js`。新二进制仅包含 `8622.7633844bf0.js`，缺失脚本落入 SPA 回退，收到 HTTP 200 HTML，浏览器报 `Unexpected token '<'` 和 `ChunkLoadError`。

## 线上修复

Nginx `/static/` 优先读取 `/var/www/roarkapi/static/`，不存在的资源转发到当前应用。已保留前一版缺失的 6 个脚本和当前版本 195 个静态资源，文件名包含内容摘要，允许不同版本共存。应用和数据库未回退。

配置文件：`/etc/nginx/conf.d/api.roarkist.com.conf`。修改前备份：`/opt/roarkapi/backups/nginx.pre-static-retention.conf`。

## 后续发布必须执行

完成前端构建后，将 `web/dist/static/` 合并上传到 `/var/www/roarkapi/static/`，再切换应用二进制。必须保留旧文件，禁止使用 `rsync --delete` 或清空目录。可在已配置生产 SSH 连接的环境执行：

```sh
rsync -az web/dist/static/ root@64.186.225.51:/var/www/roarkapi/static/
```

不要覆盖同名而内容不同的资源。至少保留最近两版和过去 30 天的资源；清理须同时核对线上访问记录，不能随二进制替换而删除旧资源。

验收需覆盖：发布前打开登录页，发布后点击注册，邀请码输入框仍能显示；全新访客直接访问 `/sign-up`，可见当前 10 位邀请码入口。只测试新打开的页面不足以覆盖此问题。已经落入错误页的用户需刷新一次，才能退出当前错误边界并加载最新版本。
