// Campo `phone_key` + índice único: nenhum paciente novo com telefone já cadastrado.
//
// phone_key é o telefone na forma canônica (DDD + número, sem o 55, com o 9 do
// celular). Assim (44) 98888-7777, 5544988887777 e 44 8888-7777 batem como o
// mesmo número. O hook patient_phone_key.js preenche o campo e barra o duplicado
// com mensagem legível; o índice aqui é a garantia final, no banco.
//
// Índice PARCIAL (`WHERE phone_key != ''`): paciente sem telefone é comum e todos
// ficariam com chave vazia — num índice único normal, o segundo sem telefone já
// seria recusado.
//
// DUPLICADOS QUE JÁ EXISTEM: o índice não pode ser criado com colisões. Em vez de
// apagar ou fundir cadastros por conta própria — decisão clínica, não técnica —
// o mais antigo fica com a chave limpa e os demais recebem um sufixo (#2, #3).
// Eles continuam visíveis e intactos no CRM (o campo `phone` não é tocado); só
// não participam da checagem. A lista sai no log para revisão manual.
function calcularChave(raw) {
  let d = ('' + (raw || '')).replace(/\D/g, '')
  if (!d) return ''
  if ((d.length === 12 || d.length === 13) && d.indexOf('55') === 0) d = d.slice(2)
  if (d.length === 11) return d
  if (d.length === 10) {
    const terceiro = d[2]
    if ('6789'.indexOf(terceiro) >= 0) return d.slice(0, 2) + '9' + d.slice(2)
    return d
  }
  return ''
}

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('patients')

    if (!col.fields.getByName('phone_key')) {
      col.fields.add(new TextField({ name: 'phone_key', required: false }))
      app.save(col)
    }

    // Backfill: do mais antigo para o mais novo, para o registro original ficar
    // com a chave limpa.
    const todos = app.findRecordsByFilter('patients', '', 'created', 100000, 0)
    const vistos = {}
    const duplicados = []

    for (const p of todos) {
      const chave = calcularChave(p.getString('phone'))
      let final = chave
      if (chave) {
        if (vistos[chave]) {
          vistos[chave] = vistos[chave] + 1
          final = chave + '#' + vistos[chave]
          duplicados.push(p.getString('name') + ' (' + p.getString('phone') + ')')
        } else {
          vistos[chave] = 1
        }
      }
      if (p.getString('phone_key') !== final) {
        // SQL direto de proposito: app.save() dispararia o hook de update, que
        // recalcularia a chave e desfaria o sufixo do duplicado — ai o indice
        // unico nao poderia ser criado e o PocketBase nao subiria.
        app
          .db()
          .newQuery('UPDATE patients SET phone_key = {:k} WHERE id = {:id}')
          .bind({ k: final, id: p.id })
          .execute()
      }
    }

    if (duplicados.length) {
      app
        .logger()
        .warn(
          '[0030] cadastros com telefone repetido — revise e uniforme manualmente',
          'total',
          duplicados.length,
          'pacientes',
          duplicados.join(' | '),
        )
    }

    const atualizada = app.findCollectionByNameOrId('patients')
    const indices = atualizada.indexes || []
    const jaTem = indices.some((i) => ('' + i).indexOf('idx_patients_phone_key') >= 0)
    if (!jaTem) {
      atualizada.indexes = indices.concat([
        "CREATE UNIQUE INDEX idx_patients_phone_key ON patients (phone_key) WHERE phone_key != ''",
      ])
      app.save(atualizada)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('patients')
    col.indexes = (col.indexes || []).filter(
      (i) => ('' + i).indexOf('idx_patients_phone_key') < 0,
    )
    app.save(col)

    const semIndice = app.findCollectionByNameOrId('patients')
    const campo = semIndice.fields.getByName('phone_key')
    if (campo) {
      semIndice.fields.removeById(campo.id)
      app.save(semIndice)
    }
  },
)
