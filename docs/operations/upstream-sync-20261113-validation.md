# 2026-11-13 上游同步验证

上游固定为 b20e0566b235716383da42450c6c536689de9b43。
升级基线为本地最新发布标签 v1.0.0-rc.47。

## 数据库

隔离 Docker MySQL 8.0.46、PostgreSQL 16.15，加应用内嵌 SQLite。
设置 TEST_MYSQL_DSN 和 URL 格式 TEST_POSTGRES_DSN 后运行：

    go test ./model -count=1

全部通过，包含迁移 schema 稳定性、数据保留、唯一约束测试。
分别设置 TEST_TASK_DB_DIALECT=sqlite/mysql/postgres，运行：

    go test ./model -run TestScheduledChannel -count=1

全部通过。新库连续启动两次通过，发布标签建库再升级连续启动两次通过。
另以发布标签插入 MigrationVerification=preserve-me，三个引擎升级后两次读取均保留。
MySQL 和 PostgreSQL 同时配置独立日志数据库并验证启动迁移。
SQLite 日志与主库共享，这是当前默认配置。

临时验证脚本位于 /tmp/roark-migrate-check.py 和 /tmp/roark-data-check.py。
日志位于 /tmp/roark-db-matrix、/tmp/roark-matrix-final.log。

## 合并修复

删除引用已退休敏感词设置的旧控制器测试。
上游已将该功能迁移至请求插件，其迁移回归由
model/sensitive_word_migration_test.go 验证。
