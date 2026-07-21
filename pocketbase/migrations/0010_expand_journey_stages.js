migrate(
  (app) => {
    var newStageValues = [
      'novo_lead',
      'agendamento_confirmado',
      'exames_enviados',
      'exames_recebidos_parcialmente',
      'exames_recebidos_completos',
      'exames_enviados_dr_marcio',
      'exames_recebidos_dr_marcio_vistos',
      'exames_anexados',
      'questionario_enviado',
      'questionario_respondido',
    ]

    app
      .db()
      .newQuery(
        "UPDATE patients SET journey_stage = 'exames_recebidos_parcialmente' WHERE journey_stage = 'exames_recebidos'",
      )
      .execute()

    app
      .db()
      .newQuery(
        "UPDATE patient_stage_history SET stage = 'exames_recebidos_parcialmente' WHERE stage = 'exames_recebidos'",
      )
      .execute()

    var patientsCol = app.findCollectionByNameOrId('patients')
    var oldPatientField = patientsCol.fields.getByName('journey_stage')
    if (oldPatientField) {
      patientsCol.fields.removeById(oldPatientField.id)
    }
    patientsCol.fields.add(
      new SelectField({
        name: 'journey_stage',
        values: newStageValues,
        maxSelect: 1,
      }),
    )
    app.save(patientsCol)

    var historyCol = app.findCollectionByNameOrId('patient_stage_history')
    var oldHistoryField = historyCol.fields.getByName('stage')
    if (oldHistoryField) {
      historyCol.fields.removeById(oldHistoryField.id)
    }
    historyCol.fields.add(
      new SelectField({
        name: 'stage',
        values: newStageValues,
        maxSelect: 1,
        required: true,
      }),
    )
    app.save(historyCol)
  },
  (app) => {
    var oldStageValues = [
      'novo_lead',
      'agendamento_confirmado',
      'exames_enviados',
      'exames_recebidos',
      'questionario_enviado',
      'questionario_respondido',
    ]

    app
      .db()
      .newQuery(
        "UPDATE patients SET journey_stage = 'exames_recebidos' WHERE journey_stage = 'exames_recebidos_parcialmente'",
      )
      .execute()

    app
      .db()
      .newQuery(
        "UPDATE patient_stage_history SET stage = 'exames_recebidos' WHERE stage = 'exames_recebidos_parcialmente'",
      )
      .execute()

    var patientsCol = app.findCollectionByNameOrId('patients')
    var patientField = patientsCol.fields.getByName('journey_stage')
    if (patientField) {
      patientsCol.fields.removeById(patientField.id)
    }
    patientsCol.fields.add(
      new SelectField({
        name: 'journey_stage',
        values: oldStageValues,
        maxSelect: 1,
      }),
    )
    app.save(patientsCol)

    var historyCol = app.findCollectionByNameOrId('patient_stage_history')
    var historyField = historyCol.fields.getByName('stage')
    if (historyField) {
      historyCol.fields.removeById(historyField.id)
    }
    historyCol.fields.add(
      new SelectField({
        name: 'stage',
        values: oldStageValues,
        maxSelect: 1,
        required: true,
      }),
    )
    app.save(historyCol)
  },
)
