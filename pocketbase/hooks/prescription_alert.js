// Aviso na hora quando entra uma solicitacao de receita.
//
// ESTE NAO OBEDECE AO INTERRUPTOR "avisar tambem na hora", de proposito. Os
// outros avisos sao informacao — lead que chegou, consulta que mudou — e podem
// esperar o resumo das 20:00. Este e um PEDIDO PARADO ESPERANDO O MEDICO: se
// esperar o fim do dia, a paciente espera junto. Segurar por 8 horas um pedido
// que so o medico destrava seria transformar o resumo em atraso.
//
// Destino: o mesmo campo alert_whatsapp em settings/clinic. Vazio = nao avisa.
//
// So a CRIACAO avisa. A decisao (aprovar/reprovar) e o proprio medico que faz —
// avisar a ele o que ele acabou de clicar nao serve para nada.
//
// OBS JSVM: handler roda isolado — toda a logica fica inline.

onRecordAfterCreateSuccess((e) => {
  const rec = e.record

  try {
    let destino = ''
    try {
      const cfg = $app.findFirstRecordByFilter('settings', "key = 'clinic'")
      destino = cfg ? cfg.getString('alert_whatsapp') : ''
    } catch (err) {
      return e.next()
    }
    if (!destino) return e.next()

    const evoUrl = $os.getenv('EVOLUTION_URL')
    const evoKey = $os.getenv('EVOLUTION_API_KEY')
    const instance = $os.getenv('EVOLUTION_INSTANCE')
    if (!evoUrl || !evoKey || !instance) return e.next()

    // Freio de rajada, igual aos outros avisos.
    const doisMinAtras = new Date(Date.now() - 2 * 60000).toISOString().replace('T', ' ')
    try {
      const recentes = $app.findRecordsByFilter(
        'prescription_requests',
        'created > {:desde}',
        '',
        20,
        0,
        { desde: doisMinAtras },
      )
      if (recentes.length > 10) {
        $app
          .logger()
          .warn('[prescription_alert] rajada detectada, aviso suprimido', 'em_2min', recentes.length)
        return e.next()
      }
    } catch (err) {
      // Contagem falhou: segue e avisa.
    }

    let paciente = 'paciente'
    try {
      const p = $app.findRecordById('patients', rec.getString('patient_id'))
      paciente = p.getString('name') || paciente
    } catch (err) {
      // segue com o generico
    }

    const pad = (n) => ('0' + n).slice(-2)
    const dataBRT = (raw) => {
      if (!raw) return '—'
      const ms = new Date(('' + raw).replace(' ', 'T')).getTime()
      if (isNaN(ms)) return '—'
      const brt = new Date(ms - 3 * 3600000)
      return (
        pad(brt.getUTCDate()) + '/' + pad(brt.getUTCMonth() + 1) + '/' + brt.getUTCFullYear()
      )
    }

    let texto =
      '💊 *Solicitação de receita*\n\n' +
      '*Paciente:* ' + paciente + '\n' +
      '*Medicamento:* ' + rec.getString('medication') + '\n' +
      '*Última consulta:* ' + dataBRT(rec.getString('last_visit_at')) + '\n' +
      '*Próxima consulta:* ' + dataBRT(rec.getString('next_visit_at'))

    const quem = rec.getString('requested_by')
    if (quem) texto += '\n*Pedido por:* ' + quem

    texto += '\n\nAprovar ou reprovar: https://crm.clinicacanever.com.br/receitas'

    const normalizar = (raw) => {
      let d = ('' + (raw || '')).replace(/\D/g, '')
      if (!d) return ''
      if (d.length <= 11) d = '55' + d
      return d
    }

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
        .error('[prescription_alert] envio falhou', 'http', res.statusCode, 'pedido', rec.id)
    } else {
      $app.logger().info('[prescription_alert] avisado', 'pedido', rec.id, 'paciente', paciente)
    }
  } catch (err) {
    // Avisar e secundario: erro aqui nunca pode impedir a solicitacao de existir.
    $app
      .logger()
      .error('[prescription_alert] erro', 'error', String(err.message).substring(0, 200))
  }

  return e.next()
}, 'prescription_requests')
