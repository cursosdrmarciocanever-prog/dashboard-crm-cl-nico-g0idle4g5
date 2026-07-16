migrate(
  (app) => {
    const patientsCollectionId = app.findCollectionByNameOrId('patients').id

    const scheduledMessages = new Collection({
      name: 'scheduled_messages',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'patient_id',
          type: 'relation',
          collectionId: patientsCollectionId,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        { name: 'message_text', type: 'text', required: true },
        { name: 'scheduled_at', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['pending', 'sent', 'cancelled'],
          maxSelect: 1,
          required: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_scheduled_messages_scheduled_at ON scheduled_messages (scheduled_at)',
        'CREATE INDEX idx_scheduled_messages_status ON scheduled_messages (status)',
      ],
    })
    app.save(scheduledMessages)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('scheduled_messages')
    app.delete(col)
  },
)
