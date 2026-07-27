// Papéis de usuário: 'admin' (Dr. Márcio) e 'secretaria'.
//
// A secretaria usa o CRM no dia a dia (ver pacientes, responder WhatsApp,
// agendar, marcar retorno de implante), mas NÃO pode excluir pacientes nem
// mexer nas automações e configurações da clínica.
//
// As regras abaixo negam explicitamente quem é 'secretaria' — quem não tem
// papel definido continua com acesso total, para nao travar o acesso atual.
const DENY_SECRETARIA = '@request.auth.id != "" && @request.auth.role != "secretaria"'

migrate(
  (app) => {
    // 1. Campo `role` na coleção de usuários
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          values: ['admin', 'secretaria'],
          maxSelect: 1,
        }),
      )
      app.save(users)

      // Usuários que já existem viram admin (hoje só o Dr. Márcio usa)
      app.db().newQuery("UPDATE users SET role = 'admin' WHERE role = '' OR role IS NULL").execute()
    }

    // 2. Excluir paciente: só admin (dado clínico, não dá para desfazer)
    const patients = app.findCollectionByNameOrId('patients')
    patients.deleteRule = DENY_SECRETARIA
    app.save(patients)

    // 3. Automações e configurações da clínica: só admin
    for (const name of [
      'settings',
      'stage_templates',
      'appointment_reminders',
      'implant_reminders',
    ]) {
      try {
        const col = app.findCollectionByNameOrId(name)
        col.updateRule = DENY_SECRETARIA
        col.createRule = DENY_SECRETARIA
        col.deleteRule = DENY_SECRETARIA
        app.save(col)
      } catch (e) {
        // coleção ainda não existe nesta base — segue
      }
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    if (users.fields.getByName('role')) {
      users.fields.removeByName('role')
      app.save(users)
    }

    const authed = '@request.auth.id != ""'
    const patients = app.findCollectionByNameOrId('patients')
    patients.deleteRule = authed
    app.save(patients)

    for (const name of [
      'settings',
      'stage_templates',
      'appointment_reminders',
      'implant_reminders',
    ]) {
      try {
        const col = app.findCollectionByNameOrId(name)
        col.updateRule = authed
        col.createRule = authed
        col.deleteRule = authed
        app.save(col)
      } catch (e) {
        // ignora
      }
    }
  },
)
