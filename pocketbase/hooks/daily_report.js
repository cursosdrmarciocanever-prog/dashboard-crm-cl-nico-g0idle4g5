// Relatorio do dia, uma vez por dia, no WhatsApp.
//
// Substitui o disparo a cada evento: em vez de uma mensagem por lead e uma por
// consulta, um resumo as 20:00.
//
// HORARIO: o container roda em UTC (nao ha TZ no docker-compose), entao
// `0 23 * * *` = 23:00 UTC = 20:00 em Brasilia. Mudar o horario aqui exige
// lembrar de somar 3 horas.
//
// O QUE ENTRA: o que aconteceu hoje (leads, consultas marcadas, canceladas,
// realizadas) e — o mais util no fim do dia — a AGENDA DE AMANHA.
//
// Sai TODO DIA, mesmo em dia parado. O relatorio que nao chega vira sinal de que
// alguma coisa quebrou; um relatorio que so aparece quando ha novidade nao
// permite essa leitura. (Ele nao substitui o watchdog: se o WhatsApp cair, o
// relatorio tambem nao sai — quem avisa disso e o watchdog, por Telegram.)
//
// OBS JSVM: handler roda isolado — toda a logica fica inline.

cronAdd('relatorio_diario', '0 23 * * *', () => {
  try {
    let destino = ''
    try {
      const cfg = $app.findFirstRecordByFilter('settings', "key = 'clinic'")
      destino = cfg ? cfg.getString('alert_whatsapp') : ''
    } catch (err) {
      return
    }
    if (!destino) return

    const evoUrl = $os.getenv('EVOLUTION_URL')
    const evoKey = $os.getenv('EVOLUTION_API_KEY')
    const instance = $os.getenv('EVOLUTION_INSTANCE')
    if (!evoUrl || !evoKey || !instance) return

    // Recortes de dia em BRT. Disparando as 23:00 UTC, a data UTC e a mesma data
    // em Brasilia, e o dia BRT comeca as 03:00 UTC.
    const agora = new Date()
    const y = agora.getUTCFullYear()
    const m = agora.getUTCMonth()
    const d = agora.getUTCDate()
    const paraPB = (ms) => new Date(ms).toISOString().replace('T', ' ')

    const inicioHoje = Date.UTC(y, m, d, 3, 0, 0)
    const inicioAmanha = inicioHoje + 86400000
    const fimAmanha = inicioAmanha + 86400000

    const pad = (n) => ('0' + n).slice(-2)
    const horaBRT = (raw) => {
      const ms = new Date(('' + raw).replace(' ', 'T')).getTime()
      if (isNaN(ms)) return '??:??'
      const brt = new Date(ms - 3 * 3600000)
      return pad(brt.getUTCHours()) + ':' + pad(brt.getUTCMinutes())
    }
    // inicioHoje/inicioAmanha ja sao 03:00 UTC — a data UTC deles JA e a data BRT.
    const dataBRT = (ms) => {
      const dt = new Date(ms)
      return pad(dt.getUTCDate()) + '/' + pad(dt.getUTCMonth() + 1)
    }

    const contar = (colecao, filtro, params, limite) => {
      try {
        return $app.findRecordsByFilter(colecao, filtro, '', limite || 200, 0, params || {})
      } catch (err) {
        $app.logger().error('[relatorio] consulta falhou', 'colecao', colecao, 'error', err.message)
        return []
      }
    }

    // 1) Leads novos hoje (importados nao contam — nao sao gente chegando).
    const leads = contar(
      'patients',
      'created >= {:ini} && imported != true',
      { ini: paraPB(inicioHoje) },
    )

    // 2) Consultas MARCADAS hoje (criadas hoje, ainda de pe).
    const marcadas = contar(
      'appointments',
      "created >= {:ini} && status = 'scheduled'",
      { ini: paraPB(inicioHoje) },
    )

    // 3) Canceladas hoje.
    const canceladas = contar(
      'appointments',
      "status = 'cancelled' && updated >= {:ini}",
      { ini: paraPB(inicioHoje) },
    )

    // 4) Realizadas hoje.
    const realizadas = contar(
      'appointments',
      "status = 'completed' && appointment_date >= {:ini} && appointment_date < {:fim}",
      { ini: paraPB(inicioHoje), fim: paraPB(inicioAmanha) },
    )

    // 5) Agenda de amanha — o motivo de o relatorio sair no fim do dia.
    let amanha = []
    try {
      amanha = $app.findRecordsByFilter(
        'appointments',
        "status = 'scheduled' && appointment_date >= {:ini} && appointment_date < {:fim}",
        'appointment_date',
        50,
        0,
        { ini: paraPB(inicioAmanha), fim: paraPB(fimAmanha) },
      )
    } catch (err) {
      $app.logger().error('[relatorio] agenda de amanha falhou', 'error', err.message)
    }

    const nomeDoPaciente = (id) => {
      try {
        return $app.findRecordById('patients', id).getString('name') || 'sem nome'
      } catch (err) {
        return 'paciente removido'
      }
    }

    // ---------------------------------------------------------------- texto
    let texto = '📊 *Resumo do dia — ' + dataBRT(inicioHoje) + '*\n\n'

    texto += '🔔 Leads novos: *' + leads.length + '*\n'
    if (leads.length) {
      const mostra = leads.slice(0, 8)
      for (const l of mostra) {
        texto +=
          '   • ' + (l.getString('name') || 'sem nome') + ' — ' + (l.getString('phone') || 's/ tel')
        const origem = l.getString('traffic_platform')
        if (origem) texto += ' (' + origem + ')'
        texto += '\n'
      }
      if (leads.length > mostra.length) texto += '   • +' + (leads.length - mostra.length) + ' no CRM\n'
    }

    texto += '\n📅 Consultas marcadas hoje: *' + marcadas.length + '*'
    texto += '\n✅ Realizadas hoje: *' + realizadas.length + '*'
    texto += '\n❌ Canceladas hoje: *' + canceladas.length + '*\n'

    texto += '\n*Amanhã (' + dataBRT(inicioAmanha) + '): ' + amanha.length + ' consulta'
    texto += amanha.length === 1 ? '*\n' : 's*\n'
    if (amanha.length) {
      const mostra = amanha.slice(0, 20)
      for (const a of mostra) {
        texto +=
          '   ' +
          horaBRT(a.getString('appointment_date')) +
          ' — ' +
          nomeDoPaciente(a.getString('patient_id')) +
          '\n'
      }
      if (amanha.length > mostra.length) {
        texto += '   +' + (amanha.length - mostra.length) + ' na agenda\n'
      }
    } else {
      texto += '   Nenhuma consulta marcada.\n'
    }

    texto += '\nhttps://crm.clinicacanever.com.br'

    const normalizar = (raw) => {
      let dg = ('' + (raw || '')).replace(/\D/g, '')
      if (!dg) return ''
      if (dg.length <= 11) dg = '55' + dg
      return dg
    }

    const res = $http.send({
      url: evoUrl + '/message/sendText/' + instance,
      method: 'POST',
      headers: { apikey: evoKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: normalizar(destino), text: texto }),
      timeout: 30,
    })

    if (res.statusCode < 200 || res.statusCode >= 300) {
      $app.logger().error('[relatorio] envio falhou', 'http', res.statusCode)
    } else {
      $app
        .logger()
        .info(
          '[relatorio] enviado',
          'leads', leads.length,
          'marcadas', marcadas.length,
          'amanha', amanha.length,
        )
    }
  } catch (err) {
    $app.logger().error('[relatorio] erro', 'error', String(err.message).substring(0, 200))
  }
})
