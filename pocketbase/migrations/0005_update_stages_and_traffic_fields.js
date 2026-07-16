migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('patients')

    app
      .db()
      .newQuery("UPDATE patients SET journey_stage = 'novo_lead' WHERE journey_stage = 'lead'")
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE patients SET journey_stage = 'agendamento_confirmado' WHERE journey_stage = 'appointment_confirmed'",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE patients SET journey_stage = 'exames_enviados' WHERE journey_stage = 'exams_sent'",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE patients SET journey_stage = 'exames_recebidos' WHERE journey_stage = 'exams_received'",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE patients SET journey_stage = 'questionario_enviado' WHERE journey_stage = 'questionnaire_sent'",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE patients SET journey_stage = 'questionario_respondido' WHERE journey_stage = 'questionnaire_answered'",
      )
      .execute()

    const oldField = col.fields.getByName('journey_stage')
    if (oldField) {
      col.fields.removeById(oldField.id)
    }
    col.fields.add(
      new SelectField({
        name: 'journey_stage',
        values: [
          'novo_lead',
          'agendamento_confirmado',
          'exames_enviados',
          'exames_recebidos',
          'questionario_enviado',
          'questionario_respondido',
        ],
        maxSelect: 1,
      }),
    )

    if (!col.fields.getByName('traffic_platform')) {
      col.fields.add(new TextField({ name: 'traffic_platform' }))
    }
    if (!col.fields.getByName('campaign_name')) {
      col.fields.add(new TextField({ name: 'campaign_name' }))
    }
    if (!col.fields.getByName('ad_set_name')) {
      col.fields.add(new TextField({ name: 'ad_set_name' }))
    }
    if (!col.fields.getByName('ad_name')) {
      col.fields.add(new TextField({ name: 'ad_name' }))
    }

    app.save(col)
  },
  (app) => {},
)
