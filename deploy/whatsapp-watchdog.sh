#!/usr/bin/env bash
# Vigia da conexão do WhatsApp (Evolution API).
#
# Por que: a sessão do WhatsApp pode cair silenciosamente. Se isso acontecer, os
# lembretes de consulta e de implante param de ser enviados sem ninguém notar.
# Este script checa a conexão e avisa no TELEGRAM (canal independente do WhatsApp).
#
# Uso manual:  /docker/apps/crm/deploy/whatsapp-watchdog.sh
# Automático:  cron a cada 15 min (ver deploy/README-backup.md)
set -uo pipefail

CRM_ENV="/docker/apps/crm/deploy/.env"
HERMES_ENV="/docker/hermes-agent-vxrg/data/.env"
STATE_FILE="/var/lib/crm-watchdog.state"
LOG="/var/log/crm-whatsapp-watchdog.log"
REALERT_SECONDS=21600 # 6h: enquanto continuar caído, reavisa a cada 6h (sem spam)

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG"; }

# lê KEY=valor de um arquivo .env (sem executar o arquivo)
getenv_from() {
  local file="$1" key="$2"
  [ -f "$file" ] || return 0
  grep -m1 -E "^${key}=" "$file" 2>/dev/null | cut -d= -f2- | tr -d '"'"'"'\r' || true
}

EVO_URL="$(getenv_from "$CRM_ENV" EVOLUTION_URL)"
EVO_KEY="$(getenv_from "$CRM_ENV" EVOLUTION_API_KEY)"
EVO_INSTANCE="$(getenv_from "$CRM_ENV" EVOLUTION_INSTANCE)"

# Telegram: usa o do CRM se definido; senão reaproveita o bot do Hermes
TG_TOKEN="$(getenv_from "$CRM_ENV" TELEGRAM_BOT_TOKEN)"
if [ -z "$TG_TOKEN" ]; then
  for k in TELEGRAM_BOT_TOKEN TELEGRAM_TOKEN TELEGRAM_API_TOKEN TELEGRAM_API_KEY; do
    TG_TOKEN="$(getenv_from "$HERMES_ENV" "$k")"
    [ -n "$TG_TOKEN" ] && break
  done
fi
TG_CHAT="$(getenv_from "$CRM_ENV" TELEGRAM_CHAT_ID)"
[ -z "$TG_CHAT" ] && TG_CHAT="5691849297"

notify() {
  local msg="$1"
  if [ -z "$TG_TOKEN" ] || [ -z "$TG_CHAT" ]; then
    log "AVISO: Telegram nao configurado (sem token/chat). Mensagem nao enviada: $msg"
    return 0
  fi
  curl -sS -m 20 -o /dev/null \
    -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TG_CHAT}" \
    --data-urlencode "text=${msg}" || log "AVISO: falha ao enviar Telegram."
}

if [ -z "$EVO_URL" ] || [ -z "$EVO_KEY" ] || [ -z "$EVO_INSTANCE" ]; then
  log "ERRO: EVOLUTION_* nao encontrado em $CRM_ENV."
  exit 1
fi

# consulta o estado da instância
RESP="$(curl -sS -m 20 "${EVO_URL}/instance/connectionState/${EVO_INSTANCE}" \
  -H "apikey: ${EVO_KEY}" 2>/dev/null || true)"

if [ -z "$RESP" ]; then
  STATE="api_inacessivel"
else
  STATE="$(echo "$RESP" | grep -o '"state"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"
  [ -z "$STATE" ] && STATE="resposta_inesperada"
fi

# estado anterior
PREV_STATE=""
PREV_ALERT=0
if [ -f "$STATE_FILE" ]; then
  PREV_STATE="$(cut -d' ' -f1 "$STATE_FILE" 2>/dev/null || true)"
  PREV_ALERT="$(cut -d' ' -f2 "$STATE_FILE" 2>/dev/null || echo 0)"
fi
[ -z "$PREV_ALERT" ] && PREV_ALERT=0
NOW="$(date +%s)"
LAST_ALERT="$PREV_ALERT"

if [ "$STATE" = "open" ]; then
  # recuperou depois de ter caído?
  if [ -n "$PREV_STATE" ] && [ "$PREV_STATE" != "open" ]; then
    notify "✅ WhatsApp da clínica RECONECTADO. Os lembretes voltaram a ser enviados normalmente."
    log "RECUPEROU: estado open (anterior: $PREV_STATE). Telegram enviado."
  else
    log "OK: conectado (open)."
  fi
  LAST_ALERT=0
else
  # caído: avisa se mudou de estado ou se já passou o intervalo de reaviso
  ELAPSED=$((NOW - PREV_ALERT))
  if [ "$PREV_STATE" != "$STATE" ] || [ "$ELAPSED" -ge "$REALERT_SECONDS" ]; then
    notify "🚨 WhatsApp da clínica DESCONECTADO (estado: ${STATE}).

Os lembretes automáticos (consultas e implantes) NÃO estão sendo enviados.

Para religar: abra https://evo.clinicacanever.com.br/manager e leia o QR code novamente com o celular da clínica."
    LAST_ALERT="$NOW"
    log "ALERTA: estado '$STATE'. Telegram enviado."
  else
    log "AINDA CAIDO: estado '$STATE' (reaviso em $(((REALERT_SECONDS - ELAPSED) / 60)) min)."
  fi
fi

mkdir -p "$(dirname "$STATE_FILE")"
echo "$STATE $LAST_ALERT" > "$STATE_FILE"
