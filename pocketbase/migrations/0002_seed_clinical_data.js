migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let admin
    try {
      admin = app.findAuthRecordByEmail('_pb_users_auth_', 'marciocanever@hotmail.com')
    } catch (_) {
      admin = new Record(users)
      admin.setEmail('marciocanever@hotmail.com')
      admin.setPassword('Skip@Pass')
      admin.setVerified(true)
      admin.set('name', 'Dr. Márcio Canever')
      app.save(admin)
    }

    const patientsCol = app.findCollectionByNameOrId('patients')
    const appointmentsCol = app.findCollectionByNameOrId('appointments')

    const patientsData = [
      {
        name: 'João Silva',
        phone: '(11) 98765-4321',
        last_visit: '2023-10-01 10:00:00.000Z',
        status: 'ativo',
      },
      {
        name: 'Maria Oliveira',
        phone: '(11) 91234-5678',
        last_visit: '2023-09-15 14:30:00.000Z',
        status: 'concluido',
      },
      {
        name: 'Carlos Santos',
        phone: '(11) 99988-7766',
        last_visit: '2023-10-10 09:15:00.000Z',
        status: 'ativo',
      },
      {
        name: 'Ana Costa',
        phone: '(11) 97766-5544',
        last_visit: '2023-08-20 16:00:00.000Z',
        status: 'inativo',
      },
      {
        name: 'Pedro Almeida',
        phone: '(11) 94455-6677',
        last_visit: '2023-10-05 11:45:00.000Z',
        status: 'ativo',
      },
    ]

    const seededPatients = []
    for (const p of patientsData) {
      let existing
      try {
        existing = app.findFirstRecordByData('patients', 'name', p.name)
        seededPatients.push(existing)
      } catch (_) {
        const record = new Record(patientsCol)
        record.set('name', p.name)
        record.set('phone', p.phone)
        record.set('last_visit', p.last_visit)
        record.set('status', p.status)
        record.set('doctor_id', admin.id)
        app.save(record)
        seededPatients.push(record)
      }
    }

    const today = new Date()
    const appointmentsData = [
      { patient_id: seededPatients[0].id, daysOffset: 0, status: 'scheduled' },
      { patient_id: seededPatients[1].id, daysOffset: 1, status: 'scheduled' },
      { patient_id: seededPatients[2].id, daysOffset: 2, status: 'scheduled' },
      { patient_id: seededPatients[3].id, daysOffset: 0, status: 'completed' },
      { patient_id: seededPatients[4].id, daysOffset: -1, status: 'cancelled' },
    ]

    for (const a of appointmentsData) {
      const d = new Date(today)
      d.setDate(today.getDate() + a.daysOffset)
      d.setHours(10, 0, 0, 0)
      const dateStr = d.toISOString().replace('T', ' ').replace('.000Z', '.000Z')

      try {
        app.findFirstRecordByFilter(
          'appointments',
          `patient_id = '${a.patient_id}' && appointment_date = '${dateStr}'`,
        )
      } catch (_) {
        const record = new Record(appointmentsCol)
        record.set('patient_id', a.patient_id)
        record.set('appointment_date', dateStr)
        record.set('status', a.status)
        record.set('notes', 'Consulta de rotina endócrina')
        app.save(record)
      }
    }
  },
  (app) => {
    // Safe down migration skipped for seeds to avoid removing user data
  },
)
