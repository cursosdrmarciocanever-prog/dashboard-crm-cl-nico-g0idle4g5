// Coleção `messages`: histórico de conversas de WhatsApp (entrada e saída),
// vinculado ao paciente. Alimenta o Inbox de Conversas do CRM.
//   direction: 'in' (recebida) | 'out' (enviada pela clínica)
//   status: 'received' | 'queued' | 'sent' | 'failed'
migrate(
  (app) => {
    const patientsCollectionId = app.findCollectionByNameOrId('patients').id

    const messages = new Collection({
      name: 'messages',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''", // front cria as mensagens de saida
      updateRule: null, // status so e atualizado pelos hooks do servidor
      deleteRule: null,
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          collectionId: patientsCollectionId,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        { name: 'phone', type: 'text', required: false },
        { name: 'direction', type: 'select', values: ['in', 'out'], maxSelect: 1, required: true },
        { name: 'text', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['received', 'queued', 'sent', 'failed'],
          maxSelect: 1,
          required: true,
        },
        { name: 'wa_message_id', type: 'text', required: false },
        { name: 'error_detail', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_messages_patient ON messages (patient_id)',
        'CREATE INDEX idx_messages_created ON messages (created)',
      ],
    })
    app.save(messages)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('messages')
    app.delete(col)
  },
)
