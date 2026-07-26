// Implantes hormonais: agenda a trilha de lembretes ancorada no VENCIMENTO
// (calculado por data de colocação + duração em meses) e trata o "retorno".
//
// Regras:
// - Ao definir/alterar colocação ou duração: recalcula o vencimento e reagenda
//   os lembretes pendentes (templates implant_reminders kind='schedule').
// - Ao marcar retorno (implant_returned_at preenchido): remove os lembretes
//   pendentes marcados como cancel_on_return e envia o template kind='return'
//   (lista de exames) na hora.
//
// OBS JSVM: handlers rodam isolados — toda a lógica fica inline.

onRecordAfterUpdateSuccess((e) => {
  const rec = e.record
  const old = rec.original()

  const placedNow = rec.getString('implant_placed_at')
  const placedOld = old.getString('implant_placed_at')
  const durNow = rec.getFloat('implant_duration_months') || 0
  const durOld = old.getFloat('implant_duration_months') || 0
  const activeNow = rec.getBool('implant_active')
  const activeOld = old.getBool('implant_active')
  const returnedNow = rec.getString('implant_returned_at')
  const returnedOld = old.getString('implant_returned_at')

  // 1) RETORNO recém-marcado
  if (returnedNow && !returnedOld) {
    try {
      const pend = $app.findRecordsByFilter(
        'scheduled_messages',
        "patient_id = {:pid} && status = 'pending' && source = 'implant' && cancel_on_return = true",
        '',
        200,
        0,
        { pid: rec.id },
      )
      for (const p of pend) $app.delete(p)
    } catch (err) {
      $app.logger().error('[implant] limpar pendentes falhou', 'error', err.message)
    }

    try {
      const tpls = $app.findRecordsByFilter(
        'implant_reminders',
        "kind = 'return' && enabled = true",
        '',
        1,
        0,
      )
      if (tpls.length) {
        const name = rec.getString('name') || ''
        const firstName = name.split(' ')[0] || name
        const expires = rec.getString('implant_expires_at')
        let dataStr = ''
        if (expires) {
          const ms = new Date(expires.replace(' ', 'T')).getTime()
          if (!isNaN(ms)) {
            const brt = new Date(ms - 3 * 3600000)
            const pad = (n) => ('0' + n).slice(-2)
            dataStr =
              pad(brt.getUTCDate()) + '/' + pad(brt.getUTCMonth() + 1) + '/' + brt.getUTCFullYear()
          }
        }
        const text = tpls[0]
          .getString('message_text')
          .split('{nome}').join(firstName)
          .split('{data}').join(dataStr)

        const col = $app.findCollectionByNameOrId('scheduled_messages')
        const msg = new Record(col)
        msg.set('patient_id', rec.id)
        msg.set('message_text', text)
        msg.set('scheduled_at', new Date().toISOString())
        msg.set('status', 'pending')
        msg.set('source', 'implant')
        msg.set('cancel_on_return', false)
        $app.save(msg)
      }
    } catch (err) {
      $app.logger().error('[implant] msg de retorno falhou', 'error', err.message)
    }
    return e.next()
  }

  // 2) Dados do implante mudaram → reagenda a trilha
  const changed =
    placedNow !== placedOld || durNow !== durOld || activeNow !== activeOld
  if (!changed) return e.next()

  // limpa pendentes de implante deste paciente
  try {
    const pend = $app.findRecordsByFilter(
      'scheduled_messages',
      "patient_id = {:pid} && status = 'pending' && source = 'implant'",
      '',
      200,
      0,
      { pid: rec.id },
    )
    for (const p of pend) $app.delete(p)
  } catch (err) {
    $app.logger().error('[implant] limpar pendentes falhou', 'error', err.message)
  }

  if (!activeNow || !placedNow || !durNow || returnedNow) return e.next()

  try {
    const placedMs = new Date(placedNow.replace(' ', 'T')).getTime()
    if (isNaN(placedMs)) return e.next()

    // vencimento = colocação + duração (meses)
    const exp = new Date(placedMs)
    exp.setMonth(exp.getMonth() + Math.round(durNow))
    const expMs = exp.getTime()

    const name = rec.getString('name') || ''
    const firstName = name.split(' ')[0] || name
    const brt = new Date(expMs - 3 * 3600000)
    const pad = (n) => ('0' + n).slice(-2)
    const dataStr =
      pad(brt.getUTCDate()) + '/' + pad(brt.getUTCMonth() + 1) + '/' + brt.getUTCFullYear()

    const tpls = $app.findRecordsByFilter(
      'implant_reminders',
      "kind = 'schedule' && enabled = true",
      'offset_days',
      50,
      0,
    )
    const col = $app.findCollectionByNameOrId('scheduled_messages')

    for (const t of tpls) {
      const off = t.getFloat('offset_days') || 0
      // envia às 09:00 (BRT = 12:00 UTC) do dia calculado
      const day = new Date(expMs + off * 86400000)
      const when = new Date(
        Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 12, 0, 0),
      ).getTime()
      if (when <= Date.now()) continue // já passou

      const text = t
        .getString('message_text')
        .split('{nome}').join(firstName)
        .split('{data}').join(dataStr)

      const msg = new Record(col)
      msg.set('patient_id', rec.id)
      msg.set('message_text', text)
      msg.set('scheduled_at', new Date(when).toISOString())
      msg.set('status', 'pending')
      msg.set('source', 'implant')
      msg.set('cancel_on_return', !!t.getBool('only_if_no_return'))
      $app.save(msg)
    }

    // grava o vencimento calculado (sem re-disparar o hook em loop)
    const fresh = $app.findRecordById('patients', rec.id)
    const expIso = new Date(expMs).toISOString()
    if (fresh.getString('implant_expires_at') !== expIso) {
      $app
        .db()
        .newQuery('UPDATE patients SET implant_expires_at = {:v} WHERE id = {:id}')
        .bind({ v: expIso.replace('T', ' ').substring(0, 19) + 'Z', id: rec.id })
        .execute()
    }
    $app.logger().info('[implant] trilha agendada', 'patient', rec.id, 'vence', dataStr)
  } catch (err) {
    $app.logger().error('[implant] agendar falhou', 'patient', rec.id, 'error', err.message)
  }

  return e.next()
}, 'patients')
