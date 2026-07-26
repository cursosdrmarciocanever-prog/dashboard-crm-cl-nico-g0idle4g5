// Lembretes de consulta ancorados na data do agendamento.
// - Colecao `appointment_reminders`: templates com offset_hours relativo à
//   data/hora da consulta (negativo = antes; positivo = depois).
// - scheduled_messages ganha `appointment_id` para rastrear/reagendar/cancelar
//   os lembretes de cada consulta.
migrate(
  (app) => {
    // 1) coleção de templates de lembrete
    const col = new Collection({
      name: 'appointment_reminders',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'message_text', type: 'text', required: true },
        { name: 'offset_hours', type: 'number', required: false },
        { name: 'enabled', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_appointment_reminders_label ON appointment_reminders (label)'],
    })
    app.save(col)

    const seed = [
      {
        label: '3 dias antes',
        offset_hours: -72,
        enabled: false,
        message_text:
          'Olá {nome}! 😊 Passando para lembrar da sua consulta na Clínica Canever no dia {data} às {hora}. Nos vemos em breve!',
      },
      {
        label: '1 dia antes',
        offset_hours: -24,
        enabled: true,
        message_text:
          'Olá {nome}! Sua consulta é amanhã, dia {data} às {hora}. Qualquer imprevisto, é só responder por aqui. 🙏',
      },
      {
        label: '2 horas antes',
        offset_hours: -2,
        enabled: true,
        message_text: 'Olá {nome}! Sua consulta é hoje às {hora}. Já estamos te esperando! 😊',
      },
      {
        label: 'Retorno (1 dia depois)',
        offset_hours: 24,
        enabled: false,
        message_text:
          'Olá {nome}! Como você está após a consulta? 💙 Qualquer dúvida sobre as orientações, estamos por aqui.',
      },
    ]
    for (const s of seed) {
      const rec = new Record(col)
      rec.set('label', s.label)
      rec.set('message_text', s.message_text)
      rec.set('offset_hours', s.offset_hours)
      rec.set('enabled', s.enabled)
      app.save(rec)
    }

    // 2) appointment_id em scheduled_messages
    const sched = app.findCollectionByNameOrId('scheduled_messages')
    if (!sched.fields.getByName('appointment_id')) {
      const apptCol = app.findCollectionByNameOrId('appointments')
      sched.fields.add(
        new RelationField({
          name: 'appointment_id',
          collectionId: apptCol.id,
          cascadeDelete: true,
          maxSelect: 1,
          required: false,
        }),
      )
      app.save(sched)
    }
  },
  (app) => {
    const sched = app.findCollectionByNameOrId('scheduled_messages')
    if (sched.fields.getByName('appointment_id')) {
      sched.fields.removeByName('appointment_id')
      app.save(sched)
    }
    const col = app.findCollectionByNameOrId('appointment_reminders')
    app.delete(col)
  },
)
