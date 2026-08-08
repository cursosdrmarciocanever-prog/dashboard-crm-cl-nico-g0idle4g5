// Nova etapa "Paciente Interessado", entre "Novo Lead" e "Agendamento Confirmado".
//
// É o lead que respondeu e demonstrou interesse, mas ainda não tem consulta
// marcada — antes disso ele some no meio dos leads frios.
//
// OBS sobre a alteracao do campo: as migrations antigas (0010/0011/0012)
// removiam o SelectField e criavam outro com o mesmo nome. Aqui a lista de
// valores e alterada NO LUGAR, mantendo o id do campo. Remover e recriar gera
// um campo novo e poe em risco o journey_stage dos pacientes ja cadastrados —
// com dados reais em producao isso nao vale o risco.
const STAGES = [
  'novo_lead',
  'paciente_interessado',
  'agendamento_confirmado',
  'pedido_exames_enviados',
  'exames_recebidos_parcialmente',
  'exames_recebidos_completos',
  'exames_enviados_dr_marcio',
  'exames_recebidos_dr_marcio_vistos',
  'exames_anexados',
  'questionario_enviado',
  'questionario_respondido',
  'consulta_realizada',
  'novo_pedido_exames_fornecido',
  'proxima_consulta_agendada',
]

const SEM_INTERESSADO = STAGES.filter((s) => s !== 'paciente_interessado')

const TEXTO_TEMPLATE =
  'Olá {nome}! Que bom que se interessou pela Clínica Canever. 😊 Quer que eu já veja um horário para a sua consulta?'

function aplicarValores(app, valores) {
  const alvos = [
    { colecao: 'patients', campo: 'journey_stage' },
    { colecao: 'patient_stage_history', campo: 'stage' },
  ]
  for (const alvo of alvos) {
    const col = app.findCollectionByNameOrId(alvo.colecao)
    const campo = col.fields.getByName(alvo.campo)
    if (!campo) continue
    campo.values = valores
    app.save(col)
  }
}

migrate(
  (app) => {
    aplicarValores(app, STAGES)

    // Template da automacao: criado DESLIGADO. Ligar e decisao do medico —
    // uma automacao nova ativa sozinha comeca a mandar WhatsApp sem aviso.
    const existentes = app.findRecordsByFilter(
      'stage_templates',
      'stage = {:stage}',
      '',
      1,
      0,
      { stage: 'paciente_interessado' },
    )
    if (!existentes.length) {
      const col = app.findCollectionByNameOrId('stage_templates')
      const rec = new Record(col)
      rec.set('stage', 'paciente_interessado')
      rec.set('message_text', TEXTO_TEMPLATE)
      rec.set('delay_minutes', 0)
      rec.set('enabled', false)
      app.save(rec)
    }
  },
  (app) => {
    // Volta os pacientes que estiverem na etapa nova para 'novo_lead', senao
    // ficariam com um valor que o campo nao aceita mais.
    const orfaos = app.findRecordsByFilter(
      'patients',
      'journey_stage = {:stage}',
      '',
      5000,
      0,
      { stage: 'paciente_interessado' },
    )
    for (const p of orfaos) {
      p.set('journey_stage', 'novo_lead')
      app.save(p)
    }

    const tpls = app.findRecordsByFilter('stage_templates', 'stage = {:stage}', '', 5, 0, {
      stage: 'paciente_interessado',
    })
    for (const t of tpls) app.delete(t)

    aplicarValores(app, SEM_INTERESSADO)
  },
)
