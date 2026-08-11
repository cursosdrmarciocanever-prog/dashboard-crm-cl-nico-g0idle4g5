// Bloqueios da agenda: dias e horarios em que a clinica nao atende.
//
// Congresso, ferias, feriado, uma tarde de compromisso. Sem isso a unica forma
// de "fechar" um dia era lembrar de nao marcar nada nele — e quem marca nem
// sempre e quem sabe.
//
// Um bloqueio e sempre um intervalo entre dois instantes. Dia inteiro guarda do
// comeco do primeiro dia ao fim do ultimo (uma semana de ferias e UM registro,
// nao sete). Bloqueio de horario guarda a faixa dentro de um dia so. O campo
// all_day existe para a tela saber como mostrar, nao para calcular: a conta de
// sobreposicao usa sempre starts_at e ends_at.
//
// Regras: qualquer usuario autenticado cria e apaga. Quem fecha a agenda na
// pratica e a secretaria, anotando o compromisso do medico — restringir ao
// medico deixaria o recurso sem uso no dia a dia.
const AUTENTICADO = '@request.auth.id != ""'

migrate(
  (app) => {
    const col = new Collection({
      name: 'agenda_blocks',
      type: 'base',
      listRule: AUTENTICADO,
      viewRule: AUTENTICADO,
      createRule: AUTENTICADO,
      updateRule: AUTENTICADO,
      deleteRule: AUTENTICADO,
      fields: [
        { name: 'starts_at', type: 'date', required: true },
        { name: 'ends_at', type: 'date', required: true },
        { name: 'all_day', type: 'bool', required: false },
        // Aparece no calendario e no aviso de recusa: "Bloqueado — Congresso".
        { name: 'reason', type: 'text', required: false },
        { name: 'created_by', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      // O calendario busca por mes: sempre uma janela sobre starts_at.
      indexes: ['CREATE INDEX idx_agenda_blocks_starts ON agenda_blocks (starts_at)'],
    })

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('agenda_blocks')
    app.delete(col)
  },
)
