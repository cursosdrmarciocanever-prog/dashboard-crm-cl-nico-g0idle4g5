// Sincroniza metricas de campanhas de trafego pago para a colecao `ad_insights`.
// Roda a cada 5 min e sincroniza quando:
//   - o front pediu sync sob demanda (settings.meta_sync_requested = true), ou
//   - passaram >20h desde a ultima sincronizacao (ciclo diario automatico).
// Faz upsert idempotente (uma linha por conta/campanha/dia).
//
// Config: lida da colecao `settings` (editavel pela tela de Configuracoes) com
// fallback para variaveis de ambiente. Enquanto nao houver chave, fica inativo.
//   settings.windsor_api_key      | env WINDSOR_API_KEY   (obrigatorio)
//   settings.windsor_connector    | env WINDSOR_CONNECTOR (default 'facebook')
//   settings.windsor_date_preset  | env WINDSOR_DATE_PRESET (default 'last_30d')
//   settings.windsor_account_id   (opcional; vazio = todas as contas)
//   env WINDSOR_URL               (default 'https://connectors.windsor.ai')
//
// Fonte: Windsor.ai (normaliza Meta Ads, Google Ads, etc.). Para trocar pela
// Meta Marketing API direta, reescreva a montagem da URL e o parsing abaixo.

cronAdd('meta_sync', '*/5 * * * *', () => {
  // Helpers locais ao handler (o JSVM nao acessa funcoes do escopo do arquivo).
  const toNum = (v) => {
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }
  const toDate = (v) => {
    if (!v) return ''
    return ('' + v).substring(0, 10) + ' 00:00:00.000Z'
  }

  // 1. Carrega o registro de configuracoes (pode nao existir ainda).
  let settingsRec = null
  try {
    settingsRec = $app.findFirstRecordByFilter('settings', "key = 'clinic'")
  } catch (e) {
    settingsRec = null
  }
  const getS = (name) => (settingsRec ? settingsRec.getString(name) : '')

  // 2. Resolve a configuracao efetiva (settings tem prioridade sobre env).
  const apiKey = getS('windsor_api_key') || $os.getenv('WINDSOR_API_KEY')
  if (!apiKey) {
    return // integracao ainda nao configurada
  }
  const connector = getS('windsor_connector') || $os.getenv('WINDSOR_CONNECTOR') || 'facebook'
  const datePreset = getS('windsor_date_preset') || $os.getenv('WINDSOR_DATE_PRESET') || 'last_30d'
  const accountId = getS('windsor_account_id')
  const baseUrl = $os.getenv('WINDSOR_URL') || 'https://connectors.windsor.ai'

  // 3. Decide se deve sincronizar agora: pedido sob demanda ou ciclo diario.
  const requested = settingsRec ? settingsRec.getBool('meta_sync_requested') : false
  const lastStr = getS('meta_last_sync')
  let lastMs = lastStr ? new Date(('' + lastStr).replace(' ', 'T')).getTime() : 0
  if (isNaN(lastMs)) lastMs = 0
  const now = new Date()
  const dueDaily = now.getTime() - lastMs > 20 * 3600 * 1000
  if (!requested && !dueDaily) {
    return
  }

  // 4. Busca os dados no Windsor.ai.
  const fields = [
    'account_id',
    'account_name',
    'campaign',
    'date',
    'spend',
    'impressions',
    'clicks',
    'reach',
    'cpc',
    'cpm',
    'ctr',
  ].join(',')
  let url =
    baseUrl +
    '/' +
    connector +
    '?api_key=' +
    encodeURIComponent(apiKey) +
    '&date_preset=' +
    encodeURIComponent(datePreset) +
    '&fields=' +
    encodeURIComponent(fields)
  if (accountId) {
    url += '&accounts=' + encodeURIComponent(accountId)
  }

  let statusMsg = ''
  let rows = []
  try {
    const res = $http.send({ url: url, method: 'GET', timeout: 60 })
    if (res.statusCode < 200 || res.statusCode >= 300) {
      statusMsg = 'erro: HTTP ' + res.statusCode
    } else {
      const parsed = JSON.parse(res.raw)
      rows = parsed.data || parsed.result || []
    }
  } catch (err) {
    statusMsg = 'erro: ' + String(err.message).substring(0, 120)
  }

  // 5. Upsert das linhas.
  let saved = 0
  if (!statusMsg) {
    for (const row of rows) {
      try {
        const platform = connector
        const accId = '' + (row.account_id || accountId || '')
        const campaign = '' + (row.campaign || '')
        const date = toDate(row.date)
        if (!accId || !campaign || !date) continue

        let rec
        try {
          rec = $app.findFirstRecordByFilter(
            'ad_insights',
            'platform = {:p} && account_id = {:a} && campaign = {:c} && date = {:d}',
            { p: platform, a: accId, c: campaign, d: date },
          )
        } catch (e) {
          rec = null
        }
        if (!rec) {
          const col = $app.findCollectionByNameOrId('ad_insights')
          rec = new Record(col)
          rec.set('platform', platform)
          rec.set('account_id', accId)
          rec.set('campaign', campaign)
          rec.set('date', date)
        }
        rec.set('ad_set', '' + (row.ad_set || ''))
        rec.set('ad_name', '' + (row.ad_name || ''))
        rec.set('spend', toNum(row.spend))
        rec.set('impressions', toNum(row.impressions))
        rec.set('clicks', toNum(row.clicks))
        rec.set('reach', toNum(row.reach))
        rec.set('cpc', toNum(row.cpc))
        rec.set('cpm', toNum(row.cpm))
        rec.set('ctr', toNum(row.ctr))
        $app.save(rec)
        saved++
      } catch (err) {
        $app.logger().error('[meta_sync] linha falhou', 'error', err.message)
      }
    }
    statusMsg = 'ok: ' + saved + ' linhas'
  }

  // 6. Registra o resultado e limpa o pedido sob demanda.
  if (settingsRec) {
    try {
      settingsRec.set('meta_last_sync', now.toISOString().replace('T', ' '))
      settingsRec.set('meta_last_status', statusMsg)
      settingsRec.set('meta_sync_requested', false)
      $app.save(settingsRec)
    } catch (e) {
      $app.logger().error('[meta_sync] falha ao salvar status', 'error', e.message)
    }
  }
  $app.logger().info('[meta_sync] ' + statusMsg)
})
