// Ativa o backup automático nativo do PocketBase.
// Gera um .zip consistente de TODO o pb_data (banco + arquivos enviados, ex.: logo)
// dentro de pb_data/backups. O script deploy/backup-offsite.sh copia esses zips
// para fora do container (disco do host).
//
// Horário: 06:00 UTC = 03:00 de Brasília (servidor roda em UTC).
migrate(
  (app) => {
    const settings = app.settings()
    settings.backups.cron = '0 6 * * *'
    settings.backups.cronMaxKeep = 7 // mantém os 7 últimos dentro do container
    app.save(settings)
  },
  (app) => {
    const settings = app.settings()
    settings.backups.cron = ''
    app.save(settings)
  },
)
