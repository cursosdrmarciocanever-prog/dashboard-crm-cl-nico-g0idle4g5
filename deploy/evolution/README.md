# Etapa 2A — Subir o Evolution API e conectar o WhatsApp

Gateway de WhatsApp self-hosted (Evolution API v2.3.7) + PostgreSQL + Redis,
atrás do Traefik em `https://evo.clinicacanever.com.br`.

Pré-requisito: um **número de WhatsApp dedicado** (chip novo/secundário) num
celular à mão para escanear o QR code.

---

## Passo 1 — DNS

Crie mais um registro A no painel de `clinicacanever.com.br`:

| Tipo | Nome | Valor          |
|------|------|----------------|
| A    | evo  | `2.24.107.183` |

Confirme: `dig +short evo.clinicacanever.com.br` deve retornar o IP.

## Passo 2 — Puxar os arquivos na VPS

```bash
cd /docker/apps/crm && git pull && cd deploy/evolution
```

## Passo 3 — Configurar o `.env` com segredos fortes

```bash
cp .env.example .env
# Gera e injeta uma API key e uma senha de banco fortes automaticamente:
sed -i "s/^AUTHENTICATION_API_KEY=.*/AUTHENTICATION_API_KEY=$(openssl rand -hex 24)/" .env
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/" .env
```

Guarde a API key num lugar seguro (você vai precisar dela depois):

```bash
grep AUTHENTICATION_API_KEY .env
```

## Passo 4 — Subir

```bash
docker compose --env-file .env up -d
docker compose logs -f evolution-api
```

Aguarde aparecer que a API subiu (porta 8080). `Ctrl+C` para sair do log.

## Passo 5 — Validar de fora

```bash
curl -s https://evo.clinicacanever.com.br | head -c 200
```

Deve responder (JSON com "message"/"version"). Cert válido = Traefik ok.

## Passo 6 — Conectar o WhatsApp (QR)

Abra o **manager** embutido no navegador:

```
https://evo.clinicacanever.com.br/manager
```

1. Cole a **API key** (a do `.env`) para logar.
2. **Create instance** → nome `clinica` (guarde esse nome).
3. Vai aparecer um **QR code**.
4. No celular do número dedicado: WhatsApp → **Aparelhos conectados** →
   **Conectar um aparelho** → escaneie o QR.
5. Status deve virar **open / connected**.

> Se `/manager` não abrir, me avise que eu te passo o jeito por comando (a API
> tem endpoint de create/connect que retorna o QR).

---

Quando o status estiver **connected**, me diga:
- O **nome da instância** que você criou (ex.: `clinica`)
- Que está conectado

Aí eu ligo a **captura de leads (2B)** e o **disparo das agendadas (2C)**.

## Manutenção

- Logs: `docker compose logs -f evolution-api`
- Reiniciar: `docker compose restart evolution-api`
- Atualizar versão: troque a tag em `docker-compose.yml` e `up -d`.
