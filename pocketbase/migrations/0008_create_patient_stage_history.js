migrate(
  (app) => {
    const patientsCollectionId = app.findCollectionByNameOrId('patients').id

    const collection = new Collection({
      name: 'patient_stage_history',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          collectionId: patientsCollectionId,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'stage',
          type: 'select',
          values: [
            'novo_lead',
            'agendamento_confirmado',
            'exames_enviados',
            'exames_recebidos',
            'questionario_enviado',
            'questionario_respondido',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'entered_at', type: 'date', required: true },
        { name: 'exited_at', type: 'date', required: false },
        { name: 'duration_hours', type: 'number', required: false, onlyInt: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_patient_stage_history_patient ON patient_stage_history (patient_id)',
        'CREATE INDEX idx_patient_stage_history_stage ON patient_stage_history (stage)',
        'CREATE INDEX idx_patient_stage_history_exited ON patient_stage_history (exited_at)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('patient_stage_history')
    app.delete(col)
  },
)
