// Follow-up automático por estágio: quando o paciente ENTRA num estágio que tem
// template ativo (stage_templates), agenda uma mensagem em scheduled_messages;
// o disparador (wa_dispatcher) envia no horário.
//
// Suporta placeholders {nome}, {data} e {hora}. Se o template usar {data}/{hora}
// (ex.: estágio "agendamento confirmado"), o hook busca a consulta agendada do
// paciente e preenche com a data/hora (em BRT, UTC-3).
//
// REGRA: se o template exige {data}/{hora} e o paciente ainda NAO tem consulta
// futura, a mensagem nao e agendada aqui. Quem dispara e o appointment_confirmation,
// quando a consulta for criada — assim o paciente nunca recebe data em branco.
//
// OBS JSVM: handlers rodam em contexto isolado — a lógica fica inline.

onRecordAfterCreateSuccess((e) => {
  if (e.record.getBool('imported')) {
    return e.next() // leads importados nao recebem boas-vindas (evita blast)
  }
  const stage = e.record.getString('journey_stage')
  if (stage) {
    scheduleFollowup(e.record, stage)
  }
  return e.next()

  function scheduleFollowup(patientRec, st) {
    try {
      const tpls = $app.findRecordsByFilter(
        'stage_templates',
        'stage = {:stage} && enabled = true',
        '',
        1,
        0,
        { stage: st },
      )
      if (!tpls.length) return
      const tpl = tpls[0]
      const name = patientRec.getString('name') || ''
      const firstName = name.split(' ')[0] || name
      let text = tpl.getString('message_text').split('{nome}').join(firstName)

      if (text.indexOf('{data}') >= 0 || text.indexOf('{hora}') >= 0) {
        const dt = nextAppointmentDateTime(patientRec.id)
        // Sem consulta futura marcada: NAO envia agora — sairia "confirmada para
        // ' ' as ' '". A confirmacao e disparada pelo hook appointment_confirmation
        // no momento em que a consulta for criada, ja com data e hora reais.
        if (!dt.data || !dt.hora) {
          $app
            .logger()
            .info('[stage_followup] adiado ate agendar a consulta', 'stage', st, 'patient', patientRec.id)
          return
        }
        text = text.split('{data}').join(dt.data).split('{hora}').join(dt.hora)
      }

      const delayMin = tpl.getFloat('delay_minutes') || 0
      const when = new Date(Date.now() + delayMin * 60000).toISOString()
      const col = $app.findCollectionByNameOrId('scheduled_messages')
      const msg = new Record(col)
      msg.set('patient_id', patientRec.id)
      msg.set('message_text', text)
      msg.set('scheduled_at', when)
      msg.set('status', 'pending')
      $app.save(msg)
      $app.logger().info('[stage_followup] agendado', 'stage', st, 'patient', patientRec.id)
    } catch (err) {
      $app.logger().error('[stage_followup] falhou', 'stage', st, 'error', err.message)
    }
  }

  // Data/hora (BRT) da proxima consulta do paciente; '' se nao houver.
  function nextAppointmentDateTime(patientId) {
    try {
      const appts = $app.findRecordsByFilter(
        'appointments',
        "patient_id = {:pid} && status != 'cancelled'",
        '-appointment_date',
        20,
        0,
        { pid: patientId },
      )
      if (!appts.length) return { data: '', hora: '' }
      const nowMs = Date.now()
      let chosen = appts[0]
      let bestFutureMs = Infinity
      let bestFuture = null
      for (const a of appts) {
        const ms = new Date(a.getString('appointment_date').replace(' ', 'T')).getTime()
        if (!isNaN(ms) && ms >= nowMs && ms < bestFutureMs) {
          bestFutureMs = ms
          bestFuture = a
        }
      }
      if (bestFuture) chosen = bestFuture
      const ms = new Date(chosen.getString('appointment_date').replace(' ', 'T')).getTime()
      if (isNaN(ms)) return { data: '', hora: '' }
      const brt = new Date(ms - 3 * 3600000)
      const pad = (n) => ('0' + n).slice(-2)
      return {
        data: pad(brt.getUTCDate()) + '/' + pad(brt.getUTCMonth() + 1) + '/' + brt.getUTCFullYear(),
        hora: pad(brt.getUTCHours()) + ':' + pad(brt.getUTCMinutes()),
      }
    } catch (err) {
      return { data: '', hora: '' }
    }
  }
}, 'patients')

