#!/usr/bin/env bash
# Atalho para atualizar o CRM na VPS: puxa o código, rebuilda e sobe.
# Uso:  cd /docker/apps/crm && ./atualizar.sh
set -e

REPO_DIR="/docker/apps/crm"
cd "$REPO_DIR"

echo "==> [1/3] Puxando o código mais recente..."
git pull

echo "==> [2/3] Rebuild e subida dos containers..."
cd "$REPO_DIR/deploy"
docker compose --env-file .env up -d --build

echo "==> [3/3] Últimas linhas do PocketBase:"
docker compose logs pocketbase | tail -8

echo ""
echo "==> Pronto! Recarregue o CRM no navegador com Cmd + Shift + R."
