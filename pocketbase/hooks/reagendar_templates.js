// Mudou o prazo de um lembrete? As mensagens JA agendadas mudam junto.
//
// Sem isto, trocar "3 dias antes" por "7 dias antes" só valeria para consultas
// marcadas DEPOIS da edição: as pacientes já agendadas continuariam recebendo no
// prazo antigo, sem nada na tela dizendo isso. Quem mexe na configuração espera
// que ela valha, e um lembrete que sai no dia errado é pior do que não sair.
//
// Só mexe no que ainda vai acontecer: consultas futuras, implantes ativos, e
// mensagens pendentes com hora ainda por vir. Nada do passado é reescrito, e uma
// mensagem prestes a sair (confirmação de agendamento, por exemplo) não é
// apagada no meio do caminho.
//
// OBS JSVM: handlers rodam em contexto isolado — a lógica fica inline em cada um.

// ---------------------------------------------------------------- consultas
onRecordAfterUpdateSuccess((e) => {
  const rec = e.record
  const old = rec.original()

  const mudou =
    (rec.getFloat('offset_hours') || 0) !== (old.getFloat('offset_hours') || 0) ||
    rec.getBool('enabled') !== old.getBool('enabled') ||
    rec.getString('message_text') !== old.getString('message_text')
  if (!mudou) return e.next()

  try {
    const agoraMs = Date.now()
    const agora = new Date(agoraMs).toISOString().replace('T', ' ')

    const futuras = $app.findRecordsByFilter(
      'appointments',
      "status != 'cancelled' && appointment_date > {:agora}",
      'appointment_date',
      500,
      0,
      { agora: agora },
    )

    const templates = $app.findRecordsByFilter('appointment_reminders', 'enabled = true', '', 100, 0)
    const col = $app.findCollectionByNameOrId('scheduled_messages')
    let refeitas = 0

    for (const appt of futuras) {
      try {
        const pend = $app.findRecordsByFilter(
          'scheduled_messages',
          "appointment_id = {:aid} && status = 'pending' && scheduled_at > {:agora}",
          '',
          200,
          0,
          { aid: appt.id, agora: agora },
        )
        for (const p of pend) $app.delete(p)

        const apptMs = new Date(appt.getString('appointment_date').replace(' ', 'T')).getTime()
        if (isNaN(apptMs)) continue

        const patient = $app.findRecordById('patients', appt.getString('patient_id'))
        const firstName = (patient.getString('name') || '').split(' ')[0] || ''

        const brt = new Date(apptMs - 3 * 3600000)
        const pad = (n) => ('0' + n).slice(-2)
        const dataStr =
          pad(brt.getUTCDate()) + '/' + pad(brt.getUTCMonth() + 1) + '/' + brt.getUTCFullYear()
        const horaStr = pad(brt.getUTCHours()) + ':' + pad(brt.getUTCMinutes())

        for (const t of templates) {
          const when = apptMs + (t.getFloat('offset_hours') || 0) * 3600000
          if (when <= agoraMs) continue

          const text = t
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
          refeitas++
        }
      } catch (err) {
        // Uma consulta com problema nao pode impedir o reagendamento das outras.
        $app
          .logger()
          .error('[reagendar] consulta falhou', 'appt', appt.id, 'error', err.message)
      }
    }

    $app
      .logger()
      .info(
        '[reagendar] lembretes de consulta refeitos',
        'consultas',
        futuras.length,
        'mensagens',
        refeitas,
      )
  } catch (err) {
    $app.logger().error('[reagendar] consultas falhou', 'error', err.message)
  }

  return e.next()
}, 'appointment_reminders')

// ---------------------------------------------------------------- implantes
onRecordAfterUpdateSuccess((e) => {
  const rec = e.record
  const old = rec.original()

  // O template de retorno sai na hora em que a paciente e marcada como
  // retornada — nao ha nada agendado para remarcar.
  if (rec.getString('kind') !== 'schedule') return e.next()

  const mudou =
    (rec.getFloat('offset_days') || 0) !== (old.getFloat('offset_days') || 0) ||
    rec.getBool('enabled') !== old.getBool('enabled') ||
    rec.getBool('only_if_no_return') !== old.getBool('only_if_no_return') ||
    rec.getString('message_text') !== old.getString('message_text')
  if (!mudou) return e.next()

  try {
    const agoraMs = Date.now()
    const agora = new Date(agoraMs).toISOString().replace('T', ' ')

    const ativas = $app.findRecordsByFilter(
      'patients',
      "implant_active = true && implant_returned_at = ''",
      'implant_expires_at',
      500,
      0,
    )

    const templates = $app.findRecordsByFilter(
      'implant_reminders',
      "kind = 'schedule' && enabled = true",
      'offset_days',
      50,
      0,
    )
    const col = $app.findCollectionByNameOrId('scheduled_messages')
    let refeitas = 0

    for (const p of ativas) {
      try {
        const pend = $app.findRecordsByFilter(
          'scheduled_messages',
          "patient_id = {:pid} && status = 'pending' && source = 'implant' && scheduled_at > {:agora}",
          '',
          200,
          0,
          { pid: p.id, agora: agora },
        )
        for (const m of pend) $app.delete(m)

        const expRaw = p.getString('implant_expires_at')
        if (!expRaw) continue
        const expMs = new Date(expRaw.replace(' ', 'T')).getTime()
        if (isNaN(expMs)) continue

        const nome = p.getString('name') || ''
        const firstName = nome.split(' ')[0] || nome
        const brt = new Date(expMs - 3 * 3600000)
        const pad = (n) => ('0' + n).slice(-2)
        const dataStr =
          pad(brt.getUTCDate()) + '/' + pad(brt.getUTCMonth() + 1) + '/' + brt.getUTCFullYear()

        for (const t of templates) {
          const dia = new Date(expMs + (t.getFloat('offset_days') || 0) * 86400000)
          // 09:00 BRT = 12:00 UTC, mesmo horario da trilha automatica
          const when = Date.UTC(
            dia.getUTCFullYear(),
            dia.getUTCMonth(),
            dia.getUTCDate(),
            12,
            0,
            0,
          )
          if (when <= agoraMs) continue

          const text = t
            .getString('message_text')
            .split('{nome}').join(firstName)
            .split('{data}').join(dataStr)

          const msg = new Record(col)
          msg.set('patient_id', p.id)
          msg.set('message_text', text)
          msg.set('scheduled_at', new Date(when).toISOString())
          msg.set('status', 'pending')
          msg.set('source', 'implant')
          msg.set('cancel_on_return', !!t.getBool('only_if_no_return'))
          $app.save(msg)
          refeitas++
        }
      } catch (err) {
        $app.logger().error('[reagendar] implante falhou', 'patient', p.id, 'error', err.message)
      }
    }

    $app
      .logger()
      .info(
        '[reagendar] lembretes de implante refeitos',
        'pacientes',
        ativas.length,
        'mensagens',
        refeitas,
      )
  } catch (err) {
    $app.logger().error('[reagendar] implantes falhou', 'error', err.message)
  }

  return e.next()
}, 'implant_reminders')