onRecordAfterUpdateSuccess((e) => {
  const oldStage = e.record.original().getString('journey_stage')
  const newStage = e.record.getString('journey_stage')
  if (newStage && newStage !== oldStage) {
    scheduleFollowup(e.record, newStage)
  }
  return e.next()

  function scheduleFollowup(patientRec, st) {
    try {
      const tpls = $app.findRecordsByFilter(
        'stage_templates',
        'stage = {:stage} && enabled = true',
        '',
        1,
        0,
        { stage: st },
      )
      if (!tpls.length) return
      const tpl = tpls[0]
      const name = patientRec.getString('name') || ''
      const firstName = name.split(' ')[0] || name
      let text = tpl.getString('message_text').split('{nome}').join(firstName)

      if (text.indexOf('{data}') >= 0 || text.indexOf('{hora}') >= 0) {
        const dt = nextAppointmentDateTime(patientRec.id)
        // Sem consulta futura marcada: NAO envia agora — sairia "confirmada para
        // ' ' as ' '". A confirmacao e disparada pelo hook appointment_confirmation
        // no momento em que a consulta for criada, ja com data e hora reais.
        if (!dt.data || !dt.hora) {
          $app
            .logger()
            .info('[stage_followup] adiado ate agendar a consulta', 'stage', st, 'patient', patientRec.id)
          return
        }
        text = text.split('{data}').join(dt.data).split('{hora}').join(dt.hora)
      }

      const delayMin = tpl.getFloat('delay_minutes') || 0
      const when = new Date(Date.now() + delayMin * 60000).toISOString()
      const col = $app.findCollectionByNameOrId('scheduled_messages')
      const msg = new Record(col)
      msg.set('patient_id', patientRec.id)
      msg.set('message_text', text)
      msg.set('scheduled_at', when)
      msg.set('status', 'pending')
      $app.save(msg)
      $app.logger().info('[stage_followup] agendado', 'stage', st, 'patient', patientRec.id)
    } catch (err) {
      $app.logger().error('[stage_followup] falhou', 'stage', st, 'error', err.message)
    }
  }

  function nextAppointmentDateTime(patientId) {
    try {
      const appts = $app.findRecordsByFilter(
        'appointments',
        "patient_id = {:pid} && status != 'cancelled'",
        '-appointment_date',
        20,
        0,
        { pid: patientId },
      )
      if (!appts.length) return { data: '', hora: '' }
      const nowMs = Date.now()
      let chosen = appts[0]
      let bestFutureMs = Infinity
      let bestFuture = null
      for (const a of appts) {
        const ms = new Date(a.getString('appointment_date').replace(' ', 'T')).getTime()
        if (!isNaN(ms) && ms >= nowMs && ms < bestFutureMs) {
          bestFutureMs = ms
          bestFuture = a
        }
      }
      if (bestFuture) chosen = bestFuture
      const ms = new Date(chosen.getString('appointment_date').replace(' ', 'T')).getTime()
      if (isNaN(ms)) return { data: '', hora: '' }
      const brt = new Date(ms - 3 * 3600000)
      const pad = (n) => ('0' + n).slice(-2)
      return {
        data: pad(brt.getUTCDate()) + '/' + pad(brt.getUTCMonth() + 1) + '/' + brt.getUTCFullYear(),
        hora: pad(brt.getUTCHours()) + ':' + pad(brt.getUTCMinutes()),
      }
    } catch (err) {
      return { data: '', hora: '' }
    }
  }
}, 'patients')
