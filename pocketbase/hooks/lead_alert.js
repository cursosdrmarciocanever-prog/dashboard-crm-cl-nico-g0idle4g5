// Aviso no WhatsApp toda vez que entra um lead novo.
//
// Fica no create de `patients` — e nao dentro do webhook do WhatsApp — porque
// lead entra por varios caminhos (webhook, botao de lead, cadastro manual). Um
// lugar so cobre todos, do mesmo jeito que o patient_phone_key.js faz com a
// checagem de telefone duplicado.
//
// Destino: campo `alert_whatsapp` em settings/clinic (tela de Configuracoes).
// Vazio = nao avisa nada. Sai pela mesma instancia do Evolution que ja atende
// a clinica, entao nao precisa de nenhuma credencial nova.
//
// DOIS FREIOS, porque este hook manda mensagem de verdade:
//  1. importado nao avisa — a importacao dos leads antigos dispararia milhares.
//  2. rajada nao avisa — se nasceram mais de 10 pacientes nos ultimos 2
//     minutos, e importacao ou script, nao gente chegando. Registra no log.
//
// OBS JSVM: handler roda isolado — a logica fica toda inline.

onRecordAfterCreateSuccess((e) => {
  const rec = e.record

  try {
    // 1) Importados nao contam como "chegou lead".
    if (rec.getBool('imported')) return e.next()

    // 2) Destino configurado?
    let destino = ''
    try {
      const cfg = $app.findFirstRecordByFilter('settings', "key = 'clinic'")
      destino = cfg ? cfg.getString('alert_whatsapp') : ''
    } catch (err) {
      return e.next() // sem colecao settings ainda: silencio
    }
    if (!destino) return e.next()

    const evoUrl = $os.getenv('EVOLUTION_URL')
    const evoKey = $os.getenv('EVOLUTION_API_KEY')
    const instance = $os.getenv('EVOLUTION_INSTANCE')
    if (!evoUrl || !evoKey || !instance) return e.next()

    // 3) Freio de rajada: conta quem nasceu nos ultimos 2 minutos.
    const doisMinAtras = new Date(Date.now() - 2 * 60000)
      .toISOString()
      .replace('T', ' ')
    try {
      const recentes = $app.findRecordsByFilter(
        'patients',
        'created > {:desde}',
        '',
        20,
        0,
        { desde: doisMinAtras },
      )
      if (recentes.length > 10) {
        $app
          .logger()
          .warn(
            '[lead_alert] rajada detectada, aviso suprimido',
            'novos_em_2min',
            recentes.length,
          )
        return e.next()
      }
    } catch (err) {
      // Se a contagem falhar, segue e avisa — perder um aviso e pior que um a mais.
    }

    const normalizar = (raw) => {
      let d = ('' + (raw || '')).replace(/\D/g, '')
      if (!d) return ''
      if (d.length <= 11) d = '55' + d
      return d
    }

    const nome = rec.getString('name') || 'sem nome'
    const telefone = rec.getString('phone') || 'sem telefone'
    const origem = rec.getString('traffic_platform') || 'não informada'
    const campanha = rec.getString('campaign_name')

    let texto =
      '🔔 *Lead novo no CRM*\n\n' +
      '*Nome:* ' + nome + '\n' +
      '*Telefone:* ' + telefone + '\n' +
      '*Origem:* ' + origem
    if (campanha) texto += '\n*Campanha:* ' + campanha
    texto += '\n\nAbrir: https://crm.clinicacanever.com.br/pacientes/' + rec.id

    const res = $http.send({
      url: evoUrl + '/message/sendText/' + instance,
      method: 'POST',
      headers: { apikey: evoKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: normalizar(destino), text: texto }),
      timeout: 20,
    })

    if (res.statusCode < 200 || res.statusCode >= 300) {
      $app
        .logger()
        .error('[lead_alert] envio falhou', 'http', res.statusCode, 'patient', rec.id)
    } else {
      $app.logger().info('[lead_alert] avisado', 'patient', rec.id, 'nome', nome)
    }
  } catch (err) {
    // Avisar e secundario: um erro aqui nunca pode impedir o lead de ser criado.
    $app.logger().error('[lead_alert] erro', 'error', String(err.message).substring(0, 200))
  }

  return e.next()
}, 'patients')
