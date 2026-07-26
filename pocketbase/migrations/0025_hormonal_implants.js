// Módulo de Implantes Hormonais.
// - patients ganha: implant_active, implant_placed_at, implant_duration_months,
//   implant_expires_at (calculado), implant_returned_at
// - colecao `implant_reminders`: templates ancorados no VENCIMENTO
//   (offset_days negativo = antes; 0 = no dia) + o template de retorno
//   (kind='return', enviado quando a paciente é marcada como retornada)
migrate(
  (app) => {
    // 1) campos no paciente
    const col = app.findCollectionByNameOrId('patients')
    if (!col.fields.getByName('implant_active')) {
      col.fields.add(new BoolField({ name: 'implant_active' }))
    }
    if (!col.fields.getByName('implant_placed_at')) {
      col.fields.add(new DateField({ name: 'implant_placed_at' }))
    }
    if (!col.fields.getByName('implant_duration_months')) {
      col.fields.add(new NumberField({ name: 'implant_duration_months' }))
    }
    if (!col.fields.getByName('implant_expires_at')) {
      col.fields.add(new DateField({ name: 'implant_expires_at' }))
    }
    if (!col.fields.getByName('implant_returned_at')) {
      col.fields.add(new DateField({ name: 'implant_returned_at' }))
    }
    app.save(col)

    // 1b) rastreio dos lembretes de implante em scheduled_messages
    const sched = app.findCollectionByNameOrId('scheduled_messages')
    if (!sched.fields.getByName('source')) {
      sched.fields.add(new TextField({ name: 'source' })) // 'implant' etc.
    }
    if (!sched.fields.getByName('cancel_on_return')) {
      sched.fields.add(new BoolField({ name: 'cancel_on_return' }))
    }
    app.save(sched)

    // 2) templates dos lembretes de implante
    const rem = new Collection({
      name: 'implant_reminders',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'message_text', type: 'text', required: true },
        { name: 'offset_days', type: 'number', required: false },
        // schedule = agendado pelo vencimento | return = disparado ao marcar retorno
        { name: 'kind', type: 'select', values: ['schedule', 'return'], maxSelect: 1, required: true },
        // se true, só envia se a paciente AINDA NÃO retornou
        { name: 'only_if_no_return', type: 'bool', required: false },
        { name: 'enabled', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_implant_reminders_label ON implant_reminders (label)'],
    })
    app.save(rem)

    const seed = [
      {
        label: '30 dias antes do vencimento',
        kind: 'schedule',
        offset_days: -30,
        only_if_no_return: false,
        enabled: true,
        message_text:
          'Olá {nome}! 😊 Passando para lembrar que seu implante hormonal vence em {data}. Vamos agendar seu retorno? É só responder por aqui.',
      },
      {
        label: '15 dias antes (só quem não retornou)',
        kind: 'schedule',
        offset_days: -15,
        only_if_no_return: true,
        enabled: true,
        message_text:
          'Olá {nome}! Seu implante hormonal vence em {data} — faltam 15 dias. 🗓️ Quer que eu já reserve um horário para você?',
      },
      {
        label: 'No dia do vencimento (só quem não retornou)',
        kind: 'schedule',
        offset_days: 0,
        only_if_no_return: true,
        enabled: true,
        message_text:
          'Olá {nome}! Hoje é a data de vencimento do seu implante hormonal. 💙 Vamos agendar a troca? Estamos à disposição.',
      },
      {
        label: 'Retorno — lista de exames',
        kind: 'return',
        offset_days: 0,
        only_if_no_return: false,
        enabled: true,
        message_text:
          'Que bom, {nome}! 😊 Antes da troca do implante, precisamos destes exames:\n\n• Hemograma completo\n• Glicemia de jejum\n• Colesterol total e frações\n• TGO / TGP\n• TSH\n• Estradiol e Testosterona total\n\nPode enviar os resultados por aqui assim que tiver. Qualquer dúvida, estou à disposição!',
      },
    ]

    for (const s of seed) {
      const r = new Record(rem)
      r.set('label', s.label)
      r.set('message_text', s.message_text)
      r.set('offset_days', s.offset_days)
      r.set('kind', s.kind)
      r.set('only_if_no_return', s.only_if_no_return)
      r.set('enabled', s.enabled)
      app.save(r)
    }
  },
  (app) => {
    const rem = app.findCollectionByNameOrId('implant_reminders')
    app.delete(rem)

    const sched = app.findCollectionByNameOrId('scheduled_messages')
    for (const f of ['source', 'cancel_on_return']) {
      if (sched.fields.getByName(f)) sched.fields.removeByName(f)
    }
    app.save(sched)

    const col = app.findCollectionByNameOrId('patients')
    for (const f of [
      'implant_active',
      'implant_placed_at',
      'implant_duration_months',
      'implant_expires_at',
      'implant_returned_at',
    ]) {
      if (col.fields.getByName(f)) col.fields.removeByName(f)
    }
    app.save(col)
  },
)
