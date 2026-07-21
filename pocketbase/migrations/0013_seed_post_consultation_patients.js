migrate(
  (app) => {
    let admin
    try {
      admin = app.findAuthRecordByEmail('_pb_users_auth_', 'marciocanever@hotmail.com')
    } catch (_) {
      return
    }

    var patientsCol = app.findCollectionByNameOrId('patients')

    var seedPatients = [
      {
        name: 'Fernanda Ribeiro',
        phone: '(11) 95544-3322',
        last_contact_date: new Date().toISOString(),
        journey_stage: 'consulta_realizada',
        status: 'ativo',
        exams_sent_flag: true,
        exams_received_flag: true,
        anamnesis_sent_flag: true,
        questionnaire_answered_flag: true,
        traffic_platform: 'Instagram',
        campaign_name: 'Campanha Endócrina Outubro',
      },
      {
        name: 'Ricardo Mendes',
        phone: '(11) 94433-2211',
        last_contact_date: new Date().toISOString(),
        journey_stage: 'novo_pedido_exames_fornecido',
        status: 'ativo',
        exams_sent_flag: true,
        exams_received_flag: true,
        anamnesis_sent_flag: true,
        questionnaire_answered_flag: true,
        traffic_platform: 'Facebook',
        campaign_name: 'Campanha Metabólica',
      },
    ]

    for (var i = 0; i < seedPatients.length; i++) {
      var p = seedPatients[i]
      try {
        app.findFirstRecordByData('patients', 'name', p.name)
      } catch (_) {
        var record = new Record(patientsCol)
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
        record.set('traffic_platform', p.traffic_platform)
        record.set('campaign_name', p.campaign_name)
        app.save(record)
      }
    }
  },
  (app) => {},
)
