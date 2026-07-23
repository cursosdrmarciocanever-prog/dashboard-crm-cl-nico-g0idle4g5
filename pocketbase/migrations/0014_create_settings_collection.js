// Cria a colecao `settings` (registro unico) para configuracoes da clinica
// editaveis pela tela de Configuracoes: numero de WhatsApp, mensagem de
// boas-vindas e nome da clinica. Substitui o valor hardcoded em src/config.ts.
migrate(
  (app) => {
    const settings = new Collection({
      name: 'settings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: null,
      fields: [
        { name: 'key', type: 'text', required: true },
        { name: 'clinic_name', type: 'text', required: false },
        { name: 'clinic_whatsapp', type: 'text', required: false },
        { name: 'welcome_message', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_settings_key ON settings (key)'],
    })
    app.save(settings)

    // Seed do registro unico de configuracao da clinica.
    const record = new Record(settings)
    record.set('key', 'clinic')
    record.set('clinic_name', 'Clínica Canever')
    record.set('clinic_whatsapp', '5544999999999')
    record.set('welcome_message', 'Olá! Vim pelo site da clínica e gostaria de mais informações.')
    app.save(record)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('settings')
    app.delete(col)
  },
)
