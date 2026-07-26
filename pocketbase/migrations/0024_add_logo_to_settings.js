// Campo de logo da clínica na coleção settings. Enviada pelo admin do PocketBase
// e exibida no cabeçalho e na barra lateral do CRM.
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('settings')
    if (!col.fields.getByName('logo')) {
      col.fields.add(
        new FileField({
          name: 'logo',
          maxSelect: 1,
          maxSize: 5242880, // 5 MB
          mimeTypes: ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'],
        }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('settings')
    if (col.fields.getByName('logo')) {
      col.fields.removeByName('logo')
    }
    app.save(col)
  },
)
