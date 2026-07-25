// Limpeza definitiva dos dados de demonstracao via SQL direto (a 0016 pode ter
// falhado silenciosamente dependendo da API de registros). Apaga as tabelas de
// dados; PRESERVA users (login) e settings (config da clinica).
migrate(
  (app) => {
    const tables = [
      'scheduled_messages',
      'patient_stage_history',
      'appointments',
      'patients',
    ]
    for (const t of tables) {
      try {
        app.db().newQuery('DELETE FROM ' + t).execute()
      } catch (err) {
        app.logger().warn('[0017] falha ao limpar tabela', 'table', t, 'error', err.message)
      }
    }
  },
  (app) => {
    // Irreversivel de proposito.
  },
)
