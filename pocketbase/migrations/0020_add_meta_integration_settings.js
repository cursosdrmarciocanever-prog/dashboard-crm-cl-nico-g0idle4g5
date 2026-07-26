// Adiciona ao registro de configuracoes (colecao `settings`) os campos da
// integracao com Meta Ads / Windsor.ai, para que a clinica configure a
// integracao pela tela de Configuracoes em vez de variaveis de ambiente:
//
//   windsor_api_key      chave da API do Windsor.ai
//   windsor_connector    conector (ex.: 'facebook', 'google_ads')
//   windsor_account_id   id da conta de anuncios (opcional; vazio = todas)
//   windsor_date_preset  janela de datas (ex.: 'last_30d')
//   meta_sync_requested  flag: front pede sync sob demanda; hook consome e limpa
//   meta_last_sync       data/hora da ultima sincronizacao concluida
//   meta_last_status     resumo do ultimo resultado (ex.: 'ok: 42 linhas')
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('settings')

    const addText = (name) => {
      if (!col.fields.getByName(name)) col.fields.add(new TextField({ name: name }))
    }
    addText('windsor_api_key')
    addText('windsor_connector')
    addText('windsor_account_id')
    addText('windsor_date_preset')
    addText('meta_last_status')

    if (!col.fields.getByName('meta_sync_requested')) {
      col.fields.add(new BoolField({ name: 'meta_sync_requested' }))
    }
    if (!col.fields.getByName('meta_last_sync')) {
      col.fields.add(new DateField({ name: 'meta_last_sync' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('settings')
    for (const name of [
      'windsor_api_key',
      'windsor_connector',
      'windsor_account_id',
      'windsor_date_preset',
      'meta_last_status',
      'meta_sync_requested',
      'meta_last_sync',
    ]) {
      if (col.fields.getByName(name)) col.fields.removeByName(name)
    }
    app.save(col)
  },
)
