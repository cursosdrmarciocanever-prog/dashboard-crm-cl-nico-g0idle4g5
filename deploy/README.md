# Deploy do CRM Clínico na VPS (Fase 1)

Migra o backend PocketBase do goskip para a sua VPS Hostinger, self-hosted com
Docker atrás do Traefik, em **origem única** (`crm.clinicacanever.com.br`).

- VPS: `ssh root@2.24.107.183` (host `srv1681540.hstgr.cloud`)
- Traefik já é dono do 80/443, rede externa `n8n_default`, certs Let's Encrypt.
- Como os dados atuais são **demo/seed**, nada precisa ser exportado: as migrations
  recriam o schema + os mesmos seeds numa base limpa.

---

## Passo 1 — DNS (só 1 registro)

No painel DNS de `clinicacanever.com.br`, crie:

| Tipo | Nome | Valor          |
|------|------|----------------|
| A    | crm  | `2.24.107.183` |

Confirme a propagação (aguarde alguns minutos):

```bash
dig +short crm.clinicacanever.com.br
```

Deve retornar `2.24.107.183`.

## Passo 2 — Descobrir a versão do PocketBase do goskip

Abra `https://dashboard-crm-clinico-66ecd.shrd00.internal.goskip.dev/_/` e veja a
versão no **rodapé** da tela de login do admin (ex.: `v0.36.9`). Anote — vai no
`PB_VERSION` do `.env`. Se a versão não bater, as migrations podem falhar.

## Passo 3 — Clonar o repo na VPS

O repo é privado; use o token que já está em `/opt/data/.env` (`GITHUB_TOKEN`).

```bash
mkdir -p /docker/apps && cd /docker/apps
source /opt/data/.env
git clone https://${GITHUB_TOKEN}@github.com/cursosdrmarciocanever-prog/dashboard-crm-cl-nico-g0idle4g5.git crm
cd crm/deploy
```

## Passo 4 — Configurar o `.env`

```bash
cp .env.example .env
nano .env
```

Ajuste:
- `PB_VERSION` = a versão do Passo 2.
- `CERT_RESOLVER` = o nome do certresolver do seu Traefik. Descubra copiando do
  app que já funciona:
  ```bash
  grep -i certresolver /docker/apps/financeiro/docker-compose.yml
  ```
  Use o mesmo nome aqui.

## Passo 5 — Build e subir

```bash
cd /docker/apps/crm/deploy
docker compose --env-file .env up -d --build
```

Acompanhe o boot do PocketBase (as migrations rodam aqui):

```bash
docker compose logs -f pocketbase
```

Você deve ver as migrations `0001..0014` aplicando. `Ctrl+C` para sair do log.

## Passo 6 — Criar o superusuário (admin do PocketBase)

```bash
docker compose exec pocketbase /pb/pocketbase superuser upsert SEU_EMAIL SUA_SENHA_FORTE
```

Depois acesse `https://crm.clinicacanever.com.br/_/` e faça login.

## Passo 7 — Criar o usuário médico (login do CRM)

No admin (`/_/`) → coleção **users** → **New record** → informe e-mail e senha.
Esse é o login que você usará no CRM em `https://crm.clinicacanever.com.br`.

> A tela de login do app usa a coleção `users`. O superusuário do Passo 6 é só
> para administrar o banco (`/_/`), não para logar no CRM.

## Passo 8 — Definir a Application URL

No admin → **Settings** → **Application** → **Application URL** =
`https://crm.clinicacanever.com.br` (usado em links de e-mail, reset de senha etc).

## Passo 9 — Validar

1. `https://crm.clinicacanever.com.br` abre com **cadeado válido** (sem aviso).
2. Login com o usuário do Passo 7 entra no dashboard.
3. **Configurações** mostra o card "Configurações da Clínica" editável (prova de
   que a migration `0014` aplicou) — salve um número de WhatsApp de teste.
4. As telas atualizam sozinhas (realtime via SSE pelo proxy do nginx).

---

## Atualizações futuras

```bash
cd /docker/apps/crm && git pull && cd deploy && docker compose --env-file .env up -d --build
```

Os dados em `pb_data` (volume) são preservados entre rebuilds.

## Notas / troubleshooting

- **Migrations não aplicam / erro de schema:** quase sempre é `PB_VERSION` diferente
  da do goskip. Ajuste e rebuild.
- **Realtime não atualiza:** confirme que o bloco `location ~ ^/(api|_)/` do
  `nginx.conf` está com `proxy_buffering off`.
- **Cert com aviso:** `CERT_RESOLVER` errado, ou DNS ainda não propagou quando o
  Traefik tentou emitir. Corrija e rode `docker compose up -d` de novo.
- **Backup dos dados:** `docker compose cp pocketbase:/pb/pb_data ./pb_data_backup`.
