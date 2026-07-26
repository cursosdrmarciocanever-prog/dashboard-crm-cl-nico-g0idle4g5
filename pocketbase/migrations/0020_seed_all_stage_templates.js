// Garante um template de follow-up para CADA estágio atual da jornada (13).
// Idempotente: mantém os que já existem (preserva enabled/texto editados),
// adiciona os que faltam (enabled=false p/ o médico revisar) e remove o
// template obsoleto 'exames_enviados' (renomeado p/ 'pedido_exames_enviados' na 0011).
migrate(
  (app) => {
    // remove template obsoleto
    try {
      const stale = app.findRecordsByFilter('stage_templates', "stage = 'exames_enviados'", '', 20, 0)
      for (const r of stale) app.delete(r)
    } catch (e) {
      // ignora
    }

    const col = app.findCollectionByNameOrId('stage_templates')

    const all = [
      {
        stage: 'novo_lead',
        text: 'Olá {nome}! 👋 Aqui é da Clínica Canever. Recebemos sua mensagem e em breve retornamos. Se preferir, já pode nos contar como podemos ajudar. 😊',
      },
      {
        stage: 'agendamento_confirmado',
        text: 'Olá {nome}! Sua consulta está confirmada. ✅ Qualquer dúvida, é só responder por aqui.',
      },
      {
        stage: 'pedido_exames_enviados',
        text: 'Olá {nome}! O pedido de exames foi enviado. Assim que realizá-los, envie os resultados por aqui para o Dr. Marcio analisar. 📄',
      },
      {
        stage: 'exames_recebidos_parcialmente',
        text: 'Olá {nome}! Recebemos parte dos seus exames, obrigado! 🙏 Faltam alguns — quando puder, envie o restante por aqui.',
      },
      {
        stage: 'exames_recebidos_completos',
        text: 'Olá {nome}! Recebemos todos os seus exames. ✅ O Dr. Marcio vai analisá-los e retornamos em breve.',
      },
      {
        stage: 'exames_enviados_dr_marcio',
        text: 'Olá {nome}! Seus exames já estão com o Dr. Marcio para análise. 👨‍⚕️ Em breve retornamos com o parecer.',
      },
      {
        stage: 'exames_recebidos_dr_marcio_vistos',
        text: 'Olá {nome}! O Dr. Marcio já analisou seus exames. Vamos dar o próximo passo — logo entramos em contato. 😊',
      },
      {
        stage: 'exames_anexados',
        text: 'Olá {nome}! Seus exames foram anexados ao seu prontuário. ✅',
      },
      {
        stage: 'questionario_enviado',
        text: 'Olá {nome}! Enviamos um breve questionário. Poderia respondê-lo quando puder? Ajuda muito na sua consulta. 🙏',
      },
      {
        stage: 'questionario_respondido',
        text: 'Olá {nome}! Recebemos seu questionário respondido, muito obrigado! 🙏 Isso ajuda bastante na sua consulta.',
      },
      {
        stage: 'consulta_realizada',
        text: 'Olá {nome}! Foi um prazer te atender. 😊 Qualquer dúvida sobre as orientações da consulta, estamos por aqui.',
      },
      {
        stage: 'novo_pedido_exames_fornecido',
        text: 'Olá {nome}! Um novo pedido de exames foi disponibilizado para você. Assim que realizá-los, envie os resultados por aqui. 📄',
      },
      {
        stage: 'proxima_consulta_agendada',
        text: 'Olá {nome}! Sua próxima consulta já está agendada. ✅ Enviaremos um lembrete quando estiver próxima.',
      },
    ]

    for (const t of all) {
      const existing = app.findRecordsByFilter(
        'stage_templates',
        'stage = {:s}',
        '',
        1,
        0,
        { s: t.stage },
      )
      if (existing.length) continue // já existe — preserva edições do médico

      const rec = new Record(col)
      rec.set('stage', t.stage)
      rec.set('message_text', t.text)
      rec.set('enabled', false) // médico revisa e ativa em Automações
      rec.set('delay_minutes', 0)
      app.save(rec)
    }
  },
  (app) => {
    // sem reversao: nao removemos templates
  },
)
