// Marca pacientes vindos de importacao em massa, para que os hooks de follow-up
// NAO disparem mensagem de boas-vindas (evita blast de WhatsApp em leads antigos).
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('patients')
    if (!col.fields.getByName('imported')) {
      col.fields.add(new BoolField({ name: 'imported' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('patients')
    if (col.fields.getByName('imported')) {
      col.fields.removeByName('imported')
    }
    app.save(col)
  },
)
