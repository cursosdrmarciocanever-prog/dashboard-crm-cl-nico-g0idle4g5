# Alerta de WhatsApp caído

A sessão do WhatsApp (Evolution API) pode cair **silenciosamente** — e, se cair,
os lembretes de consulta e de implante param de ser enviados sem ninguém notar.

O `deploy/whatsapp-watchdog.sh` checa a conexão a cada 15 minutos e avisa no
**Telegram** (canal independente: se o WhatsApp caiu, não daria para avisar por
WhatsApp).

O que ele envia:
- 🚨 **quando cai** — com o estado e o passo para religar (ler o QR de novo)
- ✅ **quando reconecta**
- Enquanto continuar caído, **reavisa a cada 6h** (não gera spam)

Log: `/var/log/crm-whatsapp-watchdog.log`

---

## Instalação (uma vez, na VPS)

```bash
cd /docker/apps/crm && ./atualizar.sh
```

**Testar agora** (o WhatsApp está conectado, então só deve registrar OK no log):

```bash
chmod +x /docker/apps/crm/deploy/whatsapp-watchdog.sh
/docker/apps/crm/deploy/whatsapp-watchdog.sh
cat /var/log/crm-whatsapp-watchdog.log
```

Esperado: `OK: conectado (open).`

**Agendar a cada 15 minutos:**

```bash
echo "*/15 * * * * root /docker/apps/crm/deploy/whatsapp-watchdog.sh >/dev/null 2>&1" > /etc/cron.d/crm-whatsapp-watchdog
chmod 644 /etc/cron.d/crm-whatsapp-watchdog
```

---

## Telegram

Por padrão o script **reaproveita o bot do Hermes** (lê o token de
`/docker/hermes-agent-vxrg/data/.env`) e envia para o chat `5691849297`.

Para usar outro bot/chat, preencha no `deploy/.env`:

```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
```

---

## Testar o alerta de verdade (opcional)

Se quiser ver a mensagem chegando no Telegram, simule uma queda desconectando a
instância e rodando o script:

```bash
cd /docker/apps/crm/deploy
API_KEY="$(grep -m1 '^EVOLUTION_API_KEY=' .env | cut -d= -f2-)"

# desconecta (o WhatsApp da clínica sai do ar!)
curl -X DELETE "https://evo.clinicacanever.com.br/instance/logout/clinica" -H "apikey: $API_KEY"

/docker/apps/crm/deploy/whatsapp-watchdog.sh   # deve chegar o alerta no Telegram
```

Depois **religue** lendo o QR em `https://evo.clinicacanever.com.br/manager` e
rode o script mais uma vez — deve chegar a mensagem de reconectado.

> ⚠️ Só faça esse teste se puder ficar alguns minutos sem o WhatsApp automático.
> Se preferir não arriscar, o teste simples (`OK: conectado`) já confirma que o
> script funciona; o caminho do alerta é o mesmo código.
