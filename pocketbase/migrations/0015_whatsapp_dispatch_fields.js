// Adiciona controle de envio ao scheduled_messages para o disparador de WhatsApp:
// - status ganha o valor 'failed'
// - sent_at: quando foi efetivamente enviada
// - error_detail: motivo da falha (se houver)
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('scheduled_messages')

    const status = col.fields.getByName('status')
    if (status) {
      status.values = ['pending', 'sent', 'cancelled', 'failed']
    }

    if (!col.fields.getByName('sent_at')) {
      col.fields.add(new DateField({ name: 'sent_at' }))
    }
    if (!col.fields.getByName('error_detail')) {
      col.fields.add(new TextField({ name: 'error_detail' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('scheduled_messages')

    const status = col.fields.getByName('status')
    if (status) {
      status.values = ['pending', 'sent', 'cancelled']
    }
    if (col.fields.getByName('sent_at')) {
      col.fields.removeByName('sent_at')
    }
    if (col.fields.getByName('error_detail')) {
      col.fields.removeByName('error_detail')
    }

    app.save(col)
  },
)
