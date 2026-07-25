// Sincroniza metricas de campanhas de trafego pago para a colecao `ad_insights`.
// Roda 1x/dia e faz upsert idempotente (uma linha por conta/campanha/dia).
//
// Fonte: Windsor.ai (normaliza Meta Ads, Google Ads, etc.). Mesmo caminho usado
// no prototipo. Para trocar pela Meta Marketing API direta, basta reescrever a
// montagem da URL e o parsing da resposta abaixo — o upsert continua igual.
//
// Config por variaveis de ambiente (passadas ao container do PocketBase):
//   WINDSOR_API_KEY   (obrigatorio — enquanto ausente o hook fica inativo)
//   WINDSOR_CONNECTOR (opcional, default 'facebook')
//   WINDSOR_DATE_PRESET (opcional, default 'last_30d')
//   WINDSOR_URL       (opcional, default 'https://connectors.windsor.ai')

cronAdd('meta_sync', '17 3 * * *', () => {
  const apiKey = $os.getenv('WINDSOR_API_KEY')
  if (!apiKey) {
    return // integracao ainda nao configurada
  }
  const connector = $os.getenv('WINDSOR_CONNECTOR') || 'facebook'
  const datePreset = $os.getenv('WINDSOR_DATE_PRESET') || 'last_30d'
  const baseUrl = $os.getenv('WINDSOR_URL') || 'https://connectors.windsor.ai'

  // Helpers inline (o handler nao acessa funcoes do escopo do arquivo no JSVM).
  const toNum = (v) => {
    const n = parseFloat(v)
    return isNaN(n) ? 0 : n
  }
  // Normaliza a data (ex.: "2026-07-16") para o formato datetime do PocketBase.
  const toDate = (v) => {
    if (!v) return ''
    const d = ('' + v).substring(0, 10)
    return d + ' 00:00:00.000Z'
  }

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

  const url =
    baseUrl +
    '/' +
    connector +
    '?api_key=' +
    encodeURIComponent(apiKey) +
    '&date_preset=' +
    encodeURIComponent(datePreset) +
    '&fields=' +
    encodeURIComponent(fields)

  let rows = []
  try {
    const res = $http.send({ url: url, method: 'GET', timeout: 60 })
    if (res.statusCode < 200 || res.statusCode >= 300) {
      $app.logger().error('[meta_sync] HTTP ' + res.statusCode)
      return
    }
    const parsed = JSON.parse(res.raw)
    rows = parsed.data || parsed.result || []
  } catch (err) {
    $app.logger().error('[meta_sync] busca falhou', 'error', err.message)
    return
  }

  let saved = 0
  for (const row of rows) {
    try {
      const platform = connector
      const accountId = '' + (row.account_id || '')
      const campaign = '' + (row.campaign || '')
      const date = toDate(row.date)
      if (!accountId || !campaign || !date) continue

      // Upsert: procura a linha do dia; atualiza se existe, senao cria.
      let rec
      try {
        rec = $app.findFirstRecordByFilter(
          'ad_insights',
          'platform = {:p} && account_id = {:a} && campaign = {:c} && date = {:d}',
          { p: platform, a: accountId, c: campaign, d: date },
        )
      } catch (e) {
        rec = null // nao encontrado
      }
      if (!rec) {
        const col = $app.findCollectionByNameOrId('ad_insights')
        rec = new Record(col)
        rec.set('platform', platform)
        rec.set('account_id', accountId)
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

  $app.logger().info('[meta_sync] concluido', 'linhas', saved)
})
