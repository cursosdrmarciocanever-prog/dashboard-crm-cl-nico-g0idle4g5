// Follow-up automático por estágio: quando o paciente ENTRA num estágio que tem
// template ativo (stage_templates), agenda uma mensagem em scheduled_messages;
// o disparador (wa_dispatcher) envia no horário.
//
// OBS JSVM: handlers rodam em contexto isolado — a lógica de agendamento fica
// inline dentro de cada handler (nao pode ser funcao do escopo do arquivo).

onRecordAfterCreateSuccess((e) => {
  // Nao agenda boas-vindas para leads importados em massa (evita blast).
  if (e.record.getBool('imported')) {
    return e.next()
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
      const text = tpl.getString('message_text').split('{nome}').join(firstName)
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
      const text = tpl.getString('message_text').split('{nome}').join(firstName)
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
}, 'patients')
