#!/bin/bash
# SQLite 数据库自动备份脚本
# 用法: ./backup.sh 或添加到 crontab 定时执行

BACKUP_DIR="./backups"
DB_FILE="./data/app.db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_FILE" ]; then
  echo "[备份] 数据库文件不存在: $DB_FILE"
  exit 1
fi

# 使用 SQLite 的 .backup 命令进行安全备份
sqlite3 "$DB_FILE" ".backup '$BACKUP_DIR/app_backup_${TIMESTAMP}.db'"

if [ $? -eq 0 ]; then
  echo "[备份] 备份成功: $BACKUP_DIR/app_backup_${TIMESTAMP}.db"
  # 保留最近 30 个备份
  ls -t "$BACKUP_DIR"/app_backup_*.db | tail -n +31 | xargs rm -f 2>/dev/null
  echo "[备份] 已清理旧备份，保留最近30个"
else
  echo "[备份] 备份失败"
  exit 1
fi
