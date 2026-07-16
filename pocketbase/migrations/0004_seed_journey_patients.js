migrate(
  (app) => {
    let admin
    try {
      admin = app.findAuthRecordByEmail('_pb_users_auth_', 'marciocanever@hotmail.com')
    } catch (_) {
      return
    }

    const patientsCol = app.findCollectionByNameOrId('patients')

    const journeyPatients = [
      {
        name: 'Carlos Silva',
        phone: '(11) 98888-1111',
        last_contact_date: '2023-10-25 10:00:00.000Z',
        journey_stage: 'lead',
        status: 'ativo',
        exams_sent_flag: false,
        exams_received_flag: false,
        anamnesis_sent_flag: false,
        questionnaire_answered_flag: false,
      },
      {
        name: 'Mariana Oliveira',
        phone: '(11) 97777-2222',
        last_contact_date: '2023-10-26 14:00:00.000Z',
        journey_stage: 'exams_sent',
        status: 'ativo',
        exams_sent_flag: true,
        exams_received_flag: false,
        anamnesis_sent_flag: false,
        questionnaire_answered_flag: false,
      },
      {
        name: 'Roberto Santos',
        phone: '(11) 96666-3333',
        last_contact_date: '2023-10-27 16:00:00.000Z',
        journey_stage: 'questionnaire_answered',
        status: 'ativo',
        exams_sent_flag: true,
        exams_received_flag: true,
        anamnesis_sent_flag: true,
        questionnaire_answered_flag: true,
      },
    ]

    for (const p of journeyPatients) {
      try {
        app.findFirstRecordByData('patients', 'name', p.name)
      } catch (_) {
        const record = new Record(patientsCol)
        record.set('name', p.name)
        record.set('phone', p.phone)
        record.set('last_contact_date', p.last_contact_date)
        record.set('journey_stage', p.journey_stage)
        record.set('status', p.status)
        record.set('doctor_id', admin.id)
        record.set('exams_sent_flag', p.exams_sent_flag)
        record.set('exams_received_flag', p.exams_received_flag)
        record.set('anamnesis_sent_flag', p.anamnesis_sent_flag)
        record.set('questionnaire_answered_flag', p.questionnaire_answered_flag)
        app.save(record)
      }
    }
  },
  (app) => {},
)
