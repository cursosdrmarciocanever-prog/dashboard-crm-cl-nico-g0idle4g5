// "Próxima Consulta Agendada" passa a exigir data e hora.
//
// Ao incluir {data} e {hora} no texto, este estágio entra automaticamente na
// regra do stage_followup: se o paciente for movido para cá SEM consulta futura
// marcada, nada e enviado; a mensagem sai pelo appointment_confirmation assim
// que a consulta for criada, ja com data e hora reais.
//
// Tambem ativa o template — antes estava inativo e nao enviava nada.
const TEXTO_ANTIGO =
  'Olá {nome}! Sua próxima consulta já está agendada. ✅ Enviaremos um lembrete quando estiver próxima.'
const TEXTO_NOVO =
  'Olá {nome}! Sua próxima consulta está agendada para {data} às {hora}. ✅ Enviaremos um lembrete quando estiver próxima.'

migrate(
  (app) => {
    const recs = app.findRecordsByFilter(
      'stage_templates',
      'stage = {:stage}',
      '',
      1,
      0,
      { stage: 'proxima_consulta_agendada' },
    )
    if (!recs.length) return

    const rec = recs[0]
    const atual = rec.getString('message_text')

    // So reescreve se ainda for o texto padrao — respeita edicao feita no app.
    if (atual.trim() === TEXTO_ANTIGO.trim()) {
      rec.set('message_text', TEXTO_NOVO)
    } else if (atual.indexOf('{data}') < 0 && atual.indexOf('{hora}') < 0) {
      // Texto personalizado e sem as variaveis: acrescenta a frase da data para
      // que a regra de obrigatoriedade valha tambem nesse caso.
      rec.set('message_text', atual.trim() + ' Data: {data} às {hora}.')
    }

    rec.set('enabled', true)
    app.save(rec)
  },
  (app) => {
    const recs = app.findRecordsByFilter(
      'stage_templates',
      'stage = {:stage}',
      '',
      1,
      0,
      { stage: 'proxima_consulta_agendada' },
    )
    if (!recs.length) return
    const rec = recs[0]
    rec.set('message_text', TEXTO_ANTIGO)
    rec.set('enabled', false)
    app.save(rec)
  },
)
