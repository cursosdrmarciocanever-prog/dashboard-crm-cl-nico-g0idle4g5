// Ativa o follow-up de "agendamento confirmado" com data/hora da consulta.
// O hook stage_followup agora preenche {data} e {hora} a partir do agendamento.
migrate(
  (app) => {
    try {
      const recs = app.findRecordsByFilter(
        'stage_templates',
        "stage = 'agendamento_confirmado'",
        '',
        1,
        0,
      )
      if (recs.length) {
        const r = recs[0]
        r.set(
          'message_text',
          'Olá {nome}! Sua consulta está confirmada para o dia {data} às {hora}. ✅ Qualquer dúvida, é só responder por aqui.',
        )
        r.set('enabled', true)
        app.save(r)
      }
    } catch (e) {
      // ignora
    }
  },
  (app) => {
    // sem reversao
  },
)
