// Avisos no WhatsApp sobre a agenda: consulta MARCADA, CANCELADA e REMARCADA.
//
// Mesmo destino do aviso de lead novo (settings/clinic > alert_whatsapp) e a
// mesma instancia do Evolution — um numero so recebe todos. Vazio = nao avisa.
//
// SO consulta AGENDADA dispara o aviso de "marcada". A tela "Registrar consulta
// anterior" cria o registro como 'completed' e com data no passado: lancar no
// historico um atendimento de meses atras nao e "consulta marcada", e avisar
// seria confuso.
//
// EXCLUIR consulta nao avisa: excluir e para lancamento errado ou duplicado —
// avisar que um engano foi apagado nao ajuda ninguem. Desmarcacao de verdade e
// "cancelar", e essa avisa.
//
// Freio de rajada igual ao do lead_alert: mais de 10 consultas mexidas em 2
// minutos e importacao ou script, nao agenda sendo tocada na mao.
//
// OBS JSVM: cada handler roda isolado — nao acessa nada fora dele. Por isso a
// formatacao de data e o envio aparecem repetidos nos dois handlers.

onRecordAfterCreateSuccess((e) => {
  const rec = e.record

  try {
    if (rec.getString('status') !== 'scheduled') return e.next()

    // Aviso na hora ligado? Desligado (padrao), tudo sai no relatorio das 20:00.
    let destino = ''
    try {
      const cfg = $app.findFirstRecordByFilter('settings', "key = 'clinic'")
      if (!cfg || !cfg.getBool('alert_realtime')) return e.next()
      destino = cfg.getString('alert_whatsapp')
    } catch (err) {
      return e.next()
    }
    if (!destino) return e.next()

    const evoUrl = $os.getenv('EVOLUTION_URL')
    const evoKey = $os.getenv('EVOLUTION_API_KEY')
    const instance = $os.getenv('EVOLUTION_INSTANCE')
    if (!evoUrl || !evoKey || !instance) return e.next()

    const doisMinAtras = new Date(Date.now() - 2 * 60000).toISOString().replace('T', ' ')
    try {
      const recentes = $app.findRecordsByFilter(
        'appointments',
        'created > {:desde}',
        '',
        20,
        0,
        { desde: doisMinAtras },
      )
      if (recentes.length > 10) {
        $app
          .logger()
          .warn('[appointment_alert] rajada detectada, aviso suprimido', 'em_2min', recentes.length)
        return e.next()
      }
    } catch (err) {
      // Contagem falhou: segue e avisa.
    }

    // Nome do paciente; sem ele o aviso perde a serventia, mas nao trava.
    let paciente = 'paciente'
    try {
      const p = $app.findRecordById('patients', rec.getString('patient_id'))
      paciente = p.getString('name') || paciente
    } catch (err) {
      // segue com o generico
    }

    // Data em BRT (UTC-3), igual aos outros hooks.
    let quando = rec.getString('appointment_date')
    const ms = new Date(quando.replace(' ', 'T')).getTime()
    if (!isNaN(ms)) {
      const brt = new Date(ms - 3 * 3600000)
      const pad = (n) => ('0' + n).slice(-2)
      quando =
        pad(brt.getUTCDate()) +
        '/' +
        pad(brt.getUTCMonth() + 1) +
        '/' +
        brt.getUTCFullYear() +
        ' às ' +
        pad(brt.getUTCHours()) +
        ':' +
        pad(brt.getUTCMinutes())
    }

    const obs = rec.getString('notes')
    let texto =
      '📅 *Consulta marcada*\n\n' +
      '*Paciente:* ' + paciente + '\n' +
      '*Quando:* ' + quando
    if (obs) texto += '\n*Obs.:* ' + obs
    texto += '\n\nAbrir: https://crm.clinicacanever.com.br/pacientes/' + rec.getString('patient_id')

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
        .error('[appointment_alert] envio falhou', 'http', res.statusCode, 'appt', rec.id)
    } else {
      $app.logger().info('[appointment_alert] avisado', 'appt', rec.id, 'paciente', paciente)
    }
  } catch (err) {
    // Avisar e secundario: erro aqui nunca pode impedir a consulta de ser criada.
    $app
      .logger()
      .error('[appointment_alert] erro', 'error', String(err.message).substring(0, 200))
  }

  return e.next()
}, 'appointments')

