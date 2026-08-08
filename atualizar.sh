#!/usr/bin/env bash
# Atalho para atualizar o CRM na VPS: puxa o código, rebuilda, sobe e CONFERE.
# Uso:  cd /docker/apps/crm && ./atualizar.sh
#
# A conferência existe porque uma migration com erro derruba o PocketBase, e a
# versão antiga deste script imprimia "Pronto!" mesmo assim — a mensagem de
# sucesso saía junto com a de falha. Agora o script só diz que deu certo depois
# de a API responder, e falha em vermelho quando não responde.
set -e

REPO_DIR="/docker/apps/crm"
DEPLOY_DIR="$REPO_DIR/deploy"
TENTATIVAS=30   # 30 x 2s = até 60s esperando a API subir

VERMELHO=$'\033[1;31m'
VERDE=$'\033[1;32m'
AMARELO=$'\033[1;33m'
FIM=$'\033[0m'

cd "$REPO_DIR"

echo "==> [1/4] Puxando o código mais recente..."
git pull

echo "==> [2/4] Rebuild e subida dos containers..."
cd "$DEPLOY_DIR"
docker compose --env-file .env up -d --build

echo "==> [3/4] Aguardando a API do PocketBase responder..."
# A partir daqui os erros são tratados na mão: o objetivo é diagnosticar, não abortar.
set +e

ok=0
for i in $(seq 1 "$TENTATIVAS"); do
  codigo=$(docker compose exec -T pocketbase \
    wget -q -T 3 -O /dev/null -S http://127.0.0.1:8090/api/health 2>&1 </dev/null \
    | grep -o 'HTTP/1.1 [0-9]*' | head -1 | awk '{print $2}')
  if [ "$codigo" = "200" ]; then
    ok=1
    break
  fi
  sleep 2
done

if [ "$ok" != "1" ]; then
  echo ""
  echo "${VERMELHO}==> FALHOU: o PocketBase não subiu.${FIM}"
  echo "${VERMELHO}    O site abre, mas nada carrega — a API está fora.${FIM}"
  echo ""
  echo "${AMARELO}Estado dos containers:${FIM}"
  docker compose ps --format 'table {{.Name}}\t{{.Status}}'
  echo ""
  echo "${AMARELO}Motivo provável (últimas linhas do log):${FIM}"
  docker compose logs pocketbase --tail 20 | grep -iE 'error|panic|failed|migration' | tail -10
  echo ""
  echo "${AMARELO}Log completo:${FIM} docker compose -f $DEPLOY_DIR/docker-compose.yml logs pocketbase --tail 60"
  echo "${AMARELO}Erro em migration?${FIM} corrija o arquivo, faça push e rode este script de novo."
  exit 1
fi

echo "==> [4/4] Conferindo os containers..."
reiniciando=$(docker compose ps --format '{{.Name}} {{.Status}}' | grep -ci 'restarting')
docker compose ps --format 'table {{.Name}}\t{{.Status}}'

if [ "$reiniciando" -gt 0 ]; then
  echo ""
  echo "${VERMELHO}==> ATENÇÃO: algum container está reiniciando em ciclo.${FIM}"
  echo "${AMARELO}    Veja: docker compose -f $DEPLOY_DIR/docker-compose.yml logs --tail 40${FIM}"
  exit 1
fi

echo ""
echo "${VERDE}==> Pronto! API respondendo e containers estáveis.${FIM}"
echo "    Recarregue o CRM no navegador com Cmd + Shift + R."
