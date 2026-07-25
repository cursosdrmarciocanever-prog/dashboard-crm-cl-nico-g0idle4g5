// Remove todos os dados de DEMONSTRACAO (seeds) para a clinica comecar do zero.
// Limpa: patients, appointments, scheduled_messages, patient_stage_history.
// PRESERVA: users (login) e settings (config da clinica).
//
// Roda uma unica vez. Como executa DEPOIS dos seeds (0002..0013), garante que
// qualquer deploy novo tambem nasca sem dados de exemplo.
migrate(
  (app) => {
    const collectionsToClear = [
      'scheduled_messages',
      'patient_stage_history',
      'appointments',
      'patients',
    ]

    for (const name of collectionsToClear) {
      let records = []
      try {
        records = app.findAllRecords(name)
      } catch (err) {
        continue // colecao inexistente — ignora
      }
      for (const r of records) {
        app.delete(r)
      }
    }
  },
  (app) => {
    // Irreversivel de proposito: nao recriamos os dados de demonstracao.
  },
)
