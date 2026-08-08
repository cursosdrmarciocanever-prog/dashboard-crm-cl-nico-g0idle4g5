#!/usr/bin/env bash
# Vigia da conexão do WhatsApp (Evolution API).
#
# Por que: a sessão do WhatsApp pode cair silenciosamente. Se isso acontecer, os
# lembretes de consulta e de implante param de ser enviados sem ninguém notar.
# Este script checa a conexão e avisa por TELEGRAM e/ou E-MAIL — canais
# independentes do WhatsApp. Avisar por WhatsApp seria inútil: o que caiu é
# justamente ele.
#
# RECUPERACAO AUTOMATICA: ao detectar a queda, tenta reiniciar a instancia uma
# vez antes de incomodar alguem. Socket derrubado volta sozinho em segundos; so
# quando o restart nao resolve (sessao exigindo QR novo) e que o alerta sai.
#
# Uso manual:  /docker/apps/crm/deploy/whatsapp-watchdog.sh
# TESTE:       /docker/apps/crm/deploy/whatsapp-watchdog.sh --teste
#              manda um alerta de mentira agora, para provar que ele chega.
#              Um monitoramento que ninguém testou não é monitoramento.
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
# NAO colocar chat_id padrao aqui. Ja houve um fixo no codigo: com token e sem
# TELEGRAM_CHAT_ID, os alertas da clinica iriam para o Telegram de um estranho.

# E-mail (opcional, segundo canal). Precisa de SMTP_* no .env.
MAIL_TO="$(getenv_from "$CRM_ENV" ALERTA_EMAIL_TO)"
SMTP_URL="$(getenv_from "$CRM_ENV" SMTP_URL)"
SMTP_USER="$(getenv_from "$CRM_ENV" SMTP_USER)"
SMTP_PASS="$(getenv_from "$CRM_ENV" SMTP_PASS)"

# Envia por Telegram. Retorna 0 SO se a API confirmar. A versao anterior
# descartava a resposta e o chamador dizia "Telegram enviado" de qualquer jeito
# — foi assim que 31h de queda passaram sem aviso nenhum.
send_telegram() {
  local msg="$1" resp ok
  [ -z "$TG_TOKEN" ] || [ -z "$TG_CHAT" ] && return 1
  resp="$(curl -sS -m 20 -X POST "https://api.telegram.org/bot${TG_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TG_CHAT}" \
    --data-urlencode "text=${msg}" 2>&1)"
  ok="$(printf '%s' "$resp" | grep -o '"ok":[a-z]*' | head -1 | cut -d: -f2)"
  if [ "$ok" = "true" ]; then
    return 0
  fi
  log "FALHA Telegram: $(printf '%s' "$resp" | head -c 200)"
  return 1
}

send_email() {
  local msg="$1"
  [ -z "$MAIL_TO" ] || [ -z "$SMTP_URL" ] || [ -z "$SMTP_USER" ] && return 1
  printf 'From: %s\nTo: %s\nSubject: [CRM] WhatsApp da clinica desconectado\n\n%s\n' \
    "$SMTP_USER" "$MAIL_TO" "$msg" \
    | curl -sS -m 30 --url "$SMTP_URL" --ssl-reqd \
        --mail-from "$SMTP_USER" --mail-rcpt "$MAIL_TO" \
        --user "${SMTP_USER}:${SMTP_PASS}" --upload-file - >/dev/null 2>&1
}

# Tenta todos os canais configurados. Só considera avisado se ALGUM confirmou.
notify() {
  local msg="$1" entregue=0
  send_telegram "$msg" && entregue=1
  send_email "$msg" && entregue=1

  if [ "$entregue" = "1" ]; then
    return 0
  fi
  if [ -z "$TG_TOKEN" ] && [ -z "$MAIL_TO" ]; then
    log "SEM CANAL DE ALERTA: nenhum aviso foi enviado a ninguem. Configure TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID (ou ALERTA_EMAIL_TO + SMTP_*) no .env."
  else
    log "ALERTA NAO ENTREGUE: todos os canais configurados falharam."
  fi
  return 1
}

