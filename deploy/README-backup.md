# Backup automático do CRM

São dados de saúde — este é o item mais importante da operação.

## Como funciona (2 camadas)

1. **PocketBase (dentro do container)** — migration `0026` liga o backup nativo:
   todo dia às **03:00 (Brasília)** ele gera um `.zip` com **todo o `pb_data`**
   (banco + arquivos enviados, como a logo), mantendo os **7 últimos**.
2. **Cópia no host (fora do container)** — `deploy/backup-offsite.sh` copia o zip
   mais recente para `/docker/backups/crm`, mantendo **30 dias**. Isso protege
   contra a perda do volume do Docker.

Log de tudo: `/var/log/crm-backup.log`

---

## Instalação (uma vez, na VPS)

**1. Aplicar a migration e o script** (o `atualizar.sh` já faz o rebuild):

```bash
cd /docker/apps/crm && ./atualizar.sh
```

**2. Agendar a cópia diária** às 03:30 (meia hora depois do backup interno):

```bash
chmod +x /docker/apps/crm/deploy/backup-offsite.sh
echo "30 6 * * * root /docker/apps/crm/deploy/backup-offsite.sh >/dev/null 2>&1" > /etc/cron.d/crm-backup
chmod 644 /etc/cron.d/crm-backup
```

> O cron do sistema roda em **UTC**: `30 6` = 03:30 de Brasília.

**3. Testar agora** (sem esperar o horário):

```bash
/docker/apps/crm/deploy/backup-offsite.sh
```

Na primeira vez pode avisar que ainda não há backup (o PocketBase só gera no
horário agendado). Para gerar um **na hora**, use o admin:
`https://crm.clinicacanever.com.br/_/` → **Settings** → **Backups** →
**Initiate new backup**. Depois rode o script de novo.

---

## Conferir se está funcionando

```bash
ls -lh /docker/backups/crm        # os zips copiados
tail -20 /var/log/crm-backup.log  # histórico das cópias
```

No admin (**Settings → Backups**) você vê a lista dos backups internos e pode
**baixar** qualquer um para o seu computador.

> 💡 Recomendação: uma vez por mês, **baixe um backup** pelo admin e guarde no
> seu computador ou Google Drive. Assim existe uma cópia fora da VPS.

---

## Como RESTAURAR

Um backup só vale se você souber restaurar. São 2 cenários:

**A) O backup está na lista do admin** (caso normal)
1. `https://crm.clinicacanever.com.br/_/` → **Settings** → **Backups**
2. No backup desejado, clique nos três pontinhos → **Restore**
3. Confirme. O PocketBase substitui o `pb_data` e reinicia.

**B) Só existe a cópia no host** (perdeu o volume)
Devolva o zip para dentro do container e restaure pelo admin:

```bash
cd /docker/apps/crm/deploy
docker compose cp /docker/backups/crm/NOME_DO_BACKUP.zip pocketbase:/pb/pb_data/backups/
```
Depois siga o cenário **A** (o arquivo aparece na lista).

---

## Observações

- **WhatsApp:** a sessão do Evolution fica em outro volume e **não** entra neste
  backup. Se for perdida, é só reconectar lendo o QR code de novo (os dados do
  CRM não dependem dela).
- **Espaço:** cada zip tende a ser pequeno (poucos MB). Com 30 dias no host o uso
  é baixo; o `df -h` da VPS mostra o consumo atual.
