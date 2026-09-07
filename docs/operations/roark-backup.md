# Roark API 备份与恢复

适用于 `/opt/roarkapi` 的 SQLite 单机部署。`roark-backup.timer` 每小时调用 `roark-backup.service`，运行 `/opt/roarkapi/backup.py`（仓库源文件为 `roark-backup.py`），仅保留最近 48 份本任务生成的归档。其他历史备份不受影响。

归档位于 `/opt/roarkapi/backups/hourly/`，包含在线 SQLite 快照、Compose、环境配置、Nginx 配置，以及记录版本、二进制 SHA-256 和业务表行数的 manifest。二进制位于 `releases/`，需连同对应版本另行保存。备份包含密钥，目录权限应为 700，文件为 600。

检查与手工备份：

```sh
systemctl list-timers roark-backup.timer
systemctl start roark-backup.service
systemctl show roark-backup.service -p Result -p ExecMainStatus
cd /opt/roarkapi/backups/hourly
sha256sum -c <归档名>.sha256
```

恢复先在隔离目录演练，不能直接覆盖线上数据：

1. 校验归档 SHA-256，解压到权限为 700 的新目录。
2. 对快照执行 SQLite `pragma quick_check`，核对 manifest 中各表行数。
3. 核对对应发布二进制的 SHA-256。
4. 用 `--network none` 的临时容器启动该二进制，只挂载快照副本，加载备份配置，并将 `SQLITE_PATH` 指向副本。通过容器网络命名空间访问 `/api/status`。
5. 启动后再次校验业务表行数及用户余额。删除演练容器及演练副本。
6. 实际灾难恢复时先停止应用并保存当前数据库、配置及版本；明确恢复时间点后再切换副本和对应版本，启动并检查登录、模型调用和账单。恢复旧快照会丢弃快照后的交易，不能在有新交易时直接回滚数据库。

2026-09-06 已完成一次断网容器恢复演练，数据库完整性、7 张业务表行数、用户余额及接口状态均通过。定时任务只负责本机备份；本轮另将干净快照和对应二进制保存到操作电脑的私有目录。持续自动异地备份尚未配置。
