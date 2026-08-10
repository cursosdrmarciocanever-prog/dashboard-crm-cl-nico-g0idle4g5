// Solicitacoes de receita: a secretaria registra o pedido, o medico aprova ou
// reprova.
//
// A regra que importa esta nas permissoes, nao na tela: `updateRule` nega a
// secretaria, entao SO o medico consegue mudar o status. Esconder o botao na
// interface nao bastaria — a API continuaria aceitando.
//
// A mesma expressao usada na migration 0027 (`role != "secretaria"`), para nao
// inventar sintaxe nova numa regra que, se estiver errada, derruba o PocketBase
// na subida.
const DENY_SECRETARIA = '@request.auth.id != "" && @request.auth.role != "secretaria"'
const AUTENTICADO = '@request.auth.id != ""'

migrate(
  (app) => {
    const patients = app.findCollectionByNameOrId('patients')

    const col = new Collection({
      name: 'prescription_requests',
      type: 'base',
      listRule: AUTENTICADO,
      viewRule: AUTENTICADO,
      createRule: AUTENTICADO, // a secretaria abre o pedido
      updateRule: DENY_SECRETARIA, // so o medico decide
      deleteRule: DENY_SECRETARIA, // pedido de receita nao se apaga por engano
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          collectionId: patients.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        { name: 'medication', type: 'text', required: true },
        // As duas datas vem preenchidas do calendario quando existem, mas ficam
        // editaveis: paciente antigo pode ter consulta que o CRM nao conhece.
        { name: 'last_visit_at', type: 'date', required: false },
        { name: 'next_visit_at', type: 'date', required: false },
        {
          name: 'status',
          type: 'select',
          values: ['pending', 'approved', 'rejected'],
          maxSelect: 1,
          required: true,
        },
        { name: 'requested_by', type: 'text', required: false }, // quem abriu
        { name: 'decided_by', type: 'text', required: false }, // quem decidiu
        { name: 'decided_at', type: 'date', required: false },
        { name: 'decision_note', type: 'text', required: false }, // motivo da recusa
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_prescription_status ON prescription_requests (status)',
        'CREATE INDEX idx_prescription_patient ON prescription_requests (patient_id)',
      ],
    })

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('prescription_requests')
    app.delete(col)
  },
)
