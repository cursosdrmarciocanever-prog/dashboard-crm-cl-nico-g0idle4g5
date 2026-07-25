// Templates de follow-up por estágio da jornada. Quando o paciente ENTRA num
// estágio com template `enabled`, o hook stage_followup agenda a mensagem.
//   {nome} no texto é substituído pelo primeiro nome do paciente.
//   delay_minutes: atraso do envio (0 = no próximo ciclo, ~1 min).
migrate(
  (app) => {
    const col = new Collection({
      name: 'stage_templates',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'stage', type: 'text', required: true },
        { name: 'message_text', type: 'text', required: true },
        { name: 'enabled', type: 'bool', required: false },
        { name: 'delay_minutes', type: 'number', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_stage_templates_stage ON stage_templates (stage)'],
    })
    app.save(col)

    const seed = [
      {
        stage: 'novo_lead',
        enabled: true,
        delay_minutes: 0,
        message_text:
          'Olá {nome}! 👋 Aqui é da Clínica Canever. Recebemos sua mensagem e em breve retornamos. Se preferir, já pode nos contar como podemos ajudar. 😊',
      },
      {
        stage: 'agendamento_confirmado',
        enabled: false,
        delay_minutes: 0,
        message_text:
          'Olá {nome}! Sua consulta está confirmada. ✅ Qualquer dúvida, é só responder por aqui.',
      },
      {
        stage: 'exames_enviados',
        enabled: false,
        delay_minutes: 0,
        message_text:
          'Olá {nome}! Quando puder, envie seus exames por aqui para o Dr. Marcio analisar. 📄',
      },
      {
        stage: 'questionario_enviado',
        enabled: false,
        delay_minutes: 0,
        message_text:
          'Olá {nome}! Enviamos um breve questionário. Poderia respondê-lo quando puder? Ajuda muito na sua consulta. 🙏',
      },
    ]

    for (const s of seed) {
      const rec = new Record(col)
      rec.set('stage', s.stage)
      rec.set('message_text', s.message_text)
      rec.set('enabled', s.enabled)
      rec.set('delay_minutes', s.delay_minutes)
      app.save(rec)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('stage_templates')
    app.delete(col)
  },
)
