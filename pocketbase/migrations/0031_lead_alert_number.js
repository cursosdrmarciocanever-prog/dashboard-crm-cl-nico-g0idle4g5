// Numero que recebe o aviso de lead novo, junto das outras configuracoes da
// clinica — nao em variavel de ambiente. Assim da para trocar pela tela de
// Configuracoes, inclusive do celular, sem SSH nem rebuild do container.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('settings')
    if (!col.fields.getByName('alert_whatsapp')) {
      col.fields.add(new TextField({ name: 'alert_whatsapp', required: false }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('settings')
    const campo = col.fields.getByName('alert_whatsapp')
    if (campo) {
      col.fields.removeById(campo.id)
      app.save(col)
    }
  },
)