# --teste: prova que o alerta chega, sem esperar uma queda real
if [ "${1:-}" = "--teste" ]; then
  echo "Enviando alerta de teste..."
  if notify "TESTE do CRM da Clinica Canever - $(date '+%d/%m %H:%M'). Se voce recebeu isto, o alerta de queda do WhatsApp esta funcionando."; then
    echo "OK: alerta entregue. Confira se a mensagem chegou."
    log "TESTE: alerta enviado com sucesso."
    exit 0
  fi
  echo "FALHOU: nenhum canal entregou. Veja o motivo em $LOG"
  tail -3 "$LOG"
  exit 1
fi

if [ -z "$EVO_URL" ] || [ -z "$EVO_KEY" ] || [ -z "$EVO_INSTANCE" ]; then
  log "ERRO: EVOLUTION_* nao encontrado em $CRM_ENV."
  exit 1
fi

# consulta o estado da instância
consultar_estado() {
  local resp
  resp="$(curl -sS -m 20 "${EVO_URL}/instance/connectionState/${EVO_INSTANCE}" \
    -H "apikey: ${EVO_KEY}" 2>/dev/null || true)"
  if [ -z "$resp" ]; then
    echo "api_inacessivel"
    return
  fi
  local st
  st="$(echo "$resp" | grep -o '"state"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')"
  [ -z "$st" ] && st="resposta_inesperada"
  echo "$st"
}

STATE="$(consultar_estado)"

# Tenta religar sozinho antes de incomodar alguem. So faz sentido quando a API
# do Evolution responde: se ela esta inacessivel, reiniciar a instancia nao e o
# problema. Uma tentativa por execucao — o cron roda a cada 15 min, entao
# insistir aqui so atrasaria o alerta de verdade.
if [ "$STATE" != "open" ] && [ "$STATE" != "api_inacessivel" ]; then
  log "Queda detectada (estado '$STATE'). Tentando restart automatico..."
  curl -sS -m 20 -X POST "${EVO_URL}/instance/restart/${EVO_INSTANCE}" \
    -H "apikey: ${EVO_KEY}" -o /dev/null 2>/dev/null || true
  sleep 30
  NOVO_ESTADO="$(consultar_estado)"
  if [ "$NOVO_ESTADO" = "open" ]; then
    log "RECUPERADO SOZINHO: restart resolveu (nenhum alerta enviado)."
    STATE="$NOVO_ESTADO"
    RECUPERADO_AUTO=1
  else
    log "Restart nao resolveu (estado '$NOVO_ESTADO'). Segue para alerta."
    STATE="$NOVO_ESTADO"
  fi
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
  if [ "${RECUPERADO_AUTO:-0}" = "1" ]; then
    # Religou por conta propria neste mesmo ciclo: nao ha o que avisar. Avisar
    # aqui seria justamente o barulho que faz o alerta importante ser ignorado.
    :
  elif [ -n "$PREV_STATE" ] && [ "$PREV_STATE" != "open" ]; then
    if notify "✅ WhatsApp da clínica RECONECTADO. Os lembretes voltaram a ser enviados normalmente."; then
      log "RECUPEROU: estado open (anterior: $PREV_STATE). Aviso entregue."
    else
      log "RECUPEROU: estado open (anterior: $PREV_STATE). AVISO NAO ENTREGUE."
    fi
  else
    log "OK: conectado (open)."
  fi
  LAST_ALERT=0
else
  # caído: avisa se mudou de estado ou se já passou o intervalo de reaviso
  ELAPSED=$((NOW - PREV_ALERT))
  if [ "$PREV_STATE" != "$STATE" ] || [ "$ELAPSED" -ge "$REALERT_SECONDS" ]; then
    if notify "🚨 WhatsApp da clínica DESCONECTADO (estado: ${STATE}).

A tentativa automática de religar JÁ FOI FEITA e não resolveu — provavelmente a sessão precisa de novo pareamento.

Os lembretes automáticos (consultas e implantes) NÃO estão sendo enviados.

Para religar: abra https://evo.clinicacanever.com.br/manager e leia o QR code novamente com o celular da clínica."; then
      log "ALERTA: estado '$STATE'. Aviso entregue."
    else
      log "ALERTA: estado '$STATE'. AVISO NAO ENTREGUE — ninguem foi notificado."
    fi
    LAST_ALERT="$NOW"
  else
    log "AINDA CAIDO: estado '$STATE' (reaviso em $(((REALERT_SECONDS - ELAPSED) / 60)) min)."
  fi
fi

mkdir -p "$(dirname "$STATE_FILE")"
echo "$STATE $LAST_ALERT" > "$STATE_FILE"
