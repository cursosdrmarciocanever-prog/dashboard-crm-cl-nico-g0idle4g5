// Confirmação de agendamento com data e hora reais.
//
// O stage_followup NAO envia a mensagem do estágio quando o template usa
// {data}/{hora} e o paciente ainda nao tem consulta marcada (sairia em branco).
// Este hook fecha o ciclo: assim que a consulta e criada, ele monta a mensagem
// daquele estágio com a data e a hora de verdade e agenda o envio.
//
// Fluxo tipico: arrasta o cartao para "Agendamento Confirmado" -> o CRM abre o
// dialogo de agendamento -> ao confirmar, a mensagem sai.
//
// OBS JSVM: handlers rodam em contexto isolado — a logica fica inline.

onRecordAfterCreateSuccess((e) => {
  enviarConfirmacao(e.record)
  return e.next()

  function enviarConfirmacao(appt) {
    try {
      if (appt.getString('status') === 'cancelled') return

      const raw = appt.getString('appointment_date')
      if (!raw) return
      const apptMs = new Date(raw.replace(' ', 'T')).getTime()
      if (isNaN(apptMs) || apptMs < Date.now()) return // consulta no passado: nao confirma

      const patientId = appt.getString('patient_id')
      if (!patientId) return
      const patient = $app.findRecordById('patients', patientId)
      const stage = patient.getString('journey_stage')
      if (!stage) return

      // O estagio atual tem template ativo que depende de data/hora?
      const tpls = $app.findRecordsByFilter(
        'stage_templates',
        'stage = {:stage} && enabled = true',
        '',
        1,
        0,
        { stage: stage },
      )
      if (!tpls.length) return
      const raw_text = tpls[0].getString('message_text')
      if (raw_text.indexOf('{data}') < 0 && raw_text.indexOf('{hora}') < 0) {
        return // template nao usa data/hora — ja foi enviado pelo stage_followup
      }

      // data/hora em BRT (UTC-3)
      const brt = new Date(apptMs - 3 * 3600000)
      const pad = (n) => ('0' + n).slice(-2)
      const dataStr =
        pad(brt.getUTCDate()) + '/' + pad(brt.getUTCMonth() + 1) + '/' + brt.getUTCFullYear()
      const horaStr = pad(brt.getUTCHours()) + ':' + pad(brt.getUTCMinutes())

      const name = patient.getString('name') || ''
      const firstName = name.split(' ')[0] || name
      const text = raw_text
        .split('{nome}').join(firstName)
        .split('{data}').join(dataStr)
        .split('{hora}').join(horaStr)

      const delayMin = tpls[0].getFloat('delay_minutes') || 0
      const when = new Date(Date.now() + delayMin * 60000).toISOString()

      const col = $app.findCollectionByNameOrId('scheduled_messages')
      const msg = new Record(col)
      msg.set('patient_id', patientId)
      msg.set('appointment_id', appt.id)
      msg.set('message_text', text)
      msg.set('scheduled_at', when)
      msg.set('status', 'pending')
      $app.save(msg)

      $app
        .logger()
        .info('[appointment_confirmation] confirmacao agendada', 'stage', stage, 'patient', patientId)
    } catch (err) {
      $app.logger().error('[appointment_confirmation] falhou', 'error', err.message)
    }
  }
}, 'appointments')
