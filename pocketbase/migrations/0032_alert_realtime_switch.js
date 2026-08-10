// Liga/desliga os avisos IMEDIATOS (lead novo, consulta marcada/cancelada/
// remarcada). Desligado, o dia inteiro sai de uma vez no relatorio das 20:00.
//
// Comeca DESLIGADO: o pedido foi justamente parar de disparar o tempo todo.
// Quem quiser os avisos na hora liga na tela de Configuracoes.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('settings')
    if (!col.fields.getByName('alert_realtime')) {
      col.fields.add(new BoolField({ name: 'alert_realtime', required: false }))
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('settings')
    const campo = col.fields.getByName('alert_realtime')
    if (campo) {
      col.fields.removeById(campo.id)
      app.save(col)
    }
  },
)
