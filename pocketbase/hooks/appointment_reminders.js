// Lembretes de consulta: ao criar/alterar um agendamento, agenda em
// scheduled_messages um lembrete para cada template ativo (appointment_reminders),
// no horario = data da consulta + offset_hours. Reagenda se a data mudar;
// remove os pendentes se a consulta for cancelada.
//
// OBS JSVM: logica inline dentro de cada handler (nao acessa escopo do arquivo).

onRecordAfterCreateSuccess((e) => {
  scheduleApptReminders(e.record)
  return e.next()

  function scheduleApptReminders(appt) {
    try {
      if (appt.getString('status') === 'cancelled') return
      const raw = appt.getString('appointment_date')
      if (!raw) return
      const apptMs = new Date(raw.replace(' ', 'T')).getTime()
      if (isNaN(apptMs)) return

      const patient = $app.findRecordById('patients', appt.getString('patient_id'))
      const firstName = (patient.getString('name') || '').split(' ')[0] || ''

      // data/hora em BRT (UTC-3) para exibir na mensagem
      const brt = new Date(apptMs - 3 * 3600000)
      const pad = (n) => ('0' + n).slice(-2)
      const dataStr = pad(brt.getUTCDate()) + '/' + pad(brt.getUTCMonth() + 1) + '/' + brt.getUTCFullYear()
      const horaStr = pad(brt.getUTCHours()) + ':' + pad(brt.getUTCMinutes())

      const reminders = $app.findRecordsByFilter('appointment_reminders', 'enabled = true', '', 100, 0)
      const col = $app.findCollectionByNameOrId('scheduled_messages')

      for (const r of reminders) {
        const offset = r.getFloat('offset_hours') || 0
        const when = apptMs + offset * 3600000
        if (when <= Date.now()) continue // horario ja passou — nao agenda

        const text = r
          .getString('message_text')
          .split('{nome}').join(firstName)
          .split('{data}').join(dataStr)
          .split('{hora}').join(horaStr)

        const msg = new Record(col)
        msg.set('patient_id', appt.getString('patient_id'))
        msg.set('appointment_id', appt.id)
        msg.set('message_text', text)
        msg.set('scheduled_at', new Date(when).toISOString())
        msg.set('status', 'pending')
        $app.save(msg)
      }
    } catch (err) {
      $app.logger().error('[appointment_reminders] agendar falhou', 'appt', appt.id, 'error', err.message)
    }
  }
}, 'appointments')

onRecordAfterUpdateSuccess((e) => {
  const oldDate = e.record.original().getString('appointment_date')
  const newDate = e.record.getString('appointment_date')
  const oldStatus = e.record.original().getString('status')
  const newStatus = e.record.getString('status')

  if (oldDate === newDate && oldStatus === newStatus) return e.next()

  // remove lembretes pendentes desta consulta e reagenda (se nao cancelada)
  try {
    const pend = $app.findRecordsByFilter(
      'scheduled_messages',
      "appointment_id = {:aid} && status = 'pending'",
      '',
      500,
      0,
      { aid: e.record.id },
    )
    for (const p of pend) $app.delete(p)
  } catch (err) {
    $app.logger().error('[appointment_reminders] limpar pendentes falhou', 'error', err.message)
  }

  scheduleApptReminders(e.record)
  return e.next()

  function scheduleApptReminders(appt) {
    try {
      if (appt.getString('status') === 'cancelled') return
      const raw = appt.getString('appointment_date')
      if (!raw) return
      const apptMs = new Date(raw.replace(' ', 'T')).getTime()
      if (isNaN(apptMs)) return

      const patient = $app.findRecordById('patients', appt.getString('patient_id'))
      const firstName = (patient.getString('name') || '').split(' ')[0] || ''

      const brt = new Date(apptMs - 3 * 3600000)
      const pad = (n) => ('0' + n).slice(-2)
      const dataStr = pad(brt.getUTCDate()) + '/' + pad(brt.getUTCMonth() + 1) + '/' + brt.getUTCFullYear()
      const horaStr = pad(brt.getUTCHours()) + ':' + pad(brt.getUTCMinutes())

      const reminders = $app.findRecordsByFilter('appointment_reminders', 'enabled = true', '', 100, 0)
      const col = $app.findCollectionByNameOrId('scheduled_messages')

      for (const r of reminders) {
        const offset = r.getFloat('offset_hours') || 0
        const when = apptMs + offset * 3600000
        if (when <= Date.now()) continue

        const text = r
          .getString('message_text')
          .split('{nome}').join(firstName)
          .split('{data}').join(dataStr)
          .split('{hora}').join(horaStr)

        const msg = new Record(col)
        msg.set('patient_id', appt.getString('patient_id'))
        msg.set('appointment_id', appt.id)
        msg.set('message_text', text)
        msg.set('scheduled_at', new Date(when).toISOString())
        msg.set('status', 'pending')
        $app.save(msg)
      }
    } catch (err) {
      $app.logger().error('[appointment_reminders] reagendar falhou', 'appt', appt.id, 'error', err.message)
    }
  }
}, 'appointments')
