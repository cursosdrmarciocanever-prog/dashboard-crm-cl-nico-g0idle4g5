// Cria a colecao `ad_insights`: metricas diarias de campanhas de trafego pago
// (Meta Ads etc.). Uma linha por conta/plataforma/campanha/dia. Populada pelo
// hook `meta_sync.js` (cron diario) a partir da Meta Marketing API ou de um
// conector como o Windsor.ai. A tela de Performance le esta colecao e cruza
// `campaign` com o campo `campaign_name` dos pacientes para calcular CPL e
// conversao lead -> consulta.
//
// A chave unica (platform + account_id + campaign + date) permite o hook fazer
// upsert idempotente: reprocessar o mesmo dia atualiza a linha em vez de duplicar.
migrate(
  (app) => {
    const insights = new Collection({
      name: 'ad_insights',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      // Escrita apenas por admin/superuser ou pelo hook server-side (regras null).
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'platform', type: 'text', required: true },
        { name: 'account_id', type: 'text', required: true },
        { name: 'campaign', type: 'text', required: true },
        { name: 'ad_set', type: 'text', required: false },
        { name: 'ad_name', type: 'text', required: false },
        { name: 'date', type: 'date', required: true },
        { name: 'spend', type: 'number', required: false },
        { name: 'impressions', type: 'number', required: false },
        { name: 'clicks', type: 'number', required: false },
        { name: 'reach', type: 'number', required: false },
        { name: 'cpc', type: 'number', required: false },
        { name: 'cpm', type: 'number', required: false },
        { name: 'ctr', type: 'number', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_ad_insights_unique ON ad_insights (platform, account_id, campaign, date)',
        'CREATE INDEX idx_ad_insights_date ON ad_insights (date)',
        'CREATE INDEX idx_ad_insights_campaign ON ad_insights (campaign)',
      ],
    })
    app.save(insights)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('ad_insights')
    app.delete(col)
  },
)
