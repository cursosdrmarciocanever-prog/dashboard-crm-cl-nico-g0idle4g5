migrate(
  (app) => {
    const patients = new Collection({
      name: 'patients',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'phone', type: 'text' },
        { name: 'last_visit', type: 'date' },
        {
          name: 'status',
          type: 'select',
          values: ['ativo', 'concluido', 'inativo'],
          maxSelect: 1,
          required: true,
        },
        {
          name: 'doctor_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          cascadeDelete: false,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_patients_name ON patients (name)',
        'CREATE INDEX idx_patients_status ON patients (status)',
      ],
    })
    app.save(patients)

    const appointments = new Collection({
      name: 'appointments',
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
          collectionId: patients.id,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        { name: 'appointment_date', type: 'date', required: true },
        { name: 'notes', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['scheduled', 'completed', 'cancelled'],
          maxSelect: 1,
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_appointments_date ON appointments (appointment_date)'],
    })
    app.save(appointments)
  },
  (app) => {
    const appointments = app.findCollectionByNameOrId('appointments')
    app.delete(appointments)
    const patients = app.findCollectionByNameOrId('patients')
    app.delete(patients)
  },
)