// ------------------------------------------------ cancelada e remarcada
onRecordAfterUpdateSuccess((e) => {
  const rec = e.record

  try {
    const old = rec.original()
    const statusAntes = old.getString('status')
    const statusAgora = rec.getString('status')
    const dataAntes = old.getString('appointment_date')
    const dataAgora = rec.getString('appointment_date')

    // Que aviso e este? Cancelamento manda mais que mudanca de data: se a
    // consulta foi cancelada, a data nova (se houve) nao interessa.
    let tipo = ''
    if (statusAgora === 'cancelled' && statusAntes !== 'cancelled') {
      tipo = 'cancelada'
    } else if (dataAgora !== dataAntes && statusAgora === 'scheduled') {
      tipo = 'remarcada'
    }
    if (!tipo) return e.next()

    // Aviso na hora ligado? Desligado (padrao), tudo sai no relatorio das 20:00.
    let destino = ''
    try {
      const cfg = $app.findFirstRecordByFilter('settings', "key = 'clinic'")
      if (!cfg || !cfg.getBool('alert_realtime')) return e.next()
      destino = cfg.getString('alert_whatsapp')
    } catch (err) {
      return e.next()
    }
    if (!destino) return e.next()

    const evoUrl = $os.getenv('EVOLUTION_URL')
    const evoKey = $os.getenv('EVOLUTION_API_KEY')
    const instance = $os.getenv('EVOLUTION_INSTANCE')
    if (!evoUrl || !evoKey || !instance) return e.next()

    const doisMinAtras = new Date(Date.now() - 2 * 60000).toISOString().replace('T', ' ')
    try {
      const recentes = $app.findRecordsByFilter(
        'appointments',
        'updated > {:desde}',
        '',
        20,
        0,
        { desde: doisMinAtras },
      )
      if (recentes.length > 10) {
        $app
          .logger()
          .warn('[appointment_alert] rajada detectada, aviso suprimido', 'em_2min', recentes.length)
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

    // Data em BRT (UTC-3), igual aos outros hooks.
    const emBRT = (raw) => {
      const ms = new Date(('' + raw).replace(' ', 'T')).getTime()
      if (isNaN(ms)) return '' + raw
      const brt = new Date(ms - 3 * 3600000)
      const pad = (n) => ('0' + n).slice(-2)
      return (
        pad(brt.getUTCDate()) +
        '/' +
        pad(brt.getUTCMonth() + 1) +
        '/' +
        brt.getUTCFullYear() +
        ' às ' +
        pad(brt.getUTCHours()) +
        ':' +
        pad(brt.getUTCMinutes())
      )
    }

    let texto
    if (tipo === 'cancelada') {
      texto =
        '❌ *Consulta cancelada*\n\n' +
        '*Paciente:* ' + paciente + '\n' +
        '*Era:* ' + emBRT(dataAgora) + '\n\n' +
        'O horário está livre. Os lembretes pendentes foram removidos.'
    } else {
      texto =
        '🔄 *Consulta remarcada*\n\n' +
        '*Paciente:* ' + paciente + '\n' +
        '*De:* ' + emBRT(dataAntes) + '\n' +
        '*Para:* ' + emBRT(dataAgora)
    }
    texto += '\n\nAbrir: https://crm.clinicacanever.com.br/pacientes/' + rec.getString('patient_id')

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
        .error('[appointment_alert] envio falhou', 'tipo', tipo, 'http', res.statusCode, 'appt', rec.id)
    } else {
      $app.logger().info('[appointment_alert] avisado', 'tipo', tipo, 'appt', rec.id)
    }
  } catch (err) {
    // Avisar e secundario: erro aqui nunca pode impedir a alteracao de valer.
    $app
      .logger()
      .error('[appointment_alert] erro no update', 'error', String(err.message).substring(0, 200))
  }

  return e.next()
}, 'appointments')
