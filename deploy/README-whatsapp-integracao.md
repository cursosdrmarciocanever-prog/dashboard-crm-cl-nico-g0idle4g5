# Etapas 2B + 2C — Ligar a integração WhatsApp ao CRM

Pré-requisito: Etapa 2A concluída (Evolution no ar, instância `clinica` conectada).

O que estas etapas fazem:
- **2B (captura de leads):** toda mensagem que chega no WhatsApp cria/atualiza um
  lead no CRM automaticamente (hook `wa_inbound`).
- **2C (disparo):** as mensagens agendadas vencidas são enviadas de minuto em
  minuto pelo WhatsApp (cron `wa_dispatcher`), com throttle de 10/min.

---

## Passo 1 — Preencher o `.env` do CRM com os segredos

Na VPS:

```bash
cd /docker/apps/crm/deploy
```

Pegue a API key do Evolution (mesma do gateway):

```bash
grep AUTHENTICATION_API_KEY evolution/.env
```

Edite o `.env` do CRM:

```bash
nano .env
```

Adicione/ajuste no final (troque a API key pela do comando acima):

```
EVOLUTION_URL=https://evo.clinicacanever.com.br
EVOLUTION_API_KEY=<a API key do evolution/.env>
EVOLUTION_INSTANCE=clinica
WA_WEBHOOK_TOKEN=<gere abaixo>
```

Gere um token de webhook forte e cole em `WA_WEBHOOK_TOKEN`:

```bash
openssl rand -hex 16
```

## Passo 2 — Rebuild do CRM (aplica migration 0015 + hooks)

```bash
cd /docker/apps/crm && git pull && cd deploy && docker compose --env-file .env up -d --build
```

Confira que subiu e as migrations aplicaram:

```bash
docker compose logs pocketbase | tail -20
```

## Passo 3 — Apontar o webhook do Evolution para o CRM

Isto faz o Evolution avisar o CRM a cada mensagem recebida. Rode (troque
`SEU_TOKEN` pelo mesmo `WA_WEBHOOK_TOKEN` do `.env`, e `SUA_API_KEY` pela do
Evolution):

```bash
curl -X POST "https://evo.clinicacanever.com.br/webhook/set/clinica" \
  -H "apikey: SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"webhook":{"enabled":true,"url":"https://crm.clinicacanever.com.br/api/wa-inbound?token=SEU_TOKEN","byEvents":false,"base64":false,"events":["MESSAGES_UPSERT"]}}'
```

## Passo 4 — Testar

**Captura de lead (2B):** de OUTRO celular, mande uma mensagem para o número da
clínica. Em segundos, um novo card deve aparecer em **Pacientes / Jornada** do
CRM com estágio `novo_lead` e origem `whatsapp`.

**Disparo (2C):** no CRM, crie uma **Mensagem Agendada** para um paciente com
horário de ~1 min atrás (ou agora). Em até 1 minuto o status deve virar `sent`
e a mensagem chegar no WhatsApp do paciente.

---

## Troubleshooting

- **Lead não aparece:** confira o webhook (`GET /webhook/find/clinica` com a
  apikey) e os logs: `docker compose logs pocketbase | grep wa_inbound`.
- **Agendada não envia:** `docker compose logs pocketbase | grep wa_dispatcher`.
  Verifique EVOLUTION_* no `.env` e se a instância está `open`.
- **Ver estado da instância:**
  `curl https://evo.clinicacanever.com.br/instance/connectionState/clinica -H "apikey: SUA_API_KEY"`
