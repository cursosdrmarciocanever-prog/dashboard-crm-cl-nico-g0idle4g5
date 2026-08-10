// Aviso no WhatsApp toda vez que uma consulta e marcada.
//
// Mesmo destino do aviso de lead novo (settings/clinic > alert_whatsapp) e a
// mesma instancia do Evolution — um numero so recebe os dois. Vazio = nao avisa.
//
// SO consulta AGENDADA dispara. A tela "Registrar consulta anterior" cria o
// registro como 'completed' e com data no passado: lancar no historico um
// atendimento de meses atras nao e "consulta marcada", e avisar seria confuso.
//
// Freio de rajada igual ao do lead_alert: mais de 10 consultas criadas em 2
// minutos e importacao ou script, nao agenda sendo preenchida na mao.
//
// OBS JSVM: handler roda isolado — a logica fica toda inline.

onRecordAfterCreateSuccess((e) => {
  const rec = e.record

  try {
    if (rec.getString('status') !== 'scheduled') return e.next()

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
