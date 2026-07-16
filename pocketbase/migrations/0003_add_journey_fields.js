migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('patients')

    if (!col.fields.getByName('journey_stage')) {
      col.fields.add(
        new SelectField({
          name: 'journey_stage',
          values: [
            'lead',
            'appointment_confirmed',
            'exams_sent',
            'exams_received',
            'questionnaire_sent',
            'questionnaire_answered',
          ],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('last_contact_date')) {
      col.fields.add(new DateField({ name: 'last_contact_date' }))
    }

    if (!col.fields.getByName('exams_sent_flag')) {
      col.fields.add(new BoolField({ name: 'exams_sent_flag' }))
    }

    if (!col.fields.getByName('exams_received_flag')) {
      col.fields.add(new BoolField({ name: 'exams_received_flag' }))
    }

    if (!col.fields.getByName('anamnesis_sent_flag')) {
      col.fields.add(new BoolField({ name: 'anamnesis_sent_flag' }))
    }

    if (!col.fields.getByName('questionnaire_answered_flag')) {
      col.fields.add(new BoolField({ name: 'questionnaire_answered_flag' }))
    }

    col.addIndex('idx_patients_journey_stage', false, 'journey_stage', '')

    app.save(col)

    app
      .db()
      .newQuery(
        "UPDATE patients SET journey_stage = 'lead' WHERE journey_stage IS NULL OR journey_stage = ''",
      )
      .execute()
  },
  (app) => {},
)
