migrate(
  (app) => {
    let admin
    try {
      admin = app.findAuthRecordByEmail('_pb_users_auth_', 'marciocanever@hotmail.com')
    } catch (_) {
      return
    }

    const patientsCol = app.findCollectionByNameOrId('patients')

    var newPatients = [
      {
        name: 'Juliana Ferreira',
        phone: '(11) 98123-4567',
        last_contact_date: '2024-01-15 09:00:00.000Z',
        journey_stage: 'novo_lead',
        status: 'ativo',
        traffic_platform: 'Instagram',
        campaign_name: 'Campanha Diabetes Tipo 2',
        ad_set_name: 'Mulheres 35-55 Sao Paulo',
        ad_name: 'Carrossel Sintomas Diabetes',
      },
      {
        name: 'Rafael Mendes',
        phone: '(11) 98234-5678',
        last_contact_date: '2024-01-16 11:00:00.000Z',
        journey_stage: 'agendamento_confirmado',
        status: 'ativo',
        traffic_platform: 'Facebook',
        campaign_name: 'Campanha Tireoide',
        ad_set_name: 'Adultos 30-60',
        ad_name: 'Video Hipotireoidismo',
      },
      {
        name: 'Camila Rodrigues',
        phone: '(11) 98345-6789',
        last_contact_date: '2024-01-17 14:00:00.000Z',
        journey_stage: 'exames_enviados',
        status: 'ativo',
        exams_sent_flag: true,
        traffic_platform: 'Google Ads',
        campaign_name: 'Campanha Emagrecimento',
        ad_set_name: 'Pesquisa Endocrinologista',
        ad_name: 'Anuncio Consulta Endocrino',
      },
      {
        name: 'Bruno Carvalho',
        phone: '(11) 98456-7890',
        last_contact_date: '2024-01-18 16:00:00.000Z',
        journey_stage: 'exames_recebidos',
        status: 'ativo',
        exams_sent_flag: true,
        exams_received_flag: true,
        traffic_platform: 'WhatsApp',
        campaign_name: 'Indicacao de Pacientes',
        ad_set_name: 'Lista de Transmissao',
        ad_name: 'Mensagem Direta',
      },
      {
        name: 'Patricia Gomes',
        phone: '(11) 98567-8901',
        last_contact_date: '2024-01-19 10:00:00.000Z',
        journey_stage: 'questionario_respondido',
        status: 'ativo',
        exams_sent_flag: true,
        exams_received_flag: true,
        anamnesis_sent_flag: true,
        questionnaire_answered_flag: true,
        traffic_platform: 'TikTok',
        campaign_name: 'Campanha Consciencia Tireoide',
        ad_set_name: 'Jovens Adultos 25-40',
        ad_name: 'Video Sintomas Tireoide',
      },
    ]

    var createdPatients = []

    for (var i = 0; i < newPatients.length; i++) {
      var p = newPatients[i]
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
        record.set('traffic_platform', p.traffic_platform)
        record.set('campaign_name', p.campaign_name)
        record.set('ad_set_name', p.ad_set_name)
        record.set('ad_name', p.ad_name)
        if (p.exams_sent_flag) record.set('exams_sent_flag', true)
        if (p.exams_received_flag) record.set('exams_received_flag', true)
        if (p.anamnesis_sent_flag) record.set('anamnesis_sent_flag', true)
        if (p.questionnaire_answered_flag) record.set('questionnaire_answered_flag', true)
        app.save(record)
        createdPatients.push(record)
      }
    }

    if (createdPatients.length < 2) return

    var messagesCol = app.findCollectionByNameOrId('scheduled_messages')

    var messages = [
      {
        patient_id: createdPatients[0].id,
        message_text:
          'Ola! Lembramos que sua consulta com o endocrinologista esta agendada. Por favor, chegue com 15 minutos de antecedencia.',
        scheduled_at: '2024-02-01 08:00:00.000Z',
        status: 'pending',
      },
      {
        patient_id: createdPatients[2] ? createdPatients[2].id : createdPatients[0].id,
        message_text:
          'Ola! Enviamos a lista de exames necessarios. Por favor, realize os exames e nos envie os resultados antes da consulta.',
        scheduled_at: '2024-01-25 10:00:00.000Z',
        status: 'pending',
      },
    ]

    for (var j = 0; j < messages.length; j++) {
      var m = messages[j]
      try {
        app.findFirstRecordByData('scheduled_messages', 'message_text', m.message_text)
      } catch (_) {
        var msgRecord = new Record(messagesCol)
        msgRecord.set('patient_id', m.patient_id)
        msgRecord.set('message_text', m.message_text)
        msgRecord.set('scheduled_at', m.scheduled_at)
        msgRecord.set('status', m.status)
        app.save(msgRecord)
      }
    }
  },
  (app) => {},
)
