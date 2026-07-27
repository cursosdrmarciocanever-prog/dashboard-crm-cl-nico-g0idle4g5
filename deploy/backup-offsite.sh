#!/usr/bin/env bash
# Copia os backups do PocketBase para FORA do container (disco do host).
#
# Por que: o backup nativo do PocketBase (migration 0026) grava em pb_data/backups,
# que está DENTRO do volume do container. Se o volume for perdido, o backup vai
# junto. Este script tira uma cópia para /docker/backups/crm no host.
#
# Uso manual:  /docker/apps/crm/deploy/backup-offsite.sh
# Automático:  ver deploy/README-backup.md (cron diário)
set -euo pipefail

DEPLOY_DIR="/docker/apps/crm/deploy"
DEST="/docker/backups/crm"
KEEP_DAYS=30
LOG="/var/log/crm-backup.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

mkdir -p "$DEST"
cd "$DEPLOY_DIR"

# nome do backup mais recente gerado pelo PocketBase
LATEST="$(docker compose exec -T pocketbase sh -c 'ls -1t /pb/pb_data/backups/*.zip 2>/dev/null | head -1' | tr -d '\r' || true)"

if [ -z "$LATEST" ]; then
  log "AVISO: nenhum backup encontrado em pb_data/backups (o cron do PocketBase já rodou?)."
  exit 0
fi

NAME="$(basename "$LATEST")"

if [ -f "$DEST/$NAME" ]; then
  log "OK: $NAME já estava copiado."
else
  docker compose cp "pocketbase:$LATEST" "$DEST/$NAME"
  SIZE="$(du -h "$DEST/$NAME" | cut -f1)"
  log "OK: copiado $NAME ($SIZE) para $DEST."
fi

# remove cópias locais antigas
DELETED="$(find "$DEST" -name '*.zip' -type f -mtime "+$KEEP_DAYS" -print -delete | wc -l | tr -d ' ')"
[ "$DELETED" != "0" ] && log "Limpeza: $DELETED backup(s) com mais de $KEEP_DAYS dias removidos."

TOTAL="$(find "$DEST" -name '*.zip' -type f | wc -l | tr -d ' ')"
log "Backups no host: $TOTAL arquivo(s) em $DEST."
